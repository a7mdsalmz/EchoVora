import type { FastifyPluginAsync } from "fastify";
import rawBody from "fastify-raw-body";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTelephonyAdapter, getTelephonyAdapter } from "../telephony/registry.js";
import { createRedis } from "../queues/redis.js";
import { createTelephonyQueue } from "../queues/telephony.js";
import { AgentStatus, AgentType } from "@prisma/client";
import { maybeDecryptSecret } from "../utils/secretCrypto.js";

const ParamsWithBusiness = z.object({
  provider: z.enum(["twilio", "telnyx", "plivo"]),
  businessId: z.string().min(1)
});

const ParamsProviderOnly = z.object({
  provider: z.enum(["twilio", "telnyx", "plivo"])
});

export const telephonyRoutes: FastifyPluginAsync = async (app) => {
  await app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true
  });

  let redis: any | null = null;
  let queue: any | null = null;

  function getQueue() {
    if (!redis) redis = createRedis(app.config.REDIS_URL);
    if (!queue) queue = createTelephonyQueue(redis);
    return queue;
  }

  app.addHook("onClose", async () => {
    await queue?.close();
    await redis?.quit();
  });

  function getFullUrl(req: any) {
    if (app.config.PUBLIC_API_BASE_URL) {
      const base = String(app.config.PUBLIC_API_BASE_URL).replace(/\/+$/, "");
      const path = String(req.raw.url ?? "");
      return `${base}${path.startsWith("/") ? path : `/${path}`}`;
    }
    const xfProto = String(req.headers["x-forwarded-proto"] ?? "");
    const proto = (xfProto ? xfProto.split(",")[0] : req.protocol ?? "http").trim();
    const xfHost = String(req.headers["x-forwarded-host"] ?? "");
    const host = (xfHost ? xfHost.split(",")[0] : req.headers["host"] ?? req.hostname ?? "").trim();
    const path = String(req.raw.url ?? "");
    return `${proto}://${host}${path}`;
  }

  function normalizePhone(v: string) {
    const s = v.trim();
    const m = s.match(/\+?\d+/g);
    const joined = m ? m.join("") : s;
    return joined.startsWith("+") ? joined : `+${joined.replace(/^\+/, "")}`;
  }

  async function getBusinessIdFromNumbers(args: { provider: "twilio" | "telnyx" | "plivo"; numbers: (string | undefined)[] }) {
    const tried = new Set<string>();
    for (const n of args.numbers) {
      if (!n) continue;
      const nn = normalizePhone(n);
      if (tried.has(nn)) continue;
      tried.add(nn);
      const found = await prisma.phoneNumber.findFirst({
        where: {
          provider: args.provider.toUpperCase() as any,
          e164: nn,
          deletedAt: null
        }
      });
      if (found) return found.businessId;
    }
    return null;
  }

  async function getWebhookSecret(args: { provider: "twilio" | "telnyx" | "plivo"; businessId: string }) {
    const type =
      args.provider === "telnyx"
        ? "TELEPHONY_TELNYX"
        : args.provider === "plivo"
          ? "TELEPHONY_PLIVO"
          : "TELEPHONY_TWILIO";
    const cfg = await prisma.providerConfig.findFirst({
      where: { businessId: args.businessId, type: type as any, isActive: true, deletedAt: null }
    });
    const json = (cfg?.config ?? {}) as any;
    const pick =
      args.provider === "telnyx"
        ? typeof json.webhookPublicKey === "string"
          ? json.webhookPublicKey
          : typeof json.publicKey === "string"
            ? json.publicKey
            : typeof json.webhookSecret === "string"
              ? json.webhookSecret
              : null
        : typeof json.webhookSecret === "string"
          ? json.webhookSecret
          : typeof json.authToken === "string"
            ? json.authToken
            : null;
    if (!pick) return null;
    return maybeDecryptSecret(pick, app.config.CONFIG_ENCRYPTION_KEY) as string;
  }

  async function handleWebhook(req: any, reply: any, params: { provider: "twilio" | "telnyx" | "plivo"; businessId?: string }) {
    const raw = (req as any).rawBody as string | undefined;
    const url = getFullUrl(req);
    const providedBusinessId = Boolean(params.businessId);

    const adapterForParse = getTelephonyAdapter(params.provider, app.config);
    const parsed = adapterForParse.parseEvent({ body: req.body, headers: req.headers });
    if (!parsed.providerCallId) return reply.badRequest("Missing provider call id");

    const explicitCallId = typeof req.query?.callId === "string" ? String(req.query.callId) : null;
    const explicitCall = explicitCallId ? await prisma.call.findUnique({ where: { id: explicitCallId } }) : null;

    const mappedBusinessId =
      params.businessId ??
      explicitCall?.businessId ??
      (await getBusinessIdFromNumbers({
        provider: params.provider,
        numbers: parsed.direction === "OUTBOUND" ? [parsed.fromNumber, parsed.toNumber] : [parsed.toNumber, parsed.fromNumber]
      }));
    if (!mappedBusinessId) return reply.badRequest("Unable to resolve business");

    const secretFromDb = await getWebhookSecret({ provider: params.provider, businessId: mappedBusinessId });
    const secret =
      secretFromDb ??
      (providedBusinessId
        ? null
        : params.provider === "telnyx"
          ? app.config.TELEPHONY_TELNYX_WEBHOOK_SECRET
          : params.provider === "plivo"
            ? app.config.TELEPHONY_PLIVO_WEBHOOK_SECRET
            : app.config.TELEPHONY_TWILIO_WEBHOOK_SECRET);
    if (!secret) return reply.unauthorized("Missing provider secret");

    const adapter = createTelephonyAdapter(params.provider, secret);
    const ok = adapter.verifyWebhook({ rawBody: raw ?? "", headers: req.headers, url });
    if (!ok) return reply.unauthorized("Invalid webhook signature");

    const providerEnum = parsed.provider.toUpperCase() as any;
    const updateData: any = { status: "IN_PROGRESS" };
    if (parsed.fromNumber) updateData.fromNumber = normalizePhone(parsed.fromNumber);
    if (parsed.toNumber) updateData.toNumber = normalizePhone(parsed.toNumber);
    if (parsed.direction) updateData.direction = parsed.direction;
    if (typeof parsed.durationSeconds === "number" && Number.isFinite(parsed.durationSeconds)) updateData.durationSeconds = Math.max(0, Math.round(parsed.durationSeconds));
    if (typeof parsed.telephonyCostUsd === "number" && Number.isFinite(parsed.telephonyCostUsd)) updateData.telephonyCostUsd = parsed.telephonyCostUsd;
    const terminal = /completed|hangup|ended|failed|canceled|cancelled/i.test(parsed.eventType);
    if (terminal) updateData.endedAt = parsed.occurredAt;

    if (explicitCall && explicitCall.businessId === mappedBusinessId && explicitCall.provider === providerEnum) {
      if (typeof explicitCall.providerCallId === "string" && explicitCall.providerCallId.startsWith("pending-")) {
        updateData.providerCallId = parsed.providerCallId;
      }
      const updatedCall = await prisma.call.update({ where: { id: explicitCall.id }, data: updateData });

      const event = await prisma.telephonyEvent.create({
        data: {
          businessId: mappedBusinessId,
          callId: updatedCall.id,
          provider: providerEnum,
          eventType: parsed.eventType,
          payload: parsed.payload as any,
          occurredAt: parsed.occurredAt
        }
      });

      await getQueue().add("ingest", { businessId: mappedBusinessId, telephonyEventId: event.id });
      return reply.send({ ok: true });
    }

    const createData: any = {
      businessId: mappedBusinessId,
      provider: providerEnum,
      providerCallId: parsed.providerCallId,
      direction: parsed.direction ?? "INBOUND",
      status: "IN_PROGRESS",
      startedAt: new Date()
    };
    if (parsed.fromNumber) createData.fromNumber = normalizePhone(parsed.fromNumber);
    if (parsed.toNumber) createData.toNumber = normalizePhone(parsed.toNumber);
    if (typeof parsed.durationSeconds === "number" && Number.isFinite(parsed.durationSeconds)) createData.durationSeconds = Math.max(0, Math.round(parsed.durationSeconds));
    if (typeof parsed.telephonyCostUsd === "number" && Number.isFinite(parsed.telephonyCostUsd)) createData.telephonyCostUsd = parsed.telephonyCostUsd;
    if (terminal) createData.endedAt = parsed.occurredAt;

    const call = await prisma.call.upsert({
      where: {
        businessId_provider_providerCallId: {
          businessId: mappedBusinessId,
          provider: providerEnum,
          providerCallId: parsed.providerCallId
        }
      },
      update: updateData,
      create: createData
    });

    if (!call.agentId && call.direction === "INBOUND" && !call.orderId) {
      const agent = await prisma.agent.findFirst({
        where: { businessId: mappedBusinessId, type: AgentType.VOICE_CALL_CENTER, status: AgentStatus.ACTIVE, deletedAt: null },
        orderBy: { updatedAt: "desc" }
      });
      if (agent) {
        await prisma.call.update({ where: { id: call.id }, data: { agentId: agent.id } });
      }
    }

    const normalizedPayload =
      parsed.payload && typeof parsed.payload === "object"
        ? {
            ...(parsed.payload as any),
            ...(parsed.transcriptText ? { text: parsed.transcriptText } : null),
            ...(parsed.recordingUrl ? { recordingUrl: parsed.recordingUrl } : null),
            ...(parsed.fromNumber ? { fromNumber: parsed.fromNumber } : null),
            ...(parsed.toNumber ? { toNumber: parsed.toNumber } : null),
            ...(parsed.direction ? { direction: parsed.direction } : null)
          }
        : {
            raw: parsed.payload,
            ...(parsed.transcriptText ? { text: parsed.transcriptText } : null),
            ...(parsed.recordingUrl ? { recordingUrl: parsed.recordingUrl } : null),
            ...(parsed.fromNumber ? { fromNumber: parsed.fromNumber } : null),
            ...(parsed.toNumber ? { toNumber: parsed.toNumber } : null),
            ...(parsed.direction ? { direction: parsed.direction } : null)
          };

    const event = await prisma.telephonyEvent.create({
      data: {
        businessId: mappedBusinessId,
        callId: call.id,
        provider: providerEnum,
        eventType: parsed.eventType,
        payload: normalizedPayload as any,
        occurredAt: parsed.occurredAt
      }
    });

    await getQueue().add("ingest", { businessId: mappedBusinessId, telephonyEventId: event.id }, { jobId: `te:${event.id}` });
    return reply.send({ ok: true });
  }

  app.post(
    "/webhooks/telephony/:provider",
    {
      config: {
        rawBody: true
      }
    },
    async (req, reply) => {
      const params = ParamsProviderOnly.parse(req.params);
      return handleWebhook(req, reply, params);
    }
  );

  app.post(
    "/webhooks/telephony/:provider/:businessId",
    {
      config: {
        rawBody: true
      }
    },
    async (req, reply) => {
      const params = ParamsWithBusiness.parse(req.params);
      return handleWebhook(req, reply, params);
    }
  );
};

