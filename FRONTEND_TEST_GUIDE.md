# BMG Security HRMS Frontend — Feature & Test Guide

This project is a frontend-only React prototype for BMG Security's HRMS and security operations suite. It is designed for local review and does not require deployment.

## 1. Run the project

Requirements: Node.js 22.13 or newer.

```powershell
cd "C:\Users\ihzan\Documents\ChatGPT\Security Management System"
npm install
npm run dev
```

Open `http://localhost:5173`.

Quality checks:

```powershell
npm run lint
npm run build
```

## 2. How to review the product

### Demo sign-in

The app opens on the sign-in page. Sign in with an email, phone or employee ID; every demo account uses the password **`Bmg@2026`**. Google and Microsoft buttons show a notice until the live backend exists. Sign out from the account menu (top right).

| Role | Name | Sign in with |
| --- | --- | --- |
| Owner | Arun Kumar | `arun@bmgsecurity.in` |
| Branch Manager | Vishnu Prasad | `vishnu@bmgsecurity.in` |
| Operations In-charge | Nithin Joseph | `nithin@bmgsecurity.in` |
| Finance | Divya Menon | `divya@bmgsecurity.in` |
| Finance Assistant | Arjun R | `arjun@bmgsecurity.in` |
| HR (customised: HR admin) | Meera Nair | `meera@bmgsecurity.in` |
| HR Assistant | Anu Thomas | `anu@bmgsecurity.in` |
| HR Executive | Rahul Dev | `rahul@bmgsecurity.in` |
| Field Officer | Ajmal Khan | `ajmal@bmgsecurity.in` |
| Field Officer (Tickets override) | Praveen S | `praveen@bmgsecurity.in` |
| Guard | Suresh Babu | `BMG-1840` or `9847012840` |
| Client | Lulu Group | `security@lulugroup.in` |

Use the role selector underneath the BMG Security logo. Each role has a separate navigation and landing screen:

- **Owner** — complete organization view and every management module.
- **HR & Payroll** — employees, attendance, payroll, advances, uniforms, penalties, exits and reports.
- **District Operations** — sites, posts, deployment, attendance, vacancy handling and SOPs.
- **Field Officer** — inspection routes, site visits, verification and follow-ups.
- **Guard** — mobile-style attendance, schedule, leave, salary advance, payslips, SOPs and night checks.
- **Client** — client overview, contracted sites, live coverage and complaint submission.

The selected role and screen are stored in the URL, so refresh and browser Back/Forward navigation work. The theme button switches between light and dark mode.

## 3. Complete feature inventory

### Executive dashboard and action centre

- Workforce, client, site, district and attendance summaries.
- District coverage, shift movement and payroll progress.
- Prioritized late-login, vacancy, complaint and payroll exceptions.
- Click **Need attention** or **Open action centre**, then resolve individual queue items.

### Workforce and employee configuration

- Searchable/filterable employee directory and employee detail drawer.
- Add/edit employee form with contact, district, joining date and role.
- Skill categories: day-book/register handling, driving, general security and specialized security.
- Pay basis: monthly working-day salary, daily-rate reliever or duty-based pay.
- Employee-specific PF and ESI switches, including contribution rates and wage ceilings.
- Configurable opening balances and a link to bulk import.
- Test: **Workforce → Add employee**, toggle skills and benefits, then click **Save employee**.

### Clients, sites, posts and geofences

- Site coverage cards, post counts, district filters and benefit profiles.
- Site configuration tabs for profile, posts/shifts, geofence/attendance and benefit defaults.
- Editable post name, shift, headcount and duty quantity.
- Day, night and 24-hour rotation support.
- Geofence latitude, longitude and radius; browser location capture is available.
- Late-login time, offline grace period, device sharing and GPS-spoofing policies.
- Organization/client/site/post/employee rule inheritance.
- Test: **Sites & posts → Open site** and review every tab. Add and remove a post, then save.

### Deployment and duty accounting

- Date-based deployment board with staffed, vacant and replacement-required posts.
- Skill-matched assignment form for site, post, employee and date range.
- Configurable duty quantities including 0.25, 0.50, 0.75, 1.00 and 1.50.
- Daily-rate reliever support, with rates such as ₹500, ₹516, ₹650 and ₹750.
- 24-hour pair rotation: 15/15 duties in a 30-day month and 16/15 in a 31-day month.
- Vacancy visibility and replacement workflow.
- Test: **Deployment → Assign employee**, select the duty quantity and save the assignment.

### Attendance and night vigilance

- Live punch table with on-time, late, absent and missing-punch states.
- Present, absent and exception tabs.
- Manual attendance correction with reason and audit note.
- Guard punch screen with geofence check before punch-in.
- Configurable 9:00 AM late/absence alerts and offline grace.
- Low-bandwidth night vigilance queue with periodic presence confirmations.
- HR night-check board and a dedicated Guard night-check action.
- Test: **Attendance → Manual entry**. Then open **Night checks** and record a due check.

### Payroll, proration and statutory benefits

- Working-day/duty-based gross salary calculation.
- Fractional duty totals carried into payroll.
- Multi-site allocation for Salary only, Salary + ESI, and Salary + ESI + PF.
- PF and ESI calculated per site segment instead of across ineligible earnings.
- Employee-level PF/ESI configuration can override site defaults.
- Review stages for attendance, calculation, exceptions, approval and payment.
- Test: **Payroll → Allocation audit**. Change duties, gross earnings or benefit profile, add/remove a segment, and approve the allocation.

### Salary advances

- Eligibility based on 40% of approved gross wages earned up to the request date.
- HR request list with requested-versus-eligible progress and review states.
- Guard self-service advance form.
- Test as **Guard → Advance**, complete the request and submit it.

### Uniforms, inventory and exit recovery

- Twelve-item issue checklist.
- Three recovery plans: ₹1,960 upfront; ₹1,000 upfront + ₹1,200 salary deduction; or ₹2,600 salary deduction.
- Inventory availability and employee recovery balances.
- Opening-balance import.
- Exit clearance alert and approval blocking for uniform dues, advances, penalties or unreturned assets.
- Test: **Uniforms → Issue kit** and toggle items. Then open **Exit clearances**, select a blocked employee, settle the uniform amount and confirm asset return.

### Penalty management

- Complaint-linked one-time ₹500 salary deduction.
- Duplicate deduction prevention for a complaint/employee pair, including reinstatement scenarios.
- Penalty ledger and verification status.
- Test: **Penalties**, select Rajeev Kumar to see duplicate protection; select another employee to record a valid deduction.

### Field officer inspections

- FSO summary, visit route and status board.
- Visit form with site, timestamp, punch verification and checklist result.
- Site-specific checklist editor entry point.
- Test: **Inspections → Log visit**, complete the form and save the verified visit.

### Site SOPs

- Versioned site instruction cards with acknowledgement status.
- SOP creation form with site, version, effective date, category and instructions.
- Guard-facing SOP acknowledgement screen.
- Test: **Site SOPs → New SOP**, save it; switch to **Guard → Site SOPs** and acknowledge a document.

### Client complaints and SLA redressal

- Complaint list with filters, owners, due times and investigation states.
- Complaint form with category, severity, SLA and investigation owner.
- Rule that makes the ₹500 penalty available only after a complaint is verified and the guard is withdrawn.
- Client portal for submitting and tracking complaints.
- Test as **Client → Complaints → New complaint**. Click **Back** to confirm it returns to the client complaint list.

### Reports and imports

- Attendance, payroll, statutory, deduction, vacancy and grievance report library.
- Date, site/client and employee filters with export actions.
- Import types: employees, clients/sites, deployment, attendance corrections, salary settings and opening balances.
- Four-step import flow: file selection, field mapping, row validation and approval preview.
- Test: **Import centre**, choose a type, select any local CSV/XLSX file, review mapping, validation and final import preview.

### Dynamic settings

- Organization defaults with client, site, post and employee override hierarchy.
- Attendance, payroll, PF/ESI, duty units, notifications and role/access groups.
- Effective-date labels and editable policy values.
- Add/remove fractional duty units.
- Test: **Settings**, visit every group, change a value and click **Save changes**.

### BMG scope expansion (September 2026)

**Users & roles (Manage → Users & roles)**

- The sidebar switcher now signs in as a **user** (grouped by role), not a bare role. The URL keeps `?user=` so refresh stays signed in.
- 24 permission modules (one per screen group, plus "Salary figures & rates" as a data permission), each set to No access / View / Edit.
- **Roles tab:** reporting tree; add, rename, duplicate, delete roles; set "Reports to" (cycles blocked), "Opens on" screen (only allowed modules listed), and the permission matrix with per-group "Set all". Owner is locked to full access. Built-in roles can be edited but not deleted; roles with users or child roles cannot be deleted.
- **Users tab:** search and filter; add, edit, disable, delete users; change role; per-user overrides for any module (Inherit / No access / View / Edit) with role level and effective level side by side; "Reset to role". "Sign in as" previews exactly what that user sees.
- **Enforcement:** sidebar, screen access, bookmarked URLs and the notification bell follow the effective permissions. View-only screens show a banner and block action buttons.
- **Safety:** at least one active user must always keep edit access to Users & roles; you cannot delete the user you are signed in as.
- Edits persist in this browser (localStorage `bmg-access-v1`) until the backend exists.
- Test: Roles → Field Officer → set Tickets to No access → Save. Sign in as **Ajmal Khan** (no Tickets) then **Praveen S** (Tickets kept by his override). As Praveen open **Sites & posts** — view-only banner, "Add site" blocked.

**Onboarding additions**

- Documents checklist (ID proof, PCC, …) with statuses, due dates and overdue flags; new document types can be added inline and in Settings → Onboarding.
- Nominee identity, address, bank details and photo-collected flag.
- Work-location preference: district and taluk dropdowns for all 14 Kerala districts.
- Uniform sizes (shirt/trouser/shoe) captured on the form; joining date drives the PF/ESI 15-day warning.
- Custom profile fields defined by admins render automatically.
- **Save employee** stores everything — documents, nominee, sizes, preference, custom fields, PF/ESI received flag — in this browser (localStorage `bmg-onboarding-v1`); reopening the employee shows it after a reload.
- **Settings → Onboarding** drives the form: added document types appear on every employee, custom fields appear on the form, and the PF/ESI alert window (days) changes the warning and the bell alert.
- The guard app's Uniform screen shows the sizes saved on the employee.
- **Real file uploads:** every document row and the nominee photo have Upload (PDF, JPG, PNG, WEBP; max 5 MB). Uploaded files can be viewed, downloaded, replaced or removed; uploading sets the document to Uploaded, removing sets it back to Pending. Files are stored in this browser (IndexedDB `bmg-files`) until the backend exists.
- Test: Suresh Babu → Edit profile → upload a PDF on PCC → Save → reload → reopen → the file opens with View.
- Test: **Settings → Onboarding** — add "Driving licence", set the window to 7. **Workforce → Suresh Babu → Edit profile** — mark Driving licence uploaded, set shirt XL, enter a nominee, save. Reload and reopen: all kept. The bell now also flags Prasanth V (joined 12 Sep). Sign in as Suresh → Uniform shows XL.

**Notifications**

- The bell derives alerts from data per role: overdue documents and PF/ESI 15-day (HR), guard changes (Field Officer/Operations), spare-duty transfers (Operations/Finance), satisfaction calls due (HR).
- Test: open the bell as **HR**, then as **Field Officer** — the lists differ.

**Sites: polygon geofence, grace, team**

- Boundary mode toggle: circle or polygon (click the map to add corners; vertex list with remove/clear).
- Per-site late-arrival grace (15–60 min) and day/night presence-check intervals.
- Team and escalation tab: ordered FO 1/2/3 assignment and escalation contacts shown in the guard app.
- Documents and SOP tab: agreement, PCC/biodata requirements, SOP and check data; edits alert FO 1 on save. Client feedback panel records 1–10 satisfaction entries.
- Test: **Sites & posts → Lulu Mall, Kochi** — the polygon renders; add a vertex, then edit a document title and save to see the FO alert toast.

**Guard app additions**

- Emergency contacts card with tap-to-call numbers; polygon-aware attendance punch; presence-check interval note.
- Duty change screen: replacement (sick/accident), shift swap, or additional duty (OT) with hours.
- Uniform screen: recorded sizes, item request with size and recovery plan, and a per-request status timeline (requested → approved → dispatched → delivered).
- Help & queries: open tickets (salary doubts route here from the payslip drawer's "Ask about this payslip").
- Sign out on the profile opens the shared-device user picker (tap another guard to continue).
- Test as **Guard**: submit a duty change, request shoes size 9, raise a salary ticket, then sign out and pick Vinod Raj.

**Duty changes and FO tasks (internal)**

- Duty changes queue with approve/reject; approvals note reliever-pool opening for replacements.
- Deployment shows recent guard changes (with FO notification) and an edit entry point.
- Inspections gains a "My tasks" board: SOP briefings at duty change, client complaints (CRM), day/night patrolling.
- Test: **Duty changes** — approve the sick replacement; **Deployment** — assign a reliever and watch the guard-change row appear.

**Advance formula**

- Eligibility everywhere is (gross earned − deductions to date) × 40%, computed from the live payroll breakdown.
- Test: **Advances** — the table shows the deduction column; the guard advance screen blocks amounts above the cap.

**Finance additions**

- Office exception deduction: admin-only manual deduction with mandatory reason (Penalties & exceptions screen).
- Spare payments screen: daily spare-guard transfers with queued/transferred states; transfers alert Operations In-charge and Finance.
- Test: **Penalties & exceptions** as Finance (allowed) vs Field Officer (blocked); **Spare payments** — mark the queued row transferred.

**Inventory**

- Batch numbers and sizes per item in the inventory drawer; guard requests queue with status dropdown that updates the guard app and queues the salary debit on dispatch.
- Test: **Uniforms** — open "View all 12 items and batches"; set UR-2 to dispatched.

**HR quality, exits and recruitment**

- 3-day satisfaction calls: auto tasks with due/overdue states, recorded with a 1–10 score and notes.
- Ratings: 1–10 for employees and sites; averages appear in the workforce table and on site cards.
- Initiate exit (date, time, reason, adjustments, priority) pushes a vacancy straight into the Recruitment list; high priority sorts first.
- Test: **HR quality** — record the due call; **Exit clearances** — record a high-priority exit, then open **Recruitment** to see the new vacancy on top.

**Tickets**

- Open ticketing for salary, attendance, uniform, site issues and other; SLA, assignee, trail with replies, resolve action; manual logging drawer.
- Test: **Tickets** — open TKT-1042, add a reply, resolve it.

**Analytics and exports**

- Analytics: monthly coverage/attendance lines and complaints bars, plus 1–10 heat maps for employees and sites (scores printed in every cell).
- Reports gains an export-mapping section: rename/reorder/drop columns, save templates (kept in localStorage), and a real CSV download.
- Test: **Analytics** — hover the charts and cells; **Reports** — rename "Net payable" to "NET PAY", export, and open the downloaded CSV.

## 4. Shared interaction checklist

- Use all sidebar destinations in each role.
- Open and close the notifications panel.
- Open **Quick action**, change its type, enter the required fields and save.
- Test light/dark theme.
- Resize to mobile width; open the mobile menu and verify the Guard screens.
- Use browser Back/Forward and refresh on a nested screen.
- Confirm primary actions change state, show a saved state, navigate to a form, download/export, or open a review message.

## 5. Frontend-only boundary

The screens, navigation, calculations and interaction states are implemented for demonstration. Data is mock data and resets after a page reload. Login, API persistence, real push notifications, file parsing, payroll posting, statutory filing, map tiles, server-side GPS validation and anti-spoof enforcement require the later Spring Boot/backend phase.

The browser geolocation buttons use the device's real browser permission, but the prototype does not send that location to a server.
