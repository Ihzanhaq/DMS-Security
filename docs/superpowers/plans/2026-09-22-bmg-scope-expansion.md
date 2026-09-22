# BMG Security — Client Scope Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the eight-module BMG client scope (roles, onboarding, site management, duty management, payroll/advance, inventory, HR quality/exit, analytics/complaints/mobile) on top of the existing frontend prototype.

**Architecture:** The app is a frontend-only React prototype (no backend, no auth): screens live in `features/*`, shared mock data in `lib/mock-data.ts`, domain types in `types/domain.ts`, cross-screen mutable state via React context (`components/shared/payroll-context.tsx` is the existing example). We extend that architecture: new domain types, new mock data, a role registry, a derived-notification engine, and one new `OpsProvider` context for cross-screen flows (tickets, duty changes, exits → recruitment, notifications). Real calculation logic goes in `lib/` and gets unit tests (vitest); UI screens are verified with `npm run lint` + `npm run build` + the manual role-switcher review flow documented in `FRONTEND_TEST_GUIDE.md`.

**Tech Stack:** Next.js 16 via vinext (Vite), React 19, TypeScript, Leaflet (maps), Recharts (charts), Phosphor icons, custom CSS in `app/globals.css` / `app/tokens.css` / `app/workflows.css`. New dev dependency: vitest.

**Source spec:** `C:\Users\ihzan\Downloads\BMG_Security_Project_Scope.docx` (Malayalam, 8 modules). The full text was provided inline by the user; the requirement mapping below is the English normalization of it.

---

## Current state (verified against code)

| Area | Exists today | Where |
|---|---|---|
| Roles | `Owner, HR & Payroll, District Operations, Field Officer, Guard, Client` — hardcoded views matrix | `types/domain.ts:1`, `components/layout/hrms-app.tsx:75-98` |
| Employee form | identity, skills, pay basis, PF/ESI overrides, opening balances | `features/workflows/workflow-screens.tsx:29-87` |
| Sites | circle geofence (lat/lng/radius), posts, benefit scheme, salary rules | `types/domain.ts:141`, `workflow-screens.tsx:89-178` |
| Attendance | GPS punch vs circle boundary, grace mentions, night vigilance | `features/portals/portal-screens.tsx:42-105`, `workflow-screens.tsx:217-244` |
| Payroll | full duty-rate calculation engine + 5-stage run + snapshots | `lib/payroll-calculator.ts`, `features/payroll/payroll-screens.tsx`, `components/shared/payroll-context.tsx` |
| Advances | 40% of **gross** earned (deductions NOT subtracted — spec requires it) | `payroll-screens.tsx:326-393`, `portal-screens.tsx:149-164` |
| Uniforms | 12-item kit, stock levels, recovery plans; **no batches/sizes/requests** | `payroll-screens.tsx:395-457`, `lib/mock-data.ts:202-222` |
| Complaints | client-raised complaints w/ SLA + trail; **no open internal ticketing** | `features/compliance/compliance-screens.tsx:17-99` |
| Exit | clearance with dues blocking; **no recruitment link, no priority capture** | `workflow-screens.tsx:246-324` |
| Reports | 8 fixed reports + CSV toast; **no column mapping/export templates, no heat map** | `compliance-screens.tsx:139-267` |
| Notifications | 3 hardcoded bell entries | `hrms-app.tsx:237-242` |
| Guard portal | punch, schedule, leave, advance, payslips, SOPs, profile, night check | `portal-screens.tsx` |

## Requirement → task map (spec coverage)

| # | Spec requirement (normalized from Malayalam) | Task(s) |
|---|---|---|
| 1 | Roles: Branch Manager, Operations In-charge, Finance, Finance Assistant, FO, HR, HR Assistant, HR Executive; hierarchy configurable later | T2, T3, T23 |
| 2a | Dynamic document checklist (ID proof, PCC, …) + delay notifications | T8, T10 |
| 2b | PF/ESI 15-day-after-joining alert | T10 |
| 2c | Dynamic fields (nominee photo/address/bank; future custom fields) | T8, T23 |
| 2d | Click-to-call dialer on phone numbers | T9 |
| 2e | Work-location preference (taluk + district dropdowns) | T4, T8 |
| 2f | Uniform sizes captured at onboarding | T8 |
| 3a | Polygon geo-fencing | T5, T6, T7 |
| 3b | Per-site grace period (15–60 min) | T7 |
| 3c | Configurable hourly geo-check interval per day/night shift | T7, T11 |
| 3d | Site escalation/emergency contacts visible in guard app | T7, T11 |
| 3e | Dynamic FO 1/2/3 assignment per site, editable | T7 |
| 3f | Site docs & SOP (agreement, PCC/biodata req., SOP, check data) — edit alerts the linked FO | T7, T10 |
| 3g | Client feedback / satisfaction form upload at site level | T7 |
| 4a | Swap & replacement (sickness/accident) reporting from mobile | T12 |
| 4b | Additional duty (OT) recording | T12 |
| 4c | Guard-change auto notification to FO + edit access | T13 |
| 4d | FO rules: SOP briefing at duty change, client complaints (CRM), day/night patrolling task assignment | T13 |
| 5a | Advance formula: max = (earned − deductions) × 40% | T14, T15 |
| 5b | Office exception deduction (admin manual) | T16 |
| 5c | Spare-duty daily payment + alerts to Operations Manager & Finance | T16 |
| 5d | Mobile payslip history + salary query from app | exists (payslips) + T20 (queries route to tickets) |
| 6a | Uniform inventory with batch numbers + sizes | T17 |
| 6b | Request & dispatch via mobile app | T17, T18 |
| 6c | Debit & status tracking visible in guard app | T18 |
| 7a | 3-day satisfaction call auto task for HR | T19 |
| 7b | 1–10 rating system for sites and employees | T19 |
| 7c | Exit → auto vacancy in recruitment list (priority, date, time, adjustments) | T21 |
| 7d | Detailed exit clearance (assets + finance) | exists; extended in T21 |
| 8a | Multi-user login on one phone (fast switch after logout) | T22 |
| 8b | Complaint management: open ticketing system | T20 |
| 8c | Performance heat map + monthly graphs | T24 |
| 8d | Dynamic data export mapped to client's Excel format | T25 |

Two items are deliberately **config-shaped, not hardcoded**, because the client has not supplied the data yet: the role hierarchy (spec 1) and the client Excel column format (spec 8d). Both get configuration UIs so the data can be entered when it arrives.

## File map (created / modified)

**New lib (logic, unit-tested):**
- `lib/advance-calculator.ts` — (earned − deductions) × 40% eligibility
- `lib/geofence.ts` — point-in-polygon + distance helpers (move `distanceMetres` here)
- `lib/notifications.ts` — derives alert list from data (doc delays, PF/ESI 15-day, SOP edits, guard changes, spare-duty payments)
- `lib/roles.ts` — role registry, permission sets, `canManageSalary()` etc.
- `lib/kerala-geo.ts` — district → taluk data
- `lib/export-mapper.ts` — export template application (rename/reorder/include columns)

**New tests:** `tests/advance-calculator.test.ts`, `tests/geofence.test.ts`, `tests/export-mapper.test.ts`, `tests/notifications.test.ts`

**New context:** `components/shared/ops-context.tsx` — tickets, duty-change requests, FO tasks, exits, vacancies, notifications, satisfaction calls, uniform requests, ratings

**New feature files:**
- `features/hr/hr-quality-screens.tsx` — satisfaction calls, ratings, recruitment
- `features/compliance/tickets-screen.tsx` — open ticketing
- `features/reports/analytics-screens.tsx` — heat map + monthly graphs + export mapper UI

**Modified:**
- `types/domain.ts` — all new types (T1)
- `lib/mock-data.ts` — new seed data per module
- `components/layout/hrms-app.tsx` — roles, nav, new views, notification bell
- `components/shared/geo-map.tsx` — polygon rendering + click-to-edit
- `features/workflows/workflow-screens.tsx` — employee form panels, site config tabs
- `features/portals/portal-screens.tsx` — guard: duty change, uniform request, help/tickets, escalation contacts, user switch
- `features/operations/operations-screens.tsx` — guard-change events, FO task board
- `features/payroll/payroll-screens.tsx` — advance formula, office exception, spare duty
- `features/compliance/compliance-screens.tsx` — settings (custom fields, doc types, hierarchy)
- `features/workforce/workforce-screen.tsx` — click-to-call, rating badge
- `app/globals.css` / `app/workflows.css` — styles for new widgets
- `FRONTEND_TEST_GUIDE.md` — document every new feature + how to review

---

# Phase 0 — Foundation

### Task T0: Test infrastructure (vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 3: Add script to `package.json`** — in `"scripts"` add `"test": "vitest run"`.

- [ ] **Step 4: Smoke-check**

Run: `npx vitest run`
Expected: "No test files found" exit (or 0 tests) — config loads without error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for lib unit tests"
```

### Task T1: Domain types for all eight modules

**Files:**
- Modify: `types/domain.ts`

- [ ] **Step 1: Extend `Role` and `AppView`** — replace lines 1 and 7-16 of `types/domain.ts`:

```ts
export type Role =
  | "Owner" | "Branch Manager" | "Operations In-charge"
  | "Finance" | "Finance Assistant"
  | "HR" | "HR Assistant" | "HR Executive"
  | "Field Officer" | "Guard" | "Client";

export type AppView =
  | "dashboard" | "workforce" | "sites" | "deployment" | "attendance"
  | "payroll" | "advances" | "uniforms" | "inspections" | "complaints"
  | "sops" | "reports" | "imports" | "settings"
  | "employee-form" | "site-config" | "assignment-form" | "attendance-correction"
  | "payroll-allocation" | "night-vigilance" | "uniform-issue" | "exit-clearance"
  | "penalties" | "inspection-form" | "complaint-form" | "sop-form" | "action-centre"
  | "tickets" | "recruitment" | "hr-quality" | "duty-changes" | "spare-payments" | "analytics"
  | "guard-home" | "guard-punch" | "guard-schedule" | "guard-leave"
  | "guard-advance" | "guard-payslips" | "guard-sops" | "guard-profile" | "guard-vigilance"
  | "guard-duty-change" | "guard-uniform" | "guard-help"
  | "client-home" | "client-sites" | "client-complaints" | "client-coverage";
```

Note: the old roles `"HR & Payroll"` and `"District Operations"` are **renamed** to `"HR"` and `"Operations In-charge"`. T3 fixes every reference.

- [ ] **Step 2: Append the new module types** at the end of `types/domain.ts`:

```ts
/* ------------------------- Module 2 · Onboarding ------------------------- */

export type EmployeeDocumentStatus = "pending" | "uploaded" | "verified";
export type EmployeeDocument = {
  id: string;
  employeeId: string;
  /** Type comes from the configurable checklist (Settings), e.g. "ID proof", "PCC". */
  type: string;
  status: EmployeeDocumentStatus;
  /** Upload deadline; a pending doc past this date raises a delay notification. */
  dueBy: string;
  uploadedOn?: string;
};

export type Nominee = {
  name: string;
  relation: string;
  phone: string;
  address: string;
  bankAccount?: string;
  ifsc?: string;
  /** Prototype flag — real upload arrives with the backend. */
  photoOnFile: boolean;
};

export type WorkPreference = { district: string; taluk: string };
export type UniformSizes = { shirt: string; trouser: string; shoe: string };

/** Admin-defined extra profile fields (Settings → Custom fields). */
export type CustomFieldDef = { key: string; label: string; kind: "text" | "date" | "number" };

/* --------------------- Module 3 · Sites & geo-fencing --------------------- */

export type LatLng = { lat: number; lng: number };

export type SiteDocumentKind = "agreement" | "pcc-requirement" | "biodata-requirement" | "sop" | "check-data";
export type SiteDocument = {
  id: string;
  site: string;
  kind: SiteDocumentKind;
  title: string;
  version: string;
  updatedOn: string;
  updatedBy: string;
};

export type EscalationContact = { label: string; name: string; phone: string };

export type SiteFeedback = {
  id: string;
  site: string;
  date: string;
  satisfaction: number; // 1–10
  note: string;
};

/* ------------------- Module 4 · Duty & shift adjustment ------------------- */

export type DutyChangeType = "swap" | "replacement" | "ot";
export type DutyChangeReason = "sick" | "accident" | "personal" | "other";
export type DutyChangeRequest = {
  id: string;
  employeeId: string;
  type: DutyChangeType;
  date: string;
  site: string;
  reason: DutyChangeReason;
  /** Swap partner or replacement reliever, when known. */
  partnerId?: string;
  /** OT hours for type === "ot". */
  hours?: number;
  note: string;
  status: "pending" | "approved" | "rejected";
};

export type FoTaskKind = "sop-briefing" | "client-complaint" | "day-patrol" | "night-patrol" | "guard-change-review";
export type FoTask = {
  id: string;
  officer: string;
  site: string;
  kind: FoTaskKind;
  detail: string;
  due: string;
  status: "open" | "done";
};

export type GuardChangeEvent = {
  id: string;
  site: string;
  post: string;
  outgoing: string;
  incoming: string;
  at: string;
};

/* ----------------------- Module 5 · Advance & finance ---------------------- */

export type AdvanceEligibility = {
  grossEarned: number;
  deductionsToDate: number;
  /** (grossEarned − deductionsToDate) × 40%, floored at 0, rounded to the rupee. */
  maxAdvance: number;
  alreadyRequested: number;
  headroom: number;
};

export type SpareDutyPayment = {
  id: string;
  employeeId: string;
  date: string;
  site: string;
  amount: number;
  status: "queued" | "transferred";
};

/* -------------------------- Module 6 · Inventory --------------------------- */

export type UniformBatch = {
  batchNo: string;
  item: string;
  size: string;
  qty: number;
  receivedOn: string;
};

export type UniformRequestStatus = "requested" | "approved" | "dispatched" | "delivered";
export type UniformRequest = {
  id: string;
  employeeId: string;
  items: { item: string; size: string; qty: number }[];
  status: UniformRequestStatus;
  requestedOn: string;
  amount: number;
  recoveryPlan: string;
};

/* ----------------------- Module 7 · HR quality & exit ---------------------- */

export type SatisfactionCall = {
  id: string;
  employeeId: string;
  joinedOn: string;
  /** joinedOn + 3 days. */
  dueBy: string;
  status: "due" | "done";
  score?: number; // 1–10
  notes?: string;
};

export type Rating = {
  targetType: "employee" | "site";
  targetId: string;
  score: number; // 1–10
  ratedBy: string;
  on: string;
};

export type ExitRecord = {
  id: string;
  employeeId: string;
  date: string;
  time: string;
  reason: string;
  adjustments: string;
  priority: "high" | "normal";
  assetsCleared: boolean;
  financeCleared: boolean;
};

export type RecruitmentVacancy = {
  id: string;
  site: string;
  post: string;
  district: string;
  priority: "high" | "normal";
  openedOn: string;
  source: "exit" | "new-site" | "expansion";
  status: "open" | "interviewing" | "filled";
};

/* --------------------- Module 8 · Tickets & analytics ---------------------- */

export type TicketCategory = "salary" | "attendance" | "uniform" | "site-issue" | "other";
export type Ticket = {
  id: string;
  raisedBy: string;      // employee id or client name
  raisedByRole: Role;
  category: TicketCategory;
  subject: string;
  detail: string;
  status: "open" | "in-progress" | "resolved";
  createdOn: string;
  sla: string;
  assignee: string;
  trail: { title: string; time: string; note?: string; state?: "done" | "active" }[];
};

export type ExportColumn = { source: string; header: string; include: boolean };
export type ExportTemplate = { name: string; report: string; columns: ExportColumn[] };

export type AppNotification = {
  id: string;
  kind: "doc-delay" | "pf-esi-15day" | "sop-edited" | "guard-change" | "spare-duty" | "complaint-sla" | "vacancy" | "satisfaction-due" | "generic";
  title: string;
  detail: string;
  /** Roles that should see it in the bell. */
  audience: Role[];
  targetView: AppView;
  at: string;
};
```

- [ ] **Step 3: Extend `Employee`, `Site`, `PayrollDeduction`** — inside the existing types:

In `Employee` add after `phone: string;`:

```ts
  joiningDate: string;
  workPreference?: WorkPreference;
  uniformSizes?: UniformSizes;
  nominee?: Nominee;
  /** Values for admin-defined custom fields, keyed by CustomFieldDef.key. */
  customFields?: Record<string, string>;
  /** PF/ESI enrolment data received (drives the 15-day alert). */
  pfEsiDataReceived: boolean;
```

In `Site` add after `radius: number;`:

```ts
  /** Optional polygon boundary. When present it wins over the radius circle. */
  polygon?: LatLng[];
  /** Late-arrival grace in minutes (15–60 per spec). */
  graceMins: number;
  /** Presence-check interval in minutes for each shift. */
  dayCheckIntervalMins: number;
  nightCheckIntervalMins: number;
  escalationContacts: EscalationContact[];
  /** Ordered FO assignment — index 0 is FO 1, etc. */
  fieldOfficers: string[];
```

In `PayrollDeduction` change `kind` to:

```ts
  kind: "advance" | "uniform" | "penalty" | "office-exception";
```

- [ ] **Step 4: Lint** — Run: `npm run lint`. Expected: type errors in `mock-data.ts` (missing new required fields) — fixed next task. TypeScript build errors at this point are expected and listed; do not commit yet.

### Task T2: Seed data for the new modules

**Files:**
- Modify: `lib/mock-data.ts`

- [ ] **Step 1: Make existing employees/sites satisfy the new required fields.**

Add to every employee object: `joiningDate` (use `"2024-03-14"`, `"2025-11-02"`, `"2026-09-08"` etc. — give the two most recent, `BMG-2295` and `BMG-2301`, joining dates within the last 15 days of 2026-09-22 and `pfEsiDataReceived:false` so the 15-day alert has live cases; all others `pfEsiDataReceived:true`).

Add to every site object:

```ts
graceMins:15, dayCheckIntervalMins:60, nightCheckIntervalMins:60,
escalationContacts:[
  { label:"Site supervisor", name:"Niyas P", phone:"97455 12034" },
  { label:"District operations", name:"Nithin Joseph", phone:"94002 11870" },
  { label:"Control room (24×7)", name:"BMG HQ", phone:"0471 233 8899" },
],
fieldOfficers:["Ajmal Khan"],
```

Vary per site: give `"Lulu Mall, Kochi"` `graceMins:30` and `fieldOfficers:["Ajmal Khan","Praveen S"]`; give `"TCS Technopark"` `graceMins:60`, `nightCheckIntervalMins:45`, `fieldOfficers:["Praveen S"]`. Give `"Lulu Mall, Kochi"` a polygon (rough rectangle around its lat/lng):

```ts
polygon:[
  { lat:10.02780, lng:76.30690 }, { lat:10.02785, lng:76.30910 },
  { lat:10.02615, lng:76.30915 }, { lat:10.02610, lng:76.30695 },
],
```

- [ ] **Step 2: Append new seed collections** at the end of `lib/mock-data.ts` (import the new types at the top):

```ts
export const documentChecklist: string[] = ["ID proof", "PCC", "Bank passbook", "Photo", "Biodata"];

export const customFieldDefs: CustomFieldDef[] = [
  { key: "blood-group", label: "Blood group", kind: "text" },
  { key: "id-mark", label: "Identification mark", kind: "text" },
];

export const employeeDocuments: EmployeeDocument[] = [
  { id:"DOC-1", employeeId:"BMG-2295", type:"PCC",        status:"pending",  dueBy:"2026-09-18" },
  { id:"DOC-2", employeeId:"BMG-2295", type:"ID proof",   status:"uploaded", dueBy:"2026-09-15", uploadedOn:"2026-09-12" },
  { id:"DOC-3", employeeId:"BMG-2301", type:"PCC",        status:"pending",  dueBy:"2026-09-25" },
  { id:"DOC-4", employeeId:"BMG-1840", type:"ID proof",   status:"verified", dueBy:"2024-03-20", uploadedOn:"2024-03-16" },
];

export const siteDocuments: SiteDocument[] = [
  { id:"SDOC-1", site:"Lulu Mall, Kochi", kind:"agreement",           title:"Client agreement 2026–27",     version:"1.0", updatedOn:"2026-01-05", updatedBy:"Meera Nair" },
  { id:"SDOC-2", site:"Lulu Mall, Kochi", kind:"pcc-requirement",     title:"PCC mandatory for all posts",  version:"1.2", updatedOn:"2026-08-20", updatedBy:"Meera Nair" },
  { id:"SDOC-3", site:"TCS Technopark",   kind:"check-data",          title:"Vehicle check register spec",  version:"2.0", updatedOn:"2026-09-01", updatedBy:"Nithin Joseph" },
];

export const siteFeedback: SiteFeedback[] = [
  { id:"FB-1", site:"Lulu Mall, Kochi", date:"2026-08-30", satisfaction:9, note:"Loading bay discipline appreciated by mall admin." },
  { id:"FB-2", site:"Caritas Hospital", date:"2026-09-05", satisfaction:6, note:"Attender-pass process needs tightening at casualty." },
];

export const dutyChangeRequests: DutyChangeRequest[] = [
  { id:"DCR-1", employeeId:"BMG-2031", type:"replacement", date:"2026-09-11", site:"Lake Palace Resort", reason:"sick",   note:"Fever since last night; reliever needed for night shift.", status:"pending" },
  { id:"DCR-2", employeeId:"BMG-1840", type:"swap",        date:"2026-09-13", site:"Lulu Mall, Kochi",   reason:"personal", partnerId:"BMG-1902", note:"Family function; Deepa agreed to swap.", status:"pending" },
  { id:"DCR-3", employeeId:"BMG-1988", type:"ot",          date:"2026-09-09", site:"TCS Technopark",     reason:"other",  hours:4, note:"Covered Block C after evening guard left early.", status:"approved" },
];

export const foTasks: FoTask[] = [
  { id:"FOT-1", officer:"Ajmal Khan", site:"Lulu Mall, Kochi", kind:"sop-briefing",        detail:"Brief incoming loading-bay guard on SOP v3.2 at duty change.", due:"Today 17:45", status:"open" },
  { id:"FOT-2", officer:"Praveen S",  site:"TCS Technopark",   kind:"client-complaint",    detail:"CMP-26091 — verify Block C patrol logs with facility desk.",   due:"Today 16:00", status:"open" },
  { id:"FOT-3", officer:"Ajmal Khan", site:"Skyline Apartments", kind:"night-patrol",      detail:"Night patrolling round — gate discipline check.",              due:"Tonight 23:30", status:"open" },
];

export const guardChanges: GuardChangeEvent[] = [
  { id:"GC-1", site:"Aster Medcity", post:"Emergency", outgoing:"Fathima N", incoming:"Vinod Raj", at:"2026-09-10 08:00" },
];

export const spareDutyPayments: SpareDutyPayment[] = [
  { id:"SP-1", employeeId:"BMG-2118", date:"2026-09-09", site:"Aster Medcity",     amount:650, status:"transferred" },
  { id:"SP-2", employeeId:"BMG-2260", date:"2026-09-10", site:"Caritas Hospital",  amount:516, status:"queued" },
];

export const uniformBatches: UniformBatch[] = [
  { batchNo:"UB-2607", item:"Shirt (full sleeve)", size:"M",  qty:64, receivedOn:"2026-07-18" },
  { batchNo:"UB-2607", item:"Shirt (full sleeve)", size:"L",  qty:72, receivedOn:"2026-07-18" },
  { batchNo:"UB-2607", item:"Shirt (full sleeve)", size:"XL", qty:48, receivedOn:"2026-07-18" },
  { batchNo:"UB-2611", item:"Trousers",            size:"32", qty:80, receivedOn:"2026-08-02" },
  { batchNo:"UB-2611", item:"Trousers",            size:"34", qty:76, receivedOn:"2026-08-02" },
  { batchNo:"UB-2598", item:"Shoes (black)",       size:"8",  qty:40, receivedOn:"2026-06-25" },
  { batchNo:"UB-2598", item:"Shoes (black)",       size:"9",  qty:58, receivedOn:"2026-06-25" },
];

export const uniformRequests: UniformRequest[] = [
  { id:"UR-1", employeeId:"BMG-1840", items:[{ item:"Shirt (full sleeve)", size:"L", qty:1 }], status:"dispatched", requestedOn:"2026-09-06", amount:450, recoveryPlan:"Full salary deduction" },
  { id:"UR-2", employeeId:"BMG-2087", items:[{ item:"Shoes (black)", size:"9", qty:1 }], status:"requested", requestedOn:"2026-09-10", amount:900, recoveryPlan:"Partial advance" },
];

export const satisfactionCalls: SatisfactionCall[] = [
  { id:"SAT-1", employeeId:"BMG-2295", joinedOn:"2026-09-16", dueBy:"2026-09-19", status:"due" },
  { id:"SAT-2", employeeId:"BMG-2301", joinedOn:"2026-09-12", dueBy:"2026-09-15", status:"done", score:8, notes:"Happy with site; requested raincoat." },
];

export const ratings: Rating[] = [
  { targetType:"employee", targetId:"BMG-1840", score:9, ratedBy:"Ajmal Khan",  on:"2026-09-01" },
  { targetType:"employee", targetId:"BMG-2031", score:5, ratedBy:"Nithin Joseph", on:"2026-09-01" },
  { targetType:"site",     targetId:"Lulu Mall, Kochi", score:9, ratedBy:"Meera Nair", on:"2026-09-01" },
  { targetType:"site",     targetId:"Skyline Apartments", score:6, ratedBy:"Nithin Joseph", on:"2026-09-01" },
];

export const exitRecords: ExitRecord[] = [
  { id:"EXIT-1", employeeId:"BMG-2031", date:"2026-09-14", time:"18:00", reason:"Personal — relocating", adjustments:"Final salary + leave encashment", priority:"high", assetsCleared:false, financeCleared:false },
];

export const recruitmentVacancies: RecruitmentVacancy[] = [
  { id:"VAC-1", site:"Lake Palace Resort", post:"Lobby · Night", district:"Alappuzha", priority:"high", openedOn:"2026-09-14", source:"exit", status:"open" },
  { id:"VAC-2", site:"Aster Medcity",      post:"Emergency · Day", district:"Ernakulam", priority:"normal", openedOn:"2026-09-01", source:"expansion", status:"interviewing" },
];

export const tickets: Ticket[] = [
  { id:"TKT-1042", raisedBy:"BMG-1469", raisedByRole:"Guard", category:"salary", subject:"August duty count looks short", detail:"App shows 12.5 duties but I worked 13 days at Travancore Medicity.", status:"open", createdOn:"2026-09-09", sla:"2026-09-12", assignee:"Meera Nair",
    trail:[{ title:"Raised from mobile app", time:"09 Sep · 18:12", state:"done" }, { title:"Assigned to HR", time:"09 Sep · 18:30", state:"active" }] },
  { id:"TKT-1043", raisedBy:"BMG-2087", raisedByRole:"Guard", category:"uniform", subject:"Shoe size 9 out of stock", detail:"Requested on 10 Sep, no dispatch update.", status:"in-progress", createdOn:"2026-09-10", sla:"2026-09-14", assignee:"Store desk",
    trail:[{ title:"Raised from mobile app", time:"10 Sep · 09:02", state:"done" }, { title:"Stock check in progress", time:"10 Sep · 11:40", state:"active" }] },
];

export const exportTemplates: ExportTemplate[] = [
  { name:"Default CSV", report:"Net payout register", columns:[] },
];

/** Monthly performance series for analytics (site coverage % and complaint counts). */
export const monthlyPerformance = [
  { month:"Apr", coverage:94, complaints:9,  attendance:92 },
  { month:"May", coverage:95, complaints:7,  attendance:93 },
  { month:"Jun", coverage:93, complaints:11, attendance:91 },
  { month:"Jul", coverage:96, complaints:6,  attendance:95 },
  { month:"Aug", coverage:97, complaints:5,  attendance:96 },
  { month:"Sep", coverage:96, complaints:4,  attendance:94 },
];
```

- [ ] **Step 3: Verify** — Run: `npm run lint && npm run build`. Expected: PASS (types + data consistent again).

- [ ] **Step 4: Commit**

```bash
git add types/domain.ts lib/mock-data.ts
git commit -m "feat: domain types and seed data for BMG scope modules 1-8"
```

### Task T3: Role registry and role migration

**Files:**
- Create: `lib/roles.ts`
- Modify: `components/layout/hrms-app.tsx:75-98`, `features/workflows/workflow-screens.tsx:94,278,396`

- [ ] **Step 1: Create `lib/roles.ts`**

```ts
import type { AppView, Role } from "@/types/domain";

export type RoleDefinition = {
  name: Role;
  displayUser: { name: string; initials: string };
  defaultView: AppView;
  /** Internal-portal views this role may open. Guard/Client use their own portals. */
  views: AppView[];
  /** Reporting tier — lower reports to higher. Configurable when the client confirms the hierarchy. */
  tier: number;
};

const operations: AppView[] = ["dashboard","workforce","sites","site-config","deployment","assignment-form","attendance","attendance-correction","night-vigilance","inspections","inspection-form","complaints","complaint-form","sops","sop-form","duty-changes","tickets","reports","analytics","action-centre"];
const finance: AppView[] = ["dashboard","payroll","payroll-allocation","advances","uniforms","uniform-issue","penalties","spare-payments","exit-clearance","reports","analytics","imports","tickets","action-centre"];
const hr: AppView[] = ["dashboard","workforce","employee-form","site-config","attendance","attendance-correction","payroll","payroll-allocation","advances","uniforms","uniform-issue","penalties","exit-clearance","hr-quality","recruitment","tickets","complaints","complaint-form","reports","analytics","imports","settings","action-centre"];
const everything: AppView[] = Array.from(new Set([...operations, ...finance, ...hr, "sites", "settings"])) as AppView[];

export const roleRegistry: Record<Exclude<Role, "Guard" | "Client">, RoleDefinition> = {
  "Owner":               { name:"Owner",               displayUser:{ name:"Arun Kumar",  initials:"AK" }, defaultView:"dashboard", views:everything, tier:0 },
  "Branch Manager":      { name:"Branch Manager",      displayUser:{ name:"Vishnu Prasad", initials:"VP" }, defaultView:"dashboard", views:everything, tier:1 },
  "Operations In-charge":{ name:"Operations In-charge",displayUser:{ name:"Nithin Joseph", initials:"NJ" }, defaultView:"deployment", views:operations, tier:2 },
  "Finance":             { name:"Finance",             displayUser:{ name:"Divya Menon", initials:"DM" }, defaultView:"payroll",  views:finance, tier:2 },
  "Finance Assistant":   { name:"Finance Assistant",   displayUser:{ name:"Arjun R",     initials:"AR" }, defaultView:"payroll",  views:finance.filter(view => view !== "spare-payments"), tier:3 },
  "HR":                  { name:"HR",                  displayUser:{ name:"Meera Nair",  initials:"MN" }, defaultView:"workforce", views:hr, tier:2 },
  "HR Assistant":        { name:"HR Assistant",        displayUser:{ name:"Anu Thomas",  initials:"AT" }, defaultView:"workforce", views:hr.filter(view => view !== "settings"), tier:3 },
  "HR Executive":        { name:"HR Executive",        displayUser:{ name:"Rahul Dev",   initials:"RD" }, defaultView:"hr-quality", views:hr.filter(view => view !== "settings" && view !== "payroll" && view !== "payroll-allocation"), tier:3 },
  "Field Officer":       { name:"Field Officer",       displayUser:{ name:"Ajmal Khan",  initials:"AK" }, defaultView:"inspections", views:["dashboard","sites","deployment","attendance","night-vigilance","inspections","inspection-form","complaints","complaint-form","sops","duty-changes","tickets","action-centre"], tier:3 },
};

export const internalRoles = Object.keys(roleRegistry) as (keyof typeof roleRegistry)[];

export function isInternal(role: Role): role is keyof typeof roleRegistry {
  return role !== "Guard" && role !== "Client";
}

export function allowedViews(role: Role): AppView[] {
  return isInternal(role) ? roleRegistry[role].views : [];
}

/** Salary figures and salary configuration are restricted to these roles. */
export function canManageSalary(role: Role) {
  return role === "Owner" || role === "Branch Manager" || role === "HR" || role === "Finance";
}
```

- [ ] **Step 2: Rewire `hrms-app.tsx`** — delete the hardcoded `roleDefaults`, `roleNames`, `allowedInternalViews` (lines 75-98) and derive them:

```ts
import { allowedViews, isInternal, roleRegistry } from "@/lib/roles";

const roleDefaults: Record<Role, AppView> = {
  ...Object.fromEntries(Object.values(roleRegistry).map(def => [def.name, def.defaultView])),
  Guard: "guard-home",
  Client: "client-home",
} as Record<Role, AppView>;

const roleNames: Record<Role, { name: string; initials: string }> = {
  ...Object.fromEntries(Object.values(roleRegistry).map(def => [def.name, def.displayUser])),
  Guard: { name: "Suresh Babu", initials: "SB" },
  Client: { name: "Lulu Group", initials: "LG" },
} as Record<Role, { name: string; initials: string }>;
```

Replace every `allowedInternalViews[role]` with `allowedViews(role)` (`hrms-app.tsx:94,131,156`), and the URL-param role check keeps working because `roleDefaults` still covers all roles.

- [ ] **Step 3: Migrate renamed role references.** Search-and-fix every remaining occurrence:
  - `workflow-screens.tsx:94` `role === "HR & Payroll"` → `canManageSalary(role)` (import from `@/lib/roles`, delete the local expression).
  - `workflow-screens.tsx:396` `role==="Owner"||role==="HR & Payroll"` → `canManageSalary(role)`.
  - `hrms-app.tsx:278` `role==="HR & Payroll"?"payroll":"sites"` → `role==="HR"||role==="Finance"?"payroll":"sites"`.
  - Run `grep -rn "HR & Payroll\|District Operations" --include="*.tsx" --include="*.ts"` and fix any stragglers (nav labels, settings role matrix at `compliance-screens.tsx:332`).

- [ ] **Step 4: Verify** — `npm run lint && npm run build`, then `npm run dev`: role selector shows all 11 roles; each lands on its default view; Finance sees payroll but not workforce; HR Executive cannot open payroll.

- [ ] **Step 5: Commit**

```bash
git add lib/roles.ts components/layout/hrms-app.tsx features/workflows/workflow-screens.tsx features/compliance/compliance-screens.tsx
git commit -m "feat: role registry with 8 internal roles and permission sets"
```

### Task T4: Kerala district → taluk data

**Files:**
- Create: `lib/kerala-geo.ts`

- [ ] **Step 1: Create the data module**

```ts
/** District → taluk mapping for the work-location preference dropdowns. */
export const keralaTaluks: Record<string, string[]> = {
  "Thiruvananthapuram": ["Thiruvananthapuram", "Chirayinkeezhu", "Neyyattinkara", "Nedumangad", "Varkala", "Kattakkada"],
  "Kollam": ["Kollam", "Karunagappally", "Kunnathur", "Kottarakkara", "Punalur", "Pathanapuram"],
  "Pathanamthitta": ["Adoor", "Konni", "Kozhencherry", "Ranni", "Mallappally", "Thiruvalla"],
  "Alappuzha": ["Ambalappuzha", "Cherthala", "Karthikappally", "Kuttanad", "Mavelikkara", "Chengannur"],
  "Kottayam": ["Kottayam", "Changanassery", "Kanjirappally", "Meenachil", "Vaikom"],
  "Idukki": ["Devikulam", "Idukki", "Peerumade", "Thodupuzha", "Udumbanchola"],
  "Ernakulam": ["Aluva", "Kanayannur", "Kochi", "Kothamangalam", "Kunnathunad", "Muvattupuzha", "North Paravur"],
  "Thrissur": ["Thrissur", "Chalakudy", "Chavakkad", "Kodungallur", "Kunnamkulam", "Mukundapuram", "Thalapilly"],
  "Palakkad": ["Palakkad", "Alathur", "Chittur", "Mannarkkad", "Ottappalam", "Pattambi", "Attappady"],
  "Malappuram": ["Eranad", "Kondotty", "Nilambur", "Perinthalmanna", "Ponnani", "Tirur", "Tirurangadi"],
  "Kozhikode": ["Kozhikode", "Koyilandy", "Thamarassery", "Vatakara"],
  "Wayanad": ["Mananthavady", "Sulthan Bathery", "Vythiri"],
  "Kannur": ["Kannur", "Thalassery", "Taliparamba", "Iritty", "Payyanur"],
  "Kasaragod": ["Kasaragod", "Hosdurg", "Manjeshwaram", "Vellarikundu"],
};

export const keralaDistricts = Object.keys(keralaTaluks);
```

- [ ] **Step 2: Replace the 5-district hardcode** — `workflow-screens.tsx:16` `const districts = [...]` → `import { keralaDistricts } from "@/lib/kerala-geo";` and use `keralaDistricts` where `districts` was used.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add lib/kerala-geo.ts features/workflows/workflow-screens.tsx
git commit -m "feat: Kerala district/taluk reference data"
```

---

# Phase 1 — Geo-fencing (Module 3 core)

### Task T5: Geofence library with tests (TDD)

**Files:**
- Create: `lib/geofence.ts`, `tests/geofence.test.ts`
- Modify: `lib/mock-data.ts:369-376` (re-export), `features/portals/portal-screens.tsx:10`

- [ ] **Step 1: Write failing tests** — `tests/geofence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { distanceMetres, isInsideGeofence, pointInPolygon } from "@/lib/geofence";

const square = [
  { lat: 10.000, lng: 76.000 }, { lat: 10.000, lng: 76.010 },
  { lat: 10.010, lng: 76.010 }, { lat: 10.010, lng: 76.000 },
];

describe("pointInPolygon", () => {
  it("accepts a point inside the square", () => {
    expect(pointInPolygon({ lat: 10.005, lng: 76.005 }, square)).toBe(true);
  });
  it("rejects a point outside the square", () => {
    expect(pointInPolygon({ lat: 10.020, lng: 76.005 }, square)).toBe(false);
  });
  it("rejects degenerate polygons (fewer than 3 vertices)", () => {
    expect(pointInPolygon({ lat: 10.005, lng: 76.005 }, square.slice(0, 2))).toBe(false);
  });
});

describe("isInsideGeofence", () => {
  it("uses the polygon when present, ignoring the radius", () => {
    const site = { lat: 10.005, lng: 76.005, radius: 1, polygon: square };
    expect(isInsideGeofence({ lat: 10.009, lng: 76.009 }, site)).toBe(true);
  });
  it("falls back to the radius circle when no polygon", () => {
    const site = { lat: 10.005, lng: 76.005, radius: 120 };
    expect(isInsideGeofence({ lat: 10.005, lng: 76.0055 }, site)).toBe(true);   // ~55 m east
    expect(isInsideGeofence({ lat: 10.005, lng: 76.0100 }, site)).toBe(false);  // ~550 m east
  });
});

describe("distanceMetres", () => {
  it("is 0 for identical points", () => {
    expect(distanceMetres({ lat: 10, lng: 76 }, { lat: 10, lng: 76 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/geofence.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/geofence.ts`**

```ts
import type { LatLng } from "@/types/domain";

/** Great-circle distance in metres (moved from mock-data). */
export function distanceMetres(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Ray-casting point-in-polygon on lat/lng. Adequate at site scale. */
export function pointInPolygon(point: LatLng, polygon: LatLng[]) {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const crosses = (a.lng > point.lng) !== (b.lng > point.lng)
      && point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (crosses) inside = !inside;
  }
  return inside;
}

export type GeofenceShape = { lat: number; lng: number; radius: number; polygon?: LatLng[] };

/** Polygon wins when configured; otherwise the legacy circle applies. */
export function isInsideGeofence(point: LatLng, site: GeofenceShape) {
  if (site.polygon && site.polygon.length >= 3) return pointInPolygon(point, site.polygon);
  return distanceMetres(point, site) <= site.radius;
}
```

- [ ] **Step 4: Run tests** — `npx vitest run tests/geofence.test.ts`. Expected: PASS (6 tests).

- [ ] **Step 5: De-duplicate** — in `lib/mock-data.ts` delete the `distanceMetres` function body (lines 365-376) and replace with `export { distanceMetres } from "@/lib/geofence";` so existing imports keep working. Verify `npm run build` passes.

- [ ] **Step 6: Commit**

```bash
git add lib/geofence.ts tests/geofence.test.ts lib/mock-data.ts
git commit -m "feat: polygon geofence library with unit tests"
```

### Task T6: Polygon support in GeoMap

**Files:**
- Modify: `components/shared/geo-map.tsx`

- [ ] **Step 1: Read `components/shared/geo-map.tsx` fully** (it renders a Leaflet map with a circle; note its prop names before editing).

- [ ] **Step 2: Add props** `polygon?: LatLng[]` and `onMapClick?: (point: LatLng) => void`. When `polygon` has ≥3 points render `L.polygon(polygon.map(p=>[p.lat,p.lng]), { color:"var-accent fallback #2563eb", weight:2, fillOpacity:.12 })` instead of the circle; with 1-2 points render small circle markers so the editor shows progress. Wire `map.on("click", e => onMapClick?.({ lat:e.latlng.lat, lng:e.latlng.lng }))` when the prop is present, and clean the handler up on unmount. Keep the circle path untouched when `polygon` is absent so every existing call site behaves identically.

- [ ] **Step 3: Verify** — `npm run lint && npm run build`; in `npm run dev` the existing Site config → Geofence tab still shows the circle (no polygon passed yet).

- [ ] **Step 4: Commit**

```bash
git add components/shared/geo-map.tsx
git commit -m "feat: GeoMap polygon rendering and click-to-edit support"
```

### Task T7: Site configuration — polygon editor, grace, check intervals, FO links, escalation contacts, site docs, feedback

**Files:**
- Modify: `features/workflows/workflow-screens.tsx:89-178` (`SiteConfigurationScreen`), `app/workflows.css`

- [ ] **Step 1: Extend component state.** Inside `SiteConfigurationScreen` add:

```ts
const [boundaryMode, setBoundaryMode] = useState<"circle" | "polygon">(siteRecord.polygon ? "polygon" : "circle");
const [polygon, setPolygon] = useState<LatLng[]>(siteRecord.polygon ?? []);
const [graceMins, setGraceMins] = useState(siteRecord.graceMins);
const [dayInterval, setDayInterval] = useState(siteRecord.dayCheckIntervalMins);
const [nightInterval, setNightInterval] = useState(siteRecord.nightCheckIntervalMins);
const [contacts, setContacts] = useState<EscalationContact[]>(siteRecord.escalationContacts);
const [officers, setOfficers] = useState<string[]>(siteRecord.fieldOfficers);
const [docs, setDocs] = useState<SiteDocument[]>(siteDocuments.filter(doc => doc.site === selectedSite));
const [feedback, setFeedback] = useState<SiteFeedback[]>(siteFeedback.filter(item => item.site === selectedSite));
```

- [ ] **Step 2: Geofence tab.** In the `"Geofence and attendance"` tab: add a mode toggle (`Circle` / `Polygon` segmented buttons). Polygon mode passes `polygon={polygon}` and `onMapClick={point => setPolygon(current => [...current, point])}` to `GeoMap`, lists vertices with per-row remove buttons and a "Clear boundary" button. Below the boundary panel add:

```tsx
<label><span>Late-arrival grace</span><div className="input-suffix"><input type="number" min={15} max={60} value={graceMins} onChange={e=>setGraceMins(Number(e.target.value))}/><b>minutes</b></div><small>15–60 minutes per site policy.</small></label>
<label><span>Day-shift check interval</span><div className="input-suffix"><input type="number" min={15} value={dayInterval} onChange={e=>setDayInterval(Number(e.target.value))}/><b>minutes</b></div></label>
<label><span>Night-shift check interval</span><div className="input-suffix"><input type="number" min={15} value={nightInterval} onChange={e=>setNightInterval(Number(e.target.value))}/><b>minutes</b></div><small>Drives the presence-check schedule for each shift.</small></label>
```

(The existing hardcoded "Offline punch grace 15" input is superseded — remove it.)

- [ ] **Step 3: New "Team and escalation" tab.** Add `"Team and escalation"` to the tab row. Contents, following the `editable-list` idiom of the Posts tab (`workflow-screens.tsx:128-137`):
  - **Field officers panel**: ordered editable list — each row `FO {index+1}` label + `<select>` of internal FO names (`["Ajmal Khan","Praveen S","Niyas P","Meera K"]`) + remove button; "Add field officer" appends. This is the dynamic FO 1/2/3 requirement.
  - **Escalation contacts panel**: rows of `label / name / phone` inputs + remove; "Add contact" appends `{ label:"New contact", name:"", phone:"" }`. Caption: "Shown to guards in the mobile app."

- [ ] **Step 4: New "Documents and SOP" tab.** Table of `docs` rows: kind (select of the five `SiteDocumentKind`s), title (input), version (input), updatedOn. Editing any row and pressing "Save configuration" bumps that doc's `updatedOn` to today, sets `updatedBy` to the current role display name, and calls `notifyFieldOfficers` (added in T10 — until then, `notify(`${officers[0] ?? "FO"} alerted about the SOP change`)` from `useToast`). Also a **Client feedback panel** listing `feedback` (date, satisfaction score, note) with a small form (date, 1–10 score select, note textarea) + "Record feedback" appending to state — this is the site-level satisfaction form upload in prototype form.

- [ ] **Step 5: Persist on save.** Extend the existing Save handler to also toast a summary (`notify("Site policies saved · grace " + graceMins + " min")`). Data stays in component state (prototype convention — same as posts today).

- [ ] **Step 6: Verify** — `npm run dev`: Owner → Sites → open "Lulu Mall, Kochi": polygon renders on map, clicking map adds vertex, grace 30 shown; Team tab lists FO 1/FO 2; Docs tab edit fires FO toast. `npm run lint && npm run build` pass.

- [ ] **Step 7: Commit**

```bash
git add features/workflows/workflow-screens.tsx app/workflows.css
git commit -m "feat: site config with polygon editor, grace, check intervals, FO links, escalation contacts, site docs and feedback"
```

---

# Phase 2 — Onboarding & notifications (Module 2)

### Task T8: Employee form — documents, nominee, work preference, uniform sizes, custom fields

**Files:**
- Modify: `features/workflows/workflow-screens.tsx:29-87` (`EmployeeFormScreen`)

- [ ] **Step 1: Documents panel.** New `<Panel title="Documents" description="Checklist items are configurable in Settings. Pending items past their due date raise alerts.">`. State `docs: EmployeeDocument[]` seeded from `employeeDocuments.filter(d => d.employeeId === targetEmployeeId)`; render each checklist type from `documentChecklist` with its status (`pending`/`uploaded`/`verified` as a `<select>`), `dueBy` date input, and a "Mark uploaded" button that stamps `uploadedOn` with today. An "Add document type" input+button appends a new type to the local list (dynamic documentation requirement). Overdue pending rows show the existing `inline-alert warning` idiom.

- [ ] **Step 2: Nominee panel.** `<Panel title="Nominee" description="Nominee identity, address and bank details for statutory records.">` — inputs bound to a `nominee` state object (`name`, `relation` select `["Spouse","Father","Mother","Son","Daughter","Other"]`, `phone`, `address` textarea, `bankAccount`, `ifsc`, and a `photoOnFile` checkbox labelled "Nominee photo collected").

- [ ] **Step 3: Work preference + uniform sizes.** In the "Identity and employment" panel add:

```tsx
<label><span>Preferred district</span><select value={prefDistrict} onChange={e=>{setPrefDistrict(e.target.value); setPrefTaluk(keralaTaluks[e.target.value][0]);}}>{keralaDistricts.map(d=><option key={d}>{d}</option>)}</select></label>
<label><span>Preferred taluk</span><select value={prefTaluk} onChange={e=>setPrefTaluk(e.target.value)}>{(keralaTaluks[prefDistrict]??[]).map(t=><option key={t}>{t}</option>)}</select></label>
<label><span>Shirt size</span><select defaultValue={employee.uniformSizes?.shirt ?? "L"}>{["S","M","L","XL","XXL"].map(s=><option key={s}>{s}</option>)}</select></label>
<label><span>Trouser size</span><select defaultValue={employee.uniformSizes?.trouser ?? "34"}>{["30","32","34","36","38"].map(s=><option key={s}>{s}</option>)}</select></label>
<label><span>Shoe size</span><select defaultValue={employee.uniformSizes?.shoe ?? "9"}>{["6","7","8","9","10","11"].map(s=><option key={s}>{s}</option>)}</select></label>
```

Also add a `Joining date` input bound to `employee.joiningDate` and a read-only note under it: "PF/ESI data must reach HR within 15 days of joining" with a warning state when `!employee.pfEsiDataReceived` and joining >15 days ago.

- [ ] **Step 4: Custom fields.** After the fixed panels render `customFieldDefs.map(def => <label key={def.key}><span>{def.label}</span><input type={def.kind==="number"?"number":def.kind==="date"?"date":"text"} defaultValue={employee.customFields?.[def.key] ?? ""}/></label>)` inside a `<Panel title="Additional fields" description="Defined by administrators in Settings → Custom fields.">`.

- [ ] **Step 5: Verify + commit**

```bash
npm run lint && npm run build
git add features/workflows/workflow-screens.tsx
git commit -m "feat: onboarding form with documents checklist, nominee, work preference, uniform sizes and custom fields"
```

### Task T9: Click-to-call everywhere

**Files:**
- Modify: `components/shared/screen-elements.tsx` (`PersonCell`), `features/workforce/workforce-screen.tsx`, `features/portals/portal-screens.tsx:251` (guard profile), site escalation contacts (T7 markup)

- [ ] **Step 1: Read `components/shared/screen-elements.tsx`** to locate `PersonCell`; add an optional `phone?: string` prop. When present, render the id line as `<a href={`tel:${phone.replace(/\s/g, "")}`} onClick={e=>e.stopPropagation()}>{phone}</a>` styled like the current small text plus a phone icon (`Phone` from phosphor).

- [ ] **Step 2: Pass phones through.** Workforce directory rows, attendance rows (join on `employees` by id), advances drawer, escalation contact list (T7), guard profile hero — each renders phone numbers as `tel:` anchors.

- [ ] **Step 3: Verify** — dev run: clicking a number on desktop prompts the OS dialer/no-op; layout unchanged. Lint + build pass.

- [ ] **Step 4: Commit**

```bash
git add components/shared/screen-elements.tsx features/workforce/workforce-screen.tsx features/portals/portal-screens.tsx
git commit -m "feat: click-to-call tel links on phone numbers"
```

### Task T10: Notification engine (doc delays, PF/ESI 15-day, SOP edits, guard changes, spare-duty, satisfaction due)

**Files:**
- Create: `lib/notifications.ts`, `tests/notifications.test.ts`
- Modify: `components/layout/hrms-app.tsx:235-243`

- [ ] **Step 1: Failing tests** — `tests/notifications.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveNotifications } from "@/lib/notifications";

const today = "2026-09-22";

describe("deriveNotifications", () => {
  it("flags a pending document past its due date", () => {
    const result = deriveNotifications({
      today,
      employees: [{ id: "E1", name: "Test Guard", joiningDate: "2026-09-01", pfEsiDataReceived: true }],
      documents: [{ id: "D1", employeeId: "E1", type: "PCC", status: "pending", dueBy: "2026-09-18" }],
      guardChanges: [], spareDutyPayments: [], satisfactionCalls: [], sopEdits: [],
    });
    expect(result.some(n => n.kind === "doc-delay" && n.detail.includes("PCC"))).toBe(true);
  });

  it("flags missing PF/ESI data 15 days after joining, but not before", () => {
    const base = { today, documents: [], guardChanges: [], spareDutyPayments: [], satisfactionCalls: [], sopEdits: [] };
    const late = deriveNotifications({ ...base, employees: [{ id: "E1", name: "A", joiningDate: "2026-09-01", pfEsiDataReceived: false }] });
    const early = deriveNotifications({ ...base, employees: [{ id: "E2", name: "B", joiningDate: "2026-09-15", pfEsiDataReceived: false }] });
    expect(late.some(n => n.kind === "pf-esi-15day")).toBe(true);
    expect(early.some(n => n.kind === "pf-esi-15day")).toBe(false);
  });

  it("notifies FOs about guard changes and Finance about spare-duty payments", () => {
    const result = deriveNotifications({
      today, employees: [], documents: [], satisfactionCalls: [], sopEdits: [],
      guardChanges: [{ id: "GC1", site: "Site A", post: "Gate", outgoing: "X", incoming: "Y", at: "2026-09-22 08:00" }],
      spareDutyPayments: [{ id: "SP1", employeeId: "E9", date: "2026-09-22", site: "Site A", amount: 650, status: "transferred" }],
    });
    const change = result.find(n => n.kind === "guard-change");
    const spare = result.find(n => n.kind === "spare-duty");
    expect(change?.audience).toContain("Field Officer");
    expect(spare?.audience).toEqual(expect.arrayContaining(["Operations In-charge", "Finance"]));
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run tests/notifications.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/notifications.ts`**

```ts
import type { AppNotification, EmployeeDocument, GuardChangeEvent, SatisfactionCall, SpareDutyPayment } from "@/types/domain";

type EmployeeLite = { id: string; name: string; joiningDate: string; pfEsiDataReceived: boolean };
export type SopEdit = { site: string; title: string; updatedOn: string; officer: string };

export type NotificationInput = {
  today: string; // yyyy-mm-dd
  employees: EmployeeLite[];
  documents: EmployeeDocument[];
  guardChanges: GuardChangeEvent[];
  spareDutyPayments: SpareDutyPayment[];
  satisfactionCalls: SatisfactionCall[];
  sopEdits: SopEdit[];
};

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / DAY_MS);

export function deriveNotifications(input: NotificationInput): AppNotification[] {
  const list: AppNotification[] = [];

  for (const doc of input.documents) {
    if (doc.status === "pending" && doc.dueBy < input.today) {
      const who = input.employees.find(e => e.id === doc.employeeId);
      list.push({
        id: `doc-${doc.id}`, kind: "doc-delay",
        title: `${doc.type} overdue`,
        detail: `${who?.name ?? doc.employeeId} · due ${doc.dueBy} · ${doc.type} not uploaded`,
        audience: ["Owner", "Branch Manager", "HR", "HR Assistant", "HR Executive"],
        targetView: "workforce", at: doc.dueBy,
      });
    }
  }

  for (const employee of input.employees) {
    if (!employee.pfEsiDataReceived && daysBetween(employee.joiningDate, input.today) >= 15) {
      list.push({
        id: `pfesi-${employee.id}`, kind: "pf-esi-15day",
        title: "PF/ESI data missing beyond 15 days",
        detail: `${employee.name} joined ${employee.joiningDate}; enrolment details not received`,
        audience: ["Owner", "Branch Manager", "HR", "HR Assistant"],
        targetView: "workforce", at: input.today,
      });
    }
  }

  for (const change of input.guardChanges) {
    list.push({
      id: `gc-${change.id}`, kind: "guard-change",
      title: `Guard change at ${change.site}`,
      detail: `${change.post}: ${change.outgoing} → ${change.incoming} · ${change.at}`,
      audience: ["Field Officer", "Operations In-charge"],
      targetView: "duty-changes", at: change.at,
    });
  }

  for (const payment of input.spareDutyPayments) {
    list.push({
      id: `sp-${payment.id}`, kind: "spare-duty",
      title: payment.status === "transferred" ? "Spare duty amount transferred" : "Spare duty payment queued",
      detail: `${payment.employeeId} · ${payment.site} · ₹${payment.amount} · ${payment.date}`,
      audience: ["Operations In-charge", "Finance", "Owner", "Branch Manager"],
      targetView: "spare-payments", at: payment.date,
    });
  }

  for (const call of input.satisfactionCalls) {
    if (call.status === "due") {
      const who = input.employees.find(e => e.id === call.employeeId);
      list.push({
        id: `sat-${call.id}`, kind: "satisfaction-due",
        title: "3-day satisfaction call due",
        detail: `${who?.name ?? call.employeeId} joined ${call.joinedOn} · call by ${call.dueBy}`,
        audience: ["HR", "HR Assistant", "HR Executive"],
        targetView: "hr-quality", at: call.dueBy,
      });
    }
  }

  for (const edit of input.sopEdits) {
    list.push({
      id: `sop-${edit.site}-${edit.updatedOn}`, kind: "sop-edited",
      title: `Site document updated · ${edit.site}`,
      detail: `${edit.title} edited on ${edit.updatedOn} — review with your next visit`,
      audience: ["Field Officer"],
      targetView: "sops", at: edit.updatedOn,
    });
  }

  return list.sort((a, b) => b.at.localeCompare(a.at));
}
```

- [ ] **Step 4: Run tests** — `npx vitest run tests/notifications.test.ts`. Expected: PASS.

- [ ] **Step 5: Wire the bell.** In `hrms-app.tsx` replace the three hardcoded popover buttons (lines 239-241) with:

```tsx
const notifications = useMemo(() => deriveNotifications({
  today: "2026-09-22",
  employees, documents: employeeDocuments, guardChanges, spareDutyPayments,
  satisfactionCalls, sopEdits: [],
}).filter(item => item.audience.includes(role)), [role]);
```

Render `notifications.slice(0, 8)` in the popover (`title` bold, `detail` small, click → `navigate(item.targetView)`); the badge dot shows only when `notifications.length > 0`, and the popover header shows the count. Keep the existing SLA/payroll entries by adding them as `generic` items appended to the derived list for internal roles.

- [ ] **Step 6: Verify** — dev run: HR sees doc-delay + PF/ESI + satisfaction items; Field Officer sees guard-change; Finance sees spare-duty. Lint + build pass.

- [ ] **Step 7: Commit**

```bash
git add lib/notifications.ts tests/notifications.test.ts components/layout/hrms-app.tsx
git commit -m "feat: derived notification engine wired to role-aware bell"
```

### Task T11: Guard app — escalation contacts + presence-check interval surfaced

**Files:**
- Modify: `features/portals/portal-screens.tsx` (GuardHome, GuardPunch, NightVigilance link)

- [ ] **Step 1: Escalation contacts card.** In `GuardHome` add a `<Panel title="Emergency contacts" description="Site escalation numbers">` listing `guardSite.escalationContacts` with `tel:` anchors (label, name, phone). This satisfies "new guards can see site-level escalation numbers in the mobile app".

- [ ] **Step 2: Polygon-aware punch.** In `GuardPunch` replace the `distanceMetres(...) <= guardSite.radius` decision (`portal-screens.tsx:55-60`) with `isInsideGeofence(here, guardSite)` from `@/lib/geofence`; keep distance display for the circle fallback, and when a polygon exists show "Boundary: site polygon" in the map caption instead of the radius line. Pass `polygon={guardSite.polygon}` to `GeoMap`.

- [ ] **Step 3: Check-interval note.** Under the punch card add a small info row: "Presence checks every {guardSite.dayCheckIntervalMins} min (day) · {guardSite.nightCheckIntervalMins} min (night)".

- [ ] **Step 4: Verify + commit**

```bash
npm run lint && npm run build
git add features/portals/portal-screens.tsx
git commit -m "feat: guard app escalation contacts and polygon-aware attendance punch"
```

---

# Phase 3 — Duty management (Module 4)

### Task T12: Guard duty-change requests (swap / replacement / OT)

**Files:**
- Modify: `features/portals/portal-screens.tsx` (new `GuardDutyChange` screen), `components/layout/hrms-app.tsx` (nav + route)

- [ ] **Step 1: Nav + route.** Add `{ label: "Duty change", view: "guard-duty-change", icon: ArrowsLeftRight }` to `guardNavigation` and `if(view==="guard-duty-change") return <GuardDutyChange/>;` to `GuardPortal`.

- [ ] **Step 2: Build the screen** in `portal-screens.tsx`:

```tsx
function GuardDutyChange(){
  const notify=useToast();
  const [type,setType]=useState<DutyChangeType>("replacement");
  const [reason,setReason]=useState<DutyChangeReason>("sick");
  const [hours,setHours]=useState(2);
  const [note,setNote]=useState("");
  const [sent,setSent]=useState(false);
  const [mine,setMine]=useState<DutyChangeRequest[]>(dutyChangeRequests.filter(r=>r.employeeId==="BMG-1840"));
  function submit(){
    const request:DutyChangeRequest={ id:`DCR-${Date.now()}`, employeeId:"BMG-1840", type, date:"2026-09-23", site:guardSite.name, reason, hours:type==="ot"?hours:undefined, note, status:"pending" };
    setMine(current=>[request,...current]); setSent(true);
    notify(type==="ot"?"Additional duty recorded for approval":"Request sent · your field officer is notified");
  }
  return <>
    <PageHeader title="Duty change" description="Report sickness or accident, request a shift swap, or record additional duty (OT)."/>
    <Panel className="request-card"><div className="request-form">
      <label><span>Request type</span><select value={type} onChange={e=>{setType(e.target.value as DutyChangeType);setSent(false)}}>
        <option value="replacement">Replacement (sick / accident)</option>
        <option value="swap">Shift swap</option>
        <option value="ot">Additional duty (OT)</option>
      </select></label>
      {type!=="ot"&&<label><span>Reason</span><select value={reason} onChange={e=>setReason(e.target.value as DutyChangeReason)}>
        <option value="sick">Sickness</option><option value="accident">Accident</option>
        <option value="personal">Personal</option><option value="other">Other</option>
      </select></label>}
      {type==="swap"&&<label><span>Swap with</span><select><option>Deepa Menon</option><option>Rajeev Kumar</option><option>Any available reliever</option></select></label>}
      {type==="ot"&&<label><span>Extra hours</span><input type="number" min={1} max={12} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label>}
      <label><span>Date</span><input type="date" defaultValue="2026-09-23"/></label>
      <label><span>Details</span><textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="What happened, and from when do you need cover?"/></label>
    </div>
    {type==="replacement"&&<div className="inline-alert"><WarningCircle/><span>District operations is alerted immediately so a reliever can cover the post.</span></div>}
    <button className="primary-button wide" disabled={sent} onClick={submit}><CheckCircle/>{sent?"Submitted":"Submit request"}</button></Panel>
    <Panel title="My requests"><div className="schedule-list">{mine.map(r=><button key={r.id}>
      <strong>{r.date}</strong>
      <span>{r.type==="ot"?`Additional duty · ${r.hours} h`:r.type==="swap"?"Shift swap":"Replacement"}<small>{r.note||r.reason}</small></span>
      <Status tone={r.status==="approved"?"success":r.status==="rejected"?"danger":"warning"}>{r.status}</Status>
    </button>)}</div></Panel>
  </>;
}
```

- [ ] **Step 3: Ops approval queue.** New internal view `duty-changes` (already in T1/T3 types + role views): add a `DutyChangesScreen` to `features/operations/operations-screens.tsx` — table of all `dutyChangeRequests` (PersonCell w/ phone, type, date, site, reason, note, status) with Approve/Reject buttons updating row state and toasting `"Replacement approved · reliever pool opened"`. Register in `hrms-app.tsx` nav (Workspace group, label "Duty changes", icon `ArrowsLeftRight`, badge showing pending count) and in `renderView`.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint && npm run build
git add features/portals/portal-screens.tsx features/operations/operations-screens.tsx components/layout/hrms-app.tsx
git commit -m "feat: duty change requests (swap/replacement/OT) with ops approval queue"
```

### Task T13: Guard-change events + FO task board

**Files:**
- Modify: `features/operations/operations-screens.tsx` (Deployment + Inspections)

- [ ] **Step 1: Guard-change notification on assignment.** In `DeploymentScreen.assign()` (`operations-screens.tsx:53-61`), when a reliever fills a post append a `GuardChangeEvent` to component state and extend the toast: `"${name} assigned · FO ${site FO 1} notified of the guard change"`. Show a "Recent guard changes" panel under the roster listing events (site, post, outgoing→incoming, time) with an "Edit details" button opening the existing assignment drawer (edit access requirement).

- [ ] **Step 2: FO task board.** In `InspectionsScreen` add a `<Panel title="My tasks" description="SOP briefings, complaint verification and patrolling">` rendering `foTasks` filtered to the signed-in officer ("Ajmal Khan" for the Field Officer role) with kind chips (`sop-briefing` → "SOP briefing at duty change", `client-complaint` → "Client complaint (CRM)", `day-patrol`/`night-patrol` → patrolling, `guard-change-review`), due, and a Done button. This encodes the FO rules from the spec.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/operations/operations-screens.tsx
git commit -m "feat: guard-change events and field-officer task board"
```

---

# Phase 4 — Advance & finance (Module 5)

### Task T14: Advance calculator (TDD)

**Files:**
- Create: `lib/advance-calculator.ts`, `tests/advance-calculator.test.ts`

- [ ] **Step 1: Failing tests** — `tests/advance-calculator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";

describe("computeAdvanceEligibility", () => {
  it("caps at 40% of (earned minus deductions)", () => {
    const result = computeAdvanceEligibility({ grossEarned: 10000, deductionsToDate: 2000, alreadyRequested: 0 });
    expect(result.maxAdvance).toBe(3200); // (10000-2000)*0.4
    expect(result.headroom).toBe(3200);
  });
  it("subtracts already-requested advances from headroom", () => {
    const result = computeAdvanceEligibility({ grossEarned: 10000, deductionsToDate: 2000, alreadyRequested: 3000 });
    expect(result.maxAdvance).toBe(3200);
    expect(result.headroom).toBe(200);
  });
  it("never goes negative", () => {
    const result = computeAdvanceEligibility({ grossEarned: 1000, deductionsToDate: 2000, alreadyRequested: 500 });
    expect(result.maxAdvance).toBe(0);
    expect(result.headroom).toBe(0);
  });
  it("rounds to the rupee", () => {
    const result = computeAdvanceEligibility({ grossEarned: 4923, deductionsToDate: 0, alreadyRequested: 0 });
    expect(result.maxAdvance).toBe(1969); // 4923*0.4 = 1969.2
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run tests/advance-calculator.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `lib/advance-calculator.ts`**

```ts
import type { AdvanceEligibility } from "@/types/domain";

export const ADVANCE_RATE = 0.4;

/** Spec formula: maximum advance = (earned amount − deductions) × 40%. */
export function computeAdvanceEligibility(input: {
  grossEarned: number;
  deductionsToDate: number;
  alreadyRequested: number;
}): AdvanceEligibility {
  const base = Math.max(0, input.grossEarned - input.deductionsToDate);
  const maxAdvance = Math.round(base * ADVANCE_RATE);
  return {
    grossEarned: input.grossEarned,
    deductionsToDate: input.deductionsToDate,
    maxAdvance,
    alreadyRequested: input.alreadyRequested,
    headroom: Math.max(0, maxAdvance - input.alreadyRequested),
  };
}
```

- [ ] **Step 4: Run tests** — `npx vitest run`. Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add lib/advance-calculator.ts tests/advance-calculator.test.ts
git commit -m "feat: advance eligibility calculator per (earned - deductions) x 40% rule"
```

### Task T15: Use the formula in Advances + guard advance screen

**Files:**
- Modify: `features/payroll/payroll-screens.tsx:324-393`, `features/portals/portal-screens.tsx:149-163`

- [ ] **Step 1: HR Advances screen.** In `AdvancesScreen`, derive rows from real breakdowns instead of the static array: for each seeded requester (`BMG-2274`, `BMG-1988`, `BMG-2031`) call `usePayroll().getBreakdown(id)` and compute `computeAdvanceEligibility({ grossEarned: breakdown.gross, deductionsToDate: breakdown.pf + breakdown.esi + breakdown.otherDeductions, alreadyRequested: 0 })`; the table's "40% eligible" column shows `eligibility.maxAdvance` and the drawer's eligibility DefRows gains a row `{ label: "Deductions to date", value: rupees(deductionsToDate), mono: true }` between gross and cap. Update the page description to "Eligibility is 40% of gross earned minus deductions to date."

- [ ] **Step 2: Guard advance screen.** In `RequestScreen` (advance branch), compute the same eligibility from `getBreakdown("BMG-1840")` (wrap the guard portal usage in the already-present `PayrollProvider` — check `app/page.tsx` mounts it around `HrmsApp`; it does per the latest commit). Replace the hardcoded "₹1,969 (40% of gross earned wages)" description and the eligibility box numbers with live `eligibility.maxAdvance` / `headroom`, and disable submit with an inline warning when the entered amount exceeds headroom.

- [ ] **Step 3: Verify** — dev run: numbers on both screens agree with the formula (gross − PF − ESI − other) × 40%. Lint + build pass.

- [ ] **Step 4: Commit**

```bash
git add features/payroll/payroll-screens.tsx features/portals/portal-screens.tsx
git commit -m "feat: advance screens use (earned - deductions) x 40% eligibility"
```

### Task T16: Office exception deduction + spare-duty payments screen

**Files:**
- Modify: `features/workflows/workflow-screens.tsx` (`PenaltiesScreen` area), `components/layout/hrms-app.tsx`, Create screen in `features/payroll/payroll-screens.tsx`

- [ ] **Step 1: Office exception deduction.** In `PenaltiesScreen` add a second panel "Office exception deduction" (admin-level manual deduction): employee select, amount input (free, not fixed 500), reason textarea, effective payroll month, and an "Requires admin role" note — the Create button is disabled unless `role` is `Owner`/`Branch Manager`/`Finance`/`HR` (pass `role` down from `renderView` like `SiteConfigurationScreen` already does). On create, toast "Office exception deduction recorded · appears in payroll as 'office-exception'". Rename the nav label from "Penalties" to "Penalties & exceptions".

- [ ] **Step 2: Spare-duty payments screen.** New `SparePaymentsScreen` in `payroll-screens.tsx`: StatStrip (today's queued count, transferred total, alert recipients "Operations In-charge + Finance"), table of `spareDutyPayments` (PersonCell, site, date, amount, status) with a "Mark transferred" button per queued row that flips status and toasts "₹{amount} transferred · Operations In-charge and Finance alerted". Add nav item under Finance group (`view:"spare-payments"`, label "Spare payments", icon `HandCoins`) and the `renderView` case.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/workflows/workflow-screens.tsx features/payroll/payroll-screens.tsx components/layout/hrms-app.tsx
git commit -m "feat: office exception deductions and spare-duty daily payments with finance alerts"
```

---

# Phase 5 — Inventory (Module 6)

### Task T17: Batch/size inventory + request handling (internal)

**Files:**
- Modify: `features/payroll/payroll-screens.tsx:395-457` (`UniformsScreen`)

- [ ] **Step 1: Batch inventory drawer.** Extend the existing "View all 12 items" drawer with a per-item expansion listing its `uniformBatches` rows (batch no, size, qty, received date). Add a StatStrip entry "Batches tracked" with `new Set(uniformBatches.map(b=>b.batchNo)).size`.

- [ ] **Step 2: Requests queue panel.** New `<Panel title="Requests from guards" description="Raised in the mobile app · dispatch updates show in the guard's app">` listing `uniformRequests` in state: PersonCell, items summary (`"Shirt L ×1"`), requested date, amount, recovery plan, status `<select>` (`requested → approved → dispatched → delivered`); changing status toasts `"UR-2 marked dispatched · guard app updated · ₹900 queued for salary debit"`. This covers dispatch + debit through the software.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/payroll/payroll-screens.tsx
git commit -m "feat: uniform inventory batches/sizes and guard request dispatch queue"
```

### Task T18: Guard app uniform request + status tracking

**Files:**
- Modify: `features/portals/portal-screens.tsx`, `components/layout/hrms-app.tsx`

- [ ] **Step 1: Nav + route.** Guard nav item `{ label:"Uniform", view:"guard-uniform", icon:Package }`; `GuardPortal` route to new `GuardUniform`.

- [ ] **Step 2: Screen.** `GuardUniform`: shows "My sizes" (from `employee.uniformSizes` — shirt L / trouser 34 / shoe 9 for the demo guard), a request form (item select from `uniformKit` names, size select matching the item type, qty, recovery plan select reusing `uniformPlans` names) with submit appending to local list and toasting "Request sent to store"; below, "My requests" list rendering each request with a 4-step status timeline (`requested → approved → dispatched → delivered`) using the existing `Timeline` component, plus the deduction amount ("₹450 will be recovered as Full salary deduction"). Seed with `uniformRequests` for `BMG-1840`.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/portals/portal-screens.tsx components/layout/hrms-app.tsx
git commit -m "feat: guard uniform request flow with dispatch status tracking"
```

---

# Phase 6 — HR quality & exit (Module 7)

### Task T19: HR quality screen — 3-day satisfaction calls + 1-10 ratings

**Files:**
- Create: `features/hr/hr-quality-screens.tsx`
- Modify: `components/layout/hrms-app.tsx`, `features/workforce/workforce-screen.tsx`, `features/operations/operations-screens.tsx` (site cards)

- [ ] **Step 1: Screen skeleton.** `HrQualityScreen` with two panels:
  - **Satisfaction calls**: table of `satisfactionCalls` joined to employees (PersonCell + phone tel: link — the call is made from here), joined date, due-by, status; "Record call" opens a `DetailDrawer` with a 1–10 score select + notes textarea; saving marks done. Overdue `due` rows use the warning Status tone. Description: "Automatic task created 3 days after every joining."
  - **Ratings**: two tab-filtered lists (Employees / Sites) showing current average from `ratings`; each row has a 1–10 select + "Rate" button appending a new `Rating` to state, and shows the last rating (`score`, `ratedBy`, `on`).
- [ ] **Step 2: Wire nav** — Workspace/HR group item `{ label:"HR quality", view:"hr-quality", icon:Star }` and `renderView` case (`role` prop not needed).
- [ ] **Step 3: Surface ratings.** Workforce table gains a "Rating" column (`ratings` average per employee, rendered `8/10`; "—" when unrated). Site cards (`operations-screens.tsx:29-34`) gain a rating line in their `<dl>`.
- [ ] **Step 4: Verify + commit**

```bash
npm run lint && npm run build
git add features/hr/hr-quality-screens.tsx components/layout/hrms-app.tsx features/workforce/workforce-screen.tsx features/operations/operations-screens.tsx
git commit -m "feat: HR quality screen with 3-day satisfaction calls and 1-10 ratings"
```

### Task T21: Exit → recruitment pipeline

**Files:**
- Modify: `features/workflows/workflow-screens.tsx:246-324` (`ExitClearanceScreen`)
- Create: `RecruitmentScreen` in `features/hr/hr-quality-screens.tsx`
- Modify: `components/layout/hrms-app.tsx`

- [ ] **Step 1: Exit capture form.** In `ExitClearanceScreen` add an "Initiate exit" panel above the clearance list: employee select, exit date + time inputs, reason, adjustments textarea, priority select (`high`/`normal`). Submitting appends an `ExitRecord` to state, toasts "Exit recorded · vacancy pushed to recruitment list", and appends a `RecruitmentVacancy` derived from the employee's current site/post (`source:"exit"`, `priority` from the form, `openedOn` = exit date) to a module-level exported state store — simplest prototype mechanism: lift `vacancies` into `OpsProvider`-style context OR pass through component state; use a new lightweight context `components/shared/ops-context.tsx`:

```tsx
"use client";
import { createContext, useContext, useState } from "react";
import { recruitmentVacancies as seed } from "@/lib/mock-data";
import type { RecruitmentVacancy } from "@/types/domain";

type OpsValue = {
  vacancies: RecruitmentVacancy[];
  addVacancy: (vacancy: RecruitmentVacancy) => void;
  updateVacancy: (id: string, status: RecruitmentVacancy["status"]) => void;
};
const OpsContext = createContext<OpsValue | null>(null);

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const [vacancies, setVacancies] = useState(seed);
  return <OpsContext.Provider value={{
    vacancies,
    addVacancy: vacancy => setVacancies(current => [vacancy, ...current]),
    updateVacancy: (id, status) => setVacancies(current => current.map(item => item.id === id ? { ...item, status } : item)),
  }}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const value = useContext(OpsContext);
  if (!value) throw new Error("useOps must be used inside OpsProvider");
  return value;
}
```

Mount `OpsProvider` inside `HrmsApp` next to `ToastProvider` (`hrms-app.tsx:100-102`).

- [ ] **Step 2: Recruitment screen.** `RecruitmentScreen` (same file as HR quality): StatStrip (open vacancies, high priority count, from exits, filled this month), table of `useOps().vacancies` — site, post, district, source chip, priority Status (danger for high), openedOn, status select (`open/interviewing/filled`). High-priority rows sort first. Nav item `{ label:"Recruitment", view:"recruitment", icon:UsersThree }` + `renderView` case.

- [ ] **Step 3: Verify** — dev run: initiate an exit with priority high → recruitment list instantly shows the new vacancy at top. Lint + build pass.

- [ ] **Step 4: Commit**

```bash
git add features/workflows/workflow-screens.tsx features/hr/hr-quality-screens.tsx components/shared/ops-context.tsx components/layout/hrms-app.tsx
git commit -m "feat: exit initiation auto-creates prioritized recruitment vacancies"
```

---

# Phase 7 — Tickets, mobile login, analytics, exports (Module 8)

### Task T20: Open ticketing system

**Files:**
- Create: `features/compliance/tickets-screen.tsx`
- Modify: `components/layout/hrms-app.tsx`, `features/portals/portal-screens.tsx` (guard "Help" screen)

- [ ] **Step 1: Internal screen.** `TicketsScreen`: StatStrip (open, in-progress, resolved-this-month, SLA-at-risk), category filter toolbar, table of `tickets` state (id, raiser via PersonCell when employee, category chip, subject, SLA, assignee, status), row click opens `DetailDrawer` with the trail `Timeline`, a reply textarea appending to the trail, status select, and assignee select. "New ticket" button opens the same drawer empty for manual logging. Follow `ComplaintsScreen` idioms exactly (`compliance-screens.tsx:17-99`).
- [ ] **Step 2: Guard help screen.** Guard nav `{ label:"Help & queries", view:"guard-help", icon:ChatCircleText }` → `GuardHelp`: form (category select incl. "Salary doubt", subject, detail) submits into a local list + toast "Ticket TKT-… raised · HR will respond"; below, "My tickets" list with status and trail drawer. Payslips screen (`Payslips` in `portal-screens.tsx`) gets a "Ask about this payslip" button in the drawer footer that deep-links to `guard-help` (call `onNavigate` prop — add it to `GuardPortal` plumbing) with category preset to salary — the mobile salary-doubt requirement.
- [ ] **Step 3: Wire internal nav** — Compliance group `{ label:"Tickets", view:"tickets", icon:ChatCircleText, badge:"2" }` + `renderView` case.
- [ ] **Step 4: Verify + commit**

```bash
npm run lint && npm run build
git add features/compliance/tickets-screen.tsx features/portals/portal-screens.tsx components/layout/hrms-app.tsx
git commit -m "feat: open ticketing system with guard help and salary queries"
```

### Task T22: Multi-user quick switch (shared phone)

**Files:**
- Modify: `features/portals/portal-screens.tsx` (GuardProfile), `components/layout/hrms-app.tsx`

- [ ] **Step 1: Sign-out → user picker.** Add a "Sign out" button to `GuardProfile`. Clicking it opens a full-screen overlay (`div.modal-backdrop` + centered card, reusing `ActionModal` styles from `hrms-app.tsx:294-312`): "Who is signing in?" with the device's recent users — list 3 seeded guards (`Suresh Babu BMG-1840`, `Vinod Raj BMG-2118`, `Jomon Jose BMG-2087`) each with avatar initials + "Tap to continue", plus an "Other employee" row with an employee-ID input. Selecting a user toasts `"Signed in as {name}"` and returns to `guard-home`. Prototype note in the card footer: "Shared-device mode — one tap after the previous user signs out."
- [ ] **Step 2: State.** Store the active guard in `HrmsShell` state (`activeGuardId`, default `"BMG-1840"`) and pass it into `GuardPortal` so the profile hero name/id switches (other guard screens may keep demo data — they already key off the demo guard; switching the visible identity satisfies the prototype requirement).
- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/portals/portal-screens.tsx components/layout/hrms-app.tsx
git commit -m "feat: shared-device quick user switch in guard app"
```

### Task T24: Analytics — performance heat map + monthly graphs

**Files:**
- Create: `features/reports/analytics-screens.tsx`
- Modify: `components/layout/hrms-app.tsx`

> Before writing any chart code, invoke the `dataviz` skill and follow its palette/mark rules.

- [ ] **Step 1: Screen.** `AnalyticsScreen` with:
  - **Monthly graphs panel**: Recharts `LineChart` over `monthlyPerformance` (coverage %, attendance %) and a `BarChart` (complaints per month). Recharts is already a dependency (`package.json:40`). Wrap in `ResponsiveContainer` height 260.
  - **Employee heat map panel**: CSS-grid heat map — rows = employees, columns = `["Attendance","Punctuality","SOP","Rating","Complaints"]`, each cell a div colored by a 5-step scale (`--heat-1..5` CSS variables added to `app/tokens.css`, light→dark accent). Derive scores: attendance from `attendanceRows` state (On site 10 / Late 5 / Absent 1), rating from `ratings`, others seeded constants per employee in the component. Cell title tooltip: `"{employee} · {metric}: {score}/10"`.
  - **Site heat map panel**: rows = sites, columns = `["Coverage","Rating","Complaints","Feedback"]`, same scale (coverage% mapped /10, feedback from `siteFeedback`).
- [ ] **Step 2: Wire nav** — Compliance group `{ label:"Analytics", view:"analytics", icon:ChartBar }` + `renderView` case; keep `reports` as-is.
- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/reports/analytics-screens.tsx components/layout/hrms-app.tsx app/tokens.css
git commit -m "feat: performance heat maps and monthly trend graphs"
```

### Task T25: Dynamic export mapper (TDD on the mapping logic)

**Files:**
- Create: `lib/export-mapper.ts`, `tests/export-mapper.test.ts`
- Modify: `features/compliance/compliance-screens.tsx` (`ReportsScreen`)

- [ ] **Step 1: Failing tests** — `tests/export-mapper.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyTemplate, toCsv } from "@/lib/export-mapper";

const columns = [{ label: "Employee" }, { label: "Gross" }, { label: "Net" }];
const rows = [["Suresh", 16000, 13160], ["Fathima", 16183, 15062]];

describe("applyTemplate", () => {
  it("renames, reorders and drops columns per template", () => {
    const template = { name: "Client A", report: "r", columns: [
      { source: "Net", header: "NET PAY", include: true },
      { source: "Employee", header: "STAFF NAME", include: true },
      { source: "Gross", header: "Gross", include: false },
    ]};
    const result = applyTemplate(columns, rows, template);
    expect(result.headers).toEqual(["NET PAY", "STAFF NAME"]);
    expect(result.rows[0]).toEqual([13160, "Suresh"]);
  });
  it("passes everything through when the template has no columns", () => {
    const result = applyTemplate(columns, rows, { name: "d", report: "r", columns: [] });
    expect(result.headers).toEqual(["Employee", "Gross", "Net"]);
    expect(result.rows).toEqual(rows);
  });
});

describe("toCsv", () => {
  it("quotes cells containing commas", () => {
    expect(toCsv(["A"], [["x,y"]])).toBe('A\n"x,y"');
  });
});
```

- [ ] **Step 2: Run to fail**, then **Step 3: Implement `lib/export-mapper.ts`**

```ts
import type { ExportTemplate } from "@/types/domain";

type Cell = string | number;

export function applyTemplate(
  columns: { label: string }[],
  rows: Cell[][],
  template: ExportTemplate,
): { headers: string[]; rows: Cell[][] } {
  if (!template.columns.length) return { headers: columns.map(c => c.label), rows };
  const active = template.columns.filter(column => column.include);
  const indexOf = (source: string) => columns.findIndex(column => column.label === source);
  const picks = active.map(column => ({ header: column.header, index: indexOf(column.source) })).filter(pick => pick.index >= 0);
  return {
    headers: picks.map(pick => pick.header),
    rows: rows.map(row => picks.map(pick => row[pick.index])),
  };
}

export function toCsv(headers: string[], rows: Cell[][]) {
  const escape = (cell: Cell) => {
    const text = String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(escape).join(","), ...rows.map(row => row.map(escape).join(","))].join("\n");
}
```

- [ ] **Step 4: Run tests** — `npx vitest run`. Expected: PASS.

- [ ] **Step 5: Mapper UI in ReportsScreen.** Add an "Export mapping" section under the filter form: a template select (state list seeded from `exportTemplates` + "New template…"), then a column-mapping editor — one row per column of the current report `spec`: include checkbox, source label (read-only), client header input, ▲▼ reorder buttons. "Save template" stores `{name, report, columns}` into component state (and `localStorage` key `bmg-export-templates` so it survives reload); the Export button builds `applyTemplate(spec.columns, spec.rows, activeTemplate)` → `toCsv` → triggers a real download via `URL.createObjectURL(new Blob([csv], { type:"text/csv" }))` + temporary `<a download>` click. Description text: "Map system fields to the client's Excel column names — templates can be updated when the client's format arrives."

- [ ] **Step 6: Verify** — dev run: run a report preview, rename Net → "NET PAY", uncheck a column, export, open the CSV: headers/order match. Lint + build pass.

- [ ] **Step 7: Commit**

```bash
git add lib/export-mapper.ts tests/export-mapper.test.ts features/compliance/compliance-screens.tsx
git commit -m "feat: dynamic export templates with client column mapping and real CSV download"
```

### Task T23: Settings — hierarchy, custom fields, document checklist

**Files:**
- Modify: `features/compliance/compliance-screens.tsx:293-337` (`SettingsScreen`)

- [ ] **Step 1: "Roles and access" group rework.** Replace the static role matrix with: a table of `internalRoles` from `lib/roles.ts` showing name, tier `<select>` (0–4), and default view; a note "Hierarchy is provisional — update tiers when the client confirms the reporting structure" (spec module 1). Changing tiers updates component state + toast.
- [ ] **Step 2: New "Onboarding" settings group.** Two editors following the existing `duty-unit-editor` idiom (`compliance-screens.tsx:330`):
  - **Document checklist**: chips of `documentChecklist` in state with remove ✕ and an "Add document type" input (dynamic documentation config).
  - **Custom fields**: rows of `customFieldDefs` (label input, kind select, remove) + add row (dynamic future-fields requirement).
  - **PF/ESI alert window**: number input default 15 with suffix "days after joining".
- [ ] **Step 3: Verify + commit**

```bash
npm run lint && npm run build
git add features/compliance/compliance-screens.tsx
git commit -m "feat: settings for role hierarchy, document checklist and custom onboarding fields"
```

---

# Phase 8 — Docs & wrap-up

### Task T26: Documentation + final sweep

**Files:**
- Modify: `FRONTEND_TEST_GUIDE.md`

- [ ] **Step 1: Document every new feature** in the guide's feature-inventory style: new roles list, onboarding additions, polygon geofence + grace/check intervals, duty changes, advance formula, spare payments, inventory batches/requests, HR quality + recruitment, tickets, quick user switch, analytics, export templates — each with a one-line "Test: …" instruction (role → screen → action), matching the existing format (`FRONTEND_TEST_GUIDE.md:37-54`).
- [ ] **Step 2: Full verification** — Run: `npm run lint && npm run build && npx vitest run`. Expected: all PASS. Then `npm run dev` and walk each of the 11 roles once.
- [ ] **Step 3: Commit**

```bash
git add FRONTEND_TEST_GUIDE.md
git commit -m "docs: test guide covers all BMG scope-expansion features"
```

---

## Self-review notes

- **Spec coverage:** every row of the requirement map above names its task; 5d (payslip history) and 7d (exit clearance) already exist and are extended rather than rebuilt. Role hierarchy (1) and client Excel format (8d) are config UIs by design — the client has not supplied the data.
- **Renamed roles risk:** T3 Step 3 includes a grep for `"HR & Payroll"` / `"District Operations"` — do not skip it; `compliance-screens.tsx:332` (settings role matrix) and nav labels are known hit sites.
- **Ordering:** T0–T4 are prerequisites for everything; phases 1–7 are independent of each other except T10 (needs T2 seed data), T15 (needs T14), T18 (needs T17 data), T21 (creates `ops-context` used nowhere else), T25 (extends ReportsScreen only).
- **Prototype boundary:** file uploads (nominee photo, feedback forms, client agreements) are recorded as metadata/flags, real storage arrives with the backend. All new state is React state/context (+ localStorage only for export templates), matching the existing app.
