"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import {
  apiAdminBillingOverview,
  apiAdminBillingPlans,
  apiAdminCreatePhoneNumber,
  apiAdminPhoneNumbers,
  apiAdminProviderConfigs,
  apiAdminUpsertProviderConfig,
  apiAdminUpdateBillingPlan,
  apiTenants,
  type AdminBillingOverview,
  type AdminPhoneNumber,
  type AdminProviderConfig,
  type BillingPlan
} from "@/lib/api";
import type { BusinessSummary } from "@echovora/shared";

export default function AdminDashboardPage() {
  const t = useTranslations();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState("starter");
  const [priceMonthlyUsd, setPriceMonthlyUsd] = useState("");
  const [monthlyMinutes, setMonthlyMinutes] = useState("");
  const [agentsLimit, setAgentsLimit] = useState("");

  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [providerConfigs, setProviderConfigs] = useState<AdminProviderConfig[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<AdminPhoneNumber[]>([]);

  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioWebhookSecret, setTwilioWebhookSecret] = useState("");

  const [elevenApiKey, setElevenApiKey] = useState("");
  const [elevenModelId, setElevenModelId] = useState("");
  const [elevenVoiceEn, setElevenVoiceEn] = useState("");
  const [elevenVoiceAr, setElevenVoiceAr] = useState("");

  const [newTwilioNumber, setNewTwilioNumber] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    const [ov, pl, biz] = await Promise.all([apiAdminBillingOverview(accessToken), apiAdminBillingPlans(accessToken), apiTenants(accessToken)]);
    setOverview(ov);
    setPlans(pl.plans);
    setBusinesses(biz);
    if (!selectedBusinessId && biz.length) setSelectedBusinessId(biz[0].businessId);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [accessToken, refresh]);

  const selectedPlan = useMemo(() => plans.find((p) => p.key === selectedPlanKey) ?? null, [plans, selectedPlanKey]);
  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.businessId === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId]
  );

  useEffect(() => {
    if (!selectedPlan) return;
    setPriceMonthlyUsd(String(selectedPlan.priceMonthlyUsd));
    setMonthlyMinutes(String(selectedPlan.monthlyMinutes));
    setAgentsLimit(String(selectedPlan.agentsLimit));
  }, [selectedPlan]);

  const refreshIntegrations = useCallback(async () => {
    if (!accessToken || !selectedBusinessId) return;
    const [pc, pn] = await Promise.all([apiAdminProviderConfigs(accessToken, selectedBusinessId), apiAdminPhoneNumbers(accessToken, selectedBusinessId)]);
    setProviderConfigs(pc.providerConfigs);
    setPhoneNumbers(pn.phoneNumbers);
  }, [accessToken, selectedBusinessId]);

  useEffect(() => {
    if (!accessToken || !selectedBusinessId) return;
    refreshIntegrations().catch(() => void 0);
  }, [accessToken, selectedBusinessId, refreshIntegrations]);

  useEffect(() => {
    const tw = providerConfigs.find((c) => c.type === "TELEPHONY_TWILIO");
    const cfg = (tw?.config ?? {}) as any;
    setTwilioAccountSid(typeof cfg.accountSid === "string" ? cfg.accountSid : "");
    setTwilioAuthToken(typeof cfg.authToken === "string" ? cfg.authToken : "");
    setTwilioWebhookSecret(typeof cfg.webhookSecret === "string" ? cfg.webhookSecret : "");
  }, [providerConfigs]);

  useEffect(() => {
    const el = providerConfigs.find((c) => c.type === "VOICE_ELEVENLABS");
    const cfg = (el?.config ?? {}) as any;
    setElevenApiKey(typeof cfg.apiKey === "string" ? cfg.apiKey : "");
    setElevenModelId(typeof cfg.modelId === "string" ? cfg.modelId : "");
    setElevenVoiceEn(typeof cfg.voiceIdEn === "string" ? cfg.voiceIdEn : "");
    setElevenVoiceAr(typeof cfg.voiceIdAr === "string" ? cfg.voiceIdAr : "");
  }, [providerConfigs]);

  async function savePlan() {
    if (!accessToken || !selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      await apiAdminUpdateBillingPlan(accessToken, selectedPlan.key, {
        priceMonthlyUsd: Number(priceMonthlyUsd),
        monthlyMinutes: Number(monthlyMinutes),
        agentsLimit: Number(agentsLimit)
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveTwilio() {
    if (!accessToken || !selectedBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      await apiAdminUpsertProviderConfig(accessToken, selectedBusinessId, "TELEPHONY_TWILIO", {
        isActive: true,
        config: {
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          webhookSecret: twilioWebhookSecret
        }
      });
      await refreshIntegrations();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveElevenLabs() {
    if (!accessToken || !selectedBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      await apiAdminUpsertProviderConfig(accessToken, selectedBusinessId, "VOICE_ELEVENLABS", {
        isActive: true,
        config: {
          apiKey: elevenApiKey,
          modelId: elevenModelId,
          voiceIdEn: elevenVoiceEn,
          voiceIdAr: elevenVoiceAr
        }
      });
      await refreshIntegrations();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addTwilioNumber() {
    if (!accessToken || !selectedBusinessId || !newTwilioNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiAdminCreatePhoneNumber(accessToken, selectedBusinessId, {
        provider: "TWILIO",
        e164: newTwilioNumber.trim(),
        outboundEnabled: true,
        inboundEnabled: true,
        isPrimaryOutbound: true
      });
      setNewTwilioNumber("");
      await refreshIntegrations();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RoleGate locale={locale} allow={["SUPER_ADMIN"]}>
      <div className="flex flex-col gap-6">
        <PageHeader title={t("pages.admin.title")} description={t("pages.admin.subtitle")} />

        {error ? <Card className="border-[color:var(--border)] bg-white/5 p-4 text-sm text-red-300">{error}</Card> : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm text-[color:var(--muted)]">{t("admin.activeBusinesses")}</div>
            <div className="mt-2 text-xl font-semibold">{overview?.totals.activeBusinesses ?? 0}</div>
          </Card>
          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm text-[color:var(--muted)]">{t("admin.mrr")}</div>
            <div className="mt-2 text-xl font-semibold">${overview ? overview.totals.mrrUsd.toFixed(2) : "0.00"}</div>
          </Card>
          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm text-[color:var(--muted)]">{t("admin.estimatedRevenue")}</div>
            <div className="mt-2 text-xl font-semibold">${overview ? overview.totals.estimatedRevenueUsd.toFixed(2) : "0.00"}</div>
          </Card>
          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm text-[color:var(--muted)]">{t("admin.grossMargin")}</div>
            <div className="mt-2 text-xl font-semibold">{overview ? overview.totals.profitMarginPct.toFixed(1) : "0.0"}%</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm font-semibold">{t("admin.revenueByPlan")}</div>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {overview?.revenueByPlan.length ? (
                overview.revenueByPlan.map((row) => (
                  <div key={row.planKey} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                    <div className="font-medium">
                      {row.planKey} • {t("admin.businessesCount", { count: row.count })}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{t("admin.mrrAmount", { amount: row.mrrUsd.toFixed(2) })}</div>
                  </div>
                ))
              ) : (
                <div className="text-[color:var(--muted)]">{t("admin.noRevenueData")}</div>
              )}
            </div>
          </Card>

          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm font-semibold">{t("admin.planManagement")}</div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <select
                value={selectedPlanKey}
                onChange={(e) => setSelectedPlanKey(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 text-sm"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.key}>
                    {locale === "ar" ? plan.nameAr : plan.nameEn}
                  </option>
                ))}
              </select>
              <Input placeholder={t("admin.monthlyPriceUsd")} value={priceMonthlyUsd} onChange={(e) => setPriceMonthlyUsd(e.target.value)} />
              <Input placeholder={t("admin.monthlyMinutes")} value={monthlyMinutes} onChange={(e) => setMonthlyMinutes(e.target.value)} />
              <Input placeholder={t("admin.agentsLimit")} value={agentsLimit} onChange={(e) => setAgentsLimit(e.target.value)} />
              <div className="flex justify-end">
                <Button disabled={loading || !accessToken || !selectedPlan} onClick={() => savePlan()}>
                  {t("admin.savePlan")}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("admin.integrationsTitle")}</div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="text-sm text-[color:var(--muted)]">{t("admin.selectBusiness")}</div>
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 text-sm"
              >
                {businesses.map((b) => (
                  <option key={b.businessId} value={b.businessId}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-[color:var(--muted)]">{selectedBusiness ? selectedBusiness.slug ?? selectedBusiness.businessId : ""}</div>
            </div>

            <div className="flex items-center justify-end">
              <Button variant="secondary" disabled={loading || !accessToken || !selectedBusinessId} onClick={() => refreshIntegrations()}>
                {t("common.refresh")}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-[color:var(--border)] bg-white/5 p-5">
              <div className="text-sm font-semibold">{t("admin.elevenlabsTitle")}</div>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <Input type="password" placeholder={t("admin.elevenlabsApiKey")} value={elevenApiKey} onChange={(e) => setElevenApiKey(e.target.value)} />
                <Input placeholder={t("admin.elevenlabsModelId")} value={elevenModelId} onChange={(e) => setElevenModelId(e.target.value)} />
                <Input placeholder={t("admin.elevenlabsVoiceEn")} value={elevenVoiceEn} onChange={(e) => setElevenVoiceEn(e.target.value)} />
                <Input placeholder={t("admin.elevenlabsVoiceAr")} value={elevenVoiceAr} onChange={(e) => setElevenVoiceAr(e.target.value)} />
                <div className="flex justify-end">
                  <Button disabled={loading || !accessToken || !selectedBusinessId} onClick={() => saveElevenLabs()}>
                    {t("admin.saveIntegrations")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-[color:var(--border)] bg-white/5 p-5">
              <div className="text-sm font-semibold">{t("admin.twilioTitle")}</div>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <Input placeholder={t("admin.twilioAccountSid")} value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} />
                <Input type="password" placeholder={t("admin.twilioAuthToken")} value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} />
                <Input type="password" placeholder={t("admin.twilioWebhookSecret")} value={twilioWebhookSecret} onChange={(e) => setTwilioWebhookSecret(e.target.value)} />
                <div className="flex justify-end">
                  <Button disabled={loading || !accessToken || !selectedBusinessId} onClick={() => saveTwilio()}>
                    {t("admin.saveIntegrations")}
                  </Button>
                </div>
              </div>

              <div className="mt-5 text-sm font-semibold">{t("admin.phoneNumbers")}</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Input placeholder={t("admin.addPhoneNumberE164")} value={newTwilioNumber} onChange={(e) => setNewTwilioNumber(e.target.value)} />
                <div className="flex justify-end">
                  <Button variant="secondary" disabled={loading || !accessToken || !selectedBusinessId || !newTwilioNumber.trim()} onClick={() => addTwilioNumber()}>
                    {t("admin.addPhoneNumber")}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 text-sm">
                {phoneNumbers.length ? (
                  phoneNumbers.map((pn) => (
                    <div key={pn.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                      <div className="font-medium">
                        {pn.e164} • {pn.provider}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">{pn.isPrimaryOutbound ? t("admin.primaryOutbound") : t("admin.secondaryNumber")}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-[color:var(--muted)]">{t("admin.noPhoneNumbers")}</div>
                )}
              </div>
            </Card>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm font-semibold">{t("admin.invoiceStatuses")}</div>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {overview?.invoices.length ? (
                overview.invoices.map((row) => (
                  <div key={row.status} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                    <div className="font-medium">
                      {row.status} • {row.count}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">${row.amountUsd.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div className="text-[color:var(--muted)]">{t("admin.noInvoiceData")}</div>
              )}
            </div>
          </Card>

          <Card className="border-[color:var(--border)] bg-white/5 p-5">
            <div className="text-sm font-semibold">{t("admin.topBusinesses")}</div>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {overview?.topBusinesses.length ? (
                overview.topBusinesses.map((row) => (
                  <div key={row.businessId} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                    <div className="font-medium">
                      {row.businessName} • {row.planKey}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      {t("admin.profitAndMargin", { profit: row.profitUsd.toFixed(2), margin: row.profitMarginPct.toFixed(1) })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[color:var(--muted)]">{t("admin.noProfitData")}</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </RoleGate>
  );
}

