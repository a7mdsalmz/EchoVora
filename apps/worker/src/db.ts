import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaWorker?: PrismaClient;
};

export const prisma =
  globalForPrisma.prismaWorker ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaWorker = prisma;

