import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { OrderStatus } from "@prisma/client";

const Query = z.object({
  token: z.string().min(10),
  Digits: z.string().optional(),
  digits: z.string().optional()
});

function base64UrlToBuffer(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function escapeXml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export const telephonyDtmfRoutes: FastifyPluginAsync = async (app) => {
  app.get("/telephony/dtmf", async (req, reply) => {
    const query = Query.parse(req.query);
    const secret = app.config.TELEPHONY_ANSWER_TOKEN_SECRET;
    if (!secret) return reply.notFound();

    const [payloadB64, sigB64] = query.token.split(".");
    if (!payloadB64 || !sigB64) return reply.notFound();
    const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest();
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

    const digit = String(query.Digits ?? query.digits ?? "").trim();
    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call || call.deletedAt) return reply.notFound();
    if (!call.orderId) return reply.notFound();

    let next: OrderStatus | null = null;
    let messageAr = "لم يتم استلام اختيار صحيح. سيتم إنهاء المكالمة الآن.";
    if (digit === "1") {
      next = OrderStatus.CONFIRMED;
      messageAr = "تم تأكيد طلبك. شكراً لك.";
    } else if (digit === "2") {
      next = OrderStatus.REJECTED;
      messageAr = "تم إلغاء الطلب. شكراً لك.";
    } else if (digit === "3") {
      next = OrderStatus.HUMAN_REVIEW;
      messageAr = "تم تسجيل طلب التعديل وسيقوم أحد الموظفين بالتواصل معك.";
    }

    if (next) {
      await prisma.order.update({
        where: { id: call.orderId },
        data: { status: next, lastOutcome: next, resolvedAt: new Date(), requiresHumanReview: next === OrderStatus.HUMAN_REVIEW }
      });
    }

    reply.header("cache-control", "no-store");
    reply.type("text/xml");
    const safe = escapeXml(messageAr);
    return reply.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say language="ar-EG">${safe}</Say><Hangup/></Response>`);
  });
};

