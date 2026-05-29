"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { apiBillingOverview, apiCalls, apiOrdersAnalytics, apiUnansweredQuestions } from "@/lib/api";

export default function AnalyticsPage() {
  const t = useTranslations();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [orderStats, setOrderStats] = React.useState<{ total: number; confirmed: number; rejected: number } | null>(null);
  const [callsStats, setCallsStats] = React.useState<{ total: number; completed: number; failed: number } | null>(null);
  const [unanswered, setUnanswered] = React.useState<number>(0);
  const [profit, setProfit] = React.useState<{ profitUsd: number; marginPct: number } | null>(null);

  const refresh = React.useCallback(async () => {
    if (!accessToken) return;
    const [o, calls, u, b] = await Promise.all([
      apiOrdersAnalytics(accessToken),
      apiCalls(accessToken),
      apiUnansweredQuestions(accessToken, { resolved: false }),
      apiBillingOverview(accessToken)
    ]);
    setOrderStats({ total: o.totalOrders, confirmed: o.confirmed, rejected: o.rejected });
    const total = calls.length;
    setCallsStats({
      total,
      completed: calls.filter((c) => c.status === "COMPLETED").length,
      failed: calls.filter((c) => c.status === "FAILED" || c.status === "CANCELED").length
    });
    setUnanswered(u.unanswered.length);
    setProfit(b.usage ? { profitUsd: b.usage.profitUsd, marginPct: b.usage.profitMarginPct } : null);
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [accessToken, refresh]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.analytics.title")} description={t("pages.analytics.subtitle")} />

      {error ? <Card className="border-[color:var(--border)] bg-white/5 p-4 text-sm text-red-300">{error}</Card> : null}

      <div className="flex justify-end">
        <Button variant="secondary" disabled={loading || !accessToken} onClick={() => void refresh()}>
          {t("common.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.ordersTotal")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{orderStats?.total ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.ordersConfirmed")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-[color:var(--success)]">{orderStats?.confirmed ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.callsTotal")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{callsStats?.total ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.unanswered")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-[color:var(--warning)]">{unanswered}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("analytics.callQuality")}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>{t("analytics.callsCompleted", { value: callsStats?.completed ?? 0 })}</div>
            <div>{t("analytics.callsFailed", { value: callsStats?.failed ?? 0 })}</div>
          </div>
        </Card>
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("analytics.profitTitle")}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>{t("analytics.profitUsd", { value: profit ? profit.profitUsd.toFixed(2) : "0.00" })}</div>
            <div>{t("analytics.marginPct", { value: profit ? profit.marginPct.toFixed(1) : "0.0" })}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

