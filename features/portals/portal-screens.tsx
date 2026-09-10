"use client";

import { useState } from "react";
import {
  CalendarBlank, CheckCircle, Crosshair, FileText,
  MapPin, NavigationArrow, Receipt, ShieldCheck, SuitcaseRolling, UserCircle,
  Wallet, WarningCircle,
} from "@phosphor-icons/react";
import type { AppView, GeoState } from "@/types/domain";
import { complaintTrail, complaints, distanceMetres, payslips, rupees, sites, sopDocuments } from "@/lib/mock-data";
import { GeoMap } from "@/components/shared/geo-map";
import {
  DefRows, DetailDrawer, PageHeader, Panel, ProgressBar, Status, Timeline,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";

/** The guard signed in to the demo portal is posted at Lulu Mall, Kochi. */
const guardSite = sites[0];

export function GuardPortal({ view, onNavigate }: { view:AppView; onNavigate:(view:AppView)=>void }) {
  if(view==="guard-punch") return <GuardPunch/>;
  if(view==="guard-schedule") return <GuardSchedule/>;
  if(view==="guard-leave") return <RequestScreen type="leave"/>;
  if(view==="guard-advance") return <RequestScreen type="advance"/>;
  if(view==="guard-payslips") return <Payslips/>;
  if(view==="guard-sops") return <GuardSops/>;
  if(view==="guard-profile") return <GuardProfile/>;
  return <GuardHome onNavigate={onNavigate}/>;
}

function GuardHome({onNavigate}:{onNavigate:(view:AppView)=>void}) {
  return <>
    <PageHeader title="Today’s duty" description={`Thursday, 10 September · ${guardSite.name}`}/>
    <div className="guard-home-grid">
      <Panel className="shift-focus"><div className="shift-time"><span>Day shift</span><strong>08:00–20:00</strong><p>Loading Bay · Gate 2 · 1.00 duty</p></div><div className="shift-site"><MapPin/><span>{guardSite.name}<small>Geofence radius {guardSite.radius} metres</small></span></div><button className="primary-button large" onClick={()=>onNavigate("guard-punch")}><NavigationArrow/>Open attendance</button></Panel>
      <Panel title="This month" description="September 2026"><div className="personal-stats"><div><strong>8.00</strong><span>Duties</span></div><div><strong>₹4,923</strong><span>Gross earned</span></div><div><strong>₹1,969</strong><span>Advance limit</span></div></div></Panel>
      <Panel title="Actions"><div className="quick-links"><button onClick={()=>onNavigate("guard-leave")}><CalendarBlank/><span>Request leave</span></button><button onClick={()=>onNavigate("guard-advance")}><Wallet/><span>Request advance</span></button><button onClick={()=>onNavigate("guard-vigilance")}><Crosshair/><span>Night check</span></button><button onClick={()=>onNavigate("guard-sops")}><FileText/><span>Site SOP</span></button></div></Panel>
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
        const metres=distanceMetres(here,guardSite);
        setPosition({ ...here, accuracy:Math.round(result.coords.accuracy) });
        setDistance(metres);
        // Inside is a boundary test, not an accuracy test. Accuracy is
        // reported separately as a confidence signal.
        setGeo(metres<=guardSite.radius?"inside":"outside");
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
        <GeoMap center={guardSite} radius={guardSite.radius} guard={position} guardInside={geo==="inside"}/>
        <div className="map-caption">
          <span>Site <b>{guardSite.lat.toFixed(5)}, {guardSite.lng.toFixed(5)}</b></span>
          <span>Boundary <b>{guardSite.radius} m</b></span>
          {distance!==null&&<span>Your distance <b>{distance} m</b></span>}
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
        {geo==="outside"&&distance!==null&&<div className="inline-alert warning"><WarningCircle/><span>You are {distance - guardSite.radius} m beyond the boundary. Move closer to the post, or ask your supervisor to review a manual punch.</span></div>}
        {position&&position.accuracy>50&&geo==="inside"&&<div className="inline-alert warning"><WarningCircle/><span>GPS accuracy is ±{position.accuracy} m, above the 50 m threshold. This punch will be flagged for review.</span></div>}
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
  const advance=type==="advance";
  function submit(){ setSent(true); notify(advance?"Advance request submitted to HR":"Leave request submitted to your supervisor"); }
  return <>
    <PageHeader title={advance?"Request salary advance":"Request leave"} description={advance?"Maximum available: ₹1,969 (40% of gross earned wages).":"Your supervisor and HR will receive this request."}/>
    <Panel className="request-card">
      {advance
        ? <div className="request-form"><label><span>Amount</span><input type="number" defaultValue="1500"/></label><label><span>Reason</span><select><option>Personal expense</option><option>Medical</option><option>Emergency</option></select></label><div className="eligibility-box"><span>Gross earned</span><strong>₹4,923</strong><ProgressBar value={76}/><small>₹1,500 of ₹1,969 available</small></div></div>
        : <div className="request-form"><label><span>Leave type</span><select><option>Casual leave</option><option>Sick leave</option></select></label><label><span>From</span><input type="date" defaultValue="2026-09-15"/></label><label><span>To</span><input type="date" defaultValue="2026-09-16"/></label><label><span>Reason</span><textarea defaultValue="Personal work"/></label></div>}
      {!advance&&<div className="inline-alert"><WarningCircle/><span>If this leave leaves your post vacant, district operations is notified immediately so a reliever can be assigned.</span></div>}
      <button className="primary-button wide" disabled={sent} onClick={submit}><CheckCircle/>{sent?"Request submitted":"Submit request"}</button>
    </Panel>
  </>;
}

function Payslips(){
  const notify=useToast();
  const [open,setOpen]=useState<(typeof payslips)[number]|null>(null);
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

function GuardProfile(){
  const notify=useToast();
  const [open,setOpen]=useState(false);
  const [field,setField]=useState("Phone number");
  return <>
    <PageHeader title="My profile" description="BMG-1840 · Security Officer"/>
    <Panel><div className="profile-details">
      <div className="profile-hero"><span className="large-avatar">SB</span><div><h2>Suresh Babu</h2><p>98470 12840 · Ernakulam</p></div><Status tone="success">Active</Status></div>
      <dl>
        <div><dt>Current site</dt><dd>Lulu Mall, Kochi</dd></div>
        <div><dt>Payment method</dt><dd>Bank transfer</dd></div>
        <div><dt>Benefit profile</dt><dd>PF + ESI</dd></div>
        <div><dt>Uniform balance</dt><dd>₹800</dd></div>
        <div><dt>Skills</dt><dd>General security, Day book</dd></div>
        <div><dt>Joined</dt><dd>14 March 2024</dd></div>
      </dl>
      <button className="secondary-button" onClick={()=>setOpen(true)}><UserCircle/>Request profile update</button>
    </div></Panel>

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
