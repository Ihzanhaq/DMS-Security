"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  approvedDuties, employeePayRules as initialEmployeeRules, payrollDeductions,
  postRateRules as initialPostRules, sitePayRules as initialSiteRules, statutorySettings,
} from "@/lib/mock-data";
import { calculatePayroll } from "@/lib/payroll-calculator";
import type { EmployeePayRule, PayrollBreakdown, PostRateRule, SitePayRule } from "@/types/domain";

type PayrollContextValue = {
  employeeRules: EmployeePayRule[];
  siteRules: SitePayRule[];
  postRules: PostRateRule[];
  updateEmployeeRule: (rule: EmployeePayRule) => void;
  updateSiteRule: (rule: SitePayRule) => void;
  updatePostRule: (rule: PostRateRule | null, site: string, post: string, effectiveFrom: string) => void;
  getBreakdown: (employeeId: string, period?: string) => PayrollBreakdown;
  closePeriod: (period?: string) => boolean;
  isPeriodClosed: (period?: string) => boolean;
};

const PayrollContext = createContext<PayrollContextValue | null>(null);

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const [employeeRules, setEmployeeRules] = useState<EmployeePayRule[]>(initialEmployeeRules);
  const [siteRules, setSiteRules] = useState<SitePayRule[]>(initialSiteRules);
  const [postRules, setPostRules] = useState<PostRateRule[]>(initialPostRules);
  const [snapshots, setSnapshots] = useState<Record<string, Record<string, PayrollBreakdown>>>({});

  const calculate = useCallback((employeeId: string, period = "2026-08") => calculatePayroll({
    employeeId, period, duties: approvedDuties, employeeRules, siteRules, postRules,
    deductions: payrollDeductions, statutory: statutorySettings, includePaidLeave: true,
  }), [employeeRules, siteRules, postRules]);

  const getBreakdown = useCallback((employeeId: string, period = "2026-08") =>
    snapshots[period]?.[employeeId] ?? calculate(employeeId, period), [calculate, snapshots]);

  const updateEmployeeRule = useCallback((rule: EmployeePayRule) => setEmployeeRules(current => [
    ...current.filter(item => !(item.employeeId === rule.employeeId && item.effectiveFrom === rule.effectiveFrom)),
    rule,
  ]), []);

  const updateSiteRule = useCallback((rule: SitePayRule) => setSiteRules(current => [
    ...current.filter(item => !(item.site === rule.site && item.effectiveFrom === rule.effectiveFrom)),
    rule,
  ]), []);

  const updatePostRule = useCallback((rule: PostRateRule | null, site: string, post: string, effectiveFrom: string) =>
    setPostRules(current => [
      ...current.filter(item => !(item.site === site && item.post === post && item.effectiveFrom === effectiveFrom)),
      ...(rule ? [rule] : []),
    ]), []);

  const closePeriod = useCallback((period = "2026-08") => {
    const ids = Array.from(new Set(approvedDuties.filter(duty => duty.date.startsWith(period)).map(duty => duty.employeeId)));
    const next = Object.fromEntries(ids.map(id => [id, calculate(id, period)]));
    if (Object.values(next).some(item => item.exceptions.length > 0)) return false;
    setSnapshots(current => ({ ...current, [period]: next }));
    return true;
  }, [calculate]);

  const value = useMemo<PayrollContextValue>(() => ({
    employeeRules, siteRules, postRules, updateEmployeeRule, updateSiteRule, updatePostRule,
    getBreakdown, closePeriod, isPeriodClosed: (period = "2026-08") => Boolean(snapshots[period]),
  }), [employeeRules, siteRules, postRules, updateEmployeeRule, updateSiteRule, updatePostRule, getBreakdown, closePeriod, snapshots]);

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>;
}

export function usePayroll() {
  const value = useContext(PayrollContext);
  if (!value) throw new Error("usePayroll must be used inside PayrollProvider");
  return value;
}
