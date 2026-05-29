"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { apiAgents, apiCreateAgent, type Agent, type AgentType } from "@/lib/api";

export default function AgentsPage() {
  const t = useTranslations();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [type, setType] = React.useState<AgentType>("ORDER_CONFIRMATION");
  const [nameEn, setNameEn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [defaultLocale, setDefaultLocale] = React.useState<"en" | "ar">("en");

  const refresh = React.useCallback(async () => {
    if (!accessToken) return;
    const res = await apiAgents(accessToken);
    setItems(res.agents);
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [accessToken, refresh]);

  async function create() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await apiCreateAgent(accessToken, {
        type,
        nameEn,
        nameAr,
        defaultLocale
      });
      setNameEn("");
      setNameAr("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.agents.title")} description={t("pages.agents.subtitle")} />

      {error ? <Card className="border-[color:var(--border)] bg-white/5 p-4 text-sm text-red-300">{error}</Card> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("agents.createTitle")}</div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AgentType)}
              className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 text-sm"
            >
              <option value="ORDER_CONFIRMATION">{t("agents.types.orderConfirmation")}</option>
              <option value="VOICE_CALL_CENTER">{t("agents.types.voiceCallCenter")}</option>
              <option value="CUSTOMER_SUPPORT">{t("agents.types.customerSupport")}</option>
              <option value="SMART_WORKFLOWS">{t("agents.types.smartWorkflows")}</option>
            </select>
            <Input placeholder={t("agents.nameEn")} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <Input placeholder={t("agents.nameAr")} value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
            <select
              value={defaultLocale}
              onChange={(e) => setDefaultLocale(e.target.value === "ar" ? "ar" : "en")}
              className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 text-sm"
            >
              <option value="en">{t("agents.defaultEnglish")}</option>
              <option value="ar">{t("agents.defaultArabic")}</option>
            </select>
            <div className="flex justify-end">
              <Button disabled={loading || !accessToken || nameEn.trim().length < 2 || nameAr.trim().length < 2} onClick={() => void create()}>
                {t("agents.create")}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{t("agents.listTitle")}</div>
            <Button variant="secondary" disabled={loading || !accessToken} onClick={() => void refresh()}>
              {t("common.refresh")}
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {items.length ? (
              items.map((a) => (
                <div key={a.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                  <div className="font-medium">{locale === "ar" ? a.nameAr : a.nameEn}</div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {a.type} • {a.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[color:var(--muted)]">{t("agents.empty")}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

