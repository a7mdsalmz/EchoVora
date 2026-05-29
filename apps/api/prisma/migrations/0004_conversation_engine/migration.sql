CREATE TYPE "ConversationDirection" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "ConversationSession" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "orderId" TEXT,
  "agentId" TEXT,
  "flowKey" TEXT NOT NULL,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "dialect" TEXT,
  "state" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "outcome" "OrderStatus",
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationTurn" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "direction" "ConversationDirection" NOT NULL,
  "state" TEXT NOT NULL,
  "text" TEXT,
  "transcriptRaw" JSONB,
  "intent" TEXT,
  "aiUsed" BOOLEAN NOT NULL DEFAULT FALSE,
  "audioCacheKey" TEXT,
  "audioR2Key" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationSession_callId_key" ON "ConversationSession"("callId");
CREATE INDEX "ConversationSession_businessId_idx" ON "ConversationSession"("businessId");
CREATE INDEX "ConversationSession_orderId_idx" ON "ConversationSession"("orderId");
CREATE INDEX "ConversationSession_agentId_idx" ON "ConversationSession"("agentId");
CREATE INDEX "ConversationSession_flowKey_idx" ON "ConversationSession"("flowKey");
CREATE INDEX "ConversationSession_state_idx" ON "ConversationSession"("state");

CREATE INDEX "ConversationTurn_businessId_idx" ON "ConversationTurn"("businessId");
CREATE INDEX "ConversationTurn_sessionId_idx" ON "ConversationTurn"("sessionId");
CREATE INDEX "ConversationTurn_callId_idx" ON "ConversationTurn"("callId");
CREATE INDEX "ConversationTurn_createdAt_idx" ON "ConversationTurn"("createdAt");
CREATE INDEX "ConversationTurn_direction_idx" ON "ConversationTurn"("direction");

ALTER TABLE "ConversationSession"
  ADD CONSTRAINT "ConversationSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ConversationSession_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ConversationSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ConversationSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationTurn"
  ADD CONSTRAINT "ConversationTurn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ConversationTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ConversationTurn_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

