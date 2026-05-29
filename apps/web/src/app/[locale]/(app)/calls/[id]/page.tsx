"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { apiCall, type CallDetail } from "@/lib/api";

export default function CallDetailPage() {
  const t = useTranslations();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const callId = String(params?.id ?? "");
  const accessToken = useAuthStore((s) => s.accessToken);

  const [call, setCall] = React.useState<CallDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!accessToken || !callId) return;
    setLoading(true);
    setError(null);
    try {
      setCall(await apiCall(accessToken, callId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, callId, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("calls.detailTitle")}
        description={call ? `${call.status} • ${call.id}` : t("calls.detailSubtitle")}
        right={
          <Link href={`/${locale}/calls`}>
            <Button variant="secondary" size="sm">
              {t("calls.back")}
            </Button>
          </Link>
        }
      />

      {error ? <div className="text-sm text-[color:var(--error)]">{error}</div> : null}

      {call ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t("calls.details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-[color:var(--muted)]">{t("calls.fields.direction")}:</span> {call.direction}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("calls.fields.provider")}:</span> {call.provider}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("calls.fields.providerCallId")}:</span> {call.providerCallId}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("calls.fields.from")}:</span> {call.fromNumber ?? "—"}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("calls.fields.to")}:</span> {call.toNumber ?? "—"}
              </div>
              <div>
                <span className="text-[color:var(--muted)]">{t("calls.fields.createdAt")}:</span> {new Date(call.createdAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("calls.transcript")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <pre className="whitespace-pre-wrap text-[color:var(--foreground)]">{call.transcript?.contentText ?? t("calls.noTranscript")}</pre>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t("calls.events")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[color:var(--muted)]">
                    <tr className="border-b border-[color:var(--border)]">
                      <th className="py-2 pr-4">{t("calls.columns.when")}</th>
                      <th className="py-2 pr-4">{t("calls.columns.type")}</th>
                      <th className="py-2 pr-0">{t("calls.columns.payload")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(call.telephonyEvents ?? []).map((e) => (
                      <tr key={e.id} className="border-b border-[color:var(--border)]/60">
                        <td className="py-3 pr-4 text-[color:var(--muted)]">{new Date(e.occurredAt).toLocaleString()}</td>
                        <td className="py-3 pr-4">{e.eventType}</td>
                        <td className="py-3 pr-0 text-[color:var(--muted)]">
                          <pre className="max-w-[72ch] whitespace-pre-wrap">{JSON.stringify(e.payload, null, 2)}</pre>
                        </td>
                      </tr>
                    ))}
                    {(call.telephonyEvents ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-[color:var(--muted)]">
                          {t("calls.noEvents")}
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

      {!call && !loading ? (
        <div className="text-sm text-[color:var(--muted)]">{t("calls.loadingHint")}</div>
      ) : null}
    </div>
  );
}

