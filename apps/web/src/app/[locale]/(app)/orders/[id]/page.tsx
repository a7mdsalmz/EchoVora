"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { apiOrder, apiQueueOrderConfirmation } from "@/lib/api";
import type { OrderDetail } from "@echovora/shared";

export default function OrderDetailPage() {
  const t = useTranslations();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const orderId = String(params?.id ?? "");
  const accessToken = useAuthStore((s) => s.accessToken);

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [queueing, setQueueing] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!accessToken || !orderId) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await apiOrder(accessToken, orderId));
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, orderId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function queueNow() {
    if (!accessToken) return;
    if (order?.status === "QUEUED") {
      const ok = window.confirm(t("orders.confirmRequeue"));
      if (!ok) return;
    }
    setQueueing(true);
    setError(null);
    try {
      await apiQueueOrderConfirmation(accessToken, orderId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.failed"));
    } finally {
      setQueueing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("orders.detailTitle")}
        description={order ? `${order.status} • ${order.id}` : t("orders.detailSubtitle")}
        right={
          <>
            <Link href={`/${locale}/orders`}>
              <Button variant="secondary" size="sm">
                {t("orders.backToOrders")}
              </Button>
            </Link>
            <Button size="sm" onClick={() => void queueNow()} disabled={loading || queueing || !order || order.status === "CALLING"}>
              {order?.status === "QUEUED" ? t("orders.requeueOne") : t("orders.queueOne")}
            </Button>
          </>
        }
      />

      {error ? <div className="text-sm text-[color:var(--error)]">{error}</div> : null}

      {order ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("orders.detail")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.status")}:</span> {order.status}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.externalId")}:</span> {order.externalId ?? "—"}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.amount")}:</span> {order.amount} {order.currency}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.attempts")}:</span> {order.callAttempts}/{order.maxAttempts}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.nextCallAt")}:</span>{" "}
                {order.nextCallAt ? new Date(order.nextCallAt).toLocaleString() : "—"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("orders.customer")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.customerName")}:</span> {order.customer?.name ?? "—"}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.customerPhone")}:</span> {order.customer?.phone ?? "—"}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("orders.fields.customerEmail")}:</span> {order.customer?.email ?? "—"}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t("orders.calls")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[color:var(--muted)]">
                    <tr className="border-b border-[color:var(--border)]">
                      <th className="py-2 pr-4">{t("orders.columns.created")}</th>
                      <th className="py-2 pr-4">{t("orders.columns.status")}</th>
                      <th className="py-2 pr-4">{t("orders.columns.provider")}</th>
                      <th className="py-2 pr-0">{t("orders.columns.callId")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.calls ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-[color:var(--border)]/60">
                        <td className="py-3 pr-4 text-[color:var(--muted)]">{new Date(c.createdAt).toLocaleString()}</td>
                        <td className="py-3 pr-4">{c.status}</td>
                        <td className="py-3 pr-4">{c.provider}</td>
                        <td className="py-3 pr-0 text-[color:var(--muted)]">{c.providerCallId}</td>
                      </tr>
                    ))}
                    {(order.calls ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[color:var(--muted)]">
                          {t("orders.noCalls")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

