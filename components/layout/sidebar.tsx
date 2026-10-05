"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavModule } from "@/lib/nav-config";
import type { AppView } from "@/types/domain";
import { APP_NAME } from "@/lib/labels";

export function Sidebar({
  modules,
  activeView,
  activeModuleId,
  onSelectModule,
  onNavigate,
  attentionCount,
  onAttention,
}: {
  modules: NavModule[];
  activeView: AppView;
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onNavigate: (view: AppView) => void;
  attentionCount: number;
  onAttention: () => void;
}) {
  const [submenuCollapsed, setSubmenuCollapsed] = useState(false);
  const activeModule = useMemo(
    () => modules.find(m => m.id === activeModuleId) ?? modules[0],
    [modules, activeModuleId],
  );

  if (!activeModule) return null;

  return (
    <aside className="hidden p-2 md:flex" aria-label="Main navigation">
      <div className="flex">
        <div className="flex w-[72px] flex-col items-center rounded-3xl bg-navy py-2 text-white">
          <div className="flex h-14 w-full items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10" aria-label={APP_NAME}>
              <Shield className="h-5 w-5 text-emerald" />
            </span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-1">
            {modules.map(mod => {
              const active = mod.id === activeModuleId;
              return (
                <button
                  key={mod.id}
                  type="button"
                  title={mod.title}
                  onClick={() => onSelectModule(mod.id)}
                  className={cn(
                    "flex h-9 w-14 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-white text-navy shadow-sm" : "text-white/60 hover:bg-white/10",
                  )}
                >
                  <mod.icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={onAttention}
            className="relative mb-2 flex h-9 w-14 items-center justify-center rounded-xl text-white/70 hover:bg-white/10"
            title="Need attention"
          >
            <span className="text-lg font-bold">!</span>
            {attentionCount > 0 && (
              <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[9px] font-bold">
                {attentionCount > 9 ? "9+" : attentionCount}
              </span>
            )}
          </button>
        </div>

        {!submenuCollapsed && (
          <div className="ml-2 flex w-[228px] flex-col rounded-3xl border border-border bg-gradient-to-b from-card to-surface">
            <div className="flex h-14 items-center border-b border-border px-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{activeModule.eyebrow}</p>
                <p className="text-sm font-semibold text-foreground">{activeModule.title}</p>
              </div>
            </div>
            <nav className="flex-1 space-y-0.5 p-2">
              {activeModule.items.map(item => {
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => onNavigate(item.view)}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-emerald/10 font-semibold text-emerald"
                        : "text-foreground/70 hover:bg-surface hover:text-foreground",
                    )}
                  >
                    <span>{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="rounded-md bg-status-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSubmenuCollapsed(c => !c)}
          className="ml-1 mt-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted"
          aria-label={submenuCollapsed ? "Expand menu" : "Collapse menu"}
        >
          {submenuCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
