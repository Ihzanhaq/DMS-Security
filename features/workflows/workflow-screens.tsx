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
import { customFieldDefs, documentChecklist, employeeDocuments, employees as employeeRecords, rupees, siteDocuments, siteFeedback, sites as siteRecords, skillOptions, statutorySettings } from "@/lib/mock-data";
import { useOps } from "@/components/shared/ops-context";
import { usePayroll } from "@/components/shared/payroll-context";
import { keralaDistricts, keralaTaluks } from "@/lib/kerala-geo";
import { canManageSalary } from "@/lib/roles";
import type { BenefitOverride, BenefitScheme, EmployeeDocument, EmployeeDocumentStatus, EscalationContact, LatLng, PayBasis, Role, SiteDocument, SiteDocumentKind, SiteFeedback } from "@/types/domain";

const districts = keralaDistricts;
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
  const [joiningDate, setJoiningDate] = useState(employeeId ? employee.joiningDate : "2026-09-22");
  const [prefDistrict, setPrefDistrict] = useState(employee.workPreference?.district ?? employee.district);
  const [prefTaluk, setPrefTaluk] = useState(employee.workPreference?.taluk ?? (keralaTaluks[employee.workPreference?.district ?? employee.district] ?? [])[0] ?? "");
  const [docs, setDocs] = useState<EmployeeDocument[]>(() => {
    const existing = employeeDocuments.filter(doc => doc.employeeId === targetEmployeeId);
    const covered = new Set(existing.map(doc => doc.type));
    return [
      ...existing,
      ...documentChecklist.filter(type => !covered.has(type)).map((type, index) => ({ id:`DOC-NEW-${index}`, employeeId:targetEmployeeId, type, status:"pending" as EmployeeDocumentStatus, dueBy:"2026-09-29" })),
    ];
  });
  const [newDocType, setNewDocType] = useState("");
  const [nominee, setNominee] = useState({ name: employee.nominee?.name ?? "", relation: employee.nominee?.relation ?? "Spouse", phone: employee.nominee?.phone ?? "", address: employee.nominee?.address ?? "", bankAccount: employee.nominee?.bankAccount ?? "", ifsc: employee.nominee?.ifsc ?? "", photoOnFile: employee.nominee?.photoOnFile ?? false });
  const pfEsiOverdue = !employee.pfEsiDataReceived && (Date.parse("2026-09-22") - Date.parse(joiningDate)) / 86400000 >= 15;
  const editDocRow = (index: number, patch: Partial<EmployeeDocument>) => setDocs(current => current.map((doc, row) => row === index ? { ...doc, ...patch } : doc));

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
          <label><span>Joining date</span><input type="date" value={joiningDate} onChange={event => setJoiningDate(event.target.value)} /><small>PF/ESI data must reach HR within 15 days of joining.</small></label>
          <label><span>Employment status</span><select><option>Active</option><option>Reliever</option><option>On leave</option><option>Exit initiated</option></select></label>
          <label><span>Preferred district</span><select value={prefDistrict} onChange={event => { setPrefDistrict(event.target.value); setPrefTaluk((keralaTaluks[event.target.value] ?? [])[0] ?? ""); }}>{keralaDistricts.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Preferred taluk</span><select value={prefTaluk} onChange={event => setPrefTaluk(event.target.value)}>{(keralaTaluks[prefDistrict] ?? []).map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Shirt size</span><select defaultValue={employee.uniformSizes?.shirt ?? "L"}>{["S","M","L","XL","XXL"].map(size => <option key={size}>{size}</option>)}</select></label>
          <label><span>Trouser size</span><select defaultValue={employee.uniformSizes?.trouser ?? "34"}>{["30","32","34","36","38"].map(size => <option key={size}>{size}</option>)}</select></label>
          <label><span>Shoe size</span><select defaultValue={employee.uniformSizes?.shoe ?? "9"}>{["6","7","8","9","10","11"].map(size => <option key={size}>{size}</option>)}</select></label>
        </div>
        {pfEsiOverdue && <div className="inline-alert warning"><WarningCircle/><span>PF/ESI enrolment data has not been received and 15 days have passed since joining ({joiningDate}). HR has been alerted.</span></div>}
      </Panel>
      <Panel title="Skills and eligibility" description="Operations can filter employees by these verified capabilities.">
        <div className="choice-grid">{availableSkills.map(skill => <button key={skill} className={skills.includes(skill) ? "choice-card selected" : "choice-card"} onClick={() => toggleSkill(skill)}><span>{skills.includes(skill) ? <CheckCircle weight="fill" /> : <Check />}</span><strong>{skill}</strong><small>{skill === "Driving" ? "Licence can be recorded in documents" : "Eligible for matching posts"}</small></button>)}</div>
      </Panel>
      <Panel title="Documents" description="Checklist items are configurable in Settings. Pending items past their due date raise alerts.">
        <div className="editable-list">{docs.map((doc, index) => {
          const overdue = doc.status === "pending" && doc.dueBy < "2026-09-22";
          return <div className="editable-row employee-doc-row" key={doc.id}>
            <span className="doc-type">{doc.type}{overdue && <em>Overdue</em>}</span>
            <select value={doc.status} onChange={event => editDocRow(index, { status: event.target.value as EmployeeDocumentStatus, uploadedOn: event.target.value === "pending" ? undefined : doc.uploadedOn })} aria-label={`${doc.type} status`}>
              <option value="pending">Pending</option><option value="uploaded">Uploaded</option><option value="verified">Verified</option>
            </select>
            <input type="date" value={doc.dueBy} onChange={event => editDocRow(index, { dueBy: event.target.value })} aria-label={`${doc.type} due date`}/>
            <button className="secondary-button compact" disabled={doc.status !== "pending"} onClick={() => editDocRow(index, { status: "uploaded", uploadedOn: "2026-09-22" })}>{doc.status === "pending" ? "Mark uploaded" : doc.uploadedOn ? `On ${doc.uploadedOn}` : "Recorded"}</button>
          </div>;
        })}</div>
        <div className="doc-add-row">
          <input value={newDocType} onChange={event => setNewDocType(event.target.value)} placeholder="Add a document type (e.g. Driving licence)" aria-label="New document type"/>
          <button className="secondary-button compact" onClick={() => { if (!newDocType.trim()) return; setDocs(current => [...current, { id:`DOC-NEW-${Date.now()}`, employeeId:targetEmployeeId, type:newDocType.trim(), status:"pending", dueBy:"2026-09-29" }]); setNewDocType(""); }}><Plus/>Add</button>
        </div>
      </Panel>
      <Panel title="Nominee" description="Nominee identity, address and bank details for statutory records.">
        <div className="form-grid">
          <label><span>Nominee name</span><input value={nominee.name} onChange={event => setNominee(current => ({ ...current, name: event.target.value }))} placeholder="Full name"/></label>
          <label><span>Relation</span><select value={nominee.relation} onChange={event => setNominee(current => ({ ...current, relation: event.target.value }))}>{["Spouse","Father","Mother","Son","Daughter","Other"].map(relation => <option key={relation}>{relation}</option>)}</select></label>
          <label><span>Phone</span><input value={nominee.phone} onChange={event => setNominee(current => ({ ...current, phone: event.target.value }))}/></label>
          <label><span>Bank account</span><input value={nominee.bankAccount} onChange={event => setNominee(current => ({ ...current, bankAccount: event.target.value }))}/></label>
          <label><span>IFSC</span><input value={nominee.ifsc} onChange={event => setNominee(current => ({ ...current, ifsc: event.target.value }))}/></label>
          <label><span>Address</span><textarea rows={2} value={nominee.address} onChange={event => setNominee(current => ({ ...current, address: event.target.value }))}/></label>
        </div>
        <label className="asset-check nominee-photo"><input type="checkbox" checked={nominee.photoOnFile} onChange={event => setNominee(current => ({ ...current, photoOnFile: event.target.checked }))}/><span><strong>Nominee photo collected</strong><small>Physical or scanned copy is on file with HR</small></span></label>
      </Panel>
      <Panel title="Additional fields" description="Defined by administrators in Settings → Custom fields.">
        <div className="form-grid">
          {customFieldDefs.map(def => <label key={def.key}><span>{def.label}</span><input type={def.kind === "number" ? "number" : def.kind === "date" ? "date" : "text"} defaultValue={employee.customFields?.[def.key] ?? ""}/></label>)}
        </div>
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
  const salaryManager = canManageSalary(role);
  const [tab, setTab] = useState(initialTab === "salary" && salaryManager ? "Salary and benefits" : "Site profile");
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
  const notify = useToast();
  const [boundaryMode, setBoundaryMode] = useState<"circle" | "polygon">(siteRecord.polygon ? "polygon" : "circle");
  const [polygon, setPolygon] = useState<LatLng[]>(siteRecord.polygon ?? []);
  const [graceMins, setGraceMins] = useState(siteRecord.graceMins);
  const [dayInterval, setDayInterval] = useState(siteRecord.dayCheckIntervalMins);
  const [nightInterval, setNightInterval] = useState(siteRecord.nightCheckIntervalMins);
  const [contacts, setContacts] = useState<EscalationContact[]>(siteRecord.escalationContacts);
  const [officers, setOfficers] = useState<string[]>(siteRecord.fieldOfficers);
  const [docs, setDocs] = useState<SiteDocument[]>(siteDocuments.filter(doc => doc.site === selectedSite));
  const [docsDirty, setDocsDirty] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<SiteFeedback[]>(siteFeedback.filter(item => item.site === selectedSite));
  const [feedbackScore, setFeedbackScore] = useState(8);
  const [feedbackNote, setFeedbackNote] = useState("");
  const officerOptions = ["Ajmal Khan", "Praveen S", "Niyas P", "Meera K"];
  const editDoc = (index: number, patch: Partial<SiteDocument>) => {
    setDocs(current => current.map((doc, row) => row === index ? { ...doc, ...patch } : doc));
    setDocsDirty(true);
  };

  return <>
    <PageHeader title="Site and post configuration" description="Location, staffing, benefit inheritance and attendance controls."
      actions={<><BackButton onBack={onBack}/><button className="primary-button" onClick={() => {
        if(salaryManager){ updateSiteRule({ site:selectedSite, effectiveFrom:salaryEffectiveFrom, defaultDutyRate:siteRate||undefined, scheme }); posts.forEach(post=>updatePostRule(post.rate ? { site:selectedSite, post:post.name, effectiveFrom:salaryEffectiveFrom, dutyRate:Number(post.rate) } : null, selectedSite, post.name, salaryEffectiveFrom)); }
        if (docsDirty) {
          setDocs(current => current.map(doc => ({ ...doc, updatedOn: "2026-09-22", updatedBy: role })));
          setDocsDirty(false);
          notify(`${officers[0] ?? "Field officer"} alerted about the document update`);
        } else {
          notify(`Site policies saved · grace ${graceMins} min · checks ${dayInterval}/${nightInterval} min`);
        }
        setSaved(true);
      }}><FloppyDisk />Save configuration</button></>} />
    {saved && <SavedNotice>Site configuration saved with its override sources.</SavedNotice>}
    <div className="tabs-row workflow-tabs">{["Site profile", "Posts and shifts", "Geofence and attendance", "Team and escalation", "Documents and SOP", ...(salaryManager?["Salary and benefits"]:[])].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Site profile" && <Panel title="Client location" description="The client contract remains separate from operational posts."><div className="form-grid padded-form">
      <label><span>Client</span><select defaultValue={siteRecord.client}><option>{siteRecord.client}</option><option>Lulu Group</option><option>TCS</option><option>Aster DM Healthcare</option></select></label>
      <label><span>Site name</span><input defaultValue={selectedSite} /></label>
      <label><span>District</span><select defaultValue={siteRecord.district}>{districts.map(item => <option key={item}>{item}</option>)}</select></label>
      <label><span>Site code</span><input defaultValue="SITE-EKM-014" /></label>
      <label><span>Contract start</span><input type="date" defaultValue="2026-01-01" /></label>
      <label><span>Operations contact</span><input defaultValue="Site Manager · 98470 33445" /></label>
    </div></Panel>}
    {tab === "Posts and shifts" && <Panel title="Configured posts" description={salaryManager?"Duty quantity, staffing and optional salary override are editable per post.":"Duty quantity, required headcount and rotation are editable per post."} action={<button className="secondary-button compact" onClick={() => setPosts(current => [...current, { name: "New post", shift: "Day · 08:00–20:00", required: 1, duty: "1.00", rate:"" }])}><Plus />Add post</button>}>
      <div className="editable-list">{posts.map((post, index) => <div className={salaryManager?"editable-row salary-fields":"editable-row"} key={index}>
        <input value={post.name} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} aria-label={`Post ${index + 1} name`} />
        <select value={post.shift} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, shift: event.target.value } : item))}><option>Day · 08:00–20:00</option><option>Night · 20:00–08:00</option><option>24-hour rotation</option><option>Flexible</option></select>
        <input type="number" value={post.required} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, required: Number(event.target.value) } : item))} aria-label="Required headcount" />
        <select value={post.duty} onChange={event => setPosts(current => current.map((item, row) => row === index ? { ...item, duty: event.target.value } : item))}><option>0.25</option><option>0.50</option><option>0.75</option><option>1.00</option><option>1.50</option></select>
        {salaryManager&&<input type="number" min="0" value={post.rate} placeholder="Site rate" onChange={event=>setPosts(current=>current.map((item,row)=>row===index?{...item,rate:event.target.value===""?"":Number(event.target.value)}:item))} aria-label={`${post.name} duty rate override`}/>}
        <button className="icon-button" onClick={() => setPosts(current => current.filter((_, row) => row !== index))} aria-label={`Remove ${post.name}`}><Trash /></button>
      </div>)}</div>
      <div className={salaryManager?"field-key salary-fields":"field-key"}><span>Post name</span><span>Shift pattern</span><span>Required</span><span>Duty unit</span>{salaryManager&&<span>Rate override</span>}<span/></div>
    </Panel>}
    {tab === "Geofence and attendance" && <div className="split-layout">
      <Panel className="geofence-editor">
        <div className="tabs-row boundary-mode-row">{(["circle","polygon"] as const).map(mode => <button key={mode} className={boundaryMode === mode ? "active" : ""} onClick={() => setBoundaryMode(mode)}>{mode === "circle" ? "Circle boundary" : "Polygon boundary"}</button>)}</div>
        <GeoMap center={{ lat: latitude, lng: longitude }} radius={radius} draggable={boundaryMode === "circle"}
          polygon={boundaryMode === "polygon" ? polygon : undefined}
          onMapClick={boundaryMode === "polygon" ? point => setPolygon(current => [...current, point]) : undefined}
          onMove={next => { setLatitude(next.lat); setLongitude(next.lng); }} className="compact"/>
        <div className="map-caption">
          <span>Centre <b>{latitude.toFixed(5)}, {longitude.toFixed(5)}</b></span>
          {boundaryMode === "circle"
            ? <><span>Radius <b>{radius} m</b></span><span>Drag the pin or click the map to move the boundary</span></>
            : <><span>Vertices <b>{polygon.length}</b>{polygon.length < 3 && " · add at least 3"}</span><span>Click the map to add a boundary corner</span></>}
        </div>
      </Panel>
      <Panel title="Boundary and attendance rules" description="Coordinates can be pasted, captured from the device, or set on the map.">
        <div className="form-stack">
          <label><span>Latitude</span><input type="number" step="0.000001" value={latitude} onChange={event => setLatitude(Number(event.target.value))}/></label>
          <label><span>Longitude</span><input type="number" step="0.000001" value={longitude} onChange={event => setLongitude(Number(event.target.value))}/></label>
          {boundaryMode === "circle" && <label><span>Geofence radius</span><div className="input-suffix"><input type="number" value={radius} onChange={event => setRadius(Number(event.target.value))}/><b>metres</b></div></label>}
          {boundaryMode === "polygon" && <div className="vertex-list">
            {polygon.map((point, index) => <div key={`${point.lat}-${point.lng}-${index}`} className="vertex-row">
              <span>#{index + 1}</span><b>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</b>
              <button className="icon-button" onClick={() => setPolygon(current => current.filter((_, row) => row !== index))} aria-label={`Remove vertex ${index + 1}`}><Trash/></button>
            </div>)}
            {polygon.length === 0 && <p className="vertex-empty">No corners yet. Click the map to draw the boundary.</p>}
            {polygon.length > 0 && <button className="secondary-button compact" onClick={() => setPolygon([])}>Clear boundary</button>}
          </div>}
          <label><span>Late-arrival grace</span><div className="input-suffix"><input type="number" min={15} max={60} value={graceMins} onChange={event => setGraceMins(Number(event.target.value))}/><b>minutes</b></div><small>15–60 minutes per site policy.</small></label>
          <label><span>Day-shift check interval</span><div className="input-suffix"><input type="number" min={15} value={dayInterval} onChange={event => setDayInterval(Number(event.target.value))}/><b>minutes</b></div></label>
          <label><span>Night-shift check interval</span><div className="input-suffix"><input type="number" min={15} value={nightInterval} onChange={event => setNightInterval(Number(event.target.value))}/><b>minutes</b></div><small>Drives the presence-check schedule for each shift.</small></label>
          <label><span>GPS accuracy threshold</span><div className="input-suffix"><input type="number" defaultValue="50"/><b>metres</b></div></label>
          <button className="secondary-button" onClick={locate}><Crosshair />Use current location</button>
        </div>
        <div className="toggle-list compact-toggles"><label><input type="checkbox"/><span><strong>Allow shared devices</strong><small>Every punch still requires employee identity</small></span></label><label><input type="checkbox" defaultChecked/><span><strong>Flag mock-location signals</strong><small>Route suspicious punches for HR review</small></span></label></div>
      </Panel>
    </div>}
    {tab === "Team and escalation" && <div className="split-layout">
      <Panel title="Field officers" description="Ordered assignment — FO 1 leads, FO 2 and 3 back up. Editable any time."
        action={<button className="secondary-button compact" onClick={() => setOfficers(current => [...current, officerOptions.find(name => !current.includes(name)) ?? officerOptions[0]])}><Plus/>Add field officer</button>}>
        <div className="editable-list">{officers.map((officer, index) => <div className="editable-row officer-row" key={`${officer}-${index}`}>
          <span className="officer-slot">FO {index + 1}</span>
          <select value={officer} onChange={event => setOfficers(current => current.map((item, row) => row === index ? event.target.value : item))} aria-label={`Field officer ${index + 1}`}>{officerOptions.map(name => <option key={name}>{name}</option>)}</select>
          <button className="icon-button" onClick={() => setOfficers(current => current.filter((_, row) => row !== index))} aria-label={`Remove FO ${index + 1}`}><Trash/></button>
        </div>)}</div>
        {officers.length === 0 && <p className="vertex-empty">No field officer linked. Guard-change alerts have nowhere to go.</p>}
      </Panel>
      <Panel title="Escalation contacts" description="Shown to guards in the mobile app."
        action={<button className="secondary-button compact" onClick={() => setContacts(current => [...current, { label: "New contact", name: "", phone: "" }])}><Plus/>Add contact</button>}>
        <div className="editable-list">{contacts.map((contact, index) => <div className="editable-row contact-row" key={index}>
          <input value={contact.label} onChange={event => setContacts(current => current.map((item, row) => row === index ? { ...item, label: event.target.value } : item))} aria-label={`Contact ${index + 1} label`}/>
          <input value={contact.name} onChange={event => setContacts(current => current.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} aria-label={`Contact ${index + 1} name`} placeholder="Name"/>
          <input value={contact.phone} onChange={event => setContacts(current => current.map((item, row) => row === index ? { ...item, phone: event.target.value } : item))} aria-label={`Contact ${index + 1} phone`} placeholder="Phone"/>
          <button className="icon-button" onClick={() => setContacts(current => current.filter((_, row) => row !== index))} aria-label={`Remove contact ${index + 1}`}><Trash/></button>
        </div>)}</div>
      </Panel>
    </div>}
    {tab === "Documents and SOP" && <div className="split-layout">
      <Panel title="Site documents" description="Agreement, PCC and biodata requirements, SOP and check data. Edits alert the linked field officer on save."
        action={<button className="secondary-button compact" onClick={() => { setDocs(current => [...current, { id:`SDOC-${Date.now()}`, site:selectedSite, kind:"sop", title:"New document", version:"1.0", updatedOn:"2026-09-22", updatedBy:role }]); setDocsDirty(true); }}><Plus/>Add document</button>}>
        <div className="editable-list">{docs.map((doc, index) => <div className="editable-row doc-row" key={doc.id}>
          <select value={doc.kind} onChange={event => editDoc(index, { kind: event.target.value as SiteDocumentKind })} aria-label={`Document ${index + 1} kind`}>
            <option value="agreement">Client agreement</option><option value="pcc-requirement">PCC requirement</option><option value="biodata-requirement">Biodata requirement</option><option value="sop">SOP</option><option value="check-data">Check data</option>
          </select>
          <input value={doc.title} onChange={event => editDoc(index, { title: event.target.value })} aria-label={`Document ${index + 1} title`}/>
          <input value={doc.version} onChange={event => editDoc(index, { version: event.target.value })} aria-label={`Document ${index + 1} version`} className="doc-version"/>
          <span className="doc-updated">{doc.updatedOn}</span>
          <button className="icon-button" onClick={() => { setDocs(current => current.filter((_, row) => row !== index)); setDocsDirty(true); }} aria-label={`Remove ${doc.title}`}><Trash/></button>
        </div>)}</div>
        {docs.length === 0 && <p className="vertex-empty">No documents recorded for this site yet.</p>}
        {docsDirty && <div className="inline-alert"><WarningCircle/><span>Unsaved document changes — saving alerts {officers[0] ?? "the field officer"}.</span></div>}
      </Panel>
      <Panel title="Client feedback" description="Satisfaction records collected at site level.">
        <div className="feedback-list">{feedbackEntries.map(entry => <div className="feedback-row" key={entry.id}>
          <b>{entry.satisfaction}/10</b><div><strong>{entry.date}</strong><small>{entry.note}</small></div>
        </div>)}</div>
        <div className="form-stack feedback-form">
          <label><span>Satisfaction (1–10)</span><select value={feedbackScore} onChange={event => setFeedbackScore(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map(score => <option key={score} value={score}>{score}</option>)}</select></label>
          <label><span>Note</span><textarea rows={2} value={feedbackNote} onChange={event => setFeedbackNote(event.target.value)} placeholder="What did the client say?"/></label>
          <button className="secondary-button" onClick={() => { if (!feedbackNote.trim()) return; setFeedbackEntries(current => [{ id:`FB-${Date.now()}`, site:selectedSite, date:"2026-09-22", satisfaction:feedbackScore, note:feedbackNote.trim() }, ...current]); setFeedbackNote(""); notify("Client feedback recorded"); }}><Plus/>Record feedback</button>
        </div>
      </Panel>
    </div>}
    {tab === "Salary and benefits" && salaryManager && <div className="split-layout salary-config-layout">
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
  const notify = useToast();
  const { addVacancy } = useOps();
  const [exitEmployeeId, setExitEmployeeId] = useState(employeeRecords[0].id);
  const [exitDate, setExitDate] = useState("2026-09-30");
  const [exitTime, setExitTime] = useState("18:00");
  const [exitReason, setExitReason] = useState("");
  const [exitAdjustments, setExitAdjustments] = useState("");
  const [exitPriority, setExitPriority] = useState<"high" | "normal">("normal");
  const [exitRecorded, setExitRecorded] = useState(false);
  const initiateExit = () => {
    const employee = employeeRecords.find(item => item.id === exitEmployeeId) ?? employeeRecords[0];
    addVacancy({
      id: `VAC-${Date.now()}`,
      site: employee.site === "Unassigned" ? "Reliever pool" : employee.site,
      post: `${employee.role} · ${employee.shift}`,
      district: employee.district,
      priority: exitPriority,
      openedOn: exitDate,
      source: "exit",
      status: "open",
    });
    setExitRecorded(true);
    notify("Exit recorded · vacancy pushed to the recruitment list");
  };
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
    <Panel title="Initiate exit" description="Date, time and adjustments are recorded with priority; the vacancy moves to recruitment automatically.">
      <div className="form-grid padded-form">
        <label><span>Employee</span><select value={exitEmployeeId} onChange={event => { setExitEmployeeId(event.target.value); setExitRecorded(false); }}>{employeeRecords.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Exit date</span><input type="date" value={exitDate} onChange={event => setExitDate(event.target.value)}/></label>
        <label><span>Exit time</span><input type="time" value={exitTime} onChange={event => setExitTime(event.target.value)}/></label>
        <label><span>Priority</span><select value={exitPriority} onChange={event => setExitPriority(event.target.value as "high" | "normal")}><option value="normal">Normal</option><option value="high">High — critical post</option></select></label>
        <label><span>Reason</span><input value={exitReason} onChange={event => setExitReason(event.target.value)} placeholder="Resignation, relocation, termination…"/></label>
        <label><span>Adjustments</span><input value={exitAdjustments} onChange={event => setExitAdjustments(event.target.value)} placeholder="Final salary, leave encashment, recoveries"/></label>
      </div>
      {exitRecorded && <SavedNotice>{`Exit recorded for ${exitDate} ${exitTime} · vacancy visible in Recruitment.`}</SavedNotice>}
      <div className="form-footer exit-initiate-footer"><button className="primary-button" disabled={exitRecorded || !exitReason.trim()} onClick={initiateExit}><CheckCircle/>{exitRecorded ? "Exit recorded" : "Record exit and create vacancy"}</button></div>
    </Panel>
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

export function PenaltiesScreen({ onBack, role = "Owner" }: { onBack: () => void; role?: Role }) {
  const notifyPenalty = useToast();
  const [employee, setEmployee] = useState("Fathima N");
  const [complaint, setComplaint] = useState("CL-1082 · Sleeping at assigned post");
  const [applied, setApplied] = useState(false);
  const duplicate = employee === "Rajeev Kumar";
  const admin = canManageSalary(role);
  const [exceptionEmployee, setExceptionEmployee] = useState("BMG-1840");
  const [exceptionAmount, setExceptionAmount] = useState(500);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionSaved, setExceptionSaved] = useState(false);
  return <>
    <PageHeader title="Penalties & exceptions" description="Complaint-linked penalties and admin-level office exception deductions." actions={<BackButton onBack={onBack}/>} />
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
    <div className="split-layout">
      <Panel title="Office exception deduction" description="Admin-level manual deduction for special situations. Appears in payroll as an office-exception line.">
        <div className="form-stack">
          <label><span>Employee</span><select value={exceptionEmployee} onChange={event => { setExceptionEmployee(event.target.value); setExceptionSaved(false); }}>{employeeRecords.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Deduction amount</span><div className="input-prefix"><b>₹</b><input type="number" min={1} value={exceptionAmount} onChange={event => setExceptionAmount(Number(event.target.value))}/></div></label>
          <label><span>Reason</span><textarea rows={3} value={exceptionReason} onChange={event => setExceptionReason(event.target.value)} placeholder="Why this exception applies (kept in the audit history)"/></label>
          <label><span>Effective payroll</span><input type="month" defaultValue="2026-09"/></label>
          {!admin && <div className="inline-alert warning"><WarningCircle/><span>Only Owner, Branch Manager, Finance or HR can create an office exception deduction.</span></div>}
          {exceptionSaved && <SavedNotice>Office exception deduction recorded · appears in payroll as &quot;office-exception&quot;.</SavedNotice>}
          <button className="primary-button" disabled={!admin || exceptionSaved || !exceptionReason.trim()} onClick={() => { setExceptionSaved(true); notifyPenalty("Office exception deduction recorded"); }}><Wallet/>{exceptionSaved ? "Deduction recorded" : "Create exception deduction"}</button>
        </div>
      </Panel>
      <Panel title="How exceptions differ" description="Penalties are complaint-linked; exceptions are discretionary.">
        <div className="rule-summary">
          <div><span>Source</span><strong>Office decision</strong></div>
          <div><span>Amount</span><strong>Free, not fixed ₹500</strong></div>
          <div><span>Approval</span><strong>Admin roles only</strong></div>
          <p>Use for one-off recoveries that have no complaint behind them — damaged property, canteen dues, or a correction agreed with the employee. The reason is mandatory and retained.</p>
        </div>
      </Panel>
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
  const canSeeSalary=canManageSalary(role);
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
