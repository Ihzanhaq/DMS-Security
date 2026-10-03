"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, CalendarCheck, CheckCircle, Coins, DownloadSimple, Package, Plus, Receipt,
  ShieldCheck, TShirt, UploadSimple, Wallet, WarningCircle,
} from "@phosphor-icons/react";
import { employees, lateAndAbsent, rupees, spareDutyPayments, uniformBatches, uniformKit, uniformPlans, uniformRequests } from "@/lib/mock-data";
import type { SpareDutyPayment, UniformRequest, UniformRequestStatus } from "@/types/domain";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";
import { payBasisLabel } from "@/lib/payroll-calculator";
import {
  DefRows, DetailDrawer, PageHeader, Panel, PersonCell, ProgressBar,
  StatStrip, Status, Timeline,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";
import { usePayroll } from "@/components/shared/payroll-context";
import { EmployeeSalaryBreakdownModal } from "@/features/payroll/employee-salary-breakdown";

const stages = ["Attendance", "Calculation", "Review", "Approval", "Payment"] as const;

const stageDescriptions = [
  "Confirm approved duties before salary calculation begins.",
  "Resolve pay rates and statutory rules for every approved duty.",
  "Inspect employee totals and open site-wise breakdowns.",
  "Sign off the payroll register when every exception is cleared.",
  "Release net wages and preserve the August 2026 snapshot.",
];

const advanceLabels = [
  "Confirm attendance",
  "Run calculation",
  "Continue to approval",
  "Proceed to payment",
  "Mark paid",
];

type PayrollRow = { employee: typeof employees[number]; breakdown: ReturnType<ReturnType<typeof usePayroll>["getBreakdown"]> };

function PayrollStageStats({ stage, rows, totals, exceptions, paid }: {
  stage: number;
  rows: PayrollRow[];
  totals: { gross: number; statutory: number; other: number; net: number };
  exceptions: number;
  paid: boolean;
}) {
  const dutyTotal = rows.reduce((sum, row) => sum + row.breakdown.duties, 0);
  const readyCount = rows.filter(row => row.breakdown.exceptions.length === 0).length;
  const reviewCount = rows.length - readyCount;

  if (stage === 0) {
    return <StatStrip items={[
      { icon: CalendarCheck, value: dutyTotal.toFixed(2), label: "Approved duties", note: "Across payable employees" },
      { icon: Wallet, value: String(rows.length), label: "In payroll run", note: "With approved attendance" },
      { icon: WarningCircle, value: String(lateAndAbsent.length), label: "Attendance flags", note: "Late or absent today", tone: "orange" },
      { icon: CheckCircle, value: "Locked", label: "Period status", note: "August 2026 duties", tone: "green" },
    ]} />;
  }

  if (stage === 1) {
    return <StatStrip items={[
      { icon: Wallet, value: rupees(totals.gross), label: "Calculated gross", note: "From resolved duty rates" },
      { icon: ShieldCheck, value: String(rows.reduce((sum, row) => sum + row.breakdown.sites.length, 0)), label: "Site allocations", note: "Across all employees", tone: "violet" },
      { icon: Receipt, value: rupees(totals.other), label: "Deductions loaded", note: "Advance, uniform, penalty", tone: "orange" },
      { icon: WarningCircle, value: String(exceptions), label: "Config exceptions", note: exceptions ? "Needs correction" : "All rules resolved", tone: exceptions ? "red" : "green" },
    ]} />;
  }

  if (stage === 3) {
    return <StatStrip items={[
      { icon: CheckCircle, value: String(readyCount), label: "Ready to approve", note: "No blocking exceptions", tone: "green" },
      { icon: WarningCircle, value: String(reviewCount), label: "Needs review", note: reviewCount ? "Resolve before approval" : "All clear", tone: reviewCount ? "orange" : "green" },
      { icon: Wallet, value: rupees(totals.net), label: "Net payable", note: `${rows.length} employees` },
      { icon: ShieldCheck, value: rupees(totals.statutory), label: "PF and ESI", note: "Employee contributions", tone: "violet" },
    ]} />;
  }

  if (stage === 4) {
    return <StatStrip items={[
      { icon: Wallet, value: rupees(totals.net), label: "Payment batch", note: paid ? "Snapshot saved" : "Awaiting release" },
      { icon: CheckCircle, value: String(rows.length), label: "Employees", note: "Included in August 2026", tone: paid ? "green" : "orange" },
      { icon: Receipt, value: rupees(totals.other), label: "Other deductions", note: "Already netted off" },
      { icon: ShieldCheck, value: paid ? "Closed" : "Open", label: "Payroll period", note: paid ? "Calculations preserved" : "Ready to mark paid", tone: paid ? "green" : "violet" },
    ]} />;
  }

  return <StatStrip items={[
    { icon: Wallet, value: rupees(totals.gross), label: "Gross payroll", note: `${rows.length} calculated employees` },
    { icon: ShieldCheck, value: rupees(totals.statutory), label: "PF and ESI", note: "Eligible site earnings", tone: "violet" },
    { icon: Receipt, value: rupees(totals.other), label: "Other deductions", note: "Advance, uniform, penalty", tone: "orange" },
    { icon: WarningCircle, value: String(exceptions), label: "Exceptions", note: exceptions ? "Blocking approval" : "Ready for approval", tone: exceptions ? "red" : "green" },
  ]} />;
}

function PayrollStagePanel({
  stage,
  rows,
  totals,
  exceptions,
  paid,
  onOpenEmployee,
}: {
  stage: number;
  rows: PayrollRow[];
  totals: { gross: number; statutory: number; other: number; net: number };
  exceptions: number;
  paid: boolean;
  onOpenEmployee: (employee: { id: string; name: string }) => void;
}) {
  if (stage === 0) {
    return (
      <Panel title="Attendance lock" description="Only approved duties in August 2026 move into payroll calculation." className="table-panel">
        <div className="data-table-wrap">
          <table className="data-table payroll-employee-table">
            <thead><tr><th>Employee</th><th>Approved duties</th><th>Sites</th><th>Attendance note</th><th>Payroll status</th></tr></thead>
            <tbody>
              {rows.map(row => {
                const flag = lateAndAbsent.find(item => item.id === row.employee.id);
                return (
                  <tr key={row.employee.id}>
                    <td><PersonCell name={row.employee.name} id={row.employee.id} /></td>
                    <td>{row.breakdown.duties.toFixed(2)}</td>
                    <td>{row.breakdown.sites.length}</td>
                    <td>{flag ? `${flag.state}${flag.delay && flag.delay !== "—" ? ` · ${flag.delay}` : ""}` : "All shifts approved"}</td>
                    <td><Status tone="success">Included</Status></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }

  if (stage === 1) {
    return (
      <Panel title="Salary calculation" description="Every duty resolves a rate source, benefit scheme, and gross amount." className="table-panel">
        <div className="data-table-wrap">
          <table className="data-table payroll-employee-table">
            <thead><tr><th>Employee</th><th>Pay basis</th><th>Duties</th><th>Rate sources</th><th>Gross</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.employee.id} className="clickable-row" tabIndex={0} onClick={() => onOpenEmployee({ id: row.employee.id, name: row.employee.name })} onKeyDown={event => { if (event.key === "Enter") onOpenEmployee({ id: row.employee.id, name: row.employee.name }); }}>
                  <td><PersonCell name={row.employee.name} id={row.employee.id} /></td>
                  <td>{payBasisLabel(row.breakdown.payBasis)}</td>
                  <td>{row.breakdown.duties.toFixed(2)}</td>
                  <td>{row.breakdown.sites.flatMap(site => site.rateSources).filter((value, index, list) => list.indexOf(value) === index).join(" / ") || "—"}</td>
                  <td>{rupees(row.breakdown.gross)}</td>
                  <td><Status tone={row.breakdown.exceptions.length ? "warning" : "success"}>{row.breakdown.exceptions.length ? "Exception" : "Calculated"}</Status></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="calculation-note payroll-stage-note"><Wallet /><span><strong>Automatic calculation</strong> Monthly and fixed daily rates ignore site pay rates. Site-wise employees use the post override first, then the site default.</span></div>
      </Panel>
    );
  }

  if (stage === 3) {
    const blocked = rows.filter(row => row.breakdown.exceptions.length > 0);
    return (
      <div className="payroll-stage-stack">
        <Panel title="Approval summary" description="Review the register totals before releasing payment.">
          <DefRows rows={[
            { label: "Gross payroll", value: rupees(totals.gross), mono: true },
            { label: "PF and ESI", value: rupees(totals.statutory), mono: true },
            { label: "Other deductions", value: rupees(totals.other), mono: true },
            { label: "Net payable", value: rupees(totals.net), mono: true, total: true },
          ]} />
        </Panel>
        <Panel title="Employee readiness" description={exceptions ? "Resolve every configuration exception before approval." : "Every calculated employee is ready for approval."} className="table-panel">
          <div className="data-table-wrap">
            <table className="data-table payroll-employee-table">
              <thead><tr><th>Employee</th><th>Net</th><th>Exceptions</th><th>Approval</th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.employee.id} className="clickable-row" tabIndex={0} onClick={() => onOpenEmployee({ id: row.employee.id, name: row.employee.name })} onKeyDown={event => { if (event.key === "Enter") onOpenEmployee({ id: row.employee.id, name: row.employee.name }); }}>
                    <td><PersonCell name={row.employee.name} id={row.employee.id} /></td>
                    <td><strong>{rupees(row.breakdown.net)}</strong></td>
                    <td>{row.breakdown.exceptions.length}</td>
                    <td><Status tone={row.breakdown.exceptions.length ? "warning" : "success"}>{row.breakdown.exceptions.length ? "Hold" : "Approve"}</Status></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        {blocked.length > 0 && (
          <div className="payroll-exception" role="alert">
            <WarningCircle weight="fill" />
            <div>
              <strong>{blocked.length} employee{blocked.length === 1 ? "" : "s"} blocked approval</strong>
              {blocked.map(row => <span key={row.employee.id}>{row.employee.name}: {row.breakdown.exceptions[0]?.message}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage === 4) {
    return (
      <Panel title={paid ? "Payment completed" : "Payment release"} description={paid ? "August 2026 payroll is closed and preserved as a snapshot." : "Confirm the net batch before marking the period paid."}>
        <DefRows rows={[
          { label: "Employees in batch", value: rows.length, mono: true },
          { label: "Gross payroll", value: rupees(totals.gross), mono: true },
          { label: "Statutory deductions", value: rupees(totals.statutory), mono: true },
          { label: "Other deductions", value: rupees(totals.other), mono: true },
          { label: "Net payable", value: rupees(totals.net), mono: true, total: true },
        ]} />
        <div className="calculation-note payroll-stage-note">
          {paid ? <CheckCircle weight="fill" /> : <Wallet />}
          <span>
            <strong>{paid ? "Batch released" : "Ready for bank release"}</strong>
            {paid
              ? "Employee calculations are frozen for August 2026. Reopen only through a correction workflow."
              : "Mark paid to save the calculation snapshot and close the August 2026 payroll period."}
          </span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Payroll review" description="Open any employee to inspect site-wise duties, deductions, and allocation." className="table-panel payroll-table-panel">
      <div className="data-table-wrap">
        <table className="data-table payroll-employee-table">
          <thead><tr><th>Employee</th><th>Duties</th><th>Gross</th><th>PF</th><th>ESI</th><th>Other</th><th>Net</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.employee.id} className="clickable-row" tabIndex={0} onClick={() => onOpenEmployee({ id: row.employee.id, name: row.employee.name })} onKeyDown={event => { if (event.key === "Enter") onOpenEmployee({ id: row.employee.id, name: row.employee.name }); }}>
                <td><PersonCell name={row.employee.name} id={row.employee.id} /></td>
                <td>{row.breakdown.duties.toFixed(2)}</td>
                <td>{rupees(row.breakdown.gross)}</td>
                <td>{rupees(row.breakdown.pf)}</td>
                <td>{rupees(row.breakdown.esi)}</td>
                <td>{rupees(row.breakdown.otherDeductions)}</td>
                <td><strong>{rupees(row.breakdown.net)}</strong></td>
                <td><Status tone={row.breakdown.exceptions.length ? "warning" : "success"}>{row.breakdown.exceptions.length ? "Review" : "Ready"}</Status></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function PayrollScreen({ onAllocation }: { onAllocation: (employeeId: string) => void }) {
  const notify = useToast();
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
    if (paid) {
      setStage(4);
      setMaxStage(4);
    }
  }, [paid]);

  function goToStage(index: number) {
    if (index <= maxStage) setStage(index);
  }

  function advance() {
    if (stage < 4) {
      const next = stage + 1;
      setStage(next);
      setMaxStage(current => Math.max(current, next));
      notify(`${stages[next]} stage opened`);
      return;
    }
    if (!closePeriod()) {
      notify("Resolve payroll configuration exceptions before payment");
      return;
    }
    notify("August 2026 payroll marked as paid · calculation snapshot saved");
  }

  const primaryDisabled = paid || (stage === 3 && exceptions > 0) || (stage === 4 && (paid || exceptions > 0));
  const primaryLabel = paid ? "Payroll closed" : stage === 3 && exceptions > 0 ? "Resolve exceptions" : advanceLabels[stage];

  return <>
    <PageHeader
      title="Payroll"
      description={`August 2026 · ${stageDescriptions[stage]}`}
      actions={<>
        <button className="secondary-button" onClick={() => notify("Payroll register exported as CSV")}><DownloadSimple />Export register</button>
        <button className="primary-button" disabled={primaryDisabled} onClick={advance}>{primaryLabel}<ArrowRight /></button>
      </>}
    />
    {paid && <div className="saved-notice" data-enter><CheckCircle weight="fill" />August 2026 payroll is closed. Employee calculations are preserved as a snapshot.</div>}
    <div className="stepper" data-enter>
      {stages.map((item, index) => (
        <button
          key={item}
          type="button"
          className={index === stage ? "current" : index <= maxStage && index !== stage ? "done" : ""}
          disabled={index > maxStage}
          onClick={() => goToStage(index)}
        >
          <i>{index <= maxStage && index !== stage ? <CheckCircle weight="fill" /> : index + 1}</i>
          <span>{item}</span>
        </button>
      ))}
    </div>
    <PayrollStageStats stage={stage} rows={rows} totals={totals} exceptions={exceptions} paid={paid} />
    <PayrollStagePanel stage={stage} rows={rows} totals={totals} exceptions={exceptions} paid={paid} onOpenEmployee={setModalEmployee} />
    {modalEmployee && <EmployeeSalaryBreakdownModal employeeId={modalEmployee.id} employeeName={modalEmployee.name} onClose={() => setModalEmployee(null)} onAllocation={employeeId => { setModalEmployee(null); onAllocation(employeeId); }} />}
  </>;
}

type AdvanceRow = { name:string; id:string; earned:number; deductions:number; eligible:number; requested:number; state:string };

export function AdvancesScreen({ onCreate }: { onCreate:()=>void }) {
  const notify=useToast();
  const { getBreakdown } = usePayroll();
  const [reviewing,setReviewing]=useState<AdvanceRow|null>(null);
  const [decisions,setDecisions]=useState<Record<string,string>>({});
  const seeds=[
    { id:"BMG-2274", requested:3000, state:"Pending" },
    { id:"BMG-1988", requested:3500, state:"Approved" },
    { id:"BMG-2031", requested:3000, state:"Pending" },
  ];
  const rows:AdvanceRow[]=seeds.map(seed=>{
    const employee=employees.find(item=>item.id===seed.id);
    const breakdown=getBreakdown(seed.id);
    const deductions=breakdown.pf+breakdown.esi+breakdown.otherDeductions;
    const eligibility=computeAdvanceEligibility({ grossEarned:breakdown.gross, deductionsToDate:deductions, alreadyRequested:0 });
    const state=decisions[seed.id] ?? (seed.requested>eligibility.maxAdvance?"Over limit":seed.state);
    return { name:employee?.name??seed.id, id:seed.id, earned:breakdown.gross, deductions, eligible:eligibility.maxAdvance, requested:seed.requested, state };
  });

  function decide(row:AdvanceRow, state:string) {
    setDecisions(current=>({ ...current, [row.id]:state }));
    setReviewing(null);
    notify(`${row.name} advance ${state.toLowerCase()}`);
  }

  return <>
    <PageHeader title="Salary advances" description="Eligibility is 40% of gross earned minus deductions to date." actions={<button className="primary-button" onClick={onCreate}><Plus/>New request</button>}/>
    <StatStrip items={[
      {icon:Wallet,value:"₹2.84L",label:"Outstanding",note:"Across 74 employees"},
      {icon:Coins,value:"11",label:"Awaiting approval",note:"₹38,500 requested",tone:"orange"},
      {icon:CheckCircle,value:"32",label:"Approved this month",note:"₹1.16L total",tone:"green"},
      {icon:WarningCircle,value:"2",label:"Above eligibility",note:"Needs correction",tone:"red"},
    ]}/>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Gross earned</th><th>Deductions</th><th>40% eligible</th><th>Requested</th><th>Utilization</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td><PersonCell name={row.name} id={row.id}/></td><td>{rupees(row.earned)}</td><td>− {rupees(row.deductions)}</td><td>{rupees(row.eligible)}</td><td>{rupees(row.requested)}</td><td><ProgressBar value={row.eligible>0?row.requested/row.eligible*100:100} tone={row.requested>row.eligible?"red":"blue"}/></td><td><Status tone={row.state==="Approved"?"success":row.state==="Pending"?"warning":"danger"}>{row.state}</Status></td><td><button className="text-button" onClick={()=>setReviewing(row)}>Review</button></td></tr>)}
    </tbody></table></div></Panel>

    {reviewing&&<AdvanceDrawer row={reviewing} onDecide={decide} onClose={()=>setReviewing(null)}/>}
  </>;
}

function AdvanceDrawer({ row, onDecide, onClose }: { row:AdvanceRow; onDecide:(row:AdvanceRow,state:string)=>void; onClose:()=>void }) {
  const overLimit=row.requested>row.eligible;
  const instalment=Math.round(row.requested/3);
  return <DetailDrawer title={row.name} subtitle={`${row.id} · advance request`} avatar={row.name.split(" ").map(part=>part[0]).join("").slice(0,2)} onClose={onClose}
    footer={<>
      <button className="secondary-button" onClick={()=>onDecide(row,"Rejected")}>Reject</button>
      <button className="primary-button" disabled={overLimit} onClick={()=>onDecide(row,"Approved")}><CheckCircle/>Approve advance</button>
    </>}>
    {overLimit&&<div className="drawer-section"><div className="inline-alert warning"><WarningCircle/><span>The request exceeds the 40% eligibility cap by {rupees(row.requested-row.eligible)}. Reduce the amount before approving.</span></div></div>}
    <div className="drawer-section">
      <h3>Eligibility</h3>
      <DefRows rows={[
        { label:"Gross wages earned", value:rupees(row.earned), mono:true },
        { label:"Deductions to date", value:`− ${rupees(row.deductions)}`, mono:true },
        { label:"Eligibility cap (40%)", value:rupees(row.eligible), mono:true },
        { label:"Requested", value:rupees(row.requested), mono:true },
        { label:"Headroom", value:rupees(Math.max(0,row.eligible-row.requested)), mono:true, total:true },
      ]}/>
      <ProgressBar value={row.eligible>0?row.requested/row.eligible*100:100} tone={overLimit?"red":"blue"}/>
    </div>
    <div className="drawer-section">
      <h3>Proposed recovery</h3>
      <DefRows rows={[
        { label:"Instalments", value:"3 months", mono:true },
        { label:"Monthly deduction", value:rupees(instalment), mono:true },
        { label:"First deduction", value:"September 2026 payroll" },
      ]}/>
    </div>
    <div className="drawer-section">
      <h3>Request history</h3>
      <Timeline entries={[
        { title:"Submitted from mobile app", time:"09 Sep · 14:22", state:"done" },
        { title:"Eligibility auto-checked", time:"09 Sep · 14:22", note:overLimit?"Flagged: request above (earned − deductions) × 40%.":"Within (earned − deductions) × 40%.", state:"done" },
        { title:"Awaiting HR decision", time:"Pending", state:"active" },
      ]}/>
    </div>
  </DetailDrawer>;
}

export function SparePaymentsScreen() {
  const notify=useToast();
  const [rows,setRows]=useState<SpareDutyPayment[]>(spareDutyPayments);
  const transfer=(id:string)=>{
    const row=rows.find(item=>item.id===id);
    setRows(current=>current.map(item=>item.id===id?{ ...item, status:"transferred" }:item));
    notify(`${rupees(row?.amount??0)} transferred · Operations In-charge and Finance alerted`);
  };
  const employeeOf=(id:string)=>employees.find(item=>item.id===id);
  const queued=rows.filter(item=>item.status==="queued");
  return <>
    <PageHeader title="Spare duty payments" description="Daily transfers to spare guards. Every transfer alerts Operations In-charge and Finance."/>
    <StatStrip items={[
      {icon:Coins,value:String(queued.length),label:"Queued today",note:"Awaiting transfer",tone:queued.length?"orange":"green"},
      {icon:Wallet,value:rupees(rows.filter(item=>item.status==="transferred").reduce((sum,item)=>sum+item.amount,0)),label:"Transferred",note:"This week",tone:"green"},
      {icon:CheckCircle,value:String(rows.length),label:"Spare duties",note:"Recorded this week"},
      {icon:ShieldCheck,value:"Ops + Fin",label:"Alert recipients",note:"Notified on every transfer",tone:"violet"},
    ]}/>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Date</th><th>Site</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {rows.map(row=>{const employee=employeeOf(row.employeeId);return <tr key={row.id}>
        <td><PersonCell name={employee?.name??row.employeeId} id={row.employeeId} phone={employee?.phone}/></td>
        <td>{row.date}</td><td>{row.site}</td><td><strong>{rupees(row.amount)}</strong></td>
        <td><Status tone={row.status==="transferred"?"success":"warning"}>{row.status}</Status></td>
        <td>{row.status==="queued"?<button className="secondary-button compact" onClick={()=>transfer(row.id)}>Mark transferred</button>:"—"}</td>
      </tr>;})}
    </tbody></table></div></Panel>
  </>;
}

export function UniformsScreen({ onIssue, onImport }: { onIssue:()=>void; onImport:()=>void }) {
  const notify=useToast();
  const [plan,setPlan]=useState<(typeof uniformPlans)[number]|null>(null);
  const [inventoryOpen,setInventoryOpen]=useState(false);
  const [requests,setRequests]=useState<UniformRequest[]>(uniformRequests);
  const updateStatus=(id:string,status:UniformRequestStatus)=>{
    const request=requests.find(item=>item.id===id);
    setRequests(current=>current.map(item=>item.id===id?{ ...item, status }:item));
    notify(`${id} marked ${status} · guard app updated${status==="dispatched"?` · ${rupees(request?.amount??0)} queued for salary debit`:""}`);
  };

  return <>
    <PageHeader title="Uniform & inventory" description="Batch-level kit stock, guard requests, dispatch and salary recovery." actions={<><button className="secondary-button" onClick={onImport}><UploadSimple/>Import balances</button><button className="primary-button" onClick={onIssue}><Plus/>Issue kit</button></>}/>
    <StatStrip items={[
      {icon:TShirt,value:"76",label:"Kits issued",note:"This quarter"},
      {icon:Package,value:String(new Set(uniformBatches.map(batch=>batch.batchNo)).size),label:"Batches tracked",note:"Size-level stock",tone:"green"},
      {icon:Wallet,value:"₹1.82L",label:"Pending recovery",note:"93 employees",tone:"orange"},
      {icon:WarningCircle,value:String(requests.filter(item=>item.status==="requested").length),label:"Open requests",note:"From the guard app",tone:"red"},
    ]}/>
    <div className="content-grid">
      <Panel title="Recovery plans" description="Defaults can be overridden per employee."><div className="plan-list">{uniformPlans.map(item=><button key={item.name} onClick={()=>setPlan(item)}><span className="small-icon blue"><TShirt/></span><div><strong>{item.name}</strong><small>{rupees(item.upfront)} paid · {rupees(item.deduction)} recovered</small></div><b>{item.people}</b><ArrowRight/></button>)}</div></Panel>
      <Panel title="Kit availability" description="Central store · Thiruvananthapuram"><div className="stock-list">{uniformKit.slice(0,6).map(item=><div key={item.item}><span>{item.item.split(" (")[0]}</span><ProgressBar value={Math.min(100,item.stock/2.6)} tone={item.stock<item.reorder?"orange":"blue"}/><strong>{item.stock}</strong></div>)}</div><button className="full-button" onClick={()=>setInventoryOpen(true)}>View all 12 items and batches</button></Panel>
    </div>
    <Panel title="Requests from guards" description="Raised in the mobile app · every status change shows in the guard's app.">
      <div className="uniform-request-list">{requests.map(request=>{const employee=employees.find(item=>item.id===request.employeeId);return <div className="uniform-request-row" key={request.id}>
        <PersonCell name={employee?.name??request.employeeId} id={request.employeeId} phone={employee?.phone}/>
        <span className="request-items">{request.items.map(item=>`${item.item.split(" (")[0]} · ${item.size} ×${item.qty}`).join(", ")}</span>
        <span className="request-meta">{request.requestedOn} · {rupees(request.amount)} · {request.recoveryPlan}</span>
        <select value={request.status} onChange={event=>updateStatus(request.id,event.target.value as UniformRequestStatus)} aria-label={`${request.id} status`}>
          <option value="requested">Requested</option><option value="approved">Approved</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option>
        </select>
      </div>;})}</div>
    </Panel>

    {plan&&<DetailDrawer title={plan.name} subtitle="Uniform recovery plan" onClose={()=>setPlan(null)}
      footer={<>
        <button className="secondary-button" onClick={()=>setPlan(null)}>Close</button>
        <button className="primary-button" onClick={()=>{notify(`${plan.name} set as the default recovery plan`);setPlan(null)}}><CheckCircle/>Set as default</button>
      </>}>
      <div className="drawer-section">
        <h3>Recovery structure</h3>
        <DefRows rows={[
          { label:"Paid at issuance", value:rupees(plan.upfront), mono:true },
          { label:"Recovered from salary", value:rupees(plan.deduction), mono:true },
          { label:"Total cost to employee", value:rupees(plan.total), mono:true, total:true },
        ]}/>
        <p style={{ margin:"12px 0 0", fontSize:"var(--fs-xs)", color:"var(--muted)", lineHeight:1.55 }}>{plan.note}</p>
      </div>
      <div className="drawer-section">
        <h3>Uptake</h3>
        <DefRows rows={[
          { label:"Employees on this plan", value:plan.people, mono:true },
          { label:"Share of workforce", value:`${Math.round(plan.people/468*100)}%`, mono:true },
          { label:"Outstanding balance", value:rupees(plan.deduction*Math.round(plan.people*0.4)), mono:true },
        ]}/>
      </div>
      <div className="drawer-section">
        <div className="inline-alert"><WarningCircle/><span>An employee carrying a balance on this plan cannot complete exit clearance until the dues are settled.</span></div>
      </div>
    </DetailDrawer>}

    {inventoryOpen&&<DetailDrawer title="Twelve-item uniform kit" subtitle="Central store · Thiruvananthapuram" onClose={()=>setInventoryOpen(false)}
      footer={<>
        <button className="secondary-button" onClick={()=>setInventoryOpen(false)}>Close</button>
        <button className="primary-button" onClick={()=>{notify("Stock report exported as CSV");setInventoryOpen(false)}}><DownloadSimple/>Export stock</button>
      </>}>
      <div className="kit-grid">
        {uniformKit.map(item=>{const batches=uniformBatches.filter(batch=>batch.item===item.item);return <div key={item.item}>
          <strong>{item.item}</strong>
          <div className="kit-meta"><span>{item.issued} per kit</span><span className={item.stock<item.reorder?"low":undefined}>{item.stock} in stock</span></div>
          <ProgressBar value={Math.min(100,item.stock/2.8)} tone={item.stock<item.reorder?"orange":"blue"}/>
          {batches.length>0&&<div className="batch-lines">{batches.map(batch=><span key={`${batch.batchNo}-${batch.size}`}><b>{batch.batchNo}</b> · size {batch.size} · {batch.qty} pcs · {batch.receivedOn}</span>)}</div>}
        </div>;})}
      </div>
      <div className="drawer-section">
        <div className="inline-alert warning"><WarningCircle/><span>Raincoat and torch stock are below the reorder level. {uniformKit.filter(item=>item.stock<item.reorder).length} of 12 items need replenishment.</span></div>
      </div>
    </DetailDrawer>}
  </>;
}
