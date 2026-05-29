import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Prisma, RoleKey, SubscriptionStatus, UsageType } from "@prisma/client";
import { prisma } from "../db.js";

const ChangePlanBody = z.object({
  planKey: z.string().min(1)
});

const UsageLogsQuery = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100)
});

const UpdatePlanBody = z.object({
  nameEn: z.string().min(2).optional(),
  nameAr: z.string().min(2).optional(),
  priceMonthlyUsd: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  monthlyMinutes: z.coerce.number().int().nonnegative().optional(),
  agentsLimit: z.coerce.number().int().nonnegative().optional(),
  ordersLimit: z.coerce.number().int().nonnegative().optional(),
  teamMembersLimit: z.coerce.number().int().nonnegative().optional(),
  isPublic: z.boolean().optional(),
  features: z.record(z.unknown()).optional()
});

function num(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Prisma.Decimal) return Number(v);
  if (typeof v === "string" && v.length) return Number(v);
  return 0;
}

function getPlanBillingFeatures(plan: { key: string; features: unknown }) {
  const raw = (plan.features ?? {}) as Record<string, unknown>;
  const billing = (raw.billing ?? {}) as Record<string, unknown>;
  const modules = Array.isArray(raw.modules) ? raw.modules.map((v) => String(v)) : [];
  const integrations = Array.isArray(raw.integrations) ? raw.integrations.map((v) => String(v)) : [];
  const overageMinuteUsd =
    typeof billing.extraMinuteUsd === "number"
      ? billing.extraMinuteUsd
      : plan.key === "starter"
        ? 0.08
        : plan.key === "growth"
          ? 0.06
          : plan.key === "business"
            ? 0.045
            : 0.03;
  return { overageMinuteUsd, modules, integrations, billing };
}

async function getSubscriptionOrDefault(businessId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { businessId },
    include: { plan: true }
  });
  if (existing) return existing;

  const starter = await prisma.subscriptionPlan.findUnique({ where: { key: "starter" } });
  if (!starter) return null;
  const now = new Date();
  return prisma.subscription.create({
    data: {
      businessId,
      planId: starter.id,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30)
    },
    include: { plan: true }
  });
}

async function buildUsageSummary(args: {
  businessId: string;
  periodStart: Date;
  periodEnd: Date;
  plan: {
    key: string;
    monthlyMinutes: number;
    agentsLimit: number;
    ordersLimit: number;
    teamMembersLimit: number;
    priceMonthlyUsd: Prisma.Decimal;
    features: unknown;
  };
}) {
  const usageRows = await prisma.usageLog.groupBy({
    by: ["type"],
    where: {
      businessId: args.businessId,
      recordedAt: { gte: args.periodStart, lte: args.periodEnd }
    },
    _sum: { quantity: true, costUsd: true }
  });

  const usageByType = Object.fromEntries(
    usageRows.map((r) => [r.type, { quantity: num(r._sum.quantity), costUsd: num(r._sum.costUsd) }])
  );

  const callAgg = await prisma.call.aggregate({
    where: {
      businessId: args.businessId,
      createdAt: { gte: args.periodStart, lte: args.periodEnd },
      deletedAt: null
    },
    _sum: {
      durationSeconds: true,
      telephonyCostUsd: true,
      aiCostUsd: true,
      ttsCostUsd: true,
      sttCostUsd: true,
      storageCostUsd: true,
      totalCostUsd: true
    }
  });

  const activeAgents = await prisma.agent.count({
    where: { businessId: args.businessId, status: "ACTIVE", deletedAt: null }
  });
  const ordersThisPeriod = await prisma.order.count({
    where: { businessId: args.businessId, createdAt: { gte: args.periodStart, lte: args.periodEnd }, deletedAt: null }
  });
  const teamMembers = await prisma.businessMember.count({
    where: { businessId: args.businessId, status: "ACTIVE" }
  });

  const planFeatures = getPlanBillingFeatures(args.plan);
  const callSeconds = Math.max(num(usageByType[UsageType.CALL_SECONDS]?.quantity), num(callAgg._sum.durationSeconds));
  const usedMinutes = callSeconds / 60;
  const includedMinutes = args.plan.monthlyMinutes;
  const extraMinutes = Math.max(0, usedMinutes - includedMinutes);
  const extraMinutesCostUsd = extraMinutes * planFeatures.overageMinuteUsd;
  const subscriptionRevenueUsd = num(args.plan.priceMonthlyUsd);
  const estimatedRevenueUsd = subscriptionRevenueUsd + extraMinutesCostUsd;
  const storageUsageCostUsd = num(usageByType[UsageType.STORAGE_BYTES]?.costUsd);
  const directCostUsd = Math.max(num(callAgg._sum.totalCostUsd), 0) + storageUsageCostUsd;
  const profitUsd = estimatedRevenueUsd - directCostUsd;
  const profitMarginPct = estimatedRevenueUsd > 0 ? (profitUsd / estimatedRevenueUsd) * 100 : 0;

  return {
    periodStart: args.periodStart.toISOString(),
    periodEnd: args.periodEnd.toISOString(),
    includedMinutes,
    usedMinutes,
    remainingMinutes: Math.max(0, includedMinutes - usedMinutes),
    extraMinutes,
    overageMinuteUsd: planFeatures.overageMinuteUsd,
    extraMinutesCostUsd,
    aiTokens: num(usageByType[UsageType.AI_TOKENS]?.quantity),
    ttsCharacters: num(usageByType[UsageType.TTS_CHARACTERS]?.quantity),
    sttSeconds: Math.max(num(usageByType[UsageType.STT_SECONDS]?.quantity), 0),
    storageBytes: num(usageByType[UsageType.STORAGE_BYTES]?.quantity),
    telephonyCostUsd: num(callAgg._sum.telephonyCostUsd),
    aiCostUsd: num(callAgg._sum.aiCostUsd),
    ttsCostUsd: num(callAgg._sum.ttsCostUsd),
    sttCostUsd: num(callAgg._sum.sttCostUsd),
    storageCostUsd: Math.max(num(callAgg._sum.storageCostUsd), storageUsageCostUsd),
    directCostUsd,
    subscriptionRevenueUsd,
    estimatedRevenueUsd,
    profitUsd,
    profitMarginPct,
    limits: {
      agents: { used: activeAgents, included: args.plan.agentsLimit },
      orders: { used: ordersThisPeriod, included: args.plan.ordersLimit },
      teamMembers: { used: teamMembers, included: args.plan.teamMembersLimit }
    },
    features: planFeatures
  };
}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/billing/plans", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const current = await getSubscriptionOrDefault(req.user.businessId);
    const plans = await prisma.subscriptionPlan.findMany({
      where: current ? { OR: [{ isPublic: true }, { id: current.planId }] } : { isPublic: true },
      orderBy: { sortOrder: "asc" }
    });
    return { plans };
  });

  app.get("/billing/invoices", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const invoices = await prisma.invoice.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { issuedAt: "desc" },
      take: 50
    });
    return { invoices };
  });

  app.get("/billing/usage-logs", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const query = UsageLogsQuery.parse(req.query);
    const usageLogs = await prisma.usageLog.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { recordedAt: "desc" },
      take: query.limit
    });
    return { usageLogs };
  });

  app.get("/billing/overview", { preHandler: [app.authorize(RoleKey.VIEWER)] }, async (req) => {
    const subscription = await getSubscriptionOrDefault(req.user.businessId);
    if (!subscription) return { subscription: null, plans: [], usage: null, invoices: [] };

    const usage = await buildUsageSummary({
      businessId: req.user.businessId,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      plan: subscription.plan
    });
    const invoices = await prisma.invoice.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { issuedAt: "desc" },
      take: 12
    });
    const plans = await prisma.subscriptionPlan.findMany({
      where: { OR: [{ isPublic: true }, { id: subscription.planId }] },
      orderBy: { sortOrder: "asc" }
    });

    return {
      subscription,
      plans,
      usage,
      invoices
    };
  });

  app.post("/billing/subscription/change-plan", { preHandler: [app.authorize(RoleKey.MANAGER)] }, async (req, reply) => {
    const body = ChangePlanBody.parse(req.body);
    const plan = await prisma.subscriptionPlan.findUnique({ where: { key: body.planKey } });
    if (!plan) return reply.notFound("Plan not found");

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
    const subscription = await prisma.subscription.upsert({
      where: { businessId: req.user.businessId },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        cancelAt: null
      },
      create: {
        businessId: req.user.businessId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      },
      include: { plan: true }
    });

    const invoice = await prisma.invoice.create({
      data: {
        businessId: req.user.businessId,
        subscriptionId: subscription.id,
        periodStart: now,
        periodEnd,
        amountUsd: plan.priceMonthlyUsd,
        currency: plan.currency,
        status: "DRAFT",
        dueAt: periodEnd
      }
    });

    return { subscription, invoice };
  });

  app.get("/admin/billing/plans", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async () => {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
    return { plans };
  });

  app.put("/admin/billing/plans/:key", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async (req, reply) => {
    const key = String((req.params as any)?.key ?? "");
    if (!key) return reply.badRequest("Missing plan key");
    const body = UpdatePlanBody.parse(req.body);
    const existing = await prisma.subscriptionPlan.findUnique({ where: { key } });
    if (!existing) return reply.notFound("Plan not found");

    const plan = await prisma.subscriptionPlan.update({
      where: { key },
      data: {
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        priceMonthlyUsd: typeof body.priceMonthlyUsd === "number" ? new Prisma.Decimal(body.priceMonthlyUsd) : undefined,
        currency: body.currency,
        monthlyMinutes: body.monthlyMinutes,
        agentsLimit: body.agentsLimit,
        ordersLimit: body.ordersLimit,
        teamMembersLimit: body.teamMembersLimit,
        isPublic: body.isPublic,
        features: body.features ? (body.features as any) : undefined
      }
    });
    return { plan };
  });

  app.get("/admin/billing/businesses", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async () => {
    const subscriptions = await prisma.subscription.findMany({
      where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] } },
      include: { plan: true, business: true },
      orderBy: { updatedAt: "desc" }
    });

    const businesses = [];
    for (const sub of subscriptions) {
      const usage = await buildUsageSummary({
        businessId: sub.businessId,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        plan: sub.plan
      });
      businesses.push({
        businessId: sub.businessId,
        businessName: sub.business.name,
        planKey: sub.plan.key,
        status: sub.status,
        usage
      });
    }
    return { businesses };
  });

  app.get("/admin/billing/overview", { preHandler: [app.authorize(RoleKey.SUPER_ADMIN)] }, async () => {
    const subscriptions = await prisma.subscription.findMany({
      where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] } },
      include: { plan: true, business: true }
    });
    const invoices = await prisma.invoice.groupBy({
      by: ["status"],
      _sum: { amountUsd: true },
      _count: true
    });
    const byPlan = new Map<string, { count: number; mrrUsd: number }>();
    let totalRevenueUsd = 0;
    let totalCostUsd = 0;
    let totalExtraMinutes = 0;
    const businessMargins: Array<{ businessId: string; businessName: string; planKey: string; profitUsd: number; profitMarginPct: number }> = [];

    for (const sub of subscriptions) {
      const entry = byPlan.get(sub.plan.key) ?? { count: 0, mrrUsd: 0 };
      entry.count += 1;
      entry.mrrUsd += num(sub.plan.priceMonthlyUsd);
      byPlan.set(sub.plan.key, entry);

      const usage = await buildUsageSummary({
        businessId: sub.businessId,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        plan: sub.plan
      });
      totalRevenueUsd += usage.estimatedRevenueUsd;
      totalCostUsd += usage.directCostUsd;
      totalExtraMinutes += usage.extraMinutes;
      businessMargins.push({
        businessId: sub.businessId,
        businessName: sub.business.name,
        planKey: sub.plan.key,
        profitUsd: usage.profitUsd,
        profitMarginPct: usage.profitMarginPct
      });
    }

    businessMargins.sort((a, b) => b.profitUsd - a.profitUsd);
    return {
      totals: {
        activeBusinesses: subscriptions.length,
        mrrUsd: Array.from(byPlan.values()).reduce((n, x) => n + x.mrrUsd, 0),
        estimatedRevenueUsd: totalRevenueUsd,
        directCostUsd: totalCostUsd,
        grossProfitUsd: totalRevenueUsd - totalCostUsd,
        profitMarginPct: totalRevenueUsd > 0 ? ((totalRevenueUsd - totalCostUsd) / totalRevenueUsd) * 100 : 0,
        totalExtraMinutes
      },
      revenueByPlan: Array.from(byPlan.entries()).map(([planKey, v]) => ({ planKey, count: v.count, mrrUsd: v.mrrUsd })),
      invoices: invoices.map((i) => ({
        status: i.status,
        count: i._count,
        amountUsd: num(i._sum.amountUsd)
      })),
      topBusinesses: businessMargins.slice(0, 10)
    };
  });
};

