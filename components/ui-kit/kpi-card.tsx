"use client";

import type { ComponentType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconLike = ComponentType<{ className?: string; size?: number }>;

type KpiTone = "ok" | "warn" | "danger" | "neutral";

export type StatItem = {
  label: string;
  value: string;
  note?: string;
  icon: IconLike;
  tone?: string;
  /** Makes the card a button. Navigate to the related screen or apply a matching filter. */
  onClick?: () => void;
  /** Accessible description of what clicking does, e.g. "Show overdue tickets". */
  actionLabel?: string;
  /** Highlights the card when its filter is currently applied. */
  active?: boolean;
};

export function KPICard({
  label,
  value,
  note,
  icon: Icon,
  tone,
  onClick,
  actionLabel,
  active,
}: {
  label: string;
  value: string;
  note?: string;
  icon: IconLike;
  tone?: KpiTone;
  onClick?: () => void;
  actionLabel?: string;
  active?: boolean;
}) {
  const toneClass =
    tone === "ok"
      ? "text-status-ok"
      : tone === "warn"
        ? "text-status-warn"
        : tone === "danger"
          ? "text-status-danger"
          : "text-muted";
  const body = <>
    <div className={cn("mb-2 flex items-center gap-2 text-xs font-medium", toneClass)}>
      <Icon size={16} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onClick && <ChevronRight size={14} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />}
    </div>
    <strong className="block text-xl font-bold tabular-nums text-foreground sm:text-2xl">{value}</strong>
    {note && <small className="mt-1 block text-xs text-muted">{note}</small>}
  </>;
  const base = "rounded-2xl border bg-card p-3 shadow-sm sm:p-4";
  if (!onClick) return <article className={cn(base, "border-border")} data-enter>{body}</article>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={actionLabel ? `${label}: ${value}. ${actionLabel}` : undefined}
      aria-pressed={active === undefined ? undefined : active}
      title={actionLabel}
      className={cn(
        base,
        "group block w-full cursor-pointer text-left transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0",
        active ? "border-primary ring-1 ring-primary" : "border-border",
      )}
      data-enter
    >
      {body}
    </button>
  );
}

const legacyTones: Record<string, KpiTone> = {
  ok: "ok", green: "ok",
  warn: "warn", orange: "warn",
  danger: "danger", red: "danger",
};

export function StatStrip({ items }: { items: StatItem[] }) {
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
