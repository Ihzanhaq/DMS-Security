"use client";

import { createContext, useContext, useMemo } from "react";
import { siteCalendarMarks } from "@/lib/mock-data";
import type { SiteCalendarMark } from "@/types/domain";
import { usePersistedState } from "./use-persisted-state";

type SiteCalendarValue = {
  marks: SiteCalendarMark[];
  saveMark: (mark: SiteCalendarMark) => void;
  removeMark: (id: string) => void;
};

const SiteCalendarContext = createContext<SiteCalendarValue | null>(null);

/** Holidays, closures, events and notes shown on site attendance calendars. */
export function SiteCalendarProvider({ children }: { children: React.ReactNode }) {
  const [marks, setMarks] = usePersistedState<SiteCalendarMark[]>("bmg-site-calendar-v1", siteCalendarMarks);
  const value = useMemo<SiteCalendarValue>(() => ({
    marks,
    saveMark: mark => setMarks(current => current.some(item => item.id === mark.id) ? current.map(item => item.id === mark.id ? mark : item) : [...current, mark]),
    removeMark: id => setMarks(current => current.filter(item => item.id !== id)),
  }), [marks, setMarks]);
  return <SiteCalendarContext.Provider value={value}>{children}</SiteCalendarContext.Provider>;
}

export function useSiteCalendar() {
  const value = useContext(SiteCalendarContext);
  if (!value) throw new Error("useSiteCalendar must be used inside SiteCalendarProvider");
  return value;
}
