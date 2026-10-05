"use client";

import type { ComponentType, InputHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "./field";

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}

/** Two-column page body; collapses to one column below `lg`. */
export function SplitLayout({ children, className, wideFirst }: { children: ReactNode; className?: string; wideFirst?: boolean }) {
  return (
    <div className={cn("mb-4 grid gap-4", wideFirst ? "lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]" : "lg:grid-cols-2", className)}>
      {children}
    </div>
  );
}

const alertTones = {
  warning: { box: "border-status-warn/30 bg-status-warn/10 text-foreground", icon: AlertTriangle, iconClass: "text-status-warn" },
  danger: { box: "border-status-danger/30 bg-status-danger/10 text-foreground", icon: AlertTriangle, iconClass: "text-status-danger" },
  success: { box: "border-emerald/30 bg-emerald/10 text-foreground", icon: CheckCircle2, iconClass: "text-emerald" },
  info: { box: "border-border bg-surface text-foreground", icon: Info, iconClass: "text-muted" },
} as const;

export function InlineAlert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof alertTones;
  children: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon, iconClass } = alertTones[tone];
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm", box, className)} role={tone === "success" ? "status" : undefined}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly (T | { id: T; label: string })[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-surface p-1", className)} role="tablist" data-enter>
      {options.map(option => {
        const id = typeof option === "string" ? option : option.id;
        const label = typeof option === "string" ? option : option.label;
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function InputAffix({
  prefix,
  suffix,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string }) {
  return (
    <div className={cn("relative flex items-center", className)}>
      {prefix && <span className="pointer-events-none absolute left-3 text-sm text-muted">{prefix}</span>}
      <input {...props} className={cn(inputClass, prefix && "pl-8", suffix && "pr-20")} />
      {suffix && <span className="pointer-events-none absolute right-3 text-sm text-muted">{suffix}</span>}
    </div>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  defaultChecked,
  onChange,
}: {
  title: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 hover:bg-surface">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#00be73]"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? e => onChange(e.target.checked) : undefined}
      />
      <span>
        <strong className="block text-sm font-medium text-foreground">{title}</strong>
        {description && <small className="text-xs text-muted">{description}</small>}
      </span>
    </label>
  );
}

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-5", className)}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

/** Row in a bordered list (used for queues, ledgers and editable rows). */
export function ListRow({ children, className, onClick, active }: { children: ReactNode; className?: string; onClick?: () => void; active?: boolean }) {
  const classes = cn(
    "flex flex-wrap items-center gap-3 border-t border-border px-1 py-3 first:border-t-0 sm:flex-nowrap",
    onClick && "w-full cursor-pointer rounded-lg px-3 text-left hover:bg-surface",
    active && "bg-emerald/5",
    className,
  );
  if (onClick) return <button type="button" className={classes} onClick={onClick}>{children}</button>;
  return <div className={classes}>{children}</div>;
}

export function IconTile({ icon: Icon, tone = "emerald" }: { icon: ComponentType<{ className?: string }>; tone?: "emerald" | "warn" | "danger" | "navy" }) {
  const toneClass = {
    emerald: "bg-emerald/10 text-emerald",
    warn: "bg-status-warn/15 text-status-warn",
    danger: "bg-status-danger/10 text-status-danger",
    navy: "bg-navy/10 text-navy dark:text-foreground",
  }[tone];
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", toneClass)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm first:border-t-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right font-semibold text-foreground">{value}</strong>
    </div>
  );
}
