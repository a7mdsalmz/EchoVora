import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VoiceWave } from "@/components/marketing/VoiceWave";
import { MotionInView } from "@/components/marketing/MotionInView";

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-[color:var(--border)] bg-white/5 p-4">
      <div className="text-xs text-[color:var(--muted)]">{title}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</div>
      <div className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">{subtitle}</div>
    </div>
  );
}

function DashboardPreview({ t }: { t: (k: string) => string }) {
  return (
    <Card className="overflow-hidden border-[color:var(--border)] bg-white/5">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--error)]/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--warning)]/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--success)]/80" />
        </div>
        <div className="text-xs text-[color:var(--muted)]">{t("marketing.home.previewTitle")}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        <Card className="border-[color:var(--border)] bg-white/5 p-4">
          <div className="text-xs text-[color:var(--muted)]">{t("marketing.home.metricConfirmed")}</div>
          <div className="mt-2 text-2xl font-semibold">74%</div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/5">
            <div className="h-2 w-[74%] rounded-full bg-gradient-to-r from-[color:var(--purple)] via-[color:var(--accent)] to-[color:var(--accent2)]" />
          </div>
        </Card>
        <Card className="border-[color:var(--border)] bg-white/5 p-4">
          <div className="text-xs text-[color:var(--muted)]">{t("marketing.home.metricAHT")}</div>
          <div className="mt-2 text-2xl font-semibold">1:18</div>
          <div className="mt-2 text-xs text-[color:var(--muted)]">{t("marketing.home.metricAHTHint")}</div>
        </Card>
        <Card className="border-[color:var(--border)] bg-white/5 p-4">
          <div className="text-xs text-[color:var(--muted)]">{t("marketing.home.metricSavings")}</div>
          <div className="mt-2 text-2xl font-semibold">-42%</div>
          <div className="mt-2 text-xs text-[color:var(--muted)]">{t("marketing.home.metricSavingsHint")}</div>
        </Card>
      </div>
    </Card>
  );
}

export default async function MarketingHome({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";
  const t = await getTranslations({ locale });
  const base = `/${locale}`;

  return (
    <div className="flex flex-col gap-16">
      <section className="relative overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[color:var(--graphite)] px-6 py-12 md:px-10">
        <div className="absolute inset-x-0 top-0 h-[340px] opacity-70">
          <VoiceWave className="h-full w-full" />
        </div>
        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-1 text-xs text-[color:var(--muted)]">
              <span className="h-2 w-2 rounded-full bg-[color:var(--accent2)]" />
              {t("marketing.home.badge")}
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              {locale === "ar" ? t("marketing.home.headlineAr") : t("marketing.home.headline")}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[color:var(--muted)] md:text-base">
              {locale === "ar" ? t("marketing.home.subheadlineAr") : t("marketing.home.subheadline")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`${base}/register`}>
                <Button size="lg">{t("marketing.home.primaryCta")}</Button>
              </Link>
              <Link href={`${base}/pricing`}>
                <Button size="lg" variant="secondary">
                  {t("marketing.home.secondaryCta")}
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard title={t("marketing.home.stat1Title")} value={t("marketing.home.stat1Value")} />
              <StatCard title={t("marketing.home.stat2Title")} value={t("marketing.home.stat2Value")} />
              <div className="hidden sm:block">
                <StatCard title={t("marketing.home.stat3Title")} value={t("marketing.home.stat3Value")} />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <DashboardPreview t={t} />
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-[color:var(--border)] bg-white/5 p-4">
                <div className="text-xs text-[color:var(--muted)]">{t("marketing.home.pill1Title")}</div>
                <div className="mt-2 text-sm font-medium">{t("marketing.home.pill1Value")}</div>
              </Card>
              <Card className="border-[color:var(--border)] bg-white/5 p-4">
                <div className="text-xs text-[color:var(--muted)]">{t("marketing.home.pill2Title")}</div>
                <div className="mt-2 text-sm font-medium">{t("marketing.home.pill2Value")}</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <MotionInView>
          <SectionTitle title={t("marketing.home.productsTitle")} subtitle={t("marketing.home.productsSubtitle")} />
        </MotionInView>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MotionInView>
            <Card className="border-[color:var(--border)] bg-white/5 p-6">
              <div className="text-lg font-semibold">{t("marketing.home.product1Title")}</div>
              <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.product1Desc")}</div>
              <div className="mt-4 text-sm">
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product1Bullet1")}</div>
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product1Bullet2")}</div>
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product1Bullet3")}</div>
              </div>
            </Card>
          </MotionInView>
          <MotionInView delay={0.08}>
            <Card className="border-[color:var(--border)] bg-white/5 p-6">
              <div className="text-lg font-semibold">{t("marketing.home.product2Title")}</div>
              <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.product2Desc")}</div>
              <div className="mt-4 text-sm">
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product2Bullet1")}</div>
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product2Bullet2")}</div>
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product2Bullet3")}</div>
              </div>
            </Card>
          </MotionInView>
          <MotionInView delay={0.16}>
            <Card className="border-[color:var(--border)] bg-white/5 p-6">
              <div className="text-lg font-semibold">{t("marketing.home.product3Title")}</div>
              <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.product3Desc")}</div>
              <div className="mt-4 text-sm">
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product3Bullet1")}</div>
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product3Bullet2")}</div>
                <div className="text-[color:var(--muted)]">• {t("marketing.home.product3Bullet3")}</div>
              </div>
            </Card>
          </MotionInView>
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <SectionTitle title={t("marketing.home.howTitle")} subtitle={t("marketing.home.howSubtitle")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-[color:var(--border)] bg-white/5 p-6">
            <div className="text-xs text-[color:var(--muted)]">01</div>
            <div className="mt-2 text-base font-semibold">{t("marketing.home.how1Title")}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.how1Desc")}</div>
          </Card>
          <Card className="border-[color:var(--border)] bg-white/5 p-6">
            <div className="text-xs text-[color:var(--muted)]">02</div>
            <div className="mt-2 text-base font-semibold">{t("marketing.home.how2Title")}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.how2Desc")}</div>
          </Card>
          <Card className="border-[color:var(--border)] bg-white/5 p-6">
            <div className="text-xs text-[color:var(--muted)]">03</div>
            <div className="mt-2 text-base font-semibold">{t("marketing.home.how3Title")}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.how3Desc")}</div>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <SectionTitle title={t("marketing.home.useCasesTitle")} subtitle={t("marketing.home.useCasesSubtitle")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["ecommerce", "callcenters", "clinics", "restaurants", "realestate", "delivery"].map((k) => (
            <Card key={k} className="border-[color:var(--border)] bg-white/5 p-6">
              <div className="text-base font-semibold">{t(`marketing.useCases.${k}.title`)}</div>
              <div className="mt-2 text-sm text-[color:var(--muted)]">{t(`marketing.useCases.${k}.desc`)}</div>
            </Card>
          ))}
        </div>
        <div className="flex justify-center">
          <Link href={`${base}/use-cases`}>
            <Button variant="secondary">{t("marketing.home.viewAllUseCases")}</Button>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <SectionTitle title={t("marketing.home.pricingTitle")} subtitle={t("marketing.home.pricingSubtitle")} />
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
      </section>

      <section className="flex flex-col gap-10">
        <SectionTitle title={t("marketing.home.faqTitle")} subtitle={t("marketing.home.faqSubtitle")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {["faq1", "faq2", "faq3", "faq4"].map((k) => (
            <Card key={k} className="border-[color:var(--border)] bg-white/5 p-6">
              <div className="text-base font-semibold">{t(`marketing.faq.${k}.q`)}</div>
              <div className="mt-2 text-sm text-[color:var(--muted)]">{t(`marketing.faq.${k}.a`)}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--graphite)] px-6 py-10 md:px-10">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div>
            <div className="text-2xl font-semibold md:text-3xl">{t("marketing.home.ctaTitle")}</div>
            <div className="mt-2 text-sm text-[color:var(--muted)]">{t("marketing.home.ctaSubtitle")}</div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Link href={`${base}/register`}>
              <Button size="lg">{t("marketing.home.primaryCta")}</Button>
            </Link>
            <Link href={`${base}/contact`}>
              <Button size="lg" variant="secondary">
                {t("marketing.home.contactCta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

