import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { RoleKey } from "@prisma/client";

const CreateSchema = z.object({
  name: z.string().min(2),
  trigger: z.any(),
  moduleGraph: z.any(),
  aiPolicy: z.any()
});

export const workflowRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/workflows",
    {
      preHandler: [app.authorize(RoleKey.VIEWER)]
    },
    async (req) => {
      const items = await prisma.workflow.findMany({
        where: { businessId: req.user.businessId, deletedAt: null },
        orderBy: { updatedAt: "desc" }
      });
      return items;
    }
  );

  app.post(
    "/workflows",
    {
      preHandler: [app.authorize(RoleKey.MANAGER)]
    },
    async (req) => {
      const input = CreateSchema.parse(req.body);
      const created = await prisma.workflow.create({
        data: {
          businessId: req.user.businessId,
          name: input.name,
          trigger: input.trigger as any,
          moduleGraph: input.moduleGraph as any,
          aiPolicy: input.aiPolicy as any
        }
      });
      return created;
    }
  );
};

