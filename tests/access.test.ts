import { describe, expect, it } from "vitest";
import {
  accessAdminProblem, allPermissionKeys, canEditView, canModule, canOpenView, effectivePermissions, followRole, isCustomised,
  keysFromLevels, landingView, migrateV1, normalizeKeys, permissionGroups, permissionModules, reportsToCreatesCycle,
  roleDeleteProblem, seedRoles, seedUsers,
  type AccessRole, type AccessUser,
} from "@/lib/access";

const role = (patch: Partial<AccessRole> = {}): AccessRole => ({
  id: "r", name: "R", description: "", kind: "internal", defaultView: "payroll", builtIn: false,
  permissions: ["payroll.view", "workforce.view", "workforce.edit"], ...patch,
});
const user = (patch: Partial<AccessUser> = {}): AccessUser => ({
  id: "u", name: "U", initials: "U", email: "", phone: "", roleId: "r", status: "active", ...patch,
});

describe("permission keys", () => {
  it("gives every module a view action first and only known actions", () => {
    for (const entry of permissionModules) expect(entry.actions[0]).toBe("view");
    expect(new Set(allPermissionKeys).size).toBe(allPermissionKeys.length);
  });
  it("builds one card per group whose columns cover its rows", () => {
    for (const group of permissionGroups) {
      for (const entry of group.modules) expect(entry.actions.every(action => group.columns.includes(action))).toBe(true);
    }
  });
  it("expands * and drops unknown keys", () => {
    expect(normalizeKeys(["*"])).toEqual(allPermissionKeys);
    expect(normalizeKeys(["payroll.view", "nope.view", "payroll.delete"])).toEqual(["payroll.view"]);
  });
  it("maps v1 levels: none → nothing, view → .view, edit → every action", () => {
    expect(keysFromLevels({ payroll: "none" })).toEqual([]);
    expect(keysFromLevels({ payroll: "view" })).toEqual(["payroll.view"]);
    expect(keysFromLevels({ payroll: "edit" })).toEqual(["payroll.view", "payroll.edit", "payroll.approve", "payroll.export"]);
  });
});

describe("effectivePermissions", () => {
  it("follows the role when the user isn't customised", () => {
    const result = effectivePermissions(role(), user());
    expect(result.has("payroll.view")).toBe(true);
    expect(result.has("workforce.edit")).toBe(true);
    expect(result.has("tickets.view")).toBe(false);
  });
  it("uses the user's own copy when customised", () => {
    const customised = user({ permissions: ["tickets.view"] });
    expect(isCustomised(customised, role())).toBe(true);
    const result = effectivePermissions(role(), customised);
    expect(result.has("tickets.view")).toBe(true);
    expect(result.has("payroll.view")).toBe(false);
  });
  it("gives locked roles full access regardless of custom keys", () => {
    const result = effectivePermissions(role({ locked: true }), user({ permissions: [] }));
    expect(result.size).toBe(allPermissionKeys.length);
  });
  it("gives portal roles no internal access", () => {
    expect(effectivePermissions(role({ kind: "guard" }), user({ permissions: ["payroll.view"] })).size).toBe(0);
  });
});

describe("view access", () => {
  const permissions = effectivePermissions(role(), user());
  it("opens every screen of a viewable module", () => {
    expect(canOpenView(permissions, "payroll")).toBe(true);
    expect(canOpenView(permissions, "payroll-allocation")).toBe(true);
    expect(canEditView(permissions, "payroll")).toBe(false);
  });
  it("treats any action beyond view as edit", () => {
    expect(canEditView(permissions, "workforce")).toBe(true);
    expect(canEditView(effectivePermissions(role({ permissions: ["payroll.view", "payroll.approve"] })), "payroll")).toBe(true);
    expect(canModule(permissions, "workforce", "edit")).toBe(true);
  });
  it("blocks screens without the view key", () => {
    expect(canOpenView(permissions, "tickets")).toBe(false);
    expect(canOpenView(effectivePermissions(role({ permissions: ["tickets.edit"] })), "tickets")).toBe(false);
  });
  it("puts the role editor and member access under Users and roles", () => {
    const access = effectivePermissions(role({ permissions: ["access.view"] }));
    expect(canOpenView(access, "role-editor")).toBe(true);
    expect(canOpenView(access, "member-access")).toBe(true);
    expect(canEditView(access, "member-access")).toBe(false);
  });
  it("falls back to the first allowed screen when the default is blocked", () => {
    const blocked = role({ defaultView: "tickets" });
    expect(landingView(blocked, effectivePermissions(blocked, user()))).toBe("workforce");
  });
});

describe("guards against breaking access", () => {
  it("refuses to delete roles that still have users, invitations or children", () => {
    const roles = [role(), role({ id: "child", reportsTo: "r" })];
    expect(roleDeleteProblem(roles[0], roles, [user()])).toMatch(/still assigned/);
    expect(roleDeleteProblem(roles[1], roles, [], [{ id: "i", name: "I", email: "i@x.in", roleId: "child", sentOn: "2026-09-22" }])).toMatch(/invitation/);
    expect(roleDeleteProblem(roles[0], roles, [])).toMatch(/reports? to this role/);
    expect(roleDeleteProblem(role({ builtIn: true }), [], [])).toMatch(/Built-in/);
    expect(roleDeleteProblem(roles[1], roles, [])).toBeNull();
  });
  it("requires one active user with edit on Users & roles", () => {
    expect(accessAdminProblem(seedRoles, seedUsers)).toBeNull();
    const noAdmins = seedUsers.map(item => {
      return item.roleId === "owner" ? { ...item, status: "disabled" as const } : followRole(item);
    });
    expect(accessAdminProblem(seedRoles, noAdmins)).toMatch(/At least one/);
  });
  it("detects reporting cycles", () => {
    const roles = [role({ id: "a" }), role({ id: "b", reportsTo: "a" }), role({ id: "c", reportsTo: "b" })];
    expect(reportsToCreatesCycle("a", "c", roles)).toBe(true);
    expect(reportsToCreatesCycle("c", "a", roles)).toBe(false);
    expect(reportsToCreatesCycle("a", "a", roles)).toBe(true);
  });
});

describe("v1 migration", () => {
  it("converts role levels and turns real overrides into customised users", () => {
    const migrated = migrateV1({
      roles: [{ ...role(), permissions: { payroll: "view", workforce: "edit" } }, { ...role({ id: "boss", locked: true }), permissions: {} }],
      users: [
        { ...user(), overrides: {} },
        { ...user({ id: "same" }), overrides: { payroll: "view" } },
        { ...user({ id: "more" }), overrides: { tickets: "edit" } },
      ],
    });
    expect(migrated.roles[0].permissions).toEqual(["workforce.view", "workforce.create", "workforce.edit", "workforce.delete", "workforce.export", "payroll.view"].sort((a, b) => allPermissionKeys.indexOf(a) - allPermissionKeys.indexOf(b)));
    expect(migrated.roles[1].permissions).toEqual(["*"]);
    expect(migrated.users[0].permissions).toBeUndefined();
    expect(migrated.users[1].permissions).toBeUndefined();
    expect(migrated.users[2].permissions).toContain("tickets.delete");
    expect(migrated.users[2].permissions).toContain("payroll.view");
  });
});

describe("seed data", () => {
  it("assigns every seed user to an existing role", () => {
    expect(seedUsers.every(item => seedRoles.some(r => r.id === item.roleId))).toBe(true);
  });
  it("only defaults internal roles to screens they can open", () => {
    for (const item of seedRoles.filter(r => r.kind === "internal")) {
      expect(canOpenView(effectivePermissions(item), item.defaultView)).toBe(true);
    }
  });
});
