-- Drop legacy tables
DROP TABLE IF EXISTS "WorkflowRun" CASCADE;
DROP TABLE IF EXISTS "TelephonyEvent" CASCADE;
DROP TABLE IF EXISTS "CallSession" CASCADE;
DROP TABLE IF EXISTS "Workflow" CASCADE;
DROP TABLE IF EXISTS "VoiceModule" CASCADE;
DROP TABLE IF EXISTS "AuthSession" CASCADE;
DROP TABLE IF EXISTS "Membership" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Tenant" CASCADE;

-- Drop legacy enums
DROP TYPE IF EXISTS "Role" CASCADE;

-- Create enums
CREATE TYPE "AppLocale" AS ENUM ('en', 'ar');
CREATE TYPE "RoleKey" AS ENUM ('SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'VIEWER');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE "AgentType" AS ENUM ('ORDER_CONFIRMATION', 'VOICE_CALL_CENTER', 'CUSTOMER_SUPPORT', 'SMART_WORKFLOWS');
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "TelephonyProvider" AS ENUM ('TWILIO', 'TELNYX', 'PLIVO');
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "CallStatus" AS ENUM ('NEW', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELED');
CREATE TYPE "TranscriptFormat" AS ENUM ('TEXT', 'JSON');
CREATE TYPE "UsageType" AS ENUM ('CALL_SECONDS', 'AI_TOKENS', 'TTS_CHARACTERS', 'STT_SECONDS', 'STORAGE_BYTES');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
CREATE TYPE "ProviderType" AS ENUM (
  'TELEPHONY_TWILIO',
  'TELEPHONY_TELNYX',
  'TELEPHONY_PLIVO',
  'AI_OPENAI',
  'VOICE_ELEVENLABS',
  'STORAGE_R2',
  'WHATSAPP'
);
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "WorkflowStatus" AS ENUM ('draft', 'published');
CREATE TYPE "RunStatus" AS ENUM ('running', 'succeeded', 'failed');

-- Core tables
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "preferredLocale" "AppLocale" NOT NULL DEFAULT 'en',
  "globalRole" "RoleKey" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Business" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultLocale" "AppLocale" NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "key" "RoleKey" NOT NULL,
  "level" INTEGER NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessMember" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- Billing
CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "priceMonthlyUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "monthlyMinutes" INTEGER NOT NULL,
  "agentsLimit" INTEGER NOT NULL,
  "ordersLimit" INTEGER NOT NULL,
  "teamMembersLimit" INTEGER NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "features" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "amountUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- AI + knowledge
CREATE TABLE "Agent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "type" "AgentType" NOT NULL,
  "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionAr" TEXT,
  "defaultLocale" "AppLocale" NOT NULL DEFAULT 'en',
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeBase" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionAr" TEXT,
  "content" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CRM
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "externalId" TEXT,
  "name" TEXT,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "externalId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- Telephony
CREATE TABLE "Call" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "customerId" TEXT,
  "orderId" TEXT,
  "agentId" TEXT,
  "provider" "TelephonyProvider" NOT NULL,
  "providerCallId" TEXT NOT NULL,
  "direction" "CallDirection" NOT NULL,
  "status" "CallStatus" NOT NULL DEFAULT 'NEW',
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "telephonyCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "aiCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "ttsCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "sttCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "storageCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "totalCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallTranscript" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "format" "TranscriptFormat" NOT NULL DEFAULT 'TEXT',
  "contentText" TEXT,
  "contentJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CallTranscript_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallRecording" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "r2Key" TEXT NOT NULL,
  "mimeType" TEXT,
  "bytes" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallRecording_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallSummary" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "summary" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CallSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelephonyEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "provider" "TelephonyProvider" NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelephonyEvent_pkey" PRIMARY KEY ("id")
);

-- Intent + usage
CREATE TABLE "Intent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionAr" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Intent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageLog" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "type" "UsageType" NOT NULL,
  "quantity" BIGINT NOT NULL DEFAULT 0,
  "costUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "callId" TEXT,
  "agentId" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- Providers + caching
CREATE TABLE "ProviderConfig" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "type" "ProviderType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "secretCiphertext" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CachedAudio" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "locale" "AppLocale" NOT NULL DEFAULT 'en',
  "voiceProvider" TEXT NOT NULL,
  "voiceId" TEXT,
  "text" TEXT NOT NULL,
  "textHash" TEXT NOT NULL,
  "r2Key" TEXT NOT NULL,
  "bytes" BIGINT NOT NULL DEFAULT 0,
  "format" TEXT NOT NULL DEFAULT 'mp3',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "lastAccessedAt" TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CachedAudio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerEventId" TEXT,
  "idempotencyKey" TEXT,
  "headers" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "body" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "signatureValid" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppMessage" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "direction" "CallDirection" NOT NULL,
  "fromNumber" TEXT NOT NULL,
  "toNumber" TEXT NOT NULL,
  "bodyText" TEXT,
  "media" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- Workflows (existing module/workflow engine)
CREATE TABLE "VoiceModule" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "inputs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "outputs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "VoiceModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workflow" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trigger" JSONB NOT NULL,
  "moduleGraph" JSONB NOT NULL,
  "aiPolicy" JSONB NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowRun" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "status" "RunStatus" NOT NULL DEFAULT 'running',
  "steps" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "totalCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- Indexes and uniqueness
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE INDEX "Role_level_idx" ON "Role"("level");

CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");
CREATE INDEX "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");
CREATE INDEX "BusinessMember_roleId_idx" ON "BusinessMember"("roleId");
CREATE INDEX "BusinessMember_status_idx" ON "BusinessMember"("status");

CREATE UNIQUE INDEX "AuthSession_refreshToken_key" ON "AuthSession"("refreshToken");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_businessId_idx" ON "AuthSession"("businessId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

CREATE UNIQUE INDEX "SubscriptionPlan_key_key" ON "SubscriptionPlan"("key");
CREATE UNIQUE INDEX "Subscription_businessId_key" ON "Subscription"("businessId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

CREATE INDEX "Invoice_businessId_idx" ON "Invoice"("businessId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

CREATE INDEX "Agent_businessId_idx" ON "Agent"("businessId");
CREATE INDEX "Agent_status_idx" ON "Agent"("status");
CREATE INDEX "Agent_type_idx" ON "Agent"("type");

CREATE INDEX "KnowledgeBase_businessId_idx" ON "KnowledgeBase"("businessId");

CREATE UNIQUE INDEX "Customer_businessId_phone_key" ON "Customer"("businessId", "phone");
CREATE UNIQUE INDEX "Customer_businessId_externalId_key" ON "Customer"("businessId", "externalId");
CREATE INDEX "Customer_businessId_idx" ON "Customer"("businessId");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

CREATE UNIQUE INDEX "Order_businessId_externalId_key" ON "Order"("businessId", "externalId");
CREATE INDEX "Order_businessId_idx" ON "Order"("businessId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

CREATE UNIQUE INDEX "Call_businessId_provider_providerCallId_key" ON "Call"("businessId", "provider", "providerCallId");
CREATE INDEX "Call_businessId_idx" ON "Call"("businessId");
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");
CREATE INDEX "Call_status_idx" ON "Call"("status");
CREATE INDEX "Call_customerId_idx" ON "Call"("customerId");
CREATE INDEX "Call_orderId_idx" ON "Call"("orderId");
CREATE INDEX "Call_agentId_idx" ON "Call"("agentId");

CREATE UNIQUE INDEX "CallTranscript_callId_key" ON "CallTranscript"("callId");
CREATE INDEX "CallTranscript_businessId_idx" ON "CallTranscript"("businessId");
CREATE INDEX "CallRecording_businessId_idx" ON "CallRecording"("businessId");
CREATE INDEX "CallRecording_callId_idx" ON "CallRecording"("callId");
CREATE UNIQUE INDEX "CallSummary_callId_key" ON "CallSummary"("callId");
CREATE INDEX "CallSummary_businessId_idx" ON "CallSummary"("businessId");

CREATE INDEX "TelephonyEvent_businessId_idx" ON "TelephonyEvent"("businessId");
CREATE INDEX "TelephonyEvent_callId_idx" ON "TelephonyEvent"("callId");
CREATE INDEX "TelephonyEvent_provider_idx" ON "TelephonyEvent"("provider");
CREATE INDEX "TelephonyEvent_eventType_idx" ON "TelephonyEvent"("eventType");

CREATE UNIQUE INDEX "Intent_businessId_key_key" ON "Intent"("businessId", "key");
CREATE INDEX "Intent_businessId_idx" ON "Intent"("businessId");

CREATE INDEX "UsageLog_businessId_idx" ON "UsageLog"("businessId");
CREATE INDEX "UsageLog_recordedAt_idx" ON "UsageLog"("recordedAt");
CREATE INDEX "UsageLog_type_idx" ON "UsageLog"("type");
CREATE INDEX "UsageLog_callId_idx" ON "UsageLog"("callId");

CREATE UNIQUE INDEX "ProviderConfig_businessId_type_key" ON "ProviderConfig"("businessId", "type");
CREATE INDEX "ProviderConfig_businessId_idx" ON "ProviderConfig"("businessId");
CREATE INDEX "ProviderConfig_type_idx" ON "ProviderConfig"("type");

CREATE UNIQUE INDEX "CachedAudio_businessId_cacheKey_key" ON "CachedAudio"("businessId", "cacheKey");
CREATE INDEX "CachedAudio_businessId_idx" ON "CachedAudio"("businessId");
CREATE INDEX "CachedAudio_expiresAt_idx" ON "CachedAudio"("expiresAt");
CREATE INDEX "CachedAudio_textHash_idx" ON "CachedAudio"("textHash");

CREATE UNIQUE INDEX "WebhookEvent_businessId_provider_providerEventId_key" ON "WebhookEvent"("businessId", "provider", "providerEventId");
CREATE UNIQUE INDEX "WebhookEvent_businessId_idempotencyKey_key" ON "WebhookEvent"("businessId", "idempotencyKey");
CREATE INDEX "WebhookEvent_businessId_idx" ON "WebhookEvent"("businessId");
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
CREATE INDEX "WebhookEvent_nextRetryAt_idx" ON "WebhookEvent"("nextRetryAt");

CREATE INDEX "WhatsAppMessage_businessId_idx" ON "WhatsAppMessage"("businessId");
CREATE INDEX "WhatsAppMessage_providerMessageId_idx" ON "WhatsAppMessage"("providerMessageId");
CREATE INDEX "WhatsAppMessage_status_idx" ON "WhatsAppMessage"("status");

CREATE INDEX "VoiceModule_businessId_idx" ON "VoiceModule"("businessId");
CREATE INDEX "Workflow_businessId_idx" ON "Workflow"("businessId");
CREATE INDEX "WorkflowRun_businessId_idx" ON "WorkflowRun"("businessId");
CREATE INDEX "WorkflowRun_callId_idx" ON "WorkflowRun"("callId");
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");

-- Soft-delete helpers (partial indexes)
CREATE INDEX "Business_not_deleted_idx" ON "Business"("id") WHERE "deletedAt" IS NULL;
CREATE INDEX "Agent_not_deleted_idx" ON "Agent"("businessId") WHERE "deletedAt" IS NULL;
CREATE INDEX "Customer_not_deleted_idx" ON "Customer"("businessId") WHERE "deletedAt" IS NULL;
CREATE INDEX "Order_not_deleted_idx" ON "Order"("businessId") WHERE "deletedAt" IS NULL;
CREATE INDEX "BusinessMember_not_deleted_idx" ON "BusinessMember"("businessId") WHERE "deletedAt" IS NULL;

