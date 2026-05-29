"use client";

import type { NavItem } from "@/components/shell/Sidebar";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { EchoVoraBrand } from "@/components/shell/EchoVoraBrand";

export function AppShell({
  locale,
  navItems,
  children
}: {
  locale: "en" | "ar";
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]">
      <Sidebar locale={locale} items={navItems} header={<EchoVoraBrand locale={locale} />} />
      <main className="min-h-screen">
        <Topbar locale={locale} items={navItems} />
        <div className="p-6">
          <div
            className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-6"
            style={{
              background:
                "radial-gradient(1200px 600px at 20% -10%, rgba(124,58,237,.22), transparent 60%), radial-gradient(900px 500px at 90% 0%, rgba(34,211,238,.18), transparent 55%), var(--panel)"
            }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

