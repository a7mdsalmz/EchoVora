"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import {
  apiAddKnowledgeSourceUrl,
  apiCallCenterAgents,
  apiCreateCallCenterAgent,
  apiCreateKnowledgeBase,
  apiKnowledgeBases,
  apiKnowledgeSources,
  apiUnansweredQuestions,
  apiUploadKnowledgeSourceFile,
  type CallCenterAgent,
  type KnowledgeBase,
  type KnowledgeSource,
  type UnansweredQuestion
} from "@/lib/api";

export default function CallCenterPage() {
  const t = useTranslations();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agents, setAgents] = useState<CallCenterAgent[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string>("");
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [unanswered, setUnanswered] = useState<UnansweredQuestion[]>([]);

  const [agentNameEn, setAgentNameEn] = useState("");
  const [agentNameAr, setAgentNameAr] = useState("");
  const [agentLocale, setAgentLocale] = useState<"en" | "ar">("en");

  const [kbNameEn, setKbNameEn] = useState("");
  const [kbNameAr, setKbNameAr] = useState("");

  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const refreshAll = useCallback(async () => {
    if (!accessToken) return;
    const [a, k, u] = await Promise.all([
      apiCallCenterAgents(accessToken),
      apiKnowledgeBases(accessToken),
      apiUnansweredQuestions(accessToken, { resolved: false })
    ]);
    setAgents(a.agents);
    setKnowledgeBases(k.knowledgeBases);
    setUnanswered(u.unanswered);
    if (!selectedKbId && k.knowledgeBases.length) setSelectedKbId(k.knowledgeBases[0].id);
  }, [accessToken, selectedKbId]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    refreshAll()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [accessToken, refreshAll]);

  useEffect(() => {
    if (!accessToken || !selectedKbId) return;
    apiKnowledgeSources(accessToken, selectedKbId)
      .then((r) => setSources(r.sources))
      .catch(() => void 0);
  }, [accessToken, selectedKbId]);

  const selectedKb = useMemo(() => knowledgeBases.find((k) => k.id === selectedKbId) ?? null, [knowledgeBases, selectedKbId]);

  async function createAgent() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await apiCreateCallCenterAgent(accessToken, {
        nameEn: agentNameEn,
        nameAr: agentNameAr,
        defaultLocale: agentLocale,
        config: {}
      });
      setAgentNameEn("");
      setAgentNameAr("");
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createKb() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiCreateKnowledgeBase(accessToken, { nameEn: kbNameEn, nameAr: kbNameAr });
      setKbNameEn("");
      setKbNameAr("");
      await refreshAll();
      setSelectedKbId(res.knowledgeBase.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addUrlSource() {
    if (!accessToken || !selectedKbId) return;
    setLoading(true);
    setError(null);
    try {
      await apiAddKnowledgeSourceUrl(accessToken, selectedKbId, { url: sourceUrl, title: sourceTitle || undefined });
      setSourceUrl("");
      setSourceTitle("");
      const r = await apiKnowledgeSources(accessToken, selectedKbId);
      setSources(r.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function uploadSource() {
    if (!accessToken || !selectedKbId || !uploadFile) return;
    setLoading(true);
    setError(null);
    try {
      await apiUploadKnowledgeSourceFile(accessToken, selectedKbId, uploadFile);
      setUploadFile(null);
      const r = await apiKnowledgeSources(accessToken, selectedKbId);
      setSources(r.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.callCenter.title")} description={t("pages.callCenter.subtitle")} />

      {error ? <Card className="border-[color:var(--border)] bg-white/5 p-4 text-sm text-red-300">{error}</Card> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("callCenter.agentsTitle")}</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {agents.length ? (
              agents.map((a) => (
                <div key={a.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                  <div className="font-medium">
                    {a.nameEn} / {a.nameAr}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {a.status} • {a.defaultLocale}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[color:var(--muted)]">{t("callCenter.noAgents")}</div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <Input placeholder={t("callCenter.agentNameEn")} value={agentNameEn} onChange={(e) => setAgentNameEn(e.target.value)} />
            <Input placeholder={t("callCenter.agentNameAr")} value={agentNameAr} onChange={(e) => setAgentNameAr(e.target.value)} />
            <select
              value={agentLocale}
              onChange={(e) => setAgentLocale(e.target.value === "ar" ? "ar" : "en")}
              className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 text-sm"
            >
              <option value="en">{t("callCenter.defaultEnglish")}</option>
              <option value="ar">{t("callCenter.defaultArabic")}</option>
            </select>
            <div className="flex justify-end">
              <Button disabled={loading || !accessToken || agentNameEn.length < 2 || agentNameAr.length < 2} onClick={() => createAgent()}>
                {t("callCenter.createAgent")}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("callCenter.knowledgeBasesTitle")}</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {knowledgeBases.length ? (
              <select
                value={selectedKbId}
                onChange={(e) => setSelectedKbId(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 text-sm"
              >
                {knowledgeBases.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nameEn} / {k.nameAr}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[color:var(--muted)]">{t("callCenter.noKnowledgeBases")}</div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <Input placeholder={t("callCenter.kbNameEn")} value={kbNameEn} onChange={(e) => setKbNameEn(e.target.value)} />
            <Input placeholder={t("callCenter.kbNameAr")} value={kbNameAr} onChange={(e) => setKbNameAr(e.target.value)} />
            <div className="flex justify-end">
              <Button disabled={loading || !accessToken || kbNameEn.length < 2 || kbNameAr.length < 2} onClick={() => createKb()}>
                {t("callCenter.createKb")}
              </Button>
            </div>
          </div>

          <div className="mt-5 text-sm font-semibold">
            {selectedKb
              ? `${t("callCenter.sources")} — ${locale === "ar" ? selectedKb.nameAr : selectedKb.nameEn}`
              : t("callCenter.sources")}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input placeholder={t("callCenter.sourceTitleOptional")} value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} />
            <Input placeholder="https://example.com/page" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            <div className="flex justify-end">
              <Button disabled={loading || !accessToken || !selectedKbId || !sourceUrl} onClick={() => addUrlSource()}>
                {t("common.addUrl")}
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="text-sm text-[color:var(--muted)]"
            />
            <div className="flex justify-end">
              <Button disabled={loading || !accessToken || !selectedKbId || !uploadFile} onClick={() => uploadSource()}>
                {t("common.uploadFile")}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            {sources.length ? (
              sources.map((s) => (
                <div key={s.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                  <div className="font-medium">
                    {s.title ?? s.filename ?? s.sourceUrl ?? s.id} • {s.status}
                  </div>
                  {s.status === "FAILED" && s.errorMessage ? (
                    <div className="mt-1 text-xs text-red-300">{s.errorMessage}</div>
                  ) : (
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{s.type}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-[color:var(--muted)]">{t("callCenter.noSources")}</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-[color:var(--border)] bg-white/5 p-5">
        <div className="text-sm font-semibold">{t("callCenter.unansweredTitle")}</div>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {unanswered.length ? (
            unanswered.map((u) => (
              <div key={u.id} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-white/5 p-3">
                <div className="font-medium">{u.questionText}</div>
                <div className="mt-1 text-xs text-[color:var(--muted)]">
                  {u.locale} • {new Date(u.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-[color:var(--muted)]">{t("callCenter.noUnanswered")}</div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" disabled={loading || !accessToken} onClick={() => refreshAll()}>
            {t("common.refresh")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

