"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { apiCreateOrder } from "@/lib/api";

export default function NewOrderPage() {
  const routeParams = useParams<{ locale: string }>();
  const locale = routeParams?.locale === "ar" ? "ar" : "en";
  const t = useTranslations();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [externalId, setExternalId] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [currency, setCurrency] = React.useState("USD");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiCreateOrder(accessToken, {
        externalId: externalId || undefined,
        amount: Number(amount || 0),
        currency,
        notes: notes || undefined,
        customer: {
          name: customerName || undefined,
          phone: customerPhone,
          email: customerEmail || undefined
        }
      });
      router.replace(`/${locale}/orders/${res.order.id}`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("orders.newTitle")} description={t("orders.newSubtitle")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("orders.newFormTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t("orders.fields.customerName")} />
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={t("orders.fields.customerPhone")} />
            <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder={t("orders.fields.customerEmail")} />
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder={t("orders.fields.externalId")} />
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("orders.fields.amount")} />
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder={t("orders.fields.currency")} />
            <div className="sm:col-span-2">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("orders.fields.notes")} />
            </div>

            {error ? <div className="sm:col-span-2 text-sm text-[color:var(--error)]">{error}</div> : null}

            <div className="sm:col-span-2 flex items-center justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                {t("orders.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {t("orders.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

