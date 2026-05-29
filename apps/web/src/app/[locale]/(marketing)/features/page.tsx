import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function FeaturesPage({
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
        <div className="text-3xl font-semibold tracking-tight md:text-4xl">{t("marketing.features.title")}</div>
        <div className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">{t("marketing.features.subtitle")}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {["orderConfirmation", "callCenter", "dialects", "cost", "analytics", "multiTenant"].map((k) => (
          <Card key={k} className="border-[color:var(--border)] bg-white/5 p-6">
            <div className="text-base font-semibold">{t(`marketing.features.items.${k}.title`)}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t(`marketing.features.items.${k}.desc`)}</div>
            <div className="mt-4 text-sm text-[color:var(--muted)]">
              <div>• {t(`marketing.features.items.${k}.b1`)}</div>
              <div>• {t(`marketing.features.items.${k}.b2`)}</div>
              <div>• {t(`marketing.features.items.${k}.b3`)}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Link href={`${base}/pricing`}>
          <Button variant="secondary">{t("marketing.features.viewPricing")}</Button>
        </Link>
        <Link href={`${base}/register`}>
          <Button>{t("marketing.features.startNow")}</Button>
        </Link>
      </div>
    </div>
  );
}

