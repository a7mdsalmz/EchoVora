"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "text-sm transition-colors",
        active ? "text-[color:var(--foreground)]" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function MarketingHeader({
  locale
}: {
  locale: "en" | "ar";
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/${locale}`;

  const links = [
    { href: `${base}`, key: "home" },
    { href: `${base}/features`, key: "features" },
    { href: `${base}/use-cases`, key: "useCases" },
    { href: `${base}/pricing`, key: "pricing" },
    { href: `${base}/contact`, key: "contact" }
  ];

  return (
    <div className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:var(--background)]/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href={base} className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-9 w-9 rounded-[14px] bg-gradient-to-br from-[color:var(--purple)] via-[color:var(--accent)] to-[color:var(--accent2)]"
            />
            <div className="flex flex-col leading-tight">
              <div className="text-sm font-semibold tracking-wide">{t("marketing.brand")}</div>
              <div className="text-[11px] text-[color:var(--muted)]">{t("marketing.positioning")}</div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-5 md:flex">
          {links.map((l) => (
            <NavLink key={l.key} href={l.href} label={t(`marketing.nav.${l.key}`)} active={pathname === l.href} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <ThemeToggle />
          <Link href={`${base}/login`} className="hidden sm:block">
            <Button variant="secondary" size="sm">
              {t("marketing.nav.login")}
            </Button>
          </Link>
          <Link href={`${base}/register`}>
            <Button size="sm">{t("marketing.nav.register")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

