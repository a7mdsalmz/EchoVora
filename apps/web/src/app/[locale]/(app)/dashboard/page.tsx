"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Activity, Bot, Phone, ShoppingCart } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/authStore";
import { apiAgents, apiCalls, apiOrdersAnalytics } from "@/lib/api";

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="border-[color:var(--border)] bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[color:var(--muted)]">{label}</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
        </div>
        <div
          className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-black/20"
          style={{ background: "radial-gradient(70% 70% at 30% 20%, rgba(34,211,238,.18), transparent 60%), radial-gradient(70% 70% at 80% 70%, rgba(99,166,255,.18), transparent 55%), rgba(0,0,0,.18)" }}
        >
          <Icon className="h-5 w-5 text-[color:var(--accent)]" />
        </div>
      </div>
    </Card>
  );
}

export default function BusinessDashboardPage() {
  const t = useTranslations();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = React.useState<{ agents: number; orders30d: number; calls7d: number; successPct: number } | null>(null);

  React.useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      const [agents, orders, calls] = await Promise.all([apiAgents(accessToken), apiOrdersAnalytics(accessToken), apiCalls(accessToken)]);
      const successPct = orders.totalOrders > 0 ? (orders.confirmed / orders.totalOrders) * 100 : 0;
      setStats({
        agents: agents.agents.filter((a) => a.status === "ACTIVE").length,
        orders30d: orders.totalOrders,
        calls7d: calls.length,
        successPct
      });
    })();
  }, [accessToken]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pages.businessDashboard.title")} description={t("pages.businessDashboard.subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Bot} label={t("stats.agents")} value={stats ? String(stats.agents) : t("stats.placeholder")} />
        <StatCard icon={ShoppingCart} label={t("stats.orders")} value={stats ? String(stats.orders30d) : t("stats.placeholder")} />
        <StatCard icon={Phone} label={t("stats.calls")} value={stats ? String(stats.calls7d) : t("stats.placeholder")} />
        <StatCard icon={Activity} label={t("stats.analytics")} value={stats ? `${stats.successPct.toFixed(1)}%` : t("stats.placeholder")} />
      </div>

      <Card
        className={cn("border-[color:var(--border)] p-6", "bg-black/10")}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), transparent), radial-gradient(900px 500px at 20% 0%, rgba(124,58,237,.18), transparent 60%), rgba(0,0,0,.12)"
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{t("pages.businessDashboard.waveTitle")}</div>
            <div className="mt-1 text-sm text-[color:var(--muted)]">{t("pages.businessDashboard.waveSubtitle")}</div>
          </div>
          <div className="hidden h-10 w-32 rounded-full bg-white/5 sm:block" />
        </div>

        <div className="mt-6 grid grid-cols-12 gap-2">
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 16 + ((i * 13) % 40);
            return (
              <div
                key={i}
                className="col-span-1 rounded-full"
                style={{
                  height: `${h}px`,
                  background:
                    i % 3 === 0
                      ? "linear-gradient(180deg, rgba(34,211,238,.65), rgba(99,166,255,.25))"
                      : "linear-gradient(180deg, rgba(99,166,255,.5), rgba(124,58,237,.2))",
                  opacity: 0.9
                }}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}

