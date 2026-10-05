"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
      data-enter
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
        <Icon className="h-6 w-6" />
      </div>
      {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-border ${className ?? "h-4 w-full"}`} />;
}
