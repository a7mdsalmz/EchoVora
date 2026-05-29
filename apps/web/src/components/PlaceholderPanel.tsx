"use client";

import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";

export function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-[color:var(--border)] bg-black/10 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/5">
          <Sparkles className="h-5 w-5" style={{ color: "var(--accent2)" }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">{description}</div>
        </div>
      </div>
    </Card>
  );
}

