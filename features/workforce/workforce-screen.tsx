"use client";

import { useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Upload, UserCheck, UserMinus, Users } from "lucide-react";
import { employees, ratings, relieverRates, rupees, skillOptions } from "@/lib/mock-data";
import {
  Button, DataTable, DefRows, DetailDrawer, EmptyState, FilterChips, ListFilterRow, PageHeader, Panel, PersonCell,
  SearchBar, Section, Select, SkillTags, StatStrip, StatusChip, type StatusTone,
} from "@/components/ui-kit";
import { usePayroll } from "@/components/shared/payroll-context";
import { payBasisLabel } from "@/lib/payroll-calculator";
import { EmployeeSalaryBreakdown } from "@/features/payroll/employee-salary-breakdown";
import { NAV } from "@/lib/labels";
import type { Employee } from "@/types/domain";

type StatusFilter = "all" | Employee["status"];
const statusLabel: Record<Employee["status"], string> = { Active: "Active", Leave: "On leave", Reliever: "Reliever" };
const statusTone: Record<Employee["status"], StatusTone> = { Active: "success", Leave: "warning", Reliever: "info" };
const overrideLabel = (value?: string) => value === "enabled" ? "Always deducted" : value === "disabled" ? "Never deducted" : "Same as site";

export function WorkforceScreen({ onNavigate, onCreate, onEdit }: { onNavigate: (view: string) => void; onCreate: () => void; onEdit: (employeeId: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [skill, setSkill] = useState("all");
  const [selected, setSelected] = useState<Employee | null>(null);
  const { employeeRules } = usePayroll();
  const ruleFor = (employeeId: string) => employeeRules.filter(rule => rule.employeeId === employeeId).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const ratingFor = (employeeId: string) => {
    const scores = ratings.filter(rating => rating.targetType === "employee" && rating.targetId === employeeId).map(rating => rating.score);
    return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length * 10) / 10 : null;
  };
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
    (status === "all" || employee.status === status)
    && (skill === "all" || employee.skills.includes(skill as (typeof skillOptions)[number]))
    && `${employee.name} ${employee.id} ${employee.site}`.toLowerCase().includes(query.toLowerCase())), [query, status, skill]);
  const filtered = status !== "all" || skill !== "all" || query;
  const reset = () => { setStatus("all"); setSkill("all"); setQuery(""); };

  return <>
    <PageHeader title={NAV.workforce} subtitle="Employee records, skills, deployment and pay settings."
      actions={<><Button variant="outline" onClick={() => onNavigate("imports")}><Upload />Import employees</Button><Button onClick={onCreate}><Plus />Add employee</Button></>} />
    <StatStrip items={[
      { icon: Users, value: "468", label: "Active employees", note: "Across 12 districts" },
      { icon: UserCheck, value: "421", label: "Deployed now", note: "90% of active staff", tone: "green" },
      { icon: UserMinus, value: "18", label: "Relievers", note: "Paid per duty" },
      { icon: LogOut, value: "9", label: "Exits in progress", note: "3 blocked by dues", tone: "orange" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by name, employee ID or site" />
    <ListFilterRow>
      <FilterChips<StatusFilter> options={[{ id: "all", label: "Everyone" }, { id: "Active", label: "Active" }, { id: "Leave", label: "On leave" }, { id: "Reliever", label: "Relievers" }]} value={status} onChange={setStatus} />
      <div className="flex items-center gap-2">
        <Select className="h-9 w-auto" value={skill} onChange={event => setSkill(event.target.value)} aria-label="Skill"><option value="all">Any skill</option>{skillOptions.map(item => <option key={item}>{item}</option>)}</Select>
        {filtered && <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>}
        <span className="text-xs text-muted">{rows.length} employees</span>
      </div>
    </ListFilterRow>
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
          { header: "Status", cell: employee => <StatusChip tone={statusTone[employee.status]}>{statusLabel[employee.status]}</StatusChip> },
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

    {selected && <DetailDrawer wide title={selected.name} subtitle={`${selected.id} · ${selected.role}`} onClose={() => setSelected(null)}
      footer={<><Button variant="outline" onClick={() => setSelected(null)}>Close</Button><Button onClick={() => onEdit(selected.id)}><Pencil />Edit employee</Button></>}>
      <Section title="Current employment">
        <DefRows rows={[
          { label: "Site", value: selected.site },
          { label: "District", value: selected.district },
          { label: "Shift", value: selected.shift },
          { label: "Status", value: <StatusChip tone={statusTone[selected.status]}>{statusLabel[selected.status]}</StatusChip> },
          { label: "Phone", value: <a className="text-emerald hover:underline" href={`tel:${selected.phone.replace(/\s/g, "")}`}>{selected.phone}</a>, mono: true },
        ]} />
      </Section>
      <Section title="Skills">
        <SkillTags skills={selected.skills} />
        <p className="mt-2 text-xs text-muted">Skills decide which posts this employee can cover and which reliever rate applies.</p>
      </Section>
      <Section title="Pay settings">
        <DefRows rows={[
          { label: "Pay basis", value: payBasisLabel(ruleFor(selected.id)?.basis ?? "monthly") },
          { label: "Rate", value: ruleFor(selected.id)?.basis === "site" ? "Taken from each duty's site" : rupees(ruleFor(selected.id)?.dailyRate ?? ruleFor(selected.id)?.monthlySalary ?? 0), mono: true },
          { label: "PF", value: overrideLabel(ruleFor(selected.id)?.pfOverride) },
          { label: "ESI", value: overrideLabel(ruleFor(selected.id)?.esiOverride) },
          { label: "Effective from", value: ruleFor(selected.id)?.effectiveFrom ?? "Not set" },
        ]} />
      </Section>
      <div className="rounded-xl border border-border p-4"><EmployeeSalaryBreakdown employeeId={selected.id} /></div>
    </DetailDrawer>}
  </>;
}
