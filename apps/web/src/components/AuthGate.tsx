"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { apiMe, apiSwitchBusiness, apiTenants } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useBusinessStore } from "@/stores/businessStore";

export function AuthGate({ locale, children }: { locale: "en" | "ar"; children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.me);
  const setMe = useAuthStore((s) => s.setMe);
  const setTokens = useAuthStore((s) => s.setTokens);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const selectedBusinessId = useBusinessStore((s) => s.selectedBusinessId);
  const selectBusiness = useBusinessStore((s) => s.selectBusiness);
  const setBusinesses = useBusinessStore((s) => s.setBusinesses);

  const switchingRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!accessToken) {
        router.replace(`/${locale}/login`);
        return;
      }
      if (me) return;
      try {
        const fresh = await apiMe(accessToken);
        if (cancelled) return;
        setMe(fresh);

        const businesses = await apiTenants(accessToken);
        if (cancelled) return;
        setBusinesses(businesses);

        if (!selectedBusinessId) {
          selectBusiness(fresh.businessId);
        }
      } catch {
        if (!cancelled) router.replace(`/${locale}/login`);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, me, router, locale, setMe, setBusinesses, selectedBusinessId, selectBusiness]);

  React.useEffect(() => {
    let cancelled = false;
    async function syncBusiness() {
      if (!accessToken || !me) return;
      if (!selectedBusinessId) return;
      if (selectedBusinessId === me.businessId) return;
      if (switchingRef.current) return;
      switchingRef.current = true;
      try {
        const res = await apiSwitchBusiness(accessToken, selectedBusinessId);
        if (cancelled) return;
        setTokens({ accessToken: res.accessToken, refreshToken });
        const fresh = await apiMe(res.accessToken);
        if (cancelled) return;
        setMe(fresh);
        const businesses = await apiTenants(res.accessToken);
        if (cancelled) return;
        setBusinesses(businesses);
      } finally {
        switchingRef.current = false;
      }
    }
    void syncBusiness();
    return () => {
      cancelled = true;
    };
  }, [accessToken, me, selectedBusinessId, setMe, setTokens, setBusinesses, refreshToken]);

  if (!accessToken) return null;
  return <>{children}</>;
}

