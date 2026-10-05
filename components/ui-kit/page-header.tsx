"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  description,
  action,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const body = subtitle ?? description;
  const right = action ?? actions;
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between", className)} data-enter>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold leading-tight text-foreground sm:text-xl md:text-2xl">{title}</h1>
        {body && <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>}
      </div>
      {right && <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">{right}</div>}
    </div>
  );
}

export function BackCrumb({
  backLabel,
  onBack,
  current,
}: {
  backLabel: string;
  onBack: () => void;
  current: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-sm text-muted" data-enter>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </button>
      <span className="text-border">/</span>
      <span className="truncate font-medium text-foreground">{current}</span>
    </div>
  );
}
