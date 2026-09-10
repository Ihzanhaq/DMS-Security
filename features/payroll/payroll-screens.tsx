"use client";

import { useState } from "react";
import {
  ArrowRight, CheckCircle, Coins, DownloadSimple, Package, Plus, Receipt,
  ShieldCheck, TShirt, UploadSimple, Wallet, WarningCircle,
} from "@phosphor-icons/react";
import { payrollRows, rupees, uniformKit, uniformPlans } from "@/lib/mock-data";
import {
  DefRows, DetailDrawer, PageHeader, Panel, PersonCell, ProgressBar,
  StatStrip, Status, Timeline,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";

export function PayrollScreen({ onAllocation }: { onAllocation: () => void }) {
  const notify=useToast();
  const [stage,setStage]=useState(2);
  const [paid,setPaid]=useState(false);
  const [selected,setSelected]=useState(payrollRows[0]);
  const stages=["Attendance","Calculation","Review","Approval","Payment"];

  function advance() {
    if(stage<4){ setStage(stage+1); return; }
    setPaid(true);
    notify("August 2026 payroll marked as paid · bank file generated");
  }

  return <>
    <PageHeader title="Payroll" description="August 2026 · working-day salary with site-level contribution allocation."
      actions={<><button className="secondary-button" onClick={onAllocation}>Allocation audit</button><button className="secondary-button" onClick={()=>notify("Payroll register exported as CSV")}><DownloadSimple/>Export register</button><button className="primary-button" disabled={paid} onClick={advance}>{stage<4?"Continue review":paid?"Payroll closed":"Mark paid"}<ArrowRight/></button></>}/>
    {paid&&<div className="saved-notice" data-enter><CheckCircle weight="fill"/>August 2026 payroll is closed. 468 net payouts totalling ₹58.8L were released to the bank file.</div>}
    <div className="stepper" data-enter>{stages.map((item,index)=><button key={item} className={index<stage?"done":index===stage?"current":""} onClick={()=>setStage(index)}><i>{index<stage?<CheckCircle weight="fill"/>:index+1}</i><span>{item}</span></button>)}</div>
    <StatStrip items={[
      {icon:Wallet,value:"₹72.8L",label:"Gross payroll",note:"468 employees"},
      {icon:ShieldCheck,value:"₹8.6L",label:"PF and ESI",note:"Employee deductions",tone:"violet"},
      {icon:Receipt,value:"₹5.4L",label:"Other deductions",note:"Advance, uniform, penalty",tone:"orange"},
      {icon:WarningCircle,value:"3",label:"Exceptions",note:"Blocking approval",tone:"red"},
    ]}/>
    <div className="split-detail">
      <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Duties</th><th>Gross</th><th>PF</th><th>ESI</th><th>Other</th><th>Net</th><th>Status</th></tr></thead><tbody>
        {payrollRows.map(row=><tr key={row.id} className={selected.id===row.id?"selected-row":""} tabIndex={0} onClick={()=>setSelected(row)} onKeyDown={event=>{if(event.key==="Enter")setSelected(row)}}><td><PersonCell name={row.employee} id={row.id}/></td><td>{row.duties}</td><td>{rupees(row.gross)}</td><td>{rupees(row.pf)}</td><td>{rupees(row.esi)}</td><td>{rupees(row.deductions)}</td><td><strong>{rupees(row.net)}</strong></td><td><Status tone={row.state==="Ready"?"success":"warning"}>{row.state}</Status></td></tr>)}
      </tbody></table></div></Panel>
      <Panel title={selected.employee} description={selected.id+" · calculation detail"} className="calc-panel">
        <div className="formula-card"><span>Monthly salary</span><strong>₹{selected.gross===14615?"19,000":"16,000"}</strong><small>÷ 26 scheduled payable duties</small></div>
        <div className="calc-lines">
          <span><b>Approved duties</b><strong>{selected.duties.split(" ")[0]}</strong></span>
          <span><b>Prorated gross</b><strong>{rupees(selected.gross)}</strong></span>
          <span><b>Employee PF</b><strong>− {rupees(selected.pf)}</strong></span>
          <span><b>Employee ESI</b><strong>− {rupees(selected.esi)}</strong></span>
          <span><b>Other deductions</b><strong>− {rupees(selected.deductions)}</strong></span>
          <span className="total"><b>Net payable</b><strong>{rupees(selected.net)}</strong></span>
        </div>
        <div className="inheritance-note"><ShieldCheck/><span>PF + ESI inherited from employee profile.<button onClick={onAllocation}>View site allocation</button></span></div>
      </Panel>
    </div>
  </>;
}

type AdvanceRow = { name:string; id:string; earned:number; eligible:number; requested:number; state:string };

export function AdvancesScreen({ onCreate }: { onCreate:()=>void }) {
  const notify=useToast();
  const [reviewing,setReviewing]=useState<AdvanceRow|null>(null);
  const [rows,setRows]=useState<AdvanceRow[]>([
    {name:"Fathima N",id:"BMG-2274",earned:8615,eligible:3446,requested:3000,state:"Pending"},
    {name:"Rajeev Kumar",id:"BMG-1988",earned:9850,eligible:3940,requested:3500,state:"Approved"},
    {name:"Anzar M",id:"BMG-2031",earned:6250,eligible:2500,requested:3000,state:"Over limit"},
  ]);

  function decide(row:AdvanceRow, state:string) {
    setRows(current=>current.map(item=>item.id===row.id?{ ...item, state }:item));
    setReviewing(null);
    notify(`${row.name} advance ${state.toLowerCase()}`);
  }

  return <>
    <PageHeader title="Salary advances" description="Eligibility is 40% of approved gross wages earned to date." actions={<button className="primary-button" onClick={onCreate}><Plus/>New request</button>}/>
    <StatStrip items={[
      {icon:Wallet,value:"₹2.84L",label:"Outstanding",note:"Across 74 employees"},
      {icon:Coins,value:"11",label:"Awaiting approval",note:"₹38,500 requested",tone:"orange"},
      {icon:CheckCircle,value:"32",label:"Approved this month",note:"₹1.16L total",tone:"green"},
      {icon:WarningCircle,value:"2",label:"Above eligibility",note:"Needs correction",tone:"red"},
    ]}/>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Gross earned</th><th>40% eligible</th><th>Requested</th><th>Utilization</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td><PersonCell name={row.name} id={row.id}/></td><td>{rupees(row.earned)}</td><td>{rupees(row.eligible)}</td><td>{rupees(row.requested)}</td><td><ProgressBar value={row.requested/row.eligible*100} tone={row.requested>row.eligible?"red":"blue"}/></td><td><Status tone={row.state==="Approved"?"success":row.state==="Pending"?"warning":"danger"}>{row.state}</Status></td><td><button className="text-button" onClick={()=>setReviewing(row)}>Review</button></td></tr>)}
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
        { label:"Eligibility cap (40%)", value:rupees(row.eligible), mono:true },
        { label:"Requested", value:rupees(row.requested), mono:true },
        { label:"Headroom", value:rupees(Math.max(0,row.eligible-row.requested)), mono:true, total:true },
      ]}/>
      <ProgressBar value={row.requested/row.eligible*100} tone={overLimit?"red":"blue"}/>
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
        { title:"Eligibility auto-checked", time:"09 Sep · 14:22", note:overLimit?"Flagged: request above the 40% cap.":"Within the 40% cap.", state:"done" },
        { title:"Awaiting HR decision", time:"Pending", state:"active" },
      ]}/>
    </div>
  </DetailDrawer>;
}

export function UniformsScreen({ onIssue, onImport }: { onIssue:()=>void; onImport:()=>void }) {
  const notify=useToast();
  const [plan,setPlan]=useState<(typeof uniformPlans)[number]|null>(null);
  const [inventoryOpen,setInventoryOpen]=useState(false);

  return <>
    <PageHeader title="Uniform & inventory" description="Twelve-item kit stock, issuance and salary recovery." actions={<><button className="secondary-button" onClick={onImport}><UploadSimple/>Import balances</button><button className="primary-button" onClick={onIssue}><Plus/>Issue kit</button></>}/>
    <StatStrip items={[
      {icon:TShirt,value:"76",label:"Kits issued",note:"This quarter"},
      {icon:Package,value:"148",label:"Complete kits",note:"Ready in stock",tone:"green"},
      {icon:Wallet,value:"₹1.82L",label:"Pending recovery",note:"93 employees",tone:"orange"},
      {icon:WarningCircle,value:"3",label:"Exit blocks",note:"Uniform dues pending",tone:"red"},
    ]}/>
    <div className="content-grid">
      <Panel title="Recovery plans" description="Defaults can be overridden per employee."><div className="plan-list">{uniformPlans.map(item=><button key={item.name} onClick={()=>setPlan(item)}><span className="small-icon blue"><TShirt/></span><div><strong>{item.name}</strong><small>{rupees(item.upfront)} paid · {rupees(item.deduction)} recovered</small></div><b>{item.people}</b><ArrowRight/></button>)}</div></Panel>
      <Panel title="Kit availability" description="Central store · Thiruvananthapuram"><div className="stock-list">{uniformKit.slice(0,6).map(item=><div key={item.item}><span>{item.item.split(" (")[0]}</span><ProgressBar value={Math.min(100,item.stock/2.6)} tone={item.stock<item.reorder?"orange":"blue"}/><strong>{item.stock}</strong></div>)}</div><button className="full-button" onClick={()=>setInventoryOpen(true)}>View all 12 items</button></Panel>
    </div>

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
        {uniformKit.map(item=><div key={item.item}>
          <strong>{item.item}</strong>
          <div className="kit-meta"><span>{item.issued} per kit</span><span className={item.stock<item.reorder?"low":undefined}>{item.stock} in stock</span></div>
          <ProgressBar value={Math.min(100,item.stock/2.8)} tone={item.stock<item.reorder?"orange":"blue"}/>
        </div>)}
      </div>
      <div className="drawer-section">
        <div className="inline-alert warning"><WarningCircle/><span>Raincoat and torch stock are below the reorder level. {uniformKit.filter(item=>item.stock<item.reorder).length} of 12 items need replenishment.</span></div>
      </div>
    </DetailDrawer>}
  </>;
}
