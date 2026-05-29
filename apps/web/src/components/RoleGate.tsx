"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { Role } from "@echovora/shared";
import { useAuthStore } from "@/stores/authStore";

export function RoleGate({
  locale,
  allow,
  children
}: {
  locale: "en" | "ar";
  allow: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const me = useAuthStore((s) => s.me);

  React.useEffect(() => {
    if (!me) return;
    if (allow.includes(me.role)) return;
    router.replace(`/${locale}/dashboard`);
  }, [allow, locale, me, router]);

  if (!me) return null;
  if (!allow.includes(me.role)) return null;
  return <>{children}</>;
}

