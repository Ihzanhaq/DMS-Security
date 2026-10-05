"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollableTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("hidden overflow-x-auto rounded-2xl border border-border bg-card md:block", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function SortableTh({
  label,
  active,
  direction,
  onSort,
  className,
}: {
  label: string;
  active?: boolean;
  direction?: "asc" | "desc";
  onSort?: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted", className)}>
      {onSort ? (
        <button type="button" onClick={onSort} className={cn("inline-flex items-center gap-1", active && "text-foreground")}>
          {label}
          <Icon className="h-3.5 w-3.5" />
        </button>
      ) : (
        label
      )}
    </th>
  );
}

export function TableRow({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      className={cn("border-t border-border hover:bg-surface", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted" data-enter>
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 rounded-lg border border-border disabled:opacity-40"
        >
          ‹
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              "h-8 min-w-8 rounded-lg border px-2",
              p === page ? "border-emerald bg-emerald text-white" : "border-border bg-card",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 rounded-lg border border-border disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
