"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PackagePlus, Plus, Trash2 } from "lucide-react";
import {
  BackCrumb, Button, DefRows, Field, FormGrid, FormStack, InlineAlert, Input, PageHeader, Panel, SegmentedControl, Select, SplitLayout, Textarea, ToggleRow,
} from "@/components/ui-kit";
import { useInventory, type NewMovement } from "@/components/shared/inventory-context";
import { useOnboarding } from "@/components/shared/onboarding-context";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY } from "@/lib/app-date";
import { ONE_SIZE, onHand, sizesOf } from "@/lib/inventory";
import { NAV } from "@/lib/labels";
import { employees, rupees, uniformPlans } from "@/lib/mock-data";
import type { InventoryCategory, InventoryItem, InventoryKind, UniformSizes } from "@/types/domain";

export type Prefill = { itemId?: string; size?: string; storeId?: string; toStoreId?: string };
export type MovementMode = "receive" | "transfer" | "adjust";

const STORE_DESK = "Store desk";
const sizeText = (size: string) => size === ONE_SIZE ? "One size" : size;
const qtyValue = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

/** "transfer:shirt|M|central|kochi" → mode and prefill (item|size|from|to). */
export function parseMovementIntent(intent?: string): { mode: MovementMode; prefill: Prefill } {
  const [kind, rest] = (intent ?? "").split(":");
  const mode: MovementMode = kind === "transfer" || kind === "adjust" ? kind : "receive";
  const [itemId, size, storeId, toStoreId] = (rest ?? "").split("|");
  return { mode, prefill: { itemId: itemId || undefined, size: size || undefined, storeId: storeId || undefined, toStoreId: toStoreId || undefined } };
}

export const movementIntent = (mode: MovementMode, prefill: Prefill = {}) =>
  `${mode}:${prefill.itemId ?? ""}|${prefill.size ?? ""}|${prefill.storeId ?? ""}|${prefill.toStoreId ?? ""}`;

/** Item and size pickers. Changing the item resets the size to the item's first size. */
function ItemSizeFields({ itemId, size, onChange, storeId }: { itemId: string; size: string; onChange: (itemId: string, size: string) => void; storeId?: string }) {
  const { items, movements } = useInventory();
  const item = items.find(entry => entry.id === itemId);
  return <>
    <Field label="Item" required>
      <Select value={itemId} onChange={event => { const next = items.find(entry => entry.id === event.target.value); onChange(event.target.value, next ? sizesOf(next)[0] : ONE_SIZE); }}>
        {items.filter(entry => entry.active).map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </Select>
    </Field>
    <Field label="Size" required hint={storeId ? `${onHand(movements, { itemId, size, storeId })} in stock at this store` : undefined}>
      <Select value={size} onChange={event => onChange(itemId, event.target.value)} disabled={!item?.sizes.length}>
        {(item ? sizesOf(item) : [ONE_SIZE]).map(option => <option key={option} value={option}>{sizeText(option)}</option>)}
      </Select>
    </Field>
  </>;
}

function StoreSelect({ label, value, onChange, exclude }: { label: string; value: string; onChange: (id: string) => void; exclude?: string }) {
  const { stores } = useInventory();
  return <Field label={label} required>
    <Select value={value} onChange={event => onChange(event.target.value)}>
      {stores.filter(store => store.id !== exclude).map(store => <option key={store.id} value={store.id}>{store.name} · {store.city}</option>)}
    </Select>
  </Field>;
}

/** Size × store table for one item, so the person moving stock can see where it is. */
function StockGlance({ itemId }: { itemId: string }) {
  const { items, stores, movements } = useInventory();
  const item = items.find(entry => entry.id === itemId);
  if (!item) return null;
  const th = "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted";
  return <Panel title={`${item.name} on hand`} description="Current stock by size and store." flush>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface"><tr><th className={`${th} text-left`}>Size</th>{stores.map(store => <th key={store.id} className={`${th} text-right`}>{store.city}</th>)}</tr></thead>
        <tbody>
          {sizesOf(item).map(size => <tr key={size} className="border-t border-border">
            <td className="whitespace-nowrap px-3 py-2 font-medium">{sizeText(size)}</td>
            {stores.map(store => { const qty = onHand(movements, { itemId, size, storeId: store.id }); return <td key={store.id} className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${qty ? "" : "text-muted"}`}>{qty}</td>; })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </Panel>;
}

const modeCopy: Record<MovementMode, { title: string; subtitle: string; submit: string; done: string }> = {
  receive: { title: "Receive stock", subtitle: "Goods arriving from a supplier. Recorded as a new batch.", submit: "Receive stock", done: "Stock received" },
  transfer: { title: "Transfer stock", subtitle: "Move stock from one store to another.", submit: "Transfer", done: "Stock transferred" },
  adjust: { title: "Adjust stock", subtitle: "Correct a count, or write off damaged or lost stock.", submit: "Save adjustment", done: "Stock adjusted" },
};

type AdjustKind = "add" | "remove" | "write-off";

/** Full page for receiving, transferring and adjusting stock; the fields change with the mode. */
export function StockMovementScreen({ intent, onBack, onModeChange }: { intent?: string; onBack: () => void; onModeChange: (intent: string) => void }) {
  const { mode, prefill } = parseMovementIntent(intent);
  const { items, stores, movements, post } = useInventory();
  const notify = useToast();
  const first = items.find(item => item.id === prefill.itemId) ?? items.find(item => item.active) ?? items[0];
  const [itemId, setItemId] = useState(first.id);
  const [size, setSize] = useState(prefill.size ?? sizesOf(first)[0]);
  // A transfer into a store defaults to pulling from whichever other store holds most of the item.
  const [storeId, setStoreId] = useState(() => prefill.storeId ?? stores.filter(store => store.id !== prefill.toStoreId)
    .map(store => ({ id: store.id, qty: prefill.itemId ? onHand(movements, { itemId: prefill.itemId, size: prefill.size, storeId: store.id }) : 0 }))
    .sort((a, b) => b.qty - a.qty)[0].id);
  const [toStoreId, setToStoreId] = useState(prefill.toStoreId && prefill.toStoreId !== storeId ? prefill.toStoreId : stores.find(store => store.id !== storeId)!.id);
  const [qty, setQty] = useState("1");
  const [date, setDate] = useState(APP_TODAY);
  const [batchNo, setBatchNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [adjustKind, setAdjustKind] = useState<AdjustKind>("remove");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = modeCopy[mode];

  const submit = () => {
    const base = { date, itemId, size, qty: qtyValue(qty), storeId, by: STORE_DESK };
    const movement: NewMovement = mode === "receive" ? { ...base, type: "receipt", batchNo: batchNo.trim() || undefined, supplier: supplier.trim() || undefined }
      : mode === "transfer" ? { ...base, type: "transfer", toStoreId }
        : adjustKind === "write-off" ? { ...base, type: "write-off", reason }
          : { ...base, type: "adjustment", delta: adjustKind === "add" ? base.qty : -base.qty, reason };
    const problem = post(movement);
    if (problem) { setError(problem); return; }
    notify(copy.done);
    onBack();
  };

  return <>
    <BackCrumb backLabel={NAV.inventory} onBack={onBack} current={copy.title} />
    <PageHeader title={copy.title} subtitle={copy.subtitle}
      actions={<><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={submit} disabled={qtyValue(qty) < 1}><CheckCircle2 />{copy.submit}</Button></>} />
    <SegmentedControl value={mode} onChange={next => onModeChange(movementIntent(next, { itemId, size }))}
      options={[{ id: "receive", label: "Receive" }, { id: "transfer", label: "Transfer" }, { id: "adjust", label: "Adjust" }]} />
    <SplitLayout wideFirst>
      <Panel title="Details">
        <FormStack>
          {mode === "adjust" && <SegmentedControl className="mb-0" value={adjustKind} onChange={setAdjustKind} options={[{ id: "add", label: "Add to count" }, { id: "remove", label: "Remove from count" }, { id: "write-off", label: "Write off" }]} />}
          <FormGrid>
            <StoreSelect label={mode === "transfer" ? "From store" : "Store"} value={storeId} onChange={next => { setStoreId(next); if (next === toStoreId) setToStoreId(stores.find(store => store.id !== next)!.id); setError(null); }} />
            {mode === "transfer" ? <StoreSelect label="To store" value={toStoreId} onChange={setToStoreId} exclude={storeId} /> : <div className="hidden sm:block" />}
            <ItemSizeFields itemId={itemId} size={size} onChange={(nextItem, nextSize) => { setItemId(nextItem); setSize(nextSize); setError(null); }} storeId={mode === "receive" ? undefined : storeId} />
            <Field label="Quantity" required><Input type="number" min={1} value={qty} onChange={event => { setQty(event.target.value); setError(null); }} /></Field>
            <Field label="Date" required><Input type="date" value={date} max={APP_TODAY} onChange={event => setDate(event.target.value)} /></Field>
            {mode === "receive" && <>
              <Field label="Batch number" hint="Printed on the supplier's delivery note"><Input value={batchNo} onChange={event => setBatchNo(event.target.value)} placeholder="e.g. UB-2614" /></Field>
              <Field label="Supplier"><Input value={supplier} onChange={event => setSupplier(event.target.value)} placeholder="e.g. Kerala Textiles, Aluva" /></Field>
            </>}
          </FormGrid>
          {mode === "adjust" && <Field label="Reason" required><Textarea rows={3} value={reason} onChange={event => { setReason(event.target.value); setError(null); }} placeholder={adjustKind === "write-off" ? "e.g. Water damage in store" : "e.g. Physical count on 20 Sep"} /></Field>}
          {error && <InlineAlert tone="danger">{error}</InlineAlert>}
        </FormStack>
      </Panel>
      <StockGlance itemId={itemId} />
    </SplitLayout>
  </>;
}

type IssueLine = { key: number; itemId: string; size: string; qty: number };

/** Size from the employee's recorded sizes, when the item uses that size chart. */
function sizeFor(item: InventoryItem, sizes: UniformSizes) {
  const preferred = /trouser/i.test(item.name) ? sizes.trouser : /shoe/i.test(item.name) ? sizes.shoe : sizes.shirt;
  const options = sizesOf(item);
  return options.includes(preferred) ? preferred : options[Math.floor(options.length / 2)];
}

/** Full page to hand stock to an employee: replacements, equipment, or the full joining kit. */
export function IssueStockScreen({ onBack }: { onBack: () => void }) {
  const { items, stores, movements, post } = useInventory();
  const { getProfile } = useOnboarding();
  const notify = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0].id);
  const [storeId, setStoreId] = useState(stores[0].id);
  const [plan, setPlan] = useState(uniformPlans[2].name);
  const [lines, setLines] = useState<IssueLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const active = items.filter(item => item.active);
  const itemOf = (id: string) => items.find(item => item.id === id)!;
  const amount = lines.reduce((sum, line) => sum + itemOf(line.itemId).unitCost * line.qty, 0);
  const hasUniform = lines.some(line => itemOf(line.itemId).category === "uniform");
  const short = lines.filter(line => onHand(movements, { itemId: line.itemId, size: line.size, storeId }) < line.qty);
  const employee = employees.find(entry => entry.id === employeeId);
  const sizes = getProfile(employeeId).uniformSizes;

  const addKit = () => {
    setLines(active.filter(item => item.perKit > 0).map((item, index) => ({ key: Date.now() + index, itemId: item.id, size: sizeFor(item, sizes), qty: item.perKit })));
    setError(null);
  };
  const addLine = () => setLines(current => [...current, { key: Date.now(), itemId: active[0].id, size: sizesOf(active[0])[0], qty: 1 }]);
  const update = (key: number, patch: Partial<IssueLine>) => { setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line)); setError(null); };

  const submit = () => {
    const problem = post(lines.map(line => ({ date: APP_TODAY, type: "issue", itemId: line.itemId, size: line.size, qty: line.qty, storeId, employeeId, by: STORE_DESK })));
    if (problem) { setError(problem); return; }
    notify(`Issued to ${employee?.name ?? employeeId}${hasUniform && plan !== uniformPlans[0].name ? ` · ${rupees(amount)} queued for recovery (${plan})` : ""}`);
    onBack();
  };
  const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";

  return <>
    <BackCrumb backLabel={NAV.inventory} onBack={onBack} current="Issue to employee" />
    <PageHeader title="Issue to employee" subtitle="Stock leaves the store now. Returnable items stay on the employee's record until returned."
      actions={<><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={submit} disabled={!lines.length || lines.some(line => line.qty < 1)}><CheckCircle2 />Issue {lines.length ? `${lines.length} item${lines.length > 1 ? "s" : ""}` : ""}</Button></>} />
    <SplitLayout wideFirst>
      <div className="grid min-w-0 content-start gap-4">
        <Panel title="Employee and store">
          <FormGrid>
            <Field label="Employee" required>
              <Select value={employeeId} onChange={event => { setEmployeeId(event.target.value); setError(null); }}>{employees.map(entry => <option key={entry.id} value={entry.id}>{entry.name} · {entry.id}</option>)}</Select>
            </Field>
            <StoreSelect label="Issue from" value={storeId} onChange={next => { setStoreId(next); setError(null); }} />
          </FormGrid>
        </Panel>
        <Panel flush title="Items" description="Sizes are filled from the employee's record when you use the joining kit."
          action={<><Button variant="outline" size="sm" onClick={addKit}><PackagePlus />Fill joining kit</Button><Button variant="outline" size="sm" onClick={addLine}><Plus />Add item</Button></>}>
          {lines.length === 0
            ? <p className="m-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">No items yet. Add items one by one, or fill the joining kit.</p>
            : <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface"><tr><th className={`${th} text-left`}>Item</th><th className={`${th} w-36 text-left`}>Size</th><th className={`${th} w-28 text-right`}>Qty</th><th className={`${th} w-28 text-right`}>In stock</th><th className={`${th} w-28 text-right`}>Value</th><th className="w-14" /></tr></thead>
                <tbody>
                  {lines.map(line => {
                    const item = itemOf(line.itemId);
                    const stock = onHand(movements, { itemId: line.itemId, size: line.size, storeId });
                    return <tr key={line.key} className="border-t border-border">
                      <td className="px-4 py-2"><Select aria-label="Item" value={line.itemId} onChange={event => { const next = itemOf(event.target.value); update(line.key, { itemId: next.id, size: sizesOf(next)[0] }); }}>{active.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></td>
                      <td className="px-4 py-2"><Select aria-label="Size" value={line.size} disabled={!item.sizes.length} onChange={event => update(line.key, { size: event.target.value })}>{sizesOf(item).map(option => <option key={option} value={option}>{sizeText(option)}</option>)}</Select></td>
                      <td className="px-4 py-2"><Input aria-label="Quantity" type="number" min={1} className="min-w-[5rem] text-right" value={line.qty} onChange={event => update(line.key, { qty: qtyValue(event.target.value) })} /></td>
                      <td className={`px-4 py-2 text-right tabular-nums ${stock < line.qty ? "font-semibold text-status-danger" : "text-muted"}`}>{stock}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{rupees(item.unitCost * line.qty)}</td>
                      <td className="px-2 py-2"><Button variant="ghost" size="icon" aria-label={`Remove ${item.name}`} onClick={() => setLines(current => current.filter(entry => entry.key !== line.key))}><Trash2 /></Button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>}
        </Panel>
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
      <div className="grid content-start gap-4">
        <Panel title="Summary">
          <DefRows rows={[
            { label: "Employee", value: employee?.name ?? employeeId },
            { label: "Recorded sizes", value: `Shirt ${sizes.shirt} · Trouser ${sizes.trouser} · Shoe ${sizes.shoe}` },
            { label: "Lines", value: lines.length, mono: true },
            { label: "Pieces", value: lines.reduce((sum, line) => sum + line.qty, 0), mono: true },
            { label: "Value", value: rupees(amount), mono: true, total: true },
          ]} />
          {short.length > 0 && <InlineAlert tone="warning" className="mt-3">{short.length} line{short.length > 1 ? "s" : ""} short at this store. Change the store or transfer stock in first.</InlineAlert>}
        </Panel>
        {hasUniform && <Panel title="Uniform recovery">
          <Field label="Recovery plan" hint="Any unpaid balance blocks exit clearance.">
            <Select value={plan} onChange={event => setPlan(event.target.value)}>{uniformPlans.map(option => <option key={option.name}>{option.name}</option>)}</Select>
          </Field>
        </Panel>}
      </div>
    </SplitLayout>
  </>;
}

/** Full page to add or edit a catalogue item. */
export function InventoryItemScreen({ itemId, onBack }: { itemId?: string; onBack: () => void }) {
  const { items, stores, upsertItem } = useInventory();
  const notify = useToast();
  const item = items.find(entry => entry.id === itemId);
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<InventoryCategory>(item?.category ?? "uniform");
  const [kind, setKind] = useState<InventoryKind>(item?.kind ?? "consumable");
  const [sizes, setSizes] = useState(item?.sizes.join(", ") ?? "");
  const [unitCost, setUnitCost] = useState(String(item?.unitCost ?? ""));
  const [reorderLevel, setReorderLevel] = useState(String(item?.reorderLevel ?? 20));
  const [perKit, setPerKit] = useState(String(item?.perKit ?? 0));
  const [active, setActive] = useState(item?.active ?? true);
  const duplicate = useMemo(() => items.some(entry => entry.id !== item?.id && entry.name.trim().toLowerCase() === name.trim().toLowerCase()), [items, item, name]);
  const valid = Boolean(name.trim()) && !duplicate && unitCost !== "" && Number(unitCost) >= 0;
  const title = item ? item.name : "Add item";

  const submit = () => {
    const id = item?.id ?? (name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `item-${Date.now()}`);
    upsertItem({
      id, name: name.trim(), category, kind, active,
      sizes: sizes.split(",").map(size => size.trim()).filter(Boolean),
      unitCost: Number(unitCost), reorderLevel: qtyValue(reorderLevel), perKit: qtyValue(perKit),
    });
    notify(item ? "Item updated" : "Item added");
    onBack();
  };

  return <>
    <BackCrumb backLabel={NAV.inventory} onBack={onBack} current={item ? "Edit item" : "New item"} />
    <PageHeader title={title} subtitle={item ? "Catalogue details used across all stores." : "Add something the stores hold or issue."}
      actions={<><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={submit} disabled={!valid}><CheckCircle2 />{item ? "Save changes" : "Add item"}</Button></>} />
    <SplitLayout wideFirst>
      <Panel title="Item details">
        <FormStack>
          <FormGrid>
            <Field label="Name" required><Input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Reflective jacket" /></Field>
            <Field label="Unit cost (₹)" required><Input type="number" min={0} value={unitCost} onChange={event => setUnitCost(event.target.value)} /></Field>
            <Field label="Category"><Select value={category} onChange={event => setCategory(event.target.value as InventoryCategory)}><option value="uniform">Uniform</option><option value="equipment">Equipment</option></Select></Field>
            <Field label="Type" hint={kind === "asset" ? "Returned when the employee leaves" : "Kept by the employee"}><Select value={kind} onChange={event => setKind(event.target.value as InventoryKind)}><option value="consumable">Consumable</option><option value="asset">Returnable asset</option></Select></Field>
            <Field label="Reorder level" hint="Warn when total stock falls below this"><Input type="number" min={0} value={reorderLevel} onChange={event => setReorderLevel(event.target.value)} /></Field>
            <Field label="Pieces per joining kit" hint="0 if not part of the kit"><Input type="number" min={0} value={perKit} onChange={event => setPerKit(event.target.value)} /></Field>
          </FormGrid>
          <Field label="Sizes" hint="Comma separated. Leave empty for one size."><Input value={sizes} onChange={event => setSizes(event.target.value)} placeholder="S, M, L, XL" /></Field>
          {duplicate && <InlineAlert tone="danger">An item with this name already exists.</InlineAlert>}
          {item && <ToggleRow title="Active" description="Inactive items are hidden from issue and request forms. History is kept." checked={active} onChange={setActive} />}
        </FormStack>
      </Panel>
      {item ? <StockGlance itemId={item.id} /> : <Panel title="After adding">
        <p className="text-sm text-muted">The item starts with no stock in any of the {stores.length} stores. Use Receive stock to record the first batch.</p>
      </Panel>}
    </SplitLayout>
  </>;
}
