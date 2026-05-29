ALTER TABLE "Call"
  ALTER COLUMN "telephonyCostUsd" TYPE DECIMAL(65,30),
  ALTER COLUMN "aiCostUsd" TYPE DECIMAL(65,30),
  ALTER COLUMN "ttsCostUsd" TYPE DECIMAL(65,30),
  ALTER COLUMN "sttCostUsd" TYPE DECIMAL(65,30),
  ALTER COLUMN "storageCostUsd" TYPE DECIMAL(65,30),
  ALTER COLUMN "totalCostUsd" TYPE DECIMAL(65,30);

ALTER TABLE "Invoice" ALTER COLUMN "amountUsd" TYPE DECIMAL(65,30);
ALTER TABLE "Order" ALTER COLUMN "amount" TYPE DECIMAL(65,30);
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "priceMonthlyUsd" TYPE DECIMAL(65,30);
ALTER TABLE "UsageLog" ALTER COLUMN "costUsd" TYPE DECIMAL(65,30);
ALTER TABLE "WorkflowRun" ALTER COLUMN "totalCostUsd" TYPE DECIMAL(65,30);

CREATE INDEX "Agent_deletedAt_idx" ON "Agent"("deletedAt");
CREATE INDEX "Business_deletedAt_idx" ON "Business"("deletedAt");
CREATE INDEX "BusinessMember_deletedAt_idx" ON "BusinessMember"("deletedAt");
CREATE INDEX "Call_deletedAt_idx" ON "Call"("deletedAt");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "Intent_deletedAt_idx" ON "Intent"("deletedAt");
CREATE INDEX "KnowledgeBase_deletedAt_idx" ON "KnowledgeBase"("deletedAt");
CREATE INDEX "Order_deletedAt_idx" ON "Order"("deletedAt");
CREATE INDEX "ProviderConfig_deletedAt_idx" ON "ProviderConfig"("deletedAt");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "VoiceModule_deletedAt_idx" ON "VoiceModule"("deletedAt");
CREATE INDEX "Workflow_deletedAt_idx" ON "Workflow"("deletedAt");
