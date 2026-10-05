"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ChevronRight, Coins, Download, Package, Plus,
  Receipt, Shirt, ShieldCheck, Upload, Wallet,
} from "lucide-react";
import { employees, lateAndAbsent, rupees, spareDutyPayments, uniformBatches, uniformKit, uniformPlans, uniformRequests } from "@/lib/mock-data";
import type { SpareDutyPayment, UniformRequest, UniformRequestStatus } from "@/types/domain";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";
import { payBasisLabel } from "@/lib/payroll-calculator";
import {
  Button, DataTable, DefRows, DetailDrawer, EmptyState, InlineAlert, KeyValue, ListRow, PageHeader, Panel,
  PersonCell, ProgressBar, Section, Select, SplitLayout, StatStrip, StatusChip, Stepper, Timeline, useConfirm,
  type Column, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { usePayroll } from "@/components/shared/payroll-context";
import { EmployeeSalaryBreakdownModal } from "@/features/payroll/employee-salary-breakdown";
import { downloadCsv } from "@/lib/download";
import { formatAppDate } from "@/lib/app-date";
import { NAV } from "@/lib/labels";

const stages = ["Attendance", "Calculation", "Review", "Approval", "Payment"] as const;

const stageDescriptions = [
  "Confirm approved duties before salary calculation begins.",
  "Resolve pay rates and statutory rules for every approved duty.",
  "Check employee totals and open site-wise breakdowns.",
  "Sign off the payroll register once every exception is cleared.",
  "Release net wages and lock the August 2026 calculation.",
];

const advanceLabels = [
  "Lock attendance",
  "Run calculation",
  "Send for approval",
  "Approve payroll",
  "Mark as paid",
];

type PayrollRow = { employee: typeof employees[number]; breakdown: ReturnType<ReturnType<typeof usePayroll>["getBreakdown"]> };
type Totals = { gross: number; statutory: number; other: number; net: number };

function PayrollStageStats({ stage, rows, totals, exceptions, paid }: { stage: number; rows: PayrollRow[]; totals: Totals; exceptions: number; paid: boolean }) {
  const dutyTotal = rows.reduce((sum, row) => sum + row.breakdown.duties, 0);
  const readyCount = rows.filter(row => row.breakdown.exceptions.length === 0).length;
  const reviewCount = rows.length - readyCount;

  if (stage === 0) return <StatStrip items={[
    { icon: CalendarCheck, value: dutyTotal.toFixed(2), label: "Approved duties", note: "Across payable employees" },
    { icon: Wallet, value: String(rows.length), label: "Employees in run", note: "With approved attendance" },
    { icon: AlertTriangle, value: String(lateAndAbsent.length), label: "Attendance flags", note: "Late or absent today", tone: "orange" },
    { icon: CheckCircle2, value: "Locked", label: "Period", note: "August 2026 duties", tone: "green" },
  ]} />;

  if (stage === 1) return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.gross), label: "Calculated gross", note: "From resolved duty rates" },
    { icon: ShieldCheck, value: String(rows.reduce((sum, row) => sum + row.breakdown.sites.length, 0)), label: "Site allocations", note: "Across all employees" },
    { icon: Receipt, value: rupees(totals.other), label: "Deductions loaded", note: "Advance, uniform, penalty", tone: "orange" },
    { icon: AlertTriangle, value: String(exceptions), label: "Setup exceptions", note: exceptions ? "Needs correction" : "All rules resolved", tone: exceptions ? "red" : "green" },
  ]} />;

  if (stage === 3) return <StatStrip items={[
    { icon: CheckCircle2, value: String(readyCount), label: "Ready to approve", note: "No blocking exceptions", tone: "green" },
    { icon: AlertTriangle, value: String(reviewCount), label: "On hold", note: reviewCount ? "Resolve before approval" : "All clear", tone: reviewCount ? "orange" : "green" },
    { icon: Wallet, value: rupees(totals.net), label: "Net payable", note: `${rows.length} employees` },
    { icon: ShieldCheck, value: rupees(totals.statutory), label: "PF and ESI", note: "Employee contributions" },
  ]} />;

  if (stage === 4) return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.net), label: "Payment batch", note: paid ? "Locked" : "Awaiting release" },
    { icon: CheckCircle2, value: String(rows.length), label: "Employees", note: "In August 2026", tone: paid ? "green" : "orange" },
    { icon: Receipt, value: rupees(totals.other), label: "Other deductions", note: "Already netted off" },
    { icon: ShieldCheck, value: paid ? "Closed" : "Open", label: "Payroll period", note: paid ? "Calculations locked" : "Ready to mark paid", tone: paid ? "green" : undefined },
  ]} />;

  return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.gross), label: "Gross payroll", note: `${rows.length} employees` },
    { icon: ShieldCheck, value: rupees(totals.statutory), label: "PF and ESI", note: "Eligible site earnings" },
    { icon: Receipt, value: rupees(totals.other), label: "Other deductions", note: "Advance, uniform, penalty", tone: "orange" },
    { icon: AlertTriangle, value: String(exceptions), label: "Exceptions", note: exceptions ? "Blocking approval" : "Ready for approval", tone: exceptions ? "red" : "green" },
  ]} />;
}

const person: Column<PayrollRow> = { header: "Employee", cell: row => <PersonCell name={row.employee.name} id={row.employee.id} /> };
const statusCell = (ok: boolean, okLabel: string, badLabel: string) => <StatusChip tone={ok ? "success" : "warning"}>{ok ? okLabel : badLabel}</StatusChip>;

function PayrollStagePanel({ stage, rows, totals, exceptions, paid, onOpenEmployee }: {
  stage: number; rows: PayrollRow[]; totals: Totals; exceptions: number; paid: boolean; onOpenEmployee: (employee: { id: string; name: string }) => void;
}) {
  const open = (row: PayrollRow) => onOpenEmployee({ id: row.employee.id, name: row.employee.name });

  if (stage === 0) return (
    <Panel title="Attendance lock" description="Only approved August 2026 duties move into the salary calculation." flush>
      <DataTable rows={rows} rowKey={row => row.employee.id} columns={[
        person,
        { header: "Approved duties", align: "right", cell: row => row.breakdown.duties.toFixed(2) },
        { header: "Sites", align: "right", cell: row => row.breakdown.sites.length },
        { header: "Attendance note", cell: row => { const flag = lateAndAbsent.find(item => item.id === row.employee.id); return flag ? `${flag.state}${flag.delay && flag.delay !== "—" ? ` · ${flag.delay}` : ""}` : "All shifts approved"; } },
        { header: "Status", cell: () => <StatusChip tone="success">Included</StatusChip> },
      ]} />
    </Panel>
  );

  if (stage === 1) return (
    <Panel title="Salary calculation" description="Each duty resolves a rate source, benefit scheme and gross amount. Select a row for details." flush>
      <DataTable rows={rows} rowKey={row => row.employee.id} onRowClick={open} columns={[
        person,
        { header: "Pay basis", cell: row => payBasisLabel(row.breakdown.payBasis) },
        { header: "Duties", align: "right", cell: row => row.breakdown.duties.toFixed(2) },
        { header: "Rate source", cell: row => row.breakdown.sites.flatMap(site => site.rateSources).filter((value, index, list) => list.indexOf(value) === index).join(" / ") || "—", hideOnMobile: true },
        { header: "Gross", align: "right", cell: row => rupees(row.breakdown.gross) },
        { header: "Status", cell: row => statusCell(!row.breakdown.exceptions.length, "Calculated", "Exception") },
      ]} />
      <div className="border-t border-border p-4"><InlineAlert>Monthly and fixed daily rates ignore site pay rates. Site-wise employees use the post override first, then the site default.</InlineAlert></div>
    </Panel>
  );

  if (stage === 3) {
    const blocked = rows.filter(row => row.breakdown.exceptions.length > 0);
    return <div className="grid gap-4">
      {blocked.length > 0 && <InlineAlert tone="danger">
        <strong className="block">{blocked.length} employee{blocked.length === 1 ? " is" : "s are"} blocking approval</strong>
        <ul className="mt-1 list-disc pl-4">{blocked.map(row => <li key={row.employee.id}>{row.employee.name}: {row.breakdown.exceptions[0]?.message}</li>)}</ul>
      </InlineAlert>}
      <SplitLayout wideFirst className="mb-0">
        <Panel title="Employee readiness" description={exceptions ? "Resolve every setup exception before approving." : "Every employee is ready for approval."} flush>
          <DataTable rows={rows} rowKey={row => row.employee.id} onRowClick={open} columns={[
            person,
            { header: "Net", align: "right", cell: row => <strong>{rupees(row.breakdown.net)}</strong> },
            { header: "Exceptions", align: "right", cell: row => row.breakdown.exceptions.length },
            { header: "Status", cell: row => statusCell(!row.breakdown.exceptions.length, "Ready", "On hold") },
          ]} />
        </Panel>
        <Panel title="Register totals">
          <DefRows rows={[
            { label: "Gross payroll", value: rupees(totals.gross), mono: true },
            { label: "PF and ESI", value: rupees(totals.statutory), mono: true },
            { label: "Other deductions", value: rupees(totals.other), mono: true },
            { label: "Net payable", value: rupees(totals.net), mono: true, total: true },
          ]} />
        </Panel>
      </SplitLayout>
    </div>;
  }

  if (stage === 4) return (
    <Panel title={paid ? "Payment completed" : "Release payment"} description={paid ? "August 2026 payroll is closed and its calculations are locked." : "Check the batch, then mark the period as paid."}>
      <DefRows rows={[
        { label: "Employees in batch", value: rows.length, mono: true },
        { label: "Gross payroll", value: rupees(totals.gross), mono: true },
        { label: "Statutory deductions", value: rupees(totals.statutory), mono: true },
        { label: "Other deductions", value: rupees(totals.other), mono: true },
        { label: "Net payable", value: rupees(totals.net), mono: true, total: true },
      ]} />
      <InlineAlert tone={paid ? "success" : "info"} className="mt-4">
        {paid ? "Batch released. Calculations are locked; changes now need a correction run." : "Marking as paid locks every calculation and closes the August 2026 period."}
      </InlineAlert>
    </Panel>
  );

  return (
    <Panel title="Payroll review" description="Select an employee to see site-wise duties, deductions and allocation." flush>
      <DataTable rows={rows} rowKey={row => row.employee.id} onRowClick={open} columns={[
        person,
        { header: "Duties", align: "right", cell: row => row.breakdown.duties.toFixed(2) },
        { header: "Gross", align: "right", cell: row => rupees(row.breakdown.gross) },
        { header: "PF", align: "right", cell: row => rupees(row.breakdown.pf), hideOnMobile: true },
        { header: "ESI", align: "right", cell: row => rupees(row.breakdown.esi), hideOnMobile: true },
        { header: "Other", align: "right", cell: row => rupees(row.breakdown.otherDeductions), hideOnMobile: true },
        { header: "Net", align: "right", cell: row => <strong>{rupees(row.breakdown.net)}</strong> },
        { header: "Status", cell: row => statusCell(!row.breakdown.exceptions.length, "Ready", "Review") },
      ]} />
    </Panel>
  );
}

export function PayrollScreen({ onAllocation }: { onAllocation: (employeeId: string) => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const { getBreakdown, closePeriod, isPeriodClosed } = usePayroll();
  const rows = useMemo(() => employees.map(employee => ({ employee, breakdown: getBreakdown(employee.id) })).filter(row => row.breakdown.duties > 0), [getBreakdown]);
  const paid = isPeriodClosed();
  const [stage, setStage] = useState(paid ? 4 : 2);
  const [maxStage, setMaxStage] = useState(paid ? 4 : 2);
  const [modalEmployee, setModalEmployee] = useState<{ id: string; name: string } | null>(null);
  const exceptions = rows.reduce((sum, row) => sum + row.breakdown.exceptions.length, 0);
  const totals = rows.reduce((result, row) => ({
    gross: result.gross + row.breakdown.gross,
    statutory: result.statutory + row.breakdown.pf + row.breakdown.esi,
    other: result.other + row.breakdown.otherDeductions,
    net: result.net + row.breakdown.net,
  }), { gross: 0, statutory: 0, other: 0, net: 0 });

  useEffect(() => {
    if (paid) { setStage(4); setMaxStage(4); }
  }, [paid]);

  async function advance() {
    if (stage < 4) {
      const next = stage + 1;
      setStage(next);
      setMaxStage(current => Math.max(current, next));
      notify(`Moved to ${stages[next].toLowerCase()}`);
      return;
    }
    const ok = await confirm({
      title: "Mark August 2026 payroll as paid?",
      description: `${rows.length} employees · ${rupees(totals.net)} net. Calculations will be locked and the period closed. Changes after this need a correction run.`,
      confirmLabel: "Mark as paid",
    });
    if (!ok) return;
    if (!closePeriod()) { notify({ message: "Resolve payroll setup exceptions before payment", kind: "error" }); return; }
    notify("Payroll marked as paid");
  }

  const exportRegister = () => {
    downloadCsv("payroll-register-2026-08", ["Employee ID", "Name", "Pay basis", "Duties", "Gross", "PF", "ESI", "Other deductions", "Net"],
      rows.map(row => [row.employee.id, row.employee.name, payBasisLabel(row.breakdown.payBasis), row.breakdown.duties.toFixed(2), row.breakdown.gross, row.breakdown.pf, row.breakdown.esi, row.breakdown.otherDeductions, row.breakdown.net]));
    notify("Payroll register downloaded");
  };

  const primaryDisabled = paid || (stage >= 3 && exceptions > 0);
  const primaryLabel = paid ? "Payroll closed" : stage >= 3 && exceptions > 0 ? "Resolve exceptions first" : advanceLabels[stage];

  return <>
    <PageHeader
      title={NAV.payroll}
      subtitle={`August 2026 · ${stageDescriptions[stage]}`}
      actions={<>
        <Button variant="outline" onClick={exportRegister}><Download />Export register</Button>
        <Button disabled={primaryDisabled} onClick={advance}>{primaryLabel}{!paid && <ArrowRight />}</Button>
      </>}
    />
    {paid && <InlineAlert tone="success" className="mb-4">August 2026 payroll is closed. Employee calculations are locked.</InlineAlert>}
    <Stepper steps={stages} current={stage} maxReached={maxStage} onSelect={index => { if (index <= maxStage) setStage(index); }} />
    <PayrollStageStats stage={stage} rows={rows} totals={totals} exceptions={exceptions} paid={paid} />
    <PayrollStagePanel stage={stage} rows={rows} totals={totals} exceptions={exceptions} paid={paid} onOpenEmployee={setModalEmployee} />
    {modalEmployee && <EmployeeSalaryBreakdownModal employeeId={modalEmployee.id} employeeName={modalEmployee.name} onClose={() => setModalEmployee(null)} onAllocation={employeeId => { setModalEmployee(null); onAllocation(employeeId); }} />}
  </>;
}

/* -------------------------------- Advances -------------------------------- */

type AdvanceRow = { name: string; id: string; earned: number; deductions: number; eligible: number; requested: number; state: string };
const advanceTone = (state: string): StatusTone => state === "Approved" ? "success" : state === "Pending" ? "warning" : "danger";

export function AdvancesScreen({ onCreate }: { onCreate: () => void }) {
  const notify = useToast();
  const confirm = useConfirm();
  const { getBreakdown } = usePayroll();
  const [reviewing, setReviewing] = useState<AdvanceRow | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const seeds = [
    { id: "BMG-2274", requested: 3000, state: "Pending" },
    { id: "BMG-1988", requested: 3500, state: "Approved" },
    { id: "BMG-2031", requested: 3000, state: "Pending" },
  ];
  const rows: AdvanceRow[] = seeds.map(seed => {
    const employee = employees.find(item => item.id === seed.id);
    const breakdown = getBreakdown(seed.id);
    const deductions = breakdown.pf + breakdown.esi + breakdown.otherDeductions;
    const eligibility = computeAdvanceEligibility({ grossEarned: breakdown.gross, deductionsToDate: deductions, alreadyRequested: 0 });
    const state = decisions[seed.id] ?? (seed.requested > eligibility.maxAdvance ? "Over limit" : seed.state);
    return { name: employee?.name ?? seed.id, id: seed.id, earned: breakdown.gross, deductions, eligible: eligibility.maxAdvance, requested: seed.requested, state };
  });
  const pending = rows.filter(row => row.state === "Pending");
  const approved = rows.filter(row => row.state === "Approved");
  const overLimit = rows.filter(row => row.state === "Over limit");

  async function decide(row: AdvanceRow, state: "Approved" | "Rejected") {
    if (state === "Rejected" && !await confirm({ title: `Reject ${row.name}'s advance?`, description: `The ${rupees(row.requested)} request will be declined and the employee notified in the app.`, confirmLabel: "Reject request", destructive: true })) return;
    setDecisions(current => ({ ...current, [row.id]: state }));
    setReviewing(null);
    notify(state === "Approved" ? "Advance approved" : "Advance rejected");
  }

  return <>
    <PageHeader title="Salary advances" subtitle="An employee can take up to 40% of what they've earned this month, after deductions."
      actions={<Button onClick={onCreate}><Plus />New advance</Button>} />
    <StatStrip items={[
      { icon: Coins, value: String(pending.length), label: "Awaiting decision", note: `${rupees(pending.reduce((sum, row) => sum + row.requested, 0))} requested`, tone: pending.length ? "orange" : "green" },
      { icon: CheckCircle2, value: String(approved.length), label: "Approved", note: `${rupees(approved.reduce((sum, row) => sum + row.requested, 0))} this month`, tone: "green" },
      { icon: AlertTriangle, value: String(overLimit.length), label: "Over the limit", note: "Amount must be reduced", tone: overLimit.length ? "red" : "green" },
      { icon: Wallet, value: "₹2.84L", label: "Outstanding", note: "Across 74 employees" },
    ]} />
    <Panel title="Requests" description="Select a request to review it." flush>
      <DataTable rows={rows} rowKey={row => row.id} onRowClick={setReviewing}
        empty={<div className="p-4"><EmptyState icon={Coins} message="No advance requests this month." actionLabel="New advance" onAction={onCreate} /></div>}
        columns={[
          { header: "Employee", cell: row => <PersonCell name={row.name} id={row.id} /> },
          { header: "Earned", align: "right", cell: row => rupees(row.earned), hideOnMobile: true },
          { header: "Deductions", align: "right", cell: row => `− ${rupees(row.deductions)}`, hideOnMobile: true },
          { header: "Limit (40%)", align: "right", cell: row => rupees(row.eligible) },
          { header: "Requested", align: "right", cell: row => <strong className={row.requested > row.eligible ? "text-status-danger" : ""}>{rupees(row.requested)}</strong> },
          { header: "Used", cell: row => <div className="w-24"><ProgressBar value={row.eligible > 0 ? row.requested / row.eligible * 100 : 100} tone={row.requested > row.eligible ? "danger" : "emerald"} /></div>, hideOnMobile: true },
          { header: "Status", cell: row => <StatusChip tone={advanceTone(row.state)}>{row.state}</StatusChip> },
          { header: "", cell: () => <ChevronRight className="ml-auto h-4 w-4 text-muted" />, hideOnMobile: true },
        ]} />
    </Panel>
    {reviewing && <AdvanceDrawer row={reviewing} onDecide={decide} onClose={() => setReviewing(null)} />}
  </>;
}

function AdvanceDrawer({ row, onDecide, onClose }: { row: AdvanceRow; onDecide: (row: AdvanceRow, state: "Approved" | "Rejected") => void; onClose: () => void }) {
  const overLimit = row.requested > row.eligible;
  const decided = row.state === "Approved" || row.state === "Rejected";
  const instalment = Math.round(row.requested / 3);
  return <DetailDrawer title={row.name} subtitle={`${row.id} · advance of ${rupees(row.requested)}`} onClose={onClose}
    footer={decided ? <Button variant="outline" onClick={onClose}>Close</Button> : <>
      <Button variant="outline" className="text-status-danger" onClick={() => onDecide(row, "Rejected")}>Reject</Button>
      <Button disabled={overLimit} onClick={() => onDecide(row, "Approved")}><CheckCircle2 />Approve advance</Button>
    </>}>
    {decided && <InlineAlert tone={row.state === "Approved" ? "success" : "danger"} className="mb-4">This request was {row.state.toLowerCase()}.</InlineAlert>}
    {overLimit && <InlineAlert tone="warning" className="mb-4">The request is {rupees(row.requested - row.eligible)} over the 40% limit. Ask the employee to reduce it before approving.</InlineAlert>}
    <Section title="Eligibility">
      <DefRows rows={[
        { label: "Earned this month", value: rupees(row.earned), mono: true },
        { label: "Deductions so far", value: `− ${rupees(row.deductions)}`, mono: true },
        { label: "Limit (40%)", value: rupees(row.eligible), mono: true },
        { label: "Requested", value: rupees(row.requested), mono: true },
        { label: "Remaining limit", value: rupees(Math.max(0, row.eligible - row.requested)), mono: true, total: true },
      ]} />
      <div className="mt-3"><ProgressBar value={row.eligible > 0 ? row.requested / row.eligible * 100 : 100} tone={overLimit ? "danger" : "emerald"} /></div>
    </Section>
    <Section title="Repayment">
      <DefRows rows={[
        { label: "Instalments", value: "3 months", mono: true },
        { label: "Monthly deduction", value: rupees(instalment), mono: true },
        { label: "First deduction", value: "September 2026 payroll" },
      ]} />
    </Section>
    <Section title="History">
      <Timeline entries={[
        { title: "Submitted from the guard app", time: "09 Sep · 14:22", state: "done" },
        { title: "Limit checked automatically", time: "09 Sep · 14:22", note: overLimit ? "Flagged: above 40% of earnings after deductions." : "Within 40% of earnings after deductions.", state: "done" },
        { title: decided ? `${row.state} by HR` : "Waiting for HR decision", time: decided ? "Today" : "Pending", state: decided ? "done" : "active" },
      ]} />
    </Section>
  </DetailDrawer>;
}

/* ------------------------------ Spare payments ----------------------------- */

export function SparePaymentsScreen() {
  const notify = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<SpareDutyPayment[]>(spareDutyPayments);
  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const transfer = async (row: SpareDutyPayment) => {
    const name = employeeOf(row.employeeId)?.name ?? row.employeeId;
    if (!await confirm({ title: `Mark ${rupees(row.amount)} as transferred to ${name}?`, description: "Confirm the bank transfer is complete. Operations in-charge and Finance will be notified.", confirmLabel: "Mark transferred" })) return;
    setRows(current => current.map(item => item.id === row.id ? { ...item, status: "transferred" } : item));
    notify("Transfer recorded · Operations and Finance notified");
  };
  const queued = rows.filter(item => item.status === "queued");
  return <>
    <PageHeader title={NAV.sparePayments} subtitle="Same-day payments to spare guards for extra duties. Operations in-charge and Finance are notified on every transfer." />
    <StatStrip items={[
      { icon: Coins, value: String(queued.length), label: "To transfer", note: rupees(queued.reduce((sum, item) => sum + item.amount, 0)), tone: queued.length ? "orange" : "green" },
      { icon: Wallet, value: rupees(rows.filter(item => item.status === "transferred").reduce((sum, item) => sum + item.amount, 0)), label: "Transferred", note: "This week", tone: "green" },
      { icon: CheckCircle2, value: String(rows.length), label: "Spare duties", note: "This week" },
      { icon: ShieldCheck, value: "Ops + Finance", label: "Notified", note: "On every transfer" },
    ]} />
    <Panel title="Payments" flush>
      <DataTable rows={rows} rowKey={row => row.id}
        empty={<div className="p-4"><EmptyState icon={Coins} message="No spare duty payments this week." /></div>}
        columns={[
          { header: "Employee", cell: row => { const employee = employeeOf(row.employeeId); return <PersonCell name={employee?.name ?? row.employeeId} id={row.employeeId} phone={employee?.phone} />; } },
          { header: "Date", cell: row => formatAppDate(row.date) },
          { header: "Site", cell: row => row.site },
          { header: "Amount", align: "right", cell: row => <strong>{rupees(row.amount)}</strong> },
          { header: "Status", cell: row => <StatusChip tone={row.status === "transferred" ? "success" : "warning"}>{row.status === "transferred" ? "Transferred" : "To transfer"}</StatusChip> },
          { header: "Action", align: "right", cell: row => row.status === "queued" ? <Button size="sm" variant="outline" onClick={() => transfer(row)}>Mark transferred</Button> : <span className="text-xs text-muted">Done</span> },
        ]} />
    </Panel>
  </>;
}

/* --------------------------------- Uniforms -------------------------------- */

const uniformStatusLabel: Record<UniformRequestStatus, string> = { requested: "Requested", approved: "Approved", dispatched: "Dispatched", delivered: "Delivered" };

export function UniformsScreen({ onIssue, onImport }: { onIssue: () => void; onImport: () => void }) {
  const notify = useToast();
  const [plan, setPlan] = useState<(typeof uniformPlans)[number] | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [requests, setRequests] = useState<UniformRequest[]>(uniformRequests);
  const updateStatus = (id: string, status: UniformRequestStatus) => {
    const request = requests.find(item => item.id === id);
    setRequests(current => current.map(item => item.id === id ? { ...item, status } : item));
    notify(`Request ${uniformStatusLabel[status].toLowerCase()}${status === "dispatched" ? ` · ${rupees(request?.amount ?? 0)} queued for salary recovery` : ""}`);
  };
  const lowStock = uniformKit.filter(item => item.stock < item.reorder);
  const exportStock = () => {
    downloadCsv("uniform-stock", ["Item", "Per kit", "In stock", "Reorder level"], uniformKit.map(item => [item.item, item.issued, item.stock, item.reorder]));
    notify("Stock report downloaded");
  };

  return <>
    <PageHeader title={NAV.uniforms} subtitle="Kit stock by batch, guard requests, dispatch and salary recovery."
      actions={<><Button variant="outline" onClick={onImport}><Upload />Import balances</Button><Button onClick={onIssue}><Plus />Issue kit</Button></>} />
    <StatStrip items={[
      { icon: Shirt, value: "76", label: "Kits issued", note: "This quarter" },
      { icon: Package, value: String(new Set(uniformBatches.map(batch => batch.batchNo)).size), label: "Batches tracked", note: "Stock by size", tone: "green" },
      { icon: Wallet, value: "₹1.82L", label: "Pending recovery", note: "93 employees", tone: "orange" },
      { icon: AlertTriangle, value: String(requests.filter(item => item.status === "requested").length), label: "New requests", note: "From the guard app", tone: "red" },
    ]} />
    <SplitLayout>
      <Panel title="Recovery plans" description="The default can be overridden per employee.">
        {uniformPlans.map(item => (
          <ListRow key={item.name} onClick={() => setPlan(item)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/10 text-emerald"><Shirt className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><strong className="block text-sm">{item.name}</strong><small className="text-xs text-muted">{rupees(item.upfront)} upfront · {rupees(item.deduction)} from salary</small></div>
            <span className="text-xs text-muted">{item.people} people</span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </ListRow>
        ))}
      </Panel>
      <Panel title="Stock" description="Central store · Thiruvananthapuram" action={<Button variant="outline" size="sm" onClick={() => setInventoryOpen(true)}>View all items</Button>}>
        {lowStock.length > 0 && <InlineAlert tone="warning" className="mb-3">{lowStock.length} of {uniformKit.length} items are below the reorder level.</InlineAlert>}
        <div className="grid gap-3">
          {uniformKit.slice(0, 6).map(item => (
            <div key={item.item} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-sm">
              <span className="truncate">{item.item.split(" (")[0]}</span>
              <ProgressBar value={Math.min(100, item.stock / 2.6)} tone={item.stock < item.reorder ? "warn" : "emerald"} />
              <strong className="text-right tabular-nums">{item.stock}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </SplitLayout>
    <Panel title="Requests from guards" description="Status changes appear in the guard's app immediately." flush>
      <DataTable rows={requests} rowKey={row => row.id}
        empty={<div className="p-4"><EmptyState icon={Package} message="No uniform requests from guards." /></div>}
        columns={[
          { header: "Employee", cell: row => { const employee = employees.find(item => item.id === row.employeeId); return <PersonCell name={employee?.name ?? row.employeeId} id={row.employeeId} phone={employee?.phone} />; } },
          { header: "Items", cell: row => <span className="font-medium">{row.items.map(item => `${item.item.split(" (")[0]} · ${item.size} ×${item.qty}`).join(", ")}</span> },
          { header: "Requested", cell: row => <span className="text-xs text-muted">{formatAppDate(row.requestedOn)} · {rupees(row.amount)} · {row.recoveryPlan}</span>, hideOnMobile: true },
          { header: "Status", cell: row => (
            <Select className="h-9 w-36" value={row.status} onChange={event => updateStatus(row.id, event.target.value as UniformRequestStatus)} aria-label={`${row.id} status`}>
              {(Object.keys(uniformStatusLabel) as UniformRequestStatus[]).map(status => <option key={status} value={status}>{uniformStatusLabel[status]}</option>)}
            </Select>
          ) },
        ]} />
    </Panel>

    {plan && <DetailDrawer title={plan.name} subtitle="Uniform recovery plan" onClose={() => setPlan(null)}
      footer={<>
        <Button variant="outline" onClick={() => setPlan(null)}>Close</Button>
        <Button onClick={() => { notify(`${plan.name} is now the default plan`); setPlan(null); }}><CheckCircle2 />Make default</Button>
      </>}>
      <Section title="How it's paid">
        <DefRows rows={[
          { label: "Paid when issued", value: rupees(plan.upfront), mono: true },
          { label: "Recovered from salary", value: rupees(plan.deduction), mono: true },
          { label: "Total cost to employee", value: rupees(plan.total), mono: true, total: true },
        ]} />
        <p className="mt-3 text-xs leading-relaxed text-muted">{plan.note}</p>
      </Section>
      <Section title="Uptake">
        <KeyValue label="Employees on this plan" value={plan.people} />
        <KeyValue label="Share of workforce" value={`${Math.round(plan.people / 468 * 100)}%`} />
        <KeyValue label="Outstanding balance" value={rupees(plan.deduction * Math.round(plan.people * 0.4))} />
      </Section>
      <InlineAlert>An employee with an unpaid balance on this plan can't complete exit clearance.</InlineAlert>
    </DetailDrawer>}

    {inventoryOpen && <DetailDrawer wide title="Uniform kit stock" subtitle="Central store · Thiruvananthapuram" onClose={() => setInventoryOpen(false)}
      footer={<>
        <Button variant="outline" onClick={() => setInventoryOpen(false)}>Close</Button>
        <Button onClick={exportStock}><Download />Export stock</Button>
      </>}>
      {lowStock.length > 0 && <InlineAlert tone="warning" className="mb-4">{lowStock.map(item => item.item.split(" (")[0]).join(", ")} {lowStock.length === 1 ? "is" : "are"} below the reorder level.</InlineAlert>}
      <div className="grid gap-3 sm:grid-cols-2">
        {uniformKit.map(item => {
          const batches = uniformBatches.filter(batch => batch.item === item.item);
          const low = item.stock < item.reorder;
          return (
            <div key={item.item} className="rounded-xl border border-border p-3">
              <strong className="block text-sm">{item.item}</strong>
              <div className="my-1 flex justify-between text-xs text-muted"><span>{item.issued} per kit</span><span className={low ? "font-semibold text-status-danger" : ""}>{item.stock} in stock</span></div>
              <ProgressBar value={Math.min(100, item.stock / 2.8)} tone={low ? "warn" : "emerald"} />
              {batches.length > 0 && <div className="mt-2 grid gap-0.5">{batches.map(batch => <span key={`${batch.batchNo}-${batch.size}`} className="text-[11px] text-muted"><b className="text-foreground">{batch.batchNo}</b> · size {batch.size} · {batch.qty} pcs · {batch.receivedOn}</span>)}</div>}
            </div>
          );
        })}
      </div>
    </DetailDrawer>}
  </>;
}
