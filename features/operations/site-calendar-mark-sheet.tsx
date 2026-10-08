"use client";

import { useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button, Field, FormGrid, FormStack, InlineAlert, Input, SegmentedControl, Select, Sheet, Textarea, ToggleRow, useConfirm } from "@/components/ui-kit";
import { useSiteCalendar } from "@/components/shared/site-calendar-context";
import { useToast } from "@/components/shared/toast-context";
import { markTypeLabel } from "@/lib/site-calendar";
import type { CalendarMarkType, SiteCalendarMark } from "@/types/domain";

const titlePlaceholder: Record<CalendarMarkType, string> = {
  holiday: "e.g. Vishu", closure: "e.g. Annual maintenance shutdown", event: "e.g. Christmas sale weekend", note: "e.g. Client audit visit",
};

/** Add or edit a holiday, closure, event or note on a site's calendar. */
export function SiteCalendarMarkSheet({ siteName, mark, onClose }: { siteName: string; mark: Partial<SiteCalendarMark> & { start: string; end: string }; onClose: () => void }) {
  const { saveMark, removeMark } = useSiteCalendar();
  const notify = useToast();
  const confirm = useConfirm();
  const editing = Boolean(mark.id);
  const [type, setType] = useState<CalendarMarkType>(mark.type ?? "holiday");
  const [title, setTitle] = useState(mark.title ?? "");
  const [start, setStart] = useState(mark.start);
  const [end, setEnd] = useState(mark.end);
  const [allSites, setAllSites] = useState(mark.siteId === "all");
  const [payMultiplier, setPayMultiplier] = useState(String(mark.payMultiplier ?? 2));
  const [extraGuards, setExtraGuards] = useState(String(mark.extraGuards ?? 2));
  const [from, setFrom] = useState(mark.from ?? "18:00");
  const [to, setTo] = useState(mark.to ?? "23:00");
  const [notes, setNotes] = useState(mark.notes ?? "");
  const rangeError = end < start ? "End date can't be before the start date." : null;
  const valid = title.trim() && start && end && !rangeError && (type !== "event" || Number(extraGuards) >= 1);

  const save = () => {
    saveMark({
      id: mark.id ?? `CM-${Date.now().toString(36)}`,
      siteId: type === "holiday" && allSites ? "all" : siteName,
      type, title: title.trim(), start, end,
      payMultiplier: type === "holiday" ? Number(payMultiplier) : undefined,
      extraGuards: type === "event" ? Number(extraGuards) : undefined,
      from: type === "event" ? from : undefined,
      to: type === "event" ? to : undefined,
      notes: notes.trim() || undefined,
    });
    notify(`${markTypeLabel[type]} ${editing ? "updated" : "added"}${type === "holiday" && allSites ? " for all sites" : ""}`);
    onClose();
  };
  const remove = async () => {
    if (!mark.id) return;
    const shared = mark.siteId === "all";
    if (!await confirm({ title: `Delete “${mark.title}”?`, description: shared ? "This holiday is removed from every site's calendar." : "It is removed from this site's calendar.", confirmLabel: "Delete" })) return;
    removeMark(mark.id);
    notify("Removed from the calendar");
    onClose();
  };

  return <Sheet open title={editing ? `Edit ${markTypeLabel[mark.type ?? type].toLowerCase()}` : "Add to calendar"} subtitle={siteName} onClose={onClose}
    footer={<>
      {editing && <Button variant="outline" className="mr-auto text-status-danger" onClick={remove}><Trash2 />Delete</Button>}
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={save} disabled={!valid}><CheckCircle2 />{editing ? "Save" : "Add"}</Button>
    </>}>
    <FormStack>
      <SegmentedControl className="mb-0" value={type} onChange={setType} options={(Object.keys(markTypeLabel) as CalendarMarkType[]).map(id => ({ id, label: id === "closure" ? "Closure" : markTypeLabel[id] }))} />
      <Field label="Title" required><Input value={title} onChange={event => setTitle(event.target.value)} placeholder={titlePlaceholder[type]} /></Field>
      <FormGrid>
        <Field label="From" required><Input type="date" value={start} onChange={event => { setStart(event.target.value); if (event.target.value > end) setEnd(event.target.value); }} /></Field>
        <Field label="To" required><Input type="date" value={end} min={start} onChange={event => setEnd(event.target.value)} /></Field>
      </FormGrid>
      {rangeError && <InlineAlert tone="danger">{rangeError}</InlineAlert>}
      {type === "holiday" && <>
        <Field label="Pay for guards on duty" hint="Shown on the calendar. Payroll rules are set in Settings.">
          <Select value={payMultiplier} onChange={event => setPayMultiplier(event.target.value)}>
            <option value="1">Normal pay</option><option value="1.5">×1.5 pay</option><option value="2">×2 pay</option>
          </Select>
        </Field>
        <ToggleRow title="Apply to all sites" description="A company holiday shows on every site's calendar." checked={allSites} onChange={setAllSites} />
      </>}
      {type === "closure" && <InlineAlert>No guards are needed on these days, so nobody is marked absent.</InlineAlert>}
      {type === "event" && <FormGrid>
        <Field label="Extra guards needed" required><Input type="number" min={1} value={extraGuards} onChange={event => setExtraGuards(event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="time" value={from} onChange={event => setFrom(event.target.value)} /></Field>
          <Field label="To"><Input type="time" value={to} onChange={event => setTo(event.target.value)} /></Field>
        </div>
      </FormGrid>}
      <Field label="Notes"><Textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Anything the site team should know" /></Field>
    </FormStack>
  </Sheet>;
}
