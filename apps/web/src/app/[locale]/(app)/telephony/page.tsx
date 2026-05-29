"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import {
  apiCreateTelephonyPhoneNumber,
  apiTelephonyPhoneNumbers,
  apiTelephonyProviders,
  apiTelephonyTestCall,
  apiUpdateTelephonyPhoneNumber,
  apiUpsertTelephonyProvider,
  type TelephonyPhoneNumber,
  type TelephonyProviderConfig,
  type TelephonyProviderName
} from "@/lib/api";

type PhoneProvider = "TWILIO" | "TELNYX" | "PLIVO";

function providerTypeFor(p: TelephonyProviderName) {
  if (p === "telnyx") return "TELEPHONY_TELNYX";
  if (p === "plivo") return "TELEPHONY_PLIVO";
  return "TELEPHONY_TWILIO";
}

function isPhoneProvider(v: string): v is PhoneProvider {
  return v === "TWILIO" || v === "TELNYX" || v === "PLIVO";
}

export default function TelephonySettingsPage() {
  const t = useTranslations();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [providers, setProviders] = useState<TelephonyProviderConfig[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<TelephonyPhoneNumber[]>([]);

  const [selectedProvider, setSelectedProvider] = useState<TelephonyProviderName>("twilio");
  const selectedType = providerTypeFor(selectedProvider);
  const selectedConfig = useMemo(() => providers.find((p) => p.type === selectedType) ?? null, [providers, selectedType]);

  const [isActive, setIsActive] = useState(true);
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioWebhookSecret, setTwilioWebhookSecret] = useState("");
  const [plivoAuthId, setPlivoAuthId] = useState("");
  const [plivoAuthToken, setPlivoAuthToken] = useState("");
  const [plivoWebhookSecret, setPlivoWebhookSecret] = useState("");
  const [telnyxApiKey, setTelnyxApiKey] = useState("");
  const [telnyxWebhookPublicKey, setTelnyxWebhookPublicKey] = useState("");

  const [newPhoneProvider, setNewPhoneProvider] = useState<PhoneProvider>("TWILIO");
  const [newPhoneE164, setNewPhoneE164] = useState("");
  const [newPhoneLabel, setNewPhoneLabel] = useState("");
  const [newPhonePrimary, setNewPhonePrimary] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testProvider, setTestProvider] = useState<TelephonyProviderName>("twilio");
  const [testFromNumberId, setTestFromNumberId] = useState<string>("");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    Promise.all([apiTelephonyProviders(accessToken), apiTelephonyPhoneNumbers(accessToken)])
      .then(([p, n]) => {
        setProviders(p.providers);
        setPhoneNumbers(n.phoneNumbers);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    const cfg = selectedConfig;
    const json = cfg?.config ?? {};
    const getStr = (k: string) => {
      const v = (json as Record<string, unknown>)[k];
      return typeof v === "string" ? v : "";
    };
    setIsActive(cfg?.isActive ?? true);
    setTwilioAccountSid(getStr("accountSid"));
    setTwilioAuthToken(getStr("authToken"));
    setTwilioWebhookSecret(getStr("webhookSecret"));
    setPlivoAuthId(getStr("authId"));
    setPlivoAuthToken(getStr("authToken"));
    setPlivoWebhookSecret(getStr("webhookSecret"));
    setTelnyxApiKey(getStr("apiKey"));
    setTelnyxWebhookPublicKey(getStr("webhookPublicKey"));
  }, [selectedConfig]);

  async function refresh() {
    if (!accessToken) return;
    const [p, n] = await Promise.all([apiTelephonyProviders(accessToken), apiTelephonyPhoneNumbers(accessToken)]);
    setProviders(p.providers);
    setPhoneNumbers(n.phoneNumbers);
  }

  async function saveProvider() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const config: Record<string, unknown> = {};
      if (selectedProvider === "twilio") {
        if (twilioAccountSid) config.accountSid = twilioAccountSid;
        if (twilioAuthToken) config.authToken = twilioAuthToken;
        if (twilioWebhookSecret) config.webhookSecret = twilioWebhookSecret;
      } else if (selectedProvider === "plivo") {
        if (plivoAuthId) config.authId = plivoAuthId;
        if (plivoAuthToken) config.authToken = plivoAuthToken;
        if (plivoWebhookSecret) config.webhookSecret = plivoWebhookSecret;
      } else {
        if (telnyxApiKey) config.apiKey = telnyxApiKey;
        if (telnyxWebhookPublicKey) config.webhookPublicKey = telnyxWebhookPublicKey;
      }
      await apiUpsertTelephonyProvider(accessToken, selectedProvider, { isActive, config });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addPhoneNumber() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await apiCreateTelephonyPhoneNumber(accessToken, {
        provider: newPhoneProvider,
        e164: newPhoneE164,
        label: newPhoneLabel || undefined,
        isPrimaryOutbound: newPhonePrimary
      });
      setNewPhoneE164("");
      setNewPhoneLabel("");
      setNewPhonePrimary(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function setPrimary(id: string) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await apiUpdateTelephonyPhoneNumber(accessToken, id, { isPrimaryOutbound: true });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runTestCall() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await apiTelephonyTestCall(accessToken, {
        to: testTo,
        provider: testProvider,
        fromNumberId: testFromNumberId || undefined
      });
      setTestResult(res.jobId ? t("telephony.queuedWithId", { id: res.jobId }) : t("telephony.queued"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const fromOptions = useMemo(() => phoneNumbers.filter((p) => p.provider === providerEnumFromName(testProvider)), [phoneNumbers, testProvider]);

  function providerEnumFromName(p: TelephonyProviderName) {
    if (p === "telnyx") return "TELNYX";
    if (p === "plivo") return "PLIVO";
    return "TWILIO";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.telephony.title")} description={t("pages.telephony.subtitle")} />

      {error ? (
        <Card className="border-[color:var(--border)] bg-white/5 p-4 text-sm text-red-300">{error}</Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{t("common.provider")}</div>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as TelephonyProviderName)}
              className="rounded-md border border-[color:var(--border)] bg-transparent px-2 py-1 text-sm"
            >
              <option value="twilio">Twilio</option>
              <option value="telnyx">Telnyx</option>
              <option value="plivo">Plivo</option>
            </select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>{t("common.active")}</span>
          </div>

          {selectedProvider === "twilio" ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Input placeholder={t("telephony.twilio.accountSid")} value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} />
              <Input
                placeholder={t("telephony.twilio.authToken")}
                type="password"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
              />
              <Input
                placeholder={t("telephony.webhookSecret")}
                type="password"
                value={twilioWebhookSecret}
                onChange={(e) => setTwilioWebhookSecret(e.target.value)}
              />
            </div>
          ) : null}

          {selectedProvider === "plivo" ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Input placeholder={t("telephony.plivo.authId")} value={plivoAuthId} onChange={(e) => setPlivoAuthId(e.target.value)} />
              <Input placeholder={t("telephony.plivo.authToken")} type="password" value={plivoAuthToken} onChange={(e) => setPlivoAuthToken(e.target.value)} />
              <Input
                placeholder={t("telephony.webhookSecret")}
                type="password"
                value={plivoWebhookSecret}
                onChange={(e) => setPlivoWebhookSecret(e.target.value)}
              />
            </div>
          ) : null}

          {selectedProvider === "telnyx" ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Input placeholder={t("telephony.telnyx.apiKey")} type="password" value={telnyxApiKey} onChange={(e) => setTelnyxApiKey(e.target.value)} />
              <Input
                placeholder={t("telephony.telnyx.webhookPublicKey")}
                type="password"
                value={telnyxWebhookPublicKey}
                onChange={(e) => setTelnyxWebhookPublicKey(e.target.value)}
              />
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" disabled={loading || !accessToken} onClick={() => refresh()}>
              {t("common.refresh")}
            </Button>
            <Button disabled={loading || !accessToken} onClick={() => saveProvider()}>
              {t("common.save")}
            </Button>
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("telephony.phoneNumbers")}</div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <select
                value={newPhoneProvider}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isPhoneProvider(v)) setNewPhoneProvider(v);
                }}
                className="rounded-md border border-[color:var(--border)] bg-transparent px-2 py-2 text-sm"
              >
                <option value="TWILIO">Twilio</option>
                <option value="TELNYX">Telnyx</option>
                <option value="PLIVO">Plivo</option>
              </select>
              <Input className="sm:col-span-2" placeholder="+201234567890" value={newPhoneE164} onChange={(e) => setNewPhoneE164(e.target.value)} />
              <Input placeholder={t("common.label")} value={newPhoneLabel} onChange={(e) => setNewPhoneLabel(e.target.value)} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                <input type="checkbox" checked={newPhonePrimary} onChange={(e) => setNewPhonePrimary(e.target.checked)} />
                {t("telephony.primaryOutbound")}
              </label>
              <Button disabled={loading || !accessToken || !newPhoneE164} onClick={() => addPhoneNumber()}>
                {t("common.add")}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            {phoneNumbers.length ? (
              phoneNumbers.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-1 rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {p.provider} {p.e164} {p.isPrimaryOutbound ? `• ${t("telephony.primary")}` : ""}
                    </div>
                    <div className="truncate text-xs text-[color:var(--muted)]">{p.label ?? t("common.dash")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" disabled={loading || p.isPrimaryOutbound} onClick={() => setPrimary(p.id)}>
                      {t("telephony.setPrimary")}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-[color:var(--muted)]">{t("telephony.noPhoneNumbers")}</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-[color:var(--border)] bg-white/5 p-5">
        <div className="text-sm font-semibold">{t("telephony.testCall")}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input placeholder="+201234567890" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <select
            value={testProvider}
            onChange={(e) => {
              setTestProvider(e.target.value as TelephonyProviderName);
              setTestFromNumberId("");
            }}
            className="rounded-md border border-[color:var(--border)] bg-transparent px-2 py-2 text-sm"
          >
            <option value="twilio">Twilio</option>
            <option value="telnyx">Telnyx</option>
            <option value="plivo">Plivo</option>
          </select>
          <select
            value={testFromNumberId}
            onChange={(e) => setTestFromNumberId(e.target.value)}
            className="rounded-md border border-[color:var(--border)] bg-transparent px-2 py-2 text-sm"
          >
            <option value="">{t("telephony.autoFromNumber")}</option>
            {fromOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.e164} {p.isPrimaryOutbound ? `(${t("telephony.primary")})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm text-[color:var(--muted)]">{testResult ?? ""}</div>
          <Button disabled={loading || !accessToken || !testTo} onClick={() => runTestCall()}>
            {t("telephony.call")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

