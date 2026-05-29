ALTER TABLE "UsageLog" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "UsageLog_businessId_dedupeKey_key" ON "UsageLog"("businessId", "dedupeKey");
CREATE INDEX "UsageLog_businessId_recordedAt_idx" ON "UsageLog"("businessId", "recordedAt");
CREATE INDEX "UsageLog_businessId_type_recordedAt_idx" ON "UsageLog"("businessId", "type", "recordedAt");

CREATE INDEX "Order_businessId_deletedAt_createdAt_idx" ON "Order"("businessId", "deletedAt", "createdAt");
CREATE INDEX "Order_businessId_deletedAt_status_createdAt_idx" ON "Order"("businessId", "deletedAt", "status", "createdAt");

CREATE INDEX "Call_businessId_deletedAt_createdAt_idx" ON "Call"("businessId", "deletedAt", "createdAt");
CREATE INDEX "Call_businessId_deletedAt_status_createdAt_idx" ON "Call"("businessId", "deletedAt", "status", "createdAt");

CREATE INDEX "PhoneNumber_provider_e164_deletedAt_idx" ON "PhoneNumber"("provider", "e164", "deletedAt");

CREATE INDEX "UnansweredQuestion_businessId_resolvedAt_createdAt_idx" ON "UnansweredQuestion"("businessId", "resolvedAt", "createdAt");

CREATE INDEX "WorkflowRun_callId_createdAt_idx" ON "WorkflowRun"("callId", "createdAt");

CREATE INDEX "TelephonyEvent_callId_occurredAt_idx" ON "TelephonyEvent"("callId", "occurredAt");
