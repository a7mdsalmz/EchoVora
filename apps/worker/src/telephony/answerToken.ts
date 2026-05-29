import crypto from "node:crypto";

function base64UrlEncode(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createAnswerToken(args: { secret: string; callId: string; ttlSeconds?: number }) {
  const ttl = args.ttlSeconds ?? 15 * 60;
  const payload = {
    callId: args.callId,
    exp: Math.floor(Date.now() / 1000) + ttl
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = crypto.createHmac("sha256", args.secret).update(payloadB64).digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

