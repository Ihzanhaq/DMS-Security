import type { StoredFileMeta } from "@/lib/file-store";

export type Role =
  | "Owner" | "Branch Manager" | "Operations In-charge"
  | "Finance" | "Finance Assistant"
  | "HR" | "HR Assistant" | "HR Executive"
  | "Field Officer" | "Guard" | "Client";

export type PayBasis = "monthly" | "daily" | "site";
export type BenefitOverride = "inherit" | "enabled" | "disabled";
export type BenefitScheme = "salary-only" | "esi" | "pf-esi";

export type AppView =
  | "dashboard" | "workforce" | "sites" | "deployment" | "attendance"
  | "payroll" | "advances" | "uniforms" | "inspections" | "complaints"
  | "reports" | "imports" | "settings"
  | "employee-form" | "site-config" | "site-detail" | "site-attendance" | "assignment-form" | "attendance-correction"
  | "payroll-allocation" | "night-vigilance" | "uniform-issue" | "exit-clearance"
  | "penalties" | "inspection-form" | "complaint-form" | "sop-form" | "action-centre" | "advance-form"
  | "tickets" | "recruitment" | "hr-quality" | "duty-changes" | "spare-payments" | "analytics" | "access"
  | "guard-home" | "guard-punch" | "guard-schedule" | "guard-leave"
  | "guard-advance" | "guard-payslips" | "guard-sops" | "guard-profile" | "guard-vigilance"
  | "guard-duty-change" | "guard-uniform" | "guard-help"
  | "client-home" | "client-sites" | "client-complaints" | "client-coverage";

/** Capability profile used for deployment eligibility. */
export type Skill = "Day book" | "Driving" | "General security" | "Specialized";

export type Employee = {
  id: string;
  name: string;
  initials: string;
  role: string;
  district: string;
  site: string;
  shift: string;
  status: "Active" | "Leave" | "Reliever";
  salary: number;
  /** Relievers are paid a fixed rate per duty instead of a monthly salary. */
  dailyRate?: number;
  payBasis?: PayBasis;
  pfOverride?: BenefitOverride;
  esiOverride?: BenefitOverride;
  skills: Skill[];
  pf: boolean;
  esi: boolean;
  phone: string;
  joiningDate: string;
  workPreference?: WorkPreference;
  uniformSizes?: UniformSizes;
  nominee?: Nominee;
  /** Values for admin-defined custom fields, keyed by CustomFieldDef.key. */
  customFields?: Record<string, string>;
  /** PF/ESI enrolment data received (drives the 15-day alert). */
  pfEsiDataReceived: boolean;
};

export type EmployeePayRule = {
  employeeId: string;
  effectiveFrom: string;
  basis: PayBasis;
  monthlySalary?: number;
  dailyRate?: number;
  payableDays: number;
  pfOverride: BenefitOverride;
  esiOverride: BenefitOverride;
};

export type SitePayRule = {
  site: string;
  effectiveFrom: string;
  defaultDutyRate?: number;
  scheme: BenefitScheme;
};

export type PostRateRule = {
  site: string;
  post: string;
  effectiveFrom: string;
  dutyRate: number;
};

export type ApprovedDuty = {
  id: string;
  employeeId: string;
  date: string;
  site: string;
  post: string;
  quantity: number;
  status: "approved" | "pending" | "absent";
  paidLeave?: boolean;
};

export type PayrollDeduction = {
  id: string;
  employeeId: string;
  period: string;
  kind: "advance" | "uniform" | "penalty" | "office-exception";
  label: string;
  amount: number;
};

export type PayrollException = {
  dutyId?: string;
  message: string;
  code: "missing-employee-rule" | "missing-site-rule" | "missing-site-rate" | "invalid-denominator";
};

export type PayrollDutyLine = {
  id: string;
  date: string;
  site: string;
  post: string;
  quantity: number;
  rate: number | null;
  rateSource: "Monthly" | "Daily" | "Site" | "Post" | "Missing";
  gross: number;
  pfEligible: boolean;
  esiEligible: boolean;
};

export type PayrollSiteBreakdown = {
  site: string;
  duties: number;
  grossExact: number;
  gross: number;
  pf: number;
  esi: number;
  net: number;
  schemeLabel: string;
  rateSources: string[];
  lines: PayrollDutyLine[];
};

export type PayrollBreakdown = {
  employeeId: string;
  period: string;
  payBasis: PayBasis;
  duties: number;
  gross: number;
  pf: number;
  esi: number;
  otherDeductions: number;
  net: number;
  sites: PayrollSiteBreakdown[];
  deductions: PayrollDeduction[];
  exceptions: PayrollException[];
};

export type StatutorySettings = {
  pfRate: number;
  esiRate: number;
  pfWageCeiling: number;
  esiWageCeiling: number;
};

export type Site = {
  client: string;
  name: string;
  district: string;
  posts: number;
  staffed: number;
  coverage: number;
  scheme: "Salary only" | "ESI" | "PF + ESI";
  /** Geofence centre and boundary, in degrees and metres. */
  lat: number;
  lng: number;
  radius: number;
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
};

export type GeoState = "idle" | "locating" | "inside" | "outside" | "denied" | "unavailable";

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
  /** The uploaded file, when one is attached. */
  file?: StoredFileMeta;
};

export type Nominee = {
  name: string;
  relation: string;
  phone: string;
  address: string;
  bankAccount?: string;
  ifsc?: string;
  /** Mirrors whether a nominee photo is attached. */
  photoOnFile: boolean;
  /** Uploaded nominee photo. */
  photo?: StoredFileMeta;
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
  file?: StoredFileMeta;
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
  /** Set when the office logged it on the guard's behalf; guard-app requests leave it empty and alert the office. */
  loggedBy?: "office";
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

/** A kind of rating the organisation collects (HR, client, field officer…). Managed in Settings → Ratings. */
export type RatingType = { id: string; label: string };

export type Rating = {
  targetType: "employee" | "site";
  targetId: string;
  score: number; // 1–10
  ratedBy: string;
  on: string;
  /** Rating type id (see RatingType). Missing means HR. Overall = average of each type's latest score. */
  source?: string;
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

/** Night-duty presence check. Missed checks become attendance exceptions. */
export type NightCheck = {
  employee: string;
  empId: string;
  site: string;
  due: string;
  state: "Due now" | "Upcoming" | "Missed" | "Confirmed";
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
  /** Opens site detail when targetView is site-detail. */
  targetSite?: string;
  at: string;
};
