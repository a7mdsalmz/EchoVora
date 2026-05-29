"use client";

import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  right
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className={cn("text-lg font-semibold tracking-tight", "text-[color:var(--foreground)]")}>{title}</h1>
        {description ? <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

