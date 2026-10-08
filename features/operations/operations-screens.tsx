"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  AlertTriangle, Building2, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronRight, Clock, Download, FileText, MapPin,
  Crosshair, Navigation, Phone, Plus, Settings, Timer, Trash2, UserCheck, Users,
} from "lucide-react";
import { attendanceRows, employees, foTasks, inspections, rotationSplit, siteDocuments, siteFeedback, sites, sopDocuments } from "@/lib/mock-data";
import { GeoMap } from "@/components/shared/geo-map";
import type { DutyChangeReason, DutyChangeRequest, DutyChangeType, FoTask, NightCheck, Rating } from "@/types/domain";
import { useOps } from "@/components/shared/ops-context";
import { averageRating } from "@/lib/ratings";
import {
  BackCrumb, Button, CallButton, DataTable, DefRows, DetailDrawer, EmptyState, Field, FilterChips, FormGrid, FormStack, IconTile, InlineAlert, Input, InputAffix, KeyValue,
  ListFilterRow, ListRow, PageHeader, Panel, PersonCell, ProgressBar, SearchBar, Section, SegmentedControl,
  Select, Sheet, SplitLayout, StatStrip, StatusChip, Textarea, Timeline, useConfirm, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { downloadCsv } from "@/lib/download";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { NAV, ROLE_TERMS } from "@/lib/labels";
import type { NavClickMeta } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

/** Phone on file for an employee id, when the id resolves. */
const phoneOf = (employeeId: string) => employees.find(item => item.id === employeeId)?.phone;

const siteDistrict = (siteName: string) => sites.find(site => site.name === siteName)?.district ?? "";

const siteRating = (ratings: Rating[], siteName: string) => {
  const average = averageRating(ratings, "site", siteName);
  return average !== null ? `${average}/10` : "Not rated";
};

const sopBelongsToSite = (sopSite: string, siteName: string) =>
  sopSite === siteName || sopSite.startsWith(`${siteName} ·`) || sopSite.startsWith(`${siteName},`);

/* ---------------------------------- Sites --------------------------------- */

export function SitesScreen({ onCreate, onViewDetails, onConfigure, onEditBoundary, onNavigate }: {
  onCreate: () => void;
  onNavigate?: (view: string, meta?: string | NavClickMeta) => void;
  onViewDetails: (site: string) => void;
  onConfigure: (site: string) => void;
  onEditBoundary: (site: string) => void;
}) {
  const { ratings } = useOps();
  const [district, setDistrict] = useState("all");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"cards" | "list">("cards");
  const [understaffed, setUnderstaffed] = useState(false);
  const districts = useMemo(() => Array.from(new Set(sites.map(site => site.district))), []);
  const q = query.trim().toLowerCase();
  const clearFilters = () => { setDistrict("all"); setQuery(""); setUnderstaffed(false); };
  const visible = sites.filter(site => (district === "all" || site.district === district) && (!understaffed || site.coverage < 100)
    && (!q || site.name.toLowerCase().includes(q) || site.client.toLowerCase().includes(q)));
  const openDetails = (siteName: string) => onViewDetails(siteName);
  const stop = (event: MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };
  return <>
    <PageHeader title={NAV.sites} subtitle="Client locations, staffing, benefit rules and attendance boundaries." actions={<Button onClick={onCreate}><Plus />Add site</Button>} />
    <StatStrip items={[
      { icon: Building2, value: "214", label: "Active sites", note: "483 configured posts", onClick: clearFilters, actionLabel: "Show all sites" },
      { icon: Users, value: "435", label: "Required posts", note: "408 staffed", tone: "green", onClick: () => onNavigate?.("deployment"), actionLabel: "Open deployment" },
      { icon: AlertTriangle, value: "27", label: "Vacant posts", note: "Across 16 sites", tone: "orange", onClick: () => setUnderstaffed(current => !current), actionLabel: "Show understaffed sites", active: understaffed },
      { icon: MapPin, value: "206", label: "Boundaries set", note: "8 need coordinates", onClick: () => onNavigate?.("attendance"), actionLabel: "Open attendance punches" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by site or client" />
    <ListFilterRow>
      <FilterChips options={[{ id: "all", label: "All districts" }, ...districts.map(item => ({ id: item, label: item }))]} value={district} onChange={setDistrict} />
      <div className="flex flex-wrap items-center gap-2">
        {understaffed && <Button variant="ghost" size="sm" onClick={() => setUnderstaffed(false)}>Show all staffing</Button>}
        <SegmentedControl options={[{ id: "cards", label: "Cards" }, { id: "list", label: "List" }] as const} value={layout} onChange={setLayout} />
        <span className="text-xs text-muted">{visible.length} sites</span>
      </div>
    </ListFilterRow>
    {visible.length === 0 && <EmptyState icon={Building2} message="No sites match these filters." actionLabel="Clear filters" onAction={clearFilters} />}
    {layout === "cards" ? (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(site => (
          <article
            key={site.name}
            className="flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-emerald/35 hover:bg-surface/60"
            data-enter
            role="button"
            tabIndex={0}
            onClick={() => openDetails(site.name)}
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(site.name); } }}
          >
            <div className="mb-3 flex items-start gap-3">
              <IconTile icon={Building2} />
              <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{site.name}</h3><p className="text-xs text-muted">{site.client} · {site.district}</p></div>
              <StatusChip tone={site.coverage === 100 ? "success" : "warning"}>{site.coverage}% staffed</StatusChip>
            </div>
            <KeyValue label="Posts staffed" value={`${site.staffed} of ${site.posts}`} />
            <KeyValue label="Benefits" value={site.scheme} />
            <KeyValue label="Attendance boundary" value={site.polygon ? `${site.polygon.length}-corner area` : `${site.radius} m radius`} />
            <KeyValue label="Client rating" value={siteRating(ratings, site.name)} />
            <div className="my-3"><ProgressBar value={site.coverage} tone={site.coverage === 100 ? "emerald" : "warn"} /></div>
            <div className="mt-auto flex flex-col gap-2" onClick={event => event.stopPropagation()}>
              <Button size="sm" onClick={() => openDetails(site.name)}>View details</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={event => stop(event, () => onEditBoundary(site.name))}><MapPin />Boundary</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={event => stop(event, () => onConfigure(site.name))}>Manage</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <Panel flush>
        <DataTable
          rows={visible}
          rowKey={site => site.name}
          onRowClick={site => openDetails(site.name)}
          empty={<div className="p-4"><EmptyState icon={Building2} message="No sites match these filters." actionLabel="Clear filters" onAction={clearFilters} /></div>}
          columns={[
            {
              header: "Site",
              cell: site => (
                <span className="inline-flex items-center gap-2">
                  <IconTile icon={Building2} />
                  <span>
                    <span className="block text-sm font-medium">{site.name}</span>
                    <small className="text-xs text-muted">{site.client}</small>
                  </span>
                </span>
              ),
            },
            { header: "District", cell: site => site.district, hideOnMobile: true },
            { header: "Posts", cell: site => `${site.staffed} / ${site.posts}`, hideOnMobile: true },
            { header: "Benefits", cell: site => site.scheme, hideOnMobile: true },
            { header: "Rating", cell: site => siteRating(ratings, site.name), hideOnMobile: true },
            { header: "Staffing", align: "right", cell: site => <StatusChip tone={site.coverage === 100 ? "success" : "warning"}>{site.coverage}%</StatusChip> },
          ]}
        />
      </Panel>
    )}
  </>;
}

/* ------------------------------ Site detail ------------------------------- */

export function SiteDetailScreen({
  siteName,
  onBack,
  onConfigure,
  onManageDocuments,
  onEditBoundary,
  onCreateSop,
  onOpenCalendar,
  onNavigate,
}: {
  siteName: string | null;
  onBack: () => void;
  onConfigure: () => void;
  onManageDocuments: () => void;
  onEditBoundary: () => void;
  onCreateSop: () => void;
  onOpenCalendar?: () => void;
  onNavigate?: (view: string, meta?: string | NavClickMeta) => void;
}) {
  const notify = useToast();
  const { ratings } = useOps();
  const confirm = useConfirm();
  const site = siteName ? sites.find(item => item.name === siteName) : undefined;
  const [openSop, setOpenSop] = useState<(typeof sopDocuments)[number] | null>(null);
  const siteDocs = siteName ? siteDocuments.filter(doc => doc.site === siteName) : [];
  const feedback = siteName ? siteFeedback.filter(item => item.site === siteName) : [];
  const siteSops = siteName ? sopDocuments.filter(doc => sopBelongsToSite(doc.site, siteName)) : [];

  const publish = async (doc: (typeof sopDocuments)[number]) => {
    if (!await confirm({
      title: `Send ${doc.title} to guards?`,
      description: `Every guard posted at ${doc.site} receives an acknowledgement task for version ${doc.version}.`,
      confirmLabel: "Send to guards",
    })) return;
    notify("SOP sent to guards");
    setOpenSop(null);
  };

  if (!site || !siteName) {
    return <>
      <BackCrumb backLabel={NAV.sites} onBack={onBack} current="Site details" />
      <EmptyState icon={Building2} message="This site could not be found." actionLabel="Back to sites" onAction={onBack} />
    </>;
  }

  return <>
    <BackCrumb backLabel={NAV.sites} onBack={onBack} current={site.name} />
    <PageHeader
      title={site.name}
      subtitle={`${site.client} · ${site.district}`}
      actions={<>
        {onOpenCalendar && <Button variant="outline" onClick={onOpenCalendar}><CalendarDays />Attendance calendar</Button>}
        <Button variant="outline" onClick={onEditBoundary}><MapPin />Edit boundary</Button>
        <Button onClick={onConfigure}>Manage site</Button>
      </>}
    />
    <StatStrip items={[
      { icon: Users, value: `${site.staffed}/${site.posts}`, label: "Posts staffed", note: `${site.coverage}% coverage`, tone: site.coverage === 100 ? "green" : "orange", onClick: () => onNavigate?.("deployment", { site: site.name }), actionLabel: "Open deployment" },
      { icon: Building2, value: site.scheme, label: "Benefit scheme", onClick: onConfigure, actionLabel: "Manage site benefits" },
      { icon: MapPin, value: site.polygon ? `${site.polygon.length}-corner area` : `${site.radius} m radius`, label: "Attendance boundary", onClick: onEditBoundary, actionLabel: "Edit boundary" },
      { icon: CheckCircle2, value: siteRating(ratings, site.name), label: "Client rating", onClick: () => onNavigate?.("complaints", { site: site.name }), actionLabel: "Open client complaints" },
    ]} />
    <SplitLayout>
      <Panel title="Site profile">
        <DefRows rows={[
          { label: "Client", value: site.client },
          { label: "District", value: site.district },
          { label: "Required posts", value: site.posts },
          { label: "Staffed", value: `${site.staffed} (${site.coverage}%)` },
          { label: "Benefit scheme", value: site.scheme },
        ]} />
      </Panel>
      <Panel title="Attendance rules" action={<Button variant="outline" size="sm" onClick={onEditBoundary}><Settings />Edit rules</Button>}>
        <DefRows rows={[
          { label: "Late-arrival grace", value: `${site.graceMins} min` },
          { label: "Day presence check", value: `Every ${site.dayCheckIntervalMins} min` },
          { label: "Night presence check", value: `Every ${site.nightCheckIntervalMins} min` },
          { label: "Day patrol", value: `${site.patrol.day.rounds} rounds · every ${site.patrol.day.intervalMins} min` },
          { label: "Night patrol", value: `${site.patrol.night.rounds} rounds · every ${site.patrol.night.intervalMins} min` },
          { label: "Centre", value: `${site.lat.toFixed(5)}, ${site.lng.toFixed(5)}`, mono: true },
          { label: "Boundary", value: site.polygon ? `${site.polygon.length}-corner polygon` : `${site.radius} m radius` },
        ]} />
      </Panel>
    </SplitLayout>
    <Panel title="Attendance boundary" description="Guards must punch inside this area."
      action={<Button variant="outline" size="sm" onClick={onEditBoundary}><MapPin />Edit</Button>}>
      <GeoMap center={{ lat: site.lat, lng: site.lng }} radius={site.radius} polygon={site.polygon} />
    </Panel>
    <SplitLayout>
      <Panel title="Field officers" description="Ordered assignment. FO 1 is notified first.">
        {site.fieldOfficers.length === 0
          ? <EmptyState icon={Users} message="No field officers assigned." actionLabel="Manage site" onAction={onConfigure} />
          : <DefRows rows={site.fieldOfficers.map((name, index) => ({ label: `FO ${index + 1}`, value: name }))} />}
      </Panel>
      <Panel title="Escalation contacts" description="Shown to guards in the mobile app.">
        {site.escalationContacts.length === 0
          ? <EmptyState icon={Phone} message="No escalation contacts yet." actionLabel="Manage site" onAction={onConfigure} />
          : <DefRows rows={site.escalationContacts.map(contact => ({
            label: contact.label,
            value: <span className="inline-flex items-center gap-2">{contact.name} · <span className="tabular-nums">{contact.phone}</span><CallButton phone={contact.phone} name={contact.name} /></span>,
          }))} />}
      </Panel>
    </SplitLayout>
    <SplitLayout>
      <Panel title="Site documents" description="Agreements, PCC/biodata rules and check data."
        action={<Button variant="outline" size="sm" onClick={onManageDocuments}>Manage documents</Button>}>
        {siteDocs.length === 0
          ? <p className="text-sm text-muted">No documents on file.</p>
          : <DefRows rows={siteDocs.map(doc => ({
            label: doc.title,
            value: doc.file
              ? `v${doc.version} · ${formatAppDate(doc.updatedOn)} · ${doc.file.name}`
              : `v${doc.version} · ${formatAppDate(doc.updatedOn)} · No file attached`,
          }))} />}
      </Panel>
      <Panel title="Client feedback">
        {feedback.length === 0
          ? <p className="text-sm text-muted">No feedback recorded.</p>
          : <div className="space-y-2">{feedback.map(item => (
            <div key={item.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex justify-between"><strong>{item.satisfaction}/10</strong><span className="text-xs text-muted">{formatAppDate(item.date)}</span></div>
              <p className="mt-1 text-muted">{item.note}</p>
            </div>))}</div>}
      </Panel>
    </SplitLayout>
    <Panel
      title={NAV.sops}
      description="Versioned post instructions guards must read and acknowledge for this site."
      action={<Button onClick={onCreateSop}><Plus />New SOP</Button>}
    >
      {siteSops.length === 0 && (
        <EmptyState icon={FileText} message="No SOPs for this site yet." actionLabel="New SOP" onAction={onCreateSop} />
      )}
      {siteSops.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {siteSops.map(doc => (
            <article key={doc.title} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm" data-enter>
              <div className="mb-3 flex items-start justify-between gap-2">
                <IconTile icon={FileText} />
                <StatusChip tone={doc.state === "Complete" ? "success" : "warning"}>
                  {doc.state === "Complete" ? "All acknowledged" : "Acknowledgements pending"}
                </StatusChip>
              </div>
              <h3 className="text-sm font-semibold">{doc.title}</h3>
              <p className="mt-1 text-xs text-muted">{doc.category}</p>
              <div className="mt-3 flex justify-between text-xs">
                <span className="text-muted">Version {doc.version}</span>
                <span><span className="text-muted">Acknowledged </span><strong>{doc.ack}</strong></span>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => setOpenSop(doc)}>View SOP</Button>
            </article>
          ))}
        </div>
      )}
    </Panel>
    {openSop && (
      <DetailDrawer
        title={openSop.title}
        subtitle={`Version ${openSop.version} · effective ${openSop.effective} · ${openSop.ack} acknowledged`}
        onClose={() => setOpenSop(null)}
        footer={<>
          <Button variant="outline" onClick={() => setOpenSop(null)}>Close</Button>
          <Button onClick={() => publish(openSop)}>Send to guards</Button>
        </>}
      >
        {openSop.sections.map(section => (
          <Section key={section.heading} title={section.heading}>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">{section.steps.map(step => <li key={step}>{step}</li>)}</ol>
          </Section>
        ))}
      </DetailDrawer>
    )}
  </>;
}

/* ---------------------------- Deployment rotation --------------------------- */

const monthOptions = [
  { label: "September 2026 · 30 days", year: 2026, month: 8 },
  { label: "August 2026 · 31 days", year: 2026, month: 7 },
  { label: "October 2026 · 31 days", year: 2026, month: 9 },
];

export function RotationDrawer({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const choice = monthOptions[index];
  // The extra duty in a 31-day month alternates, so the lead flips each month.
  const split = rotationSplit(choice.year, choice.month, index % 2 === 0);

  return <DetailDrawer title="24-hour pair rotation" subtitle="Suresh Babu and Rajeev Kumar · one duty per day" onClose={onClose}
    footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
    <Select className="mb-4" value={index} onChange={event => setIndex(Number(event.target.value))} aria-label="Month">
      {monthOptions.map((item, position) => <option key={item.label} value={position}>{item.label}</option>)}
    </Select>
    <div className="mb-3 flex gap-4 text-xs">
      <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-navy" />Suresh Babu</span>
      <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald" />Rajeev Kumar</span>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {split.pattern.map((owner, position) => (
        <span key={position} className={cn("flex flex-col items-center rounded-lg py-1.5 text-xs text-white", owner === "a" ? "bg-navy" : "bg-emerald")}>
          <span className="tabular-nums">{position + 1}</span><b className="text-[10px]">{owner === "a" ? "SB" : "RK"}</b>
        </span>
      ))}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-surface p-3 text-center"><span className="text-xs text-muted">Suresh Babu</span><strong className="block text-2xl font-bold">{split.lead}</strong></div>
      <div className="rounded-xl bg-surface p-3 text-center"><span className="text-xs text-muted">Rajeev Kumar</span><strong className="block text-2xl font-bold">{split.partner}</strong></div>
    </div>
    <InlineAlert className="mt-4">
      {split.days === 30 ? "A 30-day month divides evenly at 15 duties each." : `A ${split.days}-day month divides ${split.lead} and ${split.partner}. The extra duty passes to the other guard next month.`}
    </InlineAlert>
  </DetailDrawer>;
}

/* ------------------------------- Duty changes ------------------------------ */

const dutyTypeLabel = (row: DutyChangeRequest) => row.type === "ot" ? `Extra duty · ${row.hours} h` : row.type === "swap" ? "Shift swap" : "Replacement";
const requestTone = (status: string): StatusTone => status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type DutyFilter = "pending" | "all" | "approved" | "ot" | "cover";

const blankDutyForm = { employeeId: "", type: "replacement" as DutyChangeType, reason: "sick" as DutyChangeReason, date: APP_TODAY, hours: 2, partnerId: "", note: "" };

/** Office-side entry, e.g. when a guard phones in sick. Saved as pending, then approved like any other request. */
function NewDutyChangeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useToast();
  const { addDutyRequest } = useOps();
  const [form, setForm] = useState(blankDutyForm);
  const set = (patch: Partial<typeof blankDutyForm>) => setForm(current => ({ ...current, ...patch }));
  const staff = employees.filter(item => item.site !== "Unassigned");
  const employee = employees.find(item => item.id === form.employeeId);
  const close = () => { setForm(blankDutyForm); onClose(); };
  const save = () => {
    if (!employee) { notify({ message: "Choose the employee first", kind: "error" }); return; }
    addDutyRequest({
      id: `DCR-${Date.now()}`, employeeId: employee.id, type: form.type, date: form.date, site: employee.site,
      reason: form.type === "ot" ? "other" : form.reason, hours: form.type === "ot" ? form.hours : undefined,
      partnerId: form.type === "swap" && form.partnerId ? form.partnerId : undefined, note: form.note, status: "pending", loggedBy: "office",
    });
    notify(`Duty change added for ${employee.name}`);
    close();
  };
  return <Sheet open={open} title="New duty change" subtitle="Log a request on a guard's behalf, for example a sick call." onClose={close}
    footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={save}><Check />Add request</Button></>}>
    <FormStack>
      <Field label="Employee">
        <Select value={form.employeeId} onChange={event => set({ employeeId: event.target.value })}>
          <option value="">Choose an employee…</option>
          {staff.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id} · {item.site}</option>)}
        </Select>
      </Field>
      <Field label="Type of change">
        <Select value={form.type} onChange={event => set({ type: event.target.value as DutyChangeType })}>
          <option value="replacement">Cover their duty (sick / accident)</option>
          <option value="swap">Swap shifts with another guard</option>
          <option value="ot">Record extra duty (OT)</option>
        </Select>
      </Field>
      <FormGrid>
        {form.type !== "ot" && <Field label="Reason">
          <Select value={form.reason} onChange={event => set({ reason: event.target.value as DutyChangeReason })}>
            <option value="sick">Sickness</option><option value="accident">Accident</option><option value="personal">Personal</option><option value="other">Other</option>
          </Select>
        </Field>}
        {form.type === "ot" && <Field label="Extra hours"><InputAffix suffix="hours" type="number" min={1} max={12} value={form.hours} onChange={event => set({ hours: Number(event.target.value) })} /></Field>}
        <Field label="Date"><Input type="date" value={form.date} onChange={event => set({ date: event.target.value })} /></Field>
      </FormGrid>
      {form.type === "swap" && <Field label="Swap with">
        <Select value={form.partnerId} onChange={event => set({ partnerId: event.target.value })}>
          <option value="">Any available reliever</option>
          {staff.filter(item => item.id !== form.employeeId).map(item => <option key={item.id} value={item.id}>{item.name} · {item.site}</option>)}
        </Select>
      </Field>}
      {employee && <p className="text-xs text-muted">Site: <b className="text-foreground">{employee.site}</b></p>}
      <Field label="Details"><Textarea rows={3} value={form.note} onChange={event => set({ note: event.target.value })} placeholder="What happened, and from when is cover needed?" /></Field>
    </FormStack>
  </Sheet>;
}

export function DutyChangesScreen({}: { onNavigate?: (view: string, meta?: string | NavClickMeta) => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const { dutyRequests: rows, decideDutyRequest } = useOps();
  const [filter, setFilter] = useState<DutyFilter>("pending");
  const [creating, setCreating] = useState(false);
  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const decide = async (row: DutyChangeRequest, status: "approved" | "rejected") => {
    const name = employeeOf(row.employeeId)?.name ?? row.employeeId;
    if (status === "rejected" && !await confirm({ title: `Reject ${name}'s request?`, description: `${dutyTypeLabel(row)} on ${formatAppDate(row.date)} will be declined and ${name} notified in the app.`, confirmLabel: "Reject request", destructive: true })) return;
    decideDutyRequest(row.id, status);
    notify(status === "approved"
      ? row.type === "replacement" ? "Replacement approved · reliever pool notified" : row.type === "ot" ? "Extra duty approved for payroll" : "Shift swap approved"
      : "Request rejected");
  };
  const pending = rows.filter(item => item.status === "pending");
  const visible = filter === "pending" ? pending
    : filter === "approved" ? rows.filter(item => item.status === "approved")
      : filter === "ot" ? rows.filter(item => item.type === "ot")
        : filter === "cover" ? rows.filter(item => item.reason === "sick" || item.reason === "accident") : rows;
  const toggle = (next: DutyFilter) => setFilter(filter === next ? "all" : next);
  return <>
    <PageHeader title={NAV.dutyChanges} subtitle="Shift swaps, replacement cover and extra duty (OT) from the guard app or logged by the office."
      actions={<Button onClick={() => setCreating(true)}><Plus />New duty change</Button>} />
    <NewDutyChangeSheet open={creating} onClose={() => setCreating(false)} />
    <StatStrip items={[
      { icon: Users, value: String(pending.length), label: "Awaiting decision", note: "From the guard app", tone: pending.length ? "orange" : "green", onClick: () => toggle("pending"), actionLabel: "Show requests awaiting decision", active: filter === "pending" },
      { icon: Check, value: String(rows.filter(item => item.status === "approved").length), label: "Approved", note: "This month", tone: "green", onClick: () => toggle("approved"), actionLabel: "Show approved requests", active: filter === "approved" },
      { icon: Clock, value: String(rows.filter(item => item.type === "ot").length), label: "Extra duty records", note: "OT hours", onClick: () => toggle("ot"), actionLabel: "Show extra duty requests", active: filter === "ot" },
      { icon: AlertTriangle, value: String(rows.filter(item => item.reason === "sick" || item.reason === "accident").length), label: "Sick or accident", note: "Cover needed", tone: "red", onClick: () => toggle("cover"), actionLabel: "Show sick or accident requests", active: filter === "cover" },
    ]} />
    <ListFilterRow>
      <FilterChips<DutyFilter> options={[{ id: "pending", label: `Awaiting decision (${pending.length})` }, { id: "approved", label: "Approved" }, { id: "ot", label: "Extra duty" }, { id: "cover", label: "Sick or accident" }, { id: "all", label: "All requests" }]} value={filter} onChange={setFilter} />
    </ListFilterRow>
    <Panel flush>
      <DataTable rows={visible} rowKey={row => row.id}
        empty={<div className="p-4"><EmptyState icon={CheckCircle2} message={filter === "pending" ? "No requests waiting for a decision." : filter === "all" ? "No duty change requests yet." : "No requests match this filter."} /></div>}
        columns={[
          { header: "Employee", cell: row => { const employee = employeeOf(row.employeeId); return <PersonCell name={employee?.name ?? row.employeeId} id={row.employeeId} phone={employee?.phone} />; } },
          { header: "Request", cell: row => <span><strong className="block text-sm font-medium">{dutyTypeLabel(row)}</strong><small className="text-xs text-muted">{titleCase(row.reason)}</small></span> },
          { header: "Date", cell: row => formatAppDate(row.date) },
          { header: "Site", cell: row => row.site, hideOnMobile: true },
          { header: "Note", cell: row => <span className="line-clamp-2 max-w-[240px] text-xs text-muted">{row.type === "swap" ? `Swap with ${employeeOf(row.partnerId ?? "")?.name ?? "any available reliever"}. ` : ""}{row.note}</span>, hideOnMobile: true },
          { header: "Status", cell: row => <StatusChip tone={requestTone(row.status)}>{titleCase(row.status)}</StatusChip> },
          { header: "Decision", align: "right", cell: row => row.status === "pending"
            ? <span className="inline-flex gap-1.5"><Button size="sm" variant="ghost" className="text-status-danger" onClick={() => decide(row, "rejected")}>Reject</Button><Button size="sm" onClick={() => decide(row, "approved")}><Check />Approve</Button></span>
            : <span className="text-xs text-muted">Decided</span> },
        ]} />
    </Panel>
  </>;
}

/* -------------------------------- Attendance ------------------------------- */

type AttendanceTab = "Live board" | "Exceptions" | "Corrections" | "Night checks";

const corrections = [
  { id: "COR-1", employee: "Fathima N", empId: "BMG-2274", site: "Aster Medcity", date: "2026-09-21", original: "No punch", corrected: "09:02", reason: "Device or network failure", status: "pending" },
  { id: "COR-2", employee: "Shamnad C M", empId: "BMG-1778", site: "Caritas Hospital", date: "2026-09-20", original: "20:41", corrected: "20:02", reason: "Supervisor verified presence", status: "approved" },
];

type PunchState = "all" | "On site" | "Late" | "Absent";

export function AttendanceScreen({ onCorrect, onNavigate }: { onCorrect: () => void; onNavigate?: (view: string, meta?: string | NavClickMeta) => void }) {
  const notify = useToast();
  const [tab, setTab] = useState<AttendanceTab>("Live board");
  const { nightChecks, confirmNightCheck } = useOps();
  const nightDue = nightChecks.filter(item => item.state !== "Confirmed");
  const [duty, setDuty] = useState("all");
  const [punchState, setPunchState] = useState<PunchState>("all");
  const [district, setDistrict] = useState("all");
  const [query, setQuery] = useState("");
  const districts = useMemo(() => Array.from(new Set(attendanceRows.map(row => siteDistrict(row.site)).filter(Boolean))), []);
  const q = query.trim().toLowerCase();
  const exceptionCount = attendanceRows.filter(row => row.state !== "On site").length;
  const rows = attendanceRows.filter(row =>
    (duty === "all" || row.duty === duty)
    && (punchState === "all" || row.state === punchState)
    && (district === "all" || siteDistrict(row.site) === district)
    && (!q || row.employee.toLowerCase().includes(q) || row.site.toLowerCase().includes(q) || row.id.toLowerCase().includes(q))
    && (tab !== "Exceptions" || row.state !== "On site"));
  const correctionRows = corrections.filter(row =>
    (district === "all" || siteDistrict(row.site) === district)
    && (!q || row.employee.toLowerCase().includes(q) || row.site.toLowerCase().includes(q)));
  const exportRegister = () => {
    downloadCsv(`attendance-${APP_TODAY}`, ["Employee ID", "Employee", "Site", "Shift", "Punch-in", "GPS accuracy", "Duty", "Status"], rows.map(row => [row.id, row.employee, row.site, row.shift, row.punch, row.accuracy, row.duty, row.state]));
    notify("Attendance register downloaded");
  };
  const showState = (next: PunchState) => {
    if (punchState === next) { setPunchState("all"); return; }
    setPunchState(next);
    if (tab === "Corrections" || tab === "Night checks") setTab("Live board");
  };
  const markPresent = (check: NightCheck) => {
    confirmNightCheck(check.empId);
    notify(`Presence recorded for ${check.employee}`);
  };
  const nightRows = nightChecks.filter(row =>
    (district === "all" || siteDistrict(row.site) === district)
    && (!q || row.employee.toLowerCase().includes(q) || row.site.toLowerCase().includes(q) || row.empId.toLowerCase().includes(q)));

  return <>
    <PageHeader title={NAV.attendance} subtitle={`Live punches, duty values and exceptions for ${formatAppDate(APP_TODAY)}.`}
      actions={<><Button variant="outline" onClick={exportRegister}><Download />Export</Button><Button onClick={onCorrect}><Plus />Add correction</Button></>} />
    <StatStrip items={[
      { icon: Check, value: "421", label: "Present", note: "93.8% on time", tone: "green", onClick: () => showState("On site"), actionLabel: "Show guards on site", active: punchState === "On site" },
      { icon: Clock, value: "7", label: "Late", note: "After the grace period", tone: "orange", onClick: () => showState("Late"), actionLabel: "Show late guards", active: punchState === "Late" },
      { icon: AlertTriangle, value: "21", label: "Absent", note: "7 posts left empty", tone: "red", onClick: () => showState("Absent"), actionLabel: "Show absent guards", active: punchState === "Absent" },
      { icon: Timer, value: String(nightDue.length), label: "Night checks due", note: `${nightChecks.filter(item => item.state === "Missed").length} missed`, tone: nightDue.some(item => item.state === "Missed") ? "red" : undefined, onClick: () => setTab(tab === "Night checks" ? "Live board" : "Night checks"), actionLabel: "Show night checks", active: tab === "Night checks" },
    ]} />
    <SegmentedControl options={[
      { id: "Live board", label: "Live board" },
      { id: "Exceptions", label: `Exceptions (${exceptionCount})` },
      { id: "Corrections", label: `Corrections (${corrections.length})` },
      { id: "Night checks", label: `Night checks (${nightDue.length})` },
    ] as const} value={tab} onChange={setTab} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by employee, ID or site" />
    <div className="mb-4 flex flex-wrap items-center gap-2" data-enter>
      <Select className="h-9 w-auto" value={district} onChange={event => setDistrict(event.target.value)} aria-label="District">
        <option value="all">All districts</option>{districts.map(item => <option key={item}>{item}</option>)}
      </Select>
      {tab !== "Corrections" && tab !== "Night checks" && <Select className="h-9 w-auto" value={duty} onChange={event => setDuty(event.target.value)} aria-label="Duty value">
        <option value="all">All duty values</option>{["0.00", "0.50", "0.75", "1.00", "1.50"].map(value => <option key={value}>{value}</option>)}
      </Select>}
      {tab !== "Corrections" && tab !== "Night checks" && <Select className="h-9 w-auto" value={punchState} onChange={event => setPunchState(event.target.value as PunchState)} aria-label="Punch status">
        <option value="all">All statuses</option>{(["On site", "Late", "Absent"] as const).map(value => <option key={value}>{value}</option>)}
      </Select>}
      {(district !== "all" || duty !== "all" || punchState !== "all" || query) && <Button variant="ghost" size="sm" onClick={() => { setDistrict("all"); setDuty("all"); setPunchState("all"); setQuery(""); }}>Clear filters</Button>}
      {tab === "Night checks" && onNavigate && <Button variant="ghost" size="sm" onClick={() => onNavigate("night-vigilance")}><Settings />Check policy</Button>}
      <span className="ml-auto text-xs text-muted">Live as of 09:24</span>
    </div>
    <Panel flush>
      {tab === "Night checks"
        ? <DataTable rows={nightRows} rowKey={row => row.empId}
          empty={<div className="p-4"><EmptyState icon={CheckCircle2} title="No night checks" message="No checks match these filters." /></div>}
          columns={[
            { header: "Employee", cell: row => <PersonCell name={row.employee} id={row.empId} phone={phoneOf(row.empId)} /> },
            { header: "Site", cell: row => row.site },
            { header: "Due", cell: row => <span className="tabular-nums">{row.due}</span> },
            { header: "Status", cell: row => <StatusChip tone={row.state === "Confirmed" ? "success" : row.state === "Missed" ? "danger" : row.state === "Due now" ? "warning" : "neutral"}>{row.state}</StatusChip> },
            { header: "", align: "right", cell: row => row.state === "Confirmed"
              ? <span className="inline-flex items-center gap-1 text-xs text-muted"><CheckCircle2 size={14} />Confirmed</span>
              : <Button size="sm" variant={row.state === "Upcoming" ? "outline" : "default"} onClick={() => markPresent(row)}><Crosshair />Mark present</Button> },
          ]} />
        : tab === "Corrections"
        ? <DataTable rows={correctionRows} rowKey={row => row.id}
          empty={<div className="p-4"><EmptyState icon={CalendarCheck} message="No corrections match these filters." actionLabel="Add correction" onAction={onCorrect} /></div>}
          columns={[
            { header: "Employee", cell: row => <PersonCell name={row.employee} id={row.empId} phone={phoneOf(row.empId)} /> },
            { header: "Date", cell: row => formatAppDate(row.date) },
            { header: "Site", cell: row => row.site, hideOnMobile: true },
            { header: "Original", cell: row => <span className="text-muted line-through decoration-muted/60">{row.original}</span> },
            { header: "Corrected", cell: row => <strong>{row.corrected}</strong> },
            { header: "Reason", cell: row => <span className="text-xs text-muted">{row.reason}</span>, hideOnMobile: true },
            { header: "Status", cell: row => <StatusChip tone={row.status === "approved" ? "success" : "warning"}>{row.status === "approved" ? "Approved" : "Waiting for HR"}</StatusChip> },
          ]} />
        : <DataTable rows={rows} rowKey={row => row.id}
          empty={<div className="p-4"><EmptyState icon={CheckCircle2} title={tab === "Exceptions" ? "No exceptions" : "No punches found"} message={tab === "Exceptions" ? "Every punch on this filter is clean." : "Try a different search or filter."} /></div>}
          columns={[
            { header: "Employee", cell: row => <PersonCell name={row.employee} id={row.id} phone={phoneOf(row.id)} /> },
            { header: "Site", cell: row => row.site },
            { header: "Shift", cell: row => row.shift, hideOnMobile: true },
            { header: "Punch-in", cell: row => <span className="tabular-nums">{row.punch}</span> },
            { header: "GPS accuracy", cell: row => row.accuracy, hideOnMobile: true },
            { header: "Duty", align: "right", cell: row => <strong>{row.duty}</strong> },
            { header: "Status", cell: row => <StatusChip tone={row.state === "On site" ? "success" : row.state === "Late" ? "warning" : "danger"}>{row.state}</StatusChip> },
          ]} />}
    </Panel>
  </>;
}

/* ------------------------------- Inspections ------------------------------- */

const defaultChecklist = [
  "Punch inside the site boundary",
  "Complete the site checklist",
  "Record exceptions and follow-up owner",
  "Confirm guard register and SOP compliance",
];

const foTaskLabels: Record<FoTask["kind"], string> = {
  "sop-briefing": "SOP briefing",
  "client-complaint": "Complaint check",
  "day-patrol": "Day patrol",
  "night-patrol": "Night patrol",
  "guard-change-review": "Guard change review",
};
const visitTone = (status: string): StatusTone => status === "Completed" ? "success" : status === "Due now" ? "warning" : "info";

type RouteFilter = "all" | "Completed" | "Upcoming";

export function InspectionsScreen({ onLog, onNavigate }: { onLog: () => void; onNavigate?: (view: string, meta?: string | NavClickMeta) => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [visit, setVisit] = useState<(typeof inspections)[number] | null>(null);
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [editing, setEditing] = useState(false);
  const [routeFilter, setRouteFilter] = useState<RouteFilter>("all");
  const route = inspections.filter(item => routeFilter === "all" || item.status === routeFilter);
  const officers = useMemo(() => Array.from(new Set(foTasks.map(task => task.officer))), []);
  const [officer, setOfficer] = useState(officers[0] ?? "");
  const [tasks, setTasks] = useState<FoTask[]>(foTasks);
  const officerTasks = tasks.filter(task => task.officer === officer);
  const completeTask = (id: string) => {
    setTasks(current => current.map(task => task.id === id ? { ...task, status: "done" } : task));
    notify("Task marked done");
  };

  return <>
    <PageHeader title={NAV.inspections} subtitle={`${ROLE_TERMS.fieldOfficer} site visits, verification punches and follow-up tasks.`} actions={<Button onClick={onLog}><Navigation />Log a visit</Button>} />
    <StatStrip items={[
      { icon: UserCheck, value: "18", label: "Visits today", note: "14 completed", onClick: () => setRouteFilter("all"), actionLabel: "Show all visits today" },
      { icon: Check, value: "14", label: "Verified", note: "GPS and checklist", tone: "green", onClick: () => setRouteFilter(routeFilter === "Completed" ? "all" : "Completed"), actionLabel: "Show verified visits", active: routeFilter === "Completed" },
      { icon: Clock, value: "3", label: "Upcoming", note: "Next at 13:00", onClick: () => setRouteFilter(routeFilter === "Upcoming" ? "all" : "Upcoming"), actionLabel: "Show upcoming visits", active: routeFilter === "Upcoming" },
      { icon: AlertTriangle, value: "1", label: "Overdue", note: "Needs reassignment", tone: "orange", onClick: () => onNavigate?.("action-centre"), actionLabel: "Open action centre" },
    ]} />
    <SplitLayout wideFirst>
      <Panel title="Today's route" description="Visits in order of their time window."
        action={routeFilter !== "all" ? <Button size="sm" variant="ghost" onClick={() => setRouteFilter("all")}>Show all</Button> : undefined}>
        {route.length === 0 && <p className="text-sm text-muted">{routeFilter === "all" ? "No visits scheduled today." : "No visits match this filter."}</p>}
        {route.map((item, index) => (
          <ListRow key={item.site} onClick={() => setVisit(item)}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{index + 1}</span>
            <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{item.site}</strong><small className="text-xs text-muted">{item.officer} · {item.window}</small></div>
            <span className="hidden text-xs text-muted sm:inline">{item.distance}</span>
            <StatusChip tone={visitTone(item.status)}>{item.status}</StatusChip>
            <ChevronRight className="h-4 w-4 text-muted" />
          </ListRow>
        ))}
      </Panel>
      <Panel title="Visit checklist" description="Every inspection must complete these steps."
        action={editing
          ? <Button size="sm" onClick={() => { setEditing(false); notify("Checklist saved"); }}>Save checklist</Button>
          : <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>}>
        {editing ? <>
          <div className="grid gap-2">
            {checklist.map((entry, index) => (
              <div key={index} className="flex gap-2">
                <Input className="h-9" value={entry} onChange={event => setChecklist(current => current.map((item, row) => row === index ? event.target.value : item))} aria-label={`Checklist step ${index + 1}`} />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-status-danger" aria-label={`Remove step ${index + 1}`} title="Remove step"
                  onClick={async () => { if (await confirm({ title: "Remove this step?", description: `"${entry}" will no longer be required on inspections.`, confirmLabel: "Remove", destructive: true })) setChecklist(current => current.filter((_, row) => row !== index)); }}><Trash2 /></Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setChecklist(current => [...current, "New step"])}><Plus />Add step</Button>
        </> : <ol className="grid gap-2">
          {checklist.map((entry, index) => <li key={entry} className="flex items-start gap-2 text-sm"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-[11px] font-bold text-emerald">{index + 1}</span>{entry}</li>)}
        </ol>}
      </Panel>
    </SplitLayout>
    <Panel title="Field officer tasks" description="SOP briefings, complaint checks and patrols."
      action={<Select className="h-9 w-auto" value={officer} onChange={event => setOfficer(event.target.value)} aria-label="Field officer">{officers.map(name => <option key={name}>{name}</option>)}</Select>}>
      {officerTasks.length === 0 && <p className="text-sm text-muted">No tasks for {officer}.</p>}
      {officerTasks.map(task => (
        <ListRow key={task.id} className={task.status === "done" ? "opacity-60" : ""}>
          <StatusChip tone="info">{foTaskLabels[task.kind]}</StatusChip>
          <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{task.site}</strong><small className="text-xs text-muted">{task.detail}</small></div>
          <span className="text-xs text-muted">{task.due}</span>
          <Button size="sm" variant="outline" disabled={task.status === "done"} onClick={() => completeTask(task.id)}>{task.status === "done" ? <><Check />Done</> : "Mark done"}</Button>
        </ListRow>
      ))}
    </Panel>

    {visit && <DetailDrawer title={visit.site} subtitle={`${visit.officer} · ${visit.window}`} onClose={() => setVisit(null)}
      footer={<>
        <Button variant="outline" onClick={() => setVisit(null)}>Close</Button>
        {visit.status === "Completed" && <Button onClick={() => { setVisit(null); notify("Visit report sent to district operations"); }}><Check />Send report</Button>}
      </>}>
      <Section title="Visit">
        <DefRows rows={[
          { label: "Status", value: <StatusChip tone={visitTone(visit.status)}>{visit.status}</StatusChip> },
          { label: "Time window", value: visit.window, mono: true },
          { label: "Travel distance", value: visit.distance, mono: true },
          { label: ROLE_TERMS.fieldOfficer, value: visit.officer },
        ]} />
      </Section>
      <Section title="Verification punch">
        {visit.status === "Completed"
          ? <DefRows rows={[
            { label: "Punched at", value: "09:42:16", mono: true },
            { label: "Coordinates", value: "10.02714, 76.30792", mono: true },
            { label: "Distance from post", value: "18 m", mono: true },
            { label: "Boundary check", value: <StatusChip tone="success">Inside</StatusChip> },
          ]} />
          : <InlineAlert tone="warning">No verification punch yet. The officer must punch inside the site boundary for this visit to count.</InlineAlert>}
      </Section>
      <Section title="Checklist">
        <Timeline entries={visit.status === "Completed" ? [
          { title: "Boundary punch verified", time: "09:42", state: "done" },
          { title: "Site checklist completed", time: "09:51", note: "All four steps confirmed.", state: "done" },
          { title: "Guard register checked", time: "09:58", note: "Day book entries current, no gaps.", state: "done" },
          { title: "Report filed", time: "10:04", state: "done" },
        ] : [
          { title: "Visit scheduled", time: visit.window, state: "done" },
          { title: "Waiting for boundary punch", time: "Pending", state: "active" },
        ]} />
      </Section>
    </DetailDrawer>}
  </>;
}
