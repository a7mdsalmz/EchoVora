import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { ProviderType, RoleKey } from "@prisma/client";
import { encryptSecret } from "../utils/secretCrypto.js";

const BusinessParam = z.object({ businessId: z.string().min(1) });

const ProviderTypeParam = z.object({
  type: z.enum(["TELEPHONY_TWILIO", "TELEPHONY_TELNYX", "TELEPHONY_PLIVO", "VOICE_ELEVENLABS", "ORDER_CONFIRMATION_SCRIPT_AR"])
});

const UpsertBody = z.object({
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
  e164: z.string().min(5).optional(),
  label: z.string().optional(),
  inboundEnabled: z.boolean().optional(),
  outboundEnabled: z.boolean().optional(),
  isPrimaryOutbound: z.boolean().optional()
});

function normalizeE164(input: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return raw;
  const prefixed = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
  const cleaned = prefixed.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  return `+${cleaned.replace(/\D/g, "")}`;
}

function maskConfig(input: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...input };
  for (const k of ["authToken", "apiKey", "webhookSecret", "webhookPublicKey", "publicKey"]) {
    if (typeof out[k] === "string" && (out[k] as string).length) out[k] = "****";
  }
  return out;
}

function encryptKnownSecrets(args: { config: Record<string, unknown>; encryptionKey: string; type: ProviderType }) {
  const cfg = { ...args.config } as Record<string, unknown>;
  const encryptKeys =
    args.type === ProviderType.VOICE_ELEVENLABS
      ? ["apiKey"]
      : ["authToken", "apiKey", "webhookSecret", "webhookPublicKey", "publicKey"];

  for (const k of encryptKeys) {
    const v = cfg[k];
    if (typeof v === "string" && v.length && v !== "****") cfg[k] = encryptSecret(v, args.encryptionKey);
  }
  return cfg;
}

export const adminIntegrationsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/integrations/:businessId/provider-configs", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async (req, reply) => {
    const p = BusinessParam.parse(req.params);
    const exists = await prisma.business.findFirst({ where: { id: p.businessId, deletedAt: null } });
    if (!exists) return reply.notFound("Business not found");

    const configs = await prisma.providerConfig.findMany({
      where: {
        businessId: p.businessId,
        deletedAt: null,
        type: {
          in: [
            ProviderType.TELEPHONY_TWILIO,
            ProviderType.TELEPHONY_TELNYX,
            ProviderType.TELEPHONY_PLIVO,
            ProviderType.VOICE_ELEVENLABS,
            ProviderType.ORDER_CONFIRMATION_SCRIPT_AR
          ]
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return {
      providerConfigs: configs.map((c) => ({
        ...c,
        config: maskConfig((c.config ?? {}) as any)
      }))
    };
  });

  app.put(
    "/admin/integrations/:businessId/provider-configs/:type",
    { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] },
    async (req, reply) => {
      const p = BusinessParam.parse(req.params);
      const pt = ProviderTypeParam.parse(req.params);
      const body = UpsertBody.parse(req.body);
      if (!app.config.CONFIG_ENCRYPTION_KEY) throw app.httpErrors.internalServerError("CONFIG_ENCRYPTION_KEY missing");

      const exists = await prisma.business.findFirst({ where: { id: p.businessId, deletedAt: null } });
      if (!exists) return reply.notFound("Business not found");

      const type = pt.type as ProviderType;
      const existing = await prisma.providerConfig.findUnique({ where: { businessId_type: { businessId: p.businessId, type } } });
      const prevCfg = (existing?.config ?? {}) as any;
      const incoming = (body.config ?? {}) as any;
      const merged = { ...prevCfg, ...incoming } as any;
      for (const k of ["authToken", "apiKey", "webhookSecret", "webhookPublicKey", "publicKey"]) {
        if (incoming && incoming[k] === "****") merged[k] = prevCfg[k];
      }

      const cfg = encryptKnownSecrets({
        config: merged as any,
        encryptionKey: app.config.CONFIG_ENCRYPTION_KEY,
        type
      });

      const upserted = await prisma.providerConfig.upsert({
        where: { businessId_type: { businessId: p.businessId, type } },
        update: { isActive: body.isActive ?? true, config: cfg as any, deletedAt: null },
        create: { businessId: p.businessId, type, isActive: body.isActive ?? true, config: cfg as any }
      });

      return { providerConfig: { ...upserted, config: maskConfig((upserted.config ?? {}) as any) } };
    }
  );

  app.get("/admin/integrations/:businessId/phone-numbers", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async (req, reply) => {
    const p = BusinessParam.parse(req.params);
    const exists = await prisma.business.findFirst({ where: { id: p.businessId, deletedAt: null } });
    if (!exists) return reply.notFound("Business not found");
    const rows = await prisma.phoneNumber.findMany({ where: { businessId: p.businessId, deletedAt: null }, orderBy: [{ provider: "asc" }, { isPrimaryOutbound: "desc" }, { updatedAt: "desc" }] });
    return { phoneNumbers: rows };
  });

  app.post("/admin/integrations/:businessId/phone-numbers", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async (req, reply) => {
    const p = BusinessParam.parse(req.params);
    const body = CreatePhoneNumberBody.parse(req.body);
    const exists = await prisma.business.findFirst({ where: { id: p.businessId, deletedAt: null } });
    if (!exists) return reply.notFound("Business not found");

    const created = await prisma.$transaction(async (tx) => {
      const e164 = normalizeE164(body.e164);
      if (body.isPrimaryOutbound) {
        await tx.phoneNumber.updateMany({
          where: { businessId: p.businessId, provider: body.provider as any, deletedAt: null },
          data: { isPrimaryOutbound: false }
        });
      }
      return tx.phoneNumber.create({
        data: {
          businessId: p.businessId,
          provider: body.provider as any,
          e164,
          label: body.label,
          inboundEnabled: body.inboundEnabled ?? true,
          outboundEnabled: body.outboundEnabled ?? true,
          isPrimaryOutbound: body.isPrimaryOutbound ?? false
        }
      });
    });
    return { phoneNumber: created };
  });

  app.patch("/admin/integrations/:businessId/phone-numbers/:id", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async (req, reply) => {
    const p = BusinessParam.parse(req.params);
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const body = UpdatePhoneNumberBody.parse(req.body);
    const existing = await prisma.phoneNumber.findFirst({ where: { id, businessId: p.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();

    const updated = await prisma.$transaction(async (tx) => {
      const e164 = typeof body.e164 === "string" ? normalizeE164(body.e164) : undefined;
      if (body.isPrimaryOutbound === true) {
        await tx.phoneNumber.updateMany({
          where: { businessId: p.businessId, provider: existing.provider, deletedAt: null },
          data: { isPrimaryOutbound: false }
        });
      }
      return tx.phoneNumber.update({
        where: { id },
        data: { e164, label: body.label, inboundEnabled: body.inboundEnabled, outboundEnabled: body.outboundEnabled, isPrimaryOutbound: body.isPrimaryOutbound }
      });
    });
    return { phoneNumber: updated };
  });

  app.delete("/admin/integrations/:businessId/phone-numbers/:id", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async (req, reply) => {
    const p = BusinessParam.parse(req.params);
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const existing = await prisma.phoneNumber.findFirst({ where: { id, businessId: p.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();

    await prisma.$transaction(async (tx) => {
      await tx.phoneNumber.delete({ where: { id } });

      if (existing.isPrimaryOutbound) {
        const next = await tx.phoneNumber.findFirst({
          where: { businessId: p.businessId, provider: existing.provider, deletedAt: null },
          orderBy: [{ outboundEnabled: "desc" }, { updatedAt: "desc" }]
        });
        if (next) {
          await tx.phoneNumber.update({ where: { id: next.id }, data: { isPrimaryOutbound: true } });
        }
      }
    });

    return { ok: true };
  });
};
