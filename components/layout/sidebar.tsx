"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronLeft, Shield } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/shared/use-accessibility-preferences";
import type { UnifiedSidebarTheme } from "@/lib/accessibility-preferences";
import { cn } from "@/lib/utils";
import type { NavClickMeta, NavModule } from "@/lib/nav-config";
import { navItemActive, navItemKey } from "@/lib/navigate-meta";
import type { AppView } from "@/types/domain";
import { APP_NAME } from "@/lib/labels";

export function Sidebar({
  modules,
  activeView,
  activeModuleId,
  onSelectModule,
  onNavigate,
  activeReport,
  activeSettingsGroup,
  bottomAttention,
}: {
  modules: NavModule[];
  activeView: AppView;
  activeModuleId: string;
  activeReport?: string;
  activeSettingsGroup?: string;
  onSelectModule: (id: string) => void;
  onNavigate: (view: AppView, meta?: NavClickMeta) => void;
  bottomAttention?: { count: number; onClick: () => void };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { unifiedSidebar, unifiedSidebarTheme } = useAccessibilityPreferences();
  const activeModule = useMemo(
    () => modules.find(m => m.id === activeModuleId) ?? modules[0],
    [modules, activeModuleId],
  );

  if (!activeModule) return null;

  if (unifiedSidebar) {
    return <UnifiedSidebar modules={modules} activeView={activeView} activeModuleId={activeModuleId} onSelectModule={onSelectModule}
      onNavigate={onNavigate} activeReport={activeReport} activeSettingsGroup={activeSettingsGroup} bottomAttention={bottomAttention} theme={unifiedSidebarTheme} />;
  }

  const showSubNav = activeModule.items.length > 1;

  return (
    <aside className="hidden h-screen shrink-0 overflow-hidden bg-surface p-2 md:flex" aria-label="Sidebar">
      <div className="flex w-[72px] flex-col overflow-hidden rounded-3xl bg-navy text-white">
        <div className="flex h-14 shrink-0 items-center justify-center">
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10" aria-label={APP_NAME}>
            <Shield className="h-[18px] w-[18px] text-emerald" />
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-1.5" aria-label="Sections">
          {modules.map(mod => {
            const active = mod.id === activeModuleId;
            const railBadge = mod.items.length === 1 ? mod.items[0]?.badge : undefined;
            return (
              <button
                key={mod.id}
                type="button"
                title={mod.title}
                aria-label={mod.title}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelectModule(mod.id)}
                className={cn(
                  "relative flex h-9 w-14 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors",
                  active ? "bg-white text-navy shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <mod.icon className="h-[18px] w-[18px]" />
                {railBadge != null && railBadge > 0 && (
                  <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[9px] font-bold leading-none text-white">
                    {railBadge > 9 ? "9+" : railBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {bottomAttention && (
          <div className="flex shrink-0 justify-center px-2 pb-2">
            <button
              type="button"
              onClick={bottomAttention.onClick}
              className="relative flex h-9 w-14 cursor-pointer items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Alerts and needs attention"
              aria-label={`Alerts and needs attention: ${bottomAttention.count}`}
            >
              <AlertTriangle className="h-[18px] w-[18px]" />
              {bottomAttention.count > 0 && (
                <span className="absolute right-2.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[9px] font-bold leading-none text-white">
                  {bottomAttention.count > 9 ? "9+" : bottomAttention.count}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {showSubNav && (collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expand menu"
          aria-label="Expand menu"
          className="ml-2 flex w-8 cursor-pointer items-center justify-center rounded-3xl border border-border bg-card text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      ) : (
        <div className="ml-2 flex h-full w-[228px] flex-col overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-card to-surface">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{activeModule.eyebrow}</p>
              <p className="truncate text-base font-semibold text-foreground">{activeModule.title}</p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Collapse menu"
              aria-label="Collapse menu"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main navigation">
            {activeModule.items.map(item => {
              const isActive = navItemActive(item, activeView, activeReport, activeSettingsGroup);
              return (
                <button
                  key={navItemKey(item)}
                  type="button"
                  onClick={() => onNavigate(item.view, { report: item.report, settingsGroup: item.settingsGroup })}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-emerald/10 font-semibold text-emerald"
                      : "text-foreground/70 hover:bg-surface hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-xs font-semibold text-gold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}

const unifiedThemes: Record<UnifiedSidebarTheme, {
  panel: string; muted: string; hover: string; active: string; activeModule: string; divider: string; logo: string;
}> = {
  white: {
    panel: "border border-border bg-card text-foreground",
    muted: "text-muted",
    hover: "hover:bg-surface hover:text-foreground",
    active: "bg-emerald/10 font-semibold text-emerald",
    activeModule: "text-foreground",
    divider: "border-border",
    logo: "bg-emerald/10",
  },
  navy: {
    panel: "bg-navy text-white",
    muted: "text-white/60",
    hover: "hover:bg-white/10 hover:text-white",
    active: "bg-white font-semibold text-navy",
    activeModule: "text-white",
    divider: "border-white/10",
    logo: "bg-white/10",
  },
};

/**
 * Single-panel navigation (Settings → Accessibility → Unified sidebar): every module is an expandable group,
 * so pages from different modules are one click away without switching the icon rail first.
 */
function UnifiedSidebar({
  modules, activeView, activeModuleId, onSelectModule, onNavigate, activeReport, activeSettingsGroup, bottomAttention, theme,
}: {
  modules: NavModule[];
  activeView: AppView;
  activeModuleId: string;
  activeReport?: string;
  activeSettingsGroup?: string;
  onSelectModule: (id: string) => void;
  onNavigate: (view: AppView, meta?: NavClickMeta) => void;
  bottomAttention?: { count: number; onClick: () => void };
  theme: UnifiedSidebarTheme;
}) {
  const t = unifiedThemes[theme];
  const [collapsed, setCollapsed] = useState(false);
  // Groups the user opened or closed by hand. The active module starts open.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === activeModuleId;
  const badgeOf = (mod: NavModule) => mod.items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
  const go = (item: NavModule["items"][number]) => onNavigate(item.view, { report: item.report, settingsGroup: item.settingsGroup });

  return (
    <aside className="hidden h-screen shrink-0 overflow-hidden bg-surface p-2 md:flex" aria-label="Sidebar">
      <div className={cn("flex flex-col overflow-hidden rounded-3xl transition-[width]", collapsed ? "w-[72px]" : "w-[260px]", t.panel)}>
        <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b px-3", t.divider, collapsed && "justify-center")}>
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", t.logo)} aria-hidden>
            <Shield className="h-[18px] w-[18px] text-emerald" />
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate text-sm font-semibold">{APP_NAME}</span>}
          {!collapsed && (
            <button type="button" onClick={() => setCollapsed(true)} title="Collapse menu" aria-label="Collapse menu"
              className={cn("flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors", t.muted, t.hover)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Main navigation">
          {collapsed && (
            <button type="button" onClick={() => setCollapsed(false)} title="Expand menu" aria-label="Expand menu"
              className={cn("mb-1 flex h-9 w-full cursor-pointer items-center justify-center rounded-xl transition-colors", t.muted, t.hover)}>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          )}
          {modules.map(mod => {
            const moduleActive = mod.id === activeModuleId;
            const single = mod.items.length === 1 ? mod.items[0] : undefined;
            const badge = badgeOf(mod);

            // Collapsed: icons only (opens the module's first page). Single-page modules: a plain link.
            if (collapsed || single) {
              const itemActive = single ? navItemActive(single, activeView, activeReport, activeSettingsGroup) : moduleActive;
              return (
                <button key={mod.id} type="button" title={mod.title} aria-label={mod.title} aria-current={itemActive ? "page" : undefined}
                  onClick={() => single ? go(single) : onSelectModule(mod.id)}
                  className={cn("relative flex min-h-10 w-full shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
                    collapsed && "justify-center px-0", itemActive ? t.active : cn(t.muted, t.hover))}>
                  <mod.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="min-w-0 flex-1 truncate">{mod.title}</span>}
                  {badge > 0 && (collapsed
                    ? <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[9px] font-bold leading-none text-white">{badge > 9 ? "9+" : badge}</span>
                    : <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-xs font-semibold text-gold">{badge}</span>)}
                </button>
              );
            }

            const open = isOpen(mod.id);
            return (
              <div key={mod.id}>
                <button type="button" aria-expanded={open} onClick={() => setToggled(current => ({ ...current, [mod.id]: !open }))}
                  className={cn("flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
                    moduleActive ? cn("font-semibold", t.activeModule) : t.muted, t.hover)}>
                  <mod.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{mod.title}</span>
                  {!open && badge > 0 && <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-xs font-semibold text-gold">{badge}</span>}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <div className={cn("mb-1 ml-5 flex flex-col gap-0.5 border-l pl-2", t.divider)}>
                    {mod.items.map(item => {
                      const itemActive = navItemActive(item, activeView, activeReport, activeSettingsGroup);
                      return (
                        <button key={navItemKey(item)} type="button" aria-current={itemActive ? "page" : undefined} onClick={() => go(item)}
                          className={cn("flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                            itemActive ? t.active : cn(t.muted, t.hover))}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.badge != null && item.badge > 0 && <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-xs font-semibold text-gold">{item.badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {bottomAttention && (
          <div className={cn("shrink-0 border-t p-2", t.divider)}>
            <button type="button" onClick={bottomAttention.onClick} title="Alerts and needs attention" aria-label={`Alerts and needs attention: ${bottomAttention.count}`}
              className={cn("relative flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors", collapsed && "justify-center px-0", t.muted, t.hover)}>
              <AlertTriangle className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="min-w-0 flex-1 truncate text-left">Needs attention</span>}
              {bottomAttention.count > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[9px] font-bold leading-none text-white">{bottomAttention.count > 9 ? "9+" : bottomAttention.count}</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
