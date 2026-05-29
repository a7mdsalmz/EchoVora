"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { useBusinessStore } from "@/stores/businessStore";

export function UserMenu({ locale }: { locale: "en" | "ar" }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.me);
  const signOut = useAuthStore((s) => s.signOut);
  const clearBusinesses = useBusinessStore((s) => s.clear);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <span className="max-w-[140px] truncate">{me?.name ?? me?.email ?? "..."}</span>
          <ChevronDown className="h-4 w-4 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2">
          <div className="text-xs text-[color:var(--muted)]">Signed in as</div>
          <div className="mt-0.5 truncate text-sm font-medium">{me?.email ?? "..."}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <Shield className="h-3.5 w-3.5" />
            <span>{me?.role ?? "..."}</span>
          </div>
        </div>

        <DropdownMenuItem
          onSelect={() => {
            router.push(`/${locale}/settings`);
          }}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => {
            clearBusinesses();
            signOut();
            router.replace(`/${locale}/login`);
          }}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

