"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRegister } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const routeParams = useParams<{ locale: string }>();
  const locale = routeParams?.locale === "ar" ? "ar" : "en";
  const t = useTranslations();
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRegister({ email, password, tenantName: businessName, locale });
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setMe(null);
      router.replace(`/${locale}/dashboard`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">{t("auth.register")}</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{t("app.name")}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder={t("auth.businessName")} />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} autoComplete="email" />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.password")}
          autoComplete="new-password"
          type="password"
        />
        {error ? <div className="text-sm text-[color:var(--error)]">{error}</div> : null}
        <Button type="submit" disabled={loading}>
          {t("auth.submit")}
        </Button>
      </form>

      <div className="text-sm text-[color:var(--muted)]">
        <a className="text-[color:var(--accent)] hover:underline" href={`/${locale}/login`}>
          {t("auth.login")}
        </a>
      </div>
    </div>
  );
}

