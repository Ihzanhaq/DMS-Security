"use client";

import { useMemo, useState } from "react";
import { DownloadSimple, Funnel, Plus, UploadSimple, UserCheck, UserMinus, UsersThree } from "@phosphor-icons/react";
import { employees, relieverRates, rupees, skillOptions } from "@/lib/mock-data";
import { DefRows, DetailDrawer, PageHeader, Panel, PersonCell, SkillTags, StatStrip, Status, Toolbar } from "@/components/shared/screen-elements";

export function WorkforceScreen({ onNavigate, onCreate, onEdit }: { onNavigate:(view:string)=>void; onCreate:()=>void; onEdit:()=>void }) {
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("All status");
  const [skill,setSkill]=useState("All skills");
  const [selected,setSelected]=useState<(typeof employees)[number] | null>(null);

  const rows=useMemo(()=>employees.filter(employee=>
    (status==="All status" || employee.status===status) &&
    (skill==="All skills" || employee.skills.includes(skill as (typeof skillOptions)[number])) &&
    (employee.name+" "+employee.id+" "+employee.site).toLowerCase().includes(query.toLowerCase())
  ),[query,status,skill]);

  return <>
    <PageHeader title="Workforce" description="Employee records, capability profile, deployment and exit controls."
      actions={<><button className="secondary-button" onClick={()=>onNavigate("imports")}><UploadSimple />Import</button><button className="primary-button" onClick={onCreate}><Plus />Add employee</button></>} />
    <StatStrip items={[
      {icon:UsersThree,value:"468",label:"Active personnel",note:"Across 12 districts"},
      {icon:UserCheck,value:"421",label:"Currently deployed",note:"90% of active staff",tone:"green"},
      {icon:UserMinus,value:"18",label:"Relievers",note:"Site-linked daily rates",tone:"violet"},
      {icon:DownloadSimple,value:"9",label:"Exit clearances",note:"3 blocked by dues",tone:"orange"},
    ]}/>
    <Toolbar>
      <div className="filter-search"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search name, ID or site" aria-label="Search workforce"/></div>
      <select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Filter by status"><option>All status</option><option>Active</option><option>Leave</option><option>Reliever</option></select>
      <select value={skill} onChange={event=>setSkill(event.target.value)} aria-label="Filter by skill"><option>All skills</option>{skillOptions.map(item=><option key={item}>{item}</option>)}</select>
      <button className="secondary-button" onClick={()=>{setStatus("All status");setSkill("All skills");setQuery("")}}><Funnel />Reset filters</button>
      <span className="toolbar-count">{rows.length} employees</span>
    </Toolbar>
    <Panel className="table-panel">
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Role</th><th>District</th><th>Current site</th><th>Shift</th><th>Capabilities</th><th>Pay basis</th><th>Benefits</th><th>Status</th></tr></thead>
      <tbody>{rows.map(employee=><tr key={employee.id} onClick={()=>setSelected(employee)} tabIndex={0} onKeyDown={event=>{if(event.key==="Enter")setSelected(employee)}}>
        <td><PersonCell name={employee.name} id={employee.id}/></td><td>{employee.role}</td><td>{employee.district}</td><td>{employee.site}</td><td>{employee.shift}</td>
        <td><SkillTags skills={employee.skills}/></td>
        <td>{employee.dailyRate?`${rupees(employee.dailyRate)} / duty`:rupees(employee.salary)}</td>
        <td><span className="benefit-list">{employee.pf&&<b>PF</b>}{employee.esi&&<b>ESI</b>}{!employee.pf&&!employee.esi&&<span>Salary only</span>}</span></td>
        <td><Status tone={employee.status==="Active"?"success":employee.status==="Leave"?"warning":"info"}>{employee.status}</Status></td>
      </tr>)}</tbody></table>{rows.length===0&&<div className="empty-state"><UsersThree size={28}/><strong>No employees found</strong><span>Try changing the search, status or skill filter.</span></div>}</div>
    </Panel>

    {status==="Reliever"&&<Panel title="Reliever day rates" description="The tier applied depends on the site and the capability required." className="rate-panel">
      <div className="data-table-wrap"><table className="data-table" style={{ minWidth:0 }}><thead><tr><th>Rate</th><th>Tier</th><th>Applies to</th><th>On this list</th></tr></thead>
      <tbody>{relieverRates.map(tier=><tr key={tier.rate}>
        <td><strong>{rupees(tier.rate)}</strong></td><td>{tier.label}</td><td>{tier.applies}</td>
        <td>{rows.filter(employee=>employee.dailyRate===tier.rate).length}</td>
      </tr>)}</tbody></table></div>
    </Panel>}

    {selected&&<DetailDrawer title={selected.name} subtitle={`${selected.id} · ${selected.role}`} avatar={selected.initials} onClose={()=>setSelected(null)}
      footer={<><button className="secondary-button" onClick={()=>setSelected(null)}>Close</button><button className="primary-button" onClick={onEdit}>Edit profile</button></>}>
      <div className="drawer-section">
        <h3>Current employment</h3>
        <DefRows rows={[
          { label:"Site", value:selected.site },
          { label:"District", value:selected.district },
          { label:"Shift", value:selected.shift },
          { label:"Phone", value:selected.phone, mono:true },
        ]}/>
      </div>
      <div className="drawer-section">
        <h3>Capability profile</h3>
        <SkillTags skills={selected.skills}/>
        <p style={{ margin:"12px 0 0", fontSize:"var(--fs-xs)", color:"var(--muted)", lineHeight:1.55 }}>
          Capabilities decide which posts this employee is eligible for, and which reliever rate tier applies when they cover a shift.
        </p>
      </div>
      <div className="drawer-section">
        <h3>Salary configuration</h3>
        <DefRows rows={[
          { label:"Pay basis", value:selected.dailyRate?"Fixed duty rate":"Monthly salary" },
          { label:selected.dailyRate?"Rate per duty":"Monthly salary", value:rupees(selected.dailyRate ?? selected.salary), mono:true },
          { label:"PF", value:selected.pf?"Enabled":"Not enabled" },
          { label:"ESI", value:selected.esi?"Enabled":"Not enabled" },
        ]}/>
        <p className="inheritance-note" style={{ marginTop:14 }}>Employee override · Effective 01 Aug 2026</p>
      </div>
    </DetailDrawer>}
  </>;
}
