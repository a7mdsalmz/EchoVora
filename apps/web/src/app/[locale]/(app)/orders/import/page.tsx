"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { apiImportOrders } from "@/lib/api";

export default function ImportOrdersPage() {
  const routeParams = useParams<{ locale: string }>();
  const locale = routeParams?.locale === "ar" ? "ar" : "en";
  const t = useTranslations();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ total: number; createdOrders: number; skipped: number } | null>(null);

  async function onUpload() {
    if (!accessToken || !file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiImportOrders(accessToken, file);
      setResult(res);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : t("common.uploadFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("orders.uploadTitle")} description={t("orders.uploadSubtitle")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("orders.uploadFormTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
            }}
          />
          <div className="text-sm text-[color:var(--muted)]">{t("orders.uploadHint")}</div>

          {error ? <div className="text-sm text-[color:var(--error)]">{error}</div> : null}

          {result ? (
            <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-4 text-sm">
              <div>
                {t("orders.uploadResult")} {result.createdOrders}/{result.total} ({t("orders.skipped")} {result.skipped})
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => router.replace(`/${locale}/orders`)}>
              {t("orders.backToOrders")}
            </Button>
            <Button onClick={() => void onUpload()} disabled={!file || loading}>
              {t("orders.upload")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

