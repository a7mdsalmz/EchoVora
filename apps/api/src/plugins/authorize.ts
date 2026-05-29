import fp from "fastify-plugin";
import { RoleKey } from "@prisma/client";
import { hasRoleAtLeast } from "../auth/rbac.js";
import { prisma } from "../db.js";

declare module "fastify" {
  interface FastifyInstance {
    authorize: (requiredRole: RoleKey) => (req: any) => Promise<void>;
  }
}

export default fp(async (app) => {
  app.decorate("authorize", (requiredRole: RoleKey) => {
    return async (req) => {
      await app.authenticate(req);
      const userId = String(req.user.sub ?? "");
      const businessId = String(req.user.businessId ?? "");
      if (!userId || !businessId) throw app.httpErrors.unauthorized("Invalid session");

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.deletedAt) throw app.httpErrors.unauthorized("User not found");

      if (user.globalRole === RoleKey.SUPER_ADMIN) {
        req.user.role = RoleKey.SUPER_ADMIN;
        if (!hasRoleAtLeast(RoleKey.SUPER_ADMIN, requiredRole)) throw app.httpErrors.forbidden("Insufficient role");
        return;
      }

      const membership = await prisma.businessMember.findFirst({
        where: {
          businessId,
          userId,
          status: "ACTIVE",
          deletedAt: null
        },
        include: { role: true, business: true }
      });

      if (!membership || membership.business.deletedAt) throw app.httpErrors.forbidden("Not a member of this business");

      const effectiveRole = membership.role.key as RoleKey;
      req.user.role = effectiveRole;

      if (!hasRoleAtLeast(effectiveRole, requiredRole)) {
        throw app.httpErrors.forbidden("Insufficient role");
      }
    };
  });
});

