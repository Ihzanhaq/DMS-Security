"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Boxes, ChevronRight, Download, HandHelping, Pencil, PackagePlus, Plus, Shirt, SlidersHorizontal, Undo2, Upload, Wallet } from "lucide-react";
import {
  Button, DataTable, DefRows, EmptyState, FilterChips, InlineAlert, ListFilterRow, PageHeader, Panel,
  PersonCell, SearchBar, Section, SegmentedControl, Select, Sheet, StatStrip, StatusChip, type StatusTone,
} from "@/components/ui-kit";
import { useInventory } from "@/components/shared/inventory-context";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { downloadCsv } from "@/lib/download";
import { ONE_SIZE, assetsOut, movementDeltas, movementTypeLabel, onHand, sizesOf, stockStatus, stockValue, type AssetHolding, type StockStatus } from "@/lib/inventory";
import { NAV } from "@/lib/labels";
import { employees, rupees } from "@/lib/mock-data";
import type { InventoryCategory, InventoryItem, MovementType, StockMovement } from "@/types/domain";
import type { NavClickMeta } from "@/lib/nav-config";
import { movementIntent } from "./inventory-forms";

type Tab = "stock" | "movements" | "assets" | "items";

const statusTone: Record<StockStatus, StatusTone> = { ok: "success", low: "warning", out: "danger" };
const statusText: Record<StockStatus, string> = { ok: "In stock", low: "Low", out: "Out of stock" };
const movementTone: Record<MovementType, StatusTone> = { receipt: "success", issue: "info", return: "success", transfer: "neutral", adjustment: "warning", "write-off": "danger" };

const sizeText = (size: string) => size === ONE_SIZE ? "One size" : size;
const employeeName = (id?: string) => employees.find(employee => employee.id === id)?.name ?? id ?? "";

/** Signed change for the table: what the movement did to the store being viewed (or overall). */
function signedQty(movement: StockMovement, storeId: string) {
  if (movement.type === "transfer") {
    if (storeId === "all") return { text: `${movement.qty}`, tone: "text-muted" };
    return movement.storeId === storeId ? { text: `−${movement.qty}`, tone: "text-status-danger" } : { text: `+${movement.qty}`, tone: "text-emerald" };
  }
  const delta = movementDeltas(movement)[0].delta;
  return delta < 0 ? { text: `−${-delta}`, tone: "text-status-danger" } : { text: `+${delta}`, tone: "text-emerald" };
}

export function InventoryScreen({ intent, onImport, onNavigate }: { intent?: string; onImport: () => void; onNavigate: (view: string, meta?: string | NavClickMeta) => void }) {
  const { items, stores, movements, post } = useInventory();
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("stock");
  const [storeId, setStoreId] = useState(intent?.startsWith("store:") ? intent.slice(6) : "all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | InventoryCategory>("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | MovementType>("all");
  const openMovement = (mode: "receive" | "transfer" | "adjust", itemId?: string) => onNavigate("stock-movement", { tab: movementIntent(mode, { itemId, storeId: mode === "receive" || !scope ? undefined : scope }) });
  const openItem = (itemId?: string) => onNavigate("inventory-item", { tab: itemId ?? "" });
  const [detail, setDetail] = useState<InventoryItem | null>(null);
  const scope = storeId === "all" ? undefined : storeId;
  const storeName = (id?: string) => stores.find(store => store.id === id)?.name ?? id ?? "";

  const stockRows = useMemo(() => items.filter(item => item.active).map(item => {
    const total = onHand(movements, { itemId: item.id });
    return { item, qty: onHand(movements, { itemId: item.id, storeId: scope }), total, status: stockStatus(total, item.reorderLevel) };
  }), [items, movements, scope]);
  const lowCount = stockRows.filter(row => row.status !== "ok").length;
  const holdings = useMemo(() => assetsOut(movements, items).filter(row => !scope || row.storeId === scope), [movements, items, scope]);

  const visibleStock = stockRows.filter(row =>
    (category === "all" || row.item.category === category)
    && (!lowOnly || row.status !== "ok")
    && row.item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleMovements = movements
    .filter(movement => (typeFilter === "all" || movement.type === typeFilter) && (!scope || movement.storeId === scope || movement.toStoreId === scope))
    .filter(movement => { const q = query.trim().toLowerCase(); return !q || `${items.find(item => item.id === movement.itemId)?.name} ${employeeName(movement.employeeId)} ${movement.batchNo ?? ""} ${movement.reason ?? ""}`.toLowerCase().includes(q); })
    .slice().reverse();

  const exportStock = () => {
    const rows = items.flatMap(item => sizesOf(item).flatMap(size => stores.filter(store => !scope || store.id === scope).map(store => [item.name, sizeText(size), store.name, onHand(movements, { itemId: item.id, size, storeId: store.id }), item.reorderLevel])));
    downloadCsv("inventory-stock", ["Item", "Size", "Store", "On hand", "Reorder level"], rows);
    notify("Stock report downloaded");
  };
  const exportMovements = () => {
    downloadCsv("inventory-movements", ["Date", "Type", "Item", "Size", "Qty", "Store", "To store", "Employee", "Batch", "Supplier", "Reason", "By"],
      visibleMovements.map(movement => [movement.date, movementTypeLabel[movement.type], items.find(item => item.id === movement.itemId)?.name ?? movement.itemId, sizeText(movement.size), movement.delta ?? movement.qty, storeName(movement.storeId), storeName(movement.toStoreId), employeeName(movement.employeeId), movement.batchNo ?? "", movement.supplier ?? "", movement.reason ?? "", movement.by]));
    notify("Movement ledger downloaded");
  };
  const markReturned = (row: AssetHolding) => {
    const problem = post({ date: APP_TODAY, type: "return", itemId: row.itemId, size: row.size, qty: row.qty, storeId: row.storeId, employeeId: row.employeeId, by: "Store desk" });
    notify(problem ?? `${items.find(item => item.id === row.itemId)?.name} returned by ${employeeName(row.employeeId)}`);
  };

  const showSearch = tab === "stock" || tab === "movements";

  return <>
    <PageHeader title={NAV.inventory} subtitle="Uniforms and duty equipment across stores. Every change is recorded in the movement ledger."
      actions={<>
        <Button variant="outline" onClick={onImport}><Upload />Import balances</Button>
        <Button variant="outline" onClick={() => onNavigate("uniform-issue")}><HandHelping />Issue</Button>
        <Button onClick={() => openMovement("receive")}><PackagePlus />Receive stock</Button>
      </>} />
    <StatStrip items={[
      { icon: Boxes, value: String(stockRows.length), label: "Active items", note: `${items.filter(item => item.category === "uniform" && item.active).length} uniform · ${items.filter(item => item.category === "equipment" && item.active).length} equipment`, onClick: () => { setTab("items"); }, actionLabel: "Open the item catalogue" },
      { icon: Wallet, value: rupees(stockValue(movements, items, scope)), label: "Stock value", note: scope ? storeName(scope) : "All stores", tone: "green" },
      { icon: AlertTriangle, value: String(lowCount), label: "Below reorder level", note: "Company-wide", tone: lowCount ? "orange" : undefined, onClick: () => { setTab("stock"); setLowOnly(current => !current); }, active: lowOnly, actionLabel: "Show items below the reorder level" },
      { icon: Shirt, value: String(holdings.reduce((sum, row) => sum + row.qty, 0)), label: "Assets with employees", note: "Returnable items", onClick: () => setTab("assets"), actionLabel: "Show returnable items held by employees" },
    ]} />

    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SegmentedControl className="mb-0" value={tab} onChange={setTab} options={[{ id: "stock", label: "Stock" }, { id: "movements", label: "Movements" }, { id: "assets", label: "Assets out" }, { id: "items", label: "Items" }]} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => openMovement("transfer")}><ArrowLeftRight />Transfer</Button>
        <Button variant="outline" size="sm" onClick={() => openMovement("adjust")}><SlidersHorizontal />Adjust</Button>
        <div className="w-52"><Select aria-label="Store" value={storeId} onChange={event => setStoreId(event.target.value)}>
          <option value="all">All stores</option>
          {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
        </Select></div>
      </div>
    </div>

    <div className="min-w-0">
        {showSearch && <ListFilterRow>
          <SearchBar className="mb-0 sm:w-80" value={query} onChange={setQuery} placeholder={tab === "stock" ? "Search items" : "Search item, employee, batch or reason"} />
          {tab === "stock"
            ? <FilterChips value={category} onChange={setCategory} options={[{ id: "all", label: "All" }, { id: "uniform", label: "Uniform" }, { id: "equipment", label: "Equipment" }]} />
            : <FilterChips value={typeFilter} onChange={setTypeFilter} options={[{ id: "all", label: "All" }, ...(Object.keys(movementTypeLabel) as MovementType[]).map(type => ({ id: type, label: movementTypeLabel[type] }))]} />}
        </ListFilterRow>}

        {tab === "stock" && <Panel flush title="Stock on hand" description={`${scope ? storeName(scope) : "All stores"} · status compares the company-wide total with the reorder level.`} action={<Button variant="outline" size="sm" onClick={exportStock}><Download />Export</Button>}>
          {lowOnly && <InlineAlert tone="warning" className="m-4">Showing items below the reorder level. <button type="button" className="font-medium underline" onClick={() => setLowOnly(false)}>Show all</button></InlineAlert>}
          <DataTable rows={visibleStock} rowKey={row => row.item.id} onRowClick={row => setDetail(row.item)}
            empty={<div className="p-4"><EmptyState icon={Boxes} message="No items match these filters." /></div>}
            columns={[
              { header: "Item", cell: row => <div className="min-w-0"><strong className="block font-medium">{row.item.name}</strong><span className="text-xs text-muted">{row.item.category === "uniform" ? "Uniform" : "Equipment"}{row.item.kind === "asset" ? " · returnable" : ""}</span></div> },
              { header: "Sizes", cell: row => <span className="text-muted">{row.item.sizes.length ? `${row.item.sizes.length} sizes` : "One size"}</span>, hideOnMobile: true },
              { header: "On hand", align: "right", cell: row => <strong className="tabular-nums">{row.qty}</strong> },
              { header: "Reorder at", align: "right", cell: row => <span className="tabular-nums text-muted">{row.item.reorderLevel}</span>, hideOnMobile: true },
              { header: "Status", cell: row => <StatusChip tone={statusTone[row.status]}>{statusText[row.status]}</StatusChip> },
              { header: "", cell: () => <ChevronRight className="ml-auto h-4 w-4 text-muted" />, hideOnMobile: true, className: "w-8" },
            ]} />
        </Panel>}

        {tab === "movements" && <Panel flush title="Movement ledger" description="Newest first. Stock on hand is calculated from these entries." action={<Button variant="outline" size="sm" onClick={exportMovements}><Download />Export</Button>}>
          <DataTable rows={visibleMovements} rowKey={row => row.id}
            empty={<div className="p-4"><EmptyState icon={ArrowLeftRight} message="No movements match these filters." /></div>}
            columns={[
              { header: "Item", cell: row => <div><strong className="block font-medium">{items.find(item => item.id === row.itemId)?.name ?? row.itemId}</strong><span className="text-xs text-muted">{sizeText(row.size)} · {formatAppDate(row.date)}</span></div> },
              { header: "Type", cell: row => <StatusChip tone={movementTone[row.type]}>{movementTypeLabel[row.type]}</StatusChip> },
              { header: "Qty", align: "right", cell: row => { const qty = signedQty(row, storeId); return <strong className={`tabular-nums ${qty.tone}`}>{qty.text}</strong>; } },
              { header: "Store", cell: row => <span className="whitespace-nowrap text-sm">{storeName(row.storeId)}{row.toStoreId ? ` → ${storeName(row.toStoreId)}` : ""}</span>, hideOnMobile: true },
              { header: "Details", cell: row => <span className="text-xs text-muted">{row.employeeId ? `${employeeName(row.employeeId)} · ${row.employeeId}` : row.batchNo ? `${row.batchNo}${row.supplier ? ` · ${row.supplier}` : ""}` : row.reason ?? "—"}</span> },
            ]} />
        </Panel>}

        {tab === "assets" && <Panel flush title="Returnable items with employees" description="Collected back at exit clearance or when replaced.">
          <DataTable rows={holdings} rowKey={row => `${row.employeeId}|${row.itemId}|${row.size}`}
            empty={<div className="p-4"><EmptyState icon={Shirt} message="No returnable items are out with employees." /></div>}
            columns={[
              { header: "Employee", cell: row => <PersonCell name={employeeName(row.employeeId)} id={row.employeeId} phone={employees.find(employee => employee.id === row.employeeId)?.phone} /> },
              { header: "Item", cell: row => <span className="font-medium">{items.find(item => item.id === row.itemId)?.name}{row.size !== ONE_SIZE ? ` · ${row.size}` : ""}</span> },
              { header: "Qty", align: "right", cell: row => <span className="tabular-nums">{row.qty}</span> },
              { header: "Since", cell: row => <span className="whitespace-nowrap text-xs text-muted">{formatAppDate(row.since)} · {storeName(row.storeId)}</span>, hideOnMobile: true },
              { header: "", cell: row => <Button size="sm" variant="outline" onClick={() => markReturned(row)}><Undo2 />Mark returned</Button> },
            ]} />
        </Panel>}

        {tab === "items" && <Panel flush title="Item catalogue" description="What the stores hold. Deactivate an item to stop issuing it; its history stays." action={<Button size="sm" onClick={() => openItem()}><Plus />Add item</Button>}>
          <DataTable rows={items} rowKey={row => row.id} onRowClick={row => openItem(row.id)}
            columns={[
              { header: "Item", cell: row => <strong className="font-medium">{row.name}</strong> },
              { header: "Type", cell: row => <span className="text-sm">{row.category === "uniform" ? "Uniform" : "Equipment"} · {row.kind === "asset" ? "Returnable" : "Consumable"}</span> },
              { header: "Sizes", cell: row => <span className="text-xs text-muted">{row.sizes.length ? row.sizes.join(", ") : "One size"}</span>, hideOnMobile: true },
              { header: "Unit cost", align: "right", cell: row => <span className="tabular-nums">{rupees(row.unitCost)}</span> },
              { header: "Per kit", align: "right", cell: row => <span className="tabular-nums text-muted">{row.perKit || "—"}</span>, hideOnMobile: true },
              { header: "Status", cell: row => <StatusChip tone={row.active ? "success" : "neutral"}>{row.active ? "Active" : "Inactive"}</StatusChip> },
            ]} />
        </Panel>}
    </div>

    {detail && <ItemDetailSheet item={detail} onClose={() => setDetail(null)}
      onEdit={() => openItem(detail.id)}
      onReceive={() => openMovement("receive", detail.id)} />}


  </>;
}

/** One item: stock by size and store, batches received, recent movements. Tables, not cards, so nothing wraps. */
function ItemDetailSheet({ item, onClose, onEdit, onReceive }: { item: InventoryItem; onClose: () => void; onEdit: () => void; onReceive: () => void }) {
  const { stores, movements } = useInventory();
  const total = onHand(movements, { itemId: item.id });
  const status = stockStatus(total, item.reorderLevel);
  const own = movements.filter(movement => movement.itemId === item.id);
  const batches = own.filter(movement => movement.type === "receipt" && movement.batchNo).slice().reverse();
  const recent = own.slice(-10).reverse();
  const storeName = (id?: string) => stores.find(store => store.id === id)?.name ?? "";
  const th = "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted";
  const td = "whitespace-nowrap px-3 py-2";

  return <Sheet open wide title={item.name} subtitle={`${item.category === "uniform" ? "Uniform" : "Equipment"} · ${item.kind === "asset" ? "Returnable asset" : "Consumable"}`} onClose={onClose}
    footer={<><Button variant="outline" onClick={onEdit}><Pencil />Edit item</Button><Button onClick={onReceive}><PackagePlus />Receive stock</Button></>}>
    <div className="mb-5 flex items-center gap-2"><StatusChip tone={statusTone[status]}>{statusText[status]}</StatusChip>{status !== "ok" && <span className="text-xs text-muted">Reorder level is {item.reorderLevel}.</span>}</div>
    <Section title="Summary">
      <DefRows rows={[
        { label: "On hand, all stores", value: total, mono: true },
        { label: "Reorder level", value: item.reorderLevel, mono: true },
        { label: "Unit cost", value: rupees(item.unitCost), mono: true },
        { label: "Stock value", value: rupees(Math.max(0, total) * item.unitCost), mono: true, total: true },
      ]} />
    </Section>
    <Section title="By size and store">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface"><tr><th className={`${th} text-left`}>Size</th>{stores.map(store => <th key={store.id} className={`${th} text-right`}>{store.name.replace(" store", "").replace(" branch", "")}</th>)}<th className={`${th} text-right`}>Total</th></tr></thead>
          <tbody>
            {sizesOf(item).map(size => {
              const perStore = stores.map(store => onHand(movements, { itemId: item.id, size, storeId: store.id }));
              return <tr key={size} className="border-t border-border">
                <td className={`${td} font-medium`}>{sizeText(size)}</td>
                {perStore.map((qty, index) => <td key={stores[index].id} className={`${td} text-right tabular-nums ${qty ? "" : "text-muted"}`}>{qty}</td>)}
                <td className={`${td} text-right font-semibold tabular-nums`}>{perStore.reduce((a, b) => a + b, 0)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Section>
    <Section title="Batches received">
      {batches.length === 0 ? <p className="text-sm text-muted">No batch numbers recorded for this item.</p> : <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface"><tr><th className={`${th} text-left`}>Batch</th><th className={`${th} text-left`}>Size</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-left`}>Received</th><th className={`${th} text-left`}>Store</th></tr></thead>
          <tbody>
            {batches.map(batch => <tr key={batch.id} className="border-t border-border">
              <td className={`${td} font-medium`}>{batch.batchNo}</td>
              <td className={td}>{sizeText(batch.size)}</td>
              <td className={`${td} text-right tabular-nums`}>{batch.qty}</td>
              <td className={`${td} text-muted`}>{formatAppDate(batch.date)}</td>
              <td className={`${td} text-muted`}>{storeName(batch.storeId)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </Section>
    <Section title="Recent movements" className="mb-0">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <tbody>
            {recent.map(movement => { const qty = signedQty(movement, "all"); return <tr key={movement.id} className="border-t border-border first:border-t-0">
              <td className={`${td} text-muted`}>{formatAppDate(movement.date)}</td>
              <td className={td}><StatusChip tone={movementTone[movement.type]}>{movementTypeLabel[movement.type]}</StatusChip></td>
              <td className={td}>{sizeText(movement.size)}</td>
              <td className={`${td} text-right font-semibold tabular-nums ${qty.tone}`}>{qty.text}</td>
              <td className={`${td} text-xs text-muted`}>{movement.employeeId ? employeeName(movement.employeeId) : movement.toStoreId ? `${storeName(movement.storeId)} → ${storeName(movement.toStoreId)}` : storeName(movement.storeId)}</td>
            </tr>; })}
          </tbody>
        </table>
      </div>
    </Section>
  </Sheet>;
}
