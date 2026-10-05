"use client";

import { Fragment, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronRight, ClipboardList, Download, FileSpreadsheet,
  FileText, Plus, Settings, Upload, Users, X,
} from "lucide-react";
import {
  attendanceRows, complaintTrail, complaints, deductionLog, employees,
  exportTemplates, lateAndAbsent, payrollRows, rupees, sites, sopDocuments, uniformPlans,
} from "@/lib/mock-data";
import { applyTemplate } from "@/lib/export-mapper";
import { downloadCsv } from "@/lib/download";
import { useOnboarding } from "@/components/shared/onboarding-context";
import { AddItemRow } from "@/components/shared/add-item-row";
import type { CustomFieldDef, ExportColumn, ExportTemplate } from "@/types/domain";
import {
  Button, DataTable, DefRows, DetailDrawer, EmptyState, Field, FilterChips, FormGrid, FormStack, IconTile,
  InlineAlert, Input, InputAffix, ListFilterRow, PageHeader, Panel, SearchBar, Section, Select, StatStrip,
  StatusChip, Stepper, Textarea, Timeline, ToggleRow, useConfirm, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { NAV } from "@/lib/labels";
import { cn } from "@/lib/utils";

/* -------------------------------- Complaints ------------------------------- */

type Complaint = (typeof complaints)[number];
const priorityTone = (priority: string): StatusTone => priority === "High" ? "danger" : priority === "Medium" ? "warning" : "neutral";
const complaintFilters = [
  { id: "all", label: "All" },
  { id: "Investigating", label: "Investigating" },
  { id: "Assigned", label: "Assigned" },
  { id: "Resolved", label: "Resolved" },
] as const;

export function ComplaintsScreen({ onCreate }: { onCreate: () => void }) {
  const notify = useToast();
  const [filter, setFilter] = useState<(typeof complaintFilters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Complaint | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);
  const stateOf = (item: Complaint) => resolved.includes(item.id) ? "Resolved" : item.state;
  const q = query.trim().toLowerCase();
  const rows = complaints.filter(item => (filter === "all" || stateOf(item) === filter)
    && (!q || [item.id, item.client, item.issue, item.owner].some(value => value.toLowerCase().includes(q))));
  const openRows = complaints.filter(item => stateOf(item) !== "Resolved");

  return <>
    <PageHeader title={NAV.complaints} subtitle="Client complaints with SLA tracking, investigation and verified closure."
      actions={<Button onClick={onCreate}><Plus />Log complaint</Button>} />
    <StatStrip items={[
      { icon: ClipboardList, value: String(openRows.length), label: "Open", note: `Across ${new Set(openRows.map(item => item.client)).size} sites` },
      { icon: AlertTriangle, value: String(openRows.filter(item => item.priority === "High").length), label: "High priority", note: "4-hour SLA", tone: "red" },
      { icon: CheckCircle2, value: "91%", label: "Closed on time", note: "Last 30 days", tone: "green" },
      { icon: Users, value: "2", label: "Withdrawals", note: "Waiting for HR review", tone: "orange" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by ID, site, issue or owner" />
    <ListFilterRow>
      <FilterChips options={[...complaintFilters]} value={filter} onChange={setFilter} />
      <span className="text-xs text-muted">{rows.length} of {complaints.length} complaints</span>
    </ListFilterRow>
    <Panel flush>
      <DataTable rows={rows} rowKey={row => row.id} onRowClick={setOpen}
        empty={<div className="p-4"><EmptyState icon={ClipboardList} message="No complaints match these filters." actionLabel="Clear filters" onAction={() => { setFilter("all"); setQuery(""); }} /></div>}
        columns={[
          { header: "Complaint", cell: row => <span><strong className="block text-sm">{row.issue}</strong><small className="text-xs text-muted">{row.id}</small></span> },
          { header: "Site", cell: row => row.client },
          { header: "Owner", cell: row => row.owner, hideOnMobile: true },
          { header: "SLA due", cell: row => row.due },
          { header: "Priority", cell: row => <StatusChip tone={priorityTone(row.priority)}>{row.priority}</StatusChip> },
          { header: "Status", cell: row => <StatusChip tone={stateOf(row) === "Resolved" ? "success" : "info"}>{stateOf(row)}</StatusChip> },
        ]} />
    </Panel>
    {open && <ComplaintDrawer complaint={open} state={stateOf(open)} onClose={() => setOpen(null)}
      onResolve={() => { setResolved(current => [...current, open.id]); setOpen(null); notify(`${open.id} closed`); }} />}
  </>;
}

function ComplaintDrawer({ complaint, state, onClose, onResolve }: { complaint: Complaint; state: string; onClose: () => void; onResolve: () => void }) {
  const confirm = useConfirm();
  const [reason, setReason] = useState("Resolved with the client");
  const [note, setNote] = useState("");
  const trail = complaintTrail[complaint.id] ?? [];
  const closed = state === "Resolved";
  const withdrawal = reason === "Guard withdrawn from site";
  const close = async () => {
    const ok = await confirm(withdrawal
      ? { title: "Close with guard withdrawal?", description: "The guard is withdrawn from the site and a one-time ₹500 penalty is created for payroll. This can't be undone from here.", confirmLabel: "Close and apply penalty", destructive: true }
      : { title: `Close ${complaint.id}?`, description: `Closure reason: ${reason}. The client is notified.`, confirmLabel: "Close complaint" });
    if (ok) onResolve();
  };

  return <DetailDrawer title={complaint.issue} subtitle={`${complaint.id} · ${complaint.client}`} onClose={onClose}
    footer={closed ? <Button variant="outline" onClick={onClose}>Close</Button> : <>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button variant={withdrawal ? "destructive" : "default"} onClick={close}><CheckCircle2 />Close complaint</Button>
    </>}>
    <Section title="Details">
      <DefRows rows={[
        { label: "Status", value: <StatusChip tone={closed ? "success" : "info"}>{state}</StatusChip> },
        { label: "Priority", value: <StatusChip tone={priorityTone(complaint.priority)}>{complaint.priority}</StatusChip> },
        { label: "Owner", value: complaint.owner },
        { label: "SLA due", value: complaint.due, mono: true },
      ]} />
    </Section>
    {!closed && complaint.priority === "High" && <InlineAlert tone="warning" className="mb-5">If this isn't closed by {complaint.due}, it breaches SLA and escalates to district operations and HR.</InlineAlert>}
    <Section title="Investigation trail">{trail.length ? <Timeline entries={trail} /> : <p className="text-sm text-muted">No updates yet.</p>}</Section>
    {!closed && <Section title="Close this complaint">
      <FormStack>
        <Field label="Findings"><Textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Evidence and the corrective action taken" /></Field>
        <Field label="Closure reason">
          <Select value={reason} onChange={event => setReason(event.target.value)}>
            <option>Resolved with the client</option>
            <option>Guard counselled, no withdrawal</option>
            <option>Guard withdrawn from site</option>
            <option>Not attributable to BMG</option>
          </Select>
        </Field>
        {withdrawal && <InlineAlert tone="warning">A verified withdrawal applies a one-time ₹500 penalty. It is never charged twice for the same complaint, even after reinstatement.</InlineAlert>}
      </FormStack>
    </Section>}
  </DetailDrawer>;
}

/* ---------------------------------- SOPs ---------------------------------- */

export function SopsScreen({ onCreate }: { onCreate: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState<(typeof sopDocuments)[number] | null>(null);
  const publish = async (doc: (typeof sopDocuments)[number]) => {
    if (!await confirm({ title: `Send ${doc.title} to guards?`, description: `Every guard posted at ${doc.site} receives an acknowledgement task for version ${doc.version}.`, confirmLabel: "Send to guards" })) return;
    notify("SOP sent to guards");
    setOpen(null);
  };
  return <>
    <PageHeader title={NAV.sops} subtitle="Versioned post instructions that guards must read and acknowledge." actions={<Button onClick={onCreate}><Plus />New SOP</Button>} />
    {sopDocuments.length === 0 && <EmptyState icon={FileText} message="No SOPs yet." actionLabel="New SOP" onAction={onCreate} />}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sopDocuments.map(doc => (
        <article key={doc.title} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm" data-enter>
          <div className="mb-3 flex items-start justify-between gap-2"><IconTile icon={FileText} /><StatusChip tone={doc.state === "Complete" ? "success" : "warning"}>{doc.state === "Complete" ? "All acknowledged" : "Acknowledgements pending"}</StatusChip></div>
          <h3 className="text-sm font-semibold">{doc.title}</h3>
          <p className="mt-1 text-xs text-muted">{doc.site} · {doc.category}</p>
          <div className="mt-3 flex justify-between text-xs"><span className="text-muted">Version {doc.version}</span><span><span className="text-muted">Acknowledged </span><strong>{doc.ack}</strong></span></div>
          <Button variant="outline" className="mt-4" onClick={() => setOpen(doc)}>View SOP</Button>
        </article>
      ))}
    </div>
    {open && <DetailDrawer title={open.title} subtitle={`${open.site} · version ${open.version} · effective ${open.effective} · ${open.ack} acknowledged`} onClose={() => setOpen(null)}
      footer={<>
        <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
        <Button onClick={() => publish(open)}>Send to guards</Button>
      </>}>
      {open.sections.map(section => (
        <Section key={section.heading} title={section.heading}>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">{section.steps.map(step => <li key={step}>{step}</li>)}</ol>
        </Section>
      ))}
    </DetailDrawer>}
  </>;
}

/* --------------------------------- Reports -------------------------------- */

/** `numeric` right-aligns and sums; `currency` additionally formats as rupees. */
type ReportColumn = { label: string; numeric?: boolean; currency?: boolean };
type ReportSpec = { columns: ReportColumn[]; rows: (string | number)[][] };
type Filters = { district: string; client: string; employee: string };
type Grouping = "none" | "Site" | "District" | "Employee";

const reportNames = [
  "Attendance summary",
  "Late login & absenteeism",
  "Statutory contributions",
  "Deduction log",
  "Net payout register",
  "Uniform recovery",
  "Site coverage",
  "Complaint SLA",
];

function buildReport(report: string, filters: Filters): ReportSpec {
  const byEmployee = (name: string) => filters.employee === "All employees" || filters.employee === name;
  const byDistrict = (district: string) => filters.district === "All districts" || filters.district === district;
  const siteDistrict = (siteName: string) => sites.find(site => site.name === siteName)?.district ?? "—";
  const siteClient = (siteName: string) => sites.find(site => site.name === siteName)?.client ?? "—";
  const byClient = (client: string) => filters.client === "All clients" || filters.client === client;

  switch (report) {
    case "Late login & absenteeism":
      return {
        columns: [{ label: "Employee" }, { label: "Site" }, { label: "District" }, { label: "Expected" }, { label: "Punch" }, { label: "Delay" }, { label: "Status" }],
        rows: lateAndAbsent.filter(row => byEmployee(row.employee) && byDistrict(row.district)).map(row => [row.employee, row.site, row.district, row.due, row.punch, row.delay, row.state]),
      };
    case "Statutory contributions":
      return {
        columns: [{ label: "Employee" }, { label: "Duties", numeric: true }, { label: "Gross", numeric: true, currency: true }, { label: "Employee PF", numeric: true, currency: true }, { label: "Employee ESI", numeric: true, currency: true }],
        rows: payrollRows.filter(row => byEmployee(row.employee)).map(row => [row.employee, row.duties, row.gross, row.pf, row.esi]),
      };
    case "Deduction log":
      return {
        columns: [{ label: "Employee" }, { label: "Site" }, { label: "Deduction" }, { label: "Detail" }, { label: "Amount", numeric: true, currency: true }],
        rows: deductionLog.filter(row => byEmployee(row.employee) && byDistrict(siteDistrict(row.site)) && byClient(siteClient(row.site))).map(row => [row.employee, row.site, row.kind, row.note, row.amount]),
      };
    case "Net payout register":
      return {
        columns: [{ label: "Employee" }, { label: "Duties", numeric: true }, { label: "Gross", numeric: true, currency: true }, { label: "Deductions", numeric: true, currency: true }, { label: "Net payable", numeric: true, currency: true }],
        rows: payrollRows.filter(row => byEmployee(row.employee)).map(row => [row.employee, row.duties, row.gross, row.pf + row.esi + row.deductions, row.net]),
      };
    case "Uniform recovery":
      return {
        columns: [{ label: "Recovery plan" }, { label: "Paid upfront", numeric: true, currency: true }, { label: "Salary deduction", numeric: true, currency: true }, { label: "Total", numeric: true, currency: true }, { label: "Employees", numeric: true }],
        rows: uniformPlans.map(plan => [plan.name, plan.upfront, plan.deduction, plan.total, plan.people]),
      };
    case "Site coverage":
      return {
        columns: [{ label: "Site" }, { label: "Client" }, { label: "District" }, { label: "Posts", numeric: true }, { label: "Staffed", numeric: true }, { label: "Coverage" }],
        rows: sites.filter(site => byDistrict(site.district) && byClient(site.client)).map(site => [site.name, site.client, site.district, site.posts, site.staffed, `${site.coverage}%`]),
      };
    case "Complaint SLA":
      return {
        columns: [{ label: "Complaint" }, { label: "Site" }, { label: "Issue" }, { label: "Owner" }, { label: "SLA due" }, { label: "Status" }],
        rows: complaints.filter(item => byClient(siteClient(item.client)) && byDistrict(siteDistrict(item.client))).map(item => [item.id, item.client, item.issue, item.owner, item.due, item.state]),
      };
    default:
      return {
        columns: [{ label: "Employee" }, { label: "Site" }, { label: "Shift" }, { label: "Punch" }, { label: "Duty", numeric: true }, { label: "Status" }],
        rows: attendanceRows.filter(row => byEmployee(row.employee) && byDistrict(siteDistrict(row.site)) && byClient(siteClient(row.site))).map(row => [row.employee, row.site, row.shift, row.punch, row.duty, row.state]),
      };
  }
}

const identityColumns = (columnsSpec: { label: string }[]): ExportColumn[] => columnsSpec.map(column => ({ source: column.label, header: column.label, include: true }));
const formatCell = (column: ReportColumn, cell: string | number) => column.currency && typeof cell === "number" ? rupees(cell) : cell;
const sumColumns = (spec: ReportSpec, rows: (string | number)[][]) => spec.columns.map((column, index) => column.numeric
  ? rows.reduce((sum, row) => sum + (typeof row[index] === "number" ? row[index] as number : 0), 0)
  : null);

export function ReportsScreen() {
  const notify = useToast();
  const [report, setReport] = useState(reportNames[0]);
  const [filters, setFilters] = useState<Filters>({ district: "All districts", client: "All clients", employee: "All employees" });
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-31");
  const [grouping, setGrouping] = useState<Grouping>("none");
  const spec = useMemo(() => buildReport(report, filters), [report, filters]);
  const [templates, setTemplates] = useState<ExportTemplate[]>(() => {
    if (typeof window === "undefined") return exportTemplates;
    try {
      const stored = JSON.parse(window.localStorage.getItem("bmg-export-templates") ?? "[]") as ExportTemplate[];
      return [...exportTemplates, ...stored.filter(item => !exportTemplates.some(seeded => seeded.name === item.name))];
    } catch { return exportTemplates; }
  });
  const [templateName, setTemplateName] = useState("");
  const [mapColumns, setMapColumns] = useState<ExportColumn[]>(identityColumns(spec.columns));
  const dateError = from > to;
  const groupIndex = grouping === "none" ? -1 : spec.columns.findIndex(column => column.label === grouping);
  const availableGroupings = (["Site", "District", "Employee"] as const).filter(label => spec.columns.some(column => column.label === label));

  const selectReport = (next: string) => {
    setReport(next);
    const nextSpec = buildReport(next, filters);
    setMapColumns(identityColumns(nextSpec.columns));
    if (grouping !== "none" && !nextSpec.columns.some(column => column.label === grouping)) setGrouping("none");
  };
  const moveColumn = (index: number, direction: -1 | 1) => setMapColumns(current => {
    const next = [...current]; const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const saveTemplate = () => {
    if (!templateName.trim()) return;
    const template: ExportTemplate = { name: templateName.trim(), report, columns: mapColumns };
    setTemplates(current => {
      const next = [...current.filter(item => item.name !== template.name), template];
      window.localStorage.setItem("bmg-export-templates", JSON.stringify(next.filter(item => item.name !== "Default CSV")));
      return next;
    });
    setTemplateName("");
    notify(`Template "${template.name}" saved`);
  };
  const loadTemplate = (name: string) => {
    const template = templates.find(item => item.name === name);
    if (!template) return;
    setMapColumns(template.columns.length ? template.columns : identityColumns(spec.columns));
    notify(`Template "${name}" applied`);
  };

  const groups = useMemo(() => {
    if (groupIndex < 0) return [{ key: "", rows: spec.rows }];
    const map = new Map<string, (string | number)[][]>();
    spec.rows.forEach(row => {
      const key = String(row[groupIndex]);
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    return Array.from(map, ([key, rows]) => ({ key, rows })).sort((a, b) => a.key.localeCompare(b.key));
  }, [spec.rows, groupIndex]);
  const orderedRows = groups.flatMap(group => group.rows);

  const exportCsv = () => {
    const mapped = applyTemplate(spec.columns, orderedRows, { name: "live", report, columns: mapColumns });
    downloadCsv(`${report.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${from}-to-${to}`, mapped.headers, mapped.rows);
    notify(`${report} downloaded · ${mapped.rows.length} rows`);
  };

  const districts = useMemo(() => ["All districts", ...Array.from(new Set(sites.map(site => site.district)))], []);
  const clients = useMemo(() => ["All clients", ...Array.from(new Set(sites.map(site => site.client)))], []);
  const names = useMemo(() => ["All employees", ...employees.map(employee => employee.name)], []);
  const totals = sumColumns(spec, spec.rows);
  const hasTotals = totals.some(value => value !== null);

  return <>
    <PageHeader title={NAV.reports} subtitle="Operational and payroll reports with shared filters and client-specific export columns."
      actions={<Button disabled={dateError || spec.rows.length === 0} onClick={exportCsv}><Download />Export CSV</Button>} />
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Panel title="Reports" flush>
        <nav className="grid gap-0.5 p-2">
          {reportNames.map(item => (
            <button key={item} type="button" onClick={() => selectReport(item)}
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm", report === item ? "bg-emerald/10 font-semibold text-emerald" : "text-foreground/70 hover:bg-surface hover:text-foreground")}>
              <FileSpreadsheet className="h-4 w-4 shrink-0" />{item}
            </button>
          ))}
        </nav>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel title={report} description={`${spec.rows.length} rows · ${from} to ${to}`}>
          <FormGrid className="lg:grid-cols-3">
            <Field label="From"><Input type="date" value={from} onChange={event => setFrom(event.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={event => setTo(event.target.value)} /></Field>
            <Field label="Group by">
              <Select value={grouping} onChange={event => setGrouping(event.target.value as Grouping)}>
                <option value="none">No grouping</option>
                {availableGroupings.map(label => <option key={label} value={label}>{label}</option>)}
              </Select>
            </Field>
            <Field label="District"><Select value={filters.district} onChange={event => setFilters({ ...filters, district: event.target.value })}>{districts.map(item => <option key={item}>{item}</option>)}</Select></Field>
            <Field label="Client"><Select value={filters.client} onChange={event => setFilters({ ...filters, client: event.target.value })}>{clients.map(item => <option key={item}>{item}</option>)}</Select></Field>
            <Field label="Employee"><Select value={filters.employee} onChange={event => setFilters({ ...filters, employee: event.target.value })}>{names.map(item => <option key={item}>{item}</option>)}</Select></Field>
          </FormGrid>
          {dateError && <InlineAlert tone="danger" className="mt-3">The start date must be on or before the end date.</InlineAlert>}
        </Panel>

        <Panel title="Preview" description={grouping === "none" ? "Updates as you change filters." : `Grouped by ${grouping.toLowerCase()} with subtotals.`} flush>
          {spec.rows.length === 0
            ? <div className="p-4"><EmptyState icon={FileSpreadsheet} title="No rows match these filters" message="Widen the district, client or employee filter." /></div>
            : <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0"><tr>{spec.columns.map(column => <th key={column.label} className={cn("bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", column.numeric ? "text-right" : "text-left")}>{column.label}</th>)}</tr></thead>
                <tbody>
                  {groups.map(group => {
                    const subtotal = sumColumns(spec, group.rows);
                    return <Fragment key={group.key || "all"}>
                      {group.key && <tr className="border-t border-border bg-emerald/5"><td colSpan={spec.columns.length} className="px-4 py-2 text-xs font-semibold text-emerald">{group.key} · {group.rows.length} row{group.rows.length === 1 ? "" : "s"}</td></tr>}
                      {group.rows.map((row, index) => (
                        <tr key={index} className="border-t border-border">
                          {row.map((cell, cellIndex) => <td key={cellIndex} className={cn("px-4 py-2.5", spec.columns[cellIndex].numeric && "text-right tabular-nums")}>{formatCell(spec.columns[cellIndex], cell)}</td>)}
                        </tr>
                      ))}
                      {group.key && hasTotals && <tr className="border-t border-border text-xs text-muted">
                        {spec.columns.map((column, index) => <td key={column.label} className={cn("px-4 py-2", column.numeric && "text-right tabular-nums")}>{index === 0 ? "Subtotal" : subtotal[index] === null ? "" : formatCell(column, subtotal[index]!)}</td>)}
                      </tr>}
                    </Fragment>;
                  })}
                </tbody>
                {hasTotals && <tfoot><tr className="border-t-2 border-border bg-surface font-semibold">
                  {spec.columns.map((column, index) => <td key={column.label} className={cn("px-4 py-3", column.numeric && "text-right tabular-nums")}>{index === 0 ? "Total" : totals[index] === null ? "" : formatCell(column, totals[index]!)}</td>)}
                </tr></tfoot>}
              </table>
            </div>}
        </Panel>

        <Panel title="Export columns" description="Rename, reorder or drop columns to match a client's spreadsheet format, then save it as a template.">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Select className="sm:w-56" defaultValue="" onChange={event => { loadTemplate(event.target.value); event.target.value = ""; }} aria-label="Apply template">
              <option value="" disabled>Apply a saved template…</option>
              {templates.map(template => <option key={template.name}>{template.name}</option>)}
            </Select>
            <Input value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="New template name, e.g. Lulu payroll format" aria-label="Template name" />
            <Button variant="outline" className="h-11 shrink-0" disabled={!templateName.trim()} onClick={saveTemplate}>Save template</Button>
          </div>
          <div className="hidden grid-cols-[32px_1fr_1fr_72px] gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>Use</span><span>System field</span><span>Column name in export</span><span>Order</span>
          </div>
          <div className="divide-y divide-border">
            {mapColumns.map((column, index) => (
              <div key={column.source} className="grid grid-cols-[32px_1fr] items-center gap-2 py-2 sm:grid-cols-[32px_1fr_1fr_72px] sm:gap-3">
                <input type="checkbox" className="h-4 w-4 accent-[#00be73]" checked={column.include} onChange={event => setMapColumns(current => current.map((item, row) => row === index ? { ...item, include: event.target.checked } : item))} aria-label={`Include ${column.source}`} />
                <span className="text-sm font-medium">{column.source}</span>
                <Input className="col-span-2 h-9 sm:col-span-1" value={column.header} onChange={event => setMapColumns(current => current.map((item, row) => row === index ? { ...item, header: event.target.value } : item))} aria-label={`Export name for ${column.source}`} />
                <span className="col-span-2 flex gap-1 sm:col-span-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => moveColumn(index, -1)} aria-label={`Move ${column.source} up`}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === mapColumns.length - 1} onClick={() => moveColumn(index, 1)} aria-label={`Move ${column.source} down`}><ArrowDown /></Button>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  </>;
}

/* --------------------------------- Imports -------------------------------- */

const importKinds: Record<string, { fields: string[]; sample: string[] }> = {
  "Employees": { fields: ["Employee ID", "Full name", "Mobile number", "District", "Joining date"], sample: ["BMG-2310", "Arun Kumar", "98470 11223", "Ernakulam", "2026-09-01"] },
  "Clients and sites": { fields: ["Client", "Site name", "District", "Latitude", "Longitude", "Posts"], sample: ["Lulu Group", "Lulu Mall, Kochi", "Ernakulam", "10.02700", "76.30800", "18"] },
  "Deployment": { fields: ["Employee ID", "Site", "Post", "Shift", "Start date"], sample: ["BMG-1840", "Lulu Mall, Kochi", "Main gate", "Day", "2026-09-01"] },
  "Attendance corrections": { fields: ["Employee ID", "Date", "Site", "Duty value", "Reason"], sample: ["BMG-1840", "2026-09-10", "Lulu Mall, Kochi", "1.00", "Device failure"] },
  "Salary settings": { fields: ["Employee ID", "Pay basis", "Monthly salary", "Daily rate", "Effective from"], sample: ["BMG-1840", "monthly", "16000", "", "2026-09-01"] },
  "Opening balances": { fields: ["Employee ID", "Uniform balance", "Advance balance", "Penalty balance"], sample: ["BMG-1840", "800", "0", "0"] },
};
const importSteps = ["Choose file", "Match columns", "Check rows", "Import"] as const;

export function ImportsScreen({ initialKind }: { initialKind?: string }) {
  const notify = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(initialKind && importKinds[initialKind] ? initialKind : "Employees");
  const [done, setDone] = useState(false);
  const spec = importKinds[kind];
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (picked) { setFile(picked.name); setStep(1); setDone(false); }
  };
  const chooseKind = (next: string) => { setKind(next); setStep(0); setFile(null); setDone(false); };
  const downloadTemplate = () => {
    downloadCsv(`${kind.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-template`, spec.fields, [spec.sample]);
    notify(`${kind} template downloaded`);
  };

  return <>
    <PageHeader title={NAV.imports} subtitle="Upload a spreadsheet, check it, and only then apply it. Nothing changes until the last step."
      actions={<Button variant="outline" onClick={downloadTemplate}><Download />Download {kind.toLowerCase()} template</Button>} />
    <Stepper steps={importSteps} current={step} maxReached={file ? Math.max(step, 1) : 0} onSelect={index => { if (file || index === 0) setStep(index); }} />
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Panel title="What are you importing?" flush>
        <nav className="grid gap-0.5 p-2">
          {Object.keys(importKinds).map(item => (
            <button key={item} type="button" onClick={() => chooseKind(item)}
              className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm", kind === item ? "bg-emerald/10 font-semibold text-emerald" : "text-foreground/70 hover:bg-surface")}>
              {item}<ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </nav>
      </Panel>
      <Panel title={kind} description="XLSX or CSV, up to 10 MB.">
        <input ref={inputRef} className="sr-only" type="file" accept=".xlsx,.csv" onChange={selectFile} />
        {!file
          ? <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-12 text-center hover:border-emerald hover:bg-emerald/5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10 text-emerald"><Upload className="h-6 w-6" /></span>
            <strong className="text-sm">Choose a file</strong>
            <small className="text-xs text-muted">Expected columns: {spec.fields.join(", ")}</small>
          </button>
          : <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <IconTile icon={FileSpreadsheet} />
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{file}</strong><small className="text-xs text-muted">{step === 1 ? "Match its columns to BMG fields" : step === 2 ? "Checked" : done ? "Imported" : "Ready to import"}</small></div>
            {!done && <Button variant="ghost" size="sm" onClick={() => { setFile(null); setStep(0); }}><X />Remove</Button>}
          </div>}

        {file && step === 1 && <>
          <div className="mb-2 grid grid-cols-2 gap-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted"><span>Column in your file</span><span>BMG field</span></div>
          <div className="divide-y divide-border rounded-xl border border-border">
            {spec.fields.map(fieldName => (
              <div key={fieldName} className="grid grid-cols-2 items-center gap-3 px-3 py-2">
                <strong className="text-sm">{fieldName}</strong>
                <Select className="h-9" defaultValue={fieldName}><option>{fieldName}</option><option value="ignore">Don't import</option></Select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end"><Button onClick={() => setStep(2)}>Check rows</Button></div>
        </>}

        {file && step === 2 && <>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <InlineAlert tone="success"><strong>146 rows are valid</strong></InlineAlert>
            <InlineAlert tone="warning"><strong>2 rows need fixing</strong></InlineAlert>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border text-sm">
            <div className="flex items-center gap-3 px-3 py-2"><strong className="w-16">Row 28</strong><span className="flex-1">{spec.fields[0]} is already in use</span><StatusChip tone="danger">Error</StatusChip></div>
            <div className="flex items-center gap-3 px-3 py-2"><strong className="w-16">Row 91</strong><span className="flex-1">{spec.fields[spec.fields.length - 1]} has an invalid value</span><StatusChip tone="warning">Review</StatusChip></div>
          </div>
          <p className="mt-3 text-xs text-muted">Rows with problems are skipped. Fix them in your file and import again later.</p>
          <div className="mt-4 flex justify-end"><Button onClick={() => setStep(3)}>Continue with 146 valid rows</Button></div>
        </>}

        {file && step === 3 && <>
          <InlineAlert tone={done ? "success" : "info"}>
            <strong className="block">{done ? "Import complete" : `146 ${kind.toLowerCase()} records ready`}</strong>
            {done ? "A batch reference and audit log were created." : "Skipped rows stay excluded until you fix and re-import them."}
          </InlineAlert>
          <div className="mt-4 flex justify-end gap-2">
            {done
              ? <Button variant="outline" onClick={() => chooseKind(kind)}>Import another file</Button>
              : <Button onClick={() => { setDone(true); notify(`146 ${kind.toLowerCase()} records imported`); }}><CheckCircle2 />Import 146 records</Button>}
          </div>
        </>}
      </Panel>
    </div>
  </>;
}

/* --------------------------------- Settings -------------------------------- */

const settingGroups = ["Organization", "Onboarding", "Attendance", "Payroll", "PF and ESI", "Duty units", "Notifications", "Users and roles"] as const;

export function SettingsScreen({ onOpenAccess }: { onOpenAccess: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [radius, setRadius] = useState(100);
  const [unit, setUnit] = useState("0.25");
  const [dutyUnits, setDutyUnits] = useState(["0.25", "0.50", "0.75", "1.00", "1.50"]);
  const [group, setGroup] = useState<(typeof settingGroups)[number]>("Attendance");
  const onboarding = useOnboarding();
  const docTypes = onboarding.config.documentChecklist;
  const setDocTypes = (update: (current: string[]) => string[]) => onboarding.saveConfig({ ...onboarding.config, documentChecklist: update(docTypes) });
  const fieldDefs = onboarding.config.customFieldDefs;
  const setFieldDefs = (update: (current: CustomFieldDef[]) => CustomFieldDef[]) => onboarding.saveConfig({ ...onboarding.config, customFieldDefs: update(fieldDefs) });
  const remove = async (title: string, description: string, action: () => void) => {
    if (await confirm({ title, description, confirmLabel: "Remove", destructive: true })) action();
  };
  const autoSaved = group === "Onboarding" || group === "Users and roles";

  return <>
    <PageHeader title={NAV.settings} subtitle="Organization defaults. Clients, sites, posts and employees can override them."
      actions={autoSaved ? undefined : <Button onClick={() => notify(`${group} settings saved`)}><CheckCircle2 />Save {group.toLowerCase()} settings</Button>} />
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Panel title="Settings" flush>
        <nav className="grid gap-0.5 p-2">
          {settingGroups.map(item => (
            <button key={item} type="button" onClick={() => setGroup(item)}
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm", group === item ? "bg-emerald/10 font-semibold text-emerald" : "text-foreground/70 hover:bg-surface hover:text-foreground")}>
              <Settings className="h-4 w-4 shrink-0" />{item}
            </button>
          ))}
        </nav>
      </Panel>
      <Panel title={group} description={autoSaved ? "Changes here save automatically." : "Organization default · effective 1 September 2026"}>
        {group === "Organization" && <FormGrid>
          <Field label="Standard payable days per month" hint="Monthly salary is divided by this when scheduled days aren't available."><Input type="number" defaultValue={26} /></Field>
          <Field label="Advance limit" hint="Share of wages earned so far, after deductions."><InputAffix suffix="% of earnings" type="number" defaultValue={40} /></Field>
          <Field label="Currency"><Select><option>INR · Indian Rupee</option></Select></Field>
          <Field label="Payroll lock day" hint="Days after month-end before final approval is due."><InputAffix suffix="days" type="number" defaultValue={3} /></Field>
        </FormGrid>}
        {group === "Attendance" && <FormGrid>
          <Field label="Default boundary radius" hint="Sites and posts can override this."><InputAffix suffix="metres" type="number" value={radius} onChange={event => setRadius(Number(event.target.value))} /></Field>
          <Field label="Late-arrival grace" hint="Alerts are raised after this."><InputAffix suffix="minutes" type="number" defaultValue={10} /></Field>
          <Field label="Default duty value step"><Select value={unit} onChange={event => setUnit(event.target.value)}><option>0.25</option><option>0.50</option><option>1.00</option></Select></Field>
          <Field label="GPS accuracy limit" hint="Punches less accurate than this are flagged for review."><InputAffix suffix="metres" type="number" defaultValue={50} /></Field>
        </FormGrid>}
        {group === "Payroll" && <FormGrid>
          <Field label="Monthly salary divided by"><Select><option>Scheduled working days</option><option>Fixed organization days</option><option>Calendar days</option></Select></Field>
          <Field label="Duty rounding" hint="The original attendance value is kept for audit."><Select><option>Two decimal places</option><option>Nearest quarter duty</option></Select></Field>
          <Field label="Paid leave"><Select><option>Count as a payable duty</option><option>Separate earning line</option><option>Exclude</option></Select></Field>
          <Field label="Net pay rounding"><Select><option>Nearest rupee</option><option>No rounding</option></Select></Field>
        </FormGrid>}
        {group === "PF and ESI" && <FormGrid>
          <Field label="Employee PF rate"><InputAffix suffix="%" type="number" defaultValue={12} /></Field>
          <Field label="Employee ESI rate"><InputAffix suffix="%" type="number" step="0.01" defaultValue={0.75} /></Field>
          <Field label="PF wage ceiling"><InputAffix prefix="₹" type="number" defaultValue={15000} /></Field>
          <Field label="ESI wage ceiling"><InputAffix prefix="₹" type="number" defaultValue={21000} /></Field>
        </FormGrid>}
        {group === "Duty units" && <>
          <p className="mb-3 text-sm text-muted">Quick choices offered when recording a duty value.</p>
          <div className="flex flex-wrap gap-2">
            {dutyUnits.map(value => (
              <span key={value} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-sm font-semibold tabular-nums">
                {value}
                <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-status-danger/10 hover:text-status-danger" aria-label={`Remove ${value}`}
                  onClick={() => remove(`Remove duty value ${value}?`, "It will no longer be offered when recording duties. Existing records keep their value.", () => setDutyUnits(current => current.filter(item => item !== value)))}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
            <Button variant="outline" size="sm" onClick={() => { const next = (Number(dutyUnits.at(-1) ?? 1) + .25).toFixed(2); setDutyUnits(current => [...current, next]); }}><Plus />Add {(Number(dutyUnits.at(-1) ?? 1) + .25).toFixed(2)}</Button>
          </div>
        </>}
        {group === "Notifications" && <FormStack>
          <ToggleRow title="9:00 AM missing-login alert" description="Send the absence report to HR." defaultChecked />
          <ToggleRow title="Immediate vacancy alert" description="Notify district operations when leave or absence leaves a post empty." defaultChecked />
          <ToggleRow title="Missed night check escalation" description="Escalate after the response window." defaultChecked />
          <ToggleRow title="Complaint SLA warning" description="Notify the owner before the deadline." defaultChecked />
        </FormStack>}
        {group === "Onboarding" && <FormStack>
          <Section title="Required documents" className="mb-0">
            <p className="mb-3 text-sm text-muted">Collected from every new employee.</p>
            <div className="flex flex-wrap gap-2">
              {docTypes.length === 0 && <span className="text-sm text-muted">No documents required yet.</span>}
              {docTypes.map(type => (
                <span key={type} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-sm">
                  {type}
                  <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-status-danger/10 hover:text-status-danger" aria-label={`Remove ${type}`}
                    onClick={() => remove(`Remove ${type} from the checklist?`, "New employees won't be asked for it. Files already uploaded are kept.", () => setDocTypes(current => current.filter(item => item !== type)))}><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
            <AddItemRow label="Add a required document" placeholder="Document name, e.g. Driving licence" buttonLabel="Add" existing={docTypes} onAdd={type => setDocTypes(current => [...current, type])} />
          </Section>
          <Section title="Custom employee fields" className="mb-0 border-t border-border pt-4">
            <p className="mb-3 text-sm text-muted">Extra fields shown on every employee form.</p>
            {fieldDefs.length === 0 && <p className="mb-2 text-sm text-muted">No custom fields yet.</p>}
            <div className="grid gap-2">
              {fieldDefs.map((def, index) => (
                <div key={def.key} className="grid grid-cols-[1fr_120px_40px] gap-2">
                  <Input className="h-9" value={def.label} onChange={event => setFieldDefs(current => current.map((item, row) => row === index ? { ...item, label: event.target.value } : item))} aria-label={`Field ${index + 1} name`} />
                  <Select className="h-9" value={def.kind} onChange={event => setFieldDefs(current => current.map((item, row) => row === index ? { ...item, kind: event.target.value as CustomFieldDef["kind"] } : item))} aria-label={`Field ${index + 1} type`}><option value="text">Text</option><option value="date">Date</option><option value="number">Number</option></Select>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-status-danger" aria-label={`Remove ${def.label}`} title="Remove field"
                    onClick={() => remove(`Remove the "${def.label}" field?`, "It disappears from every employee form. Values already entered are hidden.", () => setFieldDefs(current => current.filter((_, row) => row !== index)))}><X /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFieldDefs(current => [...current, { key: `field-${Date.now()}`, label: "New field", kind: "text" }])}><Plus />Add field</Button>
          </Section>
          <Field label="PF/ESI data reminder" hint="HR is alerted if enrolment data hasn't arrived within this many days of joining.">
            <InputAffix suffix="days" type="number" min={1} value={onboarding.config.pfEsiWindowDays} onChange={event => onboarding.saveConfig({ ...onboarding.config, pfEsiWindowDays: Math.max(1, Number(event.target.value) || 1) })} />
          </Field>
        </FormStack>}
        {group === "Users and roles" && <div>
          <p className="text-sm text-muted">Roles, reporting lines, module permissions and individual user overrides are managed on the Users and roles screen.</p>
          <Button variant="outline" className="mt-3" data-allow onClick={onOpenAccess}>Go to Users and roles</Button>
        </div>}
        {!autoSaved && <div className="mt-6 rounded-xl bg-surface p-3">
          <strong className="text-xs font-semibold uppercase tracking-wide text-muted">How overrides work</strong>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {["Organization", "Client", "Site", "Post", "Employee"].map((level, index) => <Fragment key={level}>{index > 0 && <ChevronRight className="h-3 w-3 text-muted" />}<span className="rounded-md bg-card px-2 py-1 font-medium">{level}</span></Fragment>)}
          </div>
          <p className="mt-2 text-xs text-muted">The most specific rule wins. Each override keeps its source and start date.</p>
        </div>}
      </Panel>
    </div>
  </>;
}
