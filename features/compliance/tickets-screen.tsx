"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, Plus } from "lucide-react";
import { employees, tickets as ticketSeed } from "@/lib/mock-data";
import {
  Button, DataTable, DetailDrawer, EmptyState, Field, FilterChips, FormStack, Input, ListFilterRow, PageHeader,
  Panel, PersonCell, SearchBar, Section, Select, StatStrip, StatusChip, Textarea, Timeline, type StatusTone,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { NAV } from "@/lib/labels";
import type { Ticket, TicketCategory } from "@/types/domain";

const categoryLabels: Record<TicketCategory, string> = {
  salary: "Salary", attendance: "Attendance", uniform: "Uniform", "site-issue": "Site issue", other: "Other",
};
const statusLabels: Record<Ticket["status"], string> = { open: "Open", "in-progress": "In progress", resolved: "Resolved" };
const statusTone = (status: Ticket["status"]): StatusTone => status === "resolved" ? "success" : status === "in-progress" ? "info" : "warning";
type CategoryFilter = "all" | TicketCategory;

export function TicketsScreen({ startCreating = false }: { startCreating?: boolean }) {
  const notify = useToast();
  const [rows, setRows] = useState<Ticket[]>(ticketSeed);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [creating, setCreating] = useState(startCreating);
  const [newSubject, setNewSubject] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newCategory, setNewCategory] = useState<TicketCategory>("other");

  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const q = query.trim().toLowerCase();
  const visible = rows.filter(ticket => (filter === "all" || ticket.category === filter)
    && (!q || [ticket.id, ticket.subject, ticket.assignee, employeeOf(ticket.raisedBy)?.name ?? ticket.raisedBy].some(value => value.toLowerCase().includes(q))));
  const current = open ? rows.find(ticket => ticket.id === open.id) ?? open : null;

  const patch = (id: string, changes: Partial<Ticket>) =>
    setRows(rowsNow => rowsNow.map(ticket => ticket.id === id ? { ...ticket, ...changes } : ticket));

  const sendReply = () => {
    if (!current || !reply.trim()) return;
    patch(current.id, { trail: [...current.trail.map(entry => ({ ...entry, state: "done" as const })), { title: reply.trim(), time: `${formatAppDate(APP_TODAY)} · now`, state: "active" as const }], status: current.status === "open" ? "in-progress" : current.status });
    setReply("");
    notify("Reply added");
  };

  const createTicket = () => {
    if (!newSubject.trim()) return;
    const ticket: Ticket = {
      id: `TKT-${1044 + rows.length}`, raisedBy: "Office desk", raisedByRole: "HR",
      category: newCategory, subject: newSubject.trim(), detail: newDetail.trim(),
      status: "open", createdOn: APP_TODAY, sla: "2026-09-25", assignee: "Meera Nair",
      trail: [{ title: "Logged by the office", time: `${formatAppDate(APP_TODAY)} · now`, state: "active" }],
    };
    setRows(rowsNow => [ticket, ...rowsNow]);
    setCreating(false); setNewSubject(""); setNewDetail("");
    notify(`${ticket.id} created`);
  };

  return <>
    <PageHeader title={NAV.tickets} subtitle="Questions from guards, clients and staff — salary, uniform, attendance and anything else."
      actions={<Button onClick={() => setCreating(true)}><Plus />New ticket</Button>} />
    <StatStrip items={[
      { icon: MessageSquare, value: String(rows.filter(ticket => ticket.status === "open").length), label: "Open", note: "Waiting for a first reply", tone: "orange" },
      { icon: Clock, value: String(rows.filter(ticket => ticket.status === "in-progress").length), label: "In progress", note: "Being worked on" },
      { icon: CheckCircle2, value: String(rows.filter(ticket => ticket.status === "resolved").length), label: "Resolved", note: "This month", tone: "green" },
      { icon: AlertTriangle, value: String(rows.filter(ticket => ticket.status !== "resolved" && ticket.sla < APP_TODAY).length), label: "Overdue", note: "Past the reply deadline", tone: "red" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by ID, subject, person or assignee" />
    <ListFilterRow>
      <FilterChips<CategoryFilter> options={[{ id: "all", label: "All" }, ...(Object.keys(categoryLabels) as TicketCategory[]).map(key => ({ id: key, label: categoryLabels[key] }))]} value={filter} onChange={setFilter} />
      <span className="text-xs text-muted">{visible.length} of {rows.length} tickets</span>
    </ListFilterRow>
    <Panel flush>
      <DataTable rows={visible} rowKey={row => row.id} onRowClick={setOpen}
        empty={<div className="p-4"><EmptyState icon={MessageSquare} message={rows.length ? "No tickets match these filters." : "No tickets yet."} actionLabel={rows.length ? "Clear filters" : "New ticket"} onAction={rows.length ? () => { setFilter("all"); setQuery(""); } : () => setCreating(true)} /></div>}
        columns={[
          { header: "Ticket", cell: row => <span><strong className="block text-sm">{row.subject}</strong><small className="text-xs text-muted">{row.id}</small></span> },
          { header: "Raised by", cell: row => { const employee = employeeOf(row.raisedBy); return employee ? <PersonCell name={employee.name} id={employee.id} phone={employee.phone} /> : row.raisedBy; } },
          { header: "Category", cell: row => <StatusChip tone={row.category === "salary" ? "info" : "neutral"}>{categoryLabels[row.category]}</StatusChip>, hideOnMobile: true },
          { header: "Reply by", cell: row => <span className={row.status !== "resolved" && row.sla < APP_TODAY ? "font-semibold text-status-danger" : ""}>{formatAppDate(row.sla)}</span> },
          { header: "Assignee", cell: row => row.assignee, hideOnMobile: true },
          { header: "Status", cell: row => <StatusChip tone={statusTone(row.status)}>{statusLabels[row.status]}</StatusChip> },
        ]} />
    </Panel>

    {current && <DetailDrawer title={current.subject} subtitle={`${current.id} · ${categoryLabels[current.category]} · raised by ${employeeOf(current.raisedBy)?.name ?? current.raisedBy}`} onClose={() => setOpen(null)}
      footer={<>
        <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
        <Button disabled={current.status === "resolved"} onClick={() => { patch(current.id, { status: "resolved" }); notify(`${current.id} resolved`); setOpen(null); }}><CheckCircle2 />{current.status === "resolved" ? "Resolved" : "Mark resolved"}</Button>
      </>}>
      {current.detail && <Section title="Request"><p className="text-sm leading-relaxed">{current.detail}</p></Section>}
      <Section title="Handling">
        <FormStack>
          <Field label="Status"><Select value={current.status} onChange={event => patch(current.id, { status: event.target.value as Ticket["status"] })}>{(Object.keys(statusLabels) as Ticket["status"][]).map(key => <option key={key} value={key}>{statusLabels[key]}</option>)}</Select></Field>
          <Field label="Assigned to"><Select value={current.assignee} onChange={event => patch(current.id, { assignee: event.target.value })}><option>Meera Nair</option><option>Store desk</option><option>Nithin Joseph</option><option>Divya Menon</option></Select></Field>
        </FormStack>
      </Section>
      <Section title="History"><Timeline entries={current.trail} /></Section>
      <Section title="Reply">
        <FormStack>
          <Textarea rows={3} value={reply} onChange={event => setReply(event.target.value)} placeholder="What was checked, decided or told to the person" aria-label="Reply" />
          <Button variant="outline" disabled={!reply.trim()} onClick={sendReply}>Add reply</Button>
        </FormStack>
      </Section>
    </DetailDrawer>}

    {creating && <DetailDrawer title="New ticket" subtitle="Log a question on behalf of a caller or walk-in" onClose={() => setCreating(false)}
      footer={<>
        <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
        <Button disabled={!newSubject.trim()} onClick={createTicket}><Plus />Create ticket</Button>
      </>}>
      <FormStack>
        <Field label="Category"><Select value={newCategory} onChange={event => setNewCategory(event.target.value as TicketCategory)}>{(Object.keys(categoryLabels) as TicketCategory[]).map(key => <option key={key} value={key}>{categoryLabels[key]}</option>)}</Select></Field>
        <Field label="Subject" required><Input value={newSubject} onChange={event => setNewSubject(event.target.value)} placeholder="One-line summary" /></Field>
        <Field label="Details"><Textarea rows={4} value={newDetail} onChange={event => setNewDetail(event.target.value)} placeholder="What happened, who reported it, what they expect" /></Field>
      </FormStack>
    </DetailDrawer>}
  </>;
}
