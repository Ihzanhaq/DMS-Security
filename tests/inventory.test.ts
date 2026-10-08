import { describe, expect, it } from "vitest";
import { ONE_SIZE, assetsOut, movementDeltas, onHand, requestShortfall, stockStatus, stockValue, validateMovement } from "@/lib/inventory";
import type { InventoryItem, StockMovement } from "@/types/domain";

const shirt: InventoryItem = { id: "shirt", name: "Shirt", category: "uniform", kind: "consumable", sizes: ["M", "L"], unitCost: 450, reorderLevel: 10, perKit: 2, active: true };
const torch: InventoryItem = { id: "torch", name: "Torch", category: "equipment", kind: "asset", sizes: [], unitCost: 300, reorderLevel: 5, perKit: 1, active: true };
const base = { date: "2026-10-01", by: "Store" };
const ledger: StockMovement[] = [
  { ...base, id: "m1", type: "receipt", itemId: "shirt", size: "M", qty: 20, storeId: "central", batchNo: "B1" },
  { ...base, id: "m2", type: "transfer", itemId: "shirt", size: "M", qty: 5, storeId: "central", toStoreId: "kochi" },
  { ...base, id: "m3", type: "issue", itemId: "shirt", size: "M", qty: 2, storeId: "kochi", employeeId: "E1" },
  { ...base, id: "m4", type: "adjustment", itemId: "shirt", size: "M", qty: 1, delta: -1, storeId: "central", reason: "Damaged" },
  { ...base, id: "m5", type: "receipt", itemId: "torch", size: ONE_SIZE, qty: 4, storeId: "central" },
  { ...base, id: "m6", type: "issue", itemId: "torch", size: ONE_SIZE, qty: 1, storeId: "central", employeeId: "E1", date: "2026-10-02" },
];

describe("movementDeltas", () => {
  it("splits a transfer into out and in", () => {
    expect(movementDeltas(ledger[1])).toEqual([
      { itemId: "shirt", size: "M", storeId: "central", delta: -5 },
      { itemId: "shirt", size: "M", storeId: "kochi", delta: 5 },
    ]);
  });
  it("uses the signed delta for adjustments", () => {
    expect(movementDeltas(ledger[3])[0].delta).toBe(-1);
  });
});

describe("onHand", () => {
  it("sums by store and size", () => {
    expect(onHand(ledger, { itemId: "shirt", size: "M", storeId: "central" })).toBe(14);
    expect(onHand(ledger, { itemId: "shirt", size: "M", storeId: "kochi" })).toBe(3);
    expect(onHand(ledger, { itemId: "shirt" })).toBe(17);
  });
});

describe("validateMovement", () => {
  it("blocks issuing more than on hand", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "issue", itemId: "shirt", size: "M", qty: 4, storeId: "kochi", employeeId: "E2" })).toMatch(/Only 3/);
  });
  it("blocks transfer to the same store", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "transfer", itemId: "shirt", size: "M", qty: 1, storeId: "central", toStoreId: "central" })).toMatch(/different store/);
  });
  it("requires a reason for adjustments", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "adjustment", itemId: "shirt", size: "M", qty: 1, delta: 1, storeId: "central" })).toMatch(/reason/i);
  });
  it("rejects non-positive quantities", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "receipt", itemId: "shirt", size: "M", qty: 0, storeId: "central" })).toMatch(/at least 1/);
  });
  it("accepts a valid receipt", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "receipt", itemId: "shirt", size: "L", qty: 5, storeId: "central" })).toBeNull();
  });
  it("requires an employee for issues", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "issue", itemId: "shirt", size: "M", qty: 1, storeId: "central" })).toMatch(/employee/i);
  });
  it("blocks returning more assets than the employee holds", () => {
    expect(validateMovement(ledger, { ...base, id: "x", type: "return", itemId: "torch", size: ONE_SIZE, qty: 2, storeId: "central", employeeId: "E1" }, [shirt, torch])).toMatch(/holds 1/);
  });
});

describe("assetsOut", () => {
  it("lists returnable items still held", () => {
    expect(assetsOut(ledger, [shirt, torch])).toEqual([{ employeeId: "E1", itemId: "torch", size: ONE_SIZE, qty: 1, since: "2026-10-02", storeId: "central" }]);
  });
});

describe("requestShortfall", () => {
  it("reports missing quantities at the store", () => {
    expect(requestShortfall(ledger, { storeId: "kochi", items: [{ itemId: "shirt", size: "M", qty: 5 }] })).toEqual([{ itemId: "shirt", size: "M", need: 5, have: 3 }]);
  });
  it("is empty when the store can cover the request", () => {
    expect(requestShortfall(ledger, { storeId: "central", items: [{ itemId: "shirt", size: "M", qty: 5 }] })).toEqual([]);
  });
});

describe("stockValue", () => {
  it("multiplies on-hand by unit cost", () => {
    expect(stockValue(ledger, [shirt, torch])).toBe(17 * 450 + 3 * 300);
  });
});

describe("stockStatus", () => {
  it("flags out, low and ok", () => {
    expect(stockStatus(0, 10)).toBe("out");
    expect(stockStatus(9, 10)).toBe("low");
    expect(stockStatus(10, 10)).toBe("ok");
  });
});
