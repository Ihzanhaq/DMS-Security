"use client";

import { useState } from "react";
import { ArrowLeftRight, Ban, Check, CheckCircle2, Clock, PackageCheck, Shirt, Truck } from "lucide-react";
import {
  Button, DataTable, DefRows, EmptyState, Field, FilterChips, InlineAlert, ListFilterRow, PageHeader, Panel, PersonCell, SearchBar, Section,
  Select, Sheet, StatStrip, StatusChip, Textarea, Timeline, type StatusTone,
} from "@/components/ui-kit";
import { useInventory } from "@/components/shared/inventory-context";
import { useToast } from "@/components/shared/toast-context";
import { formatAppDate } from "@/lib/app-date";
import { ONE_SIZE, requestShortfall } from "@/lib/inventory";
import { NAV } from "@/lib/labels";
import { employees, rupees } from "@/lib/mock-data";
import type { NavClickMeta } from "@/lib/nav-config";
import type { UniformRequest, UniformRequestStatus } from "@/types/domain";

export const requestStatusLabel: Record<UniformRequestStatus, string> = { requested: "New", approved: "Approved", rejected: "Rejected", dispatched: "Dispatched", delivered: "Delivered" };
export const requestStatusTone: Record<UniformRequestStatus, StatusTone> = { requested: "warning", approved: "info", rejected: "danger", dispatched: "info", delivered: "success" };

const BY = "Store desk";
const employeeOf = (id: string) => employees.find(employee => employee.id === id);

export function UniformRequestsScreen({ onNavigate }: { onNavigate: (view: string, meta?: string | NavClickMeta) => void }) {
  const { requests, items, stores, movements, setRequestStatus } = useInventory();
  const notify = useToast();
  const [status, setStatus] = useState<"all" | UniformRequestStatus>("all");
  const [storeId, setStoreId] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<UniformRequest | null>(null);
  const [rejecting, setRejecting] = useState<UniformRequest | null>(null);
  const [reason, setReason] = useState("");
  const [blocked, setBlocked] = useState<{ request: UniformRequest; message: string } | null>(null);

  const itemName = (id: string) => items.find(item => item.id === id)?.name ?? id;
  const storeName = (id: string) => stores.find(store => store.id === id)?.name ?? id;
  const linesText = (request: UniformRequest) => request.items.map(line => `${itemName(line.itemId).split(" (")[0]}${line.size !== ONE_SIZE ? ` · ${line.size}` : ""} ×${line.qty}`).join(", ");
  const count = (value: UniformRequestStatus) => requests.filter(request => request.status === value).length;

  const visible = requests.filter(request => {
    const q = query.trim().toLowerCase();
    return (status === "all" || request.status === status) && (storeId === "all" || request.storeId === storeId)
      && (!q || `${employeeOf(request.employeeId)?.name ?? ""} ${request.employeeId}`.toLowerCase().includes(q));
  });
  const selectable = visible.filter(request => request.status === "requested");
  const chosen = selectable.filter(request => selected.has(request.id));

  const move = (request: UniformRequest, next: UniformRequestStatus) => {
    const problem = setRequestStatus(request.id, next, BY);
    if (problem) {
      if (next === "dispatched") setBlocked({ request, message: problem }); else notify(problem);
      return;
    }
    const name = employeeOf(request.employeeId)?.name ?? request.employeeId;
    notify(next === "dispatched" ? `Dispatched to ${name} · ${rupees(request.amount)} queued for recovery` : `${name}'s request ${requestStatusLabel[next].toLowerCase()}`);
    setOpen(current => current?.id === request.id ? null : current);
  };
  const approveSelected = () => {
    chosen.forEach(request => setRequestStatus(request.id, "approved", BY));
    notify(`${chosen.length} request${chosen.length > 1 ? "s" : ""} approved`);
    setSelected(new Set());
  };
  const reject = () => {
    if (!rejecting) return;
    const problem = setRequestStatus(rejecting.id, "rejected", BY, reason);
    if (problem) { notify(problem); return; }
    notify("Request rejected · the guard can see the reason");
    setRejecting(null); setReason(""); setOpen(null);
  };
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const actions = (request: UniformRequest) => {
    const short = request.status === "approved" && requestShortfall(movements, request).length > 0;
    return <div className="flex flex-wrap justify-end gap-1.5" onClick={event => event.stopPropagation()}>
      {request.status === "requested" && <>
        <Button size="sm" variant="outline" onClick={() => { setRejecting(request); setReason(""); }}><Ban />Reject</Button>
        <Button size="sm" onClick={() => move(request, "approved")}><Check />Approve</Button>
      </>}
      {request.status === "approved" && <Button size="sm" variant={short ? "outline" : "default"} onClick={() => move(request, "dispatched")} title={short ? "Not enough stock at this store" : undefined}><Truck />Dispatch</Button>}
      {request.status === "dispatched" && <Button size="sm" variant="outline" onClick={() => move(request, "delivered")}><PackageCheck />Mark delivered</Button>}
    </div>;
  };

  return <>
    <PageHeader title={NAV.uniformRequests} subtitle="Requests from the guard app. Approve, dispatch from the nearest store and track delivery. Dispatch takes the stock and queues salary recovery." />
    <StatStrip items={[
      { icon: Clock, value: String(count("requested")), label: "New", note: "Waiting for approval", tone: count("requested") ? "orange" : undefined, onClick: () => setStatus(current => current === "requested" ? "all" : "requested"), active: status === "requested", actionLabel: "Show new requests" },
      { icon: CheckCircle2, value: String(count("approved")), label: "Approved", note: "Ready to dispatch", onClick: () => setStatus(current => current === "approved" ? "all" : "approved"), active: status === "approved", actionLabel: "Show approved requests" },
      { icon: Truck, value: String(count("dispatched")), label: "Dispatched", note: "On the way", onClick: () => setStatus(current => current === "dispatched" ? "all" : "dispatched"), active: status === "dispatched", actionLabel: "Show dispatched requests" },
      { icon: PackageCheck, value: String(count("delivered")), label: "Delivered", note: "Closed", tone: "green", onClick: () => setStatus(current => current === "delivered" ? "all" : "delivered"), active: status === "delivered", actionLabel: "Show delivered requests" },
    ]} />
    <ListFilterRow>
      <SearchBar className="mb-0 sm:w-72" value={query} onChange={setQuery} placeholder="Search employee name or ID" />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips value={status} onChange={setStatus} options={[{ id: "all", label: "All" }, ...(Object.keys(requestStatusLabel) as UniformRequestStatus[]).map(id => ({ id, label: requestStatusLabel[id] }))]} />
        <div className="w-48"><Select aria-label="Store" value={storeId} onChange={event => setStoreId(event.target.value)}>
          <option value="all">All stores</option>
          {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
        </Select></div>
      </div>
    </ListFilterRow>
    <Panel flush title={`${visible.length} request${visible.length === 1 ? "" : "s"}`} description="Status changes appear in the guard's app immediately."
      action={chosen.length > 0 ? <Button size="sm" onClick={approveSelected}><Check />Approve {chosen.length} selected</Button> : undefined}>
      <DataTable rows={visible} rowKey={row => row.id} onRowClick={setOpen}
        empty={<div className="p-4"><EmptyState icon={Shirt} message="No uniform requests match these filters." actionLabel={status !== "all" || storeId !== "all" || query ? "Clear filters" : undefined} onAction={() => { setStatus("all"); setStoreId("all"); setQuery(""); }} /></div>}
        columns={[
          { header: "Employee", cell: row => <div className="flex items-center gap-3">
            {selectable.length > 0 && <input type="checkbox" aria-label={`Select ${row.id}`} className="h-4 w-4 accent-[#00be73] disabled:opacity-30" disabled={row.status !== "requested"} checked={selected.has(row.id)} onClick={event => event.stopPropagation()} onChange={() => toggle(row.id)} />}
            <PersonCell name={employeeOf(row.employeeId)?.name ?? row.employeeId} id={row.employeeId} phone={employeeOf(row.employeeId)?.phone} />
          </div> },
          { header: "Items", cell: row => <span className="font-medium">{linesText(row)}</span> },
          { header: "Store", cell: row => <span className="whitespace-nowrap text-sm">{storeName(row.storeId)}</span>, hideOnMobile: true },
          { header: "Requested", cell: row => <span className="whitespace-nowrap text-xs text-muted">{formatAppDate(row.requestedOn)} · {rupees(row.amount)}</span>, hideOnMobile: true },
          { header: "Status", cell: row => <StatusChip tone={requestStatusTone[row.status]}>{requestStatusLabel[row.status]}</StatusChip> },
          { header: "Actions", align: "right", cell: actions },
        ]} />
    </Panel>

    {open && <Sheet open title={employeeOf(open.employeeId)?.name ?? open.employeeId} subtitle={`${open.id} · ${open.employeeId}`} onClose={() => setOpen(null)} footer={actions(open)}>
      <div className="mb-4"><StatusChip tone={requestStatusTone[open.status]}>{requestStatusLabel[open.status]}</StatusChip></div>
      <Section title="Items">
        <DefRows rows={[
          ...open.items.map(line => ({ label: `${itemName(line.itemId)}${line.size !== ONE_SIZE ? ` · ${line.size}` : ""}`, value: `×${line.qty}`, mono: true })),
          { label: "Amount", value: rupees(open.amount), mono: true, total: true },
        ]} />
      </Section>
      <Section title="Details">
        <DefRows rows={[
          { label: "Store", value: storeName(open.storeId) },
          { label: "Recovery plan", value: open.recoveryPlan },
          ...(open.note ? [{ label: "Guard's note", value: open.note }] : []),
          ...(open.rejectReason ? [{ label: "Rejected because", value: open.rejectReason }] : []),
        ]} />
      </Section>
      <Section title="History" className="mb-0">
        <Timeline entries={open.history.map((entry, index) => ({ title: requestStatusLabel[entry.status], time: formatAppDate(entry.on), note: entry.by, state: index === open.history.length - 1 ? "active" as const : "done" as const }))} />
      </Section>
    </Sheet>}

    {rejecting && <Sheet open side="center" title="Reject request" subtitle={`${employeeOf(rejecting.employeeId)?.name} · ${linesText(rejecting)}`} onClose={() => setRejecting(null)}
      footer={<><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" disabled={!reason.trim()} onClick={reject}><Ban />Reject</Button></>}>
      <Field label="Reason" required hint="Shown to the guard in their app."><Textarea rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="e.g. Replacement already issued on 6 Sep" /></Field>
    </Sheet>}

    {blocked && <Sheet open side="center" title="Not enough stock to dispatch" subtitle={`${storeName(blocked.request.storeId)} · ${linesText(blocked.request)}`} onClose={() => setBlocked(null)}
      footer={<><Button variant="outline" onClick={() => setBlocked(null)}>Close</Button>
        <Button onClick={() => { const line = requestShortfall(movements, blocked.request)[0]; setBlocked(null); onNavigate("inventory", { tab: `transfer:${line?.itemId ?? ""}|${line?.size ?? ""}||${blocked.request.storeId}` }); }}><ArrowLeftRight />Transfer stock in</Button></>}>
      <InlineAlert tone="danger">{blocked.message}</InlineAlert>
      <p className="mt-3 text-sm text-muted">Move stock from another store to {storeName(blocked.request.storeId)}, or receive a new batch, then dispatch again.</p>
    </Sheet>}
  </>;
}
