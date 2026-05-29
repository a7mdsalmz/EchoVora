"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { UserMenu } from "@/components/shell/UserMenu";
import { BusinessSwitcher } from "@/components/shell/BusinessSwitcher";
import type { NavItem } from "@/components/shell/Sidebar";

export function Topbar({ locale, items }: { locale: "en" | "ar"; items: NavItem[] }) {
  const pathname = usePathname();
  const title = items.find((i) => i.href === pathname)?.label ?? "";

  return (
    <div className="border-b border-[color:var(--border)] bg-[color:var(--background)]">
      <div
        className={cn(
          "mx-auto flex h-16 items-center justify-between gap-4 px-6",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]"
        )}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">{title}</div>
          <div className="mt-0.5 h-[1px] w-32 opacity-60" style={{ background: "linear-gradient(90deg, var(--accent2), var(--accent), transparent)" }} />
        </div>

        <div className="flex items-center gap-2">
          <BusinessSwitcher />
          <LanguageToggle locale={locale} />
          <ThemeToggle />
          <UserMenu locale={locale} />
        </div>
      </div>
    </div>
  );
}

