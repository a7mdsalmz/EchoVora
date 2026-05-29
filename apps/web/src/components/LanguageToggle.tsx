"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function LanguageToggle({ locale }: { locale: "en" | "ar" }) {
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === "en" ? "ar" : "en";
  const target = pathname.replace(/^\/(en|ar)/, `/${nextLocale}`);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
        localStorage.setItem("echovora-locale", nextLocale);
        router.push(target);
      }}
    >
      {nextLocale.toUpperCase()}
    </Button>
  );
}

