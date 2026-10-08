import type { InventoryItem, MovementType, StockMovement } from "@/types/domain";

/** Size value used for items that come in one size. */
export const ONE_SIZE = "—";

export const sizesOf = (item: Pick<InventoryItem, "sizes">) => item.sizes.length ? item.sizes : [ONE_SIZE];

export const movementTypeLabel: Record<MovementType, string> = {
  receipt: "Received", issue: "Issued", return: "Returned", transfer: "Transferred", adjustment: "Adjusted", "write-off": "Written off",
};

type Delta = { itemId: string; size: string; storeId: string; delta: number };

/** Signed stock changes a movement makes, one per affected store. */
export function movementDeltas(movement: StockMovement): Delta[] {
  const at = (storeId: string, delta: number): Delta => ({ itemId: movement.itemId, size: movement.size, storeId, delta });
  switch (movement.type) {
    case "receipt":
    case "return": return [at(movement.storeId, movement.qty)];
    case "issue":
    case "write-off": return [at(movement.storeId, -movement.qty)];
    case "adjustment": return [at(movement.storeId, movement.delta ?? movement.qty)];
    case "transfer": return [at(movement.storeId, -movement.qty), at(movement.toStoreId ?? movement.storeId, movement.qty)];
  }
}

type StockQuery = { itemId: string; size?: string; storeId?: string };

/** Units on hand, optionally narrowed to one size and/or one store. */
export function onHand(movements: readonly StockMovement[], query: StockQuery) {
  let total = 0;
  for (const movement of movements) {
    if (movement.itemId !== query.itemId) continue;
    if (query.size !== undefined && movement.size !== query.size) continue;
    for (const delta of movementDeltas(movement)) {
      if (query.storeId === undefined || delta.storeId === query.storeId) total += delta.delta;
    }
  }
  return total;
}

/** Units of an asset an employee currently holds (issues minus returns). */
export function held(movements: readonly StockMovement[], employeeId: string, itemId: string, size?: string) {
  return movements.reduce((sum, movement) => {
    if (movement.employeeId !== employeeId || movement.itemId !== itemId || (size !== undefined && movement.size !== size)) return sum;
    if (movement.type === "issue") return sum + movement.qty;
    if (movement.type === "return") return sum - movement.qty;
    return sum;
  }, 0);
}

/** Why a movement can't be posted against this ledger, or null when it can. */
export function validateMovement(movements: readonly StockMovement[], movement: StockMovement, items?: readonly InventoryItem[]): string | null {
  if (!Number.isFinite(movement.qty) || movement.qty < 1) return "Quantity must be at least 1.";
  if (!movement.itemId) return "Choose an item.";
  if (!movement.storeId) return "Choose a store.";
  if ((movement.type === "issue" || movement.type === "return") && !movement.employeeId) return "Choose an employee.";
  if ((movement.type === "adjustment" || movement.type === "write-off") && !movement.reason?.trim()) return "Give a reason for this change.";
  if (movement.type === "transfer" && (!movement.toStoreId || movement.toStoreId === movement.storeId)) return "Transfer to a different store.";
  if (movement.type === "return" && movement.employeeId) {
    const item = items?.find(entry => entry.id === movement.itemId);
    if (item?.kind === "asset") {
      const holding = held(movements, movement.employeeId, movement.itemId, movement.size);
      if (movement.qty > holding) return `This employee holds ${holding}.`;
    }
  }
  const outgoing = movementDeltas(movement).find(delta => delta.delta < 0);
  if (outgoing) {
    const available = onHand(movements, { itemId: movement.itemId, size: movement.size, storeId: outgoing.storeId });
    if (-outgoing.delta > available) return `Only ${available} in stock at this store.`;
  }
  return null;
}

export type AssetHolding = { employeeId: string; itemId: string; size: string; qty: number; since: string; storeId: string };

/** Returnable items still with employees, one row per employee, item and size. */
export function assetsOut(movements: readonly StockMovement[], items: readonly InventoryItem[]): AssetHolding[] {
  const assets = new Set(items.filter(item => item.kind === "asset").map(item => item.id));
  const rows = new Map<string, AssetHolding>();
  for (const movement of movements) {
    if (!assets.has(movement.itemId) || !movement.employeeId || (movement.type !== "issue" && movement.type !== "return")) continue;
    const key = `${movement.employeeId}|${movement.itemId}|${movement.size}`;
    const row = rows.get(key) ?? { employeeId: movement.employeeId, itemId: movement.itemId, size: movement.size, qty: 0, since: movement.date, storeId: movement.storeId };
    row.qty += movement.type === "issue" ? movement.qty : -movement.qty;
    if (movement.type === "issue") { row.since = movement.date; row.storeId = movement.storeId; }
    rows.set(key, row);
  }
  return [...rows.values()].filter(row => row.qty > 0);
}

export type Shortfall = { itemId: string; size: string; need: number; have: number };

/** Lines a store can't cover for a request. Empty when the request can be dispatched. */
export function requestShortfall(movements: readonly StockMovement[], request: { storeId: string; items: { itemId: string; size: string; qty: number }[] }): Shortfall[] {
  return request.items
    .map(line => ({ itemId: line.itemId, size: line.size, need: line.qty, have: onHand(movements, { itemId: line.itemId, size: line.size, storeId: request.storeId }) }))
    .filter(line => line.have < line.need);
}

/** Value of stock on hand at unit cost. */
export function stockValue(movements: readonly StockMovement[], items: readonly InventoryItem[], storeId?: string) {
  return items.reduce((sum, item) => sum + Math.max(0, onHand(movements, { itemId: item.id, storeId })) * item.unitCost, 0);
}

export type StockStatus = "ok" | "low" | "out";
export const stockStatus = (qty: number, reorderLevel: number): StockStatus => qty <= 0 ? "out" : qty < reorderLevel ? "low" : "ok";
