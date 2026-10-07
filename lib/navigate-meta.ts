import type { NavClickMeta } from "@/lib/nav-config";

/** Normalizes legacy `navigate(view, reportId)` and `navigate(view, meta)` call sites. */
export function parseNavMeta(meta?: string | NavClickMeta): NavClickMeta | undefined {
  if (meta === undefined) return undefined;
  if (typeof meta === "string") return { report: meta };
  return meta;
}

export function navItemKey(item: { view: string; report?: string; settingsGroup?: string }) {
  if (item.report) return `${item.view}:${item.report}`;
  if (item.settingsGroup) return `${item.view}:${item.settingsGroup}`;
  return item.view;
}

export function navItemActive(
  item: { view: string; report?: string; settingsGroup?: string },
  activeView: string,
  activeReport?: string,
  activeSettingsGroup?: string,
) {
  if (item.report) return activeView === item.view && activeReport === item.report;
  if (item.settingsGroup) return activeView === item.view && activeSettingsGroup === item.settingsGroup;
  return activeView === item.view;
}
