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
