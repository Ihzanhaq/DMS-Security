"use client";

import { useState } from "react";
import { ChatCircleText, CheckCircle, ClockCountdown, Plus, WarningCircle } from "@phosphor-icons/react";
import { employees, tickets as ticketSeed } from "@/lib/mock-data";
import {
  DetailDrawer, PageHeader, Panel, PersonCell, StatStrip, Status, Timeline, Toolbar,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";
import type { Ticket, TicketCategory } from "@/types/domain";

const TODAY = "2026-09-22";
const categoryLabels: Record<TicketCategory, string> = {
  salary: "Salary", attendance: "Attendance", uniform: "Uniform", "site-issue": "Site issue", other: "Other",
};

export function TicketsScreen() {
  const notify = useToast();
  const [rows, setRows] = useState<Ticket[]>(ticketSeed);
  const [filter, setFilter] = useState("All categories");
  const [open, setOpen] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newCategory, setNewCategory] = useState<TicketCategory>("other");

  const visible = rows.filter(ticket => filter === "All categories" || categoryLabels[ticket.category] === filter);
  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const current = open ? rows.find(ticket => ticket.id === open.id) ?? open : null;

  const patch = (id: string, changes: Partial<Ticket>) =>
    setRows(rowsNow => rowsNow.map(ticket => ticket.id === id ? { ...ticket, ...changes } : ticket));

  const sendReply = () => {
    if (!current || !reply.trim()) return;
    patch(current.id, { trail: [...current.trail.map(entry => ({ ...entry, state: "done" as const })), { title: reply.trim(), time: `${TODAY} · now`, state: "active" as const }], status: current.status === "open" ? "in-progress" : current.status });
    setReply("");
    notify("Reply added to the ticket trail");
  };

  const createTicket = () => {
    if (!newSubject.trim()) return;
    const ticket: Ticket = {
      id: `TKT-${1044 + rows.length}`, raisedBy: "Office desk", raisedByRole: "HR",
      category: newCategory, subject: newSubject.trim(), detail: newDetail.trim(),
      status: "open", createdOn: TODAY, sla: "2026-09-25", assignee: "Meera Nair",
      trail: [{ title: "Logged manually", time: `${TODAY} · now`, state: "active" }],
    };
    setRows(rowsNow => [ticket, ...rowsNow]);
    setCreating(false); setNewSubject(""); setNewDetail("");
    notify(`${ticket.id} created`);
  };

  return <>
    <PageHeader title="Tickets" description="Open ticketing for guards, clients and staff — salary doubts, uniform issues and anything else."
      actions={<button className="primary-button" onClick={() => setCreating(true)}><Plus/>New ticket</button>}/>
    <StatStrip items={[
      { icon: ChatCircleText, value: String(rows.filter(ticket => ticket.status === "open").length), label: "Open", note: "Awaiting first response", tone: "orange" },
      { icon: ClockCountdown, value: String(rows.filter(ticket => ticket.status === "in-progress").length), label: "In progress", note: "Being worked", tone: "violet" },
      { icon: CheckCircle, value: String(rows.filter(ticket => ticket.status === "resolved").length), label: "Resolved", note: "This month", tone: "green" },
      { icon: WarningCircle, value: String(rows.filter(ticket => ticket.status !== "resolved" && ticket.sla < TODAY).length), label: "SLA breached", note: "Past response date", tone: "red" },
    ]}/>
    <Toolbar>
      <select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Category filter">
        <option>All categories</option>{Object.values(categoryLabels).map(label => <option key={label}>{label}</option>)}
      </select>
      <button className="secondary-button" onClick={() => setFilter("All categories")}>Reset</button>
      <span className="toolbar-count">{visible.length} tickets</span>
    </Toolbar>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Ticket</th><th>Raised by</th><th>Category</th><th>Subject</th><th>SLA</th><th>Assignee</th><th>Status</th></tr></thead><tbody>
      {visible.map(ticket => {
        const employee = employeeOf(ticket.raisedBy);
        return <tr key={ticket.id} tabIndex={0} onClick={() => setOpen(ticket)} onKeyDown={event => { if (event.key === "Enter") setOpen(ticket); }}>
          <td><strong>{ticket.id}</strong></td>
          <td>{employee ? <PersonCell name={employee.name} id={employee.id} phone={employee.phone}/> : ticket.raisedBy}</td>
          <td><Status tone={ticket.category === "salary" ? "info" : "neutral"}>{categoryLabels[ticket.category]}</Status></td>
          <td className="wrap-cell">{ticket.subject}</td>
          <td>{ticket.sla}</td><td>{ticket.assignee}</td>
          <td><Status tone={ticket.status === "resolved" ? "success" : ticket.status === "in-progress" ? "info" : "warning"}>{ticket.status}</Status></td>
        </tr>;
      })}
    </tbody></table></div></Panel>

    {current && <DetailDrawer title={current.id} subtitle={`${categoryLabels[current.category]} · raised by ${employeeOf(current.raisedBy)?.name ?? current.raisedBy}`} onClose={() => setOpen(null)}
      footer={<>
        <button className="secondary-button" onClick={() => setOpen(null)}>Close</button>
        <button className="primary-button" disabled={current.status === "resolved"} onClick={() => { patch(current.id, { status: "resolved" }); notify(`${current.id} resolved`); setOpen(null); }}><CheckCircle/>Resolve ticket</button>
      </>}>
      <div className="drawer-section">
        <h3>{current.subject}</h3>
        <p style={{ margin: "0 0 14px", fontSize: "var(--fs-sm)", lineHeight: 1.55 }}>{current.detail}</p>
        <div className="form-stack" style={{ padding: 0 }}>
          <label><span>Status</span><select value={current.status} onChange={event => patch(current.id, { status: event.target.value as Ticket["status"] })}><option value="open">Open</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option></select></label>
          <label><span>Assignee</span><select value={current.assignee} onChange={event => patch(current.id, { assignee: event.target.value })}><option>Meera Nair</option><option>Store desk</option><option>Nithin Joseph</option><option>Divya Menon</option></select></label>
        </div>
      </div>
      <div className="drawer-section">
        <h3>Trail</h3>
        <Timeline entries={current.trail}/>
      </div>
      <div className="drawer-section">
        <h3>Reply</h3>
        <div className="form-stack" style={{ padding: 0 }}>
          <label><span>Add to trail</span><textarea rows={3} value={reply} onChange={event => setReply(event.target.value)} placeholder="What was checked, decided or communicated?"/></label>
          <button className="secondary-button" onClick={sendReply}>Add reply</button>
        </div>
      </div>
    </DetailDrawer>}

    {creating && <DetailDrawer title="New ticket" subtitle="Logged on behalf of a caller or walk-in" onClose={() => setCreating(false)}
      footer={<>
        <button className="secondary-button" onClick={() => setCreating(false)}>Cancel</button>
        <button className="primary-button" onClick={createTicket}><Plus/>Create ticket</button>
      </>}>
      <div className="drawer-section">
        <h3>Details</h3>
        <div className="form-stack" style={{ padding: 0 }}>
          <label><span>Category</span><select value={newCategory} onChange={event => setNewCategory(event.target.value as TicketCategory)}>{(Object.keys(categoryLabels) as TicketCategory[]).map(key => <option key={key} value={key}>{categoryLabels[key]}</option>)}</select></label>
          <label><span>Subject</span><input value={newSubject} onChange={event => setNewSubject(event.target.value)} placeholder="One-line summary"/></label>
          <label><span>Detail</span><textarea rows={4} value={newDetail} onChange={event => setNewDetail(event.target.value)} placeholder="What happened, who reported it, what is expected"/></label>
        </div>
      </div>
    </DetailDrawer>}
  </>;
}
