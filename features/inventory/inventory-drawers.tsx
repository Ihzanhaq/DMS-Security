"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PackagePlus, Plus, Trash2 } from "lucide-react";
import { Button, Field, FormGrid, FormStack, InlineAlert, Input, SegmentedControl, Select, Sheet, Textarea, ToggleRow } from "@/components/ui-kit";
import { useInventory, type NewMovement } from "@/components/shared/inventory-context";
import { useOnboarding } from "@/components/shared/onboarding-context";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY } from "@/lib/app-date";
import { ONE_SIZE, onHand, sizesOf } from "@/lib/inventory";
import { employees, rupees, uniformPlans } from "@/lib/mock-data";
import type { InventoryCategory, InventoryItem, InventoryKind, UniformSizes } from "@/types/domain";

export type Prefill = { itemId?: string; size?: string; storeId?: string; toStoreId?: string };
export type MovementMode = "receive" | "transfer" | "adjust";

const STORE_DESK = "Store desk";

/** Item and size pickers. Changing the item resets the size to the item's first size. */
function ItemSizeFields({ itemId, size, onChange, storeId }: { itemId: string; size: string; onChange: (itemId: string, size: string) => void; storeId?: string }) {
  const { items, movements } = useInventory();
  const active = items.filter(item => item.active);
  const item = items.find(entry => entry.id === itemId);
  return <>
    <Field label="Item" required>
      <Select value={itemId} onChange={event => { const next = items.find(entry => entry.id === event.target.value); onChange(event.target.value, next ? sizesOf(next)[0] : ONE_SIZE); }}>
        {active.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </Select>
    </Field>
    <Field label="Size" required hint={storeId ? `${onHand(movements, { itemId, size, storeId })} in stock at this store` : undefined}>
      <Select value={size} onChange={event => onChange(itemId, event.target.value)} disabled={!item?.sizes.length}>
        {(item ? sizesOf(item) : [ONE_SIZE]).map(option => <option key={option} value={option}>{option === ONE_SIZE ? "One size" : option}</option>)}
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

const qtyValue = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

const modeCopy: Record<MovementMode, { title: string; subtitle: string; submit: string; done: string }> = {
  receive: { title: "Receive stock", subtitle: "Goods arriving from a supplier. Recorded as a new batch.", submit: "Receive", done: "Stock received" },
  transfer: { title: "Transfer stock", subtitle: "Move stock between stores.", submit: "Transfer", done: "Stock transferred" },
  adjust: { title: "Adjust stock", subtitle: "Correct a count, or write off damaged or lost stock.", submit: "Save adjustment", done: "Stock adjusted" },
};

type AdjustKind = "add" | "remove" | "write-off";

/** Receive, transfer and adjust share one drawer; the fields change with the mode. */
export function MovementDrawer({ mode, prefill, onClose }: { mode: MovementMode; prefill?: Prefill; onClose: () => void }) {
  const { items, stores, movements, post } = useInventory();
  const notify = useToast();
  const first = items.find(item => item.id === prefill?.itemId) ?? items.find(item => item.active) ?? items[0];
  const [itemId, setItemId] = useState(first.id);
  const [size, setSize] = useState(prefill?.size ?? sizesOf(first)[0]);
  // A transfer into a store defaults to pulling from whichever other store holds most of the item.
  const [storeId, setStoreId] = useState(() => prefill?.storeId ?? stores.filter(store => store.id !== prefill?.toStoreId)
    .map(store => ({ id: store.id, qty: prefill?.itemId ? onHand(movements, { itemId: prefill.itemId, size: prefill.size, storeId: store.id }) : 0 }))
    .sort((a, b) => b.qty - a.qty)[0].id);
  const [toStoreId, setToStoreId] = useState(prefill?.toStoreId && prefill.toStoreId !== storeId ? prefill.toStoreId : stores.find(store => store.id !== storeId)!.id);
  const [qty, setQty] = useState("1");
  const [date, setDate] = useState(APP_TODAY);
  const [batchNo, setBatchNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [adjustKind, setAdjustKind] = useState<AdjustKind>("remove");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = modeCopy[mode];

  const pickItem = (nextItem: string, nextSize: string) => { setItemId(nextItem); setSize(nextSize); setError(null); };

  const submit = () => {
    const base = { date, itemId, size, qty: qtyValue(qty), storeId, by: STORE_DESK };
    const movement: NewMovement = mode === "receive" ? { ...base, type: "receipt", batchNo: batchNo.trim() || undefined, supplier: supplier.trim() || undefined }
      : mode === "transfer" ? { ...base, type: "transfer", toStoreId }
        : adjustKind === "write-off" ? { ...base, type: "write-off", reason }
          : { ...base, type: "adjustment", delta: adjustKind === "add" ? base.qty : -base.qty, reason };
    const problem = post(movement);
    if (problem) { setError(problem); return; }
    notify(copy.done);
    onClose();
  };

  return <Sheet open title={copy.title} subtitle={copy.subtitle} onClose={onClose}
    footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={qtyValue(qty) < 1}><CheckCircle2 />{copy.submit}</Button></>}>
    <FormStack>
      {mode === "adjust" && <SegmentedControl className="mb-0" value={adjustKind} onChange={setAdjustKind} options={[{ id: "add", label: "Add" }, { id: "remove", label: "Remove" }, { id: "write-off", label: "Write off" }]} />}
      <FormGrid>
        <StoreSelect label={mode === "transfer" ? "From store" : "Store"} value={storeId} onChange={next => { setStoreId(next); if (next === toStoreId) setToStoreId(stores.find(store => store.id !== next)!.id); setError(null); }} />
        {mode === "transfer" && <StoreSelect label="To store" value={toStoreId} onChange={setToStoreId} exclude={storeId} />}
        <ItemSizeFields itemId={itemId} size={size} onChange={pickItem} storeId={mode === "receive" ? undefined : storeId} />
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
  </Sheet>;
}

type IssueLine = { key: number; itemId: string; size: string; qty: number };

/** Size from the employee's recorded sizes, when the item uses that size chart. */
function sizeFor(item: InventoryItem, sizes: UniformSizes) {
  const preferred = /trouser/i.test(item.name) ? sizes.trouser : /shoe/i.test(item.name) ? sizes.shoe : sizes.shirt;
  const options = sizesOf(item);
  return options.includes(preferred) ? preferred : options[Math.floor(options.length / 2)];
}

/** Hand stock to an employee: replacements, equipment, or the full joining kit. */
export function IssueDrawer({ onClose }: { onClose: () => void }) {
  const { items, stores, movements, post } = useInventory();
  const { getProfile } = useOnboarding();
  const notify = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0].id);
  const [storeId, setStoreId] = useState(stores[0].id);
  const [plan, setPlan] = useState(uniformPlans[2].name);
  const [lines, setLines] = useState<IssueLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const active = items.filter(item => item.active);
  const amount = lines.reduce((sum, line) => sum + (items.find(item => item.id === line.itemId)?.unitCost ?? 0) * line.qty, 0);
  const hasUniform = lines.some(line => items.find(item => item.id === line.itemId)?.category === "uniform");

  const addKit = () => {
    const sizes = getProfile(employeeId).uniformSizes;
    setLines(active.filter(item => item.perKit > 0).map((item, index) => ({ key: Date.now() + index, itemId: item.id, size: sizeFor(item, sizes), qty: item.perKit })));
    setError(null);
  };
  const addLine = () => setLines(current => [...current, { key: Date.now(), itemId: active[0].id, size: sizesOf(active[0])[0], qty: 1 }]);
  const update = (key: number, patch: Partial<IssueLine>) => { setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line)); setError(null); };

  const submit = () => {
    const problem = post(lines.map(line => ({ date: APP_TODAY, type: "issue", itemId: line.itemId, size: line.size, qty: line.qty, storeId, employeeId, by: STORE_DESK })));
    if (problem) { setError(problem); return; }
    const name = employees.find(employee => employee.id === employeeId)?.name ?? employeeId;
    notify(`Issued to ${name}${hasUniform && plan !== uniformPlans[0].name ? ` · ${rupees(amount)} queued for recovery (${plan})` : ""}`);
    onClose();
  };

  return <Sheet open wide title="Issue to employee" subtitle="Stock leaves the store now. Returnable items stay on the employee's record until returned." onClose={onClose}
    footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!lines.length || lines.some(line => line.qty < 1)}><CheckCircle2 />Issue {lines.length ? `${lines.length} item${lines.length > 1 ? "s" : ""}` : ""}</Button></>}>
    <FormStack>
      <FormGrid>
        <Field label="Employee" required>
          <Select value={employeeId} onChange={event => { setEmployeeId(event.target.value); setError(null); }}>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} · {employee.id}</option>)}</Select>
        </Field>
        <StoreSelect label="Issue from" value={storeId} onChange={next => { setStoreId(next); setError(null); }} />
      </FormGrid>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={addKit}><PackagePlus />Fill joining kit</Button>
        <Button variant="outline" size="sm" onClick={addLine}><Plus />Add item</Button>
      </div>
      {lines.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">Add items, or fill the joining kit using this employee&apos;s recorded sizes.</p>}
      {lines.length > 0 && <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-3 py-2 text-left font-semibold">Item</th><th className="px-3 py-2 text-left font-semibold">Size</th><th className="px-3 py-2 text-right font-semibold">Qty</th><th className="px-3 py-2 text-right font-semibold">In stock</th><th className="w-10" /></tr>
          </thead>
          <tbody>
            {lines.map(line => {
              const item = items.find(entry => entry.id === line.itemId)!;
              const stock = onHand(movements, { itemId: line.itemId, size: line.size, storeId });
              return <tr key={line.key} className="border-t border-border">
                <td className="px-3 py-2"><Select aria-label="Item" value={line.itemId} onChange={event => { const next = items.find(entry => entry.id === event.target.value)!; update(line.key, { itemId: next.id, size: sizesOf(next)[0] }); }}>{active.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></td>
                <td className="w-28 px-3 py-2"><Select aria-label="Size" value={line.size} disabled={!item.sizes.length} onChange={event => update(line.key, { size: event.target.value })}>{sizesOf(item).map(option => <option key={option} value={option}>{option === ONE_SIZE ? "One size" : option}</option>)}</Select></td>
                <td className="w-24 px-3 py-2"><Input aria-label="Quantity" type="number" min={1} className="text-right" value={line.qty} onChange={event => update(line.key, { qty: qtyValue(event.target.value) })} /></td>
                <td className={`w-20 px-3 py-2 text-right tabular-nums ${stock < line.qty ? "font-semibold text-status-danger" : "text-muted"}`}>{stock}</td>
                <td className="px-1 py-2"><Button variant="ghost" size="icon" aria-label={`Remove ${item.name}`} onClick={() => setLines(current => current.filter(entry => entry.key !== line.key))}><Trash2 /></Button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
      {hasUniform && <Field label="Recovery plan" hint={`Uniform value ${rupees(amount)}`}>
        <Select value={plan} onChange={event => setPlan(event.target.value)}>{uniformPlans.map(option => <option key={option.name}>{option.name}</option>)}</Select>
      </Field>}
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
    </FormStack>
  </Sheet>;
}

/** Add or edit a catalogue item. */
export function ItemFormDrawer({ item, onClose }: { item?: InventoryItem; onClose: () => void }) {
  const { items, upsertItem } = useInventory();
  const notify = useToast();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<InventoryCategory>(item?.category ?? "uniform");
  const [kind, setKind] = useState<InventoryKind>(item?.kind ?? "consumable");
  const [sizes, setSizes] = useState(item?.sizes.join(", ") ?? "");
  const [unitCost, setUnitCost] = useState(String(item?.unitCost ?? ""));
  const [reorderLevel, setReorderLevel] = useState(String(item?.reorderLevel ?? 20));
  const [perKit, setPerKit] = useState(String(item?.perKit ?? 0));
  const [active, setActive] = useState(item?.active ?? true);
  const duplicate = useMemo(() => items.some(entry => entry.id !== item?.id && entry.name.trim().toLowerCase() === name.trim().toLowerCase()), [items, item, name]);
  const valid = name.trim() && !duplicate && Number(unitCost) >= 0 && unitCost !== "";

  const submit = () => {
    const id = item?.id ?? (name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `item-${Date.now()}`);
    upsertItem({
      id, name: name.trim(), category, kind, active,
      sizes: sizes.split(",").map(size => size.trim()).filter(Boolean),
      unitCost: Number(unitCost), reorderLevel: qtyValue(reorderLevel), perKit: qtyValue(perKit),
    });
    notify(item ? "Item updated" : "Item added");
    onClose();
  };

  return <Sheet open title={item ? `Edit ${item.name}` : "Add item"} subtitle="Catalogue details used across stores." onClose={onClose}
    footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!valid}><CheckCircle2 />{item ? "Save" : "Add item"}</Button></>}>
    <FormStack>
      <Field label="Name" required><Input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Reflective jacket" /></Field>
      {duplicate && <InlineAlert tone="danger">An item with this name already exists.</InlineAlert>}
      <FormGrid>
        <Field label="Category"><Select value={category} onChange={event => setCategory(event.target.value as InventoryCategory)}><option value="uniform">Uniform</option><option value="equipment">Equipment</option></Select></Field>
        <Field label="Type" hint={kind === "asset" ? "Returned when the employee leaves" : "Kept by the employee"}><Select value={kind} onChange={event => setKind(event.target.value as InventoryKind)}><option value="consumable">Consumable</option><option value="asset">Returnable asset</option></Select></Field>
        <Field label="Unit cost (₹)" required><Input type="number" min={0} value={unitCost} onChange={event => setUnitCost(event.target.value)} /></Field>
        <Field label="Reorder level" hint="Warn when total stock falls below this"><Input type="number" min={0} value={reorderLevel} onChange={event => setReorderLevel(event.target.value)} /></Field>
        <Field label="Pieces per joining kit" hint="0 if not part of the kit"><Input type="number" min={0} value={perKit} onChange={event => setPerKit(event.target.value)} /></Field>
        <Field label="Sizes" hint="Comma separated. Leave empty for one size."><Input value={sizes} onChange={event => setSizes(event.target.value)} placeholder="S, M, L, XL" /></Field>
      </FormGrid>
      {item && <ToggleRow title="Active" description="Inactive items are hidden from issue and request forms. History is kept." checked={active} onChange={setActive} />}
    </FormStack>
  </Sheet>;
}
