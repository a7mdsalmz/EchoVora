"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { apiCalls, type CallListItem } from "@/lib/api";

export default function CallsPage() {
  const t = useTranslations();
  const routeParams = useParams<{ locale: string }>();
  const locale = routeParams?.locale === "ar" ? "ar" : "en";
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = React.useState<CallListItem[]>([]);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (query?: string) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const list = await apiCalls(accessToken, { status: status || undefined });
        const filtered = (query?.trim().length ? list.filter((c) => JSON.stringify(c).toLowerCase().includes(query.toLowerCase())) : list).slice(0, 100);
        setItems(filtered);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("common.failedToLoad"));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, status, t]
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.calls.title")} description={t("pages.calls.subtitle")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("calls.search")} />
        <select
          className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("calls.allStatuses")}</option>
          {["NEW", "RINGING", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => void load(q)} disabled={loading}>
          {t("calls.refresh")}
        </Button>
      </div>

      {error ? <div className="text-sm text-[color:var(--error)]">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("calls.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[color:var(--muted)]">
                <tr className="border-b border-[color:var(--border)]">
                  <th className="py-2 pr-4">{t("calls.columns.when")}</th>
                  <th className="py-2 pr-4">{t("calls.columns.direction")}</th>
                  <th className="py-2 pr-4">{t("calls.columns.status")}</th>
                  <th className="py-2 pr-4">{t("calls.columns.from")}</th>
                  <th className="py-2 pr-4">{t("calls.columns.to")}</th>
                  <th className="py-2 pr-0">{t("calls.columns.open")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-[color:var(--border)]/60">
                    <td className="py-3 pr-4 text-[color:var(--muted)]">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4">{c.direction}</td>
                    <td className="py-3 pr-4">{c.status}</td>
                    <td className="py-3 pr-4 text-[color:var(--muted)]">{c.fromNumber ?? "—"}</td>
                    <td className="py-3 pr-4 text-[color:var(--muted)]">{c.toNumber ?? "—"}</td>
                    <td className="py-3 pr-0">
                      <div className="flex items-center justify-end">
                        <Link href={`/${locale}/calls/${c.id}`} className="font-medium hover:underline">
                          {t("calls.open")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[color:var(--muted)]">
                      {t("calls.empty")}
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

