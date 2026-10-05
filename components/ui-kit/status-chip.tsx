"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneStyles = {
  success: "bg-emerald/10 text-emerald",
  warning: "bg-status-warn/15 text-status-warn",
  danger: "bg-status-danger/10 text-status-danger",
  info: "bg-navy/10 text-navy dark:text-foreground",
  neutral: "bg-muted/15 text-muted",
  draft: "bg-status-draft/15 text-status-draft",
} as const;

export type StatusTone = keyof typeof toneStyles;

export function StatusChip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** @deprecated use StatusChip */
export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const map: Record<string, StatusTone> = {
    success: "success",
    warning: "warning",
    danger: "danger",
    info: "info",
    neutral: "neutral",
  };
  return <StatusChip tone={map[tone]}>{children}</StatusChip>;
}

const domainStatusMap: Record<string, { label: string; tone: StatusTone }> = {
  Active: { label: "Active", tone: "success" },
  Leave: { label: "On leave", tone: "warning" },
  Reliever: { label: "Reliever", tone: "info" },
  open: { label: "Open", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  draft: { label: "Draft", tone: "draft" },
};

export function DomainStatus({ value }: { value: string }) {
  const entry = domainStatusMap[value] ?? { label: value, tone: "neutral" as StatusTone };
  return <StatusChip tone={entry.tone}>{entry.label}</StatusChip>;
}
