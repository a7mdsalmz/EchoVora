import { getTranslations } from "next-intl/server";

import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import type { NavItem } from "@/components/shell/Sidebar";
import type { Role } from "@echovora/shared";

export default async function AppLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";
  const t = await getTranslations();

  const businessRoles: Role[] = ["BUSINESS_OWNER", "MANAGER", "VIEWER", "SUPER_ADMIN"];

  const navItems: NavItem[] = [
    { href: `/${locale}/dashboard`, label: t("nav.dashboard"), icon: "dashboard", roles: businessRoles },
    { href: `/${locale}/agents`, label: t("nav.agents"), icon: "agents", roles: businessRoles },
    { href: `/${locale}/orders`, label: t("nav.orders"), icon: "orders", roles: businessRoles },
    { href: `/${locale}/calls`, label: t("nav.calls"), icon: "calls", roles: businessRoles },
    { href: `/${locale}/telephony`, label: t("nav.telephony"), icon: "telephony", roles: businessRoles },
    { href: `/${locale}/call-center`, label: t("nav.callCenter"), icon: "callCenter", roles: businessRoles },
    { href: `/${locale}/analytics`, label: t("nav.analytics"), icon: "analytics", roles: businessRoles },
    { href: `/${locale}/billing`, label: t("nav.billing"), icon: "billing", roles: businessRoles },
    { href: `/${locale}/settings`, label: t("nav.settings"), icon: "settings", roles: businessRoles },
    { href: `/${locale}/admin`, label: t("nav.admin"), icon: "admin", roles: ["SUPER_ADMIN"] }
  ];

  return (
    <AuthGate locale={locale}>
      <AppShell locale={locale} navItems={navItems}>
        {children}
      </AppShell>
    </AuthGate>
  );
}

