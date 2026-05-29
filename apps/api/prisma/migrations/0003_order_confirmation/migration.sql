-- Enums
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'QUEUED',
  'CALLING',
  'CONFIRMED',
  'REJECTED',
  'RESCHEDULED',
  'CHANGE_ADDRESS',
  'NO_ANSWER',
  'FAILED',
  'HUMAN_REVIEW'
);

CREATE TYPE "OrderCampaignStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'CANCELED');

-- Order status migration (string -> enum)
ALTER TABLE "Order" ADD COLUMN "status_v2" "OrderStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Order"
SET "status_v2" = CASE
  WHEN UPPER("status") IN ('PENDING') THEN 'PENDING'::"OrderStatus"
  WHEN UPPER("status") IN ('QUEUED') THEN 'QUEUED'::"OrderStatus"
  WHEN UPPER("status") IN ('CALLING') THEN 'CALLING'::"OrderStatus"
  WHEN UPPER("status") IN ('CONFIRMED') THEN 'CONFIRMED'::"OrderStatus"
  WHEN UPPER("status") IN ('REJECTED') THEN 'REJECTED'::"OrderStatus"
  WHEN UPPER("status") IN ('RESCHEDULED') THEN 'RESCHEDULED'::"OrderStatus"
  WHEN UPPER("status") IN ('CHANGE_ADDRESS') THEN 'CHANGE_ADDRESS'::"OrderStatus"
  WHEN UPPER("status") IN ('NO_ANSWER','NOANSWER') THEN 'NO_ANSWER'::"OrderStatus"
  WHEN UPPER("status") IN ('FAILED') THEN 'FAILED'::"OrderStatus"
  WHEN UPPER("status") IN ('HUMAN_REVIEW','HUMANREVIEW') THEN 'HUMAN_REVIEW'::"OrderStatus"
  ELSE 'PENDING'::"OrderStatus"
END;

ALTER TABLE "Order" DROP COLUMN "status";
ALTER TABLE "Order" RENAME COLUMN "status_v2" TO "status";

-- New Order fields
ALTER TABLE "Order"
  ADD COLUMN "callAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "lastCallAt" TIMESTAMP(3),
  ADD COLUMN "nextCallAt" TIMESTAMP(3),
  ADD COLUMN "lastOutcome" "OrderStatus",
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "requiresHumanReview" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "reviewReason" TEXT;

-- Campaign tables
CREATE TABLE "OrderCampaign" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "OrderCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "OrderCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderCampaignItem" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "lastCallId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderCampaignItem_pkey" PRIMARY KEY ("id")
);

-- Constraints / relations
ALTER TABLE "OrderCampaign"
  ADD CONSTRAINT "OrderCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderCampaignItem"
  ADD CONSTRAINT "OrderCampaignItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OrderCampaignItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OrderCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OrderCampaignItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OrderCampaignItem_lastCallId_fkey" FOREIGN KEY ("lastCallId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Order_businessId_status_nextCallAt_idx" ON "Order"("businessId", "status", "nextCallAt");
CREATE INDEX "Order_status_idx" ON "Order"("status");

CREATE INDEX "OrderCampaign_businessId_idx" ON "OrderCampaign"("businessId");
CREATE INDEX "OrderCampaign_status_idx" ON "OrderCampaign"("status");
CREATE INDEX "OrderCampaign_scheduledAt_idx" ON "OrderCampaign"("scheduledAt");
CREATE INDEX "OrderCampaign_deletedAt_idx" ON "OrderCampaign"("deletedAt");

CREATE UNIQUE INDEX "OrderCampaignItem_campaignId_orderId_key" ON "OrderCampaignItem"("campaignId", "orderId");
CREATE INDEX "OrderCampaignItem_businessId_idx" ON "OrderCampaignItem"("businessId");
CREATE INDEX "OrderCampaignItem_campaignId_idx" ON "OrderCampaignItem"("campaignId");
CREATE INDEX "OrderCampaignItem_orderId_idx" ON "OrderCampaignItem"("orderId");
CREATE INDEX "OrderCampaignItem_status_idx" ON "OrderCampaignItem"("status");
CREATE INDEX "OrderCampaignItem_nextAttemptAt_idx" ON "OrderCampaignItem"("nextAttemptAt");

