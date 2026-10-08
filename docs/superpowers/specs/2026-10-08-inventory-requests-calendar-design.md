# Inventory, uniform requests and site calendar marks — design

Date: 2026-10-08 · Branch: `feat/inventory-requests-calendar`

## Goal

1. Split the current Uniforms screen into two dedicated pages under a new top-level **Inventory** nav module (removed from Payroll): **Inventory** (a proper stock system) and **Uniform requests**.
2. Let users mark holidays, closures, events and notes on a site's attendance calendar.
3. Replace the congested "Uniform kit stock" card drawer with a readable layout.

Frontend-only prototype: state lives in React contexts persisted to `localStorage`, mirrored across tabs with `BroadcastChannel` (same pattern as `components/shared/ops-context.tsx`).

## 1. Inventory

### Data (`types/domain.ts`)

- `InventoryItem` — `id`, `name`, `category: "uniform" | "equipment"`, `kind: "consumable" | "asset"` (asset = returnable, e.g. torch, walkie-talkie), `sizes: string[]` (empty = one size, stored as `"—"`), `unitCost`, `reorderLevel`, `perKit` (uniform only), `active`.
- `Store` — `id`, `name`, `city`. Seeds: Central (Thiruvananthapuram), Kochi, Kozhikode.
- `StockMovement` — the ledger, single source of truth:
  `id`, `date`, `type: "receipt" | "issue" | "return" | "transfer" | "adjustment" | "write-off"`, `itemId`, `size`, `qty` (always positive), `storeId`, `toStoreId?` (transfer), `employeeId?` (issue/return), `batchNo?` + `supplier?` (receipt), `reason?` (adjustment/write-off, required), `requestId?`, `by`.
  Adjustment carries a signed `delta` instead of relying on `qty` direction.
- Stock on hand = derived per (item, size, store) from the ledger. Never stored.
- `AssetAssignment` — derived from issue/return movements of `kind: "asset"` items: who holds what, since when.

Seed: existing `uniformKit` + `uniformBatches` converted to items + receipt movements at Central, plus equipment items (walkie-talkie, torch, baton, register, raincoat) and a few movements at Kochi/Kozhikode so all stores have stock. Existing `uniformKit` export stays (used by guard app) but derives from the new catalogue.

### Context — `components/shared/inventory-context.tsx`

Holds items, stores, movements, uniform requests. Exposes `stockOf(itemId, size?, storeId?)`, `receive`, `issue`, `returnItem`, `transfer`, `adjust`, `writeOff`, `upsertItem`, `setItemActive`, plus request actions (section 2). Each mutating action validates and returns `{ ok: true } | { ok: false, error }`; it never lets stock go negative. Persisted under `bmg-inventory-v1`, synced via `BroadcastChannel("bmg-inventory")`.

### Screen — `features/inventory/inventory-screen.tsx` (nav: new top-level module "Inventory", view `inventory`)

- Header actions: **Receive stock** (primary), Transfer, Adjust, Issue to employee, Export.
- Stat tiles: active items, stock value (₹), below reorder (click filters), assets out with guards.
- Store filter (All / Central / Kochi / Kozhikode) applies to every tab.
- Tabs:
  - **Stock** — table: item, category, sizes summary, on hand, reorder level, status chip (OK / Low / Out). Search + category filter. Row opens the **item drawer**.
  - **Movements** — ledger table, newest first, filters by type/item/date range, CSV export.
  - **Assets out** — table of returnable items held by employees, "Mark returned" action (posts a return movement).
  - **Items** — catalogue management: add/edit item (name, category, kind, sizes, unit cost, reorder level, per kit), deactivate/reactivate.
- Side panel: **Recovery plans** moved here from the old screen unchanged.
- Each action opens a drawer form; errors (e.g. "Only 12 in stock at Kochi") shown inline, submit disabled until valid.

### Congestion fix (item drawer replaces the card grid)

The old `DetailDrawer` with 2-column cards and wrapped batch lines is removed. The item drawer shows, with full width rows:

1. Summary `DefRows`: on hand, reorder level, unit cost, stock value.
2. **By size** — compact table: size · per store columns · total. One row per size, numbers right-aligned, tabular.
3. **Batches** — table: batch no · size · qty received · received on (formatted `formatAppDate`, no wrapping).
4. **Recent movements** — last 10 ledger rows for the item.

No cards, no multi-line wrapping of batch metadata.

## 2. Uniform requests

### Data

`UniformRequest` gains: `status` adds `"rejected"`; `storeId`; `note?`; `rejectReason?`; `handledBy?`; `history: { status, on, by }[]`.

### Screen — `features/inventory/uniform-requests-screen.tsx` (nav: Inventory module → "Uniform requests", view `uniform-requests`)

- Stat tiles per status (requested / approved / dispatched / delivered), click to filter.
- Filters: status, store, search by employee name/ID.
- Table: checkbox, employee, items (size × qty), store, requested on, amount + recovery plan, status chip, row actions.
- Lifecycle: requested → **approve** or **reject** (reason required) → **dispatch** → **mark delivered**.
- **Dispatch** posts `issue` movements for each line from the request's store. If short, action blocked with message naming the missing qty and a "Transfer stock" shortcut that opens the transfer drawer prefilled.
- Dispatch also queues salary recovery (toast, as today).
- Bulk approve for selected requested rows.
- Row click opens a drawer with request detail and status history.

### Wiring

- Guard app `GuardUniform` reads/writes requests via the inventory context, so submissions appear on the admin page (and across tabs) and guard sees status changes.
- Old `uniforms` view removed; `AppView` keeps `"uniforms"` as an alias redirecting to `inventory` so existing links (dashboard, reports, search) keep working.
- `uniform-issue` workflow: parent becomes `inventory`; submit posts issue movements.
- `lib/access.ts`: replace `uniforms` key with `inventory` (views `inventory`, `uniform-issue`) and `uniform-requests` (view `uniform-requests`); role defaults that had `uniforms` get both.
- `lib/labels.ts` `NAV`: add `inventory`, `uniformRequests`.

## 3. Site calendar marks

### Data

`SiteCalendarMark` — `id`, `siteId: string | "all"`, `type: "holiday" | "closure" | "event" | "note"`, `title`, `start`, `end` (inclusive ISO dates), `payMultiplier?` (holiday, e.g. 2), `extraGuards?` + `from?` + `to?` (event), `notes?`.

Seed: Kerala 2026 company holidays (`siteId: "all"`) — Onam (Thiruvonam 2026-08-26), Gandhi Jayanti 10-02, Diwali 11-08, Christmas 12-25 — plus one closure and one event on a demo site.

### Context — `components/shared/site-calendar-context.tsx`

`marks`, `marksFor(siteId)` (site marks + `"all"`), `addMark`, `updateMark`, `removeMark`. Persisted `bmg-site-calendar-v1`.

### UI (`features/operations/site-attendance-calendar.tsx`)

- "Add mark" button in calendar toolbar; `selectable` on FullCalendar so drag/click on day(s) opens the mark drawer prefilled with the range.
- Mark drawer: type (segmented), title, date range, "Apply to all sites" (holiday only), type-specific fields (pay multiplier / extra guards + window), notes. Edit mode adds Delete.
- Rendering: marks as all-day background events with type colour + all-day labelled event in month/list views; clicking a mark opens it for edit (shift clicks unchanged).
- Legend under toolbar: Holiday · Closure · Event · Note.
- Closure days: absent shifts on those days are not generated/counted as absent (shown as "Site closed"). Holiday shows "×2 pay" in label; event shows "+N guards 18:00–23:00". Display only — no payroll calculation change.

## Out of scope

Purchase orders / supplier master, barcode scanning, holiday/closure rules feeding payroll maths, server persistence.

## Verification

`npm run lint` and `npm run build` pass (allowing the 2 pre-existing lint errors). Browser preview check: receive → transfer → issue reduces stock; guard request → approve → dispatch (stock drops, short-stock block works) → deliver; asset issue then mark returned; item drawer readable at 375px and desktop; add/edit/delete holiday, closure, event and note on a site calendar, persist after reload.
