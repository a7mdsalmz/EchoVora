import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { RoleKey } from "@prisma/client";

const CreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  inputs: z.array(z.any()).default([]),
  outputs: z.array(z.any()).default([])
});

export const moduleRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/modules",
    {
      preHandler: [app.authorize(RoleKey.VIEWER)]
    },
    async (req) => {
      const items = await prisma.voiceModule.findMany({
        where: { businessId: req.user.businessId, deletedAt: null },
        orderBy: { updatedAt: "desc" }
      });
      return items;
    }
  );

  app.post(
    "/modules",
    {
      preHandler: [app.authorize(RoleKey.MANAGER)]
    },
    async (req) => {
      const input = CreateSchema.parse(req.body);
      const created = await prisma.voiceModule.create({
        data: {
          businessId: req.user.businessId,
          name: input.name,
          description: input.description,
          inputs: input.inputs as any,
          outputs: input.outputs as any
        }
      });
      return created;
    }
  );
};

