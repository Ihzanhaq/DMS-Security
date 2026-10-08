/** Shared copy for nav, headings, and roles — keep terminology consistent app-wide. */

export const APP_NAME = "BMG Security";

export const NAV = {
  dashboard: "Dashboard",
  actionCentre: "Action centre",
  workforce: "Employees",
  recruitment: "Recruitment",
  hrQuality: "HR quality",
  exitClearance: "Exit clearances",
  sites: "Sites and posts",
  deployment: "Deployment",
  attendance: "Attendance",
  nightChecks: "Night checks",
  dutyChanges: "Duty changes",
  payroll: "Payroll runs",
  advances: "Advances",
  sparePayments: "Spare payments",
  penalties: "Penalties and deductions",
  uniforms: "Uniforms",
  inventory: "Inventory",
  uniformRequests: "Uniform requests",
  inspections: "Field officer inspections",
  complaints: "Complaints",
  tickets: "Tickets",
  sops: "Site SOPs",
  reports: "Reports",
  analytics: "Analytics",
  imports: "Import centre",
  access: "Users and roles",
  settings: "Settings",
} as const;

export const ROLE_TERMS = {
  guard: "Guard",
  securityOfficer: "Security officer",
  seniorGuard: "Senior guard",
  fieldOfficer: "Field officer (FO)",
  fieldOfficerShort: "FO",
} as const;

export const ACTIONS = {
  create: "Create",
  save: "Save",
  cancel: "Cancel",
  confirm: "Confirm",
  delete: "Delete",
  open: "Open",
  export: "Export",
  import: "Import",
  signOut: "Sign out",
  viewAs: "View as",
} as const;

/** Restores statutory acronyms after sentence-style lowercasing (e.g. settings save buttons). */
export function preserveStatutoryAcronyms(text: string): string {
  return text
    .replace(/\bpf\b/gi, "PF")
    .replace(/\besi\b/gi, "ESI")
    .replace(/\buan\b/gi, "UAN")
    .replace(/\bhr\b/gi, "HR");
}

export function settingsSaveButtonLabel(group: string): string {
  return `Save ${preserveStatutoryAcronyms(group.toLowerCase())} settings`;
}
