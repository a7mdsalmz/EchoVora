-- Call numbers
ALTER TABLE "Call" ADD COLUMN "fromNumber" TEXT;
ALTER TABLE "Call" ADD COLUMN "toNumber" TEXT;

CREATE INDEX "Call_fromNumber_idx" ON "Call"("fromNumber");
CREATE INDEX "Call_toNumber_idx" ON "Call"("toNumber");

-- Call recording enhancements
ALTER TABLE "CallRecording" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "CallRecording" ALTER COLUMN "r2Key" DROP NOT NULL;

-- Phone numbers per business/provider
CREATE TABLE "PhoneNumber" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" "TelephonyProvider" NOT NULL,
  "e164" TEXT NOT NULL,
  "providerNumberId" TEXT,
  "label" TEXT,
  "inboundEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "outboundEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "isPrimaryOutbound" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PhoneNumber"
  ADD CONSTRAINT "PhoneNumber_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PhoneNumber_businessId_provider_e164_key" ON "PhoneNumber"("businessId", "provider", "e164");
CREATE INDEX "PhoneNumber_businessId_idx" ON "PhoneNumber"("businessId");
CREATE INDEX "PhoneNumber_provider_idx" ON "PhoneNumber"("provider");
CREATE INDEX "PhoneNumber_e164_idx" ON "PhoneNumber"("e164");
CREATE INDEX "PhoneNumber_deletedAt_idx" ON "PhoneNumber"("deletedAt");

