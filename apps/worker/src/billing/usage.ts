import type { PrismaClient, UsageType } from "@prisma/client";

export async function upsertUsageLog(args: {
  prisma: PrismaClient;
  businessId: string;
  dedupeKey: string;
  type: UsageType;
  quantity: bigint;
  costUsd?: number;
  callId?: string | null;
  agentId?: string | null;
  recordedAt?: Date;
}) {
  if (args.quantity <= 0n) return;
  const recordedAt = args.recordedAt ?? new Date();
  await args.prisma.usageLog.upsert({
    where: {
      businessId_dedupeKey: {
        businessId: args.businessId,
        dedupeKey: args.dedupeKey
      }
    },
    create: {
      businessId: args.businessId,
      dedupeKey: args.dedupeKey,
      type: args.type,
      quantity: args.quantity,
      costUsd: args.costUsd ?? 0,
      callId: args.callId ?? null,
      agentId: args.agentId ?? null,
      recordedAt
    },
    update: {
      type: args.type,
      quantity: args.quantity,
      costUsd: args.costUsd ?? 0,
      callId: args.callId ?? null,
      agentId: args.agentId ?? null,
      recordedAt
    }
  });
}

