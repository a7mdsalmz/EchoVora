import type { PrismaClient } from "@prisma/client";
import { CallStatus, UsageType } from "@prisma/client";
import type { WorkerEnv } from "../env.js";
import { upsertUsageLog } from "../billing/usage.js";

type SummaryResult = {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  intents: string[];
  escalationNeeded: boolean;
  raw?: unknown;
};

export async function summarizeCallCenterCall(args: { prisma: PrismaClient; env: WorkerEnv; businessId: string; callId: string }) {
  const call = await args.prisma.call.findUnique({ where: { id: args.callId } });
  if (!call || call.businessId !== args.businessId || call.deletedAt) return;
  if (call.status !== CallStatus.COMPLETED && call.status !== CallStatus.FAILED) return;

  const existing = await args.prisma.callSummary.findUnique({ where: { callId: call.id } });
  if (existing) return;

  const transcript = await args.prisma.callTranscript.findUnique({ where: { callId: call.id } });
  const text = String(transcript?.contentText ?? "").trim();
  if (!text.length) return;

  if (!args.env.OPENAI_API_KEY) {
    await args.prisma.callSummary.create({
      data: {
        businessId: call.businessId,
        callId: call.id,
        locale: call.locale,
        summary: call.locale === "ar" ? "لا يوجد مفتاح OpenAI لإنتاج الملخص." : "OpenAI key not configured for summarization.",
        details: { sentiment: "neutral", intents: [], escalationNeeded: false } as any
      }
    });
    return;
  }

  const baseUrl = args.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = "gpt-4o-mini";

  const sys = [
    "You summarize voice call transcripts for a business call center.",
    "Return a single-line JSON object with keys:",
    "summary (string), sentiment (positive|neutral|negative), intents (string[]), escalationNeeded (boolean).",
    "Be concise, do not include private data, do not hallucinate facts not in transcript.",
    `Language: ${call.locale}.`
  ].join(" ");

  const payload = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: text.slice(0, 12_000) }
    ]
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${args.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) return;
  const json = (await res.json()) as any;
  const content = String(json?.choices?.[0]?.message?.content ?? "").trim();
  const totalTokens = typeof json?.usage?.total_tokens === "number" ? json.usage.total_tokens : 0;

  const parsed: SummaryResult = (() => {
    try {
      const o = JSON.parse(content);
      const sentiment =
        o?.sentiment === "positive" || o?.sentiment === "negative" || o?.sentiment === "neutral" ? o.sentiment : "neutral";
      const intents = Array.isArray(o?.intents) ? o.intents.map((x: any) => String(x)).slice(0, 8) : [];
      return {
        summary: typeof o?.summary === "string" ? o.summary : content,
        sentiment,
        intents,
        escalationNeeded: Boolean(o?.escalationNeeded),
        raw: o
      };
    } catch {
      return { summary: content, sentiment: "neutral", intents: [], escalationNeeded: false, raw: content };
    }
  })();

  await args.prisma.callSummary.create({
    data: {
      businessId: call.businessId,
      callId: call.id,
      locale: call.locale,
      summary: parsed.summary.slice(0, 4000),
      details: { sentiment: parsed.sentiment, intents: parsed.intents, escalationNeeded: parsed.escalationNeeded } as any
    }
  });

  if (totalTokens > 0) {
    await upsertUsageLog({
      prisma: args.prisma,
      businessId: call.businessId,
      dedupeKey: `ai:ccsum:${call.businessId}:${call.id}`,
      type: UsageType.AI_TOKENS,
      quantity: BigInt(totalTokens),
      callId: call.id,
      agentId: call.agentId ?? null,
      costUsd: 0
    });
  }
}

