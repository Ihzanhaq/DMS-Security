import type { CalendarMarkType, SiteCalendarMark } from "@/types/domain";

export const markTypeLabel: Record<CalendarMarkType, string> = { holiday: "Holiday", closure: "Site closed", event: "Event", note: "Note" };

/** Colours per mark type, matching the app's status tokens. */
export const markColor: Record<CalendarMarkType, string> = { holiday: "#8b5cf6", closure: "#64748b", event: "#f97316", note: "#0ea5e9" };

/** True when the ISO date falls inside the mark (both ends inclusive). */
export const covers = (mark: SiteCalendarMark, date: string) => mark.start <= date && date <= mark.end;

/** Marks for one site, including company-wide ones. */
export const marksFor = (marks: readonly SiteCalendarMark[], siteId: string) => marks.filter(mark => mark.siteId === "all" || mark.siteId === siteId);

export const marksOn = (marks: readonly SiteCalendarMark[], siteId: string, date: string) => marksFor(marks, siteId).filter(mark => covers(mark, date));

/** Closed days need no guards, so nobody is counted absent. */
export const isClosed = (marks: readonly SiteCalendarMark[], siteId: string, date: string) => marksOn(marks, siteId, date).some(mark => mark.type === "closure");

export function markLabel(mark: SiteCalendarMark) {
  if (mark.type === "holiday" && mark.payMultiplier && mark.payMultiplier !== 1) return `${mark.title} · ×${mark.payMultiplier} pay`;
  if (mark.type === "event" && mark.extraGuards) return `${mark.title} · +${mark.extraGuards} guards${mark.from && mark.to ? ` ${mark.from}–${mark.to}` : ""}`;
  return mark.title;
}
