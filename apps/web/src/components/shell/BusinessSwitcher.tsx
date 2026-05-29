"use client";

import * as React from "react";
import { ChevronsUpDown, Building2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { useBusinessStore } from "@/stores/businessStore";

export function BusinessSwitcher() {
  const businesses = useBusinessStore((s) => s.businesses);
  const selectedBusinessId = useBusinessStore((s) => s.selectedBusinessId);
  const selectBusiness = useBusinessStore((s) => s.selectBusiness);

  const current = React.useMemo(
    () => businesses.find((b) => b.businessId === selectedBusinessId) ?? businesses[0],
    [businesses, selectedBusinessId]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 max-w-[240px]">
          <Building2 className="h-4 w-4 opacity-80" />
          <span className="truncate">{current?.name ?? "Select business"}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <div className="px-3 py-2 text-xs text-[color:var(--muted)]">Business</div>
        {businesses.map((b) => {
          const active = b.businessId === (selectedBusinessId ?? current?.businessId);
          return (
            <DropdownMenuItem
              key={b.businessId}
              onSelect={() => {
                selectBusiness(b.businessId);
              }}
              className={cn("gap-2", active ? "bg-white/5" : "")}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{b.name}</div>
                <div className="truncate text-[11px] text-[color:var(--muted)]">{b.businessId}</div>
              </div>
              {active ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

