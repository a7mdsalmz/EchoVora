"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Bot, ShoppingCart, Phone, PhoneCall, Headset, LineChart, CreditCard, Settings, Shield } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Role } from "@echovora/shared";
import { useAuthStore } from "@/stores/authStore";

const iconMap = {
  dashboard: LayoutGrid,
  agents: Bot,
  orders: ShoppingCart,
  calls: Phone,
  telephony: PhoneCall,
  callCenter: Headset,
  analytics: LineChart,
  billing: CreditCard,
  settings: Settings,
  admin: Shield
} as const;

export type NavIcon = keyof typeof iconMap;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles?: Role[];
};

export function Sidebar({ locale, items, header }: { locale: "en" | "ar"; items: NavItem[]; header: React.ReactNode }) {
  const pathname = usePathname();
  const me = useAuthStore((s) => s.me);

  return (
    <aside
      className={cn(
        "border-[color:var(--border)] bg-[color:var(--panel)] p-4",
        locale === "ar" ? "border-l" : "border-r"
      )}
    >
      {header}

      <nav className="mt-6 flex flex-col gap-1">
        {items
          .filter((i) => {
            if (!i.roles) return true;
            if (!me) return false;
            return i.roles.includes(me.role);
          })
          .map((item) => {
            const active = pathname === item.href;
            const Icon = iconMap[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-[color:var(--foreground)]"
                    : "text-[color:var(--muted)] hover:bg-white/5 hover:text-[color:var(--foreground)]"
                )}
              >
                {active ? (
                  <span
                    className={cn(
                      "absolute top-2 bottom-2 w-[3px] rounded-full",
                      locale === "ar" ? "right-1" : "left-1"
                    )}
                    style={{ background: "linear-gradient(180deg, var(--accent2), var(--accent), var(--purple))" }}
                  />
                ) : null}
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}

