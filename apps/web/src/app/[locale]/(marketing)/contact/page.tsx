import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ContactPage({
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
        <div className="text-3xl font-semibold tracking-tight md:text-4xl">{t("marketing.nav.contact")}</div>
        <div className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
          {locale === "ar"
            ? "احكِ لنا عن نشاطك وحالات الاستخدام، وسنقترح عليك أفضل طريقة للبدء."
            : "Tell us about your business and use cases. We’ll propose the best way to launch."}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-[color:var(--border)] bg-white/5 p-6 lg:col-span-2">
          <div className="text-sm font-semibold">{locale === "ar" ? "نموذج التواصل" : "Contact form"}</div>
          <div className="mt-2 text-sm text-[color:var(--muted)]">
            {locale === "ar"
              ? "لا يوجد إرسال تلقائي بعد. استخدم البريد الإلكتروني في الجانب الأيمن أو زر إرسال البريد."
              : "No automatic submission yet. Use the email on the right or the mail button."}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input placeholder={locale === "ar" ? "الاسم" : "Name"} />
            <Input placeholder={locale === "ar" ? "البريد الإلكتروني" : "Email"} />
            <div className="md:col-span-2">
              <Input placeholder={locale === "ar" ? "اسم النشاط / الشركة" : "Business / Company"} />
            </div>
            <div className="md:col-span-2">
              <textarea
                placeholder={locale === "ar" ? "ما الذي تريد أتمتته؟ (تأكيد طلبات، دعم وارد، إلخ…)" : "What do you want to automate? (Order confirmation, inbound support, etc.)"}
                className="min-h-32 w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <a href="mailto:hello@echovora.com?subject=EchoVora%20Demo%20Request">
              <Button>{locale === "ar" ? "إرسال بريد" : "Send email"}</Button>
            </a>
            <Link href={`${base}/register`}>
              <Button variant="secondary">{locale === "ar" ? "ابدأ الآن" : "Start now"}</Button>
            </Link>
          </div>
        </Card>

        <Card className="border-[color:var(--border)] bg-white/5 p-6">
          <div className="text-sm font-semibold">{locale === "ar" ? "معلومات التواصل" : "Contact info"}</div>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[color:var(--muted)]">
            <div>
              <div className="text-xs font-semibold tracking-wide text-[color:var(--muted)]">{locale === "ar" ? "البريد" : "Email"}</div>
              <div className="mt-1 text-[color:var(--foreground)]">hello@echovora.com</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-[color:var(--muted)]">{locale === "ar" ? "الاستجابة" : "Response"}</div>
              <div className="mt-1">{locale === "ar" ? "خلال 24-48 ساعة" : "Within 24–48 hours"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-[color:var(--muted)]">{locale === "ar" ? "التركيز" : "Focus"}</div>
              <div className="mt-1">{locale === "ar" ? "مصر والخليج والشركات ثنائية اللغة" : "Egypt, GCC, and bilingual operations"}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

