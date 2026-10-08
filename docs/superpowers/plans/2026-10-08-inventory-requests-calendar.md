# Inventory, Uniform Requests and Site Calendar Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dedicated Inventory and Uniform requests pages under a new top-level "Inventory" nav module, a ledger-based stock system across three stores, and holiday/closure/event/note marks on the site attendance calendar.

**Architecture:** Pure logic in `lib/inventory.ts` and `lib/site-calendar.ts` (unit-tested with vitest). Two React contexts (`inventory-context`, `site-calendar-context`) persist to localStorage and sync tabs via BroadcastChannel, following `components/shared/ops-context.tsx`. Screens in `features/inventory/`. Calendar marks use FullCalendar v7 `interaction` plugin (`selectable`) and background events.

**Tech Stack:** Next 16 / vinext, React 19, TypeScript, Tailwind 4, `@fullcalendar/react` v7, vitest, lucide-react, in-repo ui-kit (`components/ui-kit`).

Spec: `docs/superpowers/specs/2026-10-08-inventory-requests-calendar-design.md`

Gates after every task: `npx tsc --noEmit -p .` clean for touched files, `npm test` green. Final: `npm run lint` (2 pre-existing errors allowed), `npm run build`.

---

## File map

| File | Responsibility |
|---|---|
| `types/domain.ts` | `InventoryItem`, `Store`, `StockMovement`, `MovementType`, `UniformRequest` (extended), `SiteCalendarMark`; `AppView` adds `inventory`, `uniform-requests` |
| `lib/inventory.ts` | Pure: deltas, stock levels, on-hand queries, validation, assets out, request shortfall, stock value |
| `lib/site-calendar.ts` | Pure: date coverage, marks for site, marks on date, mark summary label |
| `lib/mock-data.ts` | Seeds: stores, items, receipt movements, requests (new shape), calendar marks |
| `components/shared/inventory-context.tsx` | State + actions for items/movements/requests |
| `components/shared/site-calendar-context.tsx` | State + actions for marks |
| `features/inventory/inventory-screen.tsx` | Inventory page: stats, store filter, tabs |
| `features/inventory/inventory-drawers.tsx` | Receive / Transfer / Adjust / Issue / Item form / Item detail drawers |
| `features/inventory/uniform-requests-screen.tsx` | Requests queue page |
| `features/operations/site-calendar-mark-sheet.tsx` | Add/edit mark sheet |
| `features/operations/site-attendance-calendar.tsx` | Selectable calendar, mark rendering, legend |
| `features/portals/portal-screens.tsx` | Guard uniform uses context |
| `features/payroll/payroll-screens.tsx` | Delete `UniformsScreen` |
| `features/workflows/workflow-screens.tsx` | Drop `uniform` workflow kind |
| `components/layout/hrms-app.tsx` | Providers, routes (`uniforms`/`uniform-issue` alias to inventory) |
| `lib/nav-config.ts`, `lib/labels.ts`, `lib/access.ts` | New module, labels, permissions + stored-key migration |
| `tests/inventory.test.ts`, `tests/site-calendar.test.ts` | Unit tests |

---

### Task 1: Domain types

**Files:** Modify `types/domain.ts`

- [ ] Add `"inventory" | "uniform-requests"` to `AppView` (keep `"uniforms"` and `"uniform-issue"` as aliases).
- [ ] Replace the Module 6 block with:

```ts
export type InventoryCategory = "uniform" | "equipment";
export type InventoryKind = "consumable" | "asset";
export type InventoryItem = {
  id: string; name: string; category: InventoryCategory; kind: InventoryKind;
  /** Empty means one size, stored on movements as ONE_SIZE. */
  sizes: string[]; unitCost: number; reorderLevel: number; perKit: number; active: boolean;
};
export type Store = { id: string; name: string; city: string };
export type MovementType = "receipt" | "issue" | "return" | "transfer" | "adjustment" | "write-off";
export type StockMovement = {
  id: string; date: string; type: MovementType; itemId: string; size: string;
  /** Always positive. Adjustment direction comes from `delta`. */
  qty: number; delta?: number;
  storeId: string; toStoreId?: string; employeeId?: string;
  batchNo?: string; supplier?: string; reason?: string; requestId?: string; by: string;
};
/** Kept for the batch table: receipts with a batch number. */
export type UniformBatch = { batchNo: string; item: string; size: string; qty: number; receivedOn: string };
export type UniformRequestStatus = "requested" | "approved" | "rejected" | "dispatched" | "delivered";
export type UniformRequest = {
  id: string; employeeId: string;
  items: { itemId: string; size: string; qty: number }[];
  status: UniformRequestStatus; requestedOn: string; amount: number; recoveryPlan: string;
  storeId: string; note?: string; rejectReason?: string;
  history: { status: UniformRequestStatus; on: string; by: string }[];
};
export type CalendarMarkType = "holiday" | "closure" | "event" | "note";
export type SiteCalendarMark = {
  id: string; siteId: string | "all"; type: CalendarMarkType; title: string;
  /** Inclusive ISO dates. */
  start: string; end: string;
  payMultiplier?: number; extraGuards?: number; from?: string; to?: string; notes?: string;
};
```

- [ ] Commit `feat(inventory): domain types`.

### Task 2: Inventory logic (TDD)

**Files:** Create `lib/inventory.ts`, `tests/inventory.test.ts`

- [ ] Write tests:

```ts
import { describe, expect, it } from "vitest";
import { ONE_SIZE, assetsOut, movementDeltas, onHand, requestShortfall, stockValue, validateMovement } from "@/lib/inventory";
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
});

describe("stockValue", () => {
  it("multiplies on-hand by unit cost", () => {
    expect(stockValue(ledger, [shirt, torch])).toBe(17 * 450 + 3 * 300);
  });
});
```

- [ ] Run `npx vitest run tests/inventory.test.ts` → FAIL (module missing).
- [ ] Implement `lib/inventory.ts` exporting `ONE_SIZE = "—"`, `movementDeltas`, `onHand(movements, { itemId, size?, storeId? })`, `stockBy(movements)` (Map keyed `item|size|store`), `holdings(movements, employeeId?, itemId?)`, `validateMovement(movements, m, items?) → string | null`, `assetsOut(movements, items)`, `requestShortfall(movements, { storeId, items })`, `stockValue(movements, items, storeId?)`, `stockStatus(qty, reorderLevel) → "ok" | "low" | "out"`, `sizesOf(item)` (returns `[ONE_SIZE]` when empty). Issue/write-off subtract at `storeId`; receipt/return add; transfer subtracts at `storeId` and adds at `toStoreId`.
- [ ] Run tests → PASS. Commit `feat(inventory): ledger logic with tests`.

### Task 3: Site calendar logic (TDD)

**Files:** Create `lib/site-calendar.ts`, `tests/site-calendar.test.ts`

- [ ] Tests:

```ts
import { describe, expect, it } from "vitest";
import { covers, markLabel, marksFor, marksOn } from "@/lib/site-calendar";
import type { SiteCalendarMark } from "@/types/domain";

const marks: SiteCalendarMark[] = [
  { id: "h", siteId: "all", type: "holiday", title: "Onam", start: "2026-08-26", end: "2026-08-26", payMultiplier: 2 },
  { id: "c", siteId: "S1", type: "closure", title: "Renovation", start: "2026-10-10", end: "2026-10-12" },
  { id: "e", siteId: "S2", type: "event", title: "Expo", start: "2026-10-11", end: "2026-10-11", extraGuards: 4, from: "18:00", to: "23:00" },
];

describe("covers", () => {
  it("is inclusive on both ends", () => {
    expect(covers(marks[1], "2026-10-10")).toBe(true);
    expect(covers(marks[1], "2026-10-12")).toBe(true);
    expect(covers(marks[1], "2026-10-13")).toBe(false);
  });
});
describe("marksFor", () => {
  it("includes company-wide marks", () => {
    expect(marksFor(marks, "S1").map(m => m.id)).toEqual(["h", "c"]);
  });
});
describe("marksOn", () => {
  it("filters by site and date", () => {
    expect(marksOn(marks, "S2", "2026-10-11").map(m => m.id)).toEqual(["e"]);
  });
});
describe("markLabel", () => {
  it("adds pay multiplier and extra guards", () => {
    expect(markLabel(marks[0])).toBe("Onam · ×2 pay");
    expect(markLabel(marks[2])).toBe("Expo · +4 guards 18:00–23:00");
    expect(markLabel(marks[1])).toBe("Renovation");
  });
});
```

- [ ] Run → FAIL. Implement (string compare on ISO dates). Run → PASS. Commit `feat(calendar): site mark logic with tests`.

### Task 4: Seed data

**Files:** Modify `lib/mock-data.ts`

- [ ] Add `stores` (central/kochi/kozhikode), `inventoryItems` (12 uniform items from `uniformKit` with ids, sizes from the guard `sizeOptions`, prices from `itemPrice`, plus equipment: walkie-talkie, torch (asset), baton, duty register, raincoat stays uniform), `stockMovements` seeded as receipts at central matching current `uniformKit.stock` (sizes split evenly, `uniformBatches` rows kept as batch receipts), plus transfers to kochi/kozhikode and a few issues (some assets to BMG-1840/BMG-2087).
- [ ] Rewrite `uniformRequests` to new shape (itemId, storeId, history). Add 2 more requests (one approved at kochi, one requested short of stock).
- [ ] Add `siteCalendarMarks` seed: Onam 2026-08-26, Gandhi Jayanti 2026-10-02, Diwali 2026-11-08, Christmas 2026-12-25 (all sites, ×2), one closure and one event on `sites[0]`.
- [ ] Keep `uniformKit` export but derive it from `inventoryItems` (`category === "uniform"`) so existing consumers compile. Commit.

### Task 5: Contexts

**Files:** Create `components/shared/inventory-context.tsx`, `components/shared/site-calendar-context.tsx`; modify `components/layout/hrms-app.tsx` provider tree.

- [ ] Inventory context value: `items, stores, movements, requests, post(movement | movement[]) → string | null` (validates all, appends atomically), `upsertItem(item)`, `setItemActive(id, active)`, `addRequest(r)`, `setRequestStatus(id, status, { by, reason? }) → string | null` (dispatch posts issue movements via `post`, blocked on shortfall). Persist `bmg-inventory-v1` after hydration (same timer pattern as onboarding), BroadcastChannel `bmg-inventory` sending full state snapshot on change.
- [ ] Calendar context: `marks, addMark, updateMark, removeMark`, persist `bmg-site-calendar-v1`.
- [ ] Wrap providers inside `OpsProvider`. Commit.

### Task 6: Nav, labels, access

**Files:** `lib/labels.ts`, `lib/nav-config.ts`, `lib/access.ts`, `components/layout/hrms-app.tsx`

- [ ] `NAV.inventory = "Inventory"`, `NAV.uniformRequests = "Uniform requests"` (keep `uniforms` key for legacy text).
- [ ] Remove Uniforms from payroll module; add module after payroll: `{ id: "inventory", title: "Inventory", eyebrow: "Stock", icon: Boxes, items: [Inventory (Boxes), Uniform requests (Shirt)] }`. `parentView["uniform-issue"] = "inventory"`. Create menu "Uniform issue" stays (routes to inventory with issue drawer).
- [ ] Access: replace `uniforms` module with `{ key: "inventory", label: "Inventory and stock", group: "Inventory", views: ["inventory", "uniforms", "uniform-issue"], actions: ["view","create","edit","export"] }` and `{ key: "uniform-requests", label: "Uniform requests", group: "Inventory", views: ["uniform-requests"], actions: ["view","approve"] }`. Update finance/hr levels. In `normalizeKeys`, map legacy `uniforms.*` keys: `uniforms.view → inventory.view + uniform-requests.view`, `uniforms.edit → + uniform-requests.approve`, others to `inventory.*`. Add a test in `tests/access.test.ts` for the mapping.
- [ ] Routes: `inventory`, `uniforms` → `<InventoryScreen />`; `uniform-issue` → `<InventoryScreen initialAction="issue" />`; `uniform-requests` → `<UniformRequestsScreen />`. Commit.

### Task 7: Inventory screen + drawers

**Files:** Create `features/inventory/inventory-screen.tsx`, `features/inventory/inventory-drawers.tsx`

- [ ] Screen: `PageHeader` with actions (Receive stock primary, Transfer, Adjust, Issue, Export CSV of current stock); store `SegmentedControl` (All + stores); `StatStrip` (active items, stock value via `stockValue`, below reorder → filter, assets out → assets tab); tab `SegmentedControl` Stock / Movements / Assets out / Items; `SplitLayout wideFirst` with tab content and "Recovery plans" panel (moved from payroll screen, same drawer).
- [ ] Stock tab: `SearchBar` + category `FilterChips`; `DataTable` columns Item (name + kind chip), Sizes (`n sizes` or "One size"), On hand (right), Reorder (right), Status chip (OK/Low/Out). Row → item detail drawer.
- [ ] Item detail drawer (fixes congestion): `Sheet wide`, sections: `DefRows` summary; "By size" plain `<table>` size × stores + total, `tabular-nums`, `whitespace-nowrap`; "Batches" table (batch, size, qty, received date) from receipt movements with `batchNo`; "Recent movements" last 10 rows. Footer: Edit item, Receive.
- [ ] Movements tab: type filter chips, item `Select`, DataTable (date, type chip, item·size, qty signed, store(s), employee/reason/batch, by), Export CSV.
- [ ] Assets tab: `assetsOut` rows with PersonCell, item, qty, since, store, "Mark returned" → `post({type:"return"})`.
- [ ] Items tab: DataTable of all items incl. inactive; "Add item" button; row → item form drawer (name, category, kind, sizes comma list, unit cost, reorder level, per kit, active toggle).
- [ ] Drawers in `inventory-drawers.tsx`: `ReceiveDrawer` (store, item, size, qty, batch no, supplier, date), `TransferDrawer` (from, to, item, size, qty, shows on-hand at source), `AdjustDrawer` (store, item, size, direction +/−, qty, reason required), `IssueDrawer` (employee, store, lines [item,size,qty] with "Add joining kit" which fills uniform items using `perKit` and the employee's `uniformSizes` from onboarding, recovery plan). Each calls `post`; shows returned error with `InlineAlert tone="danger"`; disables submit while invalid; toast on success.
- [ ] Commit.

### Task 8: Uniform requests screen

**Files:** Create `features/inventory/uniform-requests-screen.tsx`

- [ ] StatStrip per status (click filter); filters: status chips, store Select, SearchBar (employee name/id).
- [ ] DataTable with selection checkbox column, Employee (PersonCell), Items (`name · size ×qty`), Store, Requested (date · amount · plan), Status chip, Actions (contextual buttons: Approve/Reject, Dispatch, Mark delivered).
- [ ] Reject opens Sheet requiring reason. Dispatch calls `setRequestStatus(..., "dispatched")`; on shortfall error show InlineAlert inside a Sheet with "Transfer stock" button → navigates to inventory with transfer drawer prefilled (pass `onNavigate("inventory", { tab: "transfer:<item>|<size>|<store>" })` via `NavClickMeta.tab`).
- [ ] Bulk "Approve selected" button when selection non-empty.
- [ ] Row click → detail Sheet with items, Timeline of history, amount, plan, note.
- [ ] Commit.

### Task 9: Guard app + cleanup

**Files:** `features/portals/portal-screens.tsx`, `features/payroll/payroll-screens.tsx`, `features/workflows/workflow-screens.tsx`, `features/compliance/compliance-screens.tsx`

- [ ] `GuardUniform`: items from context (active uniform items), sizes `sizesOf`, price `unitCost`, `addRequest` with `storeId` = guard's nearest store (`kochi`), list `requests.filter(employeeId === "BMG-1840")`, timeline handles `rejected` (shows reason).
- [ ] Delete `UniformsScreen` and its now-unused imports; remove `uniform` workflow kind and its branches/config/kitItems if unused.
- [ ] Commit.

### Task 10: Site calendar marks

**Files:** Create `features/operations/site-calendar-mark-sheet.tsx`; modify `features/operations/site-attendance-calendar.tsx`, `lib/site-attendance.ts` (closure-aware absent)

- [ ] Mark sheet: `SegmentedControl` type; Title; Start/End date inputs (end ≥ start validated); for holiday "Apply to all sites" toggle + pay multiplier Select (1, 1.5, 2); for event extra guards number + from/to time; notes Textarea; footer Cancel / Delete (edit only, with confirm) / Save.
- [ ] Calendar: add `interactionPlugin` from `@fullcalendar/react/interaction`, `selectable`, `select={info => openNew(info.startStr.slice(0,10), addDays(info.endStr.slice(0,10), -1))}`; toolbar "Add mark" button; events = shifts + for each mark in `marksFor(marks, site.name)`: a background event (`display: "background"`, `allDay: true`, colour by type, end exclusive = `addDays(end,1)`) and a labelled all-day event (`extendedProps: { mark }`, title `markLabel`). Set `allDaySlot` true so labels show in time grids. `eventContent`/`eventClass`/`eventClick` branch on `extendedProps.mark`. Legend adds the four mark types.
- [ ] Closures: `siteShifts` callers filter — in calendar `events` memo, shifts on a closure day for that site are dropped (no absent). Pass marks via param: change memo dep to include marks.
- [ ] Commit.

### Task 11: Verify

- [ ] `npm test`, `npm run lint`, `npm run build`.
- [ ] Browser preview: walk spec Verification list; screenshot inventory, item drawer (desktop + mobile), requests, calendar with marks.
- [ ] Commit fixes; push branch.
