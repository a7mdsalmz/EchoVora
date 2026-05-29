import { createHash } from "node:crypto";
import type { VoiceSettings } from "./types.js";

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function buildAudioCacheKey(args: {
  businessId: string;
  locale: string;
  dialect?: string;
  voice: VoiceSettings;
  text: string;
}): { cacheKey: string; textHash: string } {
  const textHash = sha256Hex(args.text);
  const dialect = args.dialect ?? "";
  const cacheKey = `v1:${args.businessId}:${args.locale}:${dialect}:${args.voice.voiceId}:${textHash}`;
  return { cacheKey, textHash };
}

