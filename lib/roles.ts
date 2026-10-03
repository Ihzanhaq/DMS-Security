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
const everything: AppView[] = Array.from(new Set([...operations, ...finance, ...hr]));

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
