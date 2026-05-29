"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function MarketingFooter({
  locale
}: {
  locale: "en" | "ar";
}) {
  const t = useTranslations();
  return (
    <div className="border-t border-[color:var(--border)] bg-[color:var(--graphite)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-base font-semibold">{t("marketing.brand")}</div>
          <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.footer.tagline")}</div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold tracking-wide text-[color:var(--muted)]">{t("marketing.footer.product")}</div>
            <Link href={`/${locale}/features`} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              {t("marketing.nav.features")}
            </Link>
            <Link href={`/${locale}/pricing`} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              {t("marketing.nav.pricing")}
            </Link>
            <Link href={`/${locale}/use-cases`} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              {t("marketing.nav.useCases")}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold tracking-wide text-[color:var(--muted)]">{t("marketing.footer.company")}</div>
            <Link href={`/${locale}/contact`} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              {t("marketing.nav.contact")}
            </Link>
            <Link href={`/${locale}/login`} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              {t("marketing.nav.login")}
            </Link>
            <Link href={`/${locale}/register`} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              {t("marketing.nav.register")}
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="text-xs font-semibold tracking-wide text-[color:var(--muted)]">{t("marketing.footer.contact")}</div>
          <div className="text-[color:var(--muted)]">hello@echovora.com</div>
          <div className="text-[color:var(--muted)]">{t("marketing.footer.location")}</div>
          <div className="mt-4 text-xs text-[color:var(--muted)]">© {new Date().getFullYear()} EchoVora</div>
        </div>
      </div>
    </div>
  );
}

