import { prisma } from "./db.js";
import { hashPassword } from "./auth/password.js";
import { getEnv } from "./env.js";
import { Prisma, RoleKey } from "@prisma/client";

const env = getEnv();

async function main() {
  const roles = [
    { key: RoleKey.SUPER_ADMIN, level: 100, nameEn: "Super Admin", nameAr: "مشرف عام" },
    { key: RoleKey.BUSINESS_OWNER, level: 80, nameEn: "Business Owner", nameAr: "مالك النشاط" },
    { key: RoleKey.MANAGER, level: 50, nameEn: "Manager", nameAr: "مدير" },
    { key: RoleKey.VIEWER, level: 10, nameEn: "Viewer", nameAr: "مشاهد" }
  ];

  await prisma.$transaction(async (tx) => {
    for (const r of roles) {
      await tx.role.upsert({
        where: { key: r.key },
        update: { level: r.level, nameEn: r.nameEn, nameAr: r.nameAr },
        create: r
      });
    }
  });

  const plans = [
    {
      key: "starter",
      nameEn: "Starter",
      nameAr: "ستارتر",
      priceMonthlyUsd: new Prisma.Decimal("49"),
      monthlyMinutes: 300,
      agentsLimit: 1,
      ordersLimit: 500,
      teamMembersLimit: 3,
      sortOrder: 10,
      features: {
        modules: ["order_confirmation"],
        integrations: [],
        billing: { extraMinuteUsd: 0.08 },
        placeholders: { stripe: true, paymob: true }
      }
    },
    {
      key: "growth",
      nameEn: "Growth",
      nameAr: "جروث",
      priceMonthlyUsd: new Prisma.Decimal("149"),
      monthlyMinutes: 2000,
      agentsLimit: 5,
      ordersLimit: 5000,
      teamMembersLimit: 10,
      sortOrder: 20,
      features: {
        modules: ["order_confirmation", "whatsapp_follow_up"],
        integrations: ["basic_integrations"],
        billing: { extraMinuteUsd: 0.06 },
        placeholders: { stripe: true, paymob: true }
      }
    },
    {
      key: "business",
      nameEn: "Business",
      nameAr: "بزنس",
      priceMonthlyUsd: new Prisma.Decimal("499"),
      monthlyMinutes: 8000,
      agentsLimit: 20,
      ordersLimit: 20000,
      teamMembersLimit: 50,
      sortOrder: 30,
      features: {
        modules: ["order_confirmation", "voice_call_center", "inbound_calls", "knowledge_base_ai", "advanced_analytics"],
        integrations: ["whatsapp", "crm_placeholder"],
        billing: { extraMinuteUsd: 0.045 },
        placeholders: { stripe: true, paymob: true }
      }
    },
    {
      key: "enterprise",
      nameEn: "Enterprise",
      nameAr: "إنتربرايز",
      priceMonthlyUsd: new Prisma.Decimal("999"),
      monthlyMinutes: 30000,
      agentsLimit: 100,
      ordersLimit: 100000,
      teamMembersLimit: 200,
      isPublic: false,
      sortOrder: 40,
      features: {
        modules: ["all"],
        integrations: ["api_access", "crm_integrations", "dedicated_infrastructure_option"],
        billing: { extraMinuteUsd: 0.03, customLimits: true },
        placeholders: { stripe: true, paymob: true }
      }
    }
  ];

  await prisma.$transaction(async (tx) => {
    for (const p of plans) {
      await tx.subscriptionPlan.upsert({
        where: { key: p.key },
        update: {
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          priceMonthlyUsd: p.priceMonthlyUsd,
          monthlyMinutes: p.monthlyMinutes,
          agentsLimit: p.agentsLimit,
          ordersLimit: p.ordersLimit,
          teamMembersLimit: p.teamMembersLimit,
          isPublic: p.isPublic ?? true,
          sortOrder: p.sortOrder,
          features: p.features as any
        },
        create: {
          key: p.key,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          priceMonthlyUsd: p.priceMonthlyUsd,
          monthlyMinutes: p.monthlyMinutes,
          agentsLimit: p.agentsLimit,
          ordersLimit: p.ordersLimit,
          teamMembersLimit: p.teamMembersLimit,
          isPublic: p.isPublic ?? true,
          sortOrder: p.sortOrder,
          features: p.features as any
        }
      });
    }
  });

  if (env.SEED_SUPERADMIN_EMAIL && env.SEED_SUPERADMIN_PASSWORD) {
    const email = env.SEED_SUPERADMIN_EMAIL;
    const passwordHash = await hashPassword(env.SEED_SUPERADMIN_PASSWORD);

    const superAdminRole = await prisma.role.findUnique({ where: { key: RoleKey.SUPER_ADMIN } });
    if (!superAdminRole) throw new Error("Missing Role.SUPER_ADMIN");

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: { globalRole: RoleKey.SUPER_ADMIN },
        create: { email, passwordHash, globalRole: RoleKey.SUPER_ADMIN }
      });

      const business = await tx.business.upsert({
        where: { slug: "system" },
        update: {},
        create: { slug: "system", name: "System", defaultLocale: "en" }
      });

      await tx.businessMember.upsert({
        where: { businessId_userId: { businessId: business.id, userId: user.id } },
        update: { roleId: superAdminRole.id, status: "ACTIVE" },
        create: { businessId: business.id, userId: user.id, roleId: superAdminRole.id, status: "ACTIVE" }
      });

      return { user, business };
    });

    await prisma.subscription.upsert({
      where: { businessId: created.business.id },
      update: {},
      create: {
        businessId: created.business.id,
        planId: (await prisma.subscriptionPlan.findUnique({ where: { key: "enterprise" } }))!.id,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
      }
    });
  }
}

await main()
  .finally(async () => {
    await prisma.$disconnect();
  });

