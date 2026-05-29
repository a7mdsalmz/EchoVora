import type { ReactNode } from "react";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default async function MarketingLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <MarketingHeader locale={locale} />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}

