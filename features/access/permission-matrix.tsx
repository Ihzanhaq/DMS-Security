"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Search, Sparkles, XCircle } from "lucide-react";
import { inputClass } from "@/components/ui-kit";
import {
  actionLabel, allPermissionKeys, permissionGroups, permissionKey,
  type PermissionAction, type PermissionKey, type PermissionModule,
} from "@/lib/access";
import { cn } from "@/lib/utils";

export const TOTAL_PERMISSIONS = allPermissionKeys.length;

export const PERMISSION_PRESETS = {
  full: () => [...allPermissionKeys],
  view: () => allPermissionKeys.filter(key => key.endsWith(".view")),
  none: () => [] as PermissionKey[],
};

const presetButton = "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface";
const checkboxClass = "h-4 w-4 shrink-0 cursor-pointer accent-emerald disabled:cursor-default disabled:opacity-60";

const moduleKeys = (module: PermissionModule) => module.actions.map(action => permissionKey(module.key, action));

/**
 * One card per module group. Rows are modules, columns are actions; cells that don't apply show "—".
 * Header, column and row controls select everything they cover.
 */
export function PermissionMatrix({ value, onChange, readOnly = false, defaultCollapsed = false, hideToolbar = false }: {
  value: PermissionKey[];
  onChange?: (keys: PermissionKey[]) => void;
  readOnly?: boolean;
  defaultCollapsed?: boolean;
  hideToolbar?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const locked = readOnly || !onChange;

  const granted = useMemo(() => new Set(value), [value]);
  const has = (key: PermissionKey) => granted.has(key);
  const commit = (next: Set<PermissionKey>) => onChange?.(allPermissionKeys.filter(key => next.has(key)));
  const setKeys = (keys: PermissionKey[], on: boolean) => {
    if (locked) return;
    const next = new Set(granted);
    keys.forEach(key => on ? next.add(key) : next.delete(key));
    commit(next);
  };
  const toggle = (key: PermissionKey) => setKeys([key], !has(key));
  const applyPreset = (kind: keyof typeof PERMISSION_PRESETS) => { if (!locked) onChange?.(PERMISSION_PRESETS[kind]()); };
  const toggleCollapse = (label: string) => setCollapsed(current => ({ ...current, [label]: !(current[label] ?? defaultCollapsed) }));

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    if (!q) return permissionGroups;
    return permissionGroups
      .map(group => ({
        ...group,
        modules: group.modules.filter(module =>
          `${group.label} ${module.label} ${module.key} ${module.hint ?? ""}`.toLowerCase().includes(q)
          || module.actions.some(action => `${module.key}.${action} ${actionLabel[action]}`.toLowerCase().includes(q))),
      }))
      .filter(group => group.modules.length);
  }, [q]);

  const headerCheck = (keys: PermissionKey[], label: string) => {
    const on = keys.filter(has).length;
    return (
      <input
        type="checkbox"
        aria-label={label}
        disabled={locked || keys.length === 0}
        checked={keys.length > 0 && on === keys.length}
        ref={element => { if (element) element.indeterminate = on > 0 && on < keys.length; }}
        onChange={event => setKeys(keys, event.target.checked)}
        className={checkboxClass}
      />
    );
  };

  return (
    <div>
      {!hideToolbar && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted"><span className="font-semibold text-emerald">{value.length}</span> of {TOTAL_PERMISSIONS} permissions granted</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input className={cn(inputClass, "h-9 w-48 pl-8")} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search permissions…" aria-label="Search permissions" />
            </div>
            {!locked && <>
              <button type="button" onClick={() => applyPreset("full")} className={presetButton}><Sparkles className="h-3.5 w-3.5 text-emerald" /> Full</button>
              <button type="button" onClick={() => applyPreset("view")} className={presetButton}><Eye className="h-3.5 w-3.5 text-muted" /> View only</button>
              <button type="button" onClick={() => applyPreset("none")} className={presetButton}><XCircle className="h-3.5 w-3.5 text-muted" /> Clear</button>
            </>}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {groups.length === 0 && <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">No permissions match “{query}”.</p>}
        {groups.map(group => {
          const count = group.keys.filter(has).length;
          const open = !(collapsed[group.label] ?? defaultCollapsed) || Boolean(q);
          return (
            <section key={group.label} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className={cn("flex items-center gap-3 px-4 py-3", open && "border-b border-border")}>
                {headerCheck(group.keys, `All ${group.label} permissions`)}
                <button type="button" onClick={() => toggleCollapse(group.label)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="truncate text-sm font-semibold text-foreground">{group.label}</span>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{count}/{group.keys.length}</span>
                </button>
                <button type="button" onClick={() => toggleCollapse(group.label)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground" aria-label={open ? `Collapse ${group.label}` : `Expand ${group.label}`} aria-expanded={open}>
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm" style={{ minWidth: 160 + group.columns.length * 76 }}>
                    <thead>
                      <tr className="border-b border-border bg-surface/50">
                        <th className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Permission</th>
                        {group.columns.map(column => {
                          const columnKeys = group.modules.filter(module => module.actions.includes(column)).map(module => permissionKey(module.key, column));
                          return (
                            <th key={column} className="px-3 py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{actionLabel[column]}</span>
                                {headerCheck(columnKeys, `${actionLabel[column]} for every ${group.label} row`)}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.modules.map(module => {
                        const rowKeys = moduleKeys(module);
                        const rowOn = rowKeys.filter(has).length;
                        return (
                          <tr key={module.key} className="transition-colors hover:bg-surface/40">
                            <td className="sticky left-0 z-10 w-[150px] bg-card px-4 py-2.5 sm:w-auto sm:max-w-[260px]">
                              <button type="button" disabled={locked} onClick={() => setKeys(rowKeys, rowOn !== rowKeys.length)} className="flex w-full items-center gap-2 text-left disabled:cursor-default" title={module.hint ?? "Toggle all in this row"}>
                                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", rowOn ? "bg-emerald" : "bg-border")} />
                                <span className="leading-snug text-foreground sm:truncate">{module.label}</span>
                              </button>
                            </td>
                            {group.columns.map((column: PermissionAction) => {
                              const key = module.actions.includes(column) ? permissionKey(module.key, column) : null;
                              return (
                                <td key={column} className="px-3 py-2.5 text-center">
                                  {key
                                    ? <input type="checkbox" disabled={locked} checked={has(key)} onChange={() => toggle(key)} className={checkboxClass} aria-label={`${module.label}: ${actionLabel[column]}`} />
                                    : <span className="text-muted/30">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
