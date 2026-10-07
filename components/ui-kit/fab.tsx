"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function FAB({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-page-fab="true"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald text-white shadow-lg shadow-emerald/30 md:bottom-8 md:right-8",
        className,
      )}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}
