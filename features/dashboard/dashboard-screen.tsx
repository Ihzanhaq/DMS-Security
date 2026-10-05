"use client";

import { AlertTriangle, ArrowRight, Building2, CalendarCheck, CheckCircle2, Clock, MapPin, Users, Wallet } from "lucide-react";
import { Button, DataTable, IconTile, ListRow, PageHeader, Panel, PersonCell, ProgressBar, SplitLayout, StatStrip, StatusChip } from "@/components/ui-kit";
import { APP_TODAY } from "@/lib/app-date";

const coverage = [
  ["Thiruvananthapuram", 94, 128], ["Kollam", 89, 76], ["Ernakulam", 97, 104],
  ["Alappuzha", 91, 58], ["Kottayam", 86, 42],
] as const;

const movements = [
  { name: "Suresh Babu", id: "BMG-1840", site: "Lulu Mall, Kochi", shift: "Day · 08:00", state: "On site" },
  { name: "Fathima N", id: "BMG-2274", site: "Aster Medcity", shift: "Day · 09:00", state: "Late" },
  { name: "Rajeev Kumar", id: "BMG-1988", site: "TCS Technopark", shift: "Night · 20:00", state: "Scheduled" },
];

const todayLabel = new Date(`${APP_TODAY}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function DashboardScreen({ onNavigate }: { onNavigate: (view: string) => void }) {
  return <>
    <PageHeader title="Operations overview" subtitle={`${todayLabel} · 421 guards on duty · updated 2 minutes ago`}
      actions={<Button variant="outline" onClick={() => onNavigate("action-centre")}><AlertTriangle />Needs attention · 3</Button>} />
    <StatStrip items={[
      { icon: Users, value: "468", label: "Active employees", note: "12 joined this month" },
      { icon: Building2, value: "214", label: "Client sites", note: "201 fully staffed" },
      { icon: CalendarCheck, value: "93.8%", label: "On time today", note: "421 of 449 punches", tone: "green" },
      { icon: AlertTriangle, value: "7", label: "Open vacancies", note: "3 need action now", tone: "orange" },
    ]} />
    <SplitLayout wideFirst>
      <Panel title="Coverage by district" description="Posts staffed today." action={<Button variant="link" size="sm" className="h-auto px-0" onClick={() => onNavigate("deployment")}>View deployment<ArrowRight /></Button>}>
        <div className="grid gap-4">
          {coverage.map(([name, value, posts]) => (
            <div key={name} className="grid grid-cols-[130px_1fr_44px] items-center gap-3 text-sm">
              <span><span className="block">{name}</span><small className="text-xs text-muted">{posts} posts</small></span>
              <ProgressBar value={value} tone={value < 90 ? "warn" : "emerald"} />
              <strong className="text-right tabular-nums">{value}%</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald" />Staffed <strong className="text-foreground">408</strong></span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full border border-muted" />Vacant <strong className="text-foreground">27</strong></span>
          <span className="ml-auto">Overall <strong className="text-foreground">93.8%</strong></span>
        </div>
      </Panel>
      <Panel title="Needs attention" description="Most urgent first.">
        <ListRow><IconTile icon={MapPin} tone="danger" /><div className="min-w-0 flex-1"><strong className="block text-sm">3 posts still vacant</strong><small className="text-xs text-muted">Technopark and 2 other sites</small></div><span className="text-xs text-muted">Now</span></ListRow>
        <ListRow><IconTile icon={Clock} tone="warn" /><div className="min-w-0 flex-1"><strong className="block text-sm">7 late check-ins</strong><small className="text-xs text-muted">After the site grace period</small></div><span className="text-xs text-muted">09:18</span></ListRow>
        <ListRow><IconTile icon={Wallet} tone="navy" /><div className="min-w-0 flex-1"><strong className="block text-sm">Payroll has 3 exceptions</strong><small className="text-xs text-muted">August 2026 run</small></div><span className="text-xs text-muted">Today</span></ListRow>
        <Button variant="outline" className="mt-3 w-full" onClick={() => onNavigate("action-centre")}>Open action centre</Button>
      </Panel>
    </SplitLayout>
    <SplitLayout wideFirst>
      <Panel title="Today's shift movement" description="Live deployment changes." flush action={<Button variant="link" size="sm" className="h-auto px-0" onClick={() => onNavigate("attendance")}>View attendance<ArrowRight /></Button>}>
        <DataTable rows={movements} rowKey={row => row.id} columns={[
          { header: "Employee", cell: row => <PersonCell name={row.name} id={row.id} /> },
          { header: "Site", cell: row => row.site },
          { header: "Shift", cell: row => row.shift },
          { header: "Status", cell: row => <StatusChip tone={row.state === "Late" ? "warning" : row.state === "Scheduled" ? "neutral" : "success"}>{row.state}</StatusChip> },
        ]} />
      </Panel>
      <Panel title="August payroll" description="Closes in 3 days.">
        <div className="mb-4 flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: "conic-gradient(#00be73 0 82%, hsl(var(--surface)) 82% 100%)" }}>
            <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-card">
              <strong className="text-xl font-bold tabular-nums">82%</strong><span className="text-[10px] text-muted">ready</span>
            </div>
          </div>
          <ul className="grid gap-1.5 text-sm">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald" />Attendance locked</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald" />Deductions reviewed</li>
            <li className="flex items-center gap-1.5 text-status-warn"><Clock className="h-4 w-4" />3 exceptions open</li>
          </ul>
        </div>
        <Button className="w-full" onClick={() => onNavigate("payroll")}>Continue payroll<ArrowRight /></Button>
      </Panel>
    </SplitLayout>
  </>;
}
