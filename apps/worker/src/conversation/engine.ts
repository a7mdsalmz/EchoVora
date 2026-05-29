import { CallStatus, ConversationDirection, OrderStatus, UsageType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { WorkerEnv } from "../env.js";
import type { ConversationIntent, ConversationLocale, ConversationState, ConversationVariables, VoiceSettings } from "./types.js";
import { orderConfirmationFlow } from "./templates/orderConfirmation.js";
import { detectIntentHeuristic } from "./intent/heuristic.js";
import { classifyIntentWithOpenAI } from "../ai/openaiIntent.js";
import { upsertUsageLog } from "../billing/usage.js";
import { buildAudioCacheKey } from "./audioCache.js";
import { elevenLabsTts } from "../voice/elevenlabs.js";
import { createR2Client, putR2Object } from "../storage/r2.js";
import { ProviderType } from "@prisma/client";
import { maybeDecryptSecret } from "../utils/secretCrypto.js";

export type EngineEvent =
  | { type: "CALL_STARTED" }
  | { type: "USER_TRANSCRIPT"; text: string; raw?: unknown; sourceEventId?: string }
  | { type: "CALL_ENDED"; callStatus: CallStatus };

export type EngineResult = {
  sessionId: string;
  state: ConversationState;
  outcome?: OrderStatus;
  assistantPrompt?: { text: string; audioR2Key?: string; audioCacheKey?: string };
  aiUsed?: boolean;
  intent?: ConversationIntent;
};

function nextState(prev: ConversationState, intent: ConversationIntent): { state: ConversationState; outcome?: OrderStatus } {
  if (intent === "HUMAN_SUPPORT") return { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW };
  if (intent === "CHANGE_ADDRESS") return { state: "HANDOFF_HUMAN", outcome: OrderStatus.CHANGE_ADDRESS };
  if (intent === "RESCHEDULE") return { state: "HANDOFF_HUMAN", outcome: OrderStatus.RESCHEDULED };

  switch (prev) {
    case "GREETING":
      return intent === "AFFIRM" ? { state: "CONFIRM_IDENTITY" } : intent === "REJECT" ? { state: "END", outcome: OrderStatus.REJECTED } : { state: "CONFIRM_IDENTITY" };
    case "CONFIRM_IDENTITY":
      return intent === "AFFIRM" ? { state: "CONFIRM_ORDER_DETAILS" } : intent === "REJECT" ? { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW } : { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW };
    case "CONFIRM_ORDER_DETAILS":
      return intent === "AFFIRM" ? { state: "CONFIRM_ADDRESS" } : intent === "REJECT" ? { state: "END", outcome: OrderStatus.REJECTED } : { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW };
    case "CONFIRM_ADDRESS":
      return intent === "AFFIRM" ? { state: "CONFIRM_DELIVERY_TIME" } : intent === "REJECT" ? { state: "HANDOFF_HUMAN", outcome: OrderStatus.CHANGE_ADDRESS } : { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW };
    case "CONFIRM_DELIVERY_TIME":
      return intent === "AFFIRM" ? { state: "FINAL_CONFIRMATION" } : intent === "REJECT" ? { state: "HANDOFF_HUMAN", outcome: OrderStatus.RESCHEDULED } : { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW };
    case "FINAL_CONFIRMATION":
      return intent === "AFFIRM" ? { state: "SAVE_RESULT", outcome: OrderStatus.CONFIRMED } : intent === "REJECT" ? { state: "END", outcome: OrderStatus.REJECTED } : { state: "HANDOFF_HUMAN", outcome: OrderStatus.HUMAN_REVIEW };
    case "SAVE_RESULT":
      return { state: "END" };
    case "HANDOFF_HUMAN":
      return { state: "END" };
    case "END":
      return { state: "END" };
  }
}

function defaultVoice(args: { locale: ConversationLocale; dialect: string | null | undefined }): VoiceSettings {
  if (args.locale === "en") return { provider: "elevenlabs", voiceId: "Rachel" };
  if (args.dialect === "ar-EG") return { provider: "elevenlabs", voiceId: "ar-eg" };
  return { provider: "elevenlabs", voiceId: "ar" };
}

export async function ensureCachedAudio(args: {
  prisma: PrismaClient;
  env: WorkerEnv;
  businessId: string;
  locale: ConversationLocale;
  dialect?: string | null;
  voice: VoiceSettings;
  text: string;
}): Promise<{ audioCacheKey: string; audioR2Key?: string }> {
  const { cacheKey, textHash } = buildAudioCacheKey({
    businessId: args.businessId,
    locale: args.locale,
    dialect: args.dialect ?? undefined,
    voice: args.voice,
    text: args.text
  });

  const existing = await args.prisma.cachedAudio.findUnique({
    where: { businessId_cacheKey: { businessId: args.businessId, cacheKey } }
  });
  if (existing) return { audioCacheKey: cacheKey, audioR2Key: existing.r2Key || undefined };

  const providerCfg = await args.prisma.providerConfig.findFirst({
    where: { businessId: args.businessId, type: ProviderType.VOICE_ELEVENLABS, isActive: true, deletedAt: null }
  });
  const providerJson = (providerCfg?.config ?? {}) as any;
  const apiKeyRaw = (providerJson.apiKey ?? args.env.ELEVENLABS_API_KEY) as unknown;
  const apiKey =
    typeof apiKeyRaw === "string" ? (maybeDecryptSecret(apiKeyRaw, args.env.CONFIG_ENCRYPTION_KEY) as string) : undefined;
  const modelId = (providerJson.modelId ?? args.env.ELEVENLABS_MODEL_ID) as string | undefined;

  const audio = await elevenLabsTts({
    apiKey,
    modelId,
    voiceId: args.voice.voiceId,
    text: args.text,
    stability: args.voice.stability,
    similarityBoost: args.voice.similarityBoost,
    style: args.voice.style
  });

  if (!audio) {
    await args.prisma.cachedAudio.upsert({
      where: { businessId_cacheKey: { businessId: args.businessId, cacheKey } },
      update: { lastAccessedAt: new Date(), accessCount: { increment: 1 } },
      create: {
        businessId: args.businessId,
        cacheKey,
        locale: args.locale,
        voiceProvider: "elevenlabs",
        voiceId: args.voice.voiceId,
        text: args.text,
        textHash,
        r2Key: "",
        bytes: BigInt(0),
        format: "mp3"
      }
    });
    return { audioCacheKey: cacheKey };
  }

  const bucket = args.env.R2_BUCKET;
  const r2 = bucket ? createR2Client(args.env) : null;
  const r2Key = `audio-cache/${args.businessId}/${args.locale}/${args.voice.voiceId}/${textHash}.mp3`;

  const canUpload = Boolean(r2 && bucket);
  if (canUpload && r2 && bucket) {
    await putR2Object({ client: r2, bucket, key: r2Key, body: audio, contentType: "audio/mpeg" });
  }

  await args.prisma.cachedAudio.upsert({
    where: { businessId_cacheKey: { businessId: args.businessId, cacheKey } },
    update: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
      r2Key: canUpload ? r2Key : "",
      bytes: BigInt(audio.byteLength)
    },
    create: {
      businessId: args.businessId,
      cacheKey,
      locale: args.locale,
      voiceProvider: "elevenlabs",
      voiceId: args.voice.voiceId,
      text: args.text,
      textHash,
      r2Key: canUpload ? r2Key : "",
      bytes: BigInt(audio.byteLength),
      format: "mp3"
    }
  });

  await upsertUsageLog({
    prisma: args.prisma,
    businessId: args.businessId,
    dedupeKey: `tts:${args.businessId}:${cacheKey}`,
    type: UsageType.TTS_CHARACTERS,
    quantity: BigInt(args.text.length),
    callId: null,
    costUsd: 0
  });
  if (canUpload) {
    await upsertUsageLog({
      prisma: args.prisma,
      businessId: args.businessId,
      dedupeKey: `storage:${args.businessId}:${r2Key}`,
      type: UsageType.STORAGE_BYTES,
      quantity: BigInt(audio.byteLength),
      callId: null,
      costUsd: 0
    });
  }

  return { audioCacheKey: cacheKey, audioR2Key: canUpload ? r2Key : undefined };
}

export async function handleConversationEvent(args: {
  prisma: PrismaClient;
  env: WorkerEnv;
  businessId: string;
  callId: string;
  orderId?: string | null;
  agentId?: string | null;
  locale: ConversationLocale;
  dialect?: string | null;
  voice?: VoiceSettings | null;
  variables: ConversationVariables;
  event: EngineEvent;
}): Promise<EngineResult> {
  const dialect = args.dialect ?? (args.locale === "ar" ? "ar" : "en");
  const voice = args.voice ?? defaultVoice({ locale: args.locale, dialect });

  const session =
    (await args.prisma.conversationSession.findUnique({ where: { callId: args.callId } })) ??
    (await args.prisma.conversationSession.create({
      data: {
        businessId: args.businessId,
        callId: args.callId,
        orderId: args.orderId ?? null,
        agentId: args.agentId ?? null,
        flowKey: orderConfirmationFlow.key,
        locale: args.locale,
        dialect,
        state: orderConfirmationFlow.initial,
        variables: args.variables as any
      }
    }));

  const state = session.state as ConversationState;

  if (args.event.type === "CALL_ENDED") {
    await args.prisma.conversationSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() }
    });
    return { sessionId: session.id, state };
  }

  if (args.event.type === "CALL_STARTED") {
    const text = orderConfirmationFlow.renderPrompt({ state, locale: args.locale, dialect: dialect as any, v: args.variables });
    const audio = await ensureCachedAudio({
      prisma: args.prisma,
      env: args.env,
      businessId: args.businessId,
      locale: args.locale,
      dialect,
      voice,
      text
    });

    await args.prisma.conversationTurn.create({
      data: {
        businessId: args.businessId,
        sessionId: session.id,
        callId: args.callId,
        direction: ConversationDirection.ASSISTANT,
        state,
        text,
        audioCacheKey: audio.audioCacheKey,
        audioR2Key: audio.audioR2Key
      }
    });

    return { sessionId: session.id, state, assistantPrompt: { text, ...audio } };
  }

  const userText = args.event.text;
  const heuristic = detectIntentHeuristic({ text: userText, locale: args.locale, dialect: dialect as any });
  let intent = heuristic;
  let aiUsed = false;

  const shouldUseAi = intent === "UNKNOWN" || intent === "QUESTION" || intent === "CHANGE_ADDRESS" || intent === "HUMAN_SUPPORT";
  if (shouldUseAi) {
    const ai = await classifyIntentWithOpenAI({
      apiKey: args.env.OPENAI_API_KEY,
      baseUrl: args.env.OPENAI_BASE_URL,
      model: args.env.OPENAI_INTENT_MODEL,
      locale: args.locale,
      text: userText
    });
    if (ai.intent !== "UNKNOWN" && ai.confidence >= 0.55) {
      intent = ai.intent;
      aiUsed = true;
    }
    if (ai.totalTokens && ai.totalTokens > 0) {
      const sourceEventId = args.event.type === "USER_TRANSCRIPT" ? args.event.sourceEventId : undefined;
      if (sourceEventId) {
        await upsertUsageLog({
        prisma: args.prisma,
        businessId: args.businessId,
        dedupeKey: `ai:intent:${args.callId}:${sourceEventId}`,
        type: UsageType.AI_TOKENS,
        quantity: BigInt(ai.totalTokens),
        callId: args.callId,
        agentId: args.agentId ?? null,
        costUsd: 0
      });
      }
    }
  }

  await args.prisma.conversationTurn.create({
    data: {
      businessId: args.businessId,
      sessionId: session.id,
      callId: args.callId,
      direction: ConversationDirection.USER,
      state,
      text: userText,
      transcriptRaw: (args.event.raw ?? null) as any,
      intent,
      aiUsed
    }
  });

  const { state: next, outcome } = nextState(state, intent);
  const promptState: ConversationState = next === "SAVE_RESULT" ? "SAVE_RESULT" : next;
  const promptText = orderConfirmationFlow.renderPrompt({
    state: promptState,
    locale: args.locale,
    dialect: dialect as any,
    v: args.variables
  });

  const audio = await ensureCachedAudio({
    prisma: args.prisma,
    env: args.env,
    businessId: args.businessId,
    locale: args.locale,
    dialect,
    voice,
    text: promptText
  });

  await args.prisma.conversationTurn.create({
    data: {
      businessId: args.businessId,
      sessionId: session.id,
      callId: args.callId,
      direction: ConversationDirection.ASSISTANT,
      state: next,
      text: promptText,
      audioCacheKey: audio.audioCacheKey,
      audioR2Key: audio.audioR2Key
    }
  });

  await args.prisma.conversationSession.update({
    where: { id: session.id },
    data: {
      state: next,
      outcome: outcome ?? null
    }
  });

  return {
    sessionId: session.id,
    state: next,
    outcome,
    assistantPrompt: { text: promptText, ...audio },
    aiUsed,
    intent
  };
}

