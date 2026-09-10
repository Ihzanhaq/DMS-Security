"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, Buildings, CalendarCheck, Check, CheckCircle, ClockCountdown,
  Crosshair, FileText, FloppyDisk, Package, Plus, ShieldCheck,
  Trash, UserFocus, UsersThree, Wallet, WarningCircle,
} from "@phosphor-icons/react";
import { DefRows, DetailDrawer, PageHeader, Panel, PersonCell, StatStrip, Status, Timeline } from "@/components/shared/screen-elements";
import { GeoMap } from "@/components/shared/geo-map";
import { useToast } from "@/components/shared/toast-context";
import { rupees, skillOptions } from "@/lib/mock-data";

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

export function EmployeeFormScreen({ onBack, onImport }: { onBack: () => void; onImport: () => void }) {
  const [saved, setSaved] = useState(false);
  const [payBasis, setPayBasis] = useState("Monthly salary");
  const [skills, setSkills] = useState<string[]>(["Day book", "General security"]);
  const availableSkills: string[] = [...skillOptions];
  const toggleSkill = (skill: string) => setSkills(current => current.includes(skill) ? current.filter(item => item !== skill) : [...current, skill]);

  return <>
    <PageHeader title="Employee profile" description="Identity, capability, employment, statutory and recovery settings."
      actions={<><BackButton onBack={onBack}/><button className="secondary-button" onClick={onImport}>Import employees</button><button className="primary-button" onClick={() => setSaved(true)}><FloppyDisk />Save employee</button></>} />
    {saved && <SavedNotice>Employee profile saved with an effective date.</SavedNotice>}
    <div className="workflow-grid">
      <Panel title="Identity and employment" description="Core details used across deployment and payroll.">
        <div className="form-grid">
          <label><span>Employee ID</span><input defaultValue="BMG-NEW" /></label>
          <label><span>Full name</span><input defaultValue="Suresh Babu" /></label>
          <label><span>Mobile number</span><input defaultValue="98470 12840" /></label>
          <label><span>District</span><select defaultValue="Ernakulam">{districts.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Joining date</span><input type="date" defaultValue="2026-09-10" /></label>
          <label><span>Employment status</span><select><option>Active</option><option>Reliever</option><option>On leave</option><option>Exit initiated</option></select></label>
        </div>
      </Panel>
      <Panel title="Skills and eligibility" description="Operations can filter employees by these verified capabilities.">
        <div className="choice-grid">{availableSkills.map(skill => <button key={skill} className={skills.includes(skill) ? "choice-card selected" : "choice-card"} onClick={() => toggleSkill(skill)}><span>{skills.includes(skill) ? <CheckCircle weight="fill" /> : <Check />}</span><strong>{skill}</strong><small>{skill === "Driving" ? "Licence can be recorded in documents" : "Eligible for matching posts"}</small></button>)}</div>
      </Panel>
      <Panel title="Pay and statutory profile" description="Employee settings override organization, client and site defaults.">
        <div className="form-grid">
          <label><span>Pay basis</span><select value={payBasis} onChange={event => setPayBasis(event.target.value)}><option>Monthly salary</option><option>Fixed duty rate</option></select></label>
          <label><span>{payBasis === "Monthly salary" ? "Monthly salary" : "Default duty rate"}</span><div className="input-prefix"><b>₹</b><input type="number" defaultValue={payBasis === "Monthly salary" ? "16000" : "650"} /></div></label>
          <label><span>Salary denominator</span><select><option>Scheduled working days</option><option>Organization payable days</option></select></label>
          <label><span>Payment method</span><select><option>Bank transfer</option><option>Cash</option></select></label>
        </div>
        <div className="toggle-list">
          <label><input type="checkbox" defaultChecked /><span><strong>Provident Fund</strong><small>Enabled as an employee override</small></span></label>
          <label><input type="checkbox" defaultChecked /><span><strong>ESI</strong><small>Enabled as an employee override</small></span></label>
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

export function SiteConfigurationScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState("Site profile");
  const [saved, setSaved] = useState(false);
  const [latitude, setLatitude] = useState(10.027);
  const [longitude, setLongitude] = useState(76.308);
  const [radius, setRadius] = useState(120);
  const [posts, setPosts] = useState([
    { name: "Main gate", shift: "Day · 08:00–20:00", required: 2, duty: "1.00" },
    { name: "Loading bay", shift: "Night · 20:00–08:00", required: 2, duty: "1.00" },
    { name: "Control room", shift: "24-hour rotation", required: 2, duty: "1.00" },
  ]);
  const locate = () => navigator.geolocation?.getCurrentPosition(result => {
    setLatitude(Number(result.coords.latitude.toFixed(6)));
    setLongitude(Number(result.coords.longitude.toFixed(6)));
  });

  return <>
    <PageHeader title="Site and post configuration" description="Location, staffing, benefit inheritance and attendance controls."
      actions={<><BackButton onBack={onBack}/><button className="primary-button" onClick={() => setSaved(true)}><FloppyDisk />Save configuration</button></>} />
    {saved && <SavedNotice>Site configuration saved with its override sources.</SavedNotice>}
    <div className="tabs-row workflow-tabs">{["Site profile", "Posts and shifts", "Geofence and attendance", "Benefit defaults"].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Site profile" && <Panel title="Client location" description="The client contract remains separate from operational posts."><div className="form-grid padded-form">
      <label><span>Client</span><select defaultValue="Lulu Group"><option>Lulu Group</option><option>TCS</option><option>Aster DM Healthcare</option></select></label>
      <label><span>Site name</span><input defaultValue="Lulu Mall, Kochi" /></label>
      <label><span>District</span><select defaultValue="Ernakulam">{districts.map(item => <option key={item}>{item}</option>)}</select></label>
      <label><span>Site code</span><input defaultValue="SITE-EKM-014" /></label>
      <label><span>Contract start</span><input type="date" defaultValue="2026-01-01" /></label>
      <label><span>Operations contact</span><input defaultValue="Site Manager · 98470 33445" /></label>
    </div></Panel>}
    {tab === "Posts and shifts" && <Panel title="Configured posts" description="Duty quantity, required headcount and rotation are editable per post." action={<button className="secondary-button compact" onClick={() => setPosts(current => [...current, { name: "New post", shift: "Day · 08:00–20:00", required: 1, duty: "1.00" }])}><Plus />Add post</button>}>
      <div className="editable-list">{posts.map((post, index) => <div className="editable-row" key={index}>
        <input value={post.name} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} aria-label={`Post ${index + 1} name`} />
        <select value={post.shift} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, shift: event.target.value } : item))}><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour rotation</option><option>Flexible</option></select>
        <input type="number" value={post.required} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, required: Number(event.target.value) } : item))} aria-label="Required headcount" />
        <select value={post.duty} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, duty: event.target.value } : item))}><option>0.25</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select>
        <button className="icon-button" onClick={() => setPosts(current => current.filter((_, row) => row !== index))} aria-label={`Remove ${post.name}`}><Trash /></button>
      </div>)}</div>
      <div className="field-key"><span>Post name</span><span>Shift pattern</span><span>Required</span><span>Duty unit</span></div>
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
    {tab === "Benefit defaults" && <Panel title="Default statutory profile" description="These rules apply unless a post or employee override is active.">
      <div className="scheme-choice"><label><input type="radio" name="scheme"/><span><strong>Salary only</strong><small>No PF or ESI at this site</small></span></label><label><input type="radio" name="scheme"/><span><strong>Salary + ESI</strong><small>ESI applies to eligible earnings</small></span></label><label><input type="radio" name="scheme" defaultChecked/><span><strong>Salary + ESI + PF</strong><small>Both contributions apply</small></span></label></div>
      <div className="inheritance-chain"><strong>Current source</strong><div><span>Organization</span><b>›</b><span>Client</span><b>›</b><span className="active-rule">Site override</span><b>›</b><span>Post</span><b>›</b><span>Employee</span></div><p>The most specific effective rule wins and stays visible in the payroll calculation audit.</p></div>
    </Panel>}
  </>;
}

type Allocation = { site: string; days: number; scheme: string; earnings: number };

export function PayrollAllocationScreen({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<Allocation[]>([
    { site: "TCS Technopark", days: 10, scheme: "Salary + ESI + PF", earnings: 6154 },
    { site: "Aster Medcity", days: 10, scheme: "Salary + ESI", earnings: 6154 },
    { site: "Lulu Mall, Kochi", days: 10, scheme: "Salary only", earnings: 6154 },
  ]);
  const [approved, setApproved] = useState(false);
  const totals = useMemo(() => rows.reduce((result, row) => {
    const pf = row.scheme.includes("PF") ? Math.round(row.earnings * .12) : 0;
    const esi = row.scheme.includes("ESI") ? Math.round(row.earnings * .0075) : 0;
    return { days: result.days + row.days, earnings: result.earnings + row.earnings, pf: result.pf + pf, esi: result.esi + esi };
  }, { days: 0, earnings: 0, pf: 0, esi: 0 }), [rows]);

  return <>
    <PageHeader title="Multi-site payroll allocation" description="Rajeev Kumar · August 2026 · monthly salary ₹16,000"
      actions={<><BackButton onBack={onBack}/><button className="primary-button" onClick={() => setApproved(true)}><CheckCircle />Approve allocation</button></>} />
    {approved && <SavedNotice>Allocation approved and added to the payroll audit trail.</SavedNotice>}
    <StatStrip items={[
      { icon: CalendarCheck, value: totals.days.toFixed(2), label: "Approved duties", note: "Across all sites" },
      { icon: Wallet, value: `₹${totals.earnings.toLocaleString("en-IN")}`, label: "Allocated gross", note: "Working-day proration", tone: "green" },
      { icon: ShieldCheck, value: `₹${totals.pf.toLocaleString("en-IN")}`, label: "Employee PF", note: "Eligible site segments", tone: "violet" },
      { icon: ShieldCheck, value: `₹${totals.esi.toLocaleString("en-IN")}`, label: "Employee ESI", note: "Eligible site segments", tone: "orange" },
    ]}/>
    <Panel title="Site allocation" description="Each row calculates contributions using its own effective benefit profile." action={<button className="secondary-button compact" onClick={() => setRows(current => [...current, { site: sites[0], days: 0, scheme: "Salary only", earnings: 0 }])}><Plus />Add segment</button>}>
      <div className="allocation-table"><div className="allocation-head"><span>Site</span><span>Duties</span><span>Benefit profile</span><span>Gross</span><span>PF</span><span>ESI</span><span>Net</span><span/></div>
      {rows.map((row, index) => {
        const pf = row.scheme.includes("PF") ? Math.round(row.earnings * .12) : 0;
        const esi = row.scheme.includes("ESI") ? Math.round(row.earnings * .0075) : 0;
        return <div className="allocation-row" key={index}>
          <select value={row.site} onChange={event => setRows(current => current.map((item, i) => i === index ? { ...item, site: event.target.value } : item))}>{sites.map(site => <option key={site}>{site}</option>)}</select>
          <input type="number" step="0.25" value={row.days} onChange={event => setRows(current => current.map((item, i) => i === index ? { ...item, days: Number(event.target.value) } : item))}/>
          <select value={row.scheme} onChange={event => setRows(current => current.map((item, i) => i === index ? { ...item, scheme: event.target.value } : item))}><option>Salary only</option><option>Salary + ESI</option><option>Salary + ESI + PF</option></select>
          <div className="money-input">₹<input type="number" value={row.earnings} onChange={event => setRows(current => current.map((item, i) => i === index ? { ...item, earnings: Number(event.target.value) } : item))}/></div>
          <strong>₹{pf.toLocaleString("en-IN")}</strong><strong>₹{esi.toLocaleString("en-IN")}</strong><strong>₹{(row.earnings - pf - esi).toLocaleString("en-IN")}</strong>
          <button className="icon-button" onClick={() => setRows(current => current.filter((_, i) => i !== index))} aria-label="Remove allocation"><Trash /></button>
        </div>;
      })}
      <div className="allocation-total"><span>Total</span><strong>{totals.days.toFixed(2)}</strong><span/><strong>₹{totals.earnings.toLocaleString("en-IN")}</strong><strong>₹{totals.pf.toLocaleString("en-IN")}</strong><strong>₹{totals.esi.toLocaleString("en-IN")}</strong><strong>₹{(totals.earnings - totals.pf - totals.esi).toLocaleString("en-IN")}</strong><span/></div></div>
      <div className="calculation-note"><Wallet/><span><strong>Proration rule</strong> Monthly salary is divided by scheduled payable working days. Fractional duty quantities are summed before the site allocation is calculated.</span></div>
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
      <Panel title="Recent penalty ledger" description="Complaint-linked records prevent duplicate deductions."><div className="penalty-ledger"><div><PersonCell name="Rajeev Kumar" id="BMG-1988"/><span>CL-1082</span><strong>₹500</strong><Status tone="success">Applied once</Status></div><div><PersonCell name="Anzar M" id="BMG-2031"/><span>CL-1068</span><strong>₹500</strong><Status tone="neutral">Recovered</Status></div></div></Panel>
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

export function DetailedWorkflowScreen({ kind, onBack }: { kind: WorkflowKind; onBack: () => void }) {
  const config = workflowConfig[kind];
  const Icon = config.icon;
  const [saved, setSaved] = useState(false);
  const [duty, setDuty] = useState("1.00");
  const [kit, setKit] = useState(new Set(kitItems));
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
          {kind !== "complaint" && kind !== "sop" && <label><span>Employee</span><select>{employees.map(item => <option key={item}>{item}</option>)}</select></label>}
          <label><span>{kind === "complaint" ? "Client" : "Site"}</span><select>{kind === "complaint" && <option>Lulu Group</option>}{sites.map(item => <option key={item}>{item}</option>)}</select></label>
          {(kind === "assignment" || kind === "attendance") && <label><span>Post</span><select><option>Main gate</option><option>Loading bay</option><option>Control room</option></select></label>}
          {kind !== "uniform" && <label><span>{kind === "sop" ? "Effective date" : "Date"}</span><input type="date" defaultValue="2026-09-10"/></label>}
          {kind === "assignment" && <><label><span>Shift</span><select><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour duty</option></select></label><label><span>Duty quantity</span><select value={duty} onChange={event => setDuty(event.target.value)}><option>0.25</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select></label><label><span>Pay rule</span><select><option>Employee monthly salary</option><option>Site daily rate · ₹650</option><option>Post daily rate · ₹750</option></select></label></>}
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
        {kind === "assignment" && <><div><span>Duty value</span><strong>{duty}</strong></div><div><span>Pay source</span><strong>Employee profile</strong></div><div><span>Benefit source</span><strong>Site override · PF + ESI</strong></div><p>A 24-hour configured assignment counts as one duty unless its post rule specifies otherwise.</p></>}
        {kind === "attendance" && <><div><span>Recorded duty</span><strong>{duty}</strong></div><div><span>Approval</span><strong>HR required</strong></div><div><span>Audit state</span><strong>Original retained</strong></div><p>The original punch is never overwritten; the correction is added as a separate approved record.</p></>}
        {kind === "uniform" && <><div><span>Items selected</span><strong>{kit.size} / 12</strong></div><div><span>Upfront payment</span><strong>₹1,960</strong></div><div><span>Salary recovery</span><strong>₹0</strong></div><p>Any remaining recovery balance will block exit clearance immediately.</p></>}
        {kind === "inspection" && <><div><span>GPS verification</span><strong>Required</strong></div><div><span>Checklist</span><strong>4 controls</strong></div><div><span>Follow-up SLA</span><strong>24 hours</strong></div><p>The visit appears in the route board after location and checklist verification.</p></>}
        {kind === "complaint" && <><div><span>SLA target</span><strong>4 hours</strong></div><div><span>Status</span><strong>Investigating</strong></div><div><span>Penalty</span><strong>Not automatic</strong></div><p>The ₹500 penalty becomes available only after verification and confirmed site withdrawal.</p></>}
        {kind === "sop" && <><div><span>Acknowledgement</span><strong>Required</strong></div><div><span>Audience</span><strong>Assigned guards</strong></div><div><span>Previous version</span><strong>Retained</strong></div><p>Publishing sends an in-app acknowledgement task to every employee on the selected post.</p></>}
      </div></Panel>
    </div>
  </>;
}
