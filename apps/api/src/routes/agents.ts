import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { AgentStatus, AgentType, RoleKey } from "@prisma/client";

const AgentCreateBody = z.object({
  type: z.nativeEnum(AgentType),
  status: z.nativeEnum(AgentStatus).optional(),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  defaultLocale: z.enum(["en", "ar"]).optional(),
  config: z.record(z.unknown()).optional(),
  knowledgeBaseIds: z.array(z.string().min(1)).optional()
});

const AgentUpdateBody = AgentCreateBody.partial().omit({ type: true });

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/agents", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const Query = z.object({ type: z.nativeEnum(AgentType).optional() });
    const q = Query.parse(req.query);

    const rows = await prisma.agent.findMany({
      where: {
        businessId: req.user.businessId,
        deletedAt: null,
        ...(q.type ? { type: q.type } : null)
      },
      orderBy: { updatedAt: "desc" }
    });
    return { agents: rows };
  });

  app.post("/agents", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req) => {
    const body = AgentCreateBody.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          businessId: req.user.businessId,
          type: body.type,
          status: body.status ?? AgentStatus.ACTIVE,
          nameEn: body.nameEn,
          nameAr: body.nameAr,
          descriptionEn: body.descriptionEn,
          descriptionAr: body.descriptionAr,
          defaultLocale: body.defaultLocale ?? "en",
          config: (body.config ?? {}) as any
        }
      });
      if (body.knowledgeBaseIds?.length) {
        await tx.agentKnowledgeBase.createMany({
          data: body.knowledgeBaseIds.map((kbId) => ({
            businessId: req.user.businessId,
            agentId: agent.id,
            knowledgeBaseId: kbId
          })),
          skipDuplicates: true
        });
      }
      return agent;
    });
    return { agent: created };
  });

  app.patch("/agents/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const body = AgentUpdateBody.parse(req.body);

    const existing = await prisma.agent.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();

    const updated = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.update({
        where: { id },
        data: {
          status: body.status,
          nameEn: body.nameEn,
          nameAr: body.nameAr,
          descriptionEn: body.descriptionEn,
          descriptionAr: body.descriptionAr,
          defaultLocale: body.defaultLocale,
          config: body.config ? (body.config as any) : undefined
        }
      });
      if (body.knowledgeBaseIds) {
        await tx.agentKnowledgeBase.deleteMany({ where: { businessId: req.user.businessId, agentId: id } });
        if (body.knowledgeBaseIds.length) {
          await tx.agentKnowledgeBase.createMany({
            data: body.knowledgeBaseIds.map((kbId) => ({
              businessId: req.user.businessId,
              agentId: id,
              knowledgeBaseId: kbId
            })),
            skipDuplicates: true
          });
        }
      }
      return agent;
    });

    return { agent: updated };
  });

  app.delete("/agents/:id", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const id = String((req.params as any)?.id ?? "");
    if (!id) return reply.badRequest("Missing id");
    const existing = await prisma.agent.findFirst({ where: { id, businessId: req.user.businessId, deletedAt: null } });
    if (!existing) return reply.notFound();

    await prisma.agent.update({ where: { id }, data: { deletedAt: new Date(), status: AgentStatus.DISABLED } });
    return { ok: true };
  });
};

