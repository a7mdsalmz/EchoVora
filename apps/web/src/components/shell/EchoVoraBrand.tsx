"use client";

import Link from "next/link";
import { AudioWaveform } from "lucide-react";

import { cn } from "@/lib/cn";

export function EchoVoraBrand({ locale }: { locale: "en" | "ar" }) {
  return (
    <Link
      href={`/${locale}/dashboard`}
      className={cn(
        "group relative flex items-center gap-3 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2",
        "hover:border-white/15 hover:bg-white/5 transition-colors"
      )}
    >
      <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[12px] bg-[color:var(--graphite)]">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(80% 80% at 30% 20%, var(--purple) 0%, transparent 60%), radial-gradient(70% 70% at 70% 70%, var(--accent2) 0%, transparent 55%)" }} />
        <AudioWaveform className="relative h-5 w-5 text-white" />
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="text-sm font-semibold tracking-tight">
          <span style={{ background: "linear-gradient(90deg, var(--foreground), var(--accent))", WebkitBackgroundClip: "text", color: "transparent" }}>EchoVora</span>
        </div>
        <div className="text-[11px] text-[color:var(--muted)]">Voice automation, bilingual-first</div>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute -bottom-2 left-3 right-3 h-[10px] opacity-0 blur-sm transition-opacity",
          "group-hover:opacity-100"
        )}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(34,211,238,.45), rgba(99,166,255,.45), rgba(124,58,237,.45), transparent)"
        }}
      />
    </Link>
  );
}

