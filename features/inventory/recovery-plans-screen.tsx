"use client";

import { useState } from "react";
import { CheckCircle2, Shirt, Users, Wallet } from "lucide-react";
import { Button, DataTable, DefRows, InlineAlert, KeyValue, PageHeader, Panel, Section, Sheet, StatStrip, StatusChip } from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { NAV } from "@/lib/labels";
import { rupees, uniformPlans } from "@/lib/mock-data";

type Plan = (typeof uniformPlans)[number];
const WORKFORCE = 468;
const outstanding = (plan: Plan) => plan.deduction * Math.round(plan.people * 0.4);

/** How employees pay for uniforms: upfront, partly from salary, or fully from salary. */
export function RecoveryPlansScreen() {
  const notify = useToast();
  const [defaultPlan, setDefaultPlan] = useState(uniformPlans[2].name);
  const [open, setOpen] = useState<Plan | null>(null);

  return <>
    <PageHeader title={NAV.recoveryPlans} subtitle="Offered when a uniform is issued. The default is preselected and can be overridden per employee." />
    <StatStrip items={[
      { icon: Shirt, value: String(uniformPlans.length), label: "Plans", note: `Default: ${defaultPlan}` },
      { icon: Users, value: String(uniformPlans.reduce((sum, plan) => sum + plan.people, 0)), label: "Employees on a plan", note: `of ${WORKFORCE}` },
      { icon: Wallet, value: rupees(uniformPlans.reduce((sum, plan) => sum + outstanding(plan), 0)), label: "Outstanding recovery", note: "Still to come from salary", tone: "orange" },
    ]} />
    <Panel flush title="Recovery plans" description="Select a plan for details.">
      <DataTable rows={uniformPlans} rowKey={row => row.name} onRowClick={setOpen}
        columns={[
          { header: "Plan", cell: row => <div className="flex items-center gap-2"><strong className="font-medium">{row.name}</strong>{row.name === defaultPlan && <StatusChip tone="success">Default</StatusChip>}</div> },
          { header: "Upfront", align: "right", cell: row => <span className="tabular-nums">{rupees(row.upfront)}</span> },
          { header: "From salary", align: "right", cell: row => <span className="tabular-nums">{rupees(row.deduction)}</span> },
          { header: "Total", align: "right", cell: row => <strong className="tabular-nums">{rupees(row.total)}</strong> },
          { header: "Employees", align: "right", cell: row => <span className="tabular-nums">{row.people} · {Math.round(row.people / WORKFORCE * 100)}%</span>, hideOnMobile: true },
          { header: "Outstanding", align: "right", cell: row => <span className="tabular-nums text-muted">{rupees(outstanding(row))}</span>, hideOnMobile: true },
        ]} />
    </Panel>
    <InlineAlert className="mt-4">An employee with an unpaid balance on any plan can’t complete exit clearance.</InlineAlert>

    {open && <Sheet open side="center" title={open.name} subtitle="Uniform recovery plan" onClose={() => setOpen(null)}
      footer={<>
        <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
        <Button disabled={open.name === defaultPlan} onClick={() => { setDefaultPlan(open.name); notify(`${open.name} is now the default plan`); setOpen(null); }}><CheckCircle2 />{open.name === defaultPlan ? "Default plan" : "Make default"}</Button>
      </>}>
      <Section title="How it's paid">
        <DefRows rows={[
          { label: "Paid when issued", value: rupees(open.upfront), mono: true },
          { label: "Recovered from salary", value: rupees(open.deduction), mono: true },
          { label: "Total cost to employee", value: rupees(open.total), mono: true, total: true },
        ]} />
        <p className="mt-3 text-xs leading-relaxed text-muted">{open.note}</p>
      </Section>
      <Section title="Uptake" className="mb-0">
        <KeyValue label="Employees on this plan" value={open.people} />
        <KeyValue label="Share of workforce" value={`${Math.round(open.people / WORKFORCE * 100)}%`} />
        <KeyValue label="Outstanding balance" value={rupees(outstanding(open))} />
      </Section>
    </Sheet>}
  </>;
}
