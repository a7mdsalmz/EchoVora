import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function UseCasesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";
  const t = await getTranslations({ locale });
  const base = `/${locale}`;

  return (
    <div className="flex flex-col gap-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-3xl font-semibold tracking-tight md:text-4xl">{t("marketing.useCases.title")}</div>
        <div className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">{t("marketing.useCases.subtitle")}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {["ecommerce", "callcenters", "clinics", "restaurants", "realestate", "delivery"].map((k) => (
          <Card key={k} className="border-[color:var(--border)] bg-white/5 p-6">
            <div className="text-base font-semibold">{t(`marketing.useCases.${k}.title`)}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t(`marketing.useCases.${k}.desc`)}</div>
            <div className="mt-4 text-sm text-[color:var(--muted)]">
              <div>• {t(`marketing.useCases.${k}.b1`)}</div>
              <div>• {t(`marketing.useCases.${k}.b2`)}</div>
              <div>• {t(`marketing.useCases.${k}.b3`)}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--graphite)] px-6 py-10 md:px-10">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div>
            <div className="text-2xl font-semibold md:text-3xl">{t("marketing.useCases.ctaTitle")}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.useCases.ctaSubtitle")}</div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Link href={`${base}/register`}>
              <Button size="lg">{t("marketing.useCases.ctaPrimary")}</Button>
            </Link>
            <Link href={`${base}/contact`}>
              <Button size="lg" variant="secondary">
                {t("marketing.useCases.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

