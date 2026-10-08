"use client";

import { useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2, Pencil, Plus, Shirt, Warehouse } from "lucide-react";
import { Button, DataTable, Field, FormStack, InlineAlert, Input, PageHeader, Panel, Sheet, StatStrip, StatusChip } from "@/components/ui-kit";
import { useInventory } from "@/components/shared/inventory-context";
import { useToast } from "@/components/shared/toast-context";
import { assetsOut, onHand, stockValue } from "@/lib/inventory";
import { NAV } from "@/lib/labels";
import { rupees } from "@/lib/mock-data";
import type { NavClickMeta } from "@/lib/nav-config";
import type { Store } from "@/types/domain";

/** Stores and branch stock rooms. Selecting one opens the inventory filtered to it. */
export function StoresScreen({ onNavigate }: { onNavigate: (view: string, meta?: string | NavClickMeta) => void }) {
  const { stores, items, movements } = useInventory();
  const [editing, setEditing] = useState<Store | "new" | null>(null);
  const active = items.filter(item => item.active);
  const holdings = assetsOut(movements, items);

  const rows = stores.map(store => {
    const units = active.reduce((sum, item) => sum + onHand(movements, { itemId: item.id, storeId: store.id }), 0);
    const empty = active.filter(item => onHand(movements, { itemId: item.id, storeId: store.id }) <= 0).length;
    return { store, units, value: stockValue(movements, active, store.id), empty, assets: holdings.filter(row => row.storeId === store.id).reduce((sum, row) => sum + row.qty, 0) };
  });

  return <>
    <PageHeader title={NAV.stores} subtitle="Where stock is held. Open a store to see its stock, movements and transfers."
      actions={<Button onClick={() => setEditing("new")}><Plus />Add store</Button>} />
    <StatStrip items={[
      { icon: Warehouse, value: String(stores.length), label: "Stores", note: "Central and branches" },
      { icon: Boxes, value: rows.reduce((sum, row) => sum + row.units, 0).toLocaleString("en-IN"), label: "Units on hand", note: "All stores", tone: "green" },
      { icon: Shirt, value: rupees(rows.reduce((sum, row) => sum + row.value, 0)), label: "Stock value", note: "At unit cost" },
      { icon: AlertTriangle, value: String(rows.reduce((sum, row) => sum + row.empty, 0)), label: "Empty item slots", note: "Items a store has none of", tone: "orange" },
    ]} />
    <Panel flush title="All stores" description="Select a store to open its inventory.">
      <DataTable rows={rows} rowKey={row => row.store.id} onRowClick={row => onNavigate("inventory", { tab: `store:${row.store.id}` })}
        columns={[
          { header: "Store", cell: row => <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald"><Warehouse className="h-4 w-4" /></span>
            <div><strong className="block font-medium">{row.store.name}</strong><span className="text-xs text-muted">{row.store.city}</span></div>
          </div> },
          { header: "Units", align: "right", cell: row => <strong className="tabular-nums">{row.units.toLocaleString("en-IN")}</strong> },
          { header: "Stock value", align: "right", cell: row => <span className="tabular-nums">{rupees(row.value)}</span> },
          { header: "Items out", cell: row => row.empty ? <StatusChip tone="warning">{row.empty} of {active.length} items</StatusChip> : <StatusChip tone="success">All stocked</StatusChip>, hideOnMobile: true },
          { header: "Assets with staff", align: "right", cell: row => <span className="tabular-nums text-muted">{row.assets}</span>, hideOnMobile: true },
          { header: "", align: "right", cell: row => <Button variant="ghost" size="sm" onClick={event => { event.stopPropagation(); setEditing(row.store); }}><Pencil />Edit</Button> },
        ]} />
    </Panel>
    {editing && <StoreDialog store={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
  </>;
}

function StoreDialog({ store, onClose }: { store?: Store; onClose: () => void }) {
  const { stores, upsertStore } = useInventory();
  const notify = useToast();
  const [name, setName] = useState(store?.name ?? "");
  const [city, setCity] = useState(store?.city ?? "");
  const duplicate = stores.some(entry => entry.id !== store?.id && entry.name.trim().toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim() && city.trim() && !duplicate;
  const save = () => {
    const id = store?.id ?? (name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `store-${Date.now()}`);
    upsertStore({ id, name: name.trim(), city: city.trim() });
    notify(store ? "Store updated" : "Store added");
    onClose();
  };
  return <Sheet open side="center" title={store ? `Edit ${store.name}` : "Add store"} subtitle="A place stock is held and issued from." onClose={onClose}
    footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={save}><CheckCircle2 />{store ? "Save" : "Add store"}</Button></>}>
    <FormStack>
      <Field label="Store name" required><Input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Thrissur branch" /></Field>
      <Field label="City" required><Input value={city} onChange={event => setCity(event.target.value)} placeholder="e.g. Thrissur" /></Field>
      {duplicate && <InlineAlert tone="danger">A store with this name already exists.</InlineAlert>}
    </FormStack>
  </Sheet>;
}
