import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { RoleKey } from "@prisma/client";

const ListQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional()
});

export const callRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/calls",
    {
      preHandler: [app.authorize(RoleKey.VIEWER)]
    },
    async (req) => {
      const q = ListQuery.parse(req.query);
      const where: any = { businessId: req.user.businessId, deletedAt: null };
      if (q.status) where.status = q.status;
      if (q.from || q.to) {
        where.createdAt = {};
        if (q.from) where.createdAt.gte = new Date(q.from);
        if (q.to) where.createdAt.lte = new Date(q.to);
      }
      const items = await prisma.call.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100
      });
      return items;
    }
  );

  app.get(
    "/calls/:id",
    {
      preHandler: [app.authorize(RoleKey.VIEWER)]
    },
    async (req) => {
      const Params = z.object({ id: z.string().min(1) });
      const p = Params.parse(req.params);
      const call = await prisma.call.findFirst({
        where: { id: p.id, businessId: req.user.businessId, deletedAt: null },
        include: {
          telephonyEvents: { orderBy: { occurredAt: "asc" } },
          workflowRuns: { orderBy: { createdAt: "desc" } },
          transcript: true,
          summary: true,
          recordings: true
        }
      });
      if (!call) throw app.httpErrors.notFound("Call not found");
      return call;
    }
  );
};

