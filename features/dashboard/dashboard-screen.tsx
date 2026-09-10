import {
  Buildings, CalendarCheck, CheckCircle, ClockCountdown, MapPin,
  UsersThree, Wallet, WarningCircle,
} from "@phosphor-icons/react";
import { Panel, StatStrip, Status } from "@/components/shared/screen-elements";

const coverage = [
  ["Thiruvananthapuram", 94, 128], ["Kollam", 89, 76], ["Ernakulam", 97, 104],
  ["Alappuzha", 91, 58], ["Kottayam", 86, 42],
] as const;

export function DashboardScreen({ onNavigate }: { onNavigate: (view: string) => void }) {
  return <>
    <header className="dashboard-welcome" data-enter>
      <div><p>Thursday, 10 September 2026 · 09:24 IST</p><h1>Operations overview</h1></div>
      <div className="live-status"><i /> 421 on duty <span>Updated 2 min ago</span></div>
    </header>
    <StatStrip items={[
      { icon:UsersThree, value:"468", label:"Active personnel", note:"12 joined this month", tone:"blue" },
      { icon:Buildings, value:"214", label:"Client sites", note:"201 fully staffed", tone:"violet" },
      { icon:CalendarCheck, value:"93.8%", label:"On-time today", note:"421 of 449 punches", tone:"green" },
      { icon:WarningCircle, value:"7", label:"Open vacancies", note:"3 need action now", tone:"orange" },
    ]} />
    <div className="content-grid">
      <Panel title="District coverage" description="Today’s staffed posts by district" action={<button className="text-button" onClick={()=>onNavigate("deployment")}>View deployment</button>}>
        <div className="coverage-chart">
          {coverage.map(([name,value,posts])=><div className="coverage-row" key={name}>
            <span>{name}<small>{posts} posts</small></span>
            <div className="track"><i style={{width:value + "%"}} /></div><strong>{value}%</strong>
          </div>)}
        </div>
        <div className="coverage-summary">
          <span><i className="dot filled" />Staffed <strong>408</strong></span>
          <span><i className="dot open" />Vacant <strong>27</strong></span>
          <span className="summary-end">Overall <strong>93.8%</strong></span>
        </div>
      </Panel>
      <Panel title="Needs attention" description="Prioritized for this morning" action={<button className="more-button" onClick={()=>onNavigate("action-centre")} aria-label="Open action centre">•••</button>} className="attention-panel">
        <Action icon={MapPin} tone="red" title="3 posts still vacant" meta="Technopark and 2 other sites" time="Now" />
        <Action icon={ClockCountdown} tone="orange" title="7 late check-ins" meta="Past the site grace period" time="09:18" />
        <Action icon={Wallet} tone="blue" title="Payroll has 3 exceptions" meta="August 2026 run" time="Review" />
        <button className="full-button" onClick={()=>onNavigate("action-centre")}>Open action centre</button>
      </Panel>
    </div>
    <div className="lower-grid">
      <Panel title="Today’s shift movement" description="Live deployment changes" action={<button className="text-button" onClick={()=>onNavigate("attendance")}>All activity</button>}>
        <div className="activity-table">
          <div className="table-head"><span>Employee</span><span>Site</span><span>Shift</span><span>Status</span></div>
          <Movement name="Suresh Babu" id="BMG-1840" site="Lulu Mall, Kochi" shift="Day · 08:00" state="On site" />
          <Movement name="Fathima N" id="BMG-2274" site="Aster Medcity" shift="Day · 09:00" state="Late" late />
          <Movement name="Rajeev Kumar" id="BMG-1988" site="TCS Technopark" shift="Night · 20:00" state="Scheduled" />
        </div>
      </Panel>
      <Panel title="August payroll" description="Preparation closes in 3 days" className="payroll-card">
        <div className="payroll-progress"><div><strong>82%</strong><span>Ready</span></div></div>
        <div className="payroll-steps">
          <span><CheckCircle weight="fill" /> Attendance locked</span>
          <span><CheckCircle weight="fill" /> Deductions reviewed</span>
          <span className="pending"><ClockCountdown /> 3 exceptions open</span>
        </div>
        <button className="full-button strong" onClick={()=>onNavigate("payroll")}>Continue payroll</button>
      </Panel>
    </div>
  </>;
}

function Action({ icon: Icon, tone, title, meta, time }: { icon: typeof MapPin; tone: string; title: string; meta: string; time: string }) {
  return <div className="action-row"><span className={"action-icon " + tone}><Icon size={18} /></span><div><strong>{title}</strong><small>{meta}</small></div><b>{time}</b></div>;
}

function Movement({ name, id, site, shift, state, late=false }: { name:string; id:string; site:string; shift:string; state:string; late?:boolean }) {
  const initials=name.split(" ").map(part=>part[0]).join("").slice(0,2);
  return <div className="person-row">
    <span className="person"><i>{initials}</i><span><strong>{name}</strong><small>{id}</small></span></span>
    <span>{site}</span><span>{shift}</span><Status tone={late ? "warning" : state === "Scheduled" ? "neutral" : "success"}>{state}</Status>
  </div>;
}
