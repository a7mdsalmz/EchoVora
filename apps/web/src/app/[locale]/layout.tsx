import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";
  const t = await getTranslations({ locale });

  return {
    title: t("seo.title"),
    description: t("seo.description"),
    openGraph: {
      title: t("seo.ogTitle"),
      description: t("seo.ogDescription"),
      locale
    },
    alternates: {
      languages: {
        en: "/en",
        ar: "/ar"
      }
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-full">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

