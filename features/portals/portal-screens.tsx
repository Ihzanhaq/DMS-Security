"use client";

import { useState } from "react";
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Crosshair, Download, FileText, LogOut,
  MapPin, MessageSquare, Navigation, Phone, Receipt, ShieldCheck, UserRound, Users, Wallet,
} from "lucide-react";
import type { AppView, DutyChangeReason, DutyChangeRequest, DutyChangeType, GeoState, Ticket, TicketCategory, UniformRequest } from "@/types/domain";
import { complaintTrail, complaints, distanceMetres, employees, payslips, rupees, sites, sopDocuments, tickets as ticketSeed, uniformKit, uniformPlans, uniformRequests } from "@/lib/mock-data";
import { useOps } from "@/components/shared/ops-context";
import { isInsideGeofence } from "@/lib/geofence";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";
import { usePayroll } from "@/components/shared/payroll-context";
import { useOnboarding } from "@/components/shared/onboarding-context";
import { GeoMap } from "@/components/shared/geo-map";
import {
  Button, Card, DefRows, DetailDrawer, EmptyState, Field, FormGrid, FormStack, IconTile, InlineAlert,
  Input, InputAffix, KeyValue, ListRow, PageHeader, Panel, ProgressBar, Section, Select, Sheet,
  SplitLayout, StatusChip, Textarea, Timeline, useConfirm, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { downloadCsv } from "@/lib/download";
import { cn } from "@/lib/utils";

/** The guard signed in to the demo portal is posted at Lulu Mall, Kochi. */
const guardSite = sites[0];
const todayLabel = new Date(`${APP_TODAY}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

export type GuardUser = { id: string; name: string; initials: string };
export const deviceGuardUsers: GuardUser[] = [
  { id: "BMG-1840", name: "Suresh Babu", initials: "SB" },
  { id: "BMG-2118", name: "Vinod Raj", initials: "VR" },
  { id: "BMG-2087", name: "Jomon Jose", initials: "JJ" },
];

const requestTone = (status: string): StatusTone =>
  status === "approved" || status === "resolved" || status === "delivered" ? "success"
    : status === "rejected" ? "danger"
      : status === "in-progress" || status === "dispatched" ? "info"
        : "warning";
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");

export function GuardPortal({ view, onNavigate, activeGuard = deviceGuardUsers[0], onSwitchUser, onSignOut }: {
  view: AppView; onNavigate: (view: AppView) => void; activeGuard?: GuardUser; onSwitchUser?: (user: GuardUser) => void; onSignOut?: () => void;
}) {
  if (view === "guard-punch") return <GuardPunch />;
  if (view === "guard-schedule") return <GuardSchedule />;
  if (view === "guard-leave") return <RequestScreen type="leave" />;
  if (view === "guard-advance") return <RequestScreen type="advance" />;
  if (view === "guard-payslips") return <Payslips onNavigate={onNavigate} />;
  if (view === "guard-sops") return <GuardSops />;
  if (view === "guard-profile") return <GuardProfile activeGuard={activeGuard} onSwitchUser={onSwitchUser} onSignOut={onSignOut} />;
  if (view === "guard-duty-change") return <GuardDutyChange />;
  if (view === "guard-uniform") return <GuardUniform />;
  if (view === "guard-help") return <GuardHelp />;
  return <GuardHome onNavigate={onNavigate} />;
}

/* ---------------------------------- Help ---------------------------------- */

function GuardHelp() {
  const notify = useToast();
  const [category, setCategory] = useState<TicketCategory>(() => (typeof window !== "undefined" && window.sessionStorage.getItem("bmg-help-category") === "salary" ? "salary" : "other"));
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");
  const [mine, setMine] = useState<Ticket[]>(ticketSeed.filter(ticket => ticket.raisedBy === "BMG-1840"));
  const [open, setOpen] = useState<Ticket | null>(null);
  function submit() {
    if (!subject.trim()) return;
    const ticket: Ticket = { id: `TKT-${Date.now() % 100000}`, raisedBy: "BMG-1840", raisedByRole: "Guard", category, subject: subject.trim(), detail: detail.trim(), status: "open", createdOn: APP_TODAY, sla: "2026-09-25", assignee: "Meera Nair", trail: [{ title: "Raised from mobile app", time: "22 Sep · now", state: "active" }] };
    setMine(current => [ticket, ...current]);
    setSubject(""); setDetail("");
    window.sessionStorage.removeItem("bmg-help-category");
    notify(`Ticket ${ticket.id} sent to HR`);
  }
  return <>
    <PageHeader title="Help and queries" subtitle="Ask about salary, attendance, uniform or anything else. HR replies inside the ticket." />
    <SplitLayout>
      <Panel title="Ask HR a question">
        <FormStack>
          <Field label="Topic">
            <Select value={category} onChange={event => setCategory(event.target.value as TicketCategory)}>
              <option value="salary">Salary</option><option value="attendance">Attendance</option><option value="uniform">Uniform</option><option value="site-issue">Site issue</option><option value="other">Something else</option>
            </Select>
          </Field>
          <Field label="Subject" required><Input value={subject} onChange={event => setSubject(event.target.value)} placeholder="One line about the problem" /></Field>
          <Field label="Details"><Textarea rows={3} value={detail} onChange={event => setDetail(event.target.value)} placeholder="Month, amount, dates — anything that helps HR check" /></Field>
          <Button disabled={!subject.trim()} onClick={submit}><CheckCircle2 />Send to HR</Button>
        </FormStack>
      </Panel>
      <Panel title="My tickets" description="Tap a ticket to see HR's progress.">
        {mine.length === 0 && <EmptyState icon={MessageSquare} message="You haven't raised any tickets yet." />}
        {mine.map(ticket => (
          <ListRow key={ticket.id} onClick={() => setOpen(ticket)}>
            <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{ticket.subject}</strong><small className="text-xs text-muted">{ticket.id} · {formatAppDate(ticket.createdOn)}</small></div>
            <StatusChip tone={requestTone(ticket.status)}>{titleCase(ticket.status)}</StatusChip>
            <ChevronRight className="h-4 w-4 text-muted" />
          </ListRow>
        ))}
      </Panel>
    </SplitLayout>
    {open && <DetailDrawer title={open.subject} subtitle={`${open.id} · assigned to ${open.assignee}`} onClose={() => setOpen(null)}
      footer={<Button variant="outline" onClick={() => setOpen(null)}>Close</Button>}>
      <Section title="Your question"><p className="text-sm leading-relaxed">{open.detail || open.subject}</p></Section>
      <Section title="Progress"><Timeline entries={open.trail} /></Section>
    </DetailDrawer>}
  </>;
}

/* --------------------------------- Uniform -------------------------------- */

const sizeOptions = (item: string) => item.startsWith("Shirt") || item === "Sweater" || item === "Raincoat" ? ["S", "M", "L", "XL", "XXL"]
  : item === "Trousers" ? ["30", "32", "34", "36", "38"]
    : item.startsWith("Shoes") ? ["6", "7", "8", "9", "10", "11"]
      : ["Standard"];
const itemPrice = (item: string) => item.startsWith("Shoes") ? 900 : item === "Trousers" ? 550 : item.startsWith("Shirt") ? 450 : item === "Raincoat" || item === "Sweater" ? 600 : 300;

function GuardUniform() {
  const notify = useToast();
  const sizes = useOnboarding().getProfile("BMG-1840").uniformSizes;
  const [item, setItem] = useState(uniformKit[0].item);
  const [size, setSize] = useState(sizeOptions(uniformKit[0].item)[2] ?? sizeOptions(uniformKit[0].item)[0]);
  const [qty, setQty] = useState(1);
  const [plan, setPlan] = useState(uniformPlans[2].name);
  const [mine, setMine] = useState<UniformRequest[]>(uniformRequests.filter(request => request.employeeId === "BMG-1840"));
  const statusSteps: ["requested", "approved", "dispatched", "delivered"] = ["requested", "approved", "dispatched", "delivered"];
  function submit() {
    const request: UniformRequest = { id: `UR-${Date.now()}`, employeeId: "BMG-1840", items: [{ item, size, qty }], status: "requested", requestedOn: APP_TODAY, amount: itemPrice(item) * qty, recoveryPlan: plan };
    setMine(current => [request, ...current]);
    notify("Uniform request sent to the store");
  }
  return <>
    <PageHeader title="Uniform" subtitle="Request replacement pieces and track delivery. The cost is recovered using the plan you choose." />
    <SplitLayout>
      <div className="grid content-start gap-4">
        <Panel title="My sizes" description="Recorded at joining. Ask HR to correct them.">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Shirt", sizes.shirt], ["Trouser", sizes.trouser], ["Shoe", sizes.shoe]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface p-3"><strong className="block text-xl font-bold">{value}</strong><span className="text-xs text-muted">{label}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Request an item">
          <FormStack>
            <FormGrid>
              <Field label="Item"><Select value={item} onChange={event => { setItem(event.target.value); setSize(sizeOptions(event.target.value)[0]); }}>{uniformKit.map(kitItem => <option key={kitItem.item}>{kitItem.item}</option>)}</Select></Field>
              <Field label="Size"><Select value={size} onChange={event => setSize(event.target.value)}>{sizeOptions(item).map(option => <option key={option}>{option}</option>)}</Select></Field>
              <Field label="Quantity"><Input type="number" min={1} max={4} value={qty} onChange={event => setQty(Math.max(1, Math.min(4, Number(event.target.value))))} /></Field>
              <Field label="Pay by"><Select value={plan} onChange={event => setPlan(event.target.value)}>{uniformPlans.map(option => <option key={option.name}>{option.name}</option>)}</Select></Field>
            </FormGrid>
            <InlineAlert>Estimated cost <strong>{rupees(itemPrice(item) * qty)}</strong>, recovered as: {plan}.</InlineAlert>
            <Button onClick={submit}><CheckCircle2 />Send request</Button>
          </FormStack>
        </Panel>
      </div>
      <Panel title="My requests" description="Status updates appear as the store processes them.">
        {mine.length === 0 && <EmptyState icon={FileText} message="No uniform requests yet." />}
        <div className="grid gap-3">
          {mine.map(request => (
            <div key={request.id} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <strong className="text-sm">{request.items.map(line => `${line.item.split(" (")[0]} · ${line.size} ×${line.qty}`).join(", ")}</strong>
                <StatusChip tone={requestTone(request.status)}>{titleCase(request.status)}</StatusChip>
              </div>
              <Timeline entries={statusSteps.map((step, index) => {
                const reached = statusSteps.indexOf(request.status) >= index;
                const active = request.status === step && step !== "delivered";
                return { title: titleCase(step), time: reached ? (index === 0 ? formatAppDate(request.requestedOn) : "Updated") : "Pending", note: step === "dispatched" && reached ? `${rupees(request.amount)} to be recovered (${request.recoveryPlan})` : undefined, state: active ? "active" as const : reached ? "done" as const : undefined };
              })} />
            </div>
          ))}
        </div>
      </Panel>
    </SplitLayout>
  </>;
}

/* ------------------------------- Duty change ------------------------------ */

const dutyTypeLabel = (request: DutyChangeRequest) => request.type === "ot" ? `Extra duty · ${request.hours} h` : request.type === "swap" ? "Shift swap" : "Replacement cover";

function GuardDutyChange() {
  const notify = useToast();
  const [type, setType] = useState<DutyChangeType>("replacement");
  const [reason, setReason] = useState<DutyChangeReason>("sick");
  const [hours, setHours] = useState(2);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("2026-09-23");
  const [partnerId, setPartnerId] = useState("BMG-1902");
  const { dutyRequests, addDutyRequest } = useOps();
  const mine = dutyRequests.filter(request => request.employeeId === "BMG-1840");
  const [open, setOpen] = useState<DutyChangeRequest | null>(null);
  function submit() {
    const request: DutyChangeRequest = { id: `DCR-${Date.now()}`, employeeId: "BMG-1840", type, date, site: guardSite.name, reason: type === "ot" ? "other" : reason, hours: type === "ot" ? hours : undefined, partnerId: type === "swap" && partnerId ? partnerId : undefined, note, status: "pending" };
    addDutyRequest(request);
    setNote("");
    notify(type === "ot" ? "Extra duty sent for approval" : "Request sent · your field officer has been notified");
  }
  return <>
    <PageHeader title="Duty change" subtitle="Report sickness or an accident, ask for a shift swap, or record extra duty (OT)." />
    <SplitLayout>
      <Panel title="New request">
        <FormStack>
          <Field label="What do you need?">
            <Select value={type} onChange={event => setType(event.target.value as DutyChangeType)}>
              <option value="replacement">Someone to cover my duty (sick / accident)</option>
              <option value="swap">Swap my shift</option>
              <option value="ot">Record extra duty (OT)</option>
            </Select>
          </Field>
          {type !== "ot" && <Field label="Reason"><Select value={reason} onChange={event => setReason(event.target.value as DutyChangeReason)}><option value="sick">Sickness</option><option value="accident">Accident</option><option value="personal">Personal</option><option value="other">Other</option></Select></Field>}
          {type === "swap" && <Field label="Swap with"><Select value={partnerId} onChange={event => setPartnerId(event.target.value)}><option value="BMG-1902">Deepa Menon</option><option value="BMG-1988">Rajeev Kumar</option><option value="">Any available reliever</option></Select></Field>}
          {type === "ot" && <Field label="Extra hours"><InputAffix suffix="hours" type="number" min={1} max={12} value={hours} onChange={event => setHours(Number(event.target.value))} /></Field>}
          <Field label="Date"><Input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
          <Field label="Details"><Textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="What happened, and from when do you need cover?" /></Field>
          {type === "replacement" && <InlineAlert>District operations is alerted immediately so a reliever can cover your post.</InlineAlert>}
          <Button onClick={submit}><CheckCircle2 />Submit request</Button>
        </FormStack>
      </Panel>
      <Panel title="My requests" description="Tap a request to see its details.">
        {mine.length === 0 && <EmptyState icon={CalendarDays} message="You haven't made any duty change requests." />}
        {mine.map(request => (
          <ListRow key={request.id} onClick={() => setOpen(request)}>
            <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{dutyTypeLabel(request)}</strong><small className="text-xs text-muted">{formatAppDate(request.date)} · {request.note || titleCase(request.reason)}</small></div>
            <StatusChip tone={requestTone(request.status)}>{titleCase(request.status)}</StatusChip>
            <ChevronRight className="h-4 w-4 text-muted" />
          </ListRow>
        ))}
      </Panel>
    </SplitLayout>
    {open && <DetailDrawer title={dutyTypeLabel(open)} subtitle={`${open.id} · ${open.site}`} onClose={() => setOpen(null)}
      footer={<Button variant="outline" onClick={() => setOpen(null)}>Close</Button>}>
      <DefRows rows={[
        { label: "Date", value: formatAppDate(open.date) },
        { label: "Site", value: open.site },
        { label: "Reason", value: titleCase(open.reason) },
        ...(open.hours ? [{ label: "Extra hours", value: `${open.hours} h` }] : []),
        ...(open.type === "swap" ? [{ label: "Swap with", value: employees.find(item => item.id === open.partnerId)?.name ?? "Any available reliever" }] : []),
        { label: "Status", value: <StatusChip tone={requestTone(open.status)}>{titleCase(open.status)}</StatusChip> },
      ]} />
      {open.note && <Section title="Your note" className="mt-5"><p className="text-sm">{open.note}</p></Section>}
      <InlineAlert className="mt-4">{open.status === "pending" ? "Your field officer and district operations are reviewing this request." : open.status === "approved" ? "Approved. It will be reflected in your schedule and payroll." : "This request was not approved. Contact your supervisor for details."}</InlineAlert>
    </DetailDrawer>}
  </>;
}

/* ---------------------------------- Home ---------------------------------- */

function GuardHome({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { getBreakdown } = usePayroll();
  const breakdown = getBreakdown("BMG-1840");
  const eligibility = computeAdvanceEligibility({ grossEarned: breakdown.gross, deductionsToDate: breakdown.pf + breakdown.esi + breakdown.otherDeductions, alreadyRequested: 0 });
  const quickLinks: { label: string; view: AppView; icon: typeof MapPin }[] = [
    { label: "Request leave", view: "guard-leave", icon: CalendarDays },
    { label: "Salary advance", view: "guard-advance", icon: Wallet },
    { label: "Night check", view: "guard-vigilance", icon: Crosshair },
    { label: "Site SOPs", view: "guard-sops", icon: FileText },
    { label: "Duty change", view: "guard-duty-change", icon: Users },
    { label: "Payslips", view: "guard-payslips", icon: Receipt },
  ];
  return <>
    <PageHeader title="Today's duty" subtitle={`${todayLabel} · ${guardSite.name}`} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Day shift"
        description="Loading bay · Gate 2 · 1.00 duty"
        className="border-emerald/45 bg-emerald/[0.04] shadow-md ring-1 ring-emerald/20"
        action={<StatusChip tone="success">Today</StatusChip>}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Shift window</p>
        <strong className="mt-1 block text-4xl font-bold tabular-nums tracking-tight text-foreground">08:00–20:00</strong>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-emerald" />
          <span className="min-w-0">
            <span className="block font-medium text-foreground">{guardSite.name}</span>
            <small className="text-xs text-muted">{guardSite.polygon ? `Site boundary · ${guardSite.polygon.length} corners` : `Within ${guardSite.radius} m of the post`}</small>
          </span>
        </div>
        <Button size="lg" className="mt-4 w-full" onClick={() => onNavigate("guard-punch")}><Navigation />Punch in</Button>
      </Panel>
      <Panel title="Last approved payroll" description="August 2026">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [breakdown.duties.toFixed(2), "Duties"],
            [rupees(breakdown.gross), "Earned"],
            [rupees(eligibility.maxAdvance), "Advance limit"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-3">
              <strong className="block text-lg font-bold tabular-nums text-foreground">{value}</strong>
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Services">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickLinks.map(link => (
            <button key={link.view} type="button" onClick={() => onNavigate(link.view)} className="flex flex-col items-start gap-2 rounded-xl border border-border p-3 text-left text-sm font-medium hover:border-emerald hover:bg-emerald/5">
              <IconTile icon={link.icon} />{link.label}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Emergency contacts" description={`For ${guardSite.name}`}>
        {guardSite.escalationContacts.length === 0 && <p className="text-sm text-muted">No site contacts set. Call the BMG control room.</p>}
        {guardSite.escalationContacts.map(contact => (
          <a key={contact.label} href={`tel:${contact.phone.replace(/\s/g, "")}`} aria-label={`Call ${contact.label}, ${contact.name} · ${contact.phone}`}
            className="group flex items-center gap-3 rounded-lg border-t border-border py-3 first:border-t-0 hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
            <span className="min-w-0 flex-1"><strong className="block text-sm font-medium">{contact.label}</strong><small className="text-xs text-muted">{contact.name}</small></span>
            <b className="text-sm tabular-nums text-emerald">{contact.phone}</b>
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald transition-colors group-hover:bg-emerald group-hover:text-white"><Phone className="h-4 w-4" /></span>
          </a>
        ))}
      </Panel>
    </div>
  </>;
}

/* ---------------------------------- Punch --------------------------------- */

function GuardPunch() {
  const notify = useToast();
  const [geo, setGeo] = useState<GeoState>("idle");
  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [punchedAt, setPunchedAt] = useState<string | null>(null);

  function locate() {
    setGeo("locating");
    if (!navigator.geolocation) { setGeo("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      result => {
        const here = { lat: result.coords.latitude, lng: result.coords.longitude };
        setPosition({ ...here, accuracy: Math.round(result.coords.accuracy) });
        setDistance(distanceMetres(here, guardSite));
        // Inside is a boundary test, not an accuracy test; the polygon wins over the radius when configured.
        setGeo(isInsideGeofence(here, guardSite) ? "inside" : "outside");
      },
      error => setGeo(error.code === 1 ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  const state: Record<GeoState, { label: string; tone: "emerald" | "warn" | "danger" | "navy" }> = {
    idle: { label: "Location not checked yet", tone: "navy" },
    locating: { label: "Finding your location…", tone: "navy" },
    inside: { label: "You are inside the site boundary", tone: "emerald" },
    outside: { label: "You are outside the site boundary", tone: "danger" },
    denied: { label: "Location permission was denied", tone: "danger" },
    unavailable: { label: "Location is unavailable", tone: "warn" },
  };
  const current = state[geo];

  const punch = () => {
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    setPunchedAt(time);
    notify(`Punched in at ${time}`);
  };

  return <>
    <PageHeader title="Punch in" subtitle={`${guardSite.name} · Loading bay · 08:00–20:00`} />
    <SplitLayout>
      <Panel title="Site boundary" flush>
        <GeoMap center={guardSite} radius={guardSite.radius} polygon={guardSite.polygon} guard={position} guardInside={geo === "inside"} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-xs text-muted">
          <span>Boundary <b className="text-foreground">{guardSite.polygon ? `${guardSite.polygon.length}-corner area` : `${guardSite.radius} m radius`}</b></span>
          {distance !== null && <span>Distance to centre <b className="text-foreground">{distance} m</b></span>}
        </div>
      </Panel>
      <Panel title="Step 1 · Check your location" description="Your browser will ask for location permission.">
        <FormStack>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <IconTile icon={Crosshair} tone={current.tone} />
            <div>
              <strong className="block text-sm font-medium">{current.label}</strong>
              <small className="text-xs text-muted">{position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} · ±${position.accuracy} m` : "Location is only used as attendance evidence."}</small>
            </div>
          </div>
          {distance !== null && <DefRows rows={[
            { label: "Distance from post", value: `${distance} m`, mono: true },
            { label: "Allowed radius", value: `${guardSite.radius} m`, mono: true },
            { label: "GPS accuracy", value: `±${position?.accuracy ?? 0} m`, mono: true },
          ]} />}
          <Button variant="outline" onClick={locate} disabled={geo === "locating"}><Crosshair />{geo === "locating" ? "Locating…" : position ? "Check again" : "Check my location"}</Button>
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-semibold">Step 2 · Punch in</p>
            <Button className="w-full" size="lg" disabled={geo !== "inside" || Boolean(punchedAt)} onClick={punch}><CheckCircle2 />{punchedAt ? `Punched in at ${punchedAt}` : "Punch in"}</Button>
            {geo !== "inside" && !punchedAt && <small className="mt-1 block text-xs text-muted">Available once your location is inside the boundary.</small>}
          </div>
          {geo === "outside" && distance !== null && <InlineAlert tone="warning">{guardSite.polygon ? "Move inside the marked area, or ask your supervisor to record a manual punch." : `You are ${distance - guardSite.radius} m outside the boundary. Move closer to the post, or ask your supervisor to record a manual punch.`}</InlineAlert>}
          {position && position.accuracy > 50 && geo === "inside" && <InlineAlert tone="warning">GPS accuracy is ±{position.accuracy} m (limit 50 m). This punch will be flagged for review.</InlineAlert>}
          <InlineAlert>Presence checks every <b>{guardSite.dayCheckIntervalMins} min</b> (day) and <b>{guardSite.nightCheckIntervalMins} min</b> (night). Late-arrival grace: <b>{guardSite.graceMins} min</b>.</InlineAlert>
        </FormStack>
      </Panel>
    </SplitLayout>
  </>;
}

/* -------------------------------- Schedule -------------------------------- */

const scheduleDays = [
  { date: "22 Sep", site: "Lulu Mall, Kochi", window: "08:00–20:00", state: "Today", post: "Loading bay · Gate 2", duty: "1.00" },
  { date: "23 Sep", site: "Lulu Mall, Kochi", window: "08:00–20:00", state: "Scheduled", post: "Loading bay · Gate 2", duty: "1.00" },
  { date: "24 Sep", site: "Weekly off", window: "—", state: "Off", post: "—", duty: "0.00" },
  { date: "25 Sep", site: "Aster Medcity", window: "08:00–14:00", state: "Half duty", post: "Emergency · Front desk", duty: "0.50" },
];
const scheduleTone = (state: string): StatusTone => state === "Today" ? "success" : state === "Off" ? "neutral" : "info";

function GuardSchedule() {
  const [open, setOpen] = useState<(typeof scheduleDays)[number] | null>(null);
  return <>
    <PageHeader title="My schedule" subtitle="September 2026 · approved roster" />
    <Panel title="Upcoming duties" description="Tap a day for post and reporting details.">
      {scheduleDays.map(row => (
        <ListRow key={row.date} onClick={() => setOpen(row)}>
          <span className="w-14 shrink-0 text-sm font-bold tabular-nums">{row.date}</span>
          <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{row.site}</strong><small className="text-xs text-muted">{row.window}</small></div>
          <StatusChip tone={scheduleTone(row.state)}>{row.state}</StatusChip>
          <ChevronRight className="h-4 w-4 text-muted" />
        </ListRow>
      ))}
    </Panel>
    {open && <DetailDrawer title={open.date} subtitle={open.site} onClose={() => setOpen(null)}
      footer={<Button variant="outline" onClick={() => setOpen(null)}>Close</Button>}>
      <Section title="Duty">
        <DefRows rows={[
          { label: "Site", value: open.site },
          { label: "Post", value: open.post },
          { label: "Shift", value: open.window, mono: true },
          { label: "Duty value", value: open.duty, mono: true },
          { label: "Status", value: <StatusChip tone={scheduleTone(open.state)}>{open.state}</StatusChip> },
        ]} />
      </Section>
      {open.state !== "Off" && <Section title="Reporting">
        <DefRows rows={[
          { label: "Report by", value: open.window.split("–")[0], mono: true },
          { label: "Allowed radius", value: `${guardSite.radius} m`, mono: true },
          { label: "Supervisor", value: "Niyas P" },
        ]} />
      </Section>}
    </DetailDrawer>}
  </>;
}

/* ---------------------------- Leave and advance --------------------------- */

function RequestScreen({ type }: { type: "leave" | "advance" }) {
  const notify = useToast();
  const [sent, setSent] = useState(false);
  const [amount, setAmount] = useState(1500);
  const advance = type === "advance";
  const { getBreakdown } = usePayroll();
  const breakdown = getBreakdown("BMG-1840");
  const deductions = breakdown.pf + breakdown.esi + breakdown.otherDeductions;
  const eligibility = computeAdvanceEligibility({ grossEarned: breakdown.gross, deductionsToDate: deductions, alreadyRequested: 0 });
  const overLimit = advance && amount > eligibility.maxAdvance;
  function submit() { setSent(true); notify(advance ? "Advance request sent to HR" : "Leave request sent to your supervisor"); }
  return <>
    <PageHeader title={advance ? "Salary advance" : "Request leave"} subtitle={advance ? `You can request up to ${rupees(eligibility.maxAdvance)} this month.` : "Your supervisor and HR receive this request."} />
    <div className="max-w-xl">
      <Card className="p-4 sm:p-5">
        {sent ? <InlineAlert tone="success">{advance ? `Your request for ${rupees(amount)} has been sent to HR.` : "Your leave request has been sent."} You’ll be notified when it’s reviewed.</InlineAlert> : <FormStack>
          {advance ? <>
            <Field label="Amount" required><InputAffix prefix="₹" type="number" min={1} value={amount} onChange={event => setAmount(Number(event.target.value))} /></Field>
            <Field label="Reason"><Select><option>Personal expense</option><option>Medical</option><option>Emergency</option></Select></Field>
            <div className="rounded-xl border border-border bg-surface p-3">
              <KeyValue label="Earned this month" value={rupees(breakdown.gross)} />
              <KeyValue label="Deductions so far" value={`− ${rupees(deductions)}`} />
              <KeyValue label="Your limit (40%)" value={rupees(eligibility.maxAdvance)} />
              <div className="mt-2"><ProgressBar value={eligibility.maxAdvance > 0 ? Math.min(100, amount / eligibility.maxAdvance * 100) : 100} tone={overLimit ? "danger" : "emerald"} /></div>
            </div>
            {overLimit && <InlineAlert tone="danger">That’s more than your {rupees(eligibility.maxAdvance)} limit. Reduce the amount to continue.</InlineAlert>}
          </> : <>
            <Field label="Leave type"><Select><option>Casual leave</option><option>Sick leave</option></Select></Field>
            <FormGrid>
              <Field label="From" required><Input type="date" defaultValue="2026-09-28" /></Field>
              <Field label="To" required><Input type="date" defaultValue="2026-09-29" /></Field>
            </FormGrid>
            <Field label="Reason"><Textarea rows={3} placeholder="Optional" /></Field>
            <InlineAlert>If your post would be left empty, district operations is notified so a reliever can be assigned.</InlineAlert>
          </>}
          <Button disabled={overLimit || (advance && amount <= 0)} onClick={submit}><CheckCircle2 />Submit request</Button>
        </FormStack>}
      </Card>
    </div>
  </>;
}

/* -------------------------------- Payslips -------------------------------- */

function Payslips({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const notify = useToast();
  const [open, setOpen] = useState<(typeof payslips)[number] | null>(null);
  const askAboutPayslip = () => {
    window.sessionStorage.setItem("bmg-help-category", "salary");
    setOpen(null);
    onNavigate("guard-help");
  };
  const download = (slip: (typeof payslips)[number]) => {
    downloadCsv(`payslip-${slip.month.replace(/\s+/g, "-").toLowerCase()}`, ["Line", "Type", "Amount"], [
      ...slip.earnings.map(line => [line.label, "Earning", line.amount]),
      ...slip.deductions.map(line => [line.label, "Deduction", -line.amount]),
      ["Net paid", "Total", slip.net],
    ]);
    notify(`${slip.month} payslip downloaded`);
  };
  return <>
    <PageHeader title="Payslips" subtitle="Your monthly earnings and deductions." />
    <Panel title="Recent payslips">
      {payslips.length === 0 && <EmptyState icon={Receipt} message="No payslips yet." />}
      {payslips.map(slip => (
        <ListRow key={slip.month} onClick={() => setOpen(slip)}>
          <IconTile icon={Receipt} />
          <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{slip.month}</strong><small className="text-xs text-muted">Paid by bank transfer</small></div>
          <b className="text-sm tabular-nums">{rupees(slip.net)}</b>
          <ChevronRight className="h-4 w-4 text-muted" />
        </ListRow>
      ))}
    </Panel>
    {open && <DetailDrawer title={`${open.month} payslip`} subtitle="Suresh Babu · BMG-1840" onClose={() => setOpen(null)}
      footer={<>
        <Button variant="outline" onClick={askAboutPayslip}>Ask HR about this</Button>
        <Button onClick={() => download(open)}><Download />Download</Button>
      </>}>
      <div className="mb-4 flex items-start justify-between rounded-xl bg-surface p-3 text-sm">
        <div><strong className="block font-medium">BMG Security</strong><small className="text-xs text-muted">Lulu Mall, Kochi · PF + ESI</small></div>
        <div className="text-right"><strong className="block font-medium">{open.month}</strong><small className="text-xs text-muted">{open.duties} duties</small></div>
      </div>
      <Section title="Earnings">
        <DefRows rows={[
          ...open.earnings.map(line => ({ label: line.label, value: rupees(line.amount), mono: true })),
          { label: "Gross earnings", value: rupees(open.earnings.reduce((sum, line) => sum + line.amount, 0)), mono: true, total: true },
        ]} />
      </Section>
      <Section title="Deductions">
        <DefRows rows={[
          ...open.deductions.map(line => ({ label: line.label, value: `− ${rupees(line.amount)}`, mono: true })),
          { label: "Total deductions", value: `− ${rupees(open.deductions.reduce((sum, line) => sum + line.amount, 0))}`, mono: true, total: true },
        ]} />
      </Section>
      <div className="flex items-center justify-between rounded-xl bg-emerald/10 px-4 py-3">
        <span className="text-sm font-medium">Net paid</span><strong className="text-xl font-bold text-emerald tabular-nums">{rupees(open.net)}</strong>
      </div>
    </DetailDrawer>}
  </>;
}

/* ---------------------------------- SOPs ---------------------------------- */

function GuardSops() {
  const notify = useToast();
  const [open, setOpen] = useState<(typeof sopDocuments)[number] | null>(null);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  // A guard sees the instructions for the sites they are rostered to.
  const mine = sopDocuments.filter(doc => doc.site.startsWith("Lulu Mall") || doc.category === "Apartments" || doc.category === "Hotel");
  const isDone = (doc: (typeof sopDocuments)[number]) => acknowledged.includes(doc.title) || doc.state === "Complete";

  return <>
    <PageHeader title="Site SOPs" subtitle="Current instructions for the sites you are posted to. Read and confirm each one." />
    {mine.length === 0 && <EmptyState icon={FileText} message="No SOPs for your sites yet." />}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {mine.map(doc => {
        const done = isDone(doc);
        return (
          <article key={doc.title} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm" data-enter>
            <div className="mb-3 flex items-start justify-between gap-2"><IconTile icon={FileText} /><StatusChip tone={done ? "success" : "warning"}>{done ? "Confirmed" : "Needs reading"}</StatusChip></div>
            <h3 className="text-sm font-semibold">{doc.title}</h3>
            <p className="mt-1 text-xs text-muted">{doc.site} · version {doc.version}</p>
            <p className="mt-1 text-xs text-muted">Effective {doc.effective} · {doc.sections.length} sections</p>
            <Button className="mt-4" variant={done ? "outline" : "default"} onClick={() => setOpen(doc)}>{done ? "Read again" : "Read SOP"}</Button>
          </article>
        );
      })}
    </div>
    {open && <DetailDrawer title={open.title} subtitle={`${open.site} · version ${open.version} · effective ${open.effective}`} onClose={() => setOpen(null)}
      footer={<>
        <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
        {!isDone(open) && <Button onClick={() => { setAcknowledged(current => [...current, open.title]); notify(`${open.title} confirmed`); setOpen(null); }}><CheckCircle2 />I have read and understood</Button>}
      </>}>
      {open.sections.map(section => (
        <Section key={section.heading} title={section.heading}>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">{section.steps.map(step => <li key={step}>{step}</li>)}</ol>
        </Section>
      ))}
    </DetailDrawer>}
  </>;
}

/* --------------------------------- Profile -------------------------------- */

function GuardProfile({ activeGuard, onSwitchUser, onSignOut }: { activeGuard: GuardUser; onSwitchUser?: (user: GuardUser) => void; onSignOut?: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("Phone number");
  const [switching, setSwitching] = useState(false);
  const [otherId, setOtherId] = useState("");
  const me = employees.find(item => item.id === activeGuard.id);
  const pickUser = (user: GuardUser) => {
    setSwitching(false);
    onSwitchUser?.(user);
  };
  const signOut = async () => {
    if (await confirm({ title: "Sign out?", description: "You'll need to sign in again to punch attendance or view payslips.", confirmLabel: "Sign out" })) onSignOut?.();
  };
  const phone = me?.phone ?? "98470 12840";
  return <>
    <PageHeader title="My profile" subtitle={`${activeGuard.id} · ${me?.role ?? "Security officer"}`} />
    <SplitLayout>
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">{activeGuard.initials}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{activeGuard.name}</h2>
            <p className="text-sm text-muted"><a className="text-emerald hover:underline" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a> · {me?.district ?? "Ernakulam"}</p>
          </div>
          <StatusChip tone="success">Active</StatusChip>
        </div>
        <KeyValue label="Current site" value="Lulu Mall, Kochi" />
        <KeyValue label="Payment method" value="Bank transfer" />
        <KeyValue label="Benefits" value="PF + ESI" />
        <KeyValue label="Uniform balance due" value="₹800" />
        <KeyValue label="Skills" value={(me?.skills ?? ["General security", "Day book"]).join(", ")} />
        <KeyValue label="Joined" value={formatAppDate(me?.joiningDate ?? "2024-03-14")} />
      </Panel>
      <Panel title="Account">
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={() => setOpen(true)}><UserRound />Request a correction to my details</Button>
          <Button variant="outline" className="justify-start" onClick={() => setSwitching(true)}><Users />Switch guard on this device</Button>
          <Button variant="ghost" className="justify-start text-status-danger hover:bg-status-danger/10" onClick={signOut}><LogOut />Sign out</Button>
        </div>
        <p className="mt-3 text-xs text-muted">Use “Switch guard” when several guards share one phone at a post.</p>
      </Panel>
    </SplitLayout>

    <Sheet open={switching} title="Who is using this device?" subtitle="Shared-device mode" onClose={() => setSwitching(false)} side="center">
      <div className="grid gap-2">
        {deviceGuardUsers.map(user => (
          <button key={user.id} type="button" onClick={() => pickUser(user)}
            className={cn("flex items-center gap-3 rounded-xl border p-3 text-left hover:border-emerald hover:bg-emerald/5", user.id === activeGuard.id ? "border-emerald" : "border-border")}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{user.initials}</span>
            <span className="flex-1"><strong className="block text-sm font-medium">{user.name}</strong><small className="text-xs text-muted">{user.id}{user.id === activeGuard.id ? " · using now" : ""}</small></span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </button>
        ))}
        <div className="mt-2 border-t border-border pt-3">
          <Field label="Someone else? Enter their employee ID">
            <div className="flex gap-2">
              <Input value={otherId} onChange={event => setOtherId(event.target.value)} placeholder="e.g. BMG-2274" />
              <Button className="h-11 shrink-0" disabled={!otherId.trim()} onClick={() => {
                const found = employees.find(item => item.id.toLowerCase() === otherId.trim().toLowerCase());
                if (!found) { notify({ message: "No employee with that ID", kind: "error" }); return; }
                pickUser({ id: found.id, name: found.name, initials: found.initials });
              }}>Continue</Button>
            </div>
          </Field>
        </div>
      </div>
    </Sheet>

    {open && <DetailDrawer title="Request a correction" subtitle="HR reviews every change before it is applied" onClose={() => setOpen(false)}
      footer={<>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button onClick={() => { setOpen(false); notify("Correction request sent to HR"); }}><CheckCircle2 />Send to HR</Button>
      </>}>
      <FormStack>
        <Field label="What needs changing?"><Select value={field} onChange={event => setField(event.target.value)}><option>Phone number</option><option>Bank account</option><option>Address</option><option>Emergency contact</option></Select></Field>
        <Field label="Correct value" required><Input placeholder={field === "Phone number" ? "98470 12840" : "Enter the correct detail"} /></Field>
        <Field label="Reason"><Input placeholder="Why this needs to change" /></Field>
        {field === "Bank account" && <InlineAlert>Bank changes need a cancelled cheque or passbook photo handed to your supervisor.</InlineAlert>}
      </FormStack>
    </DetailDrawer>}
  </>;
}

/* ------------------------------ Client portal ----------------------------- */

export function ClientPortal({ view, onNavigate }: { view: AppView; onNavigate: (view: AppView) => void }) {
  return <ClientPortalBody view={view} onNavigate={onNavigate} />;
}

function ClientPortalBody({ view, onNavigate }: { view: AppView; onNavigate: (view: AppView) => void }) {
  const [site, setSite] = useState<(typeof sites)[number] | null>(null);
  const [complaint, setComplaint] = useState<(typeof complaints)[number] | null>(null);
  const clientSites = sites.slice(0, 2);
  const clientComplaints = complaints.slice(0, 3);

  if (view === "client-sites") return <>
    <PageHeader title="My sites" subtitle="Lulu Group · Kerala operations" />
    {clientSites.length === 0 && <EmptyState icon={MapPin} message="No sites are linked to your account yet." />}
    <div className="grid gap-3 sm:grid-cols-2">
      {clientSites.map(item => (
        <article key={item.name} className="rounded-2xl border border-border bg-card p-4 shadow-sm" data-enter>
          <div className="mb-3 flex items-start gap-3">
            <IconTile icon={MapPin} />
            <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.name}</h3><p className="text-xs text-muted">{item.district}</p></div>
            <StatusChip tone={item.coverage === 100 ? "success" : "warning"}>{item.coverage}% covered</StatusChip>
          </div>
          <KeyValue label="Posts staffed" value={`${item.staffed} of ${item.posts}`} />
          <KeyValue label="Today" value={item.coverage === 100 ? "Fully staffed" : "Cover being arranged"} />
          <Button variant="outline" className="mt-3 w-full" onClick={() => setSite(item)}>View coverage</Button>
        </article>
      ))}
    </div>
    {site && <DetailDrawer title={site.name} subtitle={`${site.client} · ${site.district}`} onClose={() => setSite(null)}
      footer={<Button variant="outline" onClick={() => setSite(null)}>Close</Button>}>
      <Section title="Coverage today">
        <DefRows rows={[
          { label: "Contracted posts", value: site.posts, mono: true },
          { label: "Staffed now", value: site.staffed, mono: true },
          { label: "Open posts", value: site.posts - site.staffed, mono: true },
          { label: "Coverage", value: `${site.coverage}%`, mono: true, total: true },
        ]} />
        <div className="mt-3"><ProgressBar value={site.coverage} tone={site.coverage === 100 ? "emerald" : "warn"} /></div>
      </Section>
      <Section title="By shift">
        <DefRows rows={[
          { label: "Day shift", value: `${Math.round(site.staffed * 0.6)} on post`, mono: true },
          { label: "Night shift", value: `${site.staffed - Math.round(site.staffed * 0.6)} on post`, mono: true },
          { label: "Field officer visits", value: "2 this week", mono: true },
        ]} />
      </Section>
      {site.coverage < 100 && <InlineAlert tone="warning">{site.posts - site.staffed} post{site.posts - site.staffed === 1 ? " is" : "s are"} open. District operations is assigning a reliever.</InlineAlert>}
    </DetailDrawer>}
  </>;

  if (view === "client-complaints") return <>
    <PageHeader title="Complaints" subtitle="Report a service issue and follow its progress." actions={<Button onClick={() => onNavigate("complaint-form")}><AlertTriangle />Report an issue</Button>} />
    <Panel title="Your complaints">
      {clientComplaints.length === 0 && <EmptyState icon={AlertTriangle} message="You haven't reported any issues." actionLabel="Report an issue" onAction={() => onNavigate("complaint-form")} />}
      {clientComplaints.map(item => (
        <ListRow key={item.id} onClick={() => setComplaint(item)}>
          <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{item.issue}</strong><small className="text-xs text-muted">{item.id} · {item.owner} · due {item.due}</small></div>
          <StatusChip tone={item.state === "Resolved" ? "success" : "info"}>{item.state}</StatusChip>
          <ChevronRight className="h-4 w-4 text-muted" />
        </ListRow>
      ))}
    </Panel>
    {complaint && <DetailDrawer title={complaint.id} subtitle={complaint.client} onClose={() => setComplaint(null)}
      footer={<Button variant="outline" onClick={() => setComplaint(null)}>Close</Button>}>
      <Section title="Your complaint">
        <p className="mb-3 text-sm leading-relaxed">{complaint.issue}</p>
        <DefRows rows={[
          { label: "Status", value: <StatusChip tone={complaint.state === "Resolved" ? "success" : "info"}>{complaint.state}</StatusChip> },
          { label: "Assigned to", value: complaint.owner },
          { label: "Resolution due", value: complaint.due, mono: true },
        ]} />
      </Section>
      <Section title="Progress"><Timeline entries={complaintTrail[complaint.id] ?? []} /></Section>
    </DetailDrawer>}
  </>;

  if (view === "client-coverage") return <>
    <PageHeader title="Coverage" subtitle="Staffing across your contracted posts." />
    <Panel title="September coverage">
      <strong className="block text-4xl font-bold text-emerald tabular-nums">98.4%</strong>
      <div className="my-3"><ProgressBar value={98.4} /></div>
      <p className="text-sm text-muted">Two of 126 scheduled post duties needed a replacement guard this month.</p>
    </Panel>
  </>;

  return <>
    <PageHeader title="Lulu Group" subtitle="Security operations overview" />
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl bg-navy p-5 text-white shadow-sm" data-enter>
        <ShieldCheck className="h-6 w-6 text-emerald" />
        <strong className="mt-3 block text-4xl font-bold tabular-nums">100%</strong>
        <span className="text-sm text-white/70">Posts covered today</span>
        <Button variant="link" className="mt-2 h-auto px-0 text-emerald" onClick={() => onNavigate("client-coverage")}>View coverage details</Button>
      </section>
      <Panel title="Current operations">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["18", "Active posts"], ["22", "Guards"], ["0", "Open vacancies"]].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-surface p-3"><strong className="block text-xl font-bold">{value}</strong><span className="text-xs text-muted">{label}</span></div>
          ))}
        </div>
      </Panel>
      <Panel title="Quick actions">
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={() => onNavigate("complaint-form")}><AlertTriangle />Report an issue</Button>
          <Button variant="outline" className="justify-start" onClick={() => onNavigate("client-sites")}><MapPin />View my sites</Button>
        </div>
      </Panel>
    </div>
  </>;
}
