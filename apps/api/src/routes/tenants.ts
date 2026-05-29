import type { FastifyPluginAsync } from "fastify";
import { listBusinessesForUser } from "../repositories/businessRepository.js";
import { prisma } from "../db.js";
import { RoleKey } from "@prisma/client";

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/tenants",
    {
      preHandler: [app.authenticate]
    },
    async (req) => {
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (user?.globalRole === RoleKey.SUPER_ADMIN) {
        const businesses = await prisma.business.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 200
        });
        return businesses.map((b) => ({
          businessId: b.id,
          slug: b.slug,
          name: b.name,
          defaultLocale: b.defaultLocale,
          role: RoleKey.SUPER_ADMIN
        }));
      }

      return listBusinessesForUser(req.user.sub);
    }
  );
};

