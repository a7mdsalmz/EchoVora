import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { getWorkerEnv } from "./env.js";
import { prisma } from "./db.js";
import { reduceCallStatus } from "./orchestration/stateMachine.js";
import { inferOrderOutcome, isTerminalOrderStatus, retryDelayMsForAttempt } from "./orchestration/orderConfirmation.js";
import { AgentStatus, AgentType, CallDirection, CallStatus, OrderStatus, ProviderType, TelephonyProvider, UsageType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { handleConversationEvent } from "./conversation/engine.js";
import { createOutboundCall } from "./telephony/client.js";
import type { ProviderCredentials, TelephonyProviderName } from "./telephony/types.js";
import { ingestKnowledgeSource } from "./knowledge/ingest.js";
import { summarizeCallCenterCall } from "./callCenter/summarize.js";
import { upsertUsageLog } from "./billing/usage.js";
import { createAnswerToken } from "./telephony/answerToken.js";
import { maybeDecryptSecret } from "./utils/secretCrypto.js";

const env = getWorkerEnv();
const RedisCtor = IORedis as any;
const redis = new RedisCtor(env.REDIS_URL, { maxRetriesPerRequest: null });

process.stderr.write(`worker_boot redis_url=${env.REDIS_URL}\n`);
redis.on("ready", () => {
  process.stderr.write("redis_ready\n");
});
redis.on("error", (err: any) => {
  process.stderr.write(`redis_error ${err?.message ?? String(err)}\n`);
});
redis.on("reconnecting", () => {
  process.stderr.write("redis_reconnecting\n");
});

const telephonyEventsQueue = new Queue("telephony-events", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 }
  }
});

const orderConfirmationQueue = new Queue("order-confirmation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 2000,
    removeOnFail: 2000
  }
});
const callCenterSummariesQueue = new Queue("call-center-summaries", { connection: redis });

function providerNameFromProviderType(type: ProviderType | null | undefined): TelephonyProviderName | null {
  if (type === ProviderType.TELEPHONY_TELNYX) return "telnyx";
  if (type === ProviderType.TELEPHONY_PLIVO) return "plivo";
  if (type === ProviderType.TELEPHONY_TWILIO) return "twilio";
  return null;
}

function providerEnumFromName(provider: TelephonyProviderName): TelephonyProvider {
  if (provider === "telnyx") return TelephonyProvider.TELNYX;
  if (provider === "plivo") return TelephonyProvider.PLIVO;
  return TelephonyProvider.TWILIO;
}

function getTelephonyCredentials(args: { provider: TelephonyProviderName; providerConfig: any | null }): ProviderCredentials {
  const cfg = (args.providerConfig?.config ?? {}) as any;
  if (args.provider === "twilio") {
    const accountSid = typeof cfg.accountSid === "string" ? cfg.accountSid : env.TWILIO_ACCOUNT_SID;
    const authTokenRaw = typeof cfg.authToken === "string" ? cfg.authToken : env.TWILIO_AUTH_TOKEN;
    const authToken = typeof authTokenRaw === "string" ? (maybeDecryptSecret(authTokenRaw, env.CONFIG_ENCRYPTION_KEY) as string) : authTokenRaw;
    if (!accountSid || !authToken) throw new Error("Missing Twilio credentials");
    return { provider: "twilio", accountSid, authToken };
  }
  if (args.provider === "telnyx") {
    const apiKeyRaw = typeof cfg.apiKey === "string" ? cfg.apiKey : env.TELNYX_API_KEY;
    const apiKey = typeof apiKeyRaw === "string" ? (maybeDecryptSecret(apiKeyRaw, env.CONFIG_ENCRYPTION_KEY) as string) : apiKeyRaw;
    if (!apiKey) throw new Error("Missing Telnyx API key");
    return { provider: "telnyx", apiKey };
  }
  const authId = typeof cfg.authId === "string" ? cfg.authId : env.PLIVO_AUTH_ID;
  const authTokenRaw = typeof cfg.authToken === "string" ? cfg.authToken : env.PLIVO_AUTH_TOKEN;
  const authToken = typeof authTokenRaw === "string" ? (maybeDecryptSecret(authTokenRaw, env.CONFIG_ENCRYPTION_KEY) as string) : authTokenRaw;
  if (!authId || !authToken) throw new Error("Missing Plivo credentials");
  return { provider: "plivo", authId, authToken };
}

async function emitTelephonyEvent(args: {
  businessId: string;
  callId: string;
  provider: TelephonyProvider;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  delayMs?: number;
}) {
  const event = await prisma.telephonyEvent.create({
    data: {
      businessId: args.businessId,
      callId: args.callId,
      provider: args.provider,
      eventType: args.eventType,
      payload: args.payload as any,
      occurredAt: args.occurredAt
    }
  });

  await telephonyEventsQueue.add(
    "ingest",
    { businessId: args.businessId, telephonyEventId: event.id },
    { jobId: `te-${event.id}`, delay: args.delayMs ?? 0 }
  );
}

async function simulateOutboundCallFlow(args: { businessId: string; callId: string; provider: TelephonyProvider; locale: "en" | "ar" }) {
  const now = Date.now();
  const texts = args.locale === "ar" ? ["أيوه", "أيوه", "تمام", "أيوه", "أكيد"] : ["yes", "yes", "okay", "yes", "confirm"];

  for (let i = 0; i < texts.length; i++) {
    const delayMs = 1200 * (i + 1);
    await emitTelephonyEvent({
      businessId: args.businessId,
      callId: args.callId,
      provider: args.provider,
      eventType: "transcript.received",
      payload: { text: texts[i] },
      occurredAt: new Date(now + delayMs),
      delayMs
    });
  }

  const completeDelayMs = 1200 * (texts.length + 2);
  const endedAt = new Date(now + completeDelayMs);

  await prisma.call.update({
    where: { id: args.callId },
    data: { durationSeconds: 42, endedAt, telephonyCostUsd: 0 }
  });

  await emitTelephonyEvent({
    businessId: args.businessId,
    callId: args.callId,
    provider: args.provider,
    eventType: "call.completed",
    payload: { durationSeconds: 42 },
    occurredAt: endedAt,
    delayMs: completeDelayMs
  });
}

const telephonyEventsWorker = new Worker(
  "telephony-events",
  async (job) => {
    const telephonyEventId = String((job.data as any)?.telephonyEventId ?? "");
    const businessId = String((job.data as any)?.businessId ?? "");
    if (!telephonyEventId || !businessId) throw new Error("Invalid job payload");

    const event = await prisma.telephonyEvent.findUnique({ where: { id: telephonyEventId } });
    if (!event) return;

    const call = await prisma.call.findUnique({ where: { id: event.callId } });
    if (!call) return;

    const isTranscriptEvent =
      event.eventType.toLowerCase().includes("transcript") ||
      event.eventType.toLowerCase().includes("speech") ||
      event.eventType.toLowerCase().includes("utterance");

    if (isTranscriptEvent && call.agentId) {
      const payload = event.payload as unknown as Record<string, unknown>;
      const text = String((payload as any)?.text ?? (payload as any)?.transcript ?? (payload as any)?.utterance ?? "").trim();
      if (text.length) {
        const agent = await prisma.agent.findUnique({ where: { id: call.agentId } });
        if (agent && agent.businessId === businessId && agent.type === AgentType.VOICE_CALL_CENTER && !agent.deletedAt) {
          const existing = await prisma.callTranscript.findUnique({ where: { callId: call.id } });
          const appended = existing?.contentText ? `${existing.contentText}\n${text}` : text;
          await prisma.callTranscript.upsert({
            where: { callId: call.id },
            update: { contentText: appended.slice(0, 2_000_000) },
            create: { businessId, callId: call.id, locale: call.locale, contentText: appended.slice(0, 2_000_000) }
          });
        }
      }
    }

    if (call.orderId && isTranscriptEvent) {
      const payload = event.payload as unknown as Record<string, unknown>;
      const text = String((payload as any)?.text ?? (payload as any)?.transcript ?? (payload as any)?.utterance ?? "").trim();
      if (text.length) {
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        const order = await prisma.order.findUnique({ where: { id: call.orderId }, include: { customer: true } });
        const agent = await prisma.agent.findFirst({
          where: { businessId, type: AgentType.ORDER_CONFIRMATION, status: AgentStatus.ACTIVE, deletedAt: null },
          orderBy: { updatedAt: "desc" }
        });

        const vars = {
          customerName: order?.customer?.name ?? undefined,
          businessName: business?.name ?? undefined,
          totalPrice: order ? `${order.amount} ${order.currency}` : undefined,
          orderItems: typeof (order as any)?.metadata?.items === "string" ? (order as any).metadata.items : undefined,
          address: typeof (order as any)?.metadata?.address === "string" ? (order as any).metadata.address : undefined,
          deliveryDate: typeof (order as any)?.metadata?.deliveryDate === "string" ? (order as any).metadata.deliveryDate : undefined
        };

        const dialect = typeof (agent as any)?.config?.dialect === "string" ? ((agent as any).config.dialect as string) : null;
        const vcfg = (agent as any)?.config?.voice as any | undefined;
        const localeKey = call.locale === "ar" ? "ar" : "en";
        const picked = dialect === "ar-EG" ? vcfg?.arEG ?? vcfg?.ar : vcfg?.[localeKey];
        const voice =
          picked && typeof picked.voiceId === "string"
            ? {
                provider: "elevenlabs" as const,
                voiceId: picked.voiceId,
                stability: typeof picked.stability === "number" ? picked.stability : undefined,
                similarityBoost: typeof picked.similarityBoost === "number" ? picked.similarityBoost : undefined,
                style: typeof picked.style === "number" ? picked.style : undefined
              }
            : null;

        const result = await handleConversationEvent({
          prisma,
          env,
          businessId,
          callId: call.id,
          orderId: call.orderId,
          agentId: agent?.id ?? null,
          locale: call.locale === "ar" ? "ar" : "en",
          dialect,
          voice,
          variables: vars,
          event: { type: "USER_TRANSCRIPT", text, raw: payload, sourceEventId: event.id }
        });

        if (result.outcome) {
          const now = new Date();
          await prisma.order.update({
            where: { id: call.orderId },
            data: {
              status: result.outcome,
              lastOutcome: result.outcome,
              resolvedAt: now,
              requiresHumanReview: result.outcome === OrderStatus.HUMAN_REVIEW
            }
          });
        }
      }
    }

    const nextStatus = reduceCallStatus(call.status, event.eventType);
    await prisma.call.update({
      where: { id: call.id },
      data: {
        status: nextStatus
      }
    });

    if (nextStatus === CallStatus.COMPLETED || nextStatus === CallStatus.FAILED || nextStatus === CallStatus.CANCELED) {
      const finishedCall = await prisma.call.findUnique({ where: { id: call.id } });
      if (finishedCall) {
        if (finishedCall.durationSeconds && finishedCall.durationSeconds > 0) {
          await upsertUsageLog({
            prisma,
            businessId,
            dedupeKey: `call:${finishedCall.id}:CALL_SECONDS`,
            type: UsageType.CALL_SECONDS,
            quantity: BigInt(finishedCall.durationSeconds),
            costUsd: Number(finishedCall.telephonyCostUsd ?? 0),
            callId: finishedCall.id,
            agentId: finishedCall.agentId ?? null,
            recordedAt: finishedCall.endedAt ?? new Date()
          });
          await upsertUsageLog({
            prisma,
            businessId,
            dedupeKey: `call:${finishedCall.id}:STT_SECONDS`,
            type: UsageType.STT_SECONDS,
            quantity: BigInt(finishedCall.durationSeconds),
            costUsd: Number(finishedCall.sttCostUsd ?? 0),
            callId: finishedCall.id,
            agentId: finishedCall.agentId ?? null,
            recordedAt: finishedCall.endedAt ?? new Date()
          });
        }
      }
    }

    if (
      (nextStatus === CallStatus.COMPLETED || nextStatus === CallStatus.FAILED || nextStatus === CallStatus.CANCELED) &&
      call.agentId
    ) {
      const agent = await prisma.agent.findUnique({ where: { id: call.agentId } });
      if (agent && agent.businessId === businessId && agent.type === AgentType.VOICE_CALL_CENTER && !agent.deletedAt) {
        await callCenterSummariesQueue.add("summarize", { businessId, callId: call.id }, { jobId: `ccsum-${businessId}-${call.id}` });
      }
    }

    if (!call.orderId) return;
    if (nextStatus !== CallStatus.COMPLETED && nextStatus !== CallStatus.FAILED && nextStatus !== CallStatus.CANCELED) return;

    const order = await prisma.order.findUnique({ where: { id: call.orderId } });
    if (!order) return;
    if (order.businessId !== businessId) return;
    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.RESCHEDULED ||
      order.status === OrderStatus.CHANGE_ADDRESS ||
      order.status === OrderStatus.HUMAN_REVIEW
    )
      return;

    const outcome = inferOrderOutcome({ callStatus: nextStatus, eventType: event.eventType });
    const now = new Date();
    const nextAttemptNumber = order.callAttempts + 1;
    const shouldRetry = outcome === OrderStatus.NO_ANSWER && nextAttemptNumber < order.maxAttempts;

    const nextCallAt = shouldRetry ? new Date(now.getTime() + retryDelayMsForAttempt(nextAttemptNumber)) : null;
    const finalStatus = shouldRetry ? OrderStatus.QUEUED : outcome === OrderStatus.NO_ANSWER ? OrderStatus.FAILED : outcome;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: finalStatus,
          lastOutcome: outcome,
          resolvedAt: isTerminalOrderStatus(finalStatus) ? now : null,
          requiresHumanReview: finalStatus === OrderStatus.HUMAN_REVIEW,
          nextCallAt
        }
      });

      const lastItem = await tx.orderCampaignItem.findFirst({
        where: { businessId, orderId: order.id },
        orderBy: { createdAt: "desc" }
      });
      if (lastItem) {
        await tx.orderCampaignItem.update({
          where: { id: lastItem.id },
          data: {
            status: finalStatus,
            lastCallId: call.id,
            lastAttemptAt: now,
            nextAttemptAt: nextCallAt
          }
        });
      }
    });

    if (shouldRetry && nextCallAt) {
      const delayMs = Math.max(0, nextCallAt.getTime() - Date.now());
      await orderConfirmationQueue.add(
        "confirm",
        { businessId, orderId: order.id },
        { jobId: `oc-${businessId}-${order.id}-${nextCallAt.getTime()}`, delay: delayMs }
      );
    }
  },
  {
    connection: redis,
    concurrency: 4
  }
);

const orderConfirmationWorker = new Worker(
  "order-confirmation",
  async (job) => {
    const businessId = String((job.data as any)?.businessId ?? "");
    const orderId = String((job.data as any)?.orderId ?? "");
    if (!businessId || !orderId) throw new Error("Invalid job payload");

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order) return;
    if (order.businessId !== businessId) return;
    if (order.deletedAt) return;
    if (order.status !== OrderStatus.QUEUED) return;
    if (order.nextCallAt && order.nextCallAt.getTime() > Date.now()) {
      const delayMs = Math.max(0, order.nextCallAt.getTime() - Date.now());
      await orderConfirmationQueue.add(
        "confirm",
        { businessId, orderId: order.id },
        { jobId: `oc-${businessId}-${order.id}-${order.nextCallAt.getTime()}`, delay: delayMs }
      );
      return;
    }

    const now = new Date();
    const simulateTelephony = Boolean(env.SIMULATE_TELEPHONY);
    const providerConfig = await prisma.providerConfig.findFirst({
      where: {
        businessId,
        type: { in: [ProviderType.TELEPHONY_TWILIO, ProviderType.TELEPHONY_TELNYX, ProviderType.TELEPHONY_PLIVO] },
        isActive: true,
        deletedAt: null
      },
      orderBy: { updatedAt: "desc" }
    });
    const providerName = providerNameFromProviderType(providerConfig?.type) ?? (env.DEFAULT_TELEPHONY_PROVIDER ?? "twilio");
    const provider = providerEnumFromName(providerName);
    const credentials = simulateTelephony ? null : getTelephonyCredentials({ provider: providerName, providerConfig });

    const phone = await prisma.phoneNumber.findFirst({
      where: { businessId, provider, outboundEnabled: true, deletedAt: null },
      orderBy: [{ isPrimaryOutbound: "desc" }, { updatedAt: "desc" }]
    });
    const fromNumber = phone?.e164 ?? env.DEFAULT_OUTBOUND_FROM_NUMBER ?? (simulateTelephony ? "+10000000000" : null);
    if (!fromNumber) throw new Error("Missing outbound from number");
    const toNumber = String(order.customer.phone ?? "").trim();
    if (!toNumber) throw new Error("Missing customer phone");
    if (!simulateTelephony) {
      if (!env.API_BASE_URL) throw new Error("Missing API_BASE_URL");
      if (!env.TELEPHONY_ANSWER_TOKEN_SECRET) throw new Error("Missing TELEPHONY_ANSWER_TOKEN_SECRET");
    }

    const call = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CALLING,
          callAttempts: { increment: 1 },
          lastCallAt: now,
          nextCallAt: null
        }
      });

      const createdCall = await tx.call.create({
        data: {
          businessId,
          customerId: order.customerId,
          orderId: order.id,
          provider,
          providerCallId: `pending-${randomUUID()}`,
          direction: CallDirection.OUTBOUND,
          status: CallStatus.NEW,
          locale: order.customer.locale,
          fromNumber,
          toNumber,
          startedAt: now
        }
      });

      const lastItem = await tx.orderCampaignItem.findFirst({
        where: { businessId, orderId: order.id },
        orderBy: { createdAt: "desc" }
      });
      if (lastItem) {
        await tx.orderCampaignItem.update({
          where: { id: lastItem.id },
          data: {
            status: OrderStatus.CALLING,
            attempts: { increment: 1 },
            lastAttemptAt: now,
            lastCallId: createdCall.id
          }
        });
      }

      return { updated, createdCall };
    });

    try {
      if (simulateTelephony) {
        await prisma.call.update({
          where: { id: call.createdCall.id },
          data: { providerCallId: `sim-${randomUUID()}`, status: CallStatus.IN_PROGRESS }
        });
        await simulateOutboundCallFlow({ businessId, callId: call.createdCall.id, provider, locale: order.customer.locale === "ar" ? "ar" : "en" });
      } else {
        const secret = env.TELEPHONY_ANSWER_TOKEN_SECRET;
        if (!secret) throw new Error("Missing TELEPHONY_ANSWER_TOKEN_SECRET");
        const answerToken = createAnswerToken({ secret, callId: call.createdCall.id });
        const result = await createOutboundCall({
          provider: providerName,
          credentials: credentials as ProviderCredentials,
          req: {
            to: toNumber,
            from: fromNumber,
            answerUrl: `${env.API_BASE_URL}/api/telephony/answer?token=${encodeURIComponent(answerToken)}`,
            statusCallbackUrl: `${env.API_BASE_URL}/api/webhooks/telephony/${providerName}?callId=${call.createdCall.id}`,
            record: true
          }
        });

        await prisma.call.update({
          where: { id: call.createdCall.id },
          data: { providerCallId: result.providerCallId, status: CallStatus.IN_PROGRESS }
        });
      }
    } catch (err: any) {
      process.stderr.write(
        `order_confirmation_call_create_failed jobId=${job?.id ?? "unknown"} orderId=${order.id} ${err?.message ?? String(err)}\n`
      );
      const delayMs = retryDelayMsForAttempt(call.updated.callAttempts);
      const nextCallAt = new Date(Date.now() + delayMs);

      await prisma.$transaction(async (tx) => {
        await tx.call.update({
          where: { id: call.createdCall.id },
          data: { status: CallStatus.FAILED, endedAt: new Date() }
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.QUEUED, nextCallAt }
        });
      });

      const requeueDelayMs = Math.max(0, nextCallAt.getTime() - Date.now());
      await orderConfirmationQueue.add(
        "confirm",
        { businessId, orderId: order.id },
        { jobId: `oc-${businessId}-${order.id}-${nextCallAt.getTime()}`, delay: requeueDelayMs }
      );

      return;
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const agent = await prisma.agent.findFirst({
      where: { businessId, type: AgentType.ORDER_CONFIRMATION, status: AgentStatus.ACTIVE, deletedAt: null },
      orderBy: { updatedAt: "desc" }
    });

    const vars = {
      customerName: order.customer.name ?? undefined,
      businessName: business?.name ?? undefined,
      totalPrice: `${order.amount} ${order.currency}`,
      orderItems: typeof (order as any)?.metadata?.items === "string" ? (order as any).metadata.items : undefined,
      address: typeof (order as any)?.metadata?.address === "string" ? (order as any).metadata.address : undefined,
      deliveryDate: typeof (order as any)?.metadata?.deliveryDate === "string" ? (order as any).metadata.deliveryDate : undefined
    };

    const dialect = typeof (agent as any)?.config?.dialect === "string" ? ((agent as any).config.dialect as string) : null;
    const vcfg = (agent as any)?.config?.voice as any | undefined;
    const localeKey = order.customer.locale === "ar" ? "ar" : "en";
    const picked = dialect === "ar-EG" ? vcfg?.arEG ?? vcfg?.ar : vcfg?.[localeKey];
    const voice =
      picked && typeof picked.voiceId === "string"
        ? {
            provider: "elevenlabs" as const,
            voiceId: picked.voiceId,
            stability: typeof picked.stability === "number" ? picked.stability : undefined,
            similarityBoost: typeof picked.similarityBoost === "number" ? picked.similarityBoost : undefined,
            style: typeof picked.style === "number" ? picked.style : undefined
          }
        : null;

    await handleConversationEvent({
      prisma,
      env,
      businessId,
      callId: call.createdCall.id,
      orderId: order.id,
      agentId: agent?.id ?? null,
      locale: order.customer.locale === "ar" ? "ar" : "en",
      dialect,
      voice,
      variables: vars,
      event: { type: "CALL_STARTED" }
    });
  },
  {
    connection: redis,
    concurrency: 2
  }
);

const telephonyTestCallsWorker = new Worker(
  "telephony-test-calls",
  async (job) => {
    const businessId = String((job.data as any)?.businessId ?? "");
    const providerName = (String((job.data as any)?.provider ?? env.DEFAULT_TELEPHONY_PROVIDER ?? "twilio") as TelephonyProviderName) || "twilio";
    const toNumber = String((job.data as any)?.to ?? "").trim();
    const fromNumber = String((job.data as any)?.from ?? "").trim();
    if (!businessId || !toNumber || !fromNumber) throw new Error("Invalid job payload");
    const simulateTelephony = Boolean(env.SIMULATE_TELEPHONY);
    if (!simulateTelephony) {
      if (!env.API_BASE_URL) throw new Error("Missing API_BASE_URL");
      if (!env.TELEPHONY_ANSWER_TOKEN_SECRET) throw new Error("Missing TELEPHONY_ANSWER_TOKEN_SECRET");
    }

    const type =
      providerName === "telnyx" ? ProviderType.TELEPHONY_TELNYX : providerName === "plivo" ? ProviderType.TELEPHONY_PLIVO : ProviderType.TELEPHONY_TWILIO;
    const providerConfig = await prisma.providerConfig.findFirst({
      where: { businessId, type, isActive: true, deletedAt: null },
      orderBy: { updatedAt: "desc" }
    });

    const provider = providerEnumFromName(providerName);
    const credentials = simulateTelephony ? null : getTelephonyCredentials({ provider: providerName, providerConfig });
    const now = new Date();

    const call = await prisma.call.create({
      data: {
        businessId,
        provider,
        providerCallId: `pending-${randomUUID()}`,
        direction: CallDirection.OUTBOUND,
        status: CallStatus.NEW,
        locale: "en",
        fromNumber,
        toNumber,
        startedAt: now
      }
    });

    try {
      if (simulateTelephony) {
        await prisma.call.update({ where: { id: call.id }, data: { providerCallId: `sim-${randomUUID()}`, status: CallStatus.IN_PROGRESS } });
        await simulateOutboundCallFlow({ businessId, callId: call.id, provider, locale: "en" });
      } else {
        const secret = env.TELEPHONY_ANSWER_TOKEN_SECRET;
        if (!secret) throw new Error("Missing TELEPHONY_ANSWER_TOKEN_SECRET");
        const answerToken = createAnswerToken({ secret, callId: call.id });
        const result = await createOutboundCall({
          provider: providerName,
          credentials: credentials as ProviderCredentials,
          req: {
            to: toNumber,
            from: fromNumber,
            answerUrl: `${env.API_BASE_URL}/api/telephony/answer?token=${encodeURIComponent(answerToken)}`,
            statusCallbackUrl: `${env.API_BASE_URL}/api/webhooks/telephony/${providerName}?callId=${call.id}`,
            record: true
          }
        });

        await prisma.call.update({
          where: { id: call.id },
          data: { providerCallId: result.providerCallId, status: CallStatus.IN_PROGRESS }
        });
      }
    } catch (err) {
      await prisma.call.update({ where: { id: call.id }, data: { status: CallStatus.FAILED, endedAt: new Date() } });
      throw err;
    }
  },
  { connection: redis, concurrency: 2 }
);

const knowledgeIngestWorker = new Worker(
  "knowledge-ingest",
  async (job) => {
    const businessId = String((job.data as any)?.businessId ?? "");
    const sourceId = String((job.data as any)?.sourceId ?? "");
    if (!businessId || !sourceId) throw new Error("Invalid job payload");
    await ingestKnowledgeSource({ prisma, env, businessId, sourceId });
  },
  { connection: redis, concurrency: 2 }
);

const callCenterSummariesWorker = new Worker(
  "call-center-summaries",
  async (job) => {
    const businessId = String((job.data as any)?.businessId ?? "");
    const callId = String((job.data as any)?.callId ?? "");
    if (!businessId || !callId) throw new Error("Invalid job payload");
    await summarizeCallCenterCall({ prisma, env, businessId, callId });
  },
  { connection: redis, concurrency: 2 }
);

telephonyEventsWorker.on("failed", (job, err) => {
  process.stderr.write(`job_failed queue=telephony-events id=${job?.id ?? "unknown"} name=${job?.name ?? "unknown"} ${err?.stack ?? err.message}\n`);
});

orderConfirmationWorker.on("failed", (job, err) => {
  process.stderr.write(`job_failed queue=order-confirmation id=${job?.id ?? "unknown"} name=${job?.name ?? "unknown"} ${err?.stack ?? err.message}\n`);
});

telephonyTestCallsWorker.on("failed", (job, err) => {
  process.stderr.write(`job_failed queue=telephony-test-calls id=${job?.id ?? "unknown"} name=${job?.name ?? "unknown"} ${err?.stack ?? err.message}\n`);
});

knowledgeIngestWorker.on("failed", (job, err) => {
  process.stderr.write(`job_failed queue=knowledge-ingest id=${job?.id ?? "unknown"} name=${job?.name ?? "unknown"} ${err?.stack ?? err.message}\n`);
});

callCenterSummariesWorker.on("failed", (job, err) => {
  process.stderr.write(`job_failed queue=call-center-summaries id=${job?.id ?? "unknown"} name=${job?.name ?? "unknown"} ${err?.stack ?? err.message}\n`);
});

telephonyEventsWorker.on("error", (err: any) => {
  process.stderr.write(`worker_error queue=telephony-events ${err?.stack ?? err?.message ?? String(err)}\n`);
});
orderConfirmationWorker.on("error", (err: any) => {
  process.stderr.write(`worker_error queue=order-confirmation ${err?.stack ?? err?.message ?? String(err)}\n`);
});
telephonyTestCallsWorker.on("error", (err: any) => {
  process.stderr.write(`worker_error queue=telephony-test-calls ${err?.stack ?? err?.message ?? String(err)}\n`);
});
knowledgeIngestWorker.on("error", (err: any) => {
  process.stderr.write(`worker_error queue=knowledge-ingest ${err?.stack ?? err?.message ?? String(err)}\n`);
});
callCenterSummariesWorker.on("error", (err: any) => {
  process.stderr.write(`worker_error queue=call-center-summaries ${err?.stack ?? err?.message ?? String(err)}\n`);
});

process.on("SIGINT", async () => {
  await telephonyEventsWorker.close();
  await orderConfirmationWorker.close();
  await telephonyTestCallsWorker.close();
  await knowledgeIngestWorker.close();
  await callCenterSummariesWorker.close();
  await telephonyEventsQueue.close();
  await orderConfirmationQueue.close();
  await callCenterSummariesQueue.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

