"use client";

import { useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Upload, UserCheck, UserMinus, Users } from "lucide-react";
import { employees, relieverRates, rupees, skillOptions } from "@/lib/mock-data";
import { useOps } from "@/components/shared/ops-context";
import { useOnboarding } from "@/components/shared/onboarding-context";
import { APP_TODAY } from "@/lib/app-date";
import { daysSince, statutoryNeeds, statutoryStatus } from "@/lib/pf-esi";
import { averageRating } from "@/lib/ratings";
import { EmployeeRatingsPanel } from "./employee-ratings";
import {
  BackCrumb, Button, CallButton, DataTable, DefRows, EmptyState, FilterChips, ListFilterRow, PageHeader, Panel, PersonCell,
  SearchBar, Select, SkillTags, StatStrip, StatusChip, type StatusTone,
} from "@/components/ui-kit";
import { usePayroll } from "@/components/shared/payroll-context";
import { payBasisLabel } from "@/lib/payroll-calculator";
import { EmployeeSalaryBreakdown } from "@/features/payroll/employee-salary-breakdown";
import { NAV } from "@/lib/labels";
import type { Employee } from "@/types/domain";

/** "pf-esi" lists employees who need PF/ESI but whose UAN or ESI IP number isn't on file. */
type StatusFilter = "all" | Employee["status"] | "pf-esi";
const statusLabel: Record<Employee["status"], string> = { Active: "Active", Leave: "On leave", Reliever: "Reliever" };
const statusTone: Record<Employee["status"], StatusTone> = { Active: "success", Leave: "warning", Reliever: "info" };
const overrideLabel = (value?: string) => value === "enabled" ? "Always deducted" : value === "disabled" ? "Never deducted" : "Same as site";

export function WorkforceScreen({ onNavigate, onCreate, onEdit }: { onNavigate: (view: string) => void; onCreate: () => void; onEdit: (employeeId: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [skill, setSkill] = useState("all");
  const [selected, setSelected] = useState<Employee | null>(null);
  const { employeeRules } = usePayroll();
  const { ratings } = useOps();
  const ruleFor = (employeeId: string) => employeeRules.filter(rule => rule.employeeId === employeeId).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const ratingFor = (employeeId: string) => averageRating(ratings, "employee", employeeId);
  const onboarding = useOnboarding();
  const pfEsiWindow = onboarding.config.pfEsiWindowDays;
  const statutoryFor = (employee: Employee) => {
    const rule = ruleFor(employee.id);
    const profile = onboarding.getProfile(employee.id);
    const status = statutoryStatus(statutoryNeeds(employee, rule?.pfOverride, rule?.esiOverride), profile.uan, profile.esiIpNumber);
    return { ...status, profile, days: daysSince(profile.joiningDate, APP_TODAY) };
  };
  const pfEsiPending = employees.filter(employee => { const status = statutoryFor(employee); return (status.needs.pf || status.needs.esi) && !status.complete; });
  const payLabel = (employee: Employee) => {
    const rule = ruleFor(employee.id);
    return rule?.basis === "site" ? "Site-wise rate" : rule?.basis === "daily" ? `${rupees(rule.dailyRate ?? 0)} / duty` : rupees(rule?.monthlySalary ?? employee.salary);
  };
  const benefitsLabel = (employeeId: string) => {
    const rule = ruleFor(employeeId);
    if (!rule || (rule.pfOverride === "inherit" && rule.esiOverride === "inherit")) return "Same as site";
    const parts = [rule.pfOverride === "enabled" && "PF", rule.esiOverride === "enabled" && "ESI"].filter(Boolean);
    return parts.length ? parts.join(" + ") : "Salary only";
  };

  const rows = useMemo(() => employees.filter(employee =>
    (status === "all" || (status === "pf-esi" ? pfEsiPending.includes(employee) : employee.status === status))
    && (skill === "all" || employee.skills.includes(skill as (typeof skillOptions)[number]))
    && `${employee.name} ${employee.id} ${employee.site}`.toLowerCase().includes(query.toLowerCase())),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [query, status, skill, onboarding, employeeRules]);
  const filtered = status !== "all" || skill !== "all" || query;
  const reset = () => { setStatus("all"); setSkill("all"); setQuery(""); };

  if (selected) {
    const rule = ruleFor(selected.id);
    const rating = ratingFor(selected.id);
    const rateValue = rule?.basis === "site"
      ? "Taken from each duty's site"
      : rupees(rule?.dailyRate ?? rule?.monthlySalary ?? 0);
    return <>
      <BackCrumb backLabel={NAV.workforce} onBack={() => setSelected(null)} current={selected.name} />
      <PageHeader
        title={selected.name}
        subtitle={`${selected.id} · ${selected.role}${rating !== null ? ` · ${rating}/10 rating` : ""}`}
        actions={<><CallButton size="md" phone={selected.phone} name={selected.name} /><Button onClick={() => onEdit(selected.id)}><Pencil />Edit employee</Button></>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Current employment">
          <DefRows rows={[
            { label: "Site", value: selected.site },
            { label: "District", value: selected.district },
            { label: "Shift", value: selected.shift },
            { label: "Status", value: <StatusChip tone={statusTone[selected.status]}>{statusLabel[selected.status]}</StatusChip> },
            { label: "Phone", value: <span className="inline-flex items-center gap-2">{selected.phone}<CallButton phone={selected.phone} name={selected.name} /></span>, mono: true },
          ]} />
        </Panel>
        <Panel title="Skills" description="Skills decide which posts this employee can cover and which reliever rate applies.">
          <SkillTags skills={selected.skills} />
        </Panel>
        <EmployeeRatingsPanel employeeId={selected.id} className="lg:col-span-2" />
        {(() => {
          const st = statutoryFor(selected);
          const applies = st.needs.pf || st.needs.esi;
          return <Panel title="PF and ESI" description={applies ? `Numbers are due within ${pfEsiWindow} days of joining.` : "Neither PF nor ESI applies to this employee."}
            action={applies ? <StatusChip tone={st.complete ? "success" : st.days >= pfEsiWindow ? "danger" : "warning"}>{st.complete ? "On file" : st.days >= pfEsiWindow ? "Overdue" : "Pending"}</StatusChip> : undefined}>
            <DefRows rows={[
              { label: "PF", value: st.needs.pf ? (st.profile.uan ? <span className="font-mono">{st.profile.uan}</span> : <span className="text-status-danger">UAN missing</span>) : "Not applicable" },
              { label: "ESI", value: st.needs.esi ? (st.profile.esiIpNumber ? <span className="font-mono">{st.profile.esiIpNumber}</span> : <span className="text-status-danger">IP number missing</span>) : "Not applicable" },
              { label: "Joined", value: `${st.profile.joiningDate} · ${st.days} days ago` },
            ]} />
          </Panel>;
        })()}
        <Panel title="Pay settings" className="lg:col-span-2">
          <div className="max-w-xl">
            <DefRows rows={[
              { label: "Pay basis", value: payBasisLabel(rule?.basis ?? "monthly") },
              { label: "Rate", value: rateValue, mono: true },
              { label: "PF", value: overrideLabel(rule?.pfOverride) },
              { label: "ESI", value: overrideLabel(rule?.esiOverride) },
              { label: "Effective from", value: rule?.effectiveFrom ?? "Not set" },
            ]} />
          </div>
        </Panel>
      </div>
      <Panel title="Salary breakdown" description="Current period allocation and deductions." className="mt-4">
        <EmployeeSalaryBreakdown employeeId={selected.id} />
      </Panel>
    </>;
  }

  return <>
    <PageHeader title={NAV.workforce} subtitle="Employee records, skills, deployment and pay settings."
      actions={<><Button variant="outline" onClick={() => onNavigate("imports")}><Upload />Import employees</Button><Button onClick={onCreate}><Plus />Add employee</Button></>} />
    <StatStrip items={[
      { icon: Users, value: "468", label: "Active employees", note: "Across 12 districts", onClick: () => setStatus(status === "Active" ? "all" : "Active"), actionLabel: "Show active employees", active: status === "Active" },
      { icon: UserCheck, value: "421", label: "Deployed now", note: "90% of active staff", tone: "green", onClick: () => onNavigate("deployment"), actionLabel: "Open deployment" },
      { icon: UserMinus, value: "18", label: "Relievers", note: "Paid per duty", onClick: () => setStatus(status === "Reliever" ? "all" : "Reliever"), actionLabel: "Show relievers", active: status === "Reliever" },
      { icon: LogOut, value: "9", label: "Exits in progress", note: "3 blocked by dues", tone: "orange", onClick: () => onNavigate("exit-clearance"), actionLabel: "Open exit clearance" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by name, employee ID or site" />
    <ListFilterRow>
      <FilterChips<StatusFilter> options={[{ id: "all", label: "Everyone" }, { id: "Active", label: "Active" }, { id: "Leave", label: "On leave" }, { id: "Reliever", label: "Relievers" }, { id: "pf-esi", label: `PF/ESI pending (${pfEsiPending.length})` }]} value={status} onChange={setStatus} />
      <div className="flex items-center gap-2">
        <Select className="h-9 w-auto" value={skill} onChange={event => setSkill(event.target.value)} aria-label="Skill"><option value="all">Any skill</option>{skillOptions.map(item => <option key={item}>{item}</option>)}</Select>
        {filtered && <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>}
        <span className="text-xs text-muted">{rows.length} employees</span>
      </div>
    </ListFilterRow>
    {status === "pf-esi" && <p className="mb-3 text-sm text-muted">Employees who need PF or ESI but don&apos;t have a valid UAN or ESI IP number on file. HR is alerted {pfEsiWindow} days after joining (Settings → Notifications). Open an employee and choose Edit employee to add the numbers.</p>}
    <Panel flush>
      <DataTable rows={rows} rowKey={row => row.id} onRowClick={setSelected}
        empty={<div className="p-4"><EmptyState icon={Users} title="No employees found" message="Try a different search, status or skill." actionLabel="Clear filters" onAction={reset} /></div>}
        columns={[
          { header: "Employee", cell: employee => <PersonCell name={employee.name} id={employee.id} phone={employee.phone} /> },
          { header: "Designation", cell: employee => employee.role, hideOnMobile: true },
          { header: "Current site", cell: employee => <span><span className="block text-sm">{employee.site}</span><small className="text-xs text-muted">{employee.district} · {employee.shift}</small></span> },
          { header: "Skills", cell: employee => <SkillTags skills={employee.skills} />, hideOnMobile: true },
          { header: "Pay", cell: payLabel, hideOnMobile: true },
          { header: "Benefits", cell: employee => <span className="text-xs">{benefitsLabel(employee.id)}</span>, hideOnMobile: true },
          { header: "Rating", align: "right", cell: employee => { const rating = ratingFor(employee.id); return rating !== null ? <strong>{rating}/10</strong> : <span className="text-muted">—</span>; }, hideOnMobile: true },
          ...(status === "pf-esi" ? [
            { header: "Needs", cell: (employee: Employee) => { const st = statutoryFor(employee); return <span className="text-xs">{[st.needs.pf && "PF", st.needs.esi && "ESI"].filter(Boolean).join(" + ")}</span>; } },
            { header: "Missing", cell: (employee: Employee) => <span className="text-xs font-medium text-status-danger">{statutoryFor(employee).missing.join(", ")}</span> },
            { header: "Since joining", cell: (employee: Employee) => { const st = statutoryFor(employee); const overdue = st.days >= pfEsiWindow; return <StatusChip tone={overdue ? "danger" : "warning"}>{st.days} {st.days === 1 ? "day" : "days"}{overdue ? " · overdue" : ""}</StatusChip>; } },
          ] : [
            { header: "Status", cell: (employee: Employee) => <StatusChip tone={statusTone[employee.status]}>{statusLabel[employee.status]}</StatusChip> },
          ]),
        ]} />
    </Panel>

    {status === "Reliever" && <Panel title="Reliever day rates" description="The rate depends on the site and the skill the post needs." className="mt-4" flush>
      <DataTable rows={relieverRates} rowKey={tier => String(tier.rate)} columns={[
        { header: "Rate", cell: tier => <strong>{rupees(tier.rate)} / duty</strong> },
        { header: "Tier", cell: tier => tier.label },
        { header: "Applies to", cell: tier => <span className="text-xs text-muted">{tier.applies}</span> },
        { header: "Relievers", align: "right", cell: tier => rows.filter(employee => employee.dailyRate === tier.rate).length },
      ]} />
    </Panel>}
  </>;
}
