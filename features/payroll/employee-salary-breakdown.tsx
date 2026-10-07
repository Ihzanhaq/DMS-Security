"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { rupees } from "@/lib/mock-data";
import { payBasisLabel } from "@/lib/payroll-calculator";
import { usePayroll } from "@/components/shared/payroll-context";
import { Button, InlineAlert, Section, Select, Sheet } from "@/components/ui-kit";
import type { PayrollBreakdown } from "@/types/domain";

const periods = [
  { value: "2026-08", label: "August 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-06", label: "June 2026" },
];

function SalaryTotals({ breakdown }: { breakdown: PayrollBreakdown }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {[
        ["Gross", rupees(breakdown.gross)],
        ["PF", `− ${rupees(breakdown.pf)}`],
        ["ESI", `− ${rupees(breakdown.esi)}`],
        ["Other", `− ${rupees(breakdown.otherDeductions)}`],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border p-3">
          <span className="text-xs text-muted">{label}</span>
          <strong className="block text-sm font-semibold tabular-nums">{value}</strong>
        </div>
      ))}
      <div className="col-span-2 rounded-xl bg-emerald/10 p-3 sm:col-span-1">
        <span className="text-xs text-emerald">Net payable</span>
        <strong className="block text-base font-bold text-emerald tabular-nums">{rupees(breakdown.net)}</strong>
      </div>
    </div>
  );
}

function SalaryExceptions({ breakdown }: { breakdown: PayrollBreakdown }) {
  if (breakdown.exceptions.length === 0) return null;
  return (
    <InlineAlert tone="danger" className="mb-4">
      <strong className="block font-medium">Payroll setup needed</strong>
      <ul className="mt-1 list-disc pl-4">
        {breakdown.exceptions.map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}
      </ul>
    </InlineAlert>
  );
}

function SalarySiteDetails({ breakdown, expanded }: { breakdown: PayrollBreakdown; expanded?: boolean }) {
  if (breakdown.sites.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">No approved duties in this month.</p>;
  }

  return (
    <div className="grid gap-2">
      {breakdown.sites.map(site => (
        <details key={site.site} open={expanded ?? breakdown.sites.length <= 3} className="group rounded-xl border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-medium">{site.site}</strong>
              <small className="text-xs text-muted">{site.duties.toFixed(2)} duties · {site.schemeLabel} · {site.rateSources.join(" / ")} rate</small>
            </div>
            <span className="hidden text-xs text-muted tabular-nums sm:inline">{rupees(site.gross)} gross</span>
            <b className="text-sm tabular-nums">{rupees(site.net)}</b>
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border">
            <div className="grid grid-cols-[1fr_60px_90px_90px] gap-2 bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>Date / post</span><span className="text-right">Duty</span><span className="text-right">Rate</span><span className="text-right">Gross</span>
            </div>
            {site.lines.map(line => (
              <div key={line.id} className="grid grid-cols-[1fr_60px_90px_90px] gap-2 border-t border-border px-3 py-2 text-sm">
                <span>
                  <strong className="block font-medium">{new Date(`${line.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</strong>
                  <small className="text-xs text-muted">{line.post}</small>
                </span>
                <span className="text-right tabular-nums">{line.quantity.toFixed(2)}</span>
                <span className="text-right tabular-nums">
                  {line.rate === null ? <span className="text-status-danger">Missing</span> : rupees(line.rate)}
                  <small className="block text-xs text-muted">{line.rateSource}</small>
                </span>
                <strong className="text-right tabular-nums">{rupees(line.gross)}</strong>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function SalaryDeductions({ breakdown }: { breakdown: PayrollBreakdown }) {
  if (breakdown.deductions.length === 0) return null;
  return (
    <Section title="Other deductions" className="mt-5 mb-0">
      <div className="rounded-xl border border-border">
        {breakdown.deductions.map(item => (
          <div key={item.id} className="flex justify-between gap-3 border-t border-border px-3 py-2 text-sm first:border-t-0">
            <span>{item.label}</span><span className="tabular-nums text-status-danger">− {rupees(item.amount)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PeriodSelect({ period, onChange }: { period: string; onChange: (value: string) => void }) {
  return (
    <Select className="h-9 w-auto" value={period} onChange={event => onChange(event.target.value)} aria-label="Salary month">
      {periods.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </Select>
  );
}

export function EmployeeSalaryBreakdownModal({
  employeeId,
  employeeName,
  onClose,
  onAllocation,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onAllocation?: (employeeId: string) => void;
}) {
  const [period, setPeriod] = useState("2026-08");
  const { getBreakdown, isPeriodClosed } = usePayroll();
  const breakdown = getBreakdown(employeeId, period);
  const closed = isPeriodClosed(period);

  return (
    <Sheet open wide title={employeeName} subtitle={`${employeeId} · ${payBasisLabel(breakdown.payBasis)} · ${closed ? "Closed snapshot" : "Live calculation"}`} onClose={onClose}
      footer={onAllocation ? <Button variant="outline" onClick={() => onAllocation(employeeId)}><ShieldCheck />Open allocation audit</Button> : undefined}>
      <div className="mb-4 flex justify-end"><PeriodSelect period={period} onChange={setPeriod} /></div>
      <SalaryTotals breakdown={breakdown} />
      <SalaryExceptions breakdown={breakdown} />
      <SalarySiteDetails breakdown={breakdown} expanded />
      <SalaryDeductions breakdown={breakdown} />
    </Sheet>
  );
}

export function EmployeeSalaryBreakdown({ employeeId }: { employeeId: string }) {
  const [period, setPeriod] = useState("2026-08");
  const { getBreakdown, isPeriodClosed } = usePayroll();
  const breakdown = getBreakdown(employeeId, period);
  const closed = isPeriodClosed(period);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <strong className="block text-sm font-medium">Salary breakdown</strong>
          <small className="text-xs text-muted">{payBasisLabel(breakdown.payBasis)} · {closed ? "Closed snapshot" : "Live calculation"}</small>
        </div>
        <PeriodSelect period={period} onChange={setPeriod} />
      </div>
      <SalaryTotals breakdown={breakdown} />
      <SalaryExceptions breakdown={breakdown} />
      <SalarySiteDetails breakdown={breakdown} />
      <SalaryDeductions breakdown={breakdown} />
    </div>
  );
}
