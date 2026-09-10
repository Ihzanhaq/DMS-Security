export type Role = "Owner" | "HR & Payroll" | "District Operations" | "Field Officer" | "Guard" | "Client";

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
  skills: Skill[];
  pf: boolean;
  esi: boolean;
  phone: string;
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
