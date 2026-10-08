"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  accessAdminProblem, canEditView, canModule, canOpenView, effectivePermissions, followRole, initialsOf, isCustomised, landingView,
  migrateV1, roleDeleteProblem, seedInvitations, seedRoles, seedUsers,
  type AccessInvitation, type AccessProblem, type AccessRole, type AccessUser, type PermissionKey, type PermissionSet, type V1Stored,
} from "@/lib/access";
import { APP_TODAY } from "@/lib/app-date";
import type { AppView } from "@/types/domain";

const STORAGE_KEY = "bmg-access-v2";
const LEGACY_STORAGE_KEY = "bmg-access-v1";

type AccessValue = {
  roles: AccessRole[];
  users: AccessUser[];
  invitations: AccessInvitation[];
  currentUser: AccessUser;
  currentRole: AccessRole;
  permissions: PermissionSet;
  /**
   * `can("payroll.approve")` checks one permission key. The older module form is still supported:
   * `can("salary")` = can view, `can("salary", "edit")` = any action beyond view.
   */
  can: (keyOrModule: PermissionKey, level?: "view" | "edit") => boolean;
  canOpen: (view: AppView) => boolean;
  canEdit: (view: AppView) => boolean;
  landing: AppView;
  signInAs: (userId: string) => void;
  /** Each mutation returns a problem message instead of applying an unsafe change. */
  saveRole: (role: AccessRole) => AccessProblem;
  deleteRole: (roleId: string) => AccessProblem;
  saveUser: (user: AccessUser) => AccessProblem;
  deleteUser: (userId: string) => AccessProblem;
  sendInvitation: (invitation: AccessInvitation) => AccessProblem;
  resendInvitation: (invitationId: string) => void;
  revokeInvitation: (invitationId: string) => void;
  /** No email backend: an administrator marks the invitee as joined, which creates an active member. */
  acceptInvitation: (invitationId: string) => AccessProblem;
  resetToDefaults: () => void;
};

const AccessContext = createContext<AccessValue | null>(null);

type Stored = { roles: AccessRole[]; users: AccessUser[]; invitations: AccessInvitation[] };

/** Signed-in user id; localStorage when "Remember me" is ticked, else this tab only. */
const SESSION_KEY = "bmg-session";

export function readSession() {
  return window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
}

export function writeSession(userId: string | null, remember = true) {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  if (userId) (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, userId);
}

function persist(state: Stored) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadStored(): Stored | null {
  const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Stored | null;
  if (stored?.roles?.length && stored.users?.length) return { ...stored, invitations: stored.invitations ?? [] };
  const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null") as V1Stored | null;
  if (legacy?.roles?.length && legacy.users?.length) {
    const migrated = { ...migrateV1(legacy), invitations: seedInvitations };
    persist(migrated);
    return migrated;
  }
  return null;
}

/** Custom keys only make sense for unlocked office roles. */
function tidyUser(user: AccessUser, roles: AccessRole[]): AccessUser {
  const role = roles.find(item => item.id === user.roleId);
  return user.permissions && !isCustomised(user, role) ? followRole(user) : user;
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<AccessRole[]>(seedRoles);
  const [users, setUsers] = useState<AccessUser[]>(seedUsers);
  const [invitations, setInvitations] = useState<AccessInvitation[]>(seedInvitations);
  const [currentUserId, setCurrentUserId] = useState(seedUsers[0].id);

  // Stored edits load after hydration so server and first client render match.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = loadStored();
        if (stored) { setRoles(stored.roles); setUsers(stored.users); setInvitations(stored.invitations); }
      } catch { /* corrupt storage falls back to seed data */ }
      const requested = new URLSearchParams(window.location.search).get("user") ?? readSession();
      if (requested) setCurrentUserId(requested);
    });
    return () => window.clearTimeout(timer);
  }, []);

  const currentUser = users.find(user => user.id === currentUserId && user.status === "active")
    ?? users.find(user => user.roleId === "owner" && user.status === "active")
    ?? users[0];
  const currentRole = roles.find(role => role.id === currentUser.roleId) ?? roles[0];
  const permissions = useMemo(() => effectivePermissions(currentRole, currentUser), [currentRole, currentUser]);

  const commit = useCallback((nextRoles: AccessRole[], nextUsers: AccessUser[], nextInvitations: AccessInvitation[]): AccessProblem => {
    const problem = accessAdminProblem(nextRoles, nextUsers);
    if (problem) return problem;
    setRoles(nextRoles);
    setUsers(nextUsers);
    setInvitations(nextInvitations);
    persist({ roles: nextRoles, users: nextUsers, invitations: nextInvitations });
    return null;
  }, []);

  const value = useMemo<AccessValue>(() => ({
    roles, users, invitations, currentUser, currentRole, permissions,
    can: (keyOrModule, level) => keyOrModule.includes(".") ? permissions.has(keyOrModule) : canModule(permissions, keyOrModule, level),
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
      const next = original?.locked ? { ...original, name: role.name, description: role.description }
        : { ...role, permissions: role.kind === "internal" ? role.permissions : [] };
      return commit(original ? roles.map(item => item.id === next.id ? next : item) : [...roles, next], users, invitations);
    },
    deleteRole: roleId => {
      const role = roles.find(item => item.id === roleId);
      if (!role) return null;
      const problem = roleDeleteProblem(role, roles, users, invitations);
      return problem ?? commit(roles.filter(item => item.id !== roleId), users, invitations);
    },
    saveUser: user => {
      const next = tidyUser(user, roles);
      const exists = users.some(item => item.id === next.id);
      return commit(roles, exists ? users.map(item => item.id === next.id ? next : item) : [...users, next], invitations);
    },
    deleteUser: userId => {
      if (userId === currentUser.id) return "You cannot remove the user you are signed in as.";
      return commit(roles, users.filter(item => item.id !== userId), invitations);
    },
    sendInvitation: invitation => {
      const email = invitation.email.trim().toLowerCase();
      if (users.some(user => user.email.toLowerCase() === email)) return "Someone with this email is already a member.";
      if (invitations.some(item => item.email.toLowerCase() === email)) return "This email already has a pending invitation.";
      return commit(roles, users, [...invitations, invitation]);
    },
    resendInvitation: invitationId => {
      // Only the sent date changes; there is no email backend in this prototype.
      commit(roles, users, invitations.map(item => item.id === invitationId ? { ...item, sentOn: APP_TODAY } : item));
    },
    revokeInvitation: invitationId => {
      commit(roles, users, invitations.filter(item => item.id !== invitationId));
    },
    acceptInvitation: invitationId => {
      const invitation = invitations.find(item => item.id === invitationId);
      if (!invitation) return null;
      const member = tidyUser({
        id: `U-${Date.now().toString().slice(-6)}`, name: invitation.name, initials: initialsOf(invitation.name),
        email: invitation.email, phone: "", roleId: invitation.roleId, status: "active",
        ...(invitation.permissions ? { permissions: invitation.permissions, customLabel: invitation.customLabel } : {}),
      }, roles);
      return commit(roles, [...users, member], invitations.filter(item => item.id !== invitationId));
    },
    resetToDefaults: () => {
      setRoles(seedRoles);
      setUsers(seedUsers);
      setInvitations(seedInvitations);
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    },
  }), [roles, users, invitations, currentUser, currentRole, permissions, commit]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess must be used inside AccessProvider");
  return value;
}
