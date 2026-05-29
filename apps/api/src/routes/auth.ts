import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { newRefreshToken, signAccessToken } from "../auth/tokens.js";
import { RoleKey } from "@prisma/client";
import { businessSlugFromName } from "../utils/slug.js";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantName: z.string().min(2),
  locale: z.enum(["en", "ar"]).default("en")
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  businessId: z.string().min(1).optional()
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/register", async (req, reply) => {
    const input = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return reply.conflict("Email already in use");

    const passwordHash = await hashPassword(input.password);
    const created = await prisma.$transaction(async (tx) => {
      const ownerRole =
        (await tx.role.findUnique({ where: { key: RoleKey.BUSINESS_OWNER } })) ??
        (await tx.role.create({
          data: {
            key: RoleKey.BUSINESS_OWNER,
            level: 80,
            nameEn: "Business Owner",
            nameAr: "مالك النشاط"
          }
        }));

      const user = await tx.user.create({
        data: { email: input.email, passwordHash, preferredLocale: input.locale }
      });
      const business = await tx.business.create({
        data: {
          name: input.tenantName,
          slug: businessSlugFromName(input.tenantName),
          defaultLocale: input.locale
        }
      });
      await tx.businessMember.create({
        data: { businessId: business.id, userId: user.id, roleId: ownerRole.id, status: "ACTIVE" }
      });
      return { business, user, role: ownerRole.key };
    });

    const accessToken = await signAccessToken(app, {
      sub: created.user.id,
      businessId: created.business.id,
      role: created.role
    });
    const refreshToken = newRefreshToken();
    const expiresAt = new Date(Date.now() + app.config.JWT_REFRESH_TOKEN_TTL_SECONDS * 1000);
    await prisma.authSession.create({
      data: {
        userId: created.user.id,
        businessId: created.business.id,
        refreshToken,
        expiresAt
      }
    });

    return reply.send({
      accessToken,
      refreshToken,
      businessId: created.business.id
    });
  });

  app.post("/auth/login", async (req, reply) => {
    const input = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) return reply.unauthorized("Invalid credentials");
    if (user.deletedAt) return reply.unauthorized("Invalid credentials");

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) return reply.unauthorized("Invalid credentials");

    const isSuperAdmin = user.globalRole === RoleKey.SUPER_ADMIN;
    if (isSuperAdmin) {
      const targetBusinessId =
        input.businessId ??
        (
          await prisma.business
            .findFirst({ where: { slug: "system", deletedAt: null }, select: { id: true } })
            .then((b) => b?.id)
        ) ??
        (
          await prisma.business
            .create({
              data: {
                name: "EchoVora System",
                slug: "system",
                defaultLocale: "en"
              },
              select: { id: true }
            })
            .then((b) => b.id)
        );

      if (!targetBusinessId) return reply.internalServerError("Unable to resolve business context");

      const accessToken = await signAccessToken(app, {
        sub: user.id,
        businessId: targetBusinessId,
        role: RoleKey.SUPER_ADMIN
      });

      const refreshToken = newRefreshToken();
      const expiresAt = new Date(Date.now() + app.config.JWT_REFRESH_TOKEN_TTL_SECONDS * 1000);
      await prisma.authSession.create({
        data: { userId: user.id, businessId: targetBusinessId, refreshToken, expiresAt }
      });

      return reply.send({ accessToken, refreshToken });
    }

    const businessId =
      input.businessId ??
      (
        await prisma.businessMember
          .findFirst({
            where: { userId: user.id, deletedAt: null, business: { deletedAt: null } },
            select: { businessId: true },
            orderBy: { createdAt: "desc" }
          })
          .then((m) => m?.businessId)
      );
    if (!businessId) return reply.unauthorized("Invalid credentials");

    const membership = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
      include: { role: true, business: true }
    });
    if (!membership) return reply.unauthorized("Invalid credentials");
    if (membership.deletedAt) return reply.unauthorized("Invalid credentials");
    if (membership.business.deletedAt) return reply.unauthorized("Invalid credentials");

    const role = membership.role.key;
    const accessToken = await signAccessToken(app, {
      sub: user.id,
      businessId,
      role
    });
    const refreshToken = newRefreshToken();
    const expiresAt = new Date(Date.now() + app.config.JWT_REFRESH_TOKEN_TTL_SECONDS * 1000);
    await prisma.authSession.create({
      data: { userId: user.id, businessId, refreshToken, expiresAt }
    });

    return reply.send({ accessToken, refreshToken });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const Body = z.object({ refreshToken: z.string().min(1) });
    const input = Body.parse(req.body);
    const session = await prisma.authSession.findUnique({ where: { refreshToken: input.refreshToken } });
    if (!session) return reply.unauthorized("Invalid refresh token");
    if (session.expiresAt.getTime() < Date.now()) return reply.unauthorized("Expired refresh token");

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.deletedAt) return reply.unauthorized("Invalid session");

    const membership = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: session.businessId, userId: session.userId } },
      include: { role: true, business: true }
    });
    if (!membership) return reply.unauthorized("Invalid session");
    if (membership.deletedAt) return reply.unauthorized("Invalid session");
    if (membership.business.deletedAt) return reply.unauthorized("Invalid session");

    const role = user.globalRole === RoleKey.SUPER_ADMIN ? RoleKey.SUPER_ADMIN : membership.role.key;
    const accessToken = await signAccessToken(app, {
      sub: session.userId,
      businessId: session.businessId,
      role
    });
    return reply.send({ accessToken });
  });

  app.post(
    "/auth/switch-business",
    {
      preHandler: [app.authenticate]
    },
    async (req, reply) => {
      const Body = z.object({ businessId: z.string().min(1) });
      const input = Body.parse(req.body);

      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user || user.deletedAt) return reply.unauthorized("Invalid session");

      const isSuperAdmin = user.globalRole === RoleKey.SUPER_ADMIN || req.user.role === RoleKey.SUPER_ADMIN;

      if (!isSuperAdmin) {
        const membership = await prisma.businessMember.findUnique({
          where: { businessId_userId: { businessId: input.businessId, userId: user.id } },
          include: { role: true, business: true }
        });
        if (!membership || membership.deletedAt) return reply.forbidden("No access to business");
        if (membership.business.deletedAt) return reply.forbidden("No access to business");

        const accessToken = await signAccessToken(app, {
          sub: user.id,
          businessId: input.businessId,
          role: membership.role.key
        });
        return reply.send({ accessToken });
      }

      const biz = await prisma.business.findFirst({ where: { id: input.businessId, deletedAt: null } });
      if (!biz) return reply.notFound("Business not found");

      const accessToken = await signAccessToken(app, {
        sub: user.id,
        businessId: input.businessId,
        role: RoleKey.SUPER_ADMIN
      });
      return reply.send({ accessToken });
    }
  );

  app.get(
    "/auth/me",
    {
      preHandler: [app.authenticate]
    },
    async (req) => {
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user || user.deletedAt) throw app.httpErrors.unauthorized("Invalid session");

      return {
        userId: req.user.sub,
        businessId: req.user.businessId,
        role: req.user.role,
        globalRole: user.globalRole,
        email: user.email,
        name: user.name ?? null
      };
    }
  );
};

