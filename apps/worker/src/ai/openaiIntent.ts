import type { ConversationIntent, ConversationLocale } from "../conversation/types.js";

export type OpenAiIntentResult = { intent: ConversationIntent; confidence: number; raw?: unknown; totalTokens?: number };

const Allowed: ConversationIntent[] = ["AFFIRM", "REJECT", "UNKNOWN", "QUESTION", "CHANGE_ADDRESS", "RESCHEDULE", "HUMAN_SUPPORT"];

export async function classifyIntentWithOpenAI(args: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  locale: ConversationLocale;
  text: string;
}): Promise<OpenAiIntentResult> {
  if (!args.apiKey) return { intent: "UNKNOWN", confidence: 0 };
  const baseUrl = args.baseUrl ?? "https://api.openai.com/v1";
  const model = args.model ?? "gpt-4o-mini";

  const sys = [
    "You are an intent classifier for phone calls.",
    "Return a single-line JSON object with keys: intent, confidence.",
    `intent must be one of: ${Allowed.join(", ")}.`,
    "confidence must be a number from 0 to 1.",
    "Be strict and conservative: if unsure, return UNKNOWN with low confidence.",
    `Language is ${args.locale}.`
  ].join(" ");

  const payload = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: args.text }
    ]
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) return { intent: "UNKNOWN", confidence: 0 };
  const json = (await res.json()) as any;
  const content = String(json?.choices?.[0]?.message?.content ?? "").trim();
  const totalTokens = typeof json?.usage?.total_tokens === "number" ? json.usage.total_tokens : undefined;
  try {
    const parsed = JSON.parse(content);
    const intent = Allowed.includes(parsed.intent) ? (parsed.intent as ConversationIntent) : "UNKNOWN";
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
    return { intent, confidence, raw: parsed, totalTokens };
  } catch {
    return { intent: "UNKNOWN", confidence: 0, raw: content, totalTokens };
  }
}

