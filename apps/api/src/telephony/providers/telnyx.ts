import type { TelephonyProviderAdapter } from "../types.js";
import crypto from "node:crypto";

export function createTelnyxAdapter(secret?: string): TelephonyProviderAdapter {
  return {
    name: "telnyx",
    verifyWebhook({ headers, rawBody }) {
      if (!secret) return false;
      const signature = String(headers["telnyx-signature-ed25519"] ?? "");
      const timestamp = String(headers["telnyx-timestamp"] ?? "");
      if (!signature || !timestamp) return false;

      const now = Date.now();
      const tsNum = Number(timestamp);
      const tsMs = Number.isFinite(tsNum)
        ? tsNum > 1e12
          ? tsNum
          : tsNum * 1000
        : Number.isFinite(Date.parse(timestamp))
          ? Date.parse(timestamp)
          : NaN;
      if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > 5 * 60 * 1000) return false;

      const message = `${timestamp}|${rawBody}`;
      try {
        const keyPem = secret.includes("BEGIN PUBLIC KEY")
          ? secret
          : `-----BEGIN PUBLIC KEY-----\n${secret}\n-----END PUBLIC KEY-----`;
        const key = crypto.createPublicKey(keyPem);
        return crypto.verify(null, Buffer.from(message), key, Buffer.from(signature, "base64"));
      } catch {
        return false;
      }
    },
    parseEvent({ body }) {
      const data = body?.data ?? body ?? {};
      const payload = data?.payload ?? body?.payload ?? {};
      const providerCallId = String(payload?.call_control_id ?? body?.call_control_id ?? "");
      const eventType = String(data?.event_type ?? body?.event_type ?? "unknown");
      const occurredAtRaw = data?.occurred_at ?? body?.occurred_at;
      const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
      const directionRaw = payload?.direction ?? data?.direction;

      const fromRaw =
        payload?.from?.phone_number ??
        payload?.from ??
        payload?.call?.from ??
        payload?.call?.from_number ??
        payload?.caller_id ??
        payload?.callerId;
      const toRaw =
        Array.isArray(payload?.to) && payload.to.length > 0
          ? payload.to[0]?.phone_number ?? payload.to[0]
          : payload?.to?.phone_number ??
            payload?.to ??
            payload?.call?.to ??
            payload?.call?.to_number ??
            payload?.destination;

      const recordingUrl =
        payload?.recording_urls?.[0] ??
        payload?.recording_url ??
        payload?.recording?.url ??
        payload?.recording?.recording_url;
      const durationRaw = payload?.duration_seconds ?? payload?.duration_secs ?? payload?.call_duration;
      const costRaw = payload?.call_cost?.amount ?? payload?.cost?.amount ?? payload?.cost;

      return {
        provider: "telnyx",
        providerCallId,
        eventType,
        occurredAt,
        payload: body,
        direction: directionRaw ? (String(directionRaw).toUpperCase() === "OUTBOUND" ? "OUTBOUND" : "INBOUND") : undefined,
        fromNumber: fromRaw ? String(fromRaw) : undefined,
        toNumber: toRaw ? String(toRaw) : undefined,
        recordingUrl: recordingUrl ? String(recordingUrl) : undefined,
        durationSeconds: typeof durationRaw === "string" || typeof durationRaw === "number" ? Number(durationRaw) : undefined,
        telephonyCostUsd: typeof costRaw === "string" || typeof costRaw === "number" ? Math.abs(Number(costRaw)) : undefined
      };
    }
  };
}

