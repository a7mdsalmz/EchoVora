"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { apiCreateOrderCampaign, apiOrders, apiOrdersAnalytics, apiQueueOrderConfirmation } from "@/lib/api";
import type { OrderListItem, OrderStatus } from "@echovora/shared";
import { cn } from "@/lib/cn";

export default function OrdersPage() {
  const routeParams = useParams<{ locale: string }>();
  const locale = routeParams?.locale === "ar" ? "ar" : "en";
  const t = useTranslations();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = React.useState<OrderListItem[]>([]);
  const [analytics, setAnalytics] = React.useState<{ total: number; confirmed: number; rejected: number; noAnswer: number; rescheduled: number } | null>(null);
  const [status, setStatus] = React.useState<OrderStatus | "">("");
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (query?: string) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const [a, list] = await Promise.all([
          apiOrdersAnalytics(accessToken),
          apiOrders(accessToken, { status: status || undefined, q: query || undefined })
        ]);
        setAnalytics({
          total: a.totalOrders,
          confirmed: a.confirmed,
          rejected: a.rejected,
          noAnswer: a.noAnswer,
          rescheduled: a.rescheduled
        });
        setItems(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("common.failedToLoad"));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, status]
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  async function queueOne(id: string) {
    if (!accessToken) return;
    await apiQueueOrderConfirmation(accessToken, id);
    await load(q);
  }

  async function queueCampaign() {
    if (!accessToken) return;
    await apiCreateOrderCampaign(accessToken, { status: "PENDING", limit: 500, name: t("orders.pendingCampaignName") });
    await load(q);
  }

  function StatusPill({ s }: { s: OrderStatus }) {
    const color =
      s === "CONFIRMED"
        ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
        : s === "REJECTED" || s === "FAILED"
          ? "bg-[color:var(--error)]/15 text-[color:var(--error)]"
          : s === "NO_ANSWER" || s === "RESCHEDULED" || s === "CHANGE_ADDRESS" || s === "HUMAN_REVIEW"
            ? "bg-[color:var(--warning)]/15 text-[color:var(--warning)]"
            : "bg-white/10 text-[color:var(--foreground)]";
    return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", color)}>{s}</span>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("pages.orders.title")}
        description={t("pages.orders.subtitle")}
        right={
          <>
            <Link href={`/${locale}/orders/import`}>
              <Button variant="secondary" size="sm">
                {t("orders.upload")}
              </Button>
            </Link>
            <Link href={`/${locale}/orders/new`}>
              <Button variant="secondary" size="sm">
                {t("orders.new")}
              </Button>
            </Link>
            <Button size="sm" onClick={() => void queueCampaign()} disabled={loading}>
              {t("orders.queuePending")}
            </Button>
          </>
        }
      />

      {analytics ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle>{t("orders.stats.total")}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{analytics.total}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("orders.stats.confirmed")}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-[color:var(--success)]">{analytics.confirmed}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("orders.stats.rejected")}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-[color:var(--error)]">{analytics.rejected}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("orders.stats.noAnswer")}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-[color:var(--warning)]">{analytics.noAnswer}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("orders.stats.rescheduled")}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-[color:var(--warning)]">{analytics.rescheduled}</CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("orders.search")} />
        <select
          className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value ? (e.target.value as OrderStatus) : "")}
        >
          <option value="">{t("orders.allStatuses")}</option>
          {[
            "PENDING",
            "QUEUED",
            "CALLING",
            "CONFIRMED",
            "REJECTED",
            "RESCHEDULED",
            "CHANGE_ADDRESS",
            "NO_ANSWER",
            "FAILED",
            "HUMAN_REVIEW"
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => void load(q)} disabled={loading}>
          {t("orders.refresh")}
        </Button>
      </div>

      {error ? <div className="text-sm text-[color:var(--error)]">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("orders.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[color:var(--muted)]">
                <tr className="border-b border-[color:var(--border)]">
                  <th className="py-2 pr-4">{t("orders.columns.customer")}</th>
                  <th className="py-2 pr-4">{t("orders.columns.phone")}</th>
                  <th className="py-2 pr-4">{t("orders.columns.status")}</th>
                  <th className="py-2 pr-4">{t("orders.columns.amount")}</th>
                  <th className="py-2 pr-4">{t("orders.columns.created")}</th>
                  <th className="py-2 pr-0">{t("orders.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className="border-b border-[color:var(--border)]/60">
                    <td className="py-3 pr-4">
                      <Link className="font-medium hover:underline" href={`/${locale}/orders/${o.id}`}>
                        {o.customer.name ?? o.externalId ?? o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-[color:var(--muted)]">{o.customer.phone}</td>
                    <td className="py-3 pr-4">
                      <StatusPill s={o.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {o.amount} {o.currency}
                    </td>
                    <td className="py-3 pr-4 text-[color:var(--muted)]">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-0">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void queueOne(o.id)}
                          disabled={loading || o.status === "CALLING" || o.status === "QUEUED"}
                        >
                          {t("orders.queueOne")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[color:var(--muted)]">
                      {t("orders.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

