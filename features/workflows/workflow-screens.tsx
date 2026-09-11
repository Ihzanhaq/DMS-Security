"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, Buildings, CalendarCheck, Check, CheckCircle, ClockCountdown,
  Crosshair, FileText, FloppyDisk, Package, Plus, ShieldCheck,
  Trash, UserFocus, UsersThree, Wallet, WarningCircle,
} from "@phosphor-icons/react";
import { DefRows, DetailDrawer, PageHeader, Panel, PersonCell, StatStrip, Status, Timeline } from "@/components/shared/screen-elements";
import { GeoMap } from "@/components/shared/geo-map";
import { useToast } from "@/components/shared/toast-context";
import { employees as employeeRecords, rupees, sites as siteRecords, skillOptions, statutorySettings } from "@/lib/mock-data";
import { usePayroll } from "@/components/shared/payroll-context";
import type { BenefitOverride, BenefitScheme, PayBasis, Role } from "@/types/domain";

const districts = ["Thiruvananthapuram", "Kollam", "Alappuzha", "Kottayam", "Ernakulam"];
const employees = ["Suresh Babu", "Fathima N", "Rajeev Kumar", "Anzar M", "Shamnad C M"];
const sites = ["Lulu Mall, Kochi", "Aster Medcity", "TCS Technopark", "Lake Palace Resort"];
const kitItems = ["Shirt", "Trousers", "Shoes", "Belt", "Cap", "Tie", "Socks", "Raincoat", "Whistle", "Lanyard", "ID holder", "Notebook"];

function BackButton({ onBack }: { onBack: () => void }) {
  return <button className="secondary-button" onClick={onBack}><ArrowLeft />Back</button>;
}

function SavedNotice({ children = "Changes saved in the frontend prototype." }: { children?: string }) {
  return <div className="saved-notice" role="status"><CheckCircle weight="fill" /><span>{children}</span></div>;
}

export function EmployeeFormScreen({ onBack, onImport, employeeId }: { onBack: () => void; onImport: () => void; employeeId?:string|null }) {
  const { employeeRules, updateEmployeeRule } = usePayroll();
  const employee = employeeRecords.find(item => item.id === employeeId) ?? employeeRecords[0];
  const targetEmployeeId = employeeId ?? "BMG-NEW";
  const currentRule = employeeRules.filter(rule => rule.employeeId === targetEmployeeId).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const [saved, setSaved] = useState(false);
  const [payBasis, setPayBasis] = useState<PayBasis>(currentRule?.basis ?? "monthly");
  const [amount, setAmount] = useState(currentRule?.monthlySalary ?? currentRule?.dailyRate ?? 16000);
  const [payableDays, setPayableDays] = useState(currentRule?.payableDays ?? 26);
  const [pfOverride, setPfOverride] = useState<BenefitOverride>(currentRule?.pfOverride ?? "inherit");
  const [esiOverride, setEsiOverride] = useState<BenefitOverride>(currentRule?.esiOverride ?? "inherit");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-09-01");
  const [skills, setSkills] = useState<string[]>(["Day book", "General security"]);
  const availableSkills: string[] = [...skillOptions];
  const toggleSkill = (skill: string) => setSkills(current => current.includes(skill) ? current.filter(item => item !== skill) : [...current, skill]);

  return <>
    <PageHeader title="Employee profile" description="Identity, capability, employment, statutory and recovery settings."
      actions={<><BackButton onBack={onBack}/><button className="secondary-button" onClick={onImport}>Import employees</button><button className="primary-button" onClick={() => { updateEmployeeRule({ employeeId:targetEmployeeId, effectiveFrom, basis:payBasis, monthlySalary:payBasis==="monthly"?amount:undefined, dailyRate:payBasis==="daily"?amount:undefined, payableDays, pfOverride, esiOverride }); setSaved(true); }}><FloppyDisk />Save employee</button></>} />
    {saved && <SavedNotice>Employee profile saved with an effective date.</SavedNotice>}
    <div className="workflow-grid">
      <Panel title="Identity and employment" description="Core details used across deployment and payroll.">
        <div className="form-grid">
          <label><span>Employee ID</span><input defaultValue={employeeId ? employee.id : "BMG-NEW"} /></label>
          <label><span>Full name</span><input defaultValue={employeeId ? employee.name : ""} placeholder="Employee name" /></label>
          <label><span>Mobile number</span><input defaultValue={employeeId ? employee.phone : ""} /></label>
          <label><span>District</span><select defaultValue={employee.district}>{districts.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Joining date</span><input type="date" defaultValue="2026-09-10" /></label>
          <label><span>Employment status</span><select><option>Active</option><option>Reliever</option><option>On leave</option><option>Exit initiated</option></select></label>
        </div>
      </Panel>
      <Panel title="Skills and eligibility" description="Operations can filter employees by these verified capabilities.">
        <div className="choice-grid">{availableSkills.map(skill => <button key={skill} className={skills.includes(skill) ? "choice-card selected" : "choice-card"} onClick={() => toggleSkill(skill)}><span>{skills.includes(skill) ? <CheckCircle weight="fill" /> : <Check />}</span><strong>{skill}</strong><small>{skill === "Driving" ? "Licence can be recorded in documents" : "Eligible for matching posts"}</small></button>)}</div>
      </Panel>
      <Panel title="Pay and statutory profile" description="Employee settings override organization, client and site defaults.">
        <div className="form-grid">
          <label><span>Pay basis</span><select value={payBasis} onChange={event => { const basis=event.target.value as PayBasis; setPayBasis(basis); setAmount(basis==="monthly"?16000:650); }}><option value="monthly">Monthly salary</option><option value="daily">Fixed daily rate</option><option value="site">Site-wise rate</option></select></label>
          {payBasis!=="site" ? <label><span>{payBasis === "monthly" ? "Monthly salary" : "Rate per duty"}</span><div className="input-prefix"><b>₹</b><input type="number" min="1" value={amount} onChange={event=>setAmount(Number(event.target.value))} /></div></label> : <div className="site-rate-callout"><Buildings/><span><strong>Rate resolved per duty</strong><small>Post override, then site default. Missing rates block payroll.</small></span></div>}
          <label><span>Salary denominator</span><select value={payableDays} onChange={event=>setPayableDays(Number(event.target.value))} disabled={payBasis!=="monthly"}><option value="26">26 scheduled payable days</option><option value="30">30 organization days</option><option value="31">Calendar days</option></select></label>
          <label><span>Payment method</span><select><option>Bank transfer</option><option>Cash</option></select></label>
          <label><span>Effective from</span><input type="date" value={effectiveFrom} onChange={event=>setEffectiveFrom(event.target.value)}/></label>
        </div>
        <div className="form-grid statutory-selects">
          <label><span>Provident Fund</span><select value={pfOverride} onChange={event=>setPfOverride(event.target.value as BenefitOverride)}><option value="inherit">Inherit from site</option><option value="enabled">Force enabled</option><option value="disabled">Force disabled</option></select><small>Employee exception takes precedence over the site.</small></label>
          <label><span>ESI</span><select value={esiOverride} onChange={event=>setEsiOverride(event.target.value as BenefitOverride)}><option value="inherit">Inherit from site</option><option value="enabled">Force enabled</option><option value="disabled">Force disabled</option></select><small>Employee exception takes precedence over the site.</small></label>
        </div>
      </Panel>
      <Panel title="Opening balances and issue status" description="Balances may be entered manually or imported.">
        <div className="form-grid">
          <label><span>Uniform recovery opening balance</span><div className="input-prefix"><b>₹</b><input type="number" defaultValue="800" /></div></label>
          <label><span>Advance opening balance</span><div className="input-prefix"><b>₹</b><input type="number" defaultValue="0" /></div></label>
          <label><span>Penalty carried forward</span><div className="input-prefix"><b>₹</b><input type="number" defaultValue="0" /></div></label>
          <label><span>Effective from</span><input type="date" defaultValue="2026-09-01" /></label>
        </div>
        <button className="secondary-button section-button" onClick={onImport}>Open opening-balance import</button>
      </Panel>
    </div>
  </>;
}

export function SiteConfigurationScreen({ onBack, role, siteName, initialTab }: { onBack: () => void; role:Role; siteName?:string|null; initialTab?:"profile"|"salary" }) {
  const selectedSite = siteName ?? "Lulu Mall, Kochi";
  const siteRecord = siteRecords.find(item => item.name === selectedSite) ?? siteRecords[0];
  const { siteRules, postRules, updateSiteRule, updatePostRule } = usePayroll();
  const existingSiteRule = siteRules.filter(rule=>rule.site===selectedSite).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const canManageSalary = role === "Owner" || role === "HR & Payroll";
  const [tab, setTab] = useState(initialTab === "salary" && canManageSalary ? "Salary and benefits" : "Site profile");
  const [saved, setSaved] = useState(false);
  const [latitude, setLatitude] = useState(siteRecord.lat);
  const [longitude, setLongitude] = useState(siteRecord.lng);
  const [radius, setRadius] = useState(siteRecord.radius);
  const [siteRate, setSiteRate] = useState(existingSiteRule?.defaultDutyRate ?? 0);
  const [scheme, setScheme] = useState<BenefitScheme>(existingSiteRule?.scheme ?? "salary-only");
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState("2026-09-01");
  const latestPostRate=(post:string):number|""=>postRules.filter(rule=>rule.site===selectedSite&&rule.post===post).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.dutyRate ?? "";
  const secondPost=selectedSite==="Aster Medcity"?"Emergency":"Loading bay";
  const [posts, setPosts] = useState<Array<{name:string;shift:string;required:number;duty:string;rate:number|""}>>([
    { name: "Main gate", shift: "Day · 08:00–20:00", required: 2, duty: "1.00", rate:latestPostRate("Main gate") },
    { name: secondPost, shift: "Night · 20:00–08:00", required: 2, duty: "1.00", rate:latestPostRate(secondPost) },
    { name: "Control room", shift: "24-hour rotation", required: 2, duty: "1.00", rate:latestPostRate("Control room") },
  ]);
  const locate = () => navigator.geolocation?.getCurrentPosition(result => {
    setLatitude(Number(result.coords.latitude.toFixed(6)));
    setLongitude(Number(result.coords.longitude.toFixed(6)));
  });

  return <>
    <PageHeader title="Site and post configuration" description="Location, staffing, benefit inheritance and attendance controls."
      actions={<><BackButton onBack={onBack}/><button className="primary-button" onClick={() => { if(canManageSalary){ updateSiteRule({ site:selectedSite, effectiveFrom:salaryEffectiveFrom, defaultDutyRate:siteRate||undefined, scheme }); posts.forEach(post=>updatePostRule(post.rate ? { site:selectedSite, post:post.name, effectiveFrom:salaryEffectiveFrom, dutyRate:Number(post.rate) } : null, selectedSite, post.name, salaryEffectiveFrom)); } setSaved(true); }}><FloppyDisk />Save configuration</button></>} />
    {saved && <SavedNotice>Site configuration saved with its override sources.</SavedNotice>}
    <div className="tabs-row workflow-tabs">{["Site profile", "Posts and shifts", "Geofence and attendance", ...(canManageSalary?["Salary and benefits"]:[])].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Site profile" && <Panel title="Client location" description="The client contract remains separate from operational posts."><div className="form-grid padded-form">
      <label><span>Client</span><select defaultValue={siteRecord.client}><option>{siteRecord.client}</option><option>Lulu Group</option><option>TCS</option><option>Aster DM Healthcare</option></select></label>
      <label><span>Site name</span><input defaultValue={selectedSite} /></label>
      <label><span>District</span><select defaultValue={siteRecord.district}>{districts.map(item => <option key={item}>{item}</option>)}</select></label>
      <label><span>Site code</span><input defaultValue="SITE-EKM-014" /></label>
      <label><span>Contract start</span><input type="date" defaultValue="2026-01-01" /></label>
      <label><span>Operations contact</span><input defaultValue="Site Manager · 98470 33445" /></label>
    </div></Panel>}
    {tab === "Posts and shifts" && <Panel title="Configured posts" description={canManageSalary?"Duty quantity, staffing and optional salary override are editable per post.":"Duty quantity, required headcount and rotation are editable per post."} action={<button className="secondary-button compact" onClick={() => setPosts(current => [...current, { name: "New post", shift: "Day · 08:00–20:00", required: 1, duty: "1.00", rate:"" }])}><Plus />Add post</button>}>
      <div className="editable-list">{posts.map((post, index) => <div className={canManageSalary?"editable-row salary-fields":"editable-row"} key={index}>
        <input value={post.name} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} aria-label={`Post ${index + 1} name`} />
        <select value={post.shift} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, shift: event.target.value } : item))}><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour rotation</option><option>Flexible</option></select>
        <input type="number" value={post.required} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, required: Number(event.target.value) } : item))} aria-label="Required headcount" />
        <select value={post.duty} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, duty: event.target.value } : item))}><option>0.25</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select>
        {canManageSalary&&<input type="number" min="0" value={post.rate} placeholder="Site rate" onChange={event=>setPosts(current=>current.map((item,row)=>row===index?{...item,rate:event.target.value===""?"":Number(event.target.value)}:item))} aria-label={`${post.name} duty rate override`}/>}
        <button className="icon-button" onClick={() => setPosts(current => current.filter((_, row) => row !== index))} aria-label={`Remove ${post.name}`}><Trash /></button>
      </div>)}</div>
      <div className={canManageSalary?"field-key salary-fields":"field-key"}><span>Post name</span><span>Shift pattern</span><span>Required</span><span>Duty unit</span>{canManageSalary&&<span>Rate override</span>}<span/></div>
    </Panel>}
    {tab === "Geofence and attendance" && <div className="split-layout">
      <Panel className="geofence-editor">
        <GeoMap center={{ lat: latitude, lng: longitude }} radius={radius} draggable
          onMove={next => { setLatitude(next.lat); setLongitude(next.lng); }} className="compact"/>
        <div className="map-caption">
          <span>Centre <b>{latitude.toFixed(5)}, {longitude.toFixed(5)}</b></span>
          <span>Radius <b>{radius} m</b></span>
          <span>Drag the pin or click the map to move the boundary</span>
        </div>
      </Panel>
      <Panel title="Boundary and device rules" description="Coordinates can be pasted, captured from the device, or set on the map.">
        <div className="form-stack">
          <label><span>Latitude</span><input type="number" step="0.000001" value={latitude} onChange={event => setLatitude(Number(event.target.value))}/></label>
          <label><span>Longitude</span><input type="number" step="0.000001" value={longitude} onChange={event => setLongitude(Number(event.target.value))}/></label>
          <label><span>Geofence radius</span><div className="input-suffix"><input type="number" value={radius} onChange={event => setRadius(Number(event.target.value))}/><b>metres</b></div></label>
          <label><span>Offline punch grace</span><div className="input-suffix"><input type="number" defaultValue="15"/><b>minutes</b></div></label>
          <label><span>GPS accuracy threshold</span><div className="input-suffix"><input type="number" defaultValue="50"/><b>metres</b></div></label>
          <button className="secondary-button" onClick={locate}><Crosshair />Use current location</button>
        </div>
        <div className="toggle-list compact-toggles"><label><input type="checkbox"/><span><strong>Allow shared devices</strong><small>Every punch still requires employee identity</small></span></label><label><input type="checkbox" defaultChecked/><span><strong>Flag mock-location signals</strong><small>Route suspicious punches for HR review</small></span></label></div>
      </Panel>
    </div>}
    {tab === "Salary and benefits" && canManageSalary && <div className="split-layout salary-config-layout">
      <Panel title="Site salary rule" description="Used by employees whose pay basis is Site-wise."><div className="form-stack">
        <label><span>Default rate per duty</span><div className="input-prefix"><b>₹</b><input type="number" min="0" value={siteRate} onChange={event=>setSiteRate(Number(event.target.value))}/></div><small>A post rate overrides this value for duties on that post.</small></label>
        <label><span>Effective from</span><input type="date" value={salaryEffectiveFrom} onChange={event=>setSalaryEffectiveFrom(event.target.value)}/><small>Earlier duties retain the rule effective on their duty date.</small></label>
      </div>
      <div className="scheme-choice salary-scheme">{([
        ["salary-only","Salary only","No PF or ESI at this site"],
        ["esi","Salary + ESI","ESI applies to eligible earnings"],
        ["pf-esi","Salary + ESI + PF","Both contributions apply"],
      ] as const).map(item=><label key={item[0]}><input type="radio" name="site-scheme" checked={scheme===item[0]} onChange={()=>setScheme(item[0])}/><span><strong>{item[1]}</strong><small>{item[2]}</small></span></label>)}</div>
      </Panel>
      <Panel title="Effective statutory settings" description="Organization rules applied to eligible earnings."><div className="statutory-cards">
        <div><span>Employee PF</span><strong>{statutorySettings.pfRate*100}%</strong><small>Monthly wage ceiling {rupees(statutorySettings.pfWageCeiling)}</small></div>
        <div><span>Employee ESI</span><strong>{statutorySettings.esiRate*100}%</strong><small>Monthly eligibility ceiling {rupees(statutorySettings.esiWageCeiling)}</small></div>
      </div><div className="rate-history"><strong>Rate history</strong>{siteRules.filter(rule=>rule.site===selectedSite).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)).map(rule=><div key={rule.effectiveFrom}><span>{rule.effectiveFrom}</span><b>{rule.defaultDutyRate?`${rupees(rule.defaultDutyRate)} / duty`:"Rate missing"}</b><em>{rule.scheme==="pf-esi"?"PF + ESI":rule.scheme==="esi"?"ESI":"Salary only"}</em></div>)}</div></Panel>
    </div>}
  </>;
}

export function PayrollAllocationScreen({ employeeId: selectedEmployeeId, onBack }: { employeeId?: string | null; onBack: () => void }) {
  const { getBreakdown } = usePayroll();
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId ?? "BMG-2274");
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (selectedEmployeeId) {
      setEmployeeId(selectedEmployeeId);
      setApproved(false);
    }
  }, [selectedEmployeeId]);

  const employee = employeeRecords.find(item=>item.id===employeeId) ?? employeeRecords[0];
  const breakdown = getBreakdown(employeeId);

  return <>
    <PageHeader title="Multi-site payroll allocation" description={`${employee.name} · August 2026 · calculated from approved duties`}
      actions={<><select className="header-select" value={employeeId} onChange={event=>{setEmployeeId(event.target.value);setApproved(false)}} aria-label="Employee allocation">{employeeRecords.filter(item=>getBreakdown(item.id).duties>0).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><BackButton onBack={onBack}/><button className="primary-button" disabled={breakdown.exceptions.length>0} onClick={() => setApproved(true)}><CheckCircle />Approve allocation</button></>} />
    {approved && <SavedNotice>Allocation approved and added to the payroll audit trail.</SavedNotice>}
    {breakdown.exceptions.length>0&&<div className="saved-notice payroll-blocked"><WarningCircle weight="fill"/>{breakdown.exceptions.length} configuration exception{breakdown.exceptions.length===1?"":"s"} must be resolved before approval.</div>}
    <StatStrip items={[
      { icon: CalendarCheck, value: breakdown.duties.toFixed(2), label: "Approved duties", note: "Across all sites" },
      { icon: Wallet, value: rupees(breakdown.gross), label: "Allocated gross", note: "Resolved duty rates", tone: "green" },
      { icon: ShieldCheck, value: rupees(breakdown.pf), label: "Employee PF", note: "Eligible site earnings", tone: "violet" },
      { icon: ShieldCheck, value: rupees(breakdown.esi), label: "Employee ESI", note: "Eligible site earnings", tone: "orange" },
    ]}/>
    <Panel title="Site allocation" description="Earnings and employee contributions are derived from the effective rule on every approved duty.">
      <div className="allocation-table"><div className="allocation-head"><span>Site</span><span>Duties</span><span>Rate source</span><span>Gross</span><span>PF</span><span>ESI</span><span>Net</span></div>
      {breakdown.sites.map(site=><div className="allocation-row calculated" key={site.site}>
        <strong>{site.site}</strong><span>{site.duties.toFixed(2)}</span><span>{site.rateSources.join(" / ")} · {site.schemeLabel}</span><strong>{rupees(site.gross)}</strong><strong>{rupees(site.pf)}</strong><strong>{rupees(site.esi)}</strong><strong>{rupees(site.net)}</strong>
      </div>)}
      <div className="allocation-total calculated"><span>Total</span><strong>{breakdown.duties.toFixed(2)}</strong><span/><strong>{rupees(breakdown.gross)}</strong><strong>{rupees(breakdown.pf)}</strong><strong>{rupees(breakdown.esi)}</strong><strong>{rupees(breakdown.gross-breakdown.pf-breakdown.esi)}</strong></div></div>
      <div className="calculation-note"><Wallet/><span><strong>Automatic calculation</strong> Monthly and fixed daily rates ignore site pay rates. Site-wise employees use the post override first, then the site default. Site benefits remain effective unless the employee has an explicit exception.</span></div>
    </Panel>
  </>;
}

export function NightVigilanceScreen({ onBack, guardMode = false }: { onBack: () => void; guardMode?: boolean }) {
  const notify = useToast();
  const [interval, setIntervalValue] = useState("60 minutes");
  const [checks, setChecks] = useState([
    { employee: "Rajeev Kumar", site: "TCS Technopark", due: "22:00", state: "Confirmed" },
    { employee: "Anzar M", site: "Lake Palace Resort", due: "22:15", state: "Due now" },
    { employee: "Shamnad C M", site: "Caritas Hospital", due: "22:30", state: "Upcoming" },
  ]);
  const confirm = (employee: string) => setChecks(current => current.map(item => item.employee === employee ? { ...item, state: "Confirmed" } : item));
  const visible = guardMode ? checks.slice(1, 2) : checks;

  return <>
    <PageHeader title={guardMode ? "Night vigilance check" : "Night vigilance"} description={guardMode ? "A lightweight proof-of-presence check for your active night duty." : "Low-bandwidth check-ins and missed-response escalation."} actions={<BackButton onBack={onBack}/>} />
    {!guardMode && <div className="split-layout">
      <Panel title="Check-in policy" description="Organization default with site and post overrides."><div className="form-stack">
        <label><span>Default interval</span><select value={interval} onChange={event => setIntervalValue(event.target.value)}><option>30 minutes</option><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></select></label>
        <label><span>Response window</span><div className="input-suffix"><input type="number" defaultValue="10"/><b>minutes</b></div></label>
        <label><span>Escalate missed checks to</span><select><option>District operations + HR</option><option>District operations only</option><option>FSO on duty</option></select></label>
        <button className="primary-button" onClick={() => notify(`Night vigilance policy saved · check-in every ${interval}`)}><FloppyDisk/>Save policy</button>
      </div></Panel>

      <Panel title="Why this is lightweight" description="No photo upload is required."><div className="vigilance-method"><ClockCountdown/><strong>One tap and a location sample</strong><p>The app records a timestamp, coarse location evidence, device identity and response latency using minimal data.</p></div></Panel>
    </div>}
    <Panel title={guardMode ? "Current request" : "Live check-in board"} description={guardMode ? "Tap confirm while you are at the assigned post." : "Missed requests become attendance exceptions and vacancy risks."}>
      <div className="vigilance-list">{visible.map(item => <div key={item.employee} className="vigilance-row"><PersonCell name={item.employee} id={item.site}/><span><strong>{item.due}</strong><small>Check-in due</small></span><Status tone={item.state === "Confirmed" ? "success" : item.state === "Due now" ? "warning" : "info"}>{item.state}</Status><button className="secondary-button compact" disabled={item.state === "Confirmed"} onClick={() => confirm(item.employee)}>{item.state === "Confirmed" ? <CheckCircle/> : <Crosshair/>}{item.state === "Confirmed" ? "Recorded" : "Confirm presence"}</button></div>)}</div>
    </Panel>
  </>;
}

export function ExitClearanceScreen({ onBack }: { onBack: () => void }) {
  const records = [
    { id: "BMG-2031", name: "Anzar M", site: "Lake Palace Resort", uniform: 800, advance: 0, penalty: 0 },
    { id: "BMG-1469", name: "Hareendrakumar K", site: "Travancore Medicity", uniform: 0, advance: 1500, penalty: 500 },
    { id: "BMG-1778", name: "Shamnad C M", site: "Caritas Hospital", uniform: 0, advance: 0, penalty: 0 },
  ];
  const [selectedId, setSelectedId] = useState(records[0].id);
  const [uniformDue, setUniformDue] = useState(records[0].uniform);
  const [returned, setReturned] = useState(false);
  const [approved, setApproved] = useState(false);
  const [detail, setDetail] = useState<"advance" | "penalty" | null>(null);
  const selected = records.find(item => item.id === selectedId) ?? records[0];
  const blocked = uniformDue + selected.advance + selected.penalty > 0 || !returned;
  const selectRecord = (id: string) => {
    const record = records.find(item => item.id === id) ?? records[0];
    setSelectedId(id); setUniformDue(record.uniform); setReturned(false); setApproved(false);
  };

  return <>
    <PageHeader title="Exit clearance" description="Resignation and withdrawal controls with immediate dues blocking." actions={<BackButton onBack={onBack}/>} />
    <div className="split-detail">
      <Panel title="Employees in clearance" description="Select an employee to review every recovery item."><div className="clearance-list">{records.map(item => <button className={selectedId === item.id ? "active" : ""} key={item.id} onClick={() => selectRecord(item.id)}><PersonCell name={item.name} id={item.id}/><span>{item.uniform + item.advance + item.penalty > 0 ? `₹${(item.uniform + item.advance + item.penalty).toLocaleString("en-IN")} due` : "No financial dues"}</span><Status tone={item.uniform + item.advance + item.penalty > 0 ? "danger" : "success"}>{item.uniform + item.advance + item.penalty > 0 ? "Blocked" : "Review"}</Status></button>)}</div></Panel>
      <Panel title={selected.name} description={`${selected.id} · ${selected.site}`} className="clearance-card">
        {approved ? <SavedNotice>Exit clearance approved and employee status updated.</SavedNotice> : <>
          <div className={blocked ? "exit-state blocked" : "exit-state ready"}>{blocked ? <WarningCircle/> : <CheckCircle/>}<span><strong>{blocked ? "Exit is blocked" : "Ready for approval"}</strong><small>{blocked ? "Resolve every due and confirm asset return." : "All mandatory checks are complete."}</small></span></div>
          <div className="dues-list"><div><span>Uniform recovery</span><strong>{rupees(uniformDue)}</strong>{uniformDue > 0 && <button onClick={() => setUniformDue(0)}>Record settlement</button>}</div><div><span>Salary advance</span><strong>{rupees(selected.advance)}</strong><button onClick={() => setDetail("advance")}>Review</button></div><div><span>Verified penalty</span><strong>{rupees(selected.penalty)}</strong><button onClick={() => setDetail("penalty")}>Review</button></div></div>
          <label className="asset-check"><input type="checkbox" checked={returned} onChange={event => setReturned(event.target.checked)}/><span><strong>All issued assets returned</strong><small>Uniform pieces, ID card, registers and site property</small></span></label>
          <button className="primary-button wide" disabled={blocked} onClick={() => setApproved(true)}><CheckCircle/>Approve exit clearance</button>
        </>}
      </Panel>
    </div>

    {detail === "advance" && <DetailDrawer title="Salary advance recovery" subtitle={`${selected.name} · ${selected.id}`} onClose={() => setDetail(null)}
      footer={<button className="secondary-button" onClick={() => setDetail(null)}>Close</button>}>
      <div className="drawer-section">
        <h3>Outstanding balance</h3>
        <DefRows rows={[
          { label: "Original advance", value: rupees(selected.advance ? 4500 : 0), mono: true },
          { label: "Recovered so far", value: rupees(selected.advance ? 3000 : 0), mono: true },
          { label: "Balance at exit", value: rupees(selected.advance), mono: true, total: true },
        ]}/>
      </div>
      <div className="drawer-section">
        <h3>Recovery schedule</h3>
        {selected.advance > 0 ? <Timeline entries={[
          { title: "Instalment 1 recovered", time: "July 2026 payroll", note: "₹1,500 deducted from net salary.", state: "done" },
          { title: "Instalment 2 recovered", time: "August 2026 payroll", note: "₹1,500 deducted from net salary.", state: "done" },
          { title: "Instalment 3 outstanding", time: "September 2026 payroll", note: `${rupees(selected.advance)} must be settled before exit is approved.`, state: "active" },
        ]}/> : <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--muted)" }}>No advance was taken by this employee.</p>}
      </div>
    </DetailDrawer>}

    {detail === "penalty" && <DetailDrawer title="Penalty ledger" subtitle={`${selected.name} · ${selected.id}`} onClose={() => setDetail(null)}
      footer={<button className="secondary-button" onClick={() => setDetail(null)}>Close</button>}>
      {selected.penalty > 0 ? <>
        <div className="drawer-section">
          <h3>Applied penalty</h3>
          <DefRows rows={[
            { label: "Source complaint", value: "CL-1082" },
            { label: "Site action", value: "Withdrawn from site" },
            { label: "Amount", value: rupees(selected.penalty), mono: true },
            { label: "Applied in", value: "September 2026 payroll" },
          ]}/>
        </div>
        <div className="drawer-section">
          <h3>History</h3>
          <Timeline entries={[
            { title: "Complaint verified", time: "28 Aug 2026", note: "District operations confirmed the withdrawal.", state: "done" },
            { title: "₹500 penalty created", time: "29 Aug 2026", note: "Linked to complaint CL-1082.", state: "done" },
            { title: "Pending recovery at exit", time: "Outstanding", state: "active" },
          ]}/>
        </div>
        <div className="drawer-section">
          <div className="inline-alert"><ShieldCheck/><span>This penalty is linked to CL-1082 and has been applied once. Rejoining or reinstatement cannot create a second ₹500 deduction.</span></div>
        </div>
      </> : <div className="drawer-section"><p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--muted)" }}>No performance penalty has ever been levied on this employee.</p></div>}
    </DetailDrawer>}
  </>;
}

export function PenaltiesScreen({ onBack }: { onBack: () => void }) {
  const [employee, setEmployee] = useState("Fathima N");
  const [complaint, setComplaint] = useState("CL-1082 · Sleeping at assigned post");
  const [applied, setApplied] = useState(false);
  const duplicate = employee === "Rajeev Kumar";
  return <>
    <PageHeader title="Performance penalties" description="A verified site-removal complaint may create one ₹500 deduction only once." actions={<BackButton onBack={onBack}/>} />
    <div className="split-layout">
      <Panel title="Create penalty" description="The source complaint and withdrawal decision are mandatory."><div className="form-stack">
        <label><span>Employee</span><select value={employee} onChange={event => { setEmployee(event.target.value); setApplied(false); }}>{employees.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Verified complaint</span><select value={complaint} onChange={event => setComplaint(event.target.value)}><option>CL-1082 · Sleeping at assigned post</option><option>CL-1071 · Repeated register omission</option></select></label>
        <label><span>Site action</span><select><option>Withdrawn from site</option><option>Removed by client request</option></select></label>
        <label><span>Deduction amount</span><div className="input-prefix"><b>₹</b><input value="500" readOnly/></div></label>
        <label><span>Effective payroll</span><input type="month" defaultValue="2026-09"/></label>
        {duplicate && <div className="inline-alert warning"><WarningCircle/><span>This employee already has a penalty for CL-1082. Rejoining or reinstatement cannot create a second deduction.</span></div>}
        {applied && <SavedNotice>Penalty created once and linked to the complaint record.</SavedNotice>}
        <button className="primary-button" disabled={duplicate || applied} onClick={() => setApplied(true)}><Wallet/>{applied ? "Penalty recorded" : "Create ₹500 deduction"}</button>
      </div></Panel>
      <Panel title="Recent penalty ledger" description="Complaint-linked records prevent duplicate deductions."><div className="penalty-ledger"><div className="penalty-ledger-row"><PersonCell name="Rajeev Kumar" id="BMG-1988"/><Status tone="success">Applied once</Status><div className="penalty-ledger-meta"><span>CL-1082</span><strong>₹500</strong></div></div><div className="penalty-ledger-row"><PersonCell name="Anzar M" id="BMG-2031"/><Status tone="neutral">Recovered</Status><div className="penalty-ledger-meta"><span>CL-1068</span><strong>₹500</strong></div></div></div></Panel>
    </div>
  </>;
}

export function ActionCentreScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState([
    { id: 1, title: "Aster Medcity emergency post vacant", owner: "Ernakulam operations", due: "Now", type: "Vacancy", state: "Open" },
    { id: 2, title: "Seven late check-ins need review", owner: "HR attendance desk", due: "09:30", type: "Attendance", state: "Open" },
    { id: 3, title: "August payroll has three exceptions", owner: "Payroll team", due: "Today", type: "Payroll", state: "Open" },
    { id: 4, title: "Complaint CL-1082 approaches SLA", owner: "District manager", due: "2h 14m", type: "Complaint", state: "Open" },
  ]);
  const resolve = (id: number) => setItems(current => current.map(item => item.id === id ? { ...item, state: "Resolved" } : item));
  return <>
    <PageHeader title="Action centre" description="Vacancies, attendance exceptions, payroll blockers and complaint SLAs." actions={<BackButton onBack={onBack}/>} />
    <StatStrip items={[
      { icon: WarningCircle, value: String(items.filter(item => item.state === "Open").length), label: "Open actions", note: "Sorted by urgency", tone: "orange" },
      { icon: Buildings, value: "3", label: "Vacancy risks", note: "Two relievers available", tone: "red" },
      { icon: CalendarCheck, value: "7", label: "Attendance reviews", note: "Six GPS-related" },
      { icon: CheckCircle, value: String(items.filter(item => item.state === "Resolved").length), label: "Resolved now", note: "This session", tone: "green" },
    ]}/>
    <Panel title="Prioritized queue" description="Resolving an action retains its audit history."><div className="action-queue">{items.map(item => <div key={item.id} className={item.state === "Resolved" ? "resolved" : ""}><span className={`queue-icon ${item.type.toLowerCase()}`}><WarningCircle/></span><div><strong>{item.title}</strong><small>{item.owner} · due {item.due}</small></div><Status tone={item.state === "Resolved" ? "success" : item.due === "Now" ? "danger" : "warning"}>{item.state}</Status><button className="secondary-button compact" disabled={item.state === "Resolved"} onClick={() => resolve(item.id)}>{item.state === "Resolved" ? <CheckCircle/> : <Check/>}{item.state === "Resolved" ? "Resolved" : "Resolve"}</button></div>)}</div></Panel>
  </>;
}

export type WorkflowKind = "assignment" | "attendance" | "uniform" | "inspection" | "complaint" | "sop";

const workflowConfig: Record<WorkflowKind, { title: string; description: string; submit: string; icon: typeof UsersThree }> = {
  assignment: { title: "Assign employee", description: "Create an effective-dated post assignment with duty and pay rules.", submit: "Save assignment", icon: UsersThree },
  attendance: { title: "Manual attendance entry", description: "Correct a missing or disputed punch with an approval reason.", submit: "Submit correction", icon: CalendarCheck },
  uniform: { title: "Issue uniform kit", description: "Record all twelve items and the selected recovery plan.", submit: "Issue kit", icon: Package },
  inspection: { title: "Log FSO inspection", description: "Verify a site visit, checklist and follow-up owner.", submit: "Save inspection", icon: UserFocus },
  complaint: { title: "Log client complaint", description: "Capture the issue, SLA, investigation owner and severity.", submit: "Create complaint", icon: WarningCircle },
  sop: { title: "Create site SOP", description: "Publish versioned post instructions and acknowledgement rules.", submit: "Publish SOP", icon: FileText },
};

export function DetailedWorkflowScreen({ kind, onBack, role = "Owner" }: { kind: WorkflowKind; onBack: () => void; role?:Role }) {
  const { employeeRules, siteRules, postRules } = usePayroll();
  const config = workflowConfig[kind];
  const Icon = config.icon;
  const [saved, setSaved] = useState(false);
  const [duty, setDuty] = useState("1.00");
  const [employeeId, setEmployeeId] = useState("BMG-1840");
  const [assignmentSite, setAssignmentSite] = useState(sites[0]);
  const [assignmentPost, setAssignmentPost] = useState("Main gate");
  const [assignmentDate, setAssignmentDate] = useState("2026-09-10");
  const [kit, setKit] = useState(new Set(kitItems));
  const effectiveEmployeeRule=employeeRules.filter(item=>item.employeeId===employeeId&&item.effectiveFrom<=assignmentDate).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const effectiveSiteRule=siteRules.filter(item=>item.site===assignmentSite&&item.effectiveFrom<=assignmentDate).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const effectivePostRule=postRules.filter(item=>item.site===assignmentSite&&item.post===assignmentPost&&item.effectiveFrom<=assignmentDate).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const resolvedSource=effectiveEmployeeRule?.basis==="monthly"?"Monthly":effectiveEmployeeRule?.basis==="daily"?"Daily":effectivePostRule?"Post":effectiveSiteRule?.defaultDutyRate?"Site":"Missing";
  const resolvedRate=effectiveEmployeeRule?.basis==="monthly"?(effectiveEmployeeRule.monthlySalary??0)/effectiveEmployeeRule.payableDays:effectiveEmployeeRule?.basis==="daily"?(effectiveEmployeeRule.dailyRate??0):effectivePostRule?.dutyRate??effectiveSiteRule?.defaultDutyRate??0;
  const canSeeSalary=role==="Owner"||role==="HR & Payroll";
  const pfEnabled=effectiveEmployeeRule?.pfOverride==="enabled"||(effectiveEmployeeRule?.pfOverride==="inherit"&&effectiveSiteRule?.scheme==="pf-esi");
  const esiEnabled=effectiveEmployeeRule?.esiOverride==="enabled"||(effectiveEmployeeRule?.esiOverride==="inherit"&&(effectiveSiteRule?.scheme==="pf-esi"||effectiveSiteRule?.scheme==="esi"));
  const toggleKit = (item: string) => setKit(current => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item); else next.add(item);
    return next;
  });
  return <>
    <PageHeader title={config.title} description={config.description} actions={<BackButton onBack={onBack}/>} />
    <div className="workflow-detail-layout">
      <Panel className="workflow-form-panel">
        <div className="workflow-form-title"><span className="small-icon blue"><Icon/></span><div><strong>{config.title}</strong><small>Required fields are retained in the audit history.</small></div></div>
        <div className="form-grid padded-form">
          {kind !== "complaint" && kind !== "sop" && <label><span>Employee</span><select value={kind==="assignment"?employeeId:undefined} onChange={kind==="assignment"?event=>setEmployeeId(event.target.value):undefined}>{employeeRecords.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
          <label><span>{kind === "complaint" ? "Client" : "Site"}</span><select value={kind==="assignment"?assignmentSite:undefined} onChange={kind==="assignment"?event=>setAssignmentSite(event.target.value):undefined}>{kind === "complaint" && <option>Lulu Group</option>}{sites.map(item => <option key={item}>{item}</option>)}</select></label>
          {(kind === "assignment" || kind === "attendance") && <label><span>Post</span><select value={kind==="assignment"?assignmentPost:undefined} onChange={kind==="assignment"?event=>setAssignmentPost(event.target.value):undefined}><option>Main gate</option><option>Loading bay</option><option>Control room</option><option>Emergency</option></select></label>}
          {kind !== "uniform" && <label><span>{kind === "sop" ? "Effective date" : "Date"}</span><input type="date" value={kind==="assignment"?assignmentDate:undefined} defaultValue={kind==="assignment"?undefined:"2026-09-10"} onChange={kind==="assignment"?event=>setAssignmentDate(event.target.value):undefined}/></label>}
          {kind === "assignment" && <><label><span>Shift</span><select><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour duty</option></select></label><label><span>Duty quantity</span><select value={duty} onChange={event => setDuty(event.target.value)}><option>0.25</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select></label><div className={`site-rate-callout ${resolvedSource==="Missing"?"warning":""}`}><Wallet/><span><strong>{resolvedSource==="Missing"?"Salary rate missing":`${resolvedSource} pay rule`}</strong><small>{canSeeSalary&&resolvedRate?`${rupees(resolvedRate)} per duty · `:""}Resolved automatically for this assignment</small></span></div></>}
          {kind === "attendance" && <><label><span>Punch-in time</span><input type="time" defaultValue="08:03"/></label><label><span>Duty quantity</span><select value={duty} onChange={event => setDuty(event.target.value)}><option>0.25</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select></label><label><span>Correction reason</span><select><option>Device or network failure</option><option>Supervisor verified presence</option><option>Incorrect shift mapping</option></select></label></>}
          {kind === "uniform" && <><label><span>Recovery plan</span><select><option>Full upfront · ₹1,960</option><option>₹1,000 upfront + ₹1,200 salary</option><option>Full salary deduction · ₹2,600</option></select></label><label><span>Issue date</span><input type="date" defaultValue="2026-09-10"/></label></>}
          {kind === "inspection" && <><label><span>Visit time</span><input type="time" defaultValue="13:00"/></label><label><span>Result</span><select><option>Compliant</option><option>Follow-up required</option><option>Critical exception</option></select></label><label><span>Follow-up owner</span><select><option>District operations</option><option>HR</option><option>Client manager</option></select></label></>}
          {kind === "complaint" && <><label><span>Complaint category</span><select><option>Guard conduct</option><option>Vacancy or late relief</option><option>Register or SOP compliance</option><option>Other service issue</option></select></label><label><span>Priority</span><select><option>High · 4-hour SLA</option><option>Medium · 12-hour SLA</option><option>Low · 24-hour SLA</option></select></label><label><span>Investigation owner</span><select><option>Ernakulam district manager</option><option>HR manager</option><option>Field officer</option></select></label></>}
          {kind === "sop" && <><label><span>SOP title</span><input defaultValue="Loading bay vehicle movement"/></label><label><span>Version</span><input defaultValue="1.9"/></label><label><span>Applies to post</span><select><option>All posts</option><option>Main gate</option><option>Loading bay</option></select></label></>}
        </div>
        {kind === "uniform" && <div className="kit-checklist">{kitItems.map(item => <button key={item} className={kit.has(item) ? "selected" : ""} onClick={() => toggleKit(item)}><span>{kit.has(item) && <Check weight="bold"/>}</span>{item}</button>)}</div>}
        {(kind === "complaint" || kind === "sop" || kind === "inspection") && <label className="large-text-field"><span>{kind === "complaint" ? "Complaint details" : kind === "sop" ? "Instructions" : "Inspection notes"}</span><textarea rows={7} defaultValue={kind === "complaint" ? "Guard was found away from the assigned post during the scheduled duty." : kind === "sop" ? "Verify vehicle entry, record driver details and keep the loading lane clear." : "Registers verified and guard briefing completed."}/></label>}
        {saved && <SavedNotice>{`${config.title} completed successfully.`}</SavedNotice>}
        <div className="form-footer"><button className="secondary-button" onClick={onBack}>Cancel</button><button className="primary-button" onClick={() => setSaved(true)}><CheckCircle/>{saved ? "Saved" : config.submit}</button></div>
      </Panel>
      <Panel title="Rule summary" description="Calculated before this record is saved."><div className="rule-summary">
        {kind === "assignment" && <><div><span>Duty value</span><strong>{duty}</strong></div><div><span>Pay source</span><strong>{resolvedSource}{canSeeSalary&&resolvedRate?` · ${rupees(resolvedRate)}`:""}</strong></div><div><span>Benefits</span><strong>{pfEnabled&&esiEnabled?"PF + ESI":esiEnabled?"ESI":pfEnabled?"PF":"Salary only"}</strong></div>{resolvedSource==="Missing"&&<div className="inline-alert warning"><WarningCircle/><span>Assignment can be saved, but payroll will be blocked until the site or post rate is configured.</span></div>}<p>A 24-hour configured assignment counts as one duty unless its post rule specifies otherwise.</p></>}
        {kind === "attendance" && <><div><span>Recorded duty</span><strong>{duty}</strong></div><div><span>Approval</span><strong>HR required</strong></div><div><span>Audit state</span><strong>Original retained</strong></div><p>The original punch is never overwritten; the correction is added as a separate approved record.</p></>}
        {kind === "uniform" && <><div><span>Items selected</span><strong>{kit.size} / 12</strong></div><div><span>Upfront payment</span><strong>₹1,960</strong></div><div><span>Salary recovery</span><strong>₹0</strong></div><p>Any remaining recovery balance will block exit clearance immediately.</p></>}
        {kind === "inspection" && <><div><span>GPS verification</span><strong>Required</strong></div><div><span>Checklist</span><strong>4 controls</strong></div><div><span>Follow-up SLA</span><strong>24 hours</strong></div><p>The visit appears in the route board after location and checklist verification.</p></>}
        {kind === "complaint" && <><div><span>SLA target</span><strong>4 hours</strong></div><div><span>Status</span><strong>Investigating</strong></div><div><span>Penalty</span><strong>Not automatic</strong></div><p>The ₹500 penalty becomes available only after verification and confirmed site withdrawal.</p></>}
        {kind === "sop" && <><div><span>Acknowledgement</span><strong>Required</strong></div><div><span>Audience</span><strong>Assigned guards</strong></div><div><span>Previous version</span><strong>Retained</strong></div><p>Publishing sends an in-app acknowledgement task to every employee on the selected post.</p></>}
      </div></Panel>
    </div>
  </>;
}
