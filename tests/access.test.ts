import { describe, expect, it } from "vitest";
import {
  accessAdminProblem, canEditView, canOpenView, effectivePermissions, landingView, overrideCount,
  permissionModules, reportsToCreatesCycle, roleDeleteProblem, seedRoles, seedUsers,
  type AccessRole, type AccessUser,
} from "@/lib/access";

const role = (patch: Partial<AccessRole> = {}): AccessRole => ({
  id: "r", name: "R", description: "", kind: "internal", defaultView: "payroll", builtIn: false,
  permissions: { payroll: "view", workforce: "edit" }, ...patch,
});
const user = (patch: Partial<AccessUser> = {}): AccessUser => ({
  id: "u", name: "U", initials: "U", email: "", phone: "", roleId: "r", overrides: {}, status: "active", ...patch,
});

describe("effectivePermissions", () => {
  it("inherits role levels and defaults unknown modules to none", () => {
    const result = effectivePermissions(role(), user());
    expect(result.payroll).toBe("view");
    expect(result.workforce).toBe("edit");
    expect(result.tickets).toBe("none");
  });
  it("lets a user override grant more or less than the role", () => {
    const result = effectivePermissions(role(), user({ overrides: { payroll: "edit", workforce: "none" } }));
    expect(result.payroll).toBe("edit");
    expect(result.workforce).toBe("none");
  });
  it("gives locked roles full access regardless of overrides", () => {
    const result = effectivePermissions(role({ locked: true }), user({ overrides: { payroll: "none" } }));
    expect(Object.values(result).every(level => level === "edit")).toBe(true);
    expect(Object.keys(result)).toHaveLength(permissionModules.length);
  });
  it("gives portal roles no internal access", () => {
    expect(effectivePermissions(role({ kind: "guard" }), user()).payroll).toBe("none");
  });
});

describe("view access", () => {
  const permissions = effectivePermissions(role(), user());
  it("opens every screen of a viewable module", () => {
    expect(canOpenView(permissions, "payroll")).toBe(true);
    expect(canOpenView(permissions, "payroll-allocation")).toBe(true);
    expect(canEditView(permissions, "payroll")).toBe(false);
  });
  it("blocks screens of modules set to none", () => {
    expect(canOpenView(permissions, "tickets")).toBe(false);
  });
  it("falls back to the first allowed screen when the default is blocked", () => {
    const blocked = role({ defaultView: "tickets" });
    expect(landingView(blocked, effectivePermissions(blocked, user()))).toBe("workforce");
  });
});

describe("guards against breaking access", () => {
  it("refuses to delete roles that still have users or children", () => {
    const roles = [role(), role({ id: "child", reportsTo: "r" })];
    expect(roleDeleteProblem(roles[0], roles, [user()])).toMatch(/still assigned/);
    expect(roleDeleteProblem(roles[0], roles, [])).toMatch(/reports? to this role/);
    expect(roleDeleteProblem(role({ builtIn: true }), [], [])).toMatch(/Built-in/);
    expect(roleDeleteProblem(roles[1], roles, [])).toBeNull();
  });
  it("requires one active user with edit on Users & roles", () => {
    expect(accessAdminProblem(seedRoles, seedUsers)).toBeNull();
    const noAdmins = seedUsers.map(item => item.roleId === "owner" ? { ...item, status: "disabled" as const } : { ...item, overrides: {} });
    expect(accessAdminProblem(seedRoles, noAdmins)).toMatch(/At least one/);
  });
  it("detects reporting cycles", () => {
    const roles = [role({ id: "a" }), role({ id: "b", reportsTo: "a" }), role({ id: "c", reportsTo: "b" })];
    expect(reportsToCreatesCycle("a", "c", roles)).toBe(true);
    expect(reportsToCreatesCycle("c", "a", roles)).toBe(false);
    expect(reportsToCreatesCycle("a", "a", roles)).toBe(true);
  });
  it("counts only overrides that differ from the role", () => {
    expect(overrideCount(user({ overrides: { payroll: "view", tickets: "edit" } }), role())).toBe(1);
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
