"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";
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

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Hide this column in the mobile card layout. */
  hideOnMobile?: boolean;
  className?: string;
};

/** Desktop table plus a stacked-card layout below `md`. The first column is the card title. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const [first, ...rest] = columns;
  return (
    <div className={className}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column.header} className={cn("bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", column.align === "right" ? "text-right" : "text-left")}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={rowKey(row)}
                className={cn("border-t border-border hover:bg-surface", onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? event => { if (event.key === "Enter") onRowClick(row); } : undefined}
              >
                {columns.map(column => (
                  <td key={column.header} className={cn("px-4 py-3 align-middle", column.align === "right" && "text-right tabular-nums", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 p-3 md:hidden">
        {rows.map(row => (
          <div
            key={rowKey(row)}
            className={cn("rounded-2xl border border-border bg-card p-3 shadow-sm", onRowClick && "cursor-pointer active:bg-surface")}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="mb-2">{first.cell(row)}</div>
            {rest.filter(column => !column.hideOnMobile).map(column => (
              <div key={column.header} className="flex items-center justify-between gap-3 border-t border-border py-1.5 text-sm">
                <span className="text-xs text-muted">{column.header}</span>
                <span className="text-right">{column.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal step indicator; steps beyond `maxReached` are disabled. */
export function Stepper({
  steps,
  current,
  maxReached,
  onSelect,
}: {
  steps: readonly string[];
  current: number;
  maxReached: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-sm" data-enter>
      {steps.map((step, index) => {
        const done = index <= maxReached && index !== current;
        const active = index === current;
        return (
          <li key={step} className="min-w-[120px] flex-1">
            <button
              type="button"
              disabled={index > maxReached}
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                active ? "bg-emerald/10 font-semibold text-emerald" : "hover:bg-surface",
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                active ? "bg-emerald text-white" : done ? "bg-emerald/15 text-emerald" : "bg-surface text-muted",
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {step}
            </button>
          </li>
        );
      })}
    </ol>
  );
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
