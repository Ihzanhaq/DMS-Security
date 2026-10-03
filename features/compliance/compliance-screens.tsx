"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  CheckCircle, ClipboardText, CloudArrowUp, DownloadSimple,
  FileCsv, FileText, GearSix, Plus, UsersThree, WarningCircle,
} from "@phosphor-icons/react";
import {
  attendanceRows, complaintTrail, complaints, customFieldDefs as customFieldSeed, deductionLog, documentChecklist as documentChecklistSeed, employees,
  exportTemplates, lateAndAbsent, payrollRows, rupees, sites, sopDocuments, uniformPlans,
} from "@/lib/mock-data";
import { applyTemplate, toCsv } from "@/lib/export-mapper";
import type { CustomFieldDef, ExportColumn, ExportTemplate } from "@/types/domain";
import {
  DefRows, DetailDrawer, PageHeader, Panel, StatStrip, Status, Timeline, Toolbar,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";

export function ComplaintsScreen({ onCreate }: { onCreate:()=>void }) {
  const notify=useToast();
  const [filter,setFilter]=useState("All complaints");
  const [open,setOpen]=useState<(typeof complaints)[number]|null>(null);
  const [resolved,setResolved]=useState<string[]>([]);
  const rows=complaints.filter(item=>filter==="All complaints"||item.state===filter);
  const stateOf=(item:(typeof complaints)[number])=>resolved.includes(item.id)?"Resolved":item.state;

  return <>
    <PageHeader title="Client complaints" description="Investigation, SLA tracking and verified closure." actions={<button className="primary-button" onClick={onCreate}><Plus/>Log complaint</button>}/>
    <StatStrip items={[
      {icon:ClipboardText,value:"18",label:"Open complaints",note:"Across 12 clients"},
      {icon:WarningCircle,value:"4",label:"SLA at risk",note:"Due within 6 hours",tone:"red"},
      {icon:CheckCircle,value:"91%",label:"Closed on time",note:"Last 30 days",tone:"green"},
      {icon:UsersThree,value:"2",label:"Withdrawals",note:"Pending HR review",tone:"orange"},
    ]}/>
    <Toolbar><select value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Complaint status"><option>All complaints</option><option>Investigating</option><option>Assigned</option><option>Resolved</option></select><button className="secondary-button" onClick={()=>setFilter("All complaints")}>Reset</button><span className="toolbar-count">{rows.length} records</span></Toolbar>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Complaint</th><th>Client / site</th><th>Issue</th><th>Owner</th><th>SLA due</th><th>Priority</th><th>Status</th></tr></thead><tbody>
      {rows.map(item=><tr key={item.id} tabIndex={0} onClick={()=>setOpen(item)} onKeyDown={event=>{if(event.key==="Enter")setOpen(item)}}>
        <td><strong>{item.id}</strong></td><td>{item.client}</td><td>{item.issue}</td><td>{item.owner}</td><td>{item.due}</td>
        <td><Status tone={item.priority==="High"?"danger":item.priority==="Medium"?"warning":"neutral"}>{item.priority}</Status></td>
        <td><Status tone={stateOf(item)==="Resolved"?"success":"info"}>{stateOf(item)}</Status></td>
      </tr>)}
    </tbody></table></div></Panel>

    {open&&<ComplaintDrawer
      complaint={open}
      state={stateOf(open)}
      onClose={()=>setOpen(null)}
      onResolve={reason=>{ setResolved(current=>[...current,open.id]); setOpen(null); notify(`${open.id} closed · ${reason}`); }}/>}
  </>;
}

function ComplaintDrawer({ complaint, state, onClose, onResolve }: {
  complaint:(typeof complaints)[number]; state:string; onClose:()=>void; onResolve:(reason:string)=>void;
}) {
  const [reason,setReason]=useState("Resolved with the client");
  const [note,setNote]=useState("");
  const trail=complaintTrail[complaint.id] ?? [];
  const closed=state==="Resolved";

  return <DetailDrawer title={complaint.id} subtitle={`${complaint.client} · logged by client`} onClose={onClose}
    footer={closed
      ? <button className="secondary-button" onClick={onClose}>Close</button>
      : <>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={()=>onResolve(reason)}><CheckCircle/>Close complaint</button>
        </>}>
    <div className="drawer-section">
      <h3>Complaint</h3>
      <p style={{ margin:"0 0 14px", fontSize:"var(--fs-sm)", lineHeight:1.55 }}>{complaint.issue}</p>
      <DefRows rows={[
        { label:"Status", value:<Status tone={closed?"success":"info"}>{state}</Status> },
        { label:"Priority", value:<Status tone={complaint.priority==="High"?"danger":complaint.priority==="Medium"?"warning":"neutral"}>{complaint.priority}</Status> },
        { label:"Assigned owner", value:complaint.owner },
        { label:"SLA due", value:complaint.due, mono:true },
      ]}/>
    </div>
    {!closed&&complaint.priority==="High"&&<div className="drawer-section">
      <div className="inline-alert warning"><WarningCircle/><span>This complaint breaches its SLA if it is not closed by {complaint.due}. Escalation goes to district operations and HR.</span></div>
    </div>}
    <div className="drawer-section">
      <h3>Investigation trail</h3>
      <Timeline entries={trail}/>
    </div>
    {!closed&&<>
      <div className="drawer-section">
        <h3>Investigation note</h3>
        <textarea value={note} onChange={event=>setNote(event.target.value)} rows={3} placeholder="Record findings, evidence and the corrective action taken." style={{ width:"100%", padding:"9px 10px", borderRadius:"var(--r)", border:"1px solid var(--line-strong)", background:"var(--surface)", color:"var(--ink)", fontSize:"var(--fs-sm)", resize:"vertical" }}/>
      </div>
      <div className="drawer-section">
        <h3>Closure reason</h3>
        <select value={reason} onChange={event=>setReason(event.target.value)} aria-label="Closure reason" style={{ width:"100%", height:32 }}>
          <option>Resolved with the client</option>
          <option>Guard counselled, no withdrawal</option>
          <option>Guard withdrawn from site</option>
          <option>Not attributable to BMG</option>
        </select>
        {reason==="Guard withdrawn from site"&&<div className="inline-alert warning" style={{ marginTop:12 }}><WarningCircle/><span>A verified withdrawal applies a one-time ₹500 penalty. It is never charged twice for the same employee, even after reinstatement.</span></div>}
      </div>
    </>}
  </DetailDrawer>;
}

export function SopsScreen({ onCreate }: { onCreate:()=>void }) {
  const notify=useToast();
  const [open,setOpen]=useState<(typeof sopDocuments)[number]|null>(null);
  return <>
    <PageHeader title="Site SOPs" description="Versioned post instructions and employee acknowledgement." actions={<button className="primary-button" onClick={onCreate}><Plus/>New SOP</button>}/>
    <div className="document-grid">{sopDocuments.map(doc=><article className="document-card" key={doc.title}>
      <div className="document-icon"><FileText/></div><Status tone={doc.state==="Complete"?"success":"warning"}>{doc.state==="Complete"?"Complete":"Acknowledgement pending"}</Status>
      <h3>{doc.title}</h3><p>{doc.site} · {doc.category}</p>
      <dl><div><dt>Current version</dt><dd>v{doc.version}</dd></div><div><dt>Acknowledged</dt><dd>{doc.ack}</dd></div></dl>
      <button className="secondary-button" onClick={()=>setOpen(doc)}>Open document</button>
    </article>)}</div>

    {open&&<DetailDrawer title={open.title} subtitle={`${open.site} · ${open.category}`} onClose={()=>setOpen(null)}
      footer={<>
        <button className="secondary-button" onClick={()=>setOpen(null)}>Close</button>
        <button className="primary-button" onClick={()=>{notify(`${open.title} sent to all assigned guards`);setOpen(null)}}>Publish to guards</button>
      </>}>
      <div className="sop-meta"><span>Version {open.version}</span><span>Effective {open.effective}</span><span>Acknowledged {open.ack}</span></div>
      <div className="sop-body">
        {open.sections.map(section=><div key={section.heading}>
          <h4>{section.heading}</h4>
          <ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol>
        </div>)}
      </div>
    </DetailDrawer>}
  </>;
}

/* ---------------------------------------------------------------------------
   Reporting engine
   -------------------------------------------------------------------------*/

/** `numeric` right-aligns and tabulates; `currency` additionally formats as
    rupees. Counts must stay plain, so the two are deliberately separate. */
type Column = { label: string; numeric?: boolean; currency?: boolean };
type ReportSpec = { columns: Column[]; rows: (string | number)[][] };
type Filters = { district: string; client: string; employee: string };

const reportNames = [
  "Attendance summary",
  "Late login & absenteeism",
  "Statutory contributions",
  "Deduction log",
  "Net payout register",
  "Uniform recovery",
  "Site coverage",
  "Complaint SLA",
];

function buildReport(report: string, filters: Filters): ReportSpec {
  const byEmployee = (name: string) => filters.employee === "All employees" || filters.employee === name;
  const byDistrict = (district: string) => filters.district === "All districts" || filters.district === district;
  const siteDistrict = (siteName: string) => sites.find(site => site.name === siteName)?.district ?? "—";
  const siteClient = (siteName: string) => sites.find(site => site.name === siteName)?.client ?? "—";
  const byClient = (client: string) => filters.client === "All clients" || filters.client === client;

  switch (report) {
    case "Late login & absenteeism":
      return {
        columns: [{ label:"Employee" }, { label:"Site" }, { label:"District" }, { label:"Expected" }, { label:"Punch" }, { label:"Delay" }, { label:"Status" }],
        rows: lateAndAbsent
          .filter(row => byEmployee(row.employee) && byDistrict(row.district))
          .map(row => [row.employee, row.site, row.district, row.due, row.punch, row.delay, row.state]),
      };
    case "Statutory contributions":
      return {
        columns: [{ label:"Employee" }, { label:"Duties" }, { label:"Gross", numeric:true, currency:true }, { label:"Employee PF", numeric:true, currency:true }, { label:"Employee ESI", numeric:true, currency:true }],
        rows: payrollRows.filter(row => byEmployee(row.employee)).map(row => [row.employee, row.duties, row.gross, row.pf, row.esi]),
      };
    case "Deduction log":
      return {
        columns: [{ label:"Employee" }, { label:"Site" }, { label:"Deduction" }, { label:"Detail" }, { label:"Amount", numeric:true, currency:true }],
        rows: deductionLog
          .filter(row => byEmployee(row.employee) && byDistrict(siteDistrict(row.site)) && byClient(siteClient(row.site)))
          .map(row => [row.employee, row.site, row.kind, row.note, row.amount]),
      };
    case "Net payout register":
      return {
        columns: [{ label:"Employee" }, { label:"Duties" }, { label:"Gross", numeric:true, currency:true }, { label:"Deductions", numeric:true, currency:true }, { label:"Net payable", numeric:true, currency:true }],
        rows: payrollRows.filter(row => byEmployee(row.employee)).map(row => [row.employee, row.duties, row.gross, row.pf + row.esi + row.deductions, row.net]),
      };
    case "Uniform recovery":
      return {
        columns: [{ label:"Recovery plan" }, { label:"Paid upfront", numeric:true, currency:true }, { label:"Salary deduction", numeric:true, currency:true }, { label:"Total", numeric:true, currency:true }, { label:"Employees", numeric:true }],
        rows: uniformPlans.map(plan => [plan.name, plan.upfront, plan.deduction, plan.total, plan.people]),
      };
    case "Site coverage":
      return {
        columns: [{ label:"Site" }, { label:"Client" }, { label:"District" }, { label:"Posts", numeric:true }, { label:"Staffed", numeric:true }, { label:"Coverage" }],
        rows: sites
          .filter(site => byDistrict(site.district) && byClient(site.client))
          .map(site => [site.name, site.client, site.district, site.posts, site.staffed, `${site.coverage}%`]),
      };
    case "Complaint SLA":
      return {
        columns: [{ label:"Complaint" }, { label:"Client / site" }, { label:"Issue" }, { label:"Owner" }, { label:"SLA due" }, { label:"Status" }],
        rows: complaints
          .filter(item => byClient(siteClient(item.client)) && byDistrict(siteDistrict(item.client)))
          .map(item => [item.id, item.client, item.issue, item.owner, item.due, item.state]),
      };
    default:
      return {
        columns: [{ label:"Employee" }, { label:"Site" }, { label:"Shift" }, { label:"Punch" }, { label:"Duty", numeric:true }, { label:"Status" }],
        rows: attendanceRows
          .filter(row => byEmployee(row.employee) && byDistrict(siteDistrict(row.site)) && byClient(siteClient(row.site)))
          .map(row => [row.employee, row.site, row.shift, row.punch, row.duty, row.state]),
      };
  }
}

const identityColumns=(columnsSpec:{label:string}[]):ExportColumn[]=>columnsSpec.map(column=>({ source:column.label, header:column.label, include:true }));

export function ReportsScreen() {
  const notify=useToast();
  const [report,setReport]=useState(reportNames[0]);
  const [filters,setFilters]=useState<Filters>({ district:"All districts", client:"All clients", employee:"All employees" });
  const [ranAt,setRanAt]=useState<string|null>(null);
  const spec=useMemo(()=>buildReport(report,filters),[report,filters]);
  const [templates,setTemplates]=useState<ExportTemplate[]>(()=>{
    if(typeof window==="undefined") return exportTemplates;
    try{
      const stored=JSON.parse(window.localStorage.getItem("bmg-export-templates")??"[]") as ExportTemplate[];
      return [...exportTemplates,...stored.filter(item=>!exportTemplates.some(seeded=>seeded.name===item.name))];
    }catch{ return exportTemplates; }
  });
  const [templateName,setTemplateName]=useState("");
  const [mapColumns,setMapColumns]=useState<ExportColumn[]>(identityColumns(spec.columns));
  const selectReport=(next:string)=>{
    setReport(next);
    setRanAt(null);
    setMapColumns(identityColumns(buildReport(next,filters).columns));
  };
  const moveColumn=(index:number,direction:-1|1)=>setMapColumns(current=>{
    const next=[...current]; const target=index+direction;
    if(target<0||target>=next.length) return current;
    [next[index],next[target]]=[next[target],next[index]];
    return next;
  });
  const saveTemplate=()=>{
    if(!templateName.trim())return;
    const template:ExportTemplate={ name:templateName.trim(), report, columns:mapColumns };
    setTemplates(current=>{
      const next=[...current.filter(item=>item.name!==template.name),template];
      window.localStorage.setItem("bmg-export-templates",JSON.stringify(next.filter(item=>item.name!=="Default CSV")));
      return next;
    });
    notify(`Template "${template.name}" saved`);
  };
  const loadTemplate=(name:string)=>{
    const template=templates.find(item=>item.name===name);
    if(!template)return;
    setMapColumns(template.columns.length?template.columns:identityColumns(spec.columns));
    notify(`Template "${name}" loaded`);
  };
  const exportCsv=()=>{
    const mapped=applyTemplate(spec.columns,spec.rows as (string|number)[][],{ name:"live", report, columns:mapColumns });
    const csv=toCsv(mapped.headers,mapped.rows);
    const url=URL.createObjectURL(new Blob([csv],{ type:"text/csv" }));
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download=`${report.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`${report} exported · ${mapped.rows.length} rows · ${mapped.headers.length} columns`);
  };

  const districts=useMemo(()=>["All districts",...Array.from(new Set(sites.map(site=>site.district)))],[]);
  const clients=useMemo(()=>["All clients",...Array.from(new Set(sites.map(site=>site.client)))],[]);
  const names=useMemo(()=>["All employees",...employees.map(employee=>employee.name)],[]);

  const totals=spec.columns.map((column,index)=>column.numeric
    ? spec.rows.reduce((sum,row)=>sum+(typeof row[index]==="number"?(row[index] as number):0),0)
    : null);
  const hasTotals=totals.some(value=>value!==null);

  return <>
    <PageHeader title="Reports" description="Operational and payroll reports with consistent filters and client export mapping."
      actions={<button className="primary-button" onClick={exportCsv}><DownloadSimple/>Export report</button>}/>
    <div className="report-builder">
      <Panel title="Report library" description="Select a report to configure.">
        <div className="report-list">{reportNames.map(item=><button key={item} className={report===item?"active":""} onClick={()=>selectReport(item)}><FileCsv/><span>{item}</span></button>)}</div>
      </Panel>
      <Panel title={report} description={ranAt?`Generated at ${ranAt} · ${spec.rows.length} rows`:"Set the filters, then run the report."}>
        <div className="filter-form">
          <label><span>Date from</span><input type="date" defaultValue="2026-08-01"/></label>
          <label><span>Date to</span><input type="date" defaultValue="2026-08-31"/></label>
          <label><span>District</span><select value={filters.district} onChange={event=>setFilters({...filters,district:event.target.value})}>{districts.map(item=><option key={item}>{item}</option>)}</select></label>
          <label><span>Client</span><select value={filters.client} onChange={event=>setFilters({...filters,client:event.target.value})}>{clients.map(item=><option key={item}>{item}</option>)}</select></label>
          <label><span>Employee</span><select value={filters.employee} onChange={event=>setFilters({...filters,employee:event.target.value})}>{names.map(item=><option key={item}>{item}</option>)}</select></label>
          <label><span>Grouping</span><select><option>No grouping</option><option>By site</option><option>By district</option><option>By employee</option></select></label>
        </div>
        <div className="export-mapping">
          <div className="export-mapping-head">
            <strong>Export mapping</strong>
            <small>Map system fields to the client&apos;s Excel column names — update the template when the client&apos;s format arrives.</small>
          </div>
          <div className="export-template-row">
            <select onChange={event=>{loadTemplate(event.target.value);event.target.value="";}} defaultValue="" aria-label="Load template"><option value="" disabled>Load template…</option>{templates.map(template=><option key={template.name}>{template.name}</option>)}</select>
            <input value={templateName} onChange={event=>setTemplateName(event.target.value)} placeholder="Template name (e.g. Lulu payroll format)" aria-label="Template name"/>
            <button className="secondary-button compact" onClick={saveTemplate}>Save template</button>
          </div>
          <div className="export-columns">{mapColumns.map((column,index)=><div className="export-column-row" key={column.source}>
            <input type="checkbox" checked={column.include} onChange={event=>setMapColumns(current=>current.map((item,row)=>row===index?{ ...item, include:event.target.checked }:item))} aria-label={`Include ${column.source}`}/>
            <span className="export-source">{column.source}</span>
            <input value={column.header} onChange={event=>setMapColumns(current=>current.map((item,row)=>row===index?{ ...item, header:event.target.value }:item))} aria-label={`Client header for ${column.source}`}/>
            <span className="reorder"><button onClick={()=>moveColumn(index,-1)} aria-label={`Move ${column.source} up`}>▲</button><button onClick={()=>moveColumn(index,1)} aria-label={`Move ${column.source} down`}>▼</button></span>
          </div>)}</div>
        </div>
        <button className="secondary-button run-report" onClick={()=>setRanAt(new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}))}>Run preview</button>
        <div className="report-preview">
          <div><span>Rows</span><strong>{spec.rows.length}</strong></div>
          <div><span>Columns</span><strong>{spec.columns.length}</strong></div>
          <div><span>District</span><strong>{filters.district==="All districts"?"All":filters.district}</strong></div>
          <div><span>Employee</span><strong>{filters.employee==="All employees"?"All":filters.employee.split(" ")[0]}</strong></div>
        </div>
        {ranAt&&(spec.rows.length
          ? <div className="result-scroll"><table className="result-table">
              <thead><tr>{spec.columns.map(column=><th key={column.label} className={column.numeric?"n":undefined}>{column.label}</th>)}</tr></thead>
              <tbody>{spec.rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=>
                <td key={cellIndex} className={spec.columns[cellIndex].numeric?"n":undefined}>
                  {spec.columns[cellIndex].currency&&typeof cell==="number"?rupees(cell):cell}
                </td>)}</tr>)}</tbody>
              {hasTotals&&<tfoot><tr>{spec.columns.map((column,index)=>
                <td key={column.label} className={column.numeric?"n":undefined}>
                  {index===0?"Total":totals[index]===null?"":column.currency?rupees(totals[index]!):totals[index]}
                </td>)}</tr></tfoot>}
            </table></div>
          : <div className="empty-state"><FileCsv size={26}/><strong>No rows match these filters</strong><span>Widen the district, client or employee filter.</span></div>
        )}
      </Panel>
    </div>
  </>;
}

export function ImportsScreen() {
  const notify=useToast();
  const inputRef=useRef<HTMLInputElement>(null);
  const [file,setFile] = useState<string | null>(null);
  const [step,setStep]=useState(1);
  const [kind,setKind]=useState("Employees");
  const [done,setDone]=useState(false);
  function selectFile(event:ChangeEvent<HTMLInputElement>){const picked=event.target.files?.[0];if(picked){setFile(picked.name);setStep(2);setDone(false)}}
  return <>
    <PageHeader title="Import centre" description="Validate data before it changes any employee, site or payroll record." actions={<button className="secondary-button" onClick={()=>notify(`${kind} template downloaded`)}><DownloadSimple/>Download template</button>}/>
    <div className="import-steps" data-enter>{["Choose file","Map columns","Validate","Import"].map((item,index)=><span className={step>=index+1?"active":""} key={item}><i>{step>index+1?<CheckCircle weight="fill"/>:index+1}</i>{item}</span>)}</div>
    <div className="import-layout">
      <Panel title="Import type" description="Each template has its own validation rules."><div className="type-list">{["Employees","Clients and sites","Deployment","Attendance adjustments","Salary settings","Opening balances"].map(item=><button key={item} className={kind===item?"active":""} onClick={()=>{setKind(item);setStep(1);setFile(null);setDone(false)}}>{item}<span>›</span></button>)}</div></Panel>
      <Panel title={kind} description="XLSX and CSV files up to 10 MB.">
        <input ref={inputRef} className="sr-only" type="file" accept=".xlsx,.csv" onChange={selectFile}/>
        {!file?<button className="upload-zone" onClick={()=>inputRef.current?.click()}><span><CloudArrowUp size={28}/></span><strong>Select a file to validate</strong><small>Nothing is imported until you approve the preview.</small></button>:<div className="selected-file"><span className="document-icon"><FileCsv/></span><div><strong>{file}</strong><small>Ready for column mapping</small></div><Status tone="success">Uploaded</Status></div>}
        {file&&step===2&&<><div className="mapping-grid"><span>Source column</span><span>System field</span>{[["Employee ID","Employee ID"],["Employee Name","Full name"],["Opening Balance","Uniform opening balance"]].map(pair=><div className="mapping-row" key={pair[0]}><strong>{pair[0]}</strong><select defaultValue={pair[1]}><option>{pair[1]}</option><option>Ignore column</option></select></div>)}</div><button className="primary-button import-continue" onClick={()=>setStep(3)}>Validate mapped rows</button></>}
        {file&&step===3&&<><div className="validation-summary"><span><CheckCircle weight="fill"/><strong>146 valid rows</strong></span><span><WarningCircle weight="fill"/><strong>2 rows need correction</strong></span></div><div className="validation-table"><div><strong>Row 28</strong><span>Employee ID is already in use</span><Status tone="danger">Error</Status></div><div><strong>Row 91</strong><span>Opening balance is not a valid amount</span><Status tone="warning">Review</Status></div></div><button className="primary-button import-continue" onClick={()=>setStep(4)}>Continue with valid rows</button></>}
        {file&&step===4&&<><div className="import-preview"><CheckCircle weight="fill"/><div><strong>{done?"Import completed":"146 records ready to import"}</strong><span>{done?"A batch reference and audit log were created.":"Invalid rows will remain excluded until corrected."}</span></div></div><button className="primary-button import-continue" disabled={done} onClick={()=>{setDone(true);notify(`146 ${kind.toLowerCase()} records imported`)}}>{done?"Imported":"Complete import"}</button></>}
      </Panel>
    </div>
  </>;
}

export function SettingsScreen({ onOpenAccess }: { onOpenAccess: () => void }) {
  const notify=useToast();
  const [radius,setRadius]=useState(100);
  const [unit,setUnit]=useState("0.25");
  const [saved,setSaved]=useState(false);
  const [dutyUnits,setDutyUnits]=useState(["0.25","0.50","0.75","1.00","1.50"]);
  const groups=["Organization","Onboarding","Attendance","Payroll","PF and ESI","Duty units","Notifications","Roles and access"];
  const [group,setGroup]=useState("Attendance");
  const [docTypes,setDocTypes]=useState<string[]>(documentChecklistSeed);
  const [newDocType,setNewDocType]=useState("");
  const [fieldDefs,setFieldDefs]=useState<CustomFieldDef[]>(customFieldSeed);
  return <>
    <PageHeader title="Settings" description="Effective-dated defaults with client, site, post and employee overrides." actions={<button className="primary-button" onClick={()=>{setSaved(true);notify(`${group} settings saved`);setTimeout(()=>setSaved(false),1800)}}><CheckCircle/>{saved?"Saved":"Save changes"}</button>}/>
    <div className="settings-layout">
      <Panel title="Configuration" description="Choose a group to edit."><div className="settings-nav">{groups.map(item=><button key={item} className={group===item?"active":""} onClick={()=>setGroup(item)}><GearSix/><span>{item}</span></button>)}</div></Panel>
      <Panel title={group} description="Organization default · effective 1 September 2026">
        {group==="Organization"&&<div className="settings-form">
          <label><span>Standard payable working days</span><input type="number" defaultValue="26"/><small>Monthly salary is divided by this effective denominator when scheduled days are not supplied.</small></label>
          <label><span>Advance limit</span><div className="input-suffix"><input type="number" defaultValue="40"/><b>% earned gross</b></div><small>Uses approved wages earned up to the request date.</small></label>
          <label><span>Default currency</span><select><option>INR · Indian Rupee</option></select><small>Used for payroll, recovery and client billing displays.</small></label>
          <label><span>Payroll lock day</span><input type="number" defaultValue="3"/><small>Days after month-end before final approval is required.</small></label>
        </div>}
        {group==="Attendance"&&<div className="settings-form">
          <label><span>Default geofence radius</span><div className="input-suffix"><input type="number" value={radius} onChange={event=>setRadius(Number(event.target.value))}/><b>metres</b></div><small>Sites and posts may override this value.</small></label>
          <label><span>Late-arrival grace period</span><div className="input-suffix"><input type="number" defaultValue="10"/><b>minutes</b></div><small>Alerts are generated after this period.</small></label>
          <label><span>Default duty-unit step</span><select value={unit} onChange={event=>setUnit(event.target.value)}><option>0.25</option><option>0.50</option><option>1.00</option></select><small>Quick choices remain editable in duty-unit settings.</small></label>
          <label><span>Location accuracy threshold</span><div className="input-suffix"><input type="number" defaultValue="50"/><b>metres</b></div><small>Punches above this accuracy require review.</small></label>
        </div>}
        {group==="Payroll"&&<div className="settings-form">
          <label><span>Monthly salary denominator</span><select><option>Scheduled working days</option><option>Fixed organization days</option><option>Calendar days</option></select><small>Site segments use the employee’s effective denominator.</small></label>
          <label><span>Fraction rounding</span><select><option>Two decimal duty precision</option><option>Nearest quarter duty</option></select><small>Original attendance quantity is retained for audit.</small></label>
          <label><span>Paid leave treatment</span><select><option>Include as payable duty</option><option>Separate earning component</option><option>Exclude</option></select><small>Can be overridden by employee category.</small></label>
          <label><span>Net payout rounding</span><select><option>Nearest rupee</option><option>No rounding</option></select><small>Applied after every deduction and contribution.</small></label>
        </div>}
        {group==="PF and ESI"&&<div className="settings-form">
          <label><span>Employee PF rate</span><div className="input-suffix"><input type="number" defaultValue="12"/><b>%</b></div><small>Eligibility remains configurable per employee and site segment.</small></label>
          <label><span>Employee ESI rate</span><div className="input-suffix"><input type="number" step="0.01" defaultValue="0.75"/><b>%</b></div><small>Applied only to ESI-enabled earnings.</small></label>
          <label><span>PF wage ceiling</span><div className="input-prefix"><b>₹</b><input type="number" defaultValue="15000"/></div><small>Effective-date overrides preserve previous calculations.</small></label>
          <label><span>ESI wage ceiling</span><div className="input-prefix"><b>₹</b><input type="number" defaultValue="21000"/></div><small>Eligibility is evaluated for each payroll period.</small></label>
        </div>}
        {group==="Duty units"&&<div className="duty-unit-editor">{dutyUnits.map(value=><button key={value} onClick={()=>setDutyUnits(current=>current.filter(item=>item!==value))}><strong>{value}</strong><span>Remove</span></button>)}<button className="add-unit" onClick={()=>{const next=(Number(dutyUnits.at(-1)??1)+.25).toFixed(2);setDutyUnits(current=>[...current,next])}}><Plus/>Add next quarter unit</button></div>}
        {group==="Notifications"&&<div className="toggle-list settings-toggles"><label><input type="checkbox" defaultChecked/><span><strong>9:00 AM missing-login alert</strong><small>Send the absent report directly to HR.</small></span></label><label><input type="checkbox" defaultChecked/><span><strong>Immediate vacancy alert</strong><small>Notify district operations when leave or absence opens a post.</small></span></label><label><input type="checkbox" defaultChecked/><span><strong>Night vigilance escalation</strong><small>Escalate after the configured response window.</small></span></label><label><input type="checkbox" defaultChecked/><span><strong>Complaint SLA warning</strong><small>Notify the assigned owner before the deadline.</small></span></label></div>}
        {group==="Onboarding"&&<div className="settings-form onboarding-settings">
          <div className="settings-chip-editor">
            <strong>Document checklist</strong>
            <small>Required documents collected at onboarding. Add types as clients demand them.</small>
            <div className="settings-chips">{docTypes.map(type=><button key={type} onClick={()=>setDocTypes(current=>current.filter(item=>item!==type))}>{type}<span>✕</span></button>)}</div>
            <div className="settings-chip-add"><input value={newDocType} onChange={event=>setNewDocType(event.target.value)} placeholder="Add document type (e.g. Driving licence)" aria-label="New document type"/><button className="secondary-button compact" onClick={()=>{ if(!newDocType.trim())return; setDocTypes(current=>[...current,newDocType.trim()]); setNewDocType(""); }}>Add</button></div>
          </div>
          <div className="settings-chip-editor">
            <strong>Custom profile fields</strong>
            <small>Extra fields shown on every employee form. Future needs are added here, not in code.</small>
            <div className="custom-field-rows">{fieldDefs.map((def,index)=><div key={def.key}>
              <input value={def.label} onChange={event=>setFieldDefs(current=>current.map((item,row)=>row===index?{ ...item, label:event.target.value }:item))} aria-label={`Field ${index+1} label`}/>
              <select value={def.kind} onChange={event=>setFieldDefs(current=>current.map((item,row)=>row===index?{ ...item, kind:event.target.value as CustomFieldDef["kind"] }:item))} aria-label={`Field ${index+1} kind`}><option value="text">Text</option><option value="date">Date</option><option value="number">Number</option></select>
              <button className="secondary-button compact" onClick={()=>setFieldDefs(current=>current.filter((_,row)=>row!==index))}>Remove</button>
            </div>)}</div>
            <button className="secondary-button compact" onClick={()=>setFieldDefs(current=>[...current,{ key:`field-${Date.now()}`, label:"New field", kind:"text" }])}><Plus/>Add field</button>
          </div>
          <label><span>PF/ESI alert window</span><div className="input-suffix"><input type="number" defaultValue="15"/><b>days after joining</b></div><small>HR is alerted when enrolment data has not arrived inside this window.</small></label>
        </div>}
        {group==="Roles and access"&&<div className="settings-access-pointer">
          <p>Roles, their reporting line and per-module permissions — plus individual users and their overrides — are managed on the Users &amp; roles screen.</p>
          <button className="secondary-button" data-allow onClick={onOpenAccess}>Open Users &amp; roles</button>
        </div>}
        <div className="inheritance-chain"><strong>Configuration inheritance</strong><div><span>Organization</span><b>›</b><span>Client</span><b>›</b><span>Site</span><b>›</b><span>Post</span><b>›</b><span>Employee</span></div><p>The most specific effective rule is used. Every override retains its source and start date.</p></div>
      </Panel>
    </div>
  </>;
}
