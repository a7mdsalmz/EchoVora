import type { AuthMe, BusinessSummary, OrderAnalytics, OrderCampaignSummary, OrderDetail, OrderListItem, OrderStatus } from "@echovora/shared";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type RegisterPayload = {
  email: string;
  password: string;
  tenantName: string;
  locale: "en" | "ar";
};

export type LoginPayload = {
  email: string;
  password: string;
  businessId?: string;
};

export async function apiRegister(payload: RegisterPayload) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ accessToken: string; refreshToken: string; businessId: string }>;
}

export async function apiLogin(payload: LoginPayload) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

export async function apiSwitchBusiness(accessToken: string, businessId: string) {
  const res = await fetch(`${baseUrl}/api/auth/switch-business`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ businessId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ accessToken: string }>;
}

export async function apiMe(accessToken: string): Promise<AuthMe> {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AuthMe>;
}

export async function apiTenants(accessToken: string): Promise<BusinessSummary[]> {
  const res = await fetch(`${baseUrl}/api/tenants`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<BusinessSummary[]>;
}

export async function apiOrders(accessToken: string, args?: { status?: OrderStatus; q?: string }): Promise<OrderListItem[]> {
  const qs = new URLSearchParams();
  if (args?.status) qs.set("status", args.status);
  if (args?.q) qs.set("q", args.q);
  const res = await fetch(`${baseUrl}/api/orders?${qs.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OrderListItem[]>;
}

export async function apiOrdersAnalytics(accessToken: string): Promise<OrderAnalytics> {
  const res = await fetch(`${baseUrl}/api/orders/analytics`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OrderAnalytics>;
}

export async function apiOrder(accessToken: string, id: string) {
  const res = await fetch(`${baseUrl}/api/orders/${id}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OrderDetail>;
}

export async function apiCreateOrder(
  accessToken: string,
  payload: {
    externalId?: string;
    amount: number;
    currency: string;
    notes?: string;
    metadata?: { address?: string; items?: string };
    customer: { name?: string; phone: string; email?: string };
  }
) {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ order: { id: string } }>;
}

export async function apiQueueOrderConfirmation(accessToken: string, orderId: string) {
  const res = await fetch(`${baseUrl}/api/orders/${orderId}/queue-confirmation`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean }>;
}

export async function apiImportOrders(accessToken: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${baseUrl}/api/orders/import`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: fd
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ total: number; createdOrders: number; skipped: number }>;
}

export async function apiCreateOrderCampaign(
  accessToken: string,
  payload: { name?: string; status?: OrderStatus; limit?: number; scheduledAt?: string }
) {
  const res = await fetch(`${baseUrl}/api/orders/campaigns`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; campaignId: string | null; queued: number }>;
}

export async function apiOrderCampaigns(accessToken: string): Promise<OrderCampaignSummary[]> {
  const res = await fetch(`${baseUrl}/api/orders/campaigns`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OrderCampaignSummary[]>;
}

export type CallListItem = {
  id: string;
  provider: string;
  providerCallId: string;
  direction: string;
  status: string;
  locale: string;
  fromNumber: string | null;
  toNumber: string | null;
  orderId: string | null;
  agentId: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type CallDetail = CallListItem & {
  telephonyEvents: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    payload: unknown;
  }>;
  workflowRuns: Array<{ id: string; workflowKey: string; status: string; createdAt: string; updatedAt: string }>;
  transcript: null | { id: string; format: string; contentText: string | null; updatedAt: string };
  summary: null | { id: string; summary: string; details: unknown; updatedAt: string };
  recordings: Array<{ id: string; sourceUrl: string | null; r2Key: string | null; createdAt: string }>;
};

export async function apiCalls(accessToken: string, args?: { from?: string; to?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (args?.from) qs.set("from", args.from);
  if (args?.to) qs.set("to", args.to);
  if (args?.status) qs.set("status", args.status);
  const res = await fetch(`${baseUrl}/api/calls?${qs.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CallListItem[]>;
}

export async function apiCall(accessToken: string, callId: string) {
  const res = await fetch(`${baseUrl}/api/calls/${callId}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CallDetail>;
}

export type TelephonyProviderName = "twilio" | "telnyx" | "plivo";

export type TelephonyProviderConfig = {
  id: string;
  type: string;
  isActive: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
};

export type TelephonyPhoneNumber = {
  id: string;
  provider: "TWILIO" | "TELNYX" | "PLIVO";
  e164: string;
  label: string | null;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  isPrimaryOutbound: boolean;
};

export async function apiTelephonyProviders(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/telephony/providers`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ providers: TelephonyProviderConfig[] }>;
}

export async function apiUpsertTelephonyProvider(
  accessToken: string,
  provider: TelephonyProviderName,
  payload: { isActive?: boolean; config?: Record<string, unknown> }
) {
  const res = await fetch(`${baseUrl}/api/telephony/providers/${provider}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ provider: TelephonyProviderConfig }>;
}

export async function apiTelephonyPhoneNumbers(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/telephony/phone-numbers`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ phoneNumbers: TelephonyPhoneNumber[] }>;
}

export async function apiCreateTelephonyPhoneNumber(
  accessToken: string,
  payload: {
    provider: "TWILIO" | "TELNYX" | "PLIVO";
    e164: string;
    label?: string;
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isPrimaryOutbound?: boolean;
  }
) {
  const res = await fetch(`${baseUrl}/api/telephony/phone-numbers`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ phoneNumber: TelephonyPhoneNumber }>;
}

export async function apiUpdateTelephonyPhoneNumber(
  accessToken: string,
  id: string,
  payload: { label?: string; inboundEnabled?: boolean; outboundEnabled?: boolean; isPrimaryOutbound?: boolean }
) {
  const res = await fetch(`${baseUrl}/api/telephony/phone-numbers/${id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ phoneNumber: TelephonyPhoneNumber }>;
}

export async function apiTelephonyTestCall(
  accessToken: string,
  payload: { to: string; provider?: TelephonyProviderName; fromNumberId?: string }
) {
  const res = await fetch(`${baseUrl}/api/telephony/test-call`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; jobId: string | null }>;
}

export type CallCenterAgent = {
  id: string;
  status: string;
  nameEn: string;
  nameAr: string;
  defaultLocale: "en" | "ar";
  config: Record<string, unknown>;
  updatedAt: string;
};

export type KnowledgeBase = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  updatedAt: string;
};

export type KnowledgeSource = {
  id: string;
  type: "FILE" | "URL";
  status: "PENDING" | "READY" | "FAILED";
  title: string | null;
  sourceUrl: string | null;
  filename: string | null;
  mimeType: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

export type UnansweredQuestion = {
  id: string;
  agentId: string | null;
  callId: string | null;
  locale: "en" | "ar";
  questionText: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type AgentType = "ORDER_CONFIRMATION" | "VOICE_CALL_CENTER" | "CUSTOMER_SUPPORT" | "SMART_WORKFLOWS";

export type Agent = {
  id: string;
  type: AgentType;
  status: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  defaultLocale: "en" | "ar";
  config: Record<string, unknown>;
  updatedAt: string;
};

export async function apiAgents(accessToken: string, args?: { type?: AgentType }) {
  const qs = new URLSearchParams();
  if (args?.type) qs.set("type", args.type);
  const res = await fetch(`${baseUrl}/api/agents?${qs.toString()}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ agents: Agent[] }>;
}

export async function apiCreateAgent(
  accessToken: string,
  payload: {
    type: AgentType;
    nameEn: string;
    nameAr: string;
    descriptionEn?: string;
    descriptionAr?: string;
    defaultLocale?: "en" | "ar";
    status?: string;
    config?: Record<string, unknown>;
    knowledgeBaseIds?: string[];
  }
) {
  const res = await fetch(`${baseUrl}/api/agents`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ agent: Agent }>;
}

export async function apiCallCenterAgents(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/call-center/agents`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ agents: CallCenterAgent[] }>;
}

export async function apiCreateCallCenterAgent(
  accessToken: string,
  payload: {
    nameEn: string;
    nameAr: string;
    descriptionEn?: string;
    descriptionAr?: string;
    defaultLocale?: "en" | "ar";
    status?: string;
    config?: Record<string, unknown>;
    knowledgeBaseIds?: string[];
  }
) {
  const res = await fetch(`${baseUrl}/api/call-center/agents`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ agent: CallCenterAgent }>;
}

export async function apiKnowledgeBases(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/call-center/knowledge-bases`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ knowledgeBases: KnowledgeBase[] }>;
}

export async function apiCreateKnowledgeBase(
  accessToken: string,
  payload: { nameEn: string; nameAr: string; descriptionEn?: string; descriptionAr?: string }
) {
  const res = await fetch(`${baseUrl}/api/call-center/knowledge-bases`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ knowledgeBase: KnowledgeBase }>;
}

export async function apiKnowledgeSources(accessToken: string, knowledgeBaseId: string) {
  const res = await fetch(`${baseUrl}/api/call-center/knowledge-bases/${knowledgeBaseId}/sources`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ sources: KnowledgeSource[] }>;
}

export async function apiAddKnowledgeSourceUrl(accessToken: string, knowledgeBaseId: string, payload: { title?: string; url: string }) {
  const res = await fetch(`${baseUrl}/api/call-center/knowledge-bases/${knowledgeBaseId}/sources/url`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ source: KnowledgeSource }>;
}

export async function apiUploadKnowledgeSourceFile(accessToken: string, knowledgeBaseId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${baseUrl}/api/call-center/knowledge-bases/${knowledgeBaseId}/sources/upload`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: fd
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ source: KnowledgeSource }>;
}

export async function apiUnansweredQuestions(accessToken: string, args?: { resolved?: boolean }) {
  const qs = new URLSearchParams();
  if (args?.resolved === true) qs.set("resolved", "true");
  if (args?.resolved === false) qs.set("resolved", "false");
  const res = await fetch(`${baseUrl}/api/call-center/unanswered?${qs.toString()}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ unanswered: UnansweredQuestion[] }>;
}

export type BillingPlan = {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  priceMonthlyUsd: string;
  currency: string;
  monthlyMinutes: number;
  agentsLimit: number;
  ordersLimit: number;
  teamMembersLimit: number;
  isPublic: boolean;
  sortOrder: number;
  features: Record<string, unknown>;
};

export type BillingInvoice = {
  id: string;
  amountUsd: string;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
};

export type BillingSubscription = {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  canceledAt: string | null;
  plan: BillingPlan;
};

export type BillingUsageSummary = {
  periodStart: string;
  periodEnd: string;
  includedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  extraMinutes: number;
  overageMinuteUsd: number;
  extraMinutesCostUsd: number;
  aiTokens: number;
  ttsCharacters: number;
  sttSeconds: number;
  storageBytes: number;
  telephonyCostUsd: number;
  aiCostUsd: number;
  ttsCostUsd: number;
  sttCostUsd: number;
  storageCostUsd: number;
  directCostUsd: number;
  subscriptionRevenueUsd: number;
  estimatedRevenueUsd: number;
  profitUsd: number;
  profitMarginPct: number;
  limits: {
    agents: { used: number; included: number };
    orders: { used: number; included: number };
    teamMembers: { used: number; included: number };
  };
  features: {
    overageMinuteUsd: number;
    modules: string[];
    integrations: string[];
    billing: Record<string, unknown>;
  };
};

export type BillingUsageLog = {
  id: string;
  type: string;
  quantity: string;
  costUsd: string;
  callId: string | null;
  agentId: string | null;
  recordedAt: string;
};

export type AdminBillingOverview = {
  totals: {
    activeBusinesses: number;
    mrrUsd: number;
    estimatedRevenueUsd: number;
    directCostUsd: number;
    grossProfitUsd: number;
    profitMarginPct: number;
    totalExtraMinutes: number;
  };
  revenueByPlan: Array<{ planKey: string; count: number; mrrUsd: number }>;
  invoices: Array<{ status: string; count: number; amountUsd: number }>;
  topBusinesses: Array<{ businessId: string; businessName: string; planKey: string; profitUsd: number; profitMarginPct: number }>;
};

export async function apiBillingOverview(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/billing/overview`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    subscription: BillingSubscription | null;
    plans: BillingPlan[];
    usage: BillingUsageSummary | null;
    invoices: BillingInvoice[];
  }>;
}

export async function apiBillingUsageLogs(accessToken: string, limit = 100) {
  const res = await fetch(`${baseUrl}/api/billing/usage-logs?limit=${encodeURIComponent(String(limit))}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ usageLogs: BillingUsageLog[] }>;
}

export async function apiChangeSubscriptionPlan(accessToken: string, planKey: string) {
  const res = await fetch(`${baseUrl}/api/billing/subscription/change-plan`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ planKey })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ subscription: BillingSubscription; invoice: BillingInvoice }>;
}

export async function apiAdminBillingOverview(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/admin/billing/overview`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AdminBillingOverview>;
}

export async function apiAdminBillingPlans(accessToken: string) {
  const res = await fetch(`${baseUrl}/api/admin/billing/plans`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ plans: BillingPlan[] }>;
}

export async function apiAdminUpdateBillingPlan(
  accessToken: string,
  key: string,
  payload: Partial<{
    nameEn: string;
    nameAr: string;
    priceMonthlyUsd: number;
    currency: string;
    monthlyMinutes: number;
    agentsLimit: number;
    ordersLimit: number;
    teamMembersLimit: number;
    isPublic: boolean;
    features: Record<string, unknown>;
  }>
) {
  const res = await fetch(`${baseUrl}/api/admin/billing/plans/${key}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ plan: BillingPlan }>;
}

export type AdminProviderConfig = {
  id: string;
  businessId: string;
  type: "TELEPHONY_TWILIO" | "TELEPHONY_TELNYX" | "TELEPHONY_PLIVO" | "VOICE_ELEVENLABS" | "ORDER_CONFIRMATION_SCRIPT_AR";
  isActive: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
};

export async function apiAdminProviderConfigs(accessToken: string, businessId: string) {
  const res = await fetch(`${baseUrl}/api/admin/integrations/${encodeURIComponent(businessId)}/provider-configs`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ providerConfigs: AdminProviderConfig[] }>;
}

export async function apiAdminUpsertProviderConfig(
  accessToken: string,
  businessId: string,
  type: AdminProviderConfig["type"],
  payload: { isActive?: boolean; config?: Record<string, unknown> }
) {
  const res = await fetch(`${baseUrl}/api/admin/integrations/${encodeURIComponent(businessId)}/provider-configs/${type}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ providerConfig: AdminProviderConfig }>;
}

export type AdminPhoneNumber = {
  id: string;
  businessId: string;
  provider: "TWILIO" | "TELNYX" | "PLIVO";
  e164: string;
  label: string | null;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  isPrimaryOutbound: boolean;
  updatedAt: string;
};

export async function apiAdminPhoneNumbers(accessToken: string, businessId: string) {
  const res = await fetch(`${baseUrl}/api/admin/integrations/${encodeURIComponent(businessId)}/phone-numbers`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ phoneNumbers: AdminPhoneNumber[] }>;
}

export async function apiAdminCreatePhoneNumber(
  accessToken: string,
  businessId: string,
  payload: {
    provider: "TWILIO" | "TELNYX" | "PLIVO";
    e164: string;
    label?: string;
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isPrimaryOutbound?: boolean;
  }
) {
  const res = await fetch(`${baseUrl}/api/admin/integrations/${encodeURIComponent(businessId)}/phone-numbers`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ phoneNumber: AdminPhoneNumber }>;
}

export async function apiAdminUpdatePhoneNumber(
  accessToken: string,
  businessId: string,
  id: string,
  payload: {
    e164?: string;
    label?: string;
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isPrimaryOutbound?: boolean;
  }
) {
  const res = await fetch(`${baseUrl}/api/admin/integrations/${encodeURIComponent(businessId)}/phone-numbers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ phoneNumber: AdminPhoneNumber }>;
}

export async function apiAdminDeletePhoneNumber(accessToken: string, businessId: string, id: string) {
  const res = await fetch(`${baseUrl}/api/admin/integrations/${encodeURIComponent(businessId)}/phone-numbers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean }>;
}


