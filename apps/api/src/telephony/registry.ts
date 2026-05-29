import type { TelephonyProviderAdapter, TelephonyProviderName } from "./types.js";
import { createPlivoAdapter } from "./providers/plivo.js";
import { createTelnyxAdapter } from "./providers/telnyx.js";
import { createTwilioAdapter } from "./providers/twilio.js";
import type { Env } from "../env.js";

export function createTelephonyAdapter(provider: TelephonyProviderName, secret?: string): TelephonyProviderAdapter {
  if (provider === "twilio") return createTwilioAdapter(secret);
  if (provider === "telnyx") return createTelnyxAdapter(secret);
  return createPlivoAdapter(secret);
}

export function getTelephonyAdapter(provider: TelephonyProviderName, env: Env): TelephonyProviderAdapter {
  if (provider === "twilio") return createTwilioAdapter(env.TELEPHONY_TWILIO_WEBHOOK_SECRET);
  if (provider === "telnyx") return createTelnyxAdapter(env.TELEPHONY_TELNYX_WEBHOOK_SECRET);
  return createPlivoAdapter(env.TELEPHONY_PLIVO_WEBHOOK_SECRET);
}

