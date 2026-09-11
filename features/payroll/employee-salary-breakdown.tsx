"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, ShieldCheck, X, WarningCircle } from "@phosphor-icons/react";
import { rupees } from "@/lib/mock-data";
import { payBasisLabel } from "@/lib/payroll-calculator";
import { usePayroll } from "@/components/shared/payroll-context";
import type { PayrollBreakdown } from "@/types/domain";

const periods = [
  { value: "2026-08", label: "August 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-06", label: "June 2026" },
];

function SalaryTotals({ breakdown }: { breakdown: PayrollBreakdown }) {
  return (
    <div className="salary-totals">
      <div><span>Gross</span><strong>{rupees(breakdown.gross)}</strong></div>
      <div><span>PF</span><strong>− {rupees(breakdown.pf)}</strong></div>
      <div><span>ESI</span><strong>− {rupees(breakdown.esi)}</strong></div>
      <div><span>Other</span><strong>− {rupees(breakdown.otherDeductions)}</strong></div>
      <div className="salary-net"><span>Net payable</span><strong>{rupees(breakdown.net)}</strong></div>
    </div>
  );
}

function SalaryExceptions({ breakdown }: { breakdown: PayrollBreakdown }) {
  if (breakdown.exceptions.length === 0) return null;
  return (
    <div className="payroll-exception" role="alert">
      <WarningCircle weight="fill" />
      <div>
        <strong>Payroll configuration required</strong>
        {breakdown.exceptions.map((item, index) => (
          <span key={`${item.code}-${index}`}>{item.message}</span>
        ))}
      </div>
    </div>
  );
}

function SalarySiteDetails({ breakdown, expanded }: { breakdown: PayrollBreakdown; expanded?: boolean }) {
  if (breakdown.sites.length === 0) {
    return <div className="salary-empty">No approved payable duties in this month.</div>;
  }

  return (
    <div className="salary-sites">
      {breakdown.sites.map(site => (
        <details key={site.site} defaultOpen={expanded ?? breakdown.sites.length <= 3}>
          <summary>
            <div className="salary-site-summary">
              <div>
                <strong>{site.site}</strong>
                <small>{site.duties.toFixed(2)} duties · {site.schemeLabel} · {site.rateSources.join(" / ")} rate</small>
              </div>
              <span className="salary-site-stat">{rupees(site.gross)}</span>
              <span className="salary-site-stat">− {rupees(site.pf + site.esi)}</span>
              <b>{rupees(site.net)}</b>
              <CaretDown />
            </div>
          </summary>
          <div className="salary-site-body">
            <div className="salary-site-head"><span>Date / post</span><span>Duty</span><span>Rate</span><span>Gross</span></div>
            {site.lines.map(line => (
              <div className="salary-duty-line" key={line.id}>
                <span>
                  <strong>{new Date(`${line.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</strong>
                  <small>{line.post}</small>
                </span>
                <span>{line.quantity.toFixed(2)}</span>
                <span>
                  {line.rate === null ? "Missing" : rupees(line.rate)}
                  <small>{line.rateSource}</small>
                </span>
                <strong>{rupees(line.gross)}</strong>
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
    <div className="salary-deductions">
      <strong>Other deductions</strong>
      {breakdown.deductions.map(item => (
        <span key={item.id}><b>{item.label}</b><em>− {rupees(item.amount)}</em></span>
      ))}
    </div>
  );
}

function SalaryBreakdownModal({
  employeeName,
  employeeId,
  breakdown,
  period,
  onPeriodChange,
  isClosed,
  onClose,
  onAllocation,
}: {
  employeeName: string;
  employeeId: string;
  breakdown: PayrollBreakdown;
  period: string;
  onPeriodChange: (value: string) => void;
  isClosed: boolean;
  onClose: () => void;
  onAllocation?: (employeeId: string) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => trigger?.focus?.();
  }, []);

  const periodLabel = periods.find(item => item.value === period)?.label ?? period;

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section
        ref={panelRef}
        tabIndex={-1}
        className="salary-breakdown-modal"
        onMouseDown={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Salary breakdown for ${employeeName}`}
      >
        <header className="salary-breakdown-modal-head">
          <div>
            <p>{periodLabel}</p>
            <h2>{employeeName}</h2>
            <small>{employeeId} · {payBasisLabel(breakdown.payBasis)} · {isClosed ? "Closed snapshot" : "Live calculation"}</small>
          </div>
          <div className="salary-breakdown-modal-actions">
            <select value={period} onChange={event => onPeriodChange(event.target.value)} aria-label="Salary month">
              {periods.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
          </div>
        </header>

        <div className="salary-breakdown-modal-body">
          <SalaryTotals breakdown={breakdown} />
          <SalaryExceptions breakdown={breakdown} />
          <SalarySiteDetails breakdown={breakdown} expanded />
          <SalaryDeductions breakdown={breakdown} />
        </div>

        {onAllocation && (
          <footer className="salary-breakdown-modal-foot">
            <p>Pay and benefits were resolved for every approved duty.</p>
            <button type="button" className="secondary-button" onClick={() => onAllocation(employeeId)}>
              <ShieldCheck />Open full allocation audit
            </button>
          </footer>
        )}
      </section>
    </div>
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

  return (
    <SalaryBreakdownModal
      employeeId={employeeId}
      employeeName={employeeName}
      breakdown={breakdown}
      period={period}
      onPeriodChange={setPeriod}
      isClosed={isPeriodClosed(period)}
      onClose={onClose}
      onAllocation={onAllocation}
    />
  );
}

export function EmployeeSalaryBreakdown({ employeeId }: { employeeId: string }) {
  const [period, setPeriod] = useState("2026-08");
  const { getBreakdown, isPeriodClosed } = usePayroll();
  const breakdown = getBreakdown(employeeId, period);
  const closed = isPeriodClosed(period);

  return (
    <div className="salary-breakdown">
      <div className="salary-breakdown-head">
        <div>
          <strong>Salary breakdown</strong>
          <small>{payBasisLabel(breakdown.payBasis)} · {closed ? "Closed snapshot" : "Live calculation"}</small>
        </div>
        <select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Salary month">
          {periods.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      <SalaryTotals breakdown={breakdown} />
      <SalaryExceptions breakdown={breakdown} />
      <SalarySiteDetails breakdown={breakdown} />
      <SalaryDeductions breakdown={breakdown} />
    </div>
  );
}
