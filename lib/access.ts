import type { AppView } from "@/types/domain";

export type PortalKind = "internal" | "guard" | "client";

/** Matrix columns, in display order. */
export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export";
export const permissionActions: PermissionAction[] = ["view", "create", "edit", "delete", "approve", "export"];
export const actionLabel: Record<PermissionAction, string> = {
  view: "View", create: "Create", edit: "Edit", delete: "Delete", approve: "Approve", export: "Export",
};

/** `${module}.${action}`, e.g. `payroll.approve`. `"*"` grants everything (locked roles only). */
export type PermissionKey = string;
export const FULL_ACCESS: PermissionKey = "*";

export type PermissionModule = {
  key: string;
  label: string;
  group: string;
  /** Screens this permission unlocks. Empty for data-level permissions. */
  views: AppView[];
  /** Actions that apply to this module. `view` is always first. */
  actions: PermissionAction[];
  hint?: string;
};

export const permissionModules: PermissionModule[] = [
  { key: "dashboard", label: "Dashboard and action centre", group: "Workspace", views: ["dashboard", "action-centre"], actions: ["view"] },
  { key: "workforce", label: "Employees", group: "Workspace", views: ["workforce", "employee-form"], actions: ["view", "create", "edit", "delete", "export"] },
  { key: "sites", label: "Sites and posts", group: "Workspace", views: ["sites", "site-config", "site-detail", "site-attendance"], actions: ["view", "create", "edit", "delete"] },
  { key: "deployment", label: "Deployment", group: "Workspace", views: ["deployment", "assignment-form"], actions: ["view", "create", "edit", "delete"] },
  { key: "attendance", label: "Attendance and night checks", group: "Workspace", views: ["attendance", "attendance-correction", "night-vigilance"], actions: ["view", "edit", "approve", "export"] },
  { key: "duty-changes", label: "Duty changes", group: "Workspace", views: ["duty-changes"], actions: ["view", "create", "approve"] },
  { key: "payroll", label: "Payroll", group: "Finance", views: ["payroll", "payroll-allocation"], actions: ["view", "edit", "approve", "export"] },
  { key: "salary", label: "Salary figures and rates", group: "Finance", views: [], actions: ["view", "edit"], hint: "View shows pay rates; edit changes site and post salary rules and office exceptions." },
  { key: "advances", label: "Advances", group: "Finance", views: ["advances", "advance-form"], actions: ["view", "create", "approve"] },
  { key: "spare-payments", label: "Spare payments", group: "Finance", views: ["spare-payments"], actions: ["view", "create", "approve"] },
  { key: "penalties", label: "Penalties and deductions", group: "Finance", views: ["penalties"], actions: ["view", "create", "approve"] },
  { key: "inventory", label: "Inventory and stock", group: "Inventory", views: ["inventory", "uniforms", "uniform-issue", "inventory-stores", "recovery-plans", "stock-movement", "inventory-item"], actions: ["view", "create", "edit", "export"] },
  { key: "uniform-requests", label: "Uniform requests", group: "Inventory", views: ["uniform-requests"], actions: ["view", "approve"] },
  { key: "hr-quality", label: "HR quality", group: "People", views: ["hr-quality"], actions: ["view", "create", "edit"] },
  { key: "recruitment", label: "Recruitment", group: "People", views: ["recruitment"], actions: ["view", "create", "edit", "delete"] },
  { key: "exit-clearance", label: "Exit clearances", group: "People", views: ["exit-clearance"], actions: ["view", "create", "approve"] },
  { key: "inspections", label: "Field officer inspections and tasks", group: "Compliance", views: ["inspections", "inspection-form"], actions: ["view", "create", "edit"] },
  { key: "complaints", label: "Complaints", group: "Compliance", views: ["complaints", "complaint-form"], actions: ["view", "create", "edit", "delete"] },
  { key: "tickets", label: "Tickets", group: "Compliance", views: ["tickets"], actions: ["view", "create", "edit", "delete"] },
  { key: "sops", label: "Site SOPs", group: "Compliance", views: ["site-detail", "sop-form"], actions: ["view", "create", "edit", "delete"], hint: "Managed inside each site's details page." },
  { key: "reports", label: "Reports", group: "Compliance", views: ["reports"], actions: ["view", "export"] },
  { key: "analytics", label: "Analytics", group: "Compliance", views: ["analytics"], actions: ["view", "export"] },
  { key: "imports", label: "Import centre", group: "Manage", views: ["imports"], actions: ["view", "create"] },
  { key: "settings", label: "Settings", group: "Manage", views: ["settings"], actions: ["view", "edit"] },
  { key: "access", label: "Users and roles", group: "Manage", views: ["access", "role-editor", "member-access"], actions: ["view", "create", "edit", "delete"] },
];

export const permissionKey = (module: string, action: PermissionAction): PermissionKey => `${module}.${action}`;

/** Every grantable key, in matrix order. */
export const allPermissionKeys: PermissionKey[] = permissionModules.flatMap(module => module.actions.map(action => permissionKey(module.key, action)));
const knownKeys = new Set(allPermissionKeys);

/** Permission cards: one per module group, columns = union of the rows' actions. */
export type PermissionGroup = { label: string; modules: PermissionModule[]; columns: PermissionAction[]; keys: PermissionKey[] };
export const permissionGroups: PermissionGroup[] = Array.from(new Set(permissionModules.map(module => module.group))).map(label => {
  const modules = permissionModules.filter(module => module.group === label);
  const used = new Set(modules.flatMap(module => module.actions));
  return {
    label, modules,
    columns: permissionActions.filter(action => used.has(action)),
    keys: modules.flatMap(module => module.actions.map(action => permissionKey(module.key, action))),
  };
});

export type PermissionSet = ReadonlySet<PermissionKey>;

/** The old "uniforms" module was split into inventory and uniform requests. */
const legacyKeys: Record<PermissionKey, PermissionKey[]> = {
  "uniforms.view": ["inventory.view", "uniform-requests.view"],
  "uniforms.create": ["inventory.create"],
  "uniforms.edit": ["inventory.edit", "uniform-requests.approve"],
  "uniforms.export": ["inventory.export"],
};
const legacyModule: Record<string, string> = { inventory: "uniforms", "uniform-requests": "uniforms" };

/** Expands `"*"` and legacy keys, drops unknown keys and keeps matrix order. */
export function normalizeKeys(keys: readonly PermissionKey[]): PermissionKey[] {
  if (keys.includes(FULL_ACCESS)) return [...allPermissionKeys];
  const set = new Set(keys.flatMap(key => legacyKeys[key] ?? [key]));
  return allPermissionKeys.filter(key => set.has(key) && knownKeys.has(key));
}

export type AccessRole = {
  id: string;
  name: string;
  description: string;
  kind: PortalKind;
  defaultView: AppView;
  /** Parent role in the reporting hierarchy; undefined for the top. */
  reportsTo?: string;
  /** Granted keys. Portal roles keep this empty; locked roles hold `"*"`. */
  permissions: PermissionKey[];
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
  /** The role this person follows, or the role their custom access started from. */
  roleId: string;
  /**
   * Set when access is customised for this person: their own copy of the keys, which no longer
   * follows later changes to the role. Undefined means the user follows the role.
   */
  permissions?: PermissionKey[];
  /** Optional name for a customised set, shown on the role badge. */
  customLabel?: string;
  status: "active" | "disabled";
  /** Links guard users to their employee record. */
  employeeId?: string;
};

export type AccessInvitation = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  /** One-off permissions; undefined means the invitee will follow the role. */
  permissions?: PermissionKey[];
  customLabel?: string;
  sentOn: string;
};

/** A user only keeps custom keys while their role is an unlocked office role. */
export function isCustomised(user: Pick<AccessUser, "permissions">, role: AccessRole | undefined) {
  return Boolean(user.permissions && role && role.kind === "internal" && !role.locked);
}

/** Drops a user's custom keys so they follow their role again. */
export function followRole(user: AccessUser): AccessUser {
  const next = { ...user };
  delete next.permissions;
  delete next.customLabel;
  return next;
}

/** Role keys, or the user's own copy when customised. Locked roles always resolve to full access. */
export function effectivePermissions(role: AccessRole | undefined, user?: Pick<AccessUser, "permissions">): PermissionSet {
  if (!role || role.kind !== "internal") return new Set();
  if (role.locked) return new Set(allPermissionKeys);
  return new Set(normalizeKeys(user && isCustomised(user, role) ? user.permissions! : role.permissions));
}

export function moduleForView(view: AppView) {
  return permissionModules.find(entry => entry.views.includes(view));
}

export function hasPermission(permissions: PermissionSet, key: PermissionKey) {
  return permissions.has(key);
}

/** Module-level check kept for older call sites: `view` = can open, `edit` = any action beyond view. */
export function canModule(permissions: PermissionSet, moduleKey: string, level: "view" | "edit" = "view") {
  const found = permissionModules.find(entry => entry.key === moduleKey);
  if (!found) return false;
  if (level === "view") return permissions.has(permissionKey(found.key, "view"));
  return found.actions.some(action => action !== "view" && permissions.has(permissionKey(found.key, action)));
}

export function canOpenView(permissions: PermissionSet, view: AppView) {
  const entry = moduleForView(view);
  return entry ? canModule(permissions, entry.key, "view") : false;
}

export function canEditView(permissions: PermissionSet, view: AppView) {
  const entry = moduleForView(view);
  return entry ? canModule(permissions, entry.key, "edit") : false;
}

/** Opening screens in sidebar order, used when the configured default is no longer allowed. */
export function landingView(role: AccessRole | undefined, permissions: PermissionSet): AppView {
  if (!role) return "dashboard";
  if (role.kind === "guard") return "guard-home";
  if (role.kind === "client") return "client-home";
  if (canOpenView(permissions, role.defaultView)) return role.defaultView;
  const first = permissionModules.find(entry => entry.views.length && canModule(permissions, entry.key, "view"));
  return first?.views[0] ?? "dashboard";
}

export type AccessProblem = string | null;

/** Deleting a role must not orphan users, invitations, child roles or the built-in portals. */
export function roleDeleteProblem(role: AccessRole, roles: AccessRole[], users: AccessUser[], invitations: AccessInvitation[] = []): AccessProblem {
  if (role.builtIn) return "Built-in roles cannot be deleted. Rename or change their permissions instead.";
  const assigned = users.filter(user => user.roleId === role.id).length;
  if (assigned) return `${assigned} user${assigned === 1 ? " is" : "s are"} still assigned to this role. Move them first.`;
  const invited = invitations.filter(invitation => invitation.roleId === role.id).length;
  if (invited) return `${invited} pending invitation${invited === 1 ? " uses" : "s use"} this role. Revoke or change ${invited === 1 ? "it" : "them"} first.`;
  const children = roles.filter(item => item.reportsTo === role.id).length;
  if (children) return `${children} role${children === 1 ? " reports" : "s report"} to this role. Change their parent first.`;
  return null;
}

/** At least one active user must always be able to manage users and roles. */
export function accessAdminProblem(roles: AccessRole[], users: AccessUser[]): AccessProblem {
  const admins = users.filter(user => {
    if (user.status !== "active") return false;
    const role = roles.find(item => item.id === user.roleId);
    return effectivePermissions(role, user).has(permissionKey("access", "edit"));
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

/* ------------------------ v1 (none/view/edit) migration ------------------------ */

export type PermissionLevel = "none" | "view" | "edit";
export type PermissionLevelMap = Record<string, PermissionLevel>;

/** none → nothing, view → `.view`, edit → every action of the module. */
export function keysFromLevels(levels: Partial<PermissionLevelMap>): PermissionKey[] {
  return permissionModules.flatMap(module => {
    const level = levels[module.key] ?? levels[legacyModule[module.key]] ?? "none";
    if (level === "none") return [];
    if (level === "view") return [permissionKey(module.key, "view")];
    return module.actions.map(action => permissionKey(module.key, action));
  });
}

type V1Role = Omit<AccessRole, "permissions"> & { permissions: Partial<PermissionLevelMap> };
type V1User = Omit<AccessUser, "permissions" | "customLabel"> & { overrides?: Partial<PermissionLevelMap> };
export type V1Stored = { roles: V1Role[]; users: V1User[] };

/** Users with v1 overrides become customised with their former effective levels. */
export function migrateV1(stored: V1Stored): { roles: AccessRole[]; users: AccessUser[] } {
  const roles: AccessRole[] = stored.roles.map(role => ({
    ...role,
    permissions: role.locked ? [FULL_ACCESS] : role.kind === "internal" ? keysFromLevels(role.permissions ?? {}) : [],
  }));
  const users: AccessUser[] = stored.users.map(({ overrides, ...user }) => {
    const v1Role = stored.roles.find(role => role.id === user.roleId);
    const changed = v1Role && v1Role.kind === "internal" && !v1Role.locked
      && Object.entries(overrides ?? {}).some(([key, level]) => level !== undefined && level !== (v1Role.permissions[key] ?? "none"));
    return changed ? { ...user, permissions: keysFromLevels({ ...v1Role.permissions, ...overrides }) } : user;
  });
  return { roles, users };
}

/* ------------------------------- Seed data ------------------------------- */

const grant = (levels: Partial<PermissionLevelMap>): PermissionKey[] => keysFromLevels(levels);
const allEdit: PermissionLevelMap = Object.fromEntries(permissionModules.map(entry => [entry.key, "edit" as PermissionLevel]));

const operationsLevels: Partial<PermissionLevelMap> = {
  dashboard: "edit", workforce: "view", sites: "edit", deployment: "edit", attendance: "edit", "duty-changes": "edit",
  inspections: "edit", complaints: "edit", tickets: "edit", sops: "edit", reports: "view", analytics: "view",
};
const financeLevels: Partial<PermissionLevelMap> = {
  dashboard: "edit", payroll: "edit", salary: "edit", advances: "edit", "spare-payments": "edit", inventory: "edit", "uniform-requests": "edit",
  penalties: "edit", "exit-clearance": "edit", reports: "edit", analytics: "view", imports: "edit", tickets: "edit",
};
const hrLevels: Partial<PermissionLevelMap> = {
  dashboard: "edit", workforce: "edit", sites: "view", attendance: "edit", payroll: "edit", salary: "edit", advances: "edit",
  inventory: "edit", "uniform-requests": "edit", penalties: "edit", "exit-clearance": "edit", "hr-quality": "edit", recruitment: "edit", tickets: "edit",
  complaints: "edit", reports: "edit", analytics: "view", imports: "edit", settings: "edit",
};
const fieldOfficerLevels: Partial<PermissionLevelMap> = {
  dashboard: "view", sites: "view", deployment: "view", attendance: "view", "duty-changes": "edit", inspections: "edit", complaints: "edit", tickets: "view", sops: "view",
};

export const seedRoles: AccessRole[] = [
  { id: "owner", name: "Owner", description: "Full access to every entry and configuration.", kind: "internal", defaultView: "dashboard", permissions: [FULL_ACCESS], builtIn: true, locked: true },
  { id: "branch-manager", name: "Branch Manager", description: "Runs a branch; sees every entry.", kind: "internal", defaultView: "dashboard", reportsTo: "owner", permissions: grant({ ...allEdit, access: "view" }), builtIn: true },
  { id: "operations-incharge", name: "Operations In-charge", description: "Sites, deployment, attendance and field operations.", kind: "internal", defaultView: "deployment", reportsTo: "branch-manager", permissions: grant(operationsLevels), builtIn: true },
  { id: "finance", name: "Finance", description: "Payroll, advances, recoveries and payments.", kind: "internal", defaultView: "payroll", reportsTo: "branch-manager", permissions: grant(financeLevels), builtIn: true },
  { id: "finance-assistant", name: "Finance Assistant", description: "Prepares payroll; cannot release spare payments.", kind: "internal", defaultView: "payroll", reportsTo: "finance", permissions: grant({ ...financeLevels, payroll: "view", salary: "view", "spare-payments": "none" }), builtIn: true },
  { id: "hr", name: "HR", description: "Employees, onboarding, exits and HR quality.", kind: "internal", defaultView: "workforce", reportsTo: "branch-manager", permissions: grant(hrLevels), builtIn: true },
  { id: "hr-assistant", name: "HR Assistant", description: "Day-to-day HR operations without settings.", kind: "internal", defaultView: "workforce", reportsTo: "hr", permissions: grant({ ...hrLevels, settings: "none", salary: "view" }), builtIn: true },
  { id: "hr-executive", name: "HR Executive", description: "Satisfaction calls, ratings and recruitment.", kind: "internal", defaultView: "hr-quality", reportsTo: "hr", permissions: grant({ ...hrLevels, settings: "none", payroll: "none", salary: "none", advances: "view" }), builtIn: true },
  { id: "field-officer", name: "Field Officer", description: "Site visits, patrolling, guard changes and complaints.", kind: "internal", defaultView: "inspections", reportsTo: "operations-incharge", permissions: grant(fieldOfficerLevels), builtIn: true },
  { id: "guard", name: "Guard", description: "Mobile app: attendance, requests, payslips and SOPs.", kind: "guard", defaultView: "guard-home", permissions: [], builtIn: true },
  { id: "client", name: "Client", description: "Client portal: sites, coverage and complaints.", kind: "client", defaultView: "client-home", permissions: [], builtIn: true },
];

export const seedUsers: AccessUser[] = [
  { id: "U-001", name: "Arun Kumar", initials: "AK", email: "arun@bmgsecurity.in", phone: "98470 10001", roleId: "owner", status: "active" },
  { id: "U-002", name: "Vishnu Prasad", initials: "VP", email: "vishnu@bmgsecurity.in", phone: "98470 10002", roleId: "branch-manager", status: "active" },
  { id: "U-003", name: "Nithin Joseph", initials: "NJ", email: "nithin@bmgsecurity.in", phone: "94002 11870", roleId: "operations-incharge", status: "active" },
  { id: "U-004", name: "Divya Menon", initials: "DM", email: "divya@bmgsecurity.in", phone: "98470 10004", roleId: "finance", status: "active" },
  { id: "U-005", name: "Arjun R", initials: "AR", email: "arjun@bmgsecurity.in", phone: "98470 10005", roleId: "finance-assistant", status: "active" },
  { id: "U-006", name: "Meera Nair", initials: "MN", email: "meera@bmgsecurity.in", phone: "98470 10006", roleId: "hr", permissions: grant({ ...hrLevels, access: "edit" }), customLabel: "HR admin", status: "active" },
  { id: "U-007", name: "Anu Thomas", initials: "AT", email: "anu@bmgsecurity.in", phone: "98470 10007", roleId: "hr-assistant", status: "active" },
  { id: "U-008", name: "Rahul Dev", initials: "RD", email: "rahul@bmgsecurity.in", phone: "98470 10008", roleId: "hr-executive", status: "active" },
  { id: "U-009", name: "Ajmal Khan", initials: "AK", email: "ajmal@bmgsecurity.in", phone: "98470 10009", roleId: "field-officer", status: "active" },
  { id: "U-010", name: "Praveen S", initials: "PS", email: "praveen@bmgsecurity.in", phone: "98470 10010", roleId: "field-officer", permissions: grant({ ...fieldOfficerLevels, tickets: "edit", reports: "view" }), status: "active" },
  { id: "U-011", name: "Suresh Babu", initials: "SB", email: "", phone: "98470 12840", roleId: "guard", status: "active", employeeId: "BMG-1840" },
  { id: "U-012", name: "Vinod Raj", initials: "VR", email: "", phone: "94953 71204", roleId: "guard", status: "active", employeeId: "BMG-2118" },
  { id: "U-013", name: "Jomon Jose", initials: "JJ", email: "", phone: "96334 71589", roleId: "guard", status: "active", employeeId: "BMG-2087" },
  { id: "U-014", name: "Lulu Group", initials: "LG", email: "security@lulugroup.in", phone: "0484 272 7777", roleId: "client", status: "active" },
];

export const seedInvitations: AccessInvitation[] = [
  { id: "INV-001", name: "Sneha Pillai", email: "sneha@bmgsecurity.in", roleId: "hr-assistant", sentOn: "2026-09-20" },
];
