import type { TelephonyProviderAdapter } from "../types.js";
import crypto from "node:crypto";

export function createTwilioAdapter(secret?: string): TelephonyProviderAdapter {
  return {
    name: "twilio",
    verifyWebhook({ headers, url, rawBody }) {
      if (!secret) return false;
      const signature = String(headers["x-twilio-signature"] ?? "");
      if (!signature) return false;

      const params: Record<string, string> = {};
      const contentType = String(headers["content-type"] ?? "");
      if (contentType.includes("application/x-www-form-urlencoded")) {
        for (const [k, v] of new URLSearchParams(rawBody)) params[k] = v;
      } else if (typeof rawBody === "string" && rawBody.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(rawBody) as any;
          if (parsed && typeof parsed === "object") {
            for (const [k, v] of Object.entries(parsed)) params[k] = String(v);
          }
        } catch {
          void 0;
        }
      }

      const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
      const expected = crypto.createHmac("sha1", secret).update(data).digest("base64");
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    },
    parseEvent({ body }) {
      const providerCallId = String(body?.CallSid ?? body?.call_sid ?? "");
      const eventType = String(body?.EventType ?? body?.event_type ?? "unknown");
      const occurredAtRaw = body?.Timestamp ?? body?.timestamp;
      const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
      const durationRaw = body?.CallDuration ?? body?.call_duration ?? body?.Duration;
      const priceRaw = body?.CallPrice ?? body?.call_price ?? body?.Price;
      return {
        provider: "twilio",
        providerCallId,
        eventType,
        occurredAt,
        payload: body,
        direction: body?.Direction ? (String(body.Direction).toUpperCase() === "OUTBOUND" ? "OUTBOUND" : "INBOUND") : undefined,
        fromNumber: body?.From ? String(body.From) : undefined,
        toNumber: body?.To ? String(body.To) : undefined,
        recordingUrl: body?.RecordingUrl ? String(body.RecordingUrl) : undefined,
        transcriptText: body?.SpeechResult ? String(body.SpeechResult) : undefined,
        durationSeconds: typeof durationRaw === "string" || typeof durationRaw === "number" ? Number(durationRaw) : undefined,
        telephonyCostUsd: typeof priceRaw === "string" || typeof priceRaw === "number" ? Math.abs(Number(priceRaw)) : undefined
      };
    }
  };
}

