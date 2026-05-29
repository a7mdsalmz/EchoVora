"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useAuthStore } from "@/stores/authStore";

export default function SettingsPage() {
  const t = useTranslations();
  const me = useAuthStore((s) => s.me);
  const params = useParams<{ locale: string }>();
  const locale = params?.locale === "ar" ? "ar" : "en";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.settings.title")} description={t("pages.settings.subtitle")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("settings.preferences")}</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">{t("settings.preferencesHint")}</div>
          <div className="mt-4 flex items-center gap-2">
            <ThemeToggle />
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-5">
          <div className="text-sm font-semibold">{t("settings.language")}</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">{t("settings.languageHint")}</div>
          <div className="mt-4 flex items-center gap-2">
            <LanguageToggle locale={locale} />
          </div>
        </Card>
      </div>

      <Card className="border-[color:var(--border)] bg-white/5 p-5">
        <div className="text-sm font-semibold">{t("settings.session")}</div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[color:var(--muted)] sm:grid-cols-2">
          <div>{t("settings.sessionRole", { value: me?.role ?? t("common.ellipsis") })}</div>
          <div>{t("settings.sessionBusiness", { value: me?.businessId ?? t("common.ellipsis") })}</div>
          <div>{t("settings.sessionUser", { value: me?.email ?? t("common.ellipsis") })}</div>
          <div>{t("settings.sessionGlobalRole", { value: me?.globalRole ?? t("common.ellipsis") })}</div>
        </div>
      </Card>
    </div>
  );
}

