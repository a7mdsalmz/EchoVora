import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { prisma } from "../db.js";
import { OrderCampaignStatus, RoleKey, OrderStatus } from "@prisma/client";
import { createRedis } from "../queues/redis.js";
import { createOrderConfirmationQueue } from "../queues/orderConfirmation.js";
import { parseOrdersBuffer } from "../services/orderImport.js";

const ListQuery = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  q: z.string().optional()
});

const CreateSchema = z.object({
  externalId: z.string().optional(),
  amount: z.coerce.number().nonnegative().default(0),
  currency: z.string().min(1).default("USD"),
  notes: z.string().optional(),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().min(5),
    email: z.string().email().optional()
  })
});

const CreateCampaignSchema = z.object({
  name: z.string().min(2).default("Order Confirmation Campaign"),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  limit: z.coerce.number().int().positive().max(5000).default(500),
  scheduledAt: z.string().datetime().optional()
});

export const orderRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }
  });

  let redis: any | null = null;
  let queue: any | null = null;
  function getQueue() {
    if (!redis) redis = createRedis(app.config.REDIS_URL);
    if (!queue) queue = createOrderConfirmationQueue(redis);
    return queue;
  }
  app.addHook("onClose", async () => {
    await queue?.close();
    await redis?.quit();
  });

  app.get(
    "/orders",
    {
      preHandler: [app.authorize(RoleKey.VIEWER)]
    },
    async (req) => {
      const q = ListQuery.parse(req.query);
      const where: any = { businessId: req.user.businessId, deletedAt: null };
      if (q.status) where.status = q.status;
      if (q.q) {
        where.OR = [
          { externalId: { contains: q.q, mode: "insensitive" } },
          { customer: { phone: { contains: q.q } } },
          { customer: { name: { contains: q.q, mode: "insensitive" } } }
        ];
      }

      const items = await prisma.order.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 200
      });
      return items;
    }
  );

  app.get(
    "/orders/analytics",
    { preHandler: [app.authorize(RoleKey.VIEWER)] },
    async (req) => {
      const businessId = req.user.businessId;
      const totals = await prisma.order.groupBy({
        by: ["status"],
        where: { businessId, deletedAt: null },
        _count: { _all: true }
      });
      const totalOrders = totals.reduce((a, t) => a + t._count._all, 0);
      const get = (s: OrderStatus) => totals.find((t) => t.status === s)?._count._all ?? 0;

      return {
        totalOrders,
        confirmed: get(OrderStatus.CONFIRMED),
        rejected: get(OrderStatus.REJECTED),
        noAnswer: get(OrderStatus.NO_ANSWER),
        rescheduled: get(OrderStatus.RESCHEDULED),
        byStatus: Object.fromEntries(totals.map((t) => [t.status, t._count._all]))
      };
    }
  );

  app.post(
    "/orders",
    {
      preHandler: [app.authorize(RoleKey.MANAGER)]
    },
    async (req) => {
      const input = CreateSchema.parse(req.body);
      const businessId = req.user.businessId;

      const created = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { businessId_phone: { businessId, phone: input.customer.phone } },
          update: { name: input.customer.name, email: input.customer.email },
          create: {
            businessId,
            phone: input.customer.phone,
            name: input.customer.name,
            email: input.customer.email
          }
        });

        const order = await tx.order.create({
          data: {
            businessId,
            customerId: customer.id,
            externalId: input.externalId,
            amount: input.amount,
            currency: input.currency,
            notes: input.notes,
            status: OrderStatus.PENDING
          }
        });
        return { order, customer };
      });

      return created;
    }
  );

  app.get(
    "/orders/:id",
    {
      preHandler: [app.authorize(RoleKey.VIEWER)]
    },
    async (req) => {
      const Params = z.object({ id: z.string().min(1) });
      const p = Params.parse(req.params);
      const businessId = req.user.businessId;

      const order = await prisma.order.findFirst({
        where: { id: p.id, businessId, deletedAt: null },
        include: {
          customer: true,
          calls: { orderBy: { createdAt: "desc" }, take: 10 },
          campaignItems: { include: { campaign: true }, orderBy: { createdAt: "desc" }, take: 10 }
        }
      });
      if (!order) throw app.httpErrors.notFound("Order not found");
      return order;
    }
  );

  app.post(
    "/orders/:id/queue-confirmation",
    {
      preHandler: [app.authorize(RoleKey.MANAGER)]
    },
    async (req) => {
      const Params = z.object({ id: z.string().min(1) });
      const p = Params.parse(req.params);
      const businessId = req.user.businessId;
      const now = new Date();

      const order = await prisma.order.findFirst({
        where: { id: p.id, businessId, deletedAt: null }
      });
      if (!order) throw app.httpErrors.notFound("Order not found");

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.QUEUED, nextCallAt: now }
      });

      await getQueue().add("confirm", { businessId, orderId: order.id }, { jobId: `oc:${businessId}:${order.id}:${now.getTime()}` });
      return { ok: true, order: updated };
    }
  );

  app.post(
    "/orders/import",
    {
      preHandler: [app.authorize(RoleKey.MANAGER)]
    },
    async (req) => {
      const businessId = req.user.businessId;
      const file = await (req as any).file();
      if (!file) throw app.httpErrors.badRequest("Missing file");
      const filename = String(file.filename ?? "");
      const buf = await file.toBuffer();
      const rows = parseOrdersBuffer({ filename, buffer: buf });

      const results = {
        total: rows.length,
        createdCustomers: 0,
        createdOrders: 0,
        skipped: 0
      };

      await prisma.$transaction(async (tx) => {
        for (const r of rows) {
          const customer = await tx.customer.upsert({
            where: { businessId_phone: { businessId, phone: r.customerPhone } },
            update: { name: r.customerName, email: r.customerEmail },
            create: { businessId, phone: r.customerPhone, name: r.customerName, email: r.customerEmail }
          });

          if (r.externalId) {
            const existing = await tx.order.findUnique({
              where: { businessId_externalId: { businessId, externalId: r.externalId } }
            });
            if (existing) {
              results.skipped += 1;
              continue;
            }
          }

          await tx.order.create({
            data: {
              businessId,
              customerId: customer.id,
              externalId: r.externalId,
              amount: r.amount ? Number(r.amount) : 0,
              currency: r.currency ?? "USD",
              notes: r.notes,
              status: OrderStatus.PENDING
            }
          });
          results.createdOrders += 1;
        }
      });

      return results;
    }
  );

  app.post(
    "/orders/campaigns",
    {
      preHandler: [app.authorize(RoleKey.MANAGER)]
    },
    async (req) => {
      const input = CreateCampaignSchema.parse(req.body);
      const businessId = req.user.businessId;
      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date();

      const orders = await prisma.order.findMany({
        where: {
          businessId,
          deletedAt: null,
          status: input.status,
          callAttempts: { lt: 3 }
        } as any,
        orderBy: { createdAt: "asc" },
        take: input.limit
      });

      if (orders.length === 0) {
        return { ok: true, campaignId: null, queued: 0 };
      }

      const campaign = await prisma.$transaction(async (tx) => {
        const created = await tx.orderCampaign.create({
          data: {
            businessId,
            name: input.name,
            status: OrderCampaignStatus.RUNNING,
            createdByUserId: req.user.sub,
            scheduledAt,
            startedAt: new Date()
          }
        });

        for (const o of orders) {
          await tx.orderCampaignItem.create({
            data: {
              businessId,
              campaignId: created.id,
              orderId: o.id,
              status: OrderStatus.QUEUED,
              nextAttemptAt: scheduledAt
            }
          });
          await tx.order.update({
            where: { id: o.id },
            data: { status: OrderStatus.QUEUED, nextCallAt: scheduledAt }
          });
        }

        return created;
      });

      const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
      for (const o of orders) {
        await getQueue().add(
          "confirm",
          { businessId, orderId: o.id },
          { jobId: `oc:${businessId}:${o.id}:${scheduledAt.getTime()}`, delay: delayMs }
        );
      }

      return { ok: true, campaignId: campaign.id, queued: orders.length };
    }
  );

  app.get(
    "/orders/campaigns",
    { preHandler: [app.authorize(RoleKey.VIEWER)] },
    async (req) => {
      const businessId = req.user.businessId;
      const items = await prisma.orderCampaign.findMany({
        where: { businessId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          _count: { select: { items: true } }
        }
      });
      return items;
    }
  );

  app.get(
    "/orders/export",
    { preHandler: [app.authorize(RoleKey.VIEWER)] },
    async (req, reply) => {
      const Query = z.object({ campaignId: z.string().optional() });
      const q = Query.parse(req.query);
      const businessId = req.user.businessId;

      const orders = await prisma.order.findMany({
        where: {
          businessId,
          deletedAt: null,
          ...(q.campaignId
            ? {
                campaignItems: {
                  some: { campaignId: q.campaignId }
                }
              }
            : {})
        },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5000
      });

      const header = ["orderId", "externalId", "status", "customerName", "customerPhone", "amount", "currency", "createdAt"];
      const rows = orders.map((o) => [
        o.id,
        o.externalId ?? "",
        o.status,
        o.customer.name ?? "",
        o.customer.phone,
        String(o.amount),
        o.currency,
        o.createdAt.toISOString()
      ]);

      const csv = [header, ...rows]
        .map((r) =>
          r
            .map((v) => {
              const s = String(v);
              return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        )
        .join("\n");

      reply.header("content-type", "text/csv; charset=utf-8");
      reply.header("content-disposition", `attachment; filename=orders-${Date.now()}.csv`);
      return reply.send(csv);
    }
  );
};
