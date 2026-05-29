import type { TelephonyProviderAdapter } from "../types.js";
import crypto from "node:crypto";

export function createPlivoAdapter(secret?: string): TelephonyProviderAdapter {
  return {
    name: "plivo",
    verifyWebhook({ headers, url, rawBody }) {
      if (!secret) return false;
      const sig = String(headers["x-plivo-signature-v2"] ?? "");
      if (!sig) return false;
      const expected = crypto.createHmac("sha256", secret).update(url + rawBody).digest("base64");
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    },
    parseEvent({ body }) {
      const providerCallId = String(body?.CallUUID ?? body?.call_uuid ?? "");
      const eventType = String(body?.Event ?? body?.event ?? "unknown");
      const occurredAtRaw = body?.Timestamp ?? body?.timestamp;
      const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
      const durationRaw = body?.Duration ?? body?.duration;
      const priceRaw = body?.TotalRate ?? body?.total_rate ?? body?.Charge ?? body?.charge;
      return {
        provider: "plivo",
        providerCallId,
        eventType,
        occurredAt,
        payload: body,
        direction: body?.Direction ? (String(body.Direction).toUpperCase() === "OUTBOUND" ? "OUTBOUND" : "INBOUND") : undefined,
        fromNumber: body?.From ? String(body.From) : undefined,
        toNumber: body?.To ? String(body.To) : undefined,
        recordingUrl: body?.RecordUrl ? String(body.RecordUrl) : undefined,
        durationSeconds: typeof durationRaw === "string" || typeof durationRaw === "number" ? Number(durationRaw) : undefined,
        telephonyCostUsd: typeof priceRaw === "string" || typeof priceRaw === "number" ? Math.abs(Number(priceRaw)) : undefined
      };
    }
  };
}

