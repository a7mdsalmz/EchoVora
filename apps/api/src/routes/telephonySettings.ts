import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { RoleKey, TelephonyProvider, ProviderType } from "@prisma/client";
import { createRedis } from "../queues/redis.js";
import { createTelephonyTestCallsQueue } from "../queues/telephonyTestCalls.js";
import { encryptSecret } from "../utils/secretCrypto.js";

const ProviderParam = z.object({
  provider: z.enum(["twilio", "telnyx", "plivo"])
});

const UpsertProviderBody = z.object({
  isActive: z.boolean().optional(),
  config: z.record(z.any()).optional()
});

const CreatePhoneNumberBody = z.object({
  provider: z.enum(["TWILIO", "TELNYX", "PLIVO"]),
  e164: z.string().min(5),
  label: z.string().optional(),
  inboundEnabled: z.boolean().optional(),
  outboundEnabled: z.boolean().optional(),
  isPrimaryOutbound: z.boolean().optional()
});

const UpdatePhoneNumberBody = z.object({
  label: z.string().optional(),
  inboundEnabled: z.boolean().optional(),
  outboundEnabled: z.boolean().optional(),
  isPrimaryOutbound: z.boolean().optional()
});

const TestCallBody = z.object({
  to: z.string().min(5),
  provider: z.enum(["twilio", "telnyx", "plivo"]).optional(),
  fromNumberId: z.string().optional()
});

function providerTypeFromName(provider: "twilio" | "telnyx" | "plivo") {
  if (provider === "telnyx") return ProviderType.TELEPHONY_TELNYX;
  if (provider === "plivo") return ProviderType.TELEPHONY_PLIVO;
  return ProviderType.TELEPHONY_TWILIO;
}

function providerEnumFromName(provider: "twilio" | "telnyx" | "plivo") {
  if (provider === "telnyx") return TelephonyProvider.TELNYX;
  if (provider === "plivo") return TelephonyProvider.PLIVO;
  return TelephonyProvider.TWILIO;
}

export const telephonySettingsRoutes: FastifyPluginAsync = async (app) => {
  let redis: any | null = null;
  let queue: any | null = null;
  function getQueue() {
    if (!redis) redis = createRedis(app.config.REDIS_URL);
    if (!queue) queue = createTelephonyTestCallsQueue(redis);
    return queue;
  }
  app.addHook("onClose", async () => {
    await queue?.close();
    await redis?.quit();
  });

  app.get("/telephony/providers", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const rows = await prisma.providerConfig.findMany({
      where: {
        businessId: req.user.businessId,
        type: { in: [ProviderType.TELEPHONY_TWILIO, ProviderType.TELEPHONY_TELNYX, ProviderType.TELEPHONY_PLIVO] },
        deletedAt: null
      },
      orderBy: { updatedAt: "desc" }
    });
    const masked = rows.map((r) => {
      const cfg = (r.config ?? {}) as any;
      const out: any = { ...cfg };
      for (const k of ["authToken", "apiKey", "webhookSecret", "webhookPublicKey", "publicKey"]) {
        if (typeof out[k] === "string" && out[k].length) out[k] = "****";
      }
      return { ...r, config: out };
    });
    return { providers: masked };
  });

  app.put("/telephony/providers/:provider", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req) => {
    const params = ProviderParam.parse(req.params);
    const body = UpsertProviderBody.parse(req.body);
    const type = providerTypeFromName(params.provider);
    if (!app.config.CONFIG_ENCRYPTION_KEY) throw app.httpErrors.internalServerError("CONFIG_ENCRYPTION_KEY missing");

    const existing = await prisma.providerConfig.findUnique({ where: { businessId_type: { businessId: req.user.businessId, type } } });
    const prevCfg = (existing?.config ?? {}) as any;
    const rawCfg = (body.config ?? {}) as any;
    const cfg: any = { ...prevCfg, ...rawCfg };
    for (const k of ["authToken", "apiKey", "webhookSecret", "webhookPublicKey", "publicKey"]) {
      if (rawCfg && rawCfg[k] === "****") {
        cfg[k] = prevCfg[k];
      } else if (typeof cfg[k] === "string" && cfg[k].length && cfg[k] !== "****") {
        cfg[k] = encryptSecret(cfg[k], app.config.CONFIG_ENCRYPTION_KEY);
      }
    }

    const upserted = await prisma.providerConfig.upsert({
      where: { businessId_type: { businessId: req.user.businessId, type } },
      update: {
        isActive: body.isActive ?? true,
        config: cfg as any,
        deletedAt: null
      },
      create: {
        businessId: req.user.businessId,
        type,
        isActive: body.isActive ?? true,
        config: cfg as any
      }
    });

    const outCfg = { ...(upserted.config as any) };
    for (const k of ["authToken", "apiKey", "webhookSecret", "webhookPublicKey", "publicKey"]) {
      if (typeof outCfg[k] === "string" && outCfg[k].length) outCfg[k] = "****";
    }
    return { provider: { ...upserted, config: outCfg } };
  });

  app.get("/telephony/phone-numbers", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const rows = await prisma.phoneNumber.findMany({
      where: { businessId: req.user.businessId, deletedAt: null },
      orderBy: [{ provider: "asc" }, { isPrimaryOutbound: "desc" }, { updatedAt: "desc" }]
    });
    return { phoneNumbers: rows };
  });

  app.post("/telephony/phone-numbers", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req) => {
    const body = CreatePhoneNumberBody.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      if (body.isPrimaryOutbound) {
        await tx.phoneNumber.updateMany({
          where: { businessId: req.user.businessId, provider: body.provider as any, deletedAt: null },
          data: { isPrimaryOutbound: false }
        });
      }
      return tx.phoneNumber.create({
        data: {
          businessId: req.user.businessId,
          provider: body.provider as any,
          e164: body.e164,
          label: body.label,
          inboundEnabled: body.inboundEnabled ?? true,
          outboundEnabled: body.outboundEnabled ?? true,
          isPrimaryOutbound: body.isPrimaryOutbound ?? false
        }
      });
    });
    return { phoneNumber: created };
  });

  app.patch("/telephony/phone-numbers/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const body = UpdatePhoneNumberBody.parse(req.body);
    const existing = await prisma.phoneNumber.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isPrimaryOutbound === true) {
        await tx.phoneNumber.updateMany({
          where: { businessId: req.user.businessId, provider: existing.provider, deletedAt: null },
          data: { isPrimaryOutbound: false }
        });
      }
      return tx.phoneNumber.update({
        where: { id },
        data: {
          label: body.label,
          inboundEnabled: body.inboundEnabled,
          outboundEnabled: body.outboundEnabled,
          isPrimaryOutbound: body.isPrimaryOutbound
        }
      });
    });
    return { phoneNumber: updated };
  });

  app.post("/telephony/test-call", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const body = TestCallBody.parse(req.body);
    const providerName = body.provider ?? app.config.DEFAULT_TELEPHONY_PROVIDER ?? "twilio";
    const provider = providerEnumFromName(providerName);

    let fromNumber: string | null = null;
    if (body.fromNumberId) {
      const pn = await prisma.phoneNumber.findFirst({
        where: { id: body.fromNumberId, businessId: req.user.businessId, provider, outboundEnabled: true, deletedAt: null }
      });
      if (!pn) return reply.badRequest("Invalid fromNumberId");
      fromNumber = pn.e164;
    } else {
      const pn = await prisma.phoneNumber.findFirst({
        where: { businessId: req.user.businessId, provider, outboundEnabled: true, deletedAt: null },
        orderBy: [{ isPrimaryOutbound: "desc" }, { updatedAt: "desc" }]
      });
      fromNumber = pn?.e164 ?? null;
    }
    if (!fromNumber) return reply.badRequest("No outbound phone number configured");

    const job = await getQueue().add("call", {
      businessId: req.user.businessId,
      provider: providerName,
      to: body.to,
      from: fromNumber
    });

    return { ok: true, jobId: job.id ?? null };
  });
};

