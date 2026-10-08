import { ONE_SIZE, sizesOf } from "@/lib/inventory";
import type { InventoryItem, StockMovement, Store, UniformRequest } from "@/types/domain";

export const stores: Store[] = [
  { id: "central", name: "Central store", city: "Thiruvananthapuram" },
  { id: "kochi", name: "Kochi branch", city: "Kochi" },
  { id: "kozhikode", name: "Kozhikode branch", city: "Kozhikode" },
];

const APPAREL = ["S", "M", "L", "XL", "XXL"];
const WAIST = ["30", "32", "34", "36", "38"];
const SHOE = ["6", "7", "8", "9", "10", "11"];

export const inventoryItems: InventoryItem[] = [
  { id: "shirt", name: "Shirt (full sleeve)", category: "uniform", kind: "consumable", sizes: APPAREL, unitCost: 450, reorderLevel: 60, perKit: 2, active: true },
  { id: "trousers", name: "Trousers", category: "uniform", kind: "consumable", sizes: WAIST, unitCost: 550, reorderLevel: 60, perKit: 2, active: true },
  { id: "shoes", name: "Shoes (black)", category: "uniform", kind: "consumable", sizes: SHOE, unitCost: 900, reorderLevel: 40, perKit: 1, active: true },
  { id: "belt", name: "Belt", category: "uniform", kind: "consumable", sizes: [], unitCost: 250, reorderLevel: 50, perKit: 1, active: true },
  { id: "cap", name: "Cap", category: "uniform", kind: "consumable", sizes: [], unitCost: 200, reorderLevel: 50, perKit: 1, active: true },
  { id: "raincoat", name: "Raincoat", category: "uniform", kind: "consumable", sizes: APPAREL, unitCost: 600, reorderLevel: 70, perKit: 1, active: true },
  { id: "sweater", name: "Sweater", category: "uniform", kind: "consumable", sizes: APPAREL, unitCost: 600, reorderLevel: 40, perKit: 1, active: true },
  { id: "badge", name: "Name badge", category: "uniform", kind: "consumable", sizes: [], unitCost: 80, reorderLevel: 60, perKit: 1, active: true },
  { id: "epaulette", name: "Shoulder epaulette", category: "uniform", kind: "consumable", sizes: [], unitCost: 120, reorderLevel: 50, perKit: 2, active: true },
  { id: "whistle", name: "Whistle and lanyard", category: "uniform", kind: "consumable", sizes: [], unitCost: 90, reorderLevel: 40, perKit: 1, active: true },
  { id: "torch", name: "Torch", category: "equipment", kind: "asset", sizes: [], unitCost: 350, reorderLevel: 60, perKit: 1, active: true },
  { id: "baton", name: "Baton", category: "equipment", kind: "asset", sizes: [], unitCost: 400, reorderLevel: 40, perKit: 0, active: true },
  { id: "walkie", name: "Walkie-talkie", category: "equipment", kind: "asset", sizes: [], unitCost: 3200, reorderLevel: 15, perKit: 0, active: true },
  { id: "register", name: "Duty register", category: "equipment", kind: "consumable", sizes: [], unitCost: 150, reorderLevel: 30, perKit: 0, active: true },
  { id: "metal-detector", name: "Hand-held metal detector", category: "equipment", kind: "asset", sizes: [], unitCost: 2800, reorderLevel: 8, perKit: 0, active: true },
];

/** Opening central-store stock per item, matching the figures on the old uniform screen. */
const opening: Record<string, number> = {
  shirt: 184, trousers: 156, shoes: 98, belt: 221, cap: 176, raincoat: 63, sweater: 112, badge: 268, epaulette: 204, whistle: 147,
  torch: 58, baton: 131, walkie: 22, register: 64, "metal-detector": 10,
};

/** Middle sizes sell most; spread opening stock across sizes with a bell-ish weighting. */
function spread(total: number, sizes: string[]) {
  const weights = sizes.map((_, index) => 1 + Math.min(index, sizes.length - 1 - index));
  const sum = weights.reduce((a, b) => a + b, 0);
  const qty = weights.map(weight => Math.floor(total * weight / sum));
  qty[Math.floor(sizes.length / 2)] += total - qty.reduce((a, b) => a + b, 0);
  return sizes.map((size, index) => ({ size, qty: qty[index] }));
}

const batchOf: Record<string, { batchNo: string; date: string; supplier: string }> = {
  shirt: { batchNo: "UB-2607", date: "2026-07-18", supplier: "Kerala Textiles, Aluva" },
  trousers: { batchNo: "UB-2611", date: "2026-08-02", supplier: "Kerala Textiles, Aluva" },
  shoes: { batchNo: "UB-2598", date: "2026-06-25", supplier: "Paragon Footwear" },
};

let seq = 0;
const id = () => `MV-${String(++seq).padStart(4, "0")}`;

function buildMovements(): StockMovement[] {
  const ledger: StockMovement[] = [];
  for (const item of inventoryItems) {
    const batch = batchOf[item.id] ?? { batchNo: `UB-25${String(seq % 90).padStart(2, "0")}`, date: "2026-05-20", supplier: item.category === "equipment" ? "SecureGear Traders" : "Kerala Textiles, Aluva" };
    for (const line of spread(opening[item.id] ?? 0, sizesOf(item))) {
      if (line.qty > 0) ledger.push({ id: id(), date: batch.date, type: "receipt", itemId: item.id, size: line.size, qty: line.qty, storeId: "central", batchNo: batch.batchNo, supplier: batch.supplier, by: "Central store" });
    }
  }
  // Branch stores get a share of the high-use items.
  const transfers: [string, string, number, string][] = [
    ["shirt", "M", 14, "kochi"], ["shirt", "L", 12, "kochi"], ["trousers", "32", 10, "kochi"], ["shoes", "9", 3, "kochi"], ["cap", ONE_SIZE, 20, "kochi"], ["torch", ONE_SIZE, 10, "kochi"], ["walkie", ONE_SIZE, 4, "kochi"],
    ["shirt", "M", 10, "kozhikode"], ["shirt", "L", 8, "kozhikode"], ["trousers", "34", 8, "kozhikode"], ["shoes", "8", 6, "kozhikode"], ["belt", ONE_SIZE, 25, "kozhikode"], ["torch", ONE_SIZE, 8, "kozhikode"],
  ];
  for (const [itemId, size, qty, to] of transfers) ledger.push({ id: id(), date: "2026-08-20", type: "transfer", itemId, size, qty, storeId: "central", toStoreId: to, by: "Central store" });
  const issues: [string, string, number, string, string, string][] = [
    ["BMG-1840", "torch", 1, ONE_SIZE, "kochi", "2026-09-01"],
    ["BMG-1840", "walkie", 1, ONE_SIZE, "kochi", "2026-09-01"],
    ["BMG-2274", "torch", 1, ONE_SIZE, "kochi", "2026-09-04"],
    ["BMG-1988", "baton", 1, ONE_SIZE, "central", "2026-08-28"],
    ["BMG-1988", "metal-detector", 1, ONE_SIZE, "central", "2026-08-28"],
    ["BMG-2274", "shirt", 2, "M", "kochi", "2026-09-04"],
    ["BMG-1840", "shirt", 1, "L", "kochi", "2026-09-08"],
  ];
  for (const [employeeId, itemId, qty, size, storeId, date] of issues) ledger.push({ id: id(), date, type: "issue", itemId, size, qty, storeId, employeeId, by: "Store desk" });
  ledger.push({ id: id(), date: "2026-09-15", type: "write-off", itemId: "raincoat", size: "XXL", qty: 3, storeId: "central", reason: "Water damage in store", by: "Central store" });
  ledger.push({ id: id(), date: "2026-09-19", type: "adjustment", itemId: "cap", size: ONE_SIZE, qty: 2, delta: -2, storeId: "kochi", reason: "Count correction", by: "Kochi branch" });
  return ledger;
}

export const stockMovements: StockMovement[] = buildMovements();

export const uniformRequests: UniformRequest[] = [
  { id: "UR-1", employeeId: "BMG-1840", items: [{ itemId: "shirt", size: "L", qty: 1 }], status: "dispatched", requestedOn: "2026-09-06", amount: 450, recoveryPlan: "Full salary deduction", storeId: "kochi",
    history: [{ status: "requested", on: "2026-09-06", by: "Suresh Babu" }, { status: "approved", on: "2026-09-07", by: "Store desk" }, { status: "dispatched", on: "2026-09-08", by: "Store desk" }] },
  { id: "UR-2", employeeId: "BMG-2087", items: [{ itemId: "shoes", size: "9", qty: 1 }], status: "requested", requestedOn: "2026-09-10", amount: 900, recoveryPlan: "Partial advance", storeId: "kochi", note: "Sole worn through.",
    history: [{ status: "requested", on: "2026-09-10", by: "Guard app" }] },
  { id: "UR-3", employeeId: "BMG-1988", items: [{ itemId: "raincoat", size: "L", qty: 1 }, { itemId: "cap", size: ONE_SIZE, qty: 1 }], status: "approved", requestedOn: "2026-09-18", amount: 800, recoveryPlan: "Full upfront payment", storeId: "central",
    history: [{ status: "requested", on: "2026-09-18", by: "Guard app" }, { status: "approved", on: "2026-09-19", by: "Store desk" }] },
  { id: "UR-4", employeeId: "BMG-2274", items: [{ itemId: "trousers", size: "30", qty: 2 }], status: "requested", requestedOn: "2026-09-21", amount: 1100, recoveryPlan: "Full salary deduction", storeId: "kochi",
    history: [{ status: "requested", on: "2026-09-21", by: "Guard app" }] },
];
