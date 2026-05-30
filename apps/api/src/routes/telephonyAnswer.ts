import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import crypto from "node:crypto";
import { ProviderType } from "@prisma/client";
import { maybeDecryptSecret } from "../utils/secretCrypto.js";

const Query = z.object({
  token: z.string().min(10)
});

function escapeXml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function base64UrlToBuffer(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export const telephonyAnswerRoutes: FastifyPluginAsync = async (app) => {
  app.get("/telephony/answer", async (req, reply) => {
    const query = Query.parse(req.query);
    if (!app.config.TELEPHONY_ANSWER_TOKEN_SECRET) return reply.notFound();

    function getFullUrl(req2: any, path: string) {
      if (app.config.PUBLIC_API_BASE_URL) {
        const base = String(app.config.PUBLIC_API_BASE_URL).replace(/\/+$/, "");
        return `${base}${path.startsWith("/") ? path : `/${path}`}`;
      }
      const xfProto = String(req2.headers["x-forwarded-proto"] ?? "");
      const proto = (xfProto ? xfProto.split(",")[0] : req2.protocol ?? "http").trim();
      const xfHost = String(req2.headers["x-forwarded-host"] ?? "");
      const host = (xfHost ? xfHost.split(",")[0] : req2.headers["host"] ?? req2.hostname ?? "").trim();
      return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
    }

    const [payloadB64, sigB64] = query.token.split(".");
    if (!payloadB64 || !sigB64) return reply.notFound();
    const expected = crypto
      .createHmac("sha256", app.config.TELEPHONY_ANSWER_TOKEN_SECRET)
      .update(payloadB64)
      .digest();
    const got = base64UrlToBuffer(sigB64);
    if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return reply.notFound();

    let callId = "";
    let exp = 0;
    try {
      const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString("utf8")) as any;
      callId = String(payload?.callId ?? "");
      exp = Number(payload?.exp ?? 0);
    } catch {
      return reply.notFound();
    }
    if (!callId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return reply.notFound();

    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call || call.deletedAt) return reply.notFound();

    const cfg = await prisma.providerConfig.findFirst({
      where: { businessId: call.businessId, type: ProviderType.VOICE_ELEVENLABS, isActive: true, deletedAt: null }
    });
    const cfgJson = (cfg?.config ?? {}) as any;
    const apiKeyRaw = (cfgJson.apiKey ?? app.config.ELEVENLABS_API_KEY) as unknown;
    const apiKey =
      typeof apiKeyRaw === "string" ? (maybeDecryptSecret(apiKeyRaw, app.config.CONFIG_ENCRYPTION_KEY) as string) : undefined;
    const voiceIdAr = (cfgJson.voiceIdAr ?? app.config.ELEVENLABS_VOICE_ID_AR) as string | undefined;
    const voiceIdEn = (cfgJson.voiceIdEn ?? app.config.ELEVENLABS_VOICE_ID_EN) as string | undefined;
    const voiceId = call.orderId ? voiceIdAr ?? voiceIdEn : call.locale === "ar" ? voiceIdAr : voiceIdEn;
    const canUseEleven = Boolean(apiKey) && Boolean(voiceId);
    const audioUrl = canUseEleven ? getFullUrl(req, `/api/telephony/tts?token=${encodeURIComponent(query.token)}`) : null;

    if (call.provider === "PLIVO") {
      reply.header("cache-control", "no-store");
      reply.type("text/xml");
      if (audioUrl) {
        const safeUrl = escapeXml(audioUrl);
        return reply.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Play>${safeUrl}</Play></Response>`);
      }
      const text = call.locale === "ar" ? "مرحباً. سيتم تحويلك الآن." : "Hello. Connecting you now.";
      const safeText = escapeXml(text);
      return reply.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>${safeText}</Speak></Response>`);
    }

    reply.header("cache-control", "no-store");
    reply.type("text/xml");
    if (audioUrl) {
      const safeUrl = escapeXml(audioUrl);
      if (call.provider === "TWILIO" && call.orderId) {
        const actionUrl = escapeXml(getFullUrl(req, `/api/telephony/dtmf?token=${encodeURIComponent(query.token)}`));
        return reply.send(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Gather numDigits="1" timeout="10" action="${actionUrl}" method="GET"><Play>${safeUrl}</Play></Gather><Hangup/></Response>`
        );
      }
      return reply.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Play>${safeUrl}</Play><Hangup/></Response>`);
    }
    const text = call.locale === "ar" ? "مرحباً. سيتم تحويلك الآن." : "Hello. Connecting you now.";
    const safeText = escapeXml(text);
    return reply.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>${safeText}</Say><Hangup/></Response>`);
  });
};

