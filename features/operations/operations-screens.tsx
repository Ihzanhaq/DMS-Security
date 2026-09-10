"use client";

import { useMemo, useState } from "react";
import {
  Buildings, CalendarCheck, Check, Clock, DownloadSimple, Funnel,
  MapPin, NavigationArrow, Plus, Timer, Trash, UserFocus, UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { attendanceRows, employees, inspections, rotationSplit, rupees, sites } from "@/lib/mock-data";
import {
  DefRows, DetailDrawer, PageHeader, Panel, PersonCell, ProgressBar,
  SkillTags, StatStrip, Status, Timeline, Toolbar,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";

export function SitesScreen({ onCreate, onConfigure }: { onCreate:()=>void; onConfigure:()=>void }) {
  const [district,setDistrict]=useState("All districts");
  const districts=useMemo(()=>["All districts",...Array.from(new Set(sites.map(site=>site.district)))],[]);
  const visible=sites.filter(site=>district==="All districts"||site.district===district);
  return <>
    <PageHeader title="Sites & posts" description="Client locations, staffing, statutory rules and attendance boundaries." actions={<button className="primary-button" onClick={onCreate}><Plus/>Add site</button>}/>
    <StatStrip items={[
      {icon:Buildings,value:"214",label:"Active sites",note:"483 configured posts"},
      {icon:UsersThree,value:"435",label:"Required posts",note:"408 staffed",tone:"green"},
      {icon:WarningCircle,value:"27",label:"Vacant posts",note:"Across 16 sites",tone:"orange"},
      {icon:MapPin,value:"206",label:"Geofences ready",note:"8 need coordinates",tone:"violet"},
    ]}/>
    <Toolbar><select value={district} onChange={event=>setDistrict(event.target.value)} aria-label="District">{districts.map(item=><option key={item}>{item}</option>)}</select><button className="secondary-button" onClick={()=>setDistrict("All districts")}><Funnel/>Reset</button><span className="toolbar-count">{visible.length} sites shown</span></Toolbar>
    <div className="site-grid">{visible.map(site=><article className="site-card" key={site.name}>
      <header><span className="small-icon blue"><Buildings size={19}/></span><div><h3>{site.name}</h3><p>{site.client} · {site.district}</p></div><Status tone={site.coverage===100?"success":"warning"}>{site.coverage}% staffed</Status></header>
      <dl><div><dt>Posts</dt><dd>{site.staffed} / {site.posts}</dd></div><div><dt>Benefit default</dt><dd>{site.scheme}</dd></div><div><dt>Geofence</dt><dd>{site.radius} metres</dd></div></dl>
      <ProgressBar value={site.coverage}/>
      <footer><button className="text-button" onClick={onConfigure}>Open site</button><button className="secondary-button compact" onClick={onConfigure}><MapPin/>Edit boundary</button></footer>
    </article>)}</div>
  </>;
}

type Post = { site:string; post:string; required:number; assigned:string[]; state:string };

export function DeploymentScreen({ onAssign }: { onAssign:()=>void }) {
  const notify=useToast();
  const [day,setDay]=useState(10);
  const [managing,setManaging]=useState<Post|null>(null);
  const [rotationOpen,setRotationOpen]=useState(false);
  const days=[8,9,10,11,12,13,14];
  const [posts,setPosts]=useState<Post[]>([
    {site:"TCS Technopark",post:"Block A · Day",required:3,assigned:["Rajeev K","Suresh B","Fathima N"],state:"Covered"},
    {site:"Aster Medcity",post:"Emergency · Day",required:2,assigned:["Shamnad C"],state:"Vacant"},
    {site:"Lake Palace Resort",post:"Lobby · Night",required:2,assigned:["Anzar M","Reliever needed"],state:"Vacant"},
    {site:"Lulu Mall, Kochi",post:"Loading bay · Day",required:2,assigned:["Hareendrakumar K","Niyas P"],state:"Covered"},
  ]);

  function assign(post:Post, name:string) {
    setPosts(current=>current.map(item=>{
      if(item.site+item.post!==post.site+post.post) return item;
      const filled=item.assigned.filter(entry=>!entry.includes("needed")).concat(name);
      return { ...item, assigned:filled, state:filled.length>=item.required?"Covered":"Vacant" };
    }));
    setManaging(null);
    notify(`${name} assigned to ${post.post} at ${post.site}`);
  }

  return <>
    <PageHeader title="Deployment" description="Daily post coverage, rotations and reliever allocation." actions={<button className="primary-button" onClick={onAssign}><Plus/>Assign employee</button>}/>
    <div className="date-strip" data-enter>{days.map(value=><button key={value} className={day===value?"selected":""} onClick={()=>setDay(value)}><span>{value===10?"Thu":"Day"}</span><strong>{value}</strong></button>)}</div>
    <div className="split-layout">
      <Panel title={"Post coverage · "+day+" September"} description="Vacant posts are filled from the reliever pool." className="roster-panel">
        <div className="roster-list">{posts.map(post=><div className="roster-row" key={post.site+post.post}>
          <div><strong>{post.site}</strong><span>{post.post} · {post.required} required</span></div>
          <div className="assigned-people">{post.assigned.map(name=><span key={name} className={name.includes("needed")?"missing":""}>{!name.includes("needed")&&<i>{name.split(" ").map(x=>x[0]).join("").slice(0,2)}</i>}{name}</span>)}</div>
          <Status tone={post.state==="Covered"?"success":"danger"}>{post.state}</Status>
          <button className="secondary-button compact" onClick={()=>setManaging(post)}>Manage</button>
        </div>)}</div>
      </Panel>
      <Panel title="24-hour pair" description="One configured duty per day, split across the pair">
        <div className="rotation-pair"><div><span className="large-avatar">SB</span><strong>Suresh Babu</strong><small>16 duties</small></div><i/><div><span className="large-avatar alt">RK</span><strong>Rajeev Kumar</strong><small>15 duties</small></div></div>
        <div className="rotation-note"><CalendarCheck/><span>A 31-day month splits 16 and 15. The extra duty alternates next month so the pair stays balanced.</span></div>
        <button className="full-button" onClick={()=>setRotationOpen(true)}>View rotation</button>
      </Panel>
    </div>

    {managing&&<AssignmentDrawer post={managing} onAssign={assign} onClose={()=>setManaging(null)}/>}
    {rotationOpen&&<RotationDrawer onClose={()=>setRotationOpen(false)}/>}
  </>;
}

function AssignmentDrawer({ post, onAssign, onClose }: { post:Post; onAssign:(post:Post,name:string)=>void; onClose:()=>void }) {
  const relievers=employees.filter(employee=>employee.status==="Reliever");
  const [picked,setPicked]=useState<string|null>(null);
  const filled=post.assigned.filter(entry=>!entry.includes("needed"));
  const shortfall=Math.max(0,post.required-filled.length);
  const selected=relievers.find(employee=>employee.id===picked);

  return <DetailDrawer
    title={post.post}
    subtitle={`${post.site} · ${post.required} required · ${shortfall} open`}
    onClose={onClose}
    footer={<>
      <button className="secondary-button" onClick={onClose}>Cancel</button>
      <button className="primary-button" disabled={!selected} onClick={()=>selected&&onAssign(post,selected.name)}><Check/>Assign to post</button>
    </>}>
    <div className="drawer-section">
      <h3>Post status</h3>
      <DefRows rows={[
        { label:"Required headcount", value:post.required, mono:true },
        { label:"Currently assigned", value:filled.length, mono:true },
        { label:"Open positions", value:shortfall, mono:true },
        { label:"Coverage", value:<Status tone={post.state==="Covered"?"success":"danger"}>{post.state}</Status> },
      ]}/>
    </div>
    <div className="drawer-section">
      <h3>On this post</h3>
      <div className="assigned-people">{filled.length?filled.map(name=><span key={name}><i>{name.split(" ").map(part=>part[0]).join("").slice(0,2)}</i>{name}</span>):<span className="missing">Nobody assigned</span>}</div>
    </div>
    <div className="drawer-section" style={{ padding:0 }}>
      <div style={{ padding:"16px 20px 0" }}><h3>Available relievers</h3></div>
      <div className="assign-list">
        {relievers.map(employee=><button key={employee.id} className={picked===employee.id?"selected":undefined} onClick={()=>setPicked(employee.id)}>
          <PersonCell name={employee.name} id={employee.id}/>
          <SkillTags skills={employee.skills}/>
          <span className="rate">{rupees(employee.dailyRate ?? 0)}<small> /duty</small></span>
        </button>)}
      </div>
    </div>
    {selected&&<div className="drawer-section">
      <h3>Cost of this assignment</h3>
      <DefRows rows={[
        { label:"Daily rate", value:rupees(selected.dailyRate ?? 0), mono:true },
        { label:"Rate tier", value:(selected.dailyRate ?? 0)>=750?"Specialized":(selected.dailyRate ?? 0)>=650?"Skilled":(selected.dailyRate ?? 0)>=516?"Statutory":"Base" },
        { label:"Statutory cover", value:selected.esi?"ESI applies":"Salary only" },
      ]}/>
    </div>}
  </DetailDrawer>;
}

const monthOptions=[
  { label:"September 2026 · 30 days", year:2026, month:8 },
  { label:"August 2026 · 31 days", year:2026, month:7 },
  { label:"October 2026 · 31 days", year:2026, month:9 },
];

function RotationDrawer({ onClose }: { onClose:()=>void }) {
  const [index,setIndex]=useState(0);
  const choice=monthOptions[index];
  // The extra duty in a 31-day month alternates, so the lead flips each month.
  const split=rotationSplit(choice.year,choice.month,index%2===0);

  return <DetailDrawer title="24-hour pair rotation" subtitle="Suresh Babu and Rajeev Kumar · one duty per calendar day" onClose={onClose}
    footer={<button className="secondary-button" onClick={onClose}>Close</button>}>
    <div className="drawer-section">
      <h3>Month</h3>
      <select value={index} onChange={event=>setIndex(Number(event.target.value))} aria-label="Rotation month" style={{ width:"100%", height:32 }}>
        {monthOptions.map((item,position)=><option key={item.label} value={position}>{item.label}</option>)}
      </select>
    </div>
    <div className="rotation-legend">
      <span><i className="a"/>Suresh Babu</span>
      <span><i className="b"/>Rajeev Kumar</span>
    </div>
    <div className="rotation-grid">
      {split.pattern.map((owner,position)=><span className={owner} key={position}>{position+1}<b>{owner==="a"?"SB":"RK"}</b></span>)}
    </div>
    <div className="rotation-tally">
      <div><span>Suresh Babu</span><strong>{split.lead}</strong></div>
      <div><span>Rajeev Kumar</span><strong>{split.partner}</strong></div>
    </div>
    <div className="drawer-section">
      <div className="rotation-note"><CalendarCheck/><span>
        {split.days===30
          ? "A 30-day month divides evenly at 15 duties each."
          : `A ${split.days}-day month divides ${split.lead} and ${split.partner}. The extra duty passes to the other guard next month.`}
      </span></div>
    </div>
  </DetailDrawer>;
}

export function AttendanceScreen({ onCorrect }: { onCorrect:()=>void }) {
  const notify=useToast();
  const [tab,setTab]=useState("Live board");
  const [duty,setDuty]=useState("all");
  const tabs=["Live board","Exceptions","Corrections"];
  const rows=attendanceRows.filter(row=>
    (duty==="all"||row.duty===duty) &&
    (tab!=="Exceptions"||row.state!=="On site")
  );
  return <>
    <PageHeader title="Attendance" description="Real-time punches, duty quantities and site exceptions." actions={<><button className="secondary-button" onClick={()=>notify("Attendance register exported as CSV")}><DownloadSimple/>Export</button><button className="primary-button" onClick={onCorrect}><Plus/>Manual entry</button></>}/>
    <StatStrip items={[
      {icon:Check,value:"421",label:"Present",note:"93.8% on time",tone:"green"},
      {icon:Clock,value:"7",label:"Late",note:"Past site grace",tone:"orange"},
      {icon:WarningCircle,value:"21",label:"Absent",note:"7 created vacancies",tone:"red"},
      {icon:Timer,value:"6",label:"Night checks due",note:"Next 30 minutes",tone:"violet"},
    ]}/>
    <div className="tabs-row">{tabs.map(item=><button className={tab===item?"active":""} key={item} onClick={()=>setTab(item)}>{item}{item==="Exceptions"&&<b>7</b>}</button>)}</div>
    <Toolbar><div className="filter-search"><input placeholder="Search employee or site" aria-label="Search attendance"/></div><select aria-label="District"><option>All districts</option><option>Ernakulam</option><option>Kollam</option></select><select value={duty} onChange={event=>setDuty(event.target.value)} aria-label="Duty quantity"><option value="all">All duty units</option><option>0.00</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select><span className="toolbar-count">Live as of 09:24</span></Toolbar>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Site</th><th>Shift</th><th>Punch-in</th><th>GPS accuracy</th><th>Duty</th><th>Status</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td><PersonCell name={row.employee} id={row.id}/></td><td>{row.site}</td><td>{row.shift}</td><td>{row.punch}</td><td>{row.accuracy}</td><td><strong>{row.duty}</strong></td><td><Status tone={row.state==="On site"?"success":row.state==="Late"?"warning":"danger"}>{row.state}</Status></td></tr>)}
    </tbody></table>{rows.length===0&&<div className="empty-state"><Check size={26}/><strong>No exceptions</strong><span>Every punch on this filter is clean.</span></div>}</div></Panel>
  </>;
}

const defaultChecklist=[
  "Punch inside the site boundary",
  "Complete the site checklist",
  "Record exceptions and follow-up owner",
  "Confirm guard register and SOP compliance",
];

export function InspectionsScreen({ onLog }: { onLog:()=>void }) {
  const notify=useToast();
  const [visit,setVisit]=useState<(typeof inspections)[number]|null>(null);
  const [checklist,setChecklist]=useState(defaultChecklist);
  const [editing,setEditing]=useState(false);

  return <>
    <PageHeader title="FSO inspections" description="Planned visits, verification punches and follow-up actions." actions={<button className="primary-button" onClick={onLog}><NavigationArrow/>Log visit</button>}/>
    <StatStrip items={[
      {icon:UserFocus,value:"18",label:"Visits today",note:"14 completed"},
      {icon:Check,value:"14",label:"Verified",note:"GPS and checklist",tone:"green"},
      {icon:Clock,value:"3",label:"Upcoming",note:"Next visit at 13:00",tone:"violet"},
      {icon:WarningCircle,value:"1",label:"Overdue",note:"Needs reassignment",tone:"orange"},
    ]}/>
    <div className="split-layout">
      <Panel title="Today’s route" description="Visits sorted by assigned time">
        <div className="inspection-list">{inspections.map((item,index)=><div className="inspection-row" key={item.site}>
          <span className="route-index">{index+1}</span><div><strong>{item.site}</strong><small>{item.officer} · {item.window}</small></div><span>{item.distance}</span><Status tone={item.status==="Completed"?"success":item.status==="Due now"?"warning":"info"}>{item.status}</Status><button className="secondary-button compact" onClick={()=>setVisit(item)}>Open</button>
        </div>)}</div>
      </Panel>
      <Panel title="Verification standard" description="Required for every inspection"
        action={editing?<button className="text-button" onClick={()=>{setEditing(false);notify("Inspection checklist saved")}}>Save</button>:<button className="text-button" onClick={()=>setEditing(true)}>Edit</button>}>
        {editing?<>
          <div className="check-editor">{checklist.map((entry,index)=><div key={index}>
            <input value={entry} onChange={event=>setChecklist(current=>current.map((item,row)=>row===index?event.target.value:item))} aria-label={`Checklist item ${index+1}`}/>
            <button className="icon-button" onClick={()=>setChecklist(current=>current.filter((_,row)=>row!==index))} aria-label={`Remove item ${index+1}`}><Trash/></button>
          </div>)}</div>
          <button className="full-button" onClick={()=>setChecklist(current=>[...current,"New verification step"])}><Plus/>Add step</button>
        </>:<>
          <div className="checklist-card">{checklist.map(entry=><span key={entry}><Check weight="bold"/>{entry}</span>)}</div>
        </>}
      </Panel>
    </div>

    {visit&&<DetailDrawer title={visit.site} subtitle={`${visit.officer} · ${visit.window}`} onClose={()=>setVisit(null)}
      footer={<>
        <button className="secondary-button" onClick={()=>setVisit(null)}>Close</button>
        <button className="primary-button" onClick={()=>{setVisit(null);notify(`Visit report for ${visit.site} shared with district operations`)}}><Check/>Share report</button>
      </>}>
      <div className="drawer-section">
        <h3>Visit record</h3>
        <DefRows rows={[
          { label:"Status", value:<Status tone={visit.status==="Completed"?"success":visit.status==="Due now"?"warning":"info"}>{visit.status}</Status> },
          { label:"Assigned window", value:visit.window, mono:true },
          { label:"Travel distance", value:visit.distance, mono:true },
          { label:"Officer", value:visit.officer },
        ]}/>
      </div>
      <div className="drawer-section">
        <h3>Verification punch</h3>
        {visit.status==="Completed"
          ? <DefRows rows={[
              { label:"Punched at", value:"09:42:16", mono:true },
              { label:"Coordinates", value:"10.02714, 76.30792", mono:true },
              { label:"Distance from post", value:"18 m", mono:true },
              { label:"Boundary check", value:<Status tone="success">Inside</Status> },
            ]}/>
          : <div className="inline-alert warning"><WarningCircle/><span>No verification punch recorded yet. The officer must punch inside the site boundary for this visit to count.</span></div>}
      </div>
      <div className="drawer-section">
        <h3>Checklist outcome</h3>
        <Timeline entries={visit.status==="Completed"?[
          { title:"Boundary punch verified", time:"09:42", state:"done" },
          { title:"Site checklist completed", time:"09:51", note:"All four verification steps confirmed.", state:"done" },
          { title:"Guard register checked", time:"09:58", note:"Day book entries current, no gaps found.", state:"done" },
          { title:"Report filed", time:"10:04", state:"done" },
        ]:[
          { title:"Visit scheduled", time:visit.window, state:"done" },
          { title:"Awaiting boundary punch", time:"Pending", state:"active" },
        ]}/>
      </div>
    </DetailDrawer>}
  </>;
}
