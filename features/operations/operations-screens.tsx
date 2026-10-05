"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, Building2, CalendarCheck, Check, CheckCircle2, ChevronRight, Clock, Download, MapPin,
  Navigation, Plus, Timer, Trash2, UserCheck, Users,
} from "lucide-react";
import { attendanceRows, dutyChangeRequests, employees, foTasks, guardChanges, inspections, ratings, rotationSplit, rupees, sites } from "@/lib/mock-data";
import type { DutyChangeRequest, FoTask, GuardChangeEvent } from "@/types/domain";
import {
  Button, DataTable, DefRows, DetailDrawer, EmptyState, FilterChips, IconTile, InlineAlert, Input, KeyValue,
  ListFilterRow, ListRow, PageHeader, Panel, PersonCell, ProgressBar, SearchBar, Section, SegmentedControl,
  Select, SkillTags, SplitLayout, StatStrip, StatusChip, Timeline, useConfirm, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { downloadCsv } from "@/lib/download";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { NAV, ROLE_TERMS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const siteDistrict = (siteName: string) => sites.find(site => site.name === siteName)?.district ?? "";

/* ---------------------------------- Sites --------------------------------- */

export function SitesScreen({ onCreate, onConfigure, onEditBoundary }: { onCreate: () => void; onConfigure: (site: string) => void; onEditBoundary: (site: string) => void }) {
  const [district, setDistrict] = useState("all");
  const [query, setQuery] = useState("");
  const districts = useMemo(() => Array.from(new Set(sites.map(site => site.district))), []);
  const q = query.trim().toLowerCase();
  const visible = sites.filter(site => (district === "all" || site.district === district)
    && (!q || site.name.toLowerCase().includes(q) || site.client.toLowerCase().includes(q)));
  const ratingOf = (siteName: string) => {
    const scores = ratings.filter(rating => rating.targetType === "site" && rating.targetId === siteName).map(rating => rating.score);
    return scores.length ? `${Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length * 10) / 10}/10` : "Not rated";
  };
  return <>
    <PageHeader title={NAV.sites} subtitle="Client locations, staffing, benefit rules and attendance boundaries." actions={<Button onClick={onCreate}><Plus />Add site</Button>} />
    <StatStrip items={[
      { icon: Building2, value: "214", label: "Active sites", note: "483 configured posts" },
      { icon: Users, value: "435", label: "Required posts", note: "408 staffed", tone: "green" },
      { icon: AlertTriangle, value: "27", label: "Vacant posts", note: "Across 16 sites", tone: "orange" },
      { icon: MapPin, value: "206", label: "Boundaries set", note: "8 need coordinates" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by site or client" />
    <ListFilterRow>
      <FilterChips options={[{ id: "all", label: "All districts" }, ...districts.map(item => ({ id: item, label: item }))]} value={district} onChange={setDistrict} />
      <span className="text-xs text-muted">{visible.length} sites</span>
    </ListFilterRow>
    {visible.length === 0 && <EmptyState icon={Building2} message="No sites match these filters." actionLabel="Clear filters" onAction={() => { setDistrict("all"); setQuery(""); }} />}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(site => (
        <article key={site.name} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm" data-enter>
          <div className="mb-3 flex items-start gap-3">
            <IconTile icon={Building2} />
            <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{site.name}</h3><p className="text-xs text-muted">{site.client} · {site.district}</p></div>
            <StatusChip tone={site.coverage === 100 ? "success" : "warning"}>{site.coverage}% staffed</StatusChip>
          </div>
          <KeyValue label="Posts staffed" value={`${site.staffed} of ${site.posts}`} />
          <KeyValue label="Benefits" value={site.scheme} />
          <KeyValue label="Attendance boundary" value={site.polygon ? `${site.polygon.length}-corner area` : `${site.radius} m radius`} />
          <KeyValue label="Client rating" value={ratingOf(site.name)} />
          <div className="my-3"><ProgressBar value={site.coverage} tone={site.coverage === 100 ? "emerald" : "warn"} /></div>
          <div className="mt-auto flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEditBoundary(site.name)}><MapPin />Edit boundary</Button>
            <Button size="sm" className="flex-1" onClick={() => onConfigure(site.name)}>Manage site</Button>
          </div>
        </article>
      ))}
    </div>
  </>;
}

/* -------------------------------- Deployment ------------------------------- */

type Post = { site: string; post: string; required: number; assigned: string[]; state: string };
const todayDate = Number(APP_TODAY.slice(8, 10));
const weekDays = Array.from({ length: 7 }, (_, index) => todayDate - 1 + index);
const weekdayOf = (day: number) => new Date(`2026-09-${String(day).padStart(2, "0")}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" });

export function DeploymentScreen({ onAssign }: { onAssign: () => void }) {
  const notify = useToast();
  const [day, setDay] = useState(todayDate);
  const [managing, setManaging] = useState<Post | null>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([
    { site: "TCS Technopark", post: "Block A · Day", required: 3, assigned: ["Rajeev K", "Suresh B", "Fathima N"], state: "Covered" },
    { site: "Aster Medcity", post: "Emergency · Day", required: 2, assigned: ["Shamnad C"], state: "Vacant" },
    { site: "Lake Palace Resort", post: "Lobby · Night", required: 2, assigned: ["Anzar M", "Reliever needed"], state: "Vacant" },
    { site: "Lulu Mall, Kochi", post: "Loading bay · Day", required: 2, assigned: ["Hareendrakumar K", "Niyas P"], state: "Covered" },
  ]);
  const [changes, setChanges] = useState<GuardChangeEvent[]>(guardChanges);
  const vacant = posts.filter(post => post.state !== "Covered").length;

  function assign(post: Post, name: string) {
    const outgoing = post.assigned.find(entry => entry.includes("needed")) ? "Vacant post" : post.assigned[post.assigned.length - 1] ?? "Vacant post";
    setPosts(current => current.map(item => {
      if (item.site + item.post !== post.site + post.post) return item;
      const filled = item.assigned.filter(entry => !entry.includes("needed")).concat(name);
      return { ...item, assigned: filled, state: filled.length >= item.required ? "Covered" : "Vacant" };
    }));
    setChanges(current => [{ id: `GC-${Date.now()}`, site: post.site, post: post.post, outgoing, incoming: name, at: `${APP_TODAY} 09:30` }, ...current]);
    setManaging(null);
    const officer = sites.find(site => site.name === post.site)?.fieldOfficers[0] ?? "Field officer";
    notify(`${name} assigned · ${officer} notified`);
  }

  return <>
    <PageHeader title={NAV.deployment} subtitle="Daily post coverage, 24-hour rotations and reliever allocation." actions={<Button onClick={onAssign}><Plus />Assign employee</Button>} />
    <div className="mb-4 flex gap-2 overflow-x-auto" data-enter role="tablist" aria-label="Day">
      {weekDays.map(value => (
        <button key={value} type="button" role="tab" aria-selected={day === value} onClick={() => setDay(value)}
          className={cn("flex min-w-[64px] flex-col items-center rounded-2xl border px-3 py-2 transition-colors", day === value ? "border-emerald bg-emerald text-white" : "border-border bg-card hover:bg-surface")}>
          <span className={cn("text-[11px]", day === value ? "text-white/80" : "text-muted")}>{value === todayDate ? "Today" : weekdayOf(value)}</span>
          <strong className="text-lg tabular-nums">{value}</strong>
        </button>
      ))}
    </div>
    <SplitLayout wideFirst>
      <Panel title={`Post coverage · ${day} September`} description={vacant ? `${vacant} post${vacant === 1 ? "" : "s"} need cover. Fill them from the reliever pool.` : "Every post is covered."}>
        {posts.map(post => (
          <ListRow key={post.site + post.post}>
            <div className="min-w-[160px] flex-1"><strong className="block text-sm">{post.site}</strong><small className="text-xs text-muted">{post.post} · {post.required} needed</small></div>
            <div className="flex flex-1 flex-wrap gap-1">
              {post.assigned.map(name => name.includes("needed")
                ? <span key={name} className="rounded-md border border-dashed border-status-danger/50 px-2 py-0.5 text-xs text-status-danger">Reliever needed</span>
                : <span key={name} className="rounded-md bg-surface px-2 py-0.5 text-xs">{name}</span>)}
            </div>
            <StatusChip tone={post.state === "Covered" ? "success" : "danger"}>{post.state === "Covered" ? "Covered" : "Needs cover"}</StatusChip>
            <Button size="sm" variant="outline" onClick={() => setManaging(post)}>{post.state === "Covered" ? "Change" : "Fill post"}</Button>
          </ListRow>
        ))}
      </Panel>
      <Panel title="24-hour pair" description="One duty per day, split between two guards.">
        <div className="mb-3 flex items-center justify-around rounded-xl bg-surface p-3 text-center">
          <div><span className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">SB</span><strong className="block text-sm">Suresh Babu</strong><small className="text-xs text-muted">16 duties</small></div>
          <span className="text-muted">+</span>
          <div><span className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald text-sm font-bold text-white">RK</span><strong className="block text-sm">Rajeev Kumar</strong><small className="text-xs text-muted">15 duties</small></div>
        </div>
        <p className="text-sm text-muted">A 31-day month splits 16 and 15. The extra duty alternates next month so the pair stays balanced.</p>
        <Button variant="outline" className="mt-3 w-full" onClick={() => setRotationOpen(true)}>View rotation calendar</Button>
      </Panel>
    </SplitLayout>
    <Panel title="Recent guard changes" description={`Every change notifies the site's ${ROLE_TERMS.fieldOfficer.toLowerCase()}.`}>
      {changes.length === 0 && <p className="text-sm text-muted">No guard changes recorded.</p>}
      {changes.map(change => (
        <ListRow key={change.id}>
          <div className="min-w-[140px] flex-1"><strong className="block text-sm">{change.site}</strong><small className="text-xs text-muted">{change.post}</small></div>
          <span className="flex-1 text-sm">{change.outgoing} <ChevronRight className="inline h-3.5 w-3.5 text-emerald" /> <strong>{change.incoming}</strong></span>
          <span className="font-mono text-xs text-muted">{change.at}</span>
        </ListRow>
      ))}
    </Panel>
    {managing && <AssignmentDrawer post={managing} onAssign={assign} onClose={() => setManaging(null)} />}
    {rotationOpen && <RotationDrawer onClose={() => setRotationOpen(false)} />}
  </>;
}

function AssignmentDrawer({ post, onAssign, onClose }: { post: Post; onAssign: (post: Post, name: string) => void; onClose: () => void }) {
  const relievers = employees.filter(employee => employee.status === "Reliever");
  const [picked, setPicked] = useState<string | null>(null);
  const filled = post.assigned.filter(entry => !entry.includes("needed"));
  const shortfall = Math.max(0, post.required - filled.length);
  const selected = relievers.find(employee => employee.id === picked);
  const tier = (rate: number) => rate >= 750 ? "Specialized" : rate >= 650 ? "Skilled" : rate >= 516 ? "Statutory" : "Base";

  return <DetailDrawer title={post.post} subtitle={`${post.site} · ${post.required} needed · ${shortfall} open`} onClose={onClose}
    footer={<>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button disabled={!selected} onClick={() => selected && onAssign(post, selected.name)}><Check />{selected ? `Assign ${selected.name.split(" ")[0]}` : "Choose a reliever"}</Button>
    </>}>
    <Section title="On this post">
      <div className="flex flex-wrap gap-1">{filled.length ? filled.map(name => <span key={name} className="rounded-md bg-surface px-2 py-1 text-sm">{name}</span>) : <span className="text-sm text-status-danger">Nobody assigned</span>}</div>
    </Section>
    <Section title="Available relievers">
      <div className="grid gap-2">
        {relievers.map(employee => (
          <button key={employee.id} type="button" onClick={() => setPicked(employee.id)} aria-pressed={picked === employee.id}
            className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3 text-left", picked === employee.id ? "border-emerald bg-emerald/5" : "border-border hover:bg-surface")}>
            <div className="min-w-0 flex-1"><PersonCell name={employee.name} id={employee.id} /></div>
            <SkillTags skills={employee.skills} />
            <span className="text-sm font-semibold tabular-nums">{rupees(employee.dailyRate ?? 0)}<small className="font-normal text-muted"> /duty</small></span>
          </button>
        ))}
      </div>
    </Section>
    {selected && <Section title="Cost">
      <DefRows rows={[
        { label: "Rate per duty", value: rupees(selected.dailyRate ?? 0), mono: true },
        { label: "Rate tier", value: tier(selected.dailyRate ?? 0) },
        { label: "Statutory cover", value: selected.esi ? "ESI applies" : "Salary only" },
      ]} />
    </Section>}
  </DetailDrawer>;
}

const monthOptions = [
  { label: "September 2026 · 30 days", year: 2026, month: 8 },
  { label: "August 2026 · 31 days", year: 2026, month: 7 },
  { label: "October 2026 · 31 days", year: 2026, month: 9 },
];

function RotationDrawer({ onClose }: { onClose: () => void }) {
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

export function DutyChangesScreen() {
  const notify = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<DutyChangeRequest[]>(dutyChangeRequests);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const decide = async (row: DutyChangeRequest, status: "approved" | "rejected") => {
    const name = employeeOf(row.employeeId)?.name ?? row.employeeId;
    if (status === "rejected" && !await confirm({ title: `Reject ${name}'s request?`, description: `${dutyTypeLabel(row)} on ${formatAppDate(row.date)} will be declined and ${name} notified in the app.`, confirmLabel: "Reject request", destructive: true })) return;
    setRows(current => current.map(item => item.id === row.id ? { ...item, status } : item));
    notify(status === "approved"
      ? row.type === "replacement" ? "Replacement approved · reliever pool notified" : row.type === "ot" ? "Extra duty approved for payroll" : "Shift swap approved"
      : "Request rejected");
  };
  const pending = rows.filter(item => item.status === "pending");
  const visible = filter === "pending" ? pending : rows;
  return <>
    <PageHeader title={NAV.dutyChanges} subtitle="Shift swaps, replacement cover and extra duty (OT) requested from the guard app." />
    <StatStrip items={[
      { icon: Users, value: String(pending.length), label: "Awaiting decision", note: "From the guard app", tone: pending.length ? "orange" : "green" },
      { icon: Check, value: String(rows.filter(item => item.status === "approved").length), label: "Approved", note: "This month", tone: "green" },
      { icon: Clock, value: String(rows.filter(item => item.type === "ot").length), label: "Extra duty records", note: "OT hours" },
      { icon: AlertTriangle, value: String(rows.filter(item => item.reason === "sick" || item.reason === "accident").length), label: "Sick or accident", note: "Cover needed", tone: "red" },
    ]} />
    <ListFilterRow>
      <FilterChips options={[{ id: "pending", label: `Awaiting decision (${pending.length})` }, { id: "all", label: "All requests" }]} value={filter} onChange={setFilter} />
    </ListFilterRow>
    <Panel flush>
      <DataTable rows={visible} rowKey={row => row.id}
        empty={<div className="p-4"><EmptyState icon={CheckCircle2} message={filter === "pending" ? "No requests waiting for a decision." : "No duty change requests yet."} /></div>}
        columns={[
          { header: "Employee", cell: row => { const employee = employeeOf(row.employeeId); return <PersonCell name={employee?.name ?? row.employeeId} id={row.employeeId} phone={employee?.phone} />; } },
          { header: "Request", cell: row => <span><strong className="block text-sm">{dutyTypeLabel(row)}</strong><small className="text-xs text-muted">{titleCase(row.reason)}</small></span> },
          { header: "Date", cell: row => formatAppDate(row.date) },
          { header: "Site", cell: row => row.site, hideOnMobile: true },
          { header: "Note", cell: row => <span className="line-clamp-2 max-w-[240px] text-xs text-muted">{row.note}</span>, hideOnMobile: true },
          { header: "Status", cell: row => <StatusChip tone={requestTone(row.status)}>{titleCase(row.status)}</StatusChip> },
          { header: "Decision", align: "right", cell: row => row.status === "pending"
            ? <span className="inline-flex gap-1.5"><Button size="sm" variant="ghost" className="text-status-danger" onClick={() => decide(row, "rejected")}>Reject</Button><Button size="sm" onClick={() => decide(row, "approved")}><Check />Approve</Button></span>
            : <span className="text-xs text-muted">Decided</span> },
        ]} />
    </Panel>
  </>;
}

/* -------------------------------- Attendance ------------------------------- */

type AttendanceTab = "Live board" | "Exceptions" | "Corrections";
const corrections = [
  { id: "COR-1", employee: "Fathima N", empId: "BMG-2274", site: "Aster Medcity", date: "2026-09-21", original: "No punch", corrected: "09:02", reason: "Device or network failure", status: "pending" },
  { id: "COR-2", employee: "Shamnad C M", empId: "BMG-1778", site: "Caritas Hospital", date: "2026-09-20", original: "20:41", corrected: "20:02", reason: "Supervisor verified presence", status: "approved" },
];

export function AttendanceScreen({ onCorrect }: { onCorrect: () => void }) {
  const notify = useToast();
  const [tab, setTab] = useState<AttendanceTab>("Live board");
  const [duty, setDuty] = useState("all");
  const [district, setDistrict] = useState("all");
  const [query, setQuery] = useState("");
  const districts = useMemo(() => Array.from(new Set(attendanceRows.map(row => siteDistrict(row.site)).filter(Boolean))), []);
  const q = query.trim().toLowerCase();
  const exceptionCount = attendanceRows.filter(row => row.state !== "On site").length;
  const rows = attendanceRows.filter(row =>
    (duty === "all" || row.duty === duty)
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

  return <>
    <PageHeader title={NAV.attendance} subtitle={`Live punches, duty values and exceptions for ${formatAppDate(APP_TODAY)}.`}
      actions={<><Button variant="outline" onClick={exportRegister}><Download />Export</Button><Button onClick={onCorrect}><Plus />Add correction</Button></>} />
    <StatStrip items={[
      { icon: Check, value: "421", label: "Present", note: "93.8% on time", tone: "green" },
      { icon: Clock, value: "7", label: "Late", note: "After the grace period", tone: "orange" },
      { icon: AlertTriangle, value: "21", label: "Absent", note: "7 posts left empty", tone: "red" },
      { icon: Timer, value: "6", label: "Night checks due", note: "Next 30 minutes" },
    ]} />
    <SegmentedControl options={[
      { id: "Live board", label: "Live board" },
      { id: "Exceptions", label: `Exceptions (${exceptionCount})` },
      { id: "Corrections", label: `Corrections (${corrections.length})` },
    ] as const} value={tab} onChange={setTab} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by employee, ID or site" />
    <div className="mb-4 flex flex-wrap items-center gap-2" data-enter>
      <Select className="h-9 w-auto" value={district} onChange={event => setDistrict(event.target.value)} aria-label="District">
        <option value="all">All districts</option>{districts.map(item => <option key={item}>{item}</option>)}
      </Select>
      {tab !== "Corrections" && <Select className="h-9 w-auto" value={duty} onChange={event => setDuty(event.target.value)} aria-label="Duty value">
        <option value="all">All duty values</option>{["0.00", "0.50", "0.75", "1.00", "1.50"].map(value => <option key={value}>{value}</option>)}
      </Select>}
      {(district !== "all" || duty !== "all" || query) && <Button variant="ghost" size="sm" onClick={() => { setDistrict("all"); setDuty("all"); setQuery(""); }}>Clear filters</Button>}
      <span className="ml-auto text-xs text-muted">Live as of 09:24</span>
    </div>
    <Panel flush>
      {tab === "Corrections"
        ? <DataTable rows={correctionRows} rowKey={row => row.id}
          empty={<div className="p-4"><EmptyState icon={CalendarCheck} message="No corrections match these filters." actionLabel="Add correction" onAction={onCorrect} /></div>}
          columns={[
            { header: "Employee", cell: row => <PersonCell name={row.employee} id={row.empId} /> },
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
            { header: "Employee", cell: row => <PersonCell name={row.employee} id={row.id} /> },
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

export function InspectionsScreen({ onLog }: { onLog: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [visit, setVisit] = useState<(typeof inspections)[number] | null>(null);
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [editing, setEditing] = useState(false);
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
      { icon: UserCheck, value: "18", label: "Visits today", note: "14 completed" },
      { icon: Check, value: "14", label: "Verified", note: "GPS and checklist", tone: "green" },
      { icon: Clock, value: "3", label: "Upcoming", note: "Next at 13:00" },
      { icon: AlertTriangle, value: "1", label: "Overdue", note: "Needs reassignment", tone: "orange" },
    ]} />
    <SplitLayout wideFirst>
      <Panel title="Today's route" description="Visits in order of their time window.">
        {inspections.length === 0 && <p className="text-sm text-muted">No visits scheduled today.</p>}
        {inspections.map((item, index) => (
          <ListRow key={item.site} onClick={() => setVisit(item)}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{index + 1}</span>
            <div className="min-w-0 flex-1"><strong className="block text-sm">{item.site}</strong><small className="text-xs text-muted">{item.officer} · {item.window}</small></div>
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
          <div className="min-w-0 flex-1"><strong className="block text-sm">{task.site}</strong><small className="text-xs text-muted">{task.detail}</small></div>
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
