"use client";

import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type IconLike = ComponentType<{ className?: string; size?: number }>;

type KpiTone = "ok" | "warn" | "danger" | "neutral";

export function KPICard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  icon: IconLike;
  tone?: KpiTone;
}) {
  const toneClass =
    tone === "ok"
      ? "text-status-ok"
      : tone === "warn"
        ? "text-status-warn"
        : tone === "danger"
          ? "text-status-danger"
          : "text-muted";
  return (
    <article className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4" data-enter>
      <div className={cn("mb-2 flex items-center gap-2 text-xs font-medium", toneClass)}>
        <Icon size={16} />
        <span>{label}</span>
      </div>
      <strong className="block text-xl font-bold tabular-nums text-foreground sm:text-2xl">{value}</strong>
      {note && <small className="mt-1 block text-xs text-muted">{note}</small>}
    </article>
  );
}

const legacyTones: Record<string, KpiTone> = {
  ok: "ok", green: "ok",
  warn: "warn", orange: "warn",
  danger: "danger", red: "danger",
};

export function StatStrip({
  items,
}: {
  items: { label: string; value: string; note?: string; icon: IconLike; tone?: string }[];
}) {
  return (
    <section className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4 sm:gap-3" data-enter>
      {items.map(item => (
        <KPICard key={item.label} {...item} tone={legacyTones[item.tone ?? ""] ?? "neutral"} />
      ))}
    </section>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-3">{children}</div>;
}
