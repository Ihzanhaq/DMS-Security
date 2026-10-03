"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  accessAdminProblem, atLeast, canEditView, canOpenView, effectivePermissions, landingView,
  roleDeleteProblem, seedRoles, seedUsers,
  type AccessProblem, type AccessRole, type AccessUser, type PermissionLevel, type PermissionMap,
} from "@/lib/access";
import type { AppView } from "@/types/domain";

const STORAGE_KEY = "bmg-access-v1";

type AccessValue = {
  roles: AccessRole[];
  users: AccessUser[];
  currentUser: AccessUser;
  currentRole: AccessRole;
  permissions: PermissionMap;
  can: (module: string, level?: PermissionLevel) => boolean;
  canOpen: (view: AppView) => boolean;
  canEdit: (view: AppView) => boolean;
  landing: AppView;
  signInAs: (userId: string) => void;
  /** Each mutation returns a problem message instead of applying an unsafe change. */
  saveRole: (role: AccessRole) => AccessProblem;
  deleteRole: (roleId: string) => AccessProblem;
  saveUser: (user: AccessUser) => AccessProblem;
  deleteUser: (userId: string) => AccessProblem;
  resetToDefaults: () => void;
};

const AccessContext = createContext<AccessValue | null>(null);

type Stored = { roles: AccessRole[]; users: AccessUser[] };

function persist(state: Stored) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<AccessRole[]>(seedRoles);
  const [users, setUsers] = useState<AccessUser[]>(seedUsers);
  const [currentUserId, setCurrentUserId] = useState(seedUsers[0].id);

  // Stored edits load after hydration so server and first client render match.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Stored | null;
        if (stored?.roles?.length && stored.users?.length) { setRoles(stored.roles); setUsers(stored.users); }
      } catch { /* corrupt storage falls back to seed data */ }
      const requested = new URLSearchParams(window.location.search).get("user");
      if (requested) setCurrentUserId(requested);
    });
    return () => window.clearTimeout(timer);
  }, []);

  const currentUser = users.find(user => user.id === currentUserId && user.status === "active")
    ?? users.find(user => user.roleId === "owner" && user.status === "active")
    ?? users[0];
  const currentRole = roles.find(role => role.id === currentUser.roleId) ?? roles[0];
  const permissions = useMemo(() => effectivePermissions(currentRole, currentUser), [currentRole, currentUser]);

  const commit = useCallback((nextRoles: AccessRole[], nextUsers: AccessUser[]): AccessProblem => {
    const problem = accessAdminProblem(nextRoles, nextUsers);
    if (problem) return problem;
    setRoles(nextRoles);
    setUsers(nextUsers);
    persist({ roles: nextRoles, users: nextUsers });
    return null;
  }, []);

  const value = useMemo<AccessValue>(() => ({
    roles, users, currentUser, currentRole, permissions,
    can: (module, level = "view") => atLeast(permissions[module] ?? "none", level),
    canOpen: view => currentRole.kind === "guard" ? view.startsWith("guard-")
      : currentRole.kind === "client" ? view.startsWith("client-") || view === "complaint-form"
      : canOpenView(permissions, view),
    canEdit: view => currentRole.kind !== "internal" || canEditView(permissions, view),
    landing: landingView(currentRole, permissions),
    signInAs: userId => {
      setCurrentUserId(userId);
      const url = new URL(window.location.href);
      url.searchParams.set("user", userId);
      window.history.replaceState({}, "", url);
    },
    saveRole: role => {
      const original = roles.find(item => item.id === role.id);
      // Locked roles accept only cosmetic edits; their permissions stay full.
      const next = original?.locked ? { ...original, name: role.name, description: role.description } : role;
      return commit(original ? roles.map(item => item.id === next.id ? next : item) : [...roles, next], users);
    },
    deleteRole: roleId => {
      const role = roles.find(item => item.id === roleId);
      if (!role) return null;
      const problem = roleDeleteProblem(role, roles, users);
      return problem ?? commit(roles.filter(item => item.id !== roleId), users);
    },
    saveUser: user => {
      const exists = users.some(item => item.id === user.id);
      return commit(roles, exists ? users.map(item => item.id === user.id ? user : item) : [...users, user]);
    },
    deleteUser: userId => {
      if (userId === currentUser.id) return "You cannot delete the user you are signed in as.";
      return commit(roles, users.filter(item => item.id !== userId));
    },
    resetToDefaults: () => {
      setRoles(seedRoles);
      setUsers(seedUsers);
      window.localStorage.removeItem(STORAGE_KEY);
    },
  }), [roles, users, currentUser, currentRole, permissions, commit]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess must be used inside AccessProvider");
  return value;
}
