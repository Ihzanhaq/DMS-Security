import type { AppView } from "@/types/domain";

export type PermissionLevel = "none" | "view" | "edit";
export type PortalKind = "internal" | "guard" | "client";

export type PermissionModule = {
  key: string;
  label: string;
  group: string;
  /** Screens this permission unlocks. Empty for data-level permissions. */
  views: AppView[];
  hint?: string;
};

export const permissionModules: PermissionModule[] = [
  { key: "dashboard", label: "Dashboard and action centre", group: "Workspace", views: ["dashboard", "action-centre"] },
  { key: "workforce", label: "Employees", group: "Workspace", views: ["workforce", "employee-form"] },
  { key: "sites", label: "Sites and posts", group: "Workspace", views: ["sites", "site-config"] },
  { key: "deployment", label: "Deployment", group: "Workspace", views: ["deployment", "assignment-form"] },
  { key: "attendance", label: "Attendance and night checks", group: "Workspace", views: ["attendance", "attendance-correction", "night-vigilance"] },
  { key: "duty-changes", label: "Duty changes", group: "Workspace", views: ["duty-changes"] },
  { key: "payroll", label: "Payroll", group: "Finance", views: ["payroll", "payroll-allocation"] },
  { key: "salary", label: "Salary figures and rates", group: "Finance", views: [], hint: "View shows pay rates; edit changes site and post salary rules and office exceptions." },
  { key: "advances", label: "Advances", group: "Finance", views: ["advances", "advance-form"] },
  { key: "spare-payments", label: "Spare payments", group: "Finance", views: ["spare-payments"] },
  { key: "uniforms", label: "Uniforms and stock", group: "Finance", views: ["uniforms", "uniform-issue"] },
  { key: "penalties", label: "Penalties and deductions", group: "Finance", views: ["penalties"] },
  { key: "hr-quality", label: "HR quality", group: "People", views: ["hr-quality"] },
  { key: "recruitment", label: "Recruitment", group: "People", views: ["recruitment"] },
  { key: "exit-clearance", label: "Exit clearances", group: "People", views: ["exit-clearance"] },
  { key: "inspections", label: "Field officer inspections and tasks", group: "Compliance", views: ["inspections", "inspection-form"] },
  { key: "complaints", label: "Complaints", group: "Compliance", views: ["complaints", "complaint-form"] },
  { key: "tickets", label: "Tickets", group: "Compliance", views: ["tickets"] },
  { key: "sops", label: "Site SOPs", group: "Compliance", views: ["sops", "sop-form"] },
  { key: "reports", label: "Reports", group: "Compliance", views: ["reports"] },
  { key: "analytics", label: "Analytics", group: "Compliance", views: ["analytics"] },
  { key: "imports", label: "Import centre", group: "Manage", views: ["imports"] },
  { key: "settings", label: "Settings", group: "Manage", views: ["settings"] },
  { key: "access", label: "Users and roles", group: "Manage", views: ["access"] },
];

export type PermissionMap = Record<string, PermissionLevel>;

export type AccessRole = {
  id: string;
  name: string;
  description: string;
  kind: PortalKind;
  defaultView: AppView;
  /** Parent role in the reporting hierarchy; undefined for the top. */
  reportsTo?: string;
  permissions: PermissionMap;
  builtIn: boolean;
  /** Locked roles keep full access so nobody can lock the organisation out. */
  locked?: boolean;
};

export type AccessUser = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  roleId: string;
  /** Per-user exceptions. A missing key inherits the role's level. */
  overrides: Partial<PermissionMap>;
  status: "active" | "disabled";
  /** Links guard users to their employee record. */
  employeeId?: string;
};

const rank: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2 };

export function atLeast(level: PermissionLevel, required: PermissionLevel) {
  return rank[level] >= rank[required];
}

export const fullAccess = (): PermissionMap =>
  Object.fromEntries(permissionModules.map(entry => [entry.key, "edit" as PermissionLevel]));

export const noAccess = (): PermissionMap =>
  Object.fromEntries(permissionModules.map(entry => [entry.key, "none" as PermissionLevel]));

/** Role level, overridden per user. Locked roles always resolve to full access. */
export function effectivePermissions(role: AccessRole | undefined, user?: AccessUser): PermissionMap {
  if (!role || role.kind !== "internal") return noAccess();
  if (role.locked) return fullAccess();
  const result: PermissionMap = {};
  for (const entry of permissionModules) {
    result[entry.key] = user?.overrides[entry.key] ?? role.permissions[entry.key] ?? "none";
  }
  return result;
}

export function moduleForView(view: AppView) {
  return permissionModules.find(entry => entry.views.includes(view));
}

export function canOpenView(permissions: PermissionMap, view: AppView) {
  const entry = moduleForView(view);
  return entry ? atLeast(permissions[entry.key] ?? "none", "view") : false;
}

export function canEditView(permissions: PermissionMap, view: AppView) {
  const entry = moduleForView(view);
  return entry ? atLeast(permissions[entry.key] ?? "none", "edit") : false;
}

/** Opening screens in sidebar order, used when the configured default is no longer allowed. */
export function landingView(role: AccessRole | undefined, permissions: PermissionMap): AppView {
  if (!role) return "dashboard";
  if (role.kind === "guard") return "guard-home";
  if (role.kind === "client") return "client-home";
  if (canOpenView(permissions, role.defaultView)) return role.defaultView;
  const first = permissionModules.find(entry => entry.views.length && atLeast(permissions[entry.key], "view"));
  return first?.views[0] ?? "dashboard";
}

export function overrideCount(user: AccessUser, role: AccessRole | undefined) {
  if (!role) return 0;
  return Object.entries(user.overrides).filter(([key, level]) => level !== undefined && level !== role.permissions[key]).length;
}

export type AccessProblem = string | null;

/** Deleting a role must not orphan users, child roles or the built-in portals. */
export function roleDeleteProblem(role: AccessRole, roles: AccessRole[], users: AccessUser[]): AccessProblem {
  if (role.builtIn) return "Built-in roles cannot be deleted. Rename or change their permissions instead.";
  const assigned = users.filter(user => user.roleId === role.id).length;
  if (assigned) return `${assigned} user${assigned === 1 ? " is" : "s are"} still assigned to this role. Move them first.`;
  const children = roles.filter(item => item.reportsTo === role.id).length;
  if (children) return `${children} role${children === 1 ? " reports" : "s report"} to this role. Change their parent first.`;
  return null;
}

/** At least one active user must always be able to manage users and roles. */
export function accessAdminProblem(roles: AccessRole[], users: AccessUser[]): AccessProblem {
  const admins = users.filter(user => {
    if (user.status !== "active") return false;
    const role = roles.find(item => item.id === user.roleId);
    return atLeast(effectivePermissions(role, user).access, "edit");
  });
  return admins.length ? null : "At least one active user must keep edit access to Users & roles.";
}

/** A role cannot report to itself or to any of its own descendants. */
export function reportsToCreatesCycle(roleId: string, parentId: string | undefined, roles: AccessRole[]) {
  let cursor = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === roleId || seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = roles.find(item => item.id === cursor)?.reportsTo;
  }
  return false;
}

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/* ------------------------------- Seed data ------------------------------- */

const grant = (levels: Record<string, PermissionLevel>): PermissionMap => ({ ...noAccess(), ...levels });

const operationsGrants = grant({
  dashboard: "edit", workforce: "view", sites: "edit", deployment: "edit", attendance: "edit", "duty-changes": "edit",
  inspections: "edit", complaints: "edit", tickets: "edit", sops: "edit", reports: "view", analytics: "view",
});
const financeGrants = grant({
  dashboard: "edit", payroll: "edit", salary: "edit", advances: "edit", "spare-payments": "edit", uniforms: "edit",
  penalties: "edit", "exit-clearance": "edit", reports: "edit", analytics: "view", imports: "edit", tickets: "edit",
});
const hrGrants = grant({
  dashboard: "edit", workforce: "edit", sites: "view", attendance: "edit", payroll: "edit", salary: "edit", advances: "edit",
  uniforms: "edit", penalties: "edit", "exit-clearance": "edit", "hr-quality": "edit", recruitment: "edit", tickets: "edit",
  complaints: "edit", reports: "edit", analytics: "view", imports: "edit", settings: "edit",
});

export const seedRoles: AccessRole[] = [
  { id: "owner", name: "Owner", description: "Full access to every entry and configuration.", kind: "internal", defaultView: "dashboard", permissions: fullAccess(), builtIn: true, locked: true },
  { id: "branch-manager", name: "Branch Manager", description: "Runs a branch; sees every entry.", kind: "internal", defaultView: "dashboard", reportsTo: "owner", permissions: { ...fullAccess(), access: "view" }, builtIn: true },
  { id: "operations-incharge", name: "Operations In-charge", description: "Sites, deployment, attendance and field operations.", kind: "internal", defaultView: "deployment", reportsTo: "branch-manager", permissions: operationsGrants, builtIn: true },
  { id: "finance", name: "Finance", description: "Payroll, advances, recoveries and payments.", kind: "internal", defaultView: "payroll", reportsTo: "branch-manager", permissions: financeGrants, builtIn: true },
  { id: "finance-assistant", name: "Finance Assistant", description: "Prepares payroll; cannot release spare payments.", kind: "internal", defaultView: "payroll", reportsTo: "finance", permissions: { ...financeGrants, payroll: "view", salary: "view", "spare-payments": "none" }, builtIn: true },
  { id: "hr", name: "HR", description: "Employees, onboarding, exits and HR quality.", kind: "internal", defaultView: "workforce", reportsTo: "branch-manager", permissions: hrGrants, builtIn: true },
  { id: "hr-assistant", name: "HR Assistant", description: "Day-to-day HR operations without settings.", kind: "internal", defaultView: "workforce", reportsTo: "hr", permissions: { ...hrGrants, settings: "none", salary: "view" }, builtIn: true },
  { id: "hr-executive", name: "HR Executive", description: "Satisfaction calls, ratings and recruitment.", kind: "internal", defaultView: "hr-quality", reportsTo: "hr", permissions: { ...hrGrants, settings: "none", payroll: "none", salary: "none", advances: "view" }, builtIn: true },
  { id: "field-officer", name: "Field Officer", description: "Site visits, patrolling, guard changes and complaints.", kind: "internal", defaultView: "inspections", reportsTo: "operations-incharge", permissions: grant({ dashboard: "view", sites: "view", deployment: "view", attendance: "view", "duty-changes": "edit", inspections: "edit", complaints: "edit", tickets: "view", sops: "view" }), builtIn: true },
  { id: "guard", name: "Guard", description: "Mobile app: attendance, requests, payslips and SOPs.", kind: "guard", defaultView: "guard-home", permissions: noAccess(), builtIn: true },
  { id: "client", name: "Client", description: "Client portal: sites, coverage and complaints.", kind: "client", defaultView: "client-home", permissions: noAccess(), builtIn: true },
];

export const seedUsers: AccessUser[] = [
  { id: "U-001", name: "Arun Kumar", initials: "AK", email: "arun@bmgsecurity.in", phone: "98470 10001", roleId: "owner", overrides: {}, status: "active" },
  { id: "U-002", name: "Vishnu Prasad", initials: "VP", email: "vishnu@bmgsecurity.in", phone: "98470 10002", roleId: "branch-manager", overrides: {}, status: "active" },
  { id: "U-003", name: "Nithin Joseph", initials: "NJ", email: "nithin@bmgsecurity.in", phone: "94002 11870", roleId: "operations-incharge", overrides: {}, status: "active" },
  { id: "U-004", name: "Divya Menon", initials: "DM", email: "divya@bmgsecurity.in", phone: "98470 10004", roleId: "finance", overrides: {}, status: "active" },
  { id: "U-005", name: "Arjun R", initials: "AR", email: "arjun@bmgsecurity.in", phone: "98470 10005", roleId: "finance-assistant", overrides: {}, status: "active" },
  { id: "U-006", name: "Meera Nair", initials: "MN", email: "meera@bmgsecurity.in", phone: "98470 10006", roleId: "hr", overrides: { access: "edit" }, status: "active" },
  { id: "U-007", name: "Anu Thomas", initials: "AT", email: "anu@bmgsecurity.in", phone: "98470 10007", roleId: "hr-assistant", overrides: {}, status: "active" },
  { id: "U-008", name: "Rahul Dev", initials: "RD", email: "rahul@bmgsecurity.in", phone: "98470 10008", roleId: "hr-executive", overrides: {}, status: "active" },
  { id: "U-009", name: "Ajmal Khan", initials: "AK", email: "ajmal@bmgsecurity.in", phone: "98470 10009", roleId: "field-officer", overrides: {}, status: "active" },
  { id: "U-010", name: "Praveen S", initials: "PS", email: "praveen@bmgsecurity.in", phone: "98470 10010", roleId: "field-officer", overrides: { tickets: "edit", reports: "view" }, status: "active" },
  { id: "U-011", name: "Suresh Babu", initials: "SB", email: "", phone: "98470 12840", roleId: "guard", overrides: {}, status: "active", employeeId: "BMG-1840" },
  { id: "U-012", name: "Vinod Raj", initials: "VR", email: "", phone: "94953 71204", roleId: "guard", overrides: {}, status: "active", employeeId: "BMG-2118" },
  { id: "U-013", name: "Jomon Jose", initials: "JJ", email: "", phone: "96334 71589", roleId: "guard", overrides: {}, status: "active", employeeId: "BMG-2087" },
  { id: "U-014", name: "Lulu Group", initials: "LG", email: "security@lulugroup.in", phone: "0484 272 7777", roleId: "client", overrides: {}, status: "active" },
];
