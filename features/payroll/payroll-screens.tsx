"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ChevronRight, Coins, Download, Plus,
  Receipt, ShieldCheck, Wallet,
} from "lucide-react";
import { employees, lateAndAbsent, rupees, spareDutyPayments } from "@/lib/mock-data";
import type { SpareDutyPayment } from "@/types/domain";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";
import { payBasisLabel } from "@/lib/payroll-calculator";
import {
  Button, DataTable, DefRows, DetailDrawer, EmptyState, InlineAlert, PageHeader, Panel,
  PersonCell, ProgressBar, Section, SplitLayout, StatStrip, StatusChip, Stepper, Timeline, useConfirm,
  type Column, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { usePayroll } from "@/components/shared/payroll-context";
import { EmployeeSalaryBreakdownModal } from "@/features/payroll/employee-salary-breakdown";
import { downloadCsv } from "@/lib/download";
import { formatAppDate } from "@/lib/app-date";
import { NAV } from "@/lib/labels";
import type { NavClickMeta } from "@/lib/nav-config";

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

type RowFilter = "ready" | "issues" | null;
type Navigate = (view: string, meta?: string | NavClickMeta) => void;

function PayrollStageStats({ stage, rows, totals, exceptions, paid, filter, onFilter, onStage, onNavigate }: {
  stage: number; rows: PayrollRow[]; totals: Totals; exceptions: number; paid: boolean; filter: RowFilter; onFilter: (filter: RowFilter) => void; onStage: (stage: number) => void; onNavigate?: Navigate;
}) {
  const dutyTotal = rows.reduce((sum, row) => sum + row.breakdown.duties, 0);
  const readyCount = rows.filter(row => row.breakdown.exceptions.length === 0).length;
  const reviewCount = rows.length - readyCount;
  const toggle = (next: Exclude<RowFilter, null>) => ({ onClick: () => onFilter(filter === next ? null : next), active: filter === next });
  const go = (view: string, meta?: NavClickMeta) => () => onNavigate?.(view, meta);

  if (stage === 0) return <StatStrip items={[
    { icon: CalendarCheck, value: dutyTotal.toFixed(2), label: "Approved duties", note: "Across payable employees", onClick: go("reports", { report: "Attendance summary" }), actionLabel: "Open the attendance summary report" },
    { icon: Wallet, value: String(rows.length), label: "Employees in run", note: "With approved attendance", onClick: go("workforce"), actionLabel: "Open the workforce list" },
    { icon: AlertTriangle, value: String(lateAndAbsent.length), label: "Attendance flags", note: "Late or absent today", tone: "orange", onClick: go("attendance"), actionLabel: "Review flagged attendance" },
    { icon: CheckCircle2, value: "Locked", label: "Period", note: "August 2026 duties", tone: "green", onClick: () => onStage(1), actionLabel: "Go to the calculation stage" },
  ]} />;

  if (stage === 1) return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.gross), label: "Calculated gross", note: "From resolved duty rates", onClick: () => onStage(2), actionLabel: "Go to the review stage" },
    { icon: ShieldCheck, value: String(rows.reduce((sum, row) => sum + row.breakdown.sites.length, 0)), label: "Site allocations", note: "Across all employees", onClick: go("payroll-allocation"), actionLabel: "Open the multi-site allocation audit" },
    { icon: Receipt, value: rupees(totals.other), label: "Deductions loaded", note: "Advance, uniform, penalty", tone: "orange", onClick: go("reports", { report: "Deduction log" }), actionLabel: "Open the deduction log report" },
    { icon: AlertTriangle, value: String(exceptions), label: "Setup exceptions", note: exceptions ? "Needs correction" : "All rules resolved", tone: exceptions ? "red" : "green", ...toggle("issues"), actionLabel: "Show employees with exceptions" },
  ]} />;

  if (stage === 3) return <StatStrip items={[
    { icon: CheckCircle2, value: String(readyCount), label: "Ready to approve", note: "No blocking exceptions", tone: "green", ...toggle("ready"), actionLabel: "Show employees ready to approve" },
    { icon: AlertTriangle, value: String(reviewCount), label: "On hold", note: reviewCount ? "Resolve before approval" : "All clear", tone: reviewCount ? "orange" : "green", ...toggle("issues"), actionLabel: "Show employees on hold" },
    { icon: Wallet, value: rupees(totals.net), label: "Net payable", note: `${rows.length} employees`, onClick: go("reports", { report: "Net payout register" }), actionLabel: "Open the net payout register" },
    { icon: ShieldCheck, value: rupees(totals.statutory), label: "PF and ESI", note: "Employee contributions", onClick: go("reports", { report: "Statutory contributions" }), actionLabel: "Open the statutory contributions report" },
  ]} />;

  if (stage === 4) return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.net), label: "Payment batch", note: paid ? "Locked" : "Awaiting release", onClick: go("reports", { report: "Net payout register" }), actionLabel: "Open the net payout register" },
    { icon: CheckCircle2, value: String(rows.length), label: "Employees", note: "In August 2026", tone: paid ? "green" : "orange", onClick: go("workforce"), actionLabel: "Open the workforce list" },
    { icon: Receipt, value: rupees(totals.other), label: "Other deductions", note: "Already netted off", onClick: go("penalties"), actionLabel: "Open penalties and deductions" },
    { icon: ShieldCheck, value: paid ? "Closed" : "Open", label: "Payroll period", note: paid ? "Calculations locked" : "Ready to mark paid", tone: paid ? "green" : undefined, onClick: go("payroll-allocation"), actionLabel: "Open the allocation audit trail" },
  ]} />;

  return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.gross), label: "Gross payroll", note: `${rows.length} employees`, onClick: go("reports", { report: "Net payout register" }), actionLabel: "Open the net payout register" },
    { icon: ShieldCheck, value: rupees(totals.statutory), label: "PF and ESI", note: "Eligible site earnings", onClick: go("reports", { report: "Statutory contributions" }), actionLabel: "Open the statutory contributions report" },
    { icon: Receipt, value: rupees(totals.other), label: "Other deductions", note: "Advance, uniform, penalty", tone: "orange", onClick: go("penalties"), actionLabel: "Open penalties and deductions" },
    { icon: AlertTriangle, value: String(exceptions), label: "Exceptions", note: exceptions ? "Blocking approval" : "Ready for approval", tone: exceptions ? "red" : "green", ...toggle("issues"), actionLabel: "Show employees with exceptions" },
  ]} />;
}

const person: Column<PayrollRow> = { header: "Employee", cell: row => <PersonCell name={row.employee.name} id={row.employee.id} phone={row.employee.phone} /> };
const statusCell = (ok: boolean, okLabel: string, badLabel: string) => <StatusChip tone={ok ? "success" : "warning"}>{ok ? okLabel : badLabel}</StatusChip>;

function PayrollStagePanel({ stage, rows, totals, exceptions, paid, filter, onOpenEmployee }: {
  stage: number; rows: PayrollRow[]; totals: Totals; exceptions: number; paid: boolean; filter: RowFilter; onOpenEmployee: (employee: { id: string; name: string }) => void;
}) {
  const open = (row: PayrollRow) => onOpenEmployee({ id: row.employee.id, name: row.employee.name });
  const shown = filter ? rows.filter(row => (row.breakdown.exceptions.length > 0) === (filter === "issues")) : rows;
  const noMatch = <div className="p-4"><EmptyState icon={CheckCircle2} message="No employees match this filter." /></div>;

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
      <DataTable rows={shown} rowKey={row => row.employee.id} onRowClick={open} empty={noMatch} columns={[
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
        <strong className="block font-medium">{blocked.length} employee{blocked.length === 1 ? " is" : "s are"} blocking approval</strong>
        <ul className="mt-1 list-disc pl-4">{blocked.map(row => <li key={row.employee.id}>{row.employee.name}: {row.breakdown.exceptions[0]?.message}</li>)}</ul>
      </InlineAlert>}
      <SplitLayout wideFirst className="mb-0">
        <Panel title="Employee readiness" description={exceptions ? "Resolve every setup exception before approving." : "Every employee is ready for approval."} flush>
          <DataTable rows={shown} rowKey={row => row.employee.id} onRowClick={open} empty={noMatch} columns={[
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
      <DataTable rows={shown} rowKey={row => row.employee.id} onRowClick={open} empty={noMatch} columns={[
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

export function PayrollScreen({ onAllocation, onNavigate }: { onAllocation: (employeeId: string) => void; onNavigate?: Navigate }) {
  const notify = useToast();
  const confirm = useConfirm();
  const { getBreakdown, closePeriod, isPeriodClosed } = usePayroll();
  const rows = useMemo(() => employees.map(employee => ({ employee, breakdown: getBreakdown(employee.id) })).filter(row => row.breakdown.duties > 0), [getBreakdown]);
  const paid = isPeriodClosed();
  const [chosenStage, setStage] = useState(2);
  const [reachedStage, setMaxStage] = useState(2);
  const stage = paid ? 4 : chosenStage;
  const maxStage = paid ? 4 : reachedStage;
  const [modalEmployee, setModalEmployee] = useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = useState<RowFilter>(null);
  const goToStage = (index: number) => { if (index <= maxStage) { setStage(index); setFilter(null); } };
  const exceptions = rows.reduce((sum, row) => sum + row.breakdown.exceptions.length, 0);
  const totals = rows.reduce((result, row) => ({
    gross: result.gross + row.breakdown.gross,
    statutory: result.statutory + row.breakdown.pf + row.breakdown.esi,
    other: result.other + row.breakdown.otherDeductions,
    net: result.net + row.breakdown.net,
  }), { gross: 0, statutory: 0, other: 0, net: 0 });

  async function advance() {
    if (stage < 4) {
      const next = stage + 1;
      setStage(next);
      setFilter(null);
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
    <Stepper steps={stages} current={stage} maxReached={maxStage} onSelect={goToStage} />
    <PayrollStageStats stage={stage} rows={rows} totals={totals} exceptions={exceptions} paid={paid} filter={filter} onFilter={setFilter} onStage={goToStage} onNavigate={onNavigate} />
    <PayrollStagePanel stage={stage} rows={rows} totals={totals} exceptions={exceptions} paid={paid} filter={filter} onOpenEmployee={setModalEmployee} />
    {modalEmployee && <EmployeeSalaryBreakdownModal employeeId={modalEmployee.id} employeeName={modalEmployee.name} onClose={() => setModalEmployee(null)} onAllocation={employeeId => { setModalEmployee(null); onAllocation(employeeId); }} />}
  </>;
}

/* -------------------------------- Advances -------------------------------- */

type AdvanceRow = { name: string; id: string; earned: number; deductions: number; eligible: number; requested: number; state: string };
const advanceTone = (state: string): StatusTone => state === "Approved" ? "success" : state === "Pending" ? "warning" : "danger";

export function AdvancesScreen({ onCreate, onNavigate }: { onCreate: () => void; onNavigate?: Navigate }) {
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
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const toggle = (state: string) => ({ onClick: () => setStateFilter(current => current === state ? null : state), active: stateFilter === state });

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
      { icon: Coins, value: String(pending.length), label: "Awaiting decision", note: `${rupees(pending.reduce((sum, row) => sum + row.requested, 0))} requested`, tone: pending.length ? "orange" : "green", ...toggle("Pending"), actionLabel: "Show requests awaiting a decision" },
      { icon: CheckCircle2, value: String(approved.length), label: "Approved", note: `${rupees(approved.reduce((sum, row) => sum + row.requested, 0))} this month`, tone: "green", ...toggle("Approved"), actionLabel: "Show approved requests" },
      { icon: AlertTriangle, value: String(overLimit.length), label: "Over the limit", note: "Amount must be reduced", tone: overLimit.length ? "red" : "green", ...toggle("Over limit"), actionLabel: "Show requests over the limit" },
      { icon: Wallet, value: "₹2.84L", label: "Outstanding", note: "Across 74 employees", onClick: () => onNavigate?.("reports", { report: "Deduction log" }), actionLabel: "Open the deduction log report" },
    ]} />
    <Panel title="Requests" description="Select a request to review it." flush>
      <DataTable rows={stateFilter ? rows.filter(row => row.state === stateFilter) : rows} rowKey={row => row.id} onRowClick={setReviewing}
        empty={<div className="p-4">{stateFilter ? <EmptyState icon={Coins} message="No requests match this filter." actionLabel="Show all" onAction={() => setStateFilter(null)} /> : <EmptyState icon={Coins} message="No advance requests this month." actionLabel="New advance" onAction={onCreate} />}</div>}
        columns={[
          { header: "Employee", cell: row => <PersonCell name={row.name} id={row.id} phone={employees.find(item => item.id === row.id)?.phone} /> },
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

export function SparePaymentsScreen({ onNavigate }: { onNavigate?: Navigate }) {
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
  const [statusFilter, setStatusFilter] = useState<SpareDutyPayment["status"] | null>(null);
  const toggle = (status: SpareDutyPayment["status"]) => ({ onClick: () => setStatusFilter(current => current === status ? null : status), active: statusFilter === status });
  return <>
    <PageHeader title={NAV.sparePayments} subtitle="Same-day payments to spare guards for extra duties. Operations in-charge and Finance are notified on every transfer." />
    <StatStrip items={[
      { icon: Coins, value: String(queued.length), label: "To transfer", note: rupees(queued.reduce((sum, item) => sum + item.amount, 0)), tone: queued.length ? "orange" : "green", ...toggle("queued"), actionLabel: "Show payments to transfer" },
      { icon: Wallet, value: rupees(rows.filter(item => item.status === "transferred").reduce((sum, item) => sum + item.amount, 0)), label: "Transferred", note: "This week", tone: "green", ...toggle("transferred"), actionLabel: "Show transferred payments" },
      { icon: CheckCircle2, value: String(rows.length), label: "Spare duties", note: "This week", onClick: () => onNavigate?.("duty-changes"), actionLabel: "Open duty changes" },
      { icon: ShieldCheck, value: "Ops + Finance", label: "Notified", note: "On every transfer", onClick: () => onNavigate?.("settings", { settingsGroup: "Notifications" }), actionLabel: "Open notification settings" },
    ]} />
    <Panel title="Payments" flush>
      <DataTable rows={statusFilter ? rows.filter(row => row.status === statusFilter) : rows} rowKey={row => row.id}
        empty={<div className="p-4">{statusFilter ? <EmptyState icon={Coins} message="No payments match this filter." actionLabel="Show all" onAction={() => setStatusFilter(null)} /> : <EmptyState icon={Coins} message="No spare duty payments this week." />}</div>}
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
