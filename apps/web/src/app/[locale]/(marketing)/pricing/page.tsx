import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function PricingPage({
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
        <div className="text-3xl font-semibold tracking-tight md:text-4xl">{t("marketing.pricing.title")}</div>
        <div className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">{t("marketing.pricing.subtitle")}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {["starter", "growth", "business", "enterprise"].map((k) => (
          <Card key={k} className={k === "business" ? "border-[color:var(--accent)] bg-white/5 p-6" : "border-[color:var(--border)] bg-white/5 p-6"}>
            <div className="text-base font-semibold">{t(`marketing.pricing.${k}.name`)}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t(`marketing.pricing.${k}.tagline`)}</div>
            <div className="mt-4 text-3xl font-semibold">
              {t(`marketing.pricing.${k}.price`)}
              <span className="text-sm font-normal text-[color:var(--muted)]"> {t("marketing.pricing.perMonth")}</span>
            </div>
            <div className="mt-4 text-sm text-[color:var(--muted)]">
              <div>• {t(`marketing.pricing.${k}.f1`)}</div>
              <div>• {t(`marketing.pricing.${k}.f2`)}</div>
              <div>• {t(`marketing.pricing.${k}.f3`)}</div>
              <div>• {t(`marketing.pricing.${k}.f4`)}</div>
            </div>
            <div className="mt-5">
              <Link href={`${base}/register`}>
                <Button className="w-full" variant={k === "business" ? "default" : "secondary"}>
                  {t("marketing.pricing.cta")}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-[color:var(--border)] bg-white/5 p-6">
        <div className="text-base font-semibold">{t("marketing.pricing.notesTitle")}</div>
        <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.pricing.notesBody")}</div>
      </Card>
    </div>
  );
}

