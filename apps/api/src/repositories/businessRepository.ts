import { prisma } from "../db.js";
import { RoleKey } from "@prisma/client";

export type BusinessSummary = {
  businessId: string;
  slug?: string;
  name: string;
  defaultLocale: "en" | "ar";
  role: RoleKey;
};

export async function listBusinessesForUser(userId: string): Promise<BusinessSummary[]> {
  const memberships = await prisma.businessMember.findMany({
    where: {
      userId,
      deletedAt: null,
      business: { deletedAt: null }
    },
    include: { business: true, role: true }
  });

  return memberships.map((m) => ({
    businessId: m.businessId,
    slug: m.business.slug,
    name: m.business.name,
    defaultLocale: m.business.defaultLocale,
    role: m.role.key
  }));
}

export async function createBusinessWithOwner(input: {
  name: string;
  slug: string;
  ownerUserId: string;
  defaultLocale: "en" | "ar";
}) {
  const ownerRole = await prisma.role.findUnique({ where: { key: RoleKey.BUSINESS_OWNER } });
  if (!ownerRole) throw new Error("Missing Role.BUSINESS_OWNER");

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: input.name,
        slug: input.slug,
        defaultLocale: input.defaultLocale
      }
    });

    await tx.businessMember.create({
      data: {
        businessId: business.id,
        userId: input.ownerUserId,
        roleId: ownerRole.id,
        status: "ACTIVE"
      }
    });

    return business;
  });
}

