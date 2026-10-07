"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchApp } from "@/lib/global-search";
import type { AppView } from "@/types/domain";
import { cn } from "@/lib/utils";

type SearchProps = {
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  canOpen: (view: AppView) => boolean;
};

/** Mounting the dialog only while open resets the query each time it opens. */
export function GlobalSearch({ open, ...props }: SearchProps & { open: boolean }) {
  return open ? <SearchDialog {...props} /> : null;
}

function SearchDialog({ onClose, onNavigate, canOpen }: SearchProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchApp(query, canOpen), [query, canOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-20" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-label="Search"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search employees, sites, complaints…"
            className="flex-1 border-0 bg-transparent text-sm outline-none"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {query && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">No results for “{query}”</li>
          )}
          {results.map(item => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-surface"
                onClick={() => {
                  onNavigate(item.view);
                  onClose();
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.group}</span>
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                <span className="text-xs text-muted">{item.subtitle}</span>
              </button>
            </li>
          ))}
          {!query && <li className="px-3 py-6 text-center text-sm text-muted">Type to search or pick a destination</li>}
        </ul>
      </div>
    </div>
  );
}

export function SearchTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      title="Search (Ctrl K)"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-emerald hover:text-foreground",
        className,
      )}
    >
      <Search className="h-4 w-4" />
    </button>
  );
}
