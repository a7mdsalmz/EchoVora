export type Locale = "en" | "ar";

export type Role = "SUPER_ADMIN" | "BUSINESS_OWNER" | "MANAGER" | "VIEWER";

export type AuthMe = {
  userId: string;
  email: string;
  name: string | null;
  businessId: string;
  role: Role;
  globalRole: Role;
};

export type BusinessSummary = {
  businessId: string;
  slug?: string;
  name: string;
  defaultLocale: Locale;
  role: Role;
};

export type OrderStatus =
  | "PENDING"
  | "QUEUED"
  | "CALLING"
  | "CONFIRMED"
  | "REJECTED"
  | "RESCHEDULED"
  | "CHANGE_ADDRESS"
  | "NO_ANSWER"
  | "FAILED"
  | "HUMAN_REVIEW";

export type OrderListItem = {
  id: string;
  externalId: string | null;
  status: OrderStatus;
  amount: string;
  currency: string;
  createdAt: string;
  customer: { id: string; name: string | null; phone: string };
};

export type OrderAnalytics = {
  totalOrders: number;
  confirmed: number;
  rejected: number;
  noAnswer: number;
  rescheduled: number;
  byStatus: Record<string, number>;
};

export type OrderCampaignSummary = {
  id: string;
  name: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELED";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  _count: { items: number };
};

export type OrderCallItem = {
  id: string;
  createdAt: string;
  status: string;
  provider: string;
  providerCallId: string;
};

export type OrderDetail = {
  id: string;
  externalId: string | null;
  status: OrderStatus;
  amount: string;
  currency: string;
  callAttempts: number;
  maxAttempts: number;
  nextCallAt: string | null;
  customer: { id: string; name: string | null; phone: string; email: string | null };
  calls: OrderCallItem[];
};

