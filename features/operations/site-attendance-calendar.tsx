"use client";

import { useMemo, useRef, useState } from "react";
import FullCalendar, { useCalendarController } from "@fullcalendar/react";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import interactionPlugin from "@fullcalendar/react/interaction";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { BackCrumb, Button, CallButton, DefRows, EmptyState, PageHeader, Panel, SegmentedControl, Sheet, StatusChip } from "@/components/ui-kit";
import { Building2, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useSiteCalendar } from "@/components/shared/site-calendar-context";
import { isClosed, markColor, markLabel, markTypeLabel, marksFor } from "@/lib/site-calendar";
import { SiteCalendarMarkSheet } from "./site-calendar-mark-sheet";
import { cn } from "@/lib/utils";
import { employees, sites } from "@/lib/mock-data";
import { NAV } from "@/lib/labels";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { NOW_MINUTES, addDays, clock, duration, nowAbs, shiftStateLabel, siteShifts, type ShiftState, type SiteShift } from "@/lib/site-attendance";
import type { CalendarMarkType, Site, SiteCalendarMark } from "@/types/domain";

/** Event colours per attendance outcome, matching the app's status tokens. */
const stateColor: Record<ShiftState, string> = {
  "on-time": "#00be73",
  late: "#f59e0b",
  "left-early": "#f59e0b",
  reliever: "#0ea5e9",
  absent: "#ef4444",
  "on-duty": "#059669",
  scheduled: "#94a3b8",
};

const chipTone: Record<ShiftState, "success" | "warning" | "danger" | "neutral" | "info"> = {
  "on-time": "success", late: "warning", "left-early": "warning", reliever: "info", absent: "danger", "on-duty": "success", scheduled: "neutral",
};

const iso = (abs: number) => new Date(abs * 60000).toISOString();
const NOW = `${APP_TODAY}T${clock(NOW_MINUTES)}:00Z`;

/** Actual punch times when present, otherwise the scheduled window. */
function punchText(shift: SiteShift) {
  if (shift.state === "absent") return "Absent";
  if (shift.state === "on-duty") return `${clock(shift.actualStart ?? shift.plannedStart)} – now`;
  return `${clock(shift.actualStart ?? shift.plannedStart)} – ${clock(shift.actualEnd ?? shift.plannedEnd)}`;
}

type CalendarView = "listWeek" | "dayGridMonth" | "timeGridWeek" | "timeGridDay";

const viewOptions = [
  { id: "listWeek", label: "List" },
  { id: "dayGridMonth", label: "Month" },
  { id: "timeGridWeek", label: "Week" },
  { id: "timeGridDay", label: "Day" },
] as const;

/** Minimum content width per view. Wider than the screen means the calendar scrolls sideways instead of squeezing columns. */
const viewMinWidth: Record<CalendarView, string | undefined> = {
  listWeek: undefined,
  dayGridMonth: "min-w-[1720px]",
  timeGridWeek: "min-w-[3210px]",
  timeGridDay: undefined,
};

type MarkDraft = Partial<SiteCalendarMark> & { start: string; end: string };

export function SiteAttendanceCalendar({ site }: { site: Site }) {
  const [selected, setSelected] = useState<SiteShift | null>(null);
  const [draft, setDraft] = useState<MarkDraft | null>(null);
  const { marks } = useSiteCalendar();
  const controller = useCalendarController();
  const scrollRef = useRef<HTMLDivElement>(null);
  const view = (controller.view?.type ?? "listWeek") as CalendarView;

  const siteMarks = useMemo(() => marksFor(marks, site.name), [marks, site.name]);

  // Closed days need no guards, so their shifts (and absences) are dropped.
  const shiftEvents = useMemo(() => siteShifts(site, addDays(APP_TODAY, -60), addDays(APP_TODAY, 30)).filter(shift => !isClosed(siteMarks, site.name, iso(shift.plannedStart).slice(0, 10))).map(shift => {
    // Blocks stay inside the scheduled window so shift handovers don't stack; late starts and early exits still shorten them.
    const start = Math.max(shift.actualStart ?? shift.plannedStart, shift.plannedStart);
    const end = shift.state === "on-duty" ? nowAbs() : Math.min(shift.actualEnd ?? shift.plannedEnd, shift.plannedEnd);
    return {
      id: shift.id,
      title: shift.name,
      start: iso(start),
      end: iso(end),
      color: stateColor[shift.state],
      extendedProps: { shift },
    };
  }), [site, siteMarks]);

  // Each mark is a tinted day background plus a labelled all-day event; FullCalendar all-day ends are exclusive.
  const markEvents = useMemo(() => siteMarks.flatMap(mark => [
    { id: `${mark.id}-bg`, start: mark.start, end: addDays(mark.end, 1), allDay: true, display: "background", color: markColor[mark.type] },
    { id: mark.id, title: markLabel(mark), start: mark.start, end: addDays(mark.end, 1), allDay: true, color: markColor[mark.type], extendedProps: { mark } },
  ]), [siteMarks]);
  const events = useMemo(() => [...markEvents, ...shiftEvents], [markEvents, shiftEvents]);

  return <>
  <Panel>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => controller.today()}>Today</Button>
      <div className="flex items-center">
        <Button variant="ghost" size="icon" aria-label="Previous" onClick={() => controller.prev()}><ChevronLeft /></Button>
        <Button variant="ghost" size="icon" aria-label="Next" onClick={() => controller.next()}><ChevronRight /></Button>
      </div>
      <strong className="text-base font-semibold">{controller.view?.title}</strong>
      <Button variant="outline" size="sm" className="ml-auto" onClick={() => setDraft({ start: APP_TODAY, end: APP_TODAY })}><CalendarPlus />Add holiday or event</Button>
      <SegmentedControl className="mb-0" options={viewOptions} value={view} onChange={next => controller.changeView(next)} />
    </div>
    <div ref={scrollRef} className="sms-calendar max-h-[70vh] min-h-[320px] overflow-auto rounded-xl border border-border">
      <div className={cn(viewMinWidth[view])}>
      <FullCalendar
        controller={controller}
        plugins={[classicThemePlugin, listPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
        selectable
        select={info => setDraft({ start: info.startStr.slice(0, 10), end: info.allDay ? addDays(info.endStr.slice(0, 10), -1) : info.startStr.slice(0, 10) })}
        initialView="listWeek"
        initialDate={APP_TODAY}
        now={NOW}
        timeZone="UTC"
        firstDay={1}
        height="auto"
        views={{
          dayGridMonth: { dayMaxEvents: false },
          timeGridWeek: { slotMinHeight: 64, titleFormat: { month: "short", day: "numeric", year: "numeric" } },
          timeGridDay: { slotMinHeight: 64 },
        }}
        headerToolbar={false}
        datesSet={info => {
          const el = scrollRef.current;
          if (!el) return;
          el.scrollLeft = 0;
          // Time grids start at 06:00 rather than midnight.
          el.scrollTop = info.view.type.startsWith("timeGrid") ? el.scrollHeight * 0.25 : 0;
        }}
        navLinks
        nowIndicator
        allDaySlot
        displayEventEnd
        nextDayThreshold="12:00:00"
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotHeaderFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        events={events}
        eventContent={arg => {
          const mark = arg.event.extendedProps.mark as SiteCalendarMark | undefined;
          if (arg.event.display === "background") return null;
          if (mark) {
            return <span className="flex min-w-0 items-center gap-1.5 px-1 text-[11px] font-semibold leading-tight text-white">
              <span className="truncate">{arg.view.type.startsWith("list") ? <span className="text-foreground">{markTypeLabel[mark.type]} · {markLabel(mark)}</span> : markLabel(mark)}</span>
            </span>;
          }
          const shift = arg.event.extendedProps.shift as SiteShift;
          if (arg.view.type.startsWith("list")) {
            return <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="w-28 shrink-0 tabular-nums text-muted">{punchText(shift)}</span>
              <strong className="font-semibold">{shift.name}</strong>
              <span className="text-xs text-muted">{shift.post}{shift.coveringFor ? ` · covering for ${shift.coveringFor}` : ""}</span>
              <StatusChip tone={chipTone[shift.state]}>{shiftStateLabel[shift.state]}</StatusChip>
            </span>;
          }
          if (arg.view.type === "dayGridMonth") {
            return <span className="flex min-w-0 items-center gap-1.5 px-1 text-[11px] leading-tight">
              <span className="size-2 shrink-0 rounded-full" style={{ background: stateColor[shift.state] }} />
              <span className="shrink-0 tabular-nums opacity-80">{punchText(shift)}</span>
              <strong className="truncate">{shift.name}</strong>
            </span>;
          }
          return <span className="sms-event-label block px-1 py-0.5 text-xs leading-snug">
            <strong className="block truncate">{shift.name}</strong>
            <span className="block truncate tabular-nums opacity-90">{punchText(shift)}</span>
            <span className="block truncate opacity-80">{shift.post}</span>
            <span className="block truncate opacity-80">{shiftStateLabel[shift.state]}{shift.coveringFor ? ` · for ${shift.coveringFor}` : ""}</span>
          </span>;
        }}
        eventClass={arg => {
          if (arg.event.extendedProps.mark || arg.event.display === "background") return "sms-event-mark";
          const state = (arg.event.extendedProps.shift as SiteShift).state;
          return cn(arg.view.type.startsWith("timeGrid") && "sms-event-pinned", state === "scheduled" ? "sms-event-scheduled" : state === "absent" && "sms-event-absent");
        }}
        eventClick={info => {
          const mark = info.event.extendedProps.mark as SiteCalendarMark | undefined;
          if (mark) setDraft(mark); else setSelected(info.event.extendedProps.shift as SiteShift);
        }}
      />
      </div>
    </div>

    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {(Object.keys(stateColor) as ShiftState[]).filter(state => state !== "left-early").map(state => (
        <span key={state} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: stateColor[state] }} />
          {state === "late" ? "Late or left early" : shiftStateLabel[state]}
        </span>
      ))}
      <span className="hidden h-3 w-px bg-border sm:inline-block" />
      {(Object.keys(markColor) as CalendarMarkType[]).map(type => (
        <span key={type} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: markColor[type] }} />
          {markTypeLabel[type]}
        </span>
      ))}
      <span className="w-full sm:w-auto sm:ml-auto">Drag across days in Month or Week view to add a holiday, closure or event.</span>
    </div>

  </Panel>
    {draft && <SiteCalendarMarkSheet key={draft.id ?? `${draft.start}-${draft.end}`} siteName={site.name} mark={draft} onClose={() => setDraft(null)} />}
    <Sheet open={!!selected} title={selected?.name ?? ""} subtitle={selected ? `${selected.empId} · ${selected.role}` : undefined} onClose={() => setSelected(null)}>
      {selected && (() => {
        const worked = selected.actualStart !== undefined ? (selected.actualEnd ?? nowAbs()) - selected.actualStart : 0;
        const phone = employees.find(item => item.id === selected.empId)?.phone;
        return <div className="space-y-4">
          <StatusChip tone={chipTone[selected.state]}>{shiftStateLabel[selected.state]}</StatusChip>
          <DefRows rows={[
            { label: "Date", value: formatAppDate(iso(selected.plannedStart).slice(0, 10)) },
            { label: "Post", value: selected.post },
            ...(phone ? [{ label: "Phone", value: <span className="inline-flex items-center gap-2">{phone}<CallButton phone={phone} name={selected.name} /></span>, mono: true }] : []),
            ...(selected.coveringFor ? [{ label: "Covering for", value: selected.coveringFor }] : []),
            { label: "Scheduled", value: `${clock(selected.plannedStart)} – ${clock(selected.plannedEnd)}`, mono: true },
            { label: "Punch-in", value: selected.actualStart !== undefined ? clock(selected.actualStart) : "—", mono: true },
            { label: "Punch-out", value: selected.actualEnd !== undefined ? clock(selected.actualEnd) : selected.state === "on-duty" ? "Still on duty" : "—", mono: true },
            { label: "Time on site", value: worked ? duration(worked) : "—", total: true },
          ]} />
        </div>;
      })()}
    </Sheet>
  </>;
}

/** Full page: attendance calendar for one site, opened from site details. */
export function SiteAttendanceScreen({ siteName, onBack, onBackToSites }: { siteName: string | null; onBack: () => void; onBackToSites: () => void }) {
  const site = siteName ? sites.find(item => item.name === siteName) : undefined;
  if (!site) {
    return <>
      <BackCrumb backLabel={NAV.sites} onBack={onBackToSites} current="Attendance calendar" />
      <EmptyState icon={Building2} message="This site could not be found." actionLabel="Back to sites" onAction={onBackToSites} />
    </>;
  }
  return <>
    <BackCrumb backLabel={site.name} onBack={onBack} current="Attendance calendar" />
    <PageHeader title="Attendance calendar" subtitle={`${site.name} · Who was on site each day, and from when to when. Select a shift for punch details, or mark holidays, closures and events.`} />
    <SiteAttendanceCalendar site={site} />
  </>;
}
