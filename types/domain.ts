export type Role = "Owner" | "HR & Payroll" | "District Operations" | "Field Officer" | "Guard" | "Client";

export type PayBasis = "monthly" | "daily" | "site";
export type BenefitOverride = "inherit" | "enabled" | "disabled";
export type BenefitScheme = "salary-only" | "esi" | "pf-esi";

export type AppView =
  | "dashboard" | "workforce" | "sites" | "deployment" | "attendance"
  | "payroll" | "advances" | "uniforms" | "inspections" | "complaints"
  | "sops" | "reports" | "imports" | "settings"
  | "employee-form" | "site-config" | "assignment-form" | "attendance-correction"
  | "payroll-allocation" | "night-vigilance" | "uniform-issue" | "exit-clearance"
  | "penalties" | "inspection-form" | "complaint-form" | "sop-form" | "action-centre"
  | "guard-home" | "guard-punch" | "guard-schedule" | "guard-leave"
  | "guard-advance" | "guard-payslips" | "guard-sops" | "guard-profile" | "guard-vigilance"
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
  kind: "advance" | "uniform" | "penalty";
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
};

export type GeoState = "idle" | "locating" | "inside" | "outside" | "denied" | "unavailable";
