"use client";

import { useState } from "react";
import {
  CalendarBlank, CheckCircle, Crosshair, FileText,
  MapPin, NavigationArrow, Phone, Receipt, ShieldCheck, SuitcaseRolling, UserCircle,
  Wallet, WarningCircle,
} from "@phosphor-icons/react";
import type { AppView, DutyChangeReason, DutyChangeRequest, DutyChangeType, GeoState, Ticket, TicketCategory, UniformRequest } from "@/types/domain";
import { complaintTrail, complaints, distanceMetres, dutyChangeRequests, employees, payslips, rupees, sites, sopDocuments, tickets as ticketSeed, uniformKit, uniformPlans, uniformRequests } from "@/lib/mock-data";
import { isInsideGeofence } from "@/lib/geofence";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";
import { usePayroll } from "@/components/shared/payroll-context";
import { GeoMap } from "@/components/shared/geo-map";
import {
  DefRows, DetailDrawer, PageHeader, Panel, ProgressBar, Status, Timeline,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";

/** The guard signed in to the demo portal is posted at Lulu Mall, Kochi. */
const guardSite = sites[0];

export type GuardUser = { id: string; name: string; initials: string };
export const deviceGuardUsers: GuardUser[] = [
  { id: "BMG-1840", name: "Suresh Babu", initials: "SB" },
  { id: "BMG-2118", name: "Vinod Raj", initials: "VR" },
  { id: "BMG-2087", name: "Jomon Jose", initials: "JJ" },
];

export function GuardPortal({ view, onNavigate, activeGuard = deviceGuardUsers[0], onSwitchUser }: { view:AppView; onNavigate:(view:AppView)=>void; activeGuard?:GuardUser; onSwitchUser?:(user:GuardUser)=>void }) {
  if(view==="guard-punch") return <GuardPunch/>;
  if(view==="guard-schedule") return <GuardSchedule/>;
  if(view==="guard-leave") return <RequestScreen type="leave"/>;
  if(view==="guard-advance") return <RequestScreen type="advance"/>;
  if(view==="guard-payslips") return <Payslips onNavigate={onNavigate}/>;
  if(view==="guard-sops") return <GuardSops/>;
  if(view==="guard-profile") return <GuardProfile activeGuard={activeGuard} onSwitchUser={onSwitchUser}/>;
  if(view==="guard-duty-change") return <GuardDutyChange/>;
  if(view==="guard-uniform") return <GuardUniform/>;
  if(view==="guard-help") return <GuardHelp/>;
  return <GuardHome onNavigate={onNavigate}/>;
}

function GuardHelp(){
  const notify=useToast();
  const [category,setCategory]=useState<TicketCategory>(() => (typeof window !== "undefined" && window.sessionStorage.getItem("bmg-help-category") === "salary" ? "salary" : "other"));
  const [subject,setSubject]=useState("");
  const [detail,setDetail]=useState("");
  const [mine,setMine]=useState<Ticket[]>(ticketSeed.filter(ticket=>ticket.raisedBy==="BMG-1840"));
  const [open,setOpen]=useState<Ticket|null>(null);
  function submit(){
    if(!subject.trim())return;
    const ticket:Ticket={ id:`TKT-${Date.now()%100000}`, raisedBy:"BMG-1840", raisedByRole:"Guard", category, subject:subject.trim(), detail:detail.trim(), status:"open", createdOn:"2026-09-22", sla:"2026-09-25", assignee:"Meera Nair", trail:[{ title:"Raised from mobile app", time:"22 Sep · now", state:"active" }] };
    setMine(current=>[ticket,...current]);
    setSubject("");setDetail("");
    window.sessionStorage.removeItem("bmg-help-category");
    notify(`Ticket ${ticket.id} raised · HR will respond`);
  }
  return <>
    <PageHeader title="Help & queries" description="Ask about salary, attendance, uniform or anything else. HR replies inside the ticket."/>
    <Panel className="request-card" title="Raise a query">
      <div className="request-form">
        <label><span>Category</span><select value={category} onChange={event=>setCategory(event.target.value as TicketCategory)}>
          <option value="salary">Salary doubt</option><option value="attendance">Attendance</option><option value="uniform">Uniform</option><option value="site-issue">Site issue</option><option value="other">Other</option>
        </select></label>
        <label><span>Subject</span><input value={subject} onChange={event=>setSubject(event.target.value)} placeholder="One line about the problem"/></label>
        <label className="full-width-field"><span>Details</span><textarea rows={3} value={detail} onChange={event=>setDetail(event.target.value)} placeholder="Explain what looks wrong — month, amount, dates…"/></label>
      </div>
      <button className="primary-button wide" disabled={!subject.trim()} onClick={submit}><CheckCircle/>Send to HR</button>
    </Panel>
    <Panel title="My tickets"><div className="schedule-list">{mine.map(ticket=><button key={ticket.id} onClick={()=>setOpen(ticket)}>
      <strong>{ticket.id}</strong>
      <span>{ticket.subject}<small>{ticket.createdOn} · {ticket.assignee}</small></span>
      <Status tone={ticket.status==="resolved"?"success":ticket.status==="in-progress"?"info":"warning"}>{ticket.status}</Status>
    </button>)}</div></Panel>
    {open&&<DetailDrawer title={open.id} subtitle={open.subject} onClose={()=>setOpen(null)}
      footer={<button className="secondary-button" onClick={()=>setOpen(null)}>Close</button>}>
      <div className="drawer-section"><h3>Your query</h3><p style={{ margin:0, fontSize:"var(--fs-sm)", lineHeight:1.55 }}>{open.detail||open.subject}</p></div>
      <div className="drawer-section"><h3>Progress</h3><Timeline entries={open.trail}/></div>
    </DetailDrawer>}
  </>;
}

const sizeOptions=(item:string)=>item.startsWith("Shirt")||item==="Sweater"||item==="Raincoat"?["S","M","L","XL","XXL"]
  :item==="Trousers"?["30","32","34","36","38"]
  :item.startsWith("Shoes")?["6","7","8","9","10","11"]
  :["Standard"];
const itemPrice=(item:string)=>item.startsWith("Shoes")?900:item==="Trousers"?550:item.startsWith("Shirt")?450:item==="Raincoat"||item==="Sweater"?600:300;

function GuardUniform(){
  const notify=useToast();
  const me=employees.find(item=>item.id==="BMG-1840");
  const sizes=me?.uniformSizes??{ shirt:"L", trouser:"34", shoe:"9" };
  const [item,setItem]=useState(uniformKit[0].item);
  const [size,setSize]=useState(sizeOptions(uniformKit[0].item)[2]??sizeOptions(uniformKit[0].item)[0]);
  const [qty,setQty]=useState(1);
  const [plan,setPlan]=useState(uniformPlans[2].name);
  const [mine,setMine]=useState<UniformRequest[]>(uniformRequests.filter(request=>request.employeeId==="BMG-1840"));
  const statusSteps:["requested","approved","dispatched","delivered"]=["requested","approved","dispatched","delivered"];
  function submit(){
    const request:UniformRequest={ id:`UR-${Date.now()}`, employeeId:"BMG-1840", items:[{ item, size, qty }], status:"requested", requestedOn:"2026-09-22", amount:itemPrice(item)*qty, recoveryPlan:plan };
    setMine(current=>[request,...current]);
    notify("Request sent to store");
  }
  return <>
    <PageHeader title="Uniform" description="Request replacement pieces and track dispatch. Costs are recovered per your selected plan."/>
    <Panel title="My sizes" description="Recorded at onboarding — ask HR to correct them.">
      <div className="personal-stats"><div><strong>{sizes.shirt}</strong><span>Shirt</span></div><div><strong>{sizes.trouser}</strong><span>Trouser</span></div><div><strong>{sizes.shoe}</strong><span>Shoe</span></div></div>
    </Panel>
    <Panel className="request-card" title="Request an item">
      <div className="request-form">
        <label><span>Item</span><select value={item} onChange={event=>{setItem(event.target.value);setSize(sizeOptions(event.target.value)[0]);}}>{uniformKit.map(kitItem=><option key={kitItem.item}>{kitItem.item}</option>)}</select></label>
        <label><span>Size</span><select value={size} onChange={event=>setSize(event.target.value)}>{sizeOptions(item).map(option=><option key={option}>{option}</option>)}</select></label>
        <label><span>Quantity</span><input type="number" min={1} max={4} value={qty} onChange={event=>setQty(Number(event.target.value))}/></label>
        <label><span>Recovery plan</span><select value={plan} onChange={event=>setPlan(event.target.value)}>{uniformPlans.map(option=><option key={option.name}>{option.name}</option>)}</select></label>
      </div>
      <div className="inline-alert"><WarningCircle/><span>Estimated cost {rupees(itemPrice(item)*qty)} · recovered as {plan}.</span></div>
      <button className="primary-button wide" onClick={submit}><CheckCircle/>Send request</button>
    </Panel>
    <Panel title="My requests" description="Dispatch status updates appear here as the store processes them.">
      <div className="uniform-status-list">{mine.map(request=><div className="uniform-status-card" key={request.id}>
        <header><strong>{request.items.map(line=>`${line.item.split(" (")[0]} · ${line.size} ×${line.qty}`).join(", ")}</strong><Status tone={request.status==="delivered"?"success":request.status==="requested"?"warning":"info"}>{request.status}</Status></header>
        <Timeline entries={statusSteps.map((step,index)=>{
          const reached=statusSteps.indexOf(request.status)>=index;
          const active=request.status===step&&step!=="delivered";
          return { title:step[0].toUpperCase()+step.slice(1), time:reached?(index===0?request.requestedOn:"Updated"):"Pending", note:step==="dispatched"&&reached?`${rupees(request.amount)} queued for salary debit (${request.recoveryPlan})`:undefined, state:active?"active" as const:reached?"done" as const:undefined };
        })}/>
      </div>)}</div>
    </Panel>
  </>;
}

function GuardDutyChange(){
  const notify=useToast();
  const [type,setType]=useState<DutyChangeType>("replacement");
  const [reason,setReason]=useState<DutyChangeReason>("sick");
  const [hours,setHours]=useState(2);
  const [note,setNote]=useState("");
  const [sent,setSent]=useState(false);
  const [mine,setMine]=useState<DutyChangeRequest[]>(dutyChangeRequests.filter(request=>request.employeeId==="BMG-1840"));
  function submit(){
    const request:DutyChangeRequest={ id:`DCR-${Date.now()}`, employeeId:"BMG-1840", type, date:"2026-09-23", site:guardSite.name, reason:type==="ot"?"other":reason, hours:type==="ot"?hours:undefined, note, status:"pending" };
    setMine(current=>[request,...current]); setSent(true);
    notify(type==="ot"?"Additional duty recorded for approval":"Request sent · your field officer is notified");
  }
  return <>
    <PageHeader title="Duty change" description="Report sickness or accident, request a shift swap, or record additional duty (OT)."/>
    <Panel className="request-card"><div className="request-form">
      <label><span>Request type</span><select value={type} onChange={event=>{setType(event.target.value as DutyChangeType);setSent(false)}}>
        <option value="replacement">Replacement (sick / accident)</option>
        <option value="swap">Shift swap</option>
        <option value="ot">Additional duty (OT)</option>
      </select></label>
      {type!=="ot"&&<label><span>Reason</span><select value={reason} onChange={event=>setReason(event.target.value as DutyChangeReason)}>
        <option value="sick">Sickness</option><option value="accident">Accident</option>
        <option value="personal">Personal</option><option value="other">Other</option>
      </select></label>}
      {type==="swap"&&<label><span>Swap with</span><select><option>Deepa Menon</option><option>Rajeev Kumar</option><option>Any available reliever</option></select></label>}
      {type==="ot"&&<label><span>Extra hours</span><input type="number" min={1} max={12} value={hours} onChange={event=>setHours(Number(event.target.value))}/></label>}
      <label><span>Date</span><input type="date" defaultValue="2026-09-23"/></label>
      <label><span>Details</span><textarea rows={3} value={note} onChange={event=>setNote(event.target.value)} placeholder="What happened, and from when do you need cover?"/></label>
    </div>
    {type==="replacement"&&<div className="inline-alert"><WarningCircle/><span>District operations is alerted immediately so a reliever can cover the post.</span></div>}
    <button className="primary-button wide" disabled={sent} onClick={submit}><CheckCircle/>{sent?"Submitted":"Submit request"}</button></Panel>
    <Panel title="My requests"><div className="schedule-list">{mine.map(request=><button key={request.id}>
      <strong>{request.date}</strong>
      <span>{request.type==="ot"?`Additional duty · ${request.hours} h`:request.type==="swap"?"Shift swap":"Replacement"}<small>{request.note||request.reason}</small></span>
      <Status tone={request.status==="approved"?"success":request.status==="rejected"?"danger":"warning"}>{request.status}</Status>
    </button>)}</div></Panel>
  </>;
}

function GuardHome({onNavigate}:{onNavigate:(view:AppView)=>void}) {
  const { getBreakdown } = usePayroll();
  const breakdown=getBreakdown("BMG-1840");
  const eligibility=computeAdvanceEligibility({ grossEarned:breakdown.gross, deductionsToDate:breakdown.pf+breakdown.esi+breakdown.otherDeductions, alreadyRequested:0 });
  return <>
    <PageHeader title="Today’s duty" description={`Thursday, 10 September · ${guardSite.name}`}/>
    <div className="guard-home-grid">
      <Panel className="shift-focus"><div className="shift-time"><span>Day shift</span><strong>08:00–20:00</strong><p>Loading Bay · Gate 2 · 1.00 duty</p></div><div className="shift-site"><MapPin/><span>{guardSite.name}<small>{guardSite.polygon?`Polygon boundary · ${guardSite.polygon.length} corners`:`Geofence radius ${guardSite.radius} metres`}</small></span></div><button className="primary-button large" onClick={()=>onNavigate("guard-punch")}><NavigationArrow/>Open attendance</button></Panel>
      <Panel title="Last approved payroll" description="August 2026"><div className="personal-stats"><div><strong>{breakdown.duties.toFixed(2)}</strong><span>Duties</span></div><div><strong>{rupees(breakdown.gross)}</strong><span>Gross earned</span></div><div><strong>{rupees(eligibility.maxAdvance)}</strong><span>Advance limit</span></div></div></Panel>
      <Panel title="Actions"><div className="quick-links"><button onClick={()=>onNavigate("guard-leave")}><CalendarBlank/><span>Request leave</span></button><button onClick={()=>onNavigate("guard-advance")}><Wallet/><span>Request advance</span></button><button onClick={()=>onNavigate("guard-vigilance")}><Crosshair/><span>Night check</span></button><button onClick={()=>onNavigate("guard-sops")}><FileText/><span>Site SOP</span></button></div></Panel>
      <Panel title="Emergency contacts" description={`Escalation numbers for ${guardSite.name}`}>
        <div className="contact-cards">{guardSite.escalationContacts.map(contact=><a key={contact.label} className="contact-card" href={`tel:${contact.phone.replace(/\s/g,"")}`}>
          <span className="small-icon blue"><Phone/></span>
          <span><strong>{contact.label}</strong><small>{contact.name}</small></span>
          <b>{contact.phone}</b>
        </a>)}</div>
      </Panel>
    </div>
  </>;
}

function GuardPunch() {
  const notify=useToast();
  const [geo,setGeo]=useState<GeoState>("idle");
  const [position,setPosition]=useState<{lat:number;lng:number;accuracy:number}|null>(null);
  const [distance,setDistance]=useState<number|null>(null);
  const [punched,setPunched]=useState(false);

  function locate(){
    setGeo("locating");
    if(!navigator.geolocation){setGeo("unavailable");return}
    navigator.geolocation.getCurrentPosition(
      result=>{
        const here={ lat:result.coords.latitude, lng:result.coords.longitude };
        setPosition({ ...here, accuracy:Math.round(result.coords.accuracy) });
        setDistance(distanceMetres(here,guardSite));
        // Inside is a boundary test, not an accuracy test. Accuracy is
        // reported separately as a confidence signal. The polygon wins over
        // the radius circle when the site has one configured.
        setGeo(isInsideGeofence(here,guardSite)?"inside":"outside");
      },
      error=>setGeo(error.code===1?"denied":"unavailable"),
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  }

  const label=geo==="idle"?"Location not checked"
    :geo==="locating"?"Finding your location"
    :geo==="inside"?"Inside site boundary"
    :geo==="outside"?"Outside site boundary"
    :geo==="denied"?"Location permission denied"
    :"Location unavailable";

  return <>
    <PageHeader title="Attendance punch" description={`${guardSite.name} · Loading Bay · 08:00–20:00`}/>
    <div className="punch-layout">
      <Panel className="map-panel">
        <GeoMap center={guardSite} radius={guardSite.radius} polygon={guardSite.polygon} guard={position} guardInside={geo==="inside"}/>
        <div className="map-caption">
          <span>Site <b>{guardSite.lat.toFixed(5)}, {guardSite.lng.toFixed(5)}</b></span>
          <span>Boundary <b>{guardSite.polygon ? `Site polygon · ${guardSite.polygon.length} corners` : `${guardSite.radius} m`}</b></span>
          {distance!==null&&<span>Distance to centre <b>{distance} m</b></span>}
        </div>
      </Panel>
      <Panel title="Verify your location" description="Your browser will ask for location permission.">
        <div className={"geo-state "+geo}>
          <span><Crosshair size={24}/></span>
          <strong>{label}</strong>
          <p>{position
            ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} · ±${position.accuracy} m`
            : "Location is used only as attendance evidence."}</p>
        </div>
        {distance!==null&&<div style={{ padding:"0 20px 4px" }}><DefRows rows={[
          { label:"Distance from post", value:`${distance} m`, mono:true },
          { label:"Geofence radius", value:`${guardSite.radius} m`, mono:true },
          { label:"GPS accuracy", value:`±${position?.accuracy ?? 0} m`, mono:true },
        ]}/></div>}
        <button className="secondary-button wide" onClick={locate} disabled={geo==="locating"}><Crosshair/>{geo==="locating"?"Locating…":"Check location"}</button>
        <button className="primary-button wide" disabled={geo!=="inside"||punched} onClick={()=>{setPunched(true);notify("Punch-in recorded")}}><CheckCircle/>{punched?"Punch recorded at 07:52":"Punch in"}</button>
        {geo==="outside"&&distance!==null&&<div className="inline-alert warning"><WarningCircle/><span>{guardSite.polygon ? "You are outside the site boundary. Move inside the marked area, or ask your supervisor to review a manual punch." : `You are ${distance - guardSite.radius} m beyond the boundary. Move closer to the post, or ask your supervisor to review a manual punch.`}</span></div>}
        {position&&position.accuracy>50&&geo==="inside"&&<div className="inline-alert warning"><WarningCircle/><span>GPS accuracy is ±{position.accuracy} m, above the 50 m threshold. This punch will be flagged for review.</span></div>}
        <div className="check-interval-note"><MapPin/><span>Presence checks every <b>{guardSite.dayCheckIntervalMins} min</b> (day) · <b>{guardSite.nightCheckIntervalMins} min</b> (night). Late arrival grace: <b>{guardSite.graceMins} min</b>.</span></div>
      </Panel>
    </div>
  </>;
}

const scheduleDays=[
  { date:"10 Sep", site:"Lulu Mall, Kochi", window:"08:00–20:00", state:"Today", post:"Loading Bay · Gate 2", duty:"1.00" },
  { date:"11 Sep", site:"Lulu Mall, Kochi", window:"08:00–20:00", state:"Scheduled", post:"Loading Bay · Gate 2", duty:"1.00" },
  { date:"12 Sep", site:"Weekly off", window:"—", state:"Off", post:"—", duty:"0.00" },
  { date:"13 Sep", site:"Aster Medcity", window:"08:00–14:00", state:"0.50 duty", post:"Emergency · Front desk", duty:"0.50" },
];

function GuardSchedule(){
  const [open,setOpen]=useState<(typeof scheduleDays)[number]|null>(null);
  return <>
    <PageHeader title="My schedule" description="September 2026 · approved roster"/>
    <Panel><div className="schedule-list">{scheduleDays.map(row=>
      <button key={row.date} onClick={()=>setOpen(row)}>
        <strong>{row.date}</strong>
        <span>{row.site}<small>{row.window}</small></span>
        <Status tone={row.state==="Today"?"info":row.state==="Off"?"neutral":"success"}>{row.state}</Status>
      </button>)}</div></Panel>

    {open&&<DetailDrawer title={open.date} subtitle={open.site} onClose={()=>setOpen(null)}
      footer={<button className="secondary-button" onClick={()=>setOpen(null)}>Close</button>}>
      <div className="drawer-section">
        <h3>Duty detail</h3>
        <DefRows rows={[
          { label:"Site", value:open.site },
          { label:"Post", value:open.post },
          { label:"Shift window", value:open.window, mono:true },
          { label:"Duty quantity", value:open.duty, mono:true },
          { label:"Status", value:<Status tone={open.state==="Today"?"info":open.state==="Off"?"neutral":"success"}>{open.state}</Status> },
        ]}/>
      </div>
      {open.state!=="Off"&&<div className="drawer-section">
        <h3>Reporting</h3>
        <DefRows rows={[
          { label:"Report by", value:open.window.split("–")[0], mono:true },
          { label:"Geofence radius", value:`${guardSite.radius} m`, mono:true },
          { label:"Supervisor", value:"Niyas P" },
        ]}/>
      </div>}
    </DetailDrawer>}
  </>;
}

function RequestScreen({type}:{type:"leave"|"advance"}){
  const notify=useToast();
  const [sent,setSent]=useState(false);
  const [amount,setAmount]=useState(1500);
  const advance=type==="advance";
  const { getBreakdown } = usePayroll();
  const breakdown=getBreakdown("BMG-1840");
  const eligibility=computeAdvanceEligibility({
    grossEarned:breakdown.gross,
    deductionsToDate:breakdown.pf+breakdown.esi+breakdown.otherDeductions,
    alreadyRequested:0,
  });
  const overLimit=advance&&amount>eligibility.maxAdvance;
  function submit(){ setSent(true); notify(advance?"Advance request submitted to HR":"Leave request submitted to your supervisor"); }
  return <>
    <PageHeader title={advance?"Request salary advance":"Request leave"} description={advance?`Maximum available: ${rupees(eligibility.maxAdvance)} — (earned − deductions) × 40%.`:"Your supervisor and HR will receive this request."}/>
    <Panel className="request-card">
      {advance
        ? <div className="request-form"><label><span>Amount</span><input type="number" min={0} value={amount} onChange={event=>setAmount(Number(event.target.value))}/></label><label><span>Reason</span><select><option>Personal expense</option><option>Medical</option><option>Emergency</option></select></label><div className="eligibility-box"><span>Earned {rupees(breakdown.gross)} − deductions {rupees(breakdown.pf+breakdown.esi+breakdown.otherDeductions)}</span><strong>{rupees(eligibility.maxAdvance)} available</strong><ProgressBar value={eligibility.maxAdvance>0?Math.min(100,amount/eligibility.maxAdvance*100):100} tone={overLimit?"red":"blue"}/><small>{rupees(Math.min(amount,eligibility.maxAdvance))} of {rupees(eligibility.maxAdvance)} requested</small></div></div>
        : <div className="request-form"><label><span>Leave type</span><select><option>Casual leave</option><option>Sick leave</option></select></label><label><span>From</span><input type="date" defaultValue="2026-09-15"/></label><label><span>To</span><input type="date" defaultValue="2026-09-16"/></label><label><span>Reason</span><textarea defaultValue="Personal work"/></label></div>}
      {!advance&&<div className="inline-alert"><WarningCircle/><span>If this leave leaves your post vacant, district operations is notified immediately so a reliever can be assigned.</span></div>}
      {overLimit&&<div className="inline-alert warning"><WarningCircle/><span>The amount exceeds your {rupees(eligibility.maxAdvance)} eligibility. Reduce it to submit.</span></div>}
      <button className="primary-button wide" disabled={sent||overLimit} onClick={submit}><CheckCircle/>{sent?"Request submitted":"Submit request"}</button>
    </Panel>
  </>;
}

function Payslips({onNavigate}:{onNavigate:(view:AppView)=>void}){
  const notify=useToast();
  const [open,setOpen]=useState<(typeof payslips)[number]|null>(null);
  const askAboutPayslip=()=>{
    window.sessionStorage.setItem("bmg-help-category","salary");
    setOpen(null);
    onNavigate("guard-help");
  };
  return <>
    <PageHeader title="Payslips" description="Your salary and deduction breakdowns."/>
    <Panel><div className="payslip-list">{payslips.map(slip=>
      <button key={slip.month} onClick={()=>setOpen(slip)}>
        <span className="document-icon"><Receipt/></span>
        <span><strong>{slip.month}</strong><small>Paid by bank transfer</small></span>
        <b>{rupees(slip.net)}</b>
        <span>View</span>
      </button>)}</div></Panel>

    {open&&<DetailDrawer title={open.month} subtitle="Suresh Babu · BMG-1840" onClose={()=>setOpen(null)}
      footer={<>
        <button className="secondary-button" onClick={()=>setOpen(null)}>Close</button>
        <button className="secondary-button" onClick={askAboutPayslip}>Ask about this payslip</button>
        <button className="primary-button" onClick={()=>{notify(`${open.month} payslip downloaded`);setOpen(null)}}>Download PDF</button>
      </>}>
      <div className="payslip-sheet">
        <header>
          <div><strong>BMG Security</strong><small>Lulu Mall, Kochi · PF + ESI</small></div>
          <div style={{ textAlign:"right" }}><strong>{open.month}</strong><small>{open.duties} duties</small></div>
        </header>
        <DefRows rows={[
          ...open.earnings.map(line=>({ label:line.label, value:rupees(line.amount), mono:true })),
          { label:"Gross earnings", value:rupees(open.earnings.reduce((sum,line)=>sum+line.amount,0)), mono:true, total:true },
        ]}/>
        <div style={{ height:16 }}/>
        <DefRows rows={[
          ...open.deductions.map(line=>({ label:line.label, value:`− ${rupees(line.amount)}`, mono:true })),
          { label:"Total deductions", value:`− ${rupees(open.deductions.reduce((sum,line)=>sum+line.amount,0))}`, mono:true, total:true },
        ]}/>
        <div className="payslip-net"><span>Net paid</span><strong>{rupees(open.net)}</strong></div>
      </div>
    </DetailDrawer>}
  </>;
}

function GuardSops(){
  const notify=useToast();
  const [open,setOpen]=useState<(typeof sopDocuments)[number]|null>(null);
  const [acknowledged,setAcknowledged]=useState<string[]>([]);
  // A guard sees the instructions for the sites they are rostered to.
  const mine=sopDocuments.filter(doc=>doc.site.startsWith("Lulu Mall")||doc.category==="Apartments"||doc.category==="Hotel");

  return <>
    <PageHeader title="Site instructions" description="Current versions for the sites you are posted to."/>
    <div className="document-grid">{mine.map(doc=>{
      const done=acknowledged.includes(doc.title)||doc.state==="Complete";
      return <article className="document-card" key={doc.title}>
        <div className="document-icon"><FileText/></div>
        <Status tone={done?"success":"warning"}>{done?"Acknowledged":"Acknowledge"}</Status>
        <h3>{doc.title}</h3>
        <p>{doc.site} · version {doc.version}</p>
        <dl><div><dt>Effective</dt><dd>{doc.effective}</dd></div><div><dt>Sections</dt><dd>{doc.sections.length}</dd></div></dl>
        <button className={done?"secondary-button":"primary-button"} onClick={()=>setOpen(doc)}>{done?"Read again":"Read and acknowledge"}</button>
      </article>;
    })}</div>

    {open&&<DetailDrawer title={open.title} subtitle={`${open.site} · version ${open.version}`} onClose={()=>setOpen(null)}
      footer={<>
        <button className="secondary-button" onClick={()=>setOpen(null)}>Close</button>
        <button className="primary-button" disabled={acknowledged.includes(open.title)}
          onClick={()=>{setAcknowledged(current=>[...current,open.title]);notify(`${open.title} acknowledged`);setOpen(null)}}>
          <CheckCircle/>{acknowledged.includes(open.title)?"Acknowledged":"I have read this"}
        </button>
      </>}>
      <div className="sop-meta"><span>Version {open.version}</span><span>Effective {open.effective}</span></div>
      <div className="sop-body">
        {open.sections.map(section=><div key={section.heading}>
          <h4>{section.heading}</h4>
          <ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol>
        </div>)}
      </div>
    </DetailDrawer>}
  </>;
}

function GuardProfile({ activeGuard, onSwitchUser }: { activeGuard:GuardUser; onSwitchUser?:(user:GuardUser)=>void }){
  const notify=useToast();
  const [open,setOpen]=useState(false);
  const [field,setField]=useState("Phone number");
  const [switching,setSwitching]=useState(false);
  const [otherId,setOtherId]=useState("");
  const me=employees.find(item=>item.id===activeGuard.id);
  const pickUser=(user:GuardUser)=>{
    setSwitching(false);
    onSwitchUser?.(user);
  };
  return <>
    <PageHeader title="My profile" description={`${activeGuard.id} · ${me?.role ?? "Security Officer"}`}/>
    <Panel><div className="profile-details">
      <div className="profile-hero"><span className="large-avatar">{activeGuard.initials}</span><div><h2>{activeGuard.name}</h2><p><a className="tel-link" href={`tel:${(me?.phone ?? "98470 12840").replace(/\s/g,"")}`}>{me?.phone ?? "98470 12840"}</a> · {me?.district ?? "Ernakulam"}</p></div><Status tone="success">Active</Status></div>
      <dl>
        <div><dt>Current site</dt><dd>Lulu Mall, Kochi</dd></div>
        <div><dt>Payment method</dt><dd>Bank transfer</dd></div>
        <div><dt>Benefit profile</dt><dd>PF + ESI</dd></div>
        <div><dt>Uniform balance</dt><dd>₹800</dd></div>
        <div><dt>Skills</dt><dd>General security, Day book</dd></div>
        <div><dt>Joined</dt><dd>14 March 2024</dd></div>
      </dl>
      <div className="screen-actions" style={{ justifyContent:"flex-start" }}>
        <button className="secondary-button" onClick={()=>setOpen(true)}><UserCircle/>Request profile update</button>
        <button className="secondary-button" onClick={()=>setSwitching(true)}>Sign out</button>
      </div>
    </div></Panel>

    {switching&&<div className="modal-backdrop" onMouseDown={()=>setSwitching(false)} role="presentation">
      <section className="action-modal" onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Switch user">
        <header><div><p>Shared device</p><h2>Who is signing in?</h2></div><button className="icon-button" onClick={()=>setSwitching(false)} aria-label="Close"><UserCircle/></button></header>
        <div className="user-switch-list" style={{ padding:"16px 20px" }}>
          {deviceGuardUsers.map(user=><button key={user.id} onClick={()=>pickUser(user)}>
            <span className="large-avatar">{user.initials}</span>
            <span><strong>{user.name}</strong><small>{user.id}{user.id===activeGuard.id?" · signed in now":""}</small></span>
            <span className="switch-hint">Tap to continue</span>
          </button>)}
          <div className="doc-add-row" style={{ border:0, padding:"4px 0 0" }}>
            <input value={otherId} onChange={event=>setOtherId(event.target.value)} placeholder="Other employee ID (e.g. BMG-2274)" aria-label="Other employee ID"/>
            <button className="secondary-button compact" onClick={()=>{
              const found=employees.find(item=>item.id.toLowerCase()===otherId.trim().toLowerCase());
              if(!found){notify("Employee ID not found on this device");return;}
              pickUser({ id:found.id, name:found.name, initials:found.initials });
            }}>Sign in</button>
          </div>
          <p className="user-switch-note">Shared-device mode — one tap after the previous user signs out.</p>
        </div>
      </section>
    </div>}

    {open&&<DetailDrawer title="Request profile update" subtitle="HR reviews every change before it is applied" onClose={()=>setOpen(false)}
      footer={<>
        <button className="secondary-button" onClick={()=>setOpen(false)}>Cancel</button>
        <button className="primary-button" onClick={()=>{setOpen(false);notify("Profile update request sent to HR")}}><CheckCircle/>Send request</button>
      </>}>
      <div className="drawer-section">
        <h3>What needs changing</h3>
        <div className="form-stack" style={{ padding:0 }}>
          <label><span>Field</span><select value={field} onChange={event=>setField(event.target.value)}><option>Phone number</option><option>Bank account</option><option>Address</option><option>Emergency contact</option></select></label>
          <label><span>New value</span><input placeholder={field==="Phone number"?"98470 12840":"Enter the corrected detail"}/></label>
          <label><span>Reason</span><input placeholder="Why this needs to change"/></label>
        </div>
      </div>
      <div className="drawer-section">
        <div className="inline-alert"><WarningCircle/><span>Bank account changes require a cancelled cheque or passbook photo to be handed to your supervisor.</span></div>
      </div>
    </DetailDrawer>}
  </>;
}

export function ClientPortal({view,onNavigate}:{view:AppView;onNavigate:(view:AppView)=>void}){
  return <ClientPortalBody view={view} onNavigate={onNavigate}/>;
}

function ClientPortalBody({view,onNavigate}:{view:AppView;onNavigate:(view:AppView)=>void}){
  const [site,setSite]=useState<(typeof sites)[number]|null>(null);
  const [complaint,setComplaint]=useState<(typeof complaints)[number]|null>(null);

  if(view==="client-sites") return <>
    <PageHeader title="My sites" description="Lulu Group · Kerala operations"/>
    <div className="site-grid">{sites.slice(0,2).map(item=><article className="site-card" key={item.name}>
      <header><span className="small-icon blue"><SuitcaseRolling/></span><div><h3>{item.name}</h3><p>{item.district}</p></div><Status tone={item.coverage===100?"success":"warning"}>{item.coverage}% covered</Status></header>
      <dl><div><dt>Posts</dt><dd>{item.staffed}/{item.posts}</dd></div><div><dt>Today</dt><dd>{item.coverage===100?"Fully staffed":"Action open"}</dd></div></dl>
      <button className="secondary-button" onClick={()=>setSite(item)}>View coverage</button>
    </article>)}</div>

    {site&&<DetailDrawer title={site.name} subtitle={`${site.client} · ${site.district}`} onClose={()=>setSite(null)}
      footer={<button className="secondary-button" onClick={()=>setSite(null)}>Close</button>}>
      <div className="drawer-section">
        <h3>Coverage today</h3>
        <DefRows rows={[
          { label:"Contracted posts", value:site.posts, mono:true },
          { label:"Staffed now", value:site.staffed, mono:true },
          { label:"Open posts", value:site.posts-site.staffed, mono:true },
          { label:"Coverage", value:`${site.coverage}%`, mono:true, total:true },
        ]}/>
        <ProgressBar value={site.coverage} tone={site.coverage===100?"green":"orange"}/>
      </div>
      <div className="drawer-section">
        <h3>Shift breakdown</h3>
        <DefRows rows={[
          { label:"Day shift", value:`${Math.round(site.staffed*0.6)} on post`, mono:true },
          { label:"Night shift", value:`${site.staffed-Math.round(site.staffed*0.6)} on post`, mono:true },
          { label:"Field officer visits", value:"2 this week", mono:true },
        ]}/>
      </div>
      {site.coverage<100&&<div className="drawer-section">
        <div className="inline-alert warning"><WarningCircle/><span>{site.posts-site.staffed} post is currently open. District operations has been notified and is assigning a reliever.</span></div>
      </div>}
    </DetailDrawer>}
  </>;

  if(view==="client-complaints") return <>
    <PageHeader title="Complaints" description="Submit and track service issues." actions={<button className="primary-button" onClick={()=>onNavigate("complaint-form")}>New complaint</button>}/>
    <Panel><div className="schedule-list">{complaints.slice(0,3).map(item=>
      <button key={item.id} onClick={()=>setComplaint(item)}>
        <strong>{item.id}</strong>
        <span>{item.issue}<small>{item.owner} · due {item.due}</small></span>
        <Status tone={item.state==="Resolved"?"success":"info"}>{item.state}</Status>
      </button>)}</div></Panel>

    {complaint&&<DetailDrawer title={complaint.id} subtitle={complaint.client} onClose={()=>setComplaint(null)}
      footer={<button className="secondary-button" onClick={()=>setComplaint(null)}>Close</button>}>
      <div className="drawer-section">
        <h3>Your complaint</h3>
        <p style={{ margin:"0 0 14px", fontSize:"var(--fs-sm)", lineHeight:1.55 }}>{complaint.issue}</p>
        <DefRows rows={[
          { label:"Status", value:<Status tone={complaint.state==="Resolved"?"success":"info"}>{complaint.state}</Status> },
          { label:"Assigned to", value:complaint.owner },
          { label:"Resolution due", value:complaint.due, mono:true },
        ]}/>
      </div>
      <div className="drawer-section">
        <h3>Progress</h3>
        <Timeline entries={complaintTrail[complaint.id] ?? []}/>
      </div>
    </DetailDrawer>}
  </>;

  if(view==="client-coverage") return <>
    <PageHeader title="Coverage" description="Live staffing across your contracted posts."/>
    <Panel title="September coverage"><div className="client-coverage"><strong>98.4%</strong><ProgressBar value={98.4}/><p>Two of 126 scheduled post duties required a replacement this month.</p></div></Panel>
  </>;

  return <>
    <PageHeader title="Lulu Group" description="Security operations overview"/>
    <div className="client-home">
      <Panel className="client-score"><ShieldCheck/><strong>100%</strong><span>Posts covered today</span><button className="text-button" onClick={()=>onNavigate("client-coverage")}>View details</button></Panel>
      <Panel title="Current operations"><div className="personal-stats"><div><strong>18</strong><span>Active posts</span></div><div><strong>22</strong><span>Personnel</span></div><div><strong>0</strong><span>Open vacancies</span></div></div></Panel>
      <Panel title="Service requests"><div className="quick-links"><button onClick={()=>onNavigate("client-complaints")}><WarningCircle/><span>Log complaint</span></button><button onClick={()=>onNavigate("client-sites")}><MapPin/><span>View sites</span></button></div></Panel>
    </div>
  </>;
}
