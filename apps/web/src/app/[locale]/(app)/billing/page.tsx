"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { apiBillingOverview, apiBillingUsageLogs, apiChangeSubscriptionPlan, type BillingInvoice, type BillingPlan, type BillingSubscription, type BillingUsageLog, type BillingUsageSummary } from "@/lib/api";

export default function BillingPage() {
  const t = useTranslations();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [usage, setUsage] = useState<BillingUsageSummary | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [usageLogs, setUsageLogs] = useState<BillingUsageLog[]>([]);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    const [overview, logs] = await Promise.all([apiBillingOverview(accessToken), apiBillingUsageLogs(accessToken, 20)]);
    setSubscription(overview.subscription);
    setPlans(overview.plans);
    setUsage(overview.usage);
    setInvoices(overview.invoices);
    setUsageLogs(logs.usageLogs);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [accessToken, refresh]);

  async function changePlan(planKey: string) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await apiChangeSubscriptionPlan(accessToken, planKey);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.billing.title")} description={t("pages.billing.subtitle")} />

      {error ? <Card className="border-[color:var(--border)] bg-white/5 p-4 text-sm text-red-300">{error}</Card> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm text-[color:var(--muted)]">{t("billing.plan")}</div>
          <div className="mt-2 text-xl font-semibold">
            {subscription ? (locale === "ar" ? subscription.plan.nameAr : subscription.plan.nameEn) : t("common.dash")}
          </div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">{subscription?.status ?? t("billing.noSubscription")}</div>
        </Card>
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm text-[color:var(--muted)]">{t("billing.includedMinutes")}</div>
          <div className="mt-2 text-xl font-semibold">{usage ? Math.round(usage.includedMinutes) : 0}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {t("billing.usedMinutes", { used: usage ? usage.usedMinutes.toFixed(1) : "0.0" })}
          </div>
        </Card>
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm text-[color:var(--muted)]">{t("billing.estimatedRevenue")}</div>
          <div className="mt-2 text-xl font-semibold">${usage ? usage.estimatedRevenueUsd.toFixed(2) : "0.00"}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {t("billing.overage", { amount: usage ? usage.extraMinutesCostUsd.toFixed(2) : "0.00" })}
          </div>
        </Card>
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm text-[color:var(--muted)]">{t("billing.directCost")}</div>
          <div className="mt-2 text-xl font-semibold">${usage ? usage.directCostUsd.toFixed(2) : "0.00"}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {t("billing.margin", { pct: usage ? usage.profitMarginPct.toFixed(1) : "0.0" })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("billing.usageOverview")}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>{t("billing.aiTokens", { value: usage?.aiTokens ?? 0 })}</div>
            <div>{t("billing.ttsCharacters", { value: usage?.ttsCharacters ?? 0 })}</div>
            <div>{t("billing.sttSeconds", { value: usage?.sttSeconds ?? 0 })}</div>
            <div>{t("billing.storageBytes", { value: usage?.storageBytes ?? 0 })}</div>
            <div>{t("billing.telephonyCost", { amount: usage ? usage.telephonyCostUsd.toFixed(2) : "0.00" })}</div>
            <div>{t("billing.profit", { amount: usage ? usage.profitUsd.toFixed(2) : "0.00" })}</div>
          </div>
          <div className="mt-4 text-xs text-[color:var(--muted)]">
            {t("billing.paymentPlaceholder")}
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("billing.planLimits")}</div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            <div>
              {t("billing.limitAgents", { used: usage?.limits.agents.used ?? 0, included: usage?.limits.agents.included ?? 0 })}
            </div>
            <div>
              {t("billing.limitOrders", { used: usage?.limits.orders.used ?? 0, included: usage?.limits.orders.included ?? 0 })}
            </div>
            <div>
              {t("billing.limitTeamMembers", { used: usage?.limits.teamMembers.used ?? 0, included: usage?.limits.teamMembers.included ?? 0 })}
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-[color:var(--border)] bg-white/5 p-5">
        <div className="text-sm font-semibold">{t("billing.plans")}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-4">
          {plans.map((plan) => {
            const active = subscription?.plan.key === plan.key;
            return (
              <div key={plan.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-4">
                <div className="text-base font-semibold">{locale === "ar" ? plan.nameAr : plan.nameEn}</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">{t("billing.pricePerMonth", { price: plan.priceMonthlyUsd })}</div>
                <div className="mt-3 text-sm">
                  <div>{t("billing.planMinutes", { value: plan.monthlyMinutes })}</div>
                  <div>{t("billing.planAgents", { value: plan.agentsLimit })}</div>
                  <div>{t("billing.planOrders", { value: plan.ordersLimit })}</div>
                </div>
                <div className="mt-4">
                  <Button disabled={loading || active || !accessToken} onClick={() => changePlan(plan.key)}>
                    {active ? t("billing.currentPlan") : t("billing.switchPlan")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("billing.invoices")}</div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {invoices.length ? (
              invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                  <div className="font-medium">
                    ${invoice.amountUsd} • {invoice.status}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[color:var(--muted)]">{t("billing.noInvoices")}</div>
            )}
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("billing.recentUsageLogs")}</div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {usageLogs.length ? (
              usageLogs.map((log) => (
                <div key={log.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                  <div className="font-medium">
                    {log.type} • {log.quantity}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    ${log.costUsd} • {new Date(log.recordedAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[color:var(--muted)]">{t("billing.noUsageLogs")}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

