CREATE TYPE "KnowledgeSourceType" AS ENUM ('FILE', 'URL');
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

CREATE TABLE "AgentKnowledgeBase" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentKnowledgeBase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeSource" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "type" "KnowledgeSourceType" NOT NULL,
  "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT,
  "sourceUrl" TEXT,
  "filename" TEXT,
  "mimeType" TEXT,
  "r2Key" TEXT,
  "extractedText" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "contentText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnswerCache" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "agentId" TEXT,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "questionHash" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "answerText" TEXT NOT NULL,
  "hitCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnswerCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnansweredQuestion" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "agentId" TEXT,
  "callId" TEXT,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "questionText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionText" TEXT,
  CONSTRAINT "UnansweredQuestion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AgentKnowledgeBase"
  ADD CONSTRAINT "AgentKnowledgeBase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentKnowledgeBase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentKnowledgeBase_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KnowledgeSource"
  ADD CONSTRAINT "KnowledgeSource_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeSource_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KnowledgeChunk"
  ADD CONSTRAINT "KnowledgeChunk_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AnswerCache"
  ADD CONSTRAINT "AnswerCache_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AnswerCache_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnansweredQuestion"
  ADD CONSTRAINT "UnansweredQuestion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "UnansweredQuestion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "UnansweredQuestion_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AgentKnowledgeBase_agentId_knowledgeBaseId_key" ON "AgentKnowledgeBase"("agentId", "knowledgeBaseId");
CREATE INDEX "AgentKnowledgeBase_businessId_idx" ON "AgentKnowledgeBase"("businessId");
CREATE INDEX "AgentKnowledgeBase_agentId_idx" ON "AgentKnowledgeBase"("agentId");
CREATE INDEX "AgentKnowledgeBase_knowledgeBaseId_idx" ON "AgentKnowledgeBase"("knowledgeBaseId");

CREATE INDEX "KnowledgeSource_businessId_idx" ON "KnowledgeSource"("businessId");
CREATE INDEX "KnowledgeSource_knowledgeBaseId_idx" ON "KnowledgeSource"("knowledgeBaseId");
CREATE INDEX "KnowledgeSource_status_idx" ON "KnowledgeSource"("status");
CREATE INDEX "KnowledgeSource_deletedAt_idx" ON "KnowledgeSource"("deletedAt");

CREATE UNIQUE INDEX "KnowledgeChunk_sourceId_chunkIndex_key" ON "KnowledgeChunk"("sourceId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_businessId_idx" ON "KnowledgeChunk"("businessId");
CREATE INDEX "KnowledgeChunk_sourceId_idx" ON "KnowledgeChunk"("sourceId");
CREATE INDEX "KnowledgeChunk_locale_idx" ON "KnowledgeChunk"("locale");

CREATE UNIQUE INDEX "AnswerCache_businessId_locale_questionHash_key" ON "AnswerCache"("businessId", "locale", "questionHash");
CREATE INDEX "AnswerCache_businessId_idx" ON "AnswerCache"("businessId");
CREATE INDEX "AnswerCache_agentId_idx" ON "AnswerCache"("agentId");
CREATE INDEX "AnswerCache_hitCount_idx" ON "AnswerCache"("hitCount");

CREATE INDEX "UnansweredQuestion_businessId_idx" ON "UnansweredQuestion"("businessId");
CREATE INDEX "UnansweredQuestion_agentId_idx" ON "UnansweredQuestion"("agentId");
CREATE INDEX "UnansweredQuestion_callId_idx" ON "UnansweredQuestion"("callId");
CREATE INDEX "UnansweredQuestion_createdAt_idx" ON "UnansweredQuestion"("createdAt");

-- Cost-optimized retrieval: full-text index over chunk content
CREATE INDEX "KnowledgeChunk_contentText_fts_idx" ON "KnowledgeChunk" USING GIN (to_tsvector('simple', "contentText"));

