"use client";

import { useState, type FC } from "react";
import {
  Copy, Mail, Pencil, Plus, RefreshCw, Shield, ShieldCheck, Trash2, UserCheck, UserPlus, Users, UserX, X,
} from "lucide-react";
import { useAccess } from "@/components/shared/access-context";
import { useToast } from "@/components/shared/toast-context";
import { Button, Field, Input, PageHeader, SearchBar, Sheet, useConfirm } from "@/components/ui-kit";
import {
  isCustomised, normalizeKeys, roleDeleteProblem,
  type AccessInvitation, type AccessRole, type AccessUser, type PermissionKey,
} from "@/lib/access";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import type { NavClickMeta } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import {
  RoleBadge, RoleSelect, SettingsActions, SettingsIconBtn, SettingsItem, SettingsItemContent, SettingsList, SettingsSection,
  memberBadge, roleKeys, roleTone, roleTree,
} from "./access-ui";
import { PermissionMatrix } from "./permission-matrix";

export type AccessTab = "members" | "invitations" | "roles";
export const isAccessTab = (value: string | null | undefined): value is AccessTab =>
  value === "members" || value === "invitations" || value === "roles";

const TABS: { key: AccessTab; label: string; icon: typeof Users }[] = [
  { key: "members", label: "Members", icon: Users },
  { key: "invitations", label: "Invitations", icon: Mail },
  { key: "roles", label: "Roles", icon: ShieldCheck },
];

type Navigate = (view: string, meta?: string | NavClickMeta) => void;

export const AccessScreen: FC<{ tab?: AccessTab; onNavigate: Navigate }> = ({ tab = "members", onNavigate }) => {
  const { roles, invitations, can } = useAccess();
  const [inviteOpen, setInviteOpen] = useState(false);
  const setTab = (key: AccessTab) => onNavigate("access", { tab: key });
  const editableRoles = roles.filter(role => role.kind === "internal" && !role.locked).length;
  const canInvite = can("access.create");

  return (
    <div className="space-y-5">
      <PageHeader title="Users & Roles" subtitle="Manage members, pending invitations and reusable permission roles" className="mb-0 sm:mb-0" />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/60 p-1" role="tablist" data-enter>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", tab === key ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground")}>
            <Icon className="h-4 w-4" /> {label}
            {key === "invitations" && invitations.length > 0 && <span className="rounded-full bg-gold/20 px-1.5 text-[11px] font-semibold text-gold">{invitations.length}</span>}
            {key === "roles" && editableRoles > 0 && <span className="rounded-full bg-emerald/15 px-1.5 text-[11px] font-semibold text-emerald">{editableRoles}</span>}
          </button>
        ))}
      </div>

      {tab === "members" && <MembersTab canInvite={canInvite} onInvite={() => setInviteOpen(true)} onNavigate={onNavigate} />}
      {tab === "invitations" && <InvitationsTab canInvite={canInvite} onInvite={() => setInviteOpen(true)} />}
      {tab === "roles" && <RolesTab onNavigate={onNavigate} />}

      {inviteOpen && <InviteSheet onClose={() => setInviteOpen(false)} onSent={() => { setInviteOpen(false); setTab("invitations"); }} />}
    </div>
  );
};

/* --------------------------------- Members -------------------------------- */

function MembersTab({ canInvite, onInvite, onNavigate }: { canInvite: boolean; onInvite: () => void; onNavigate: Navigate }) {
  const { users, roles, invitations, currentUser, saveUser, deleteUser, can } = useAccess();
  const notify = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const roleOf = (id: string) => roles.find(role => role.id === id);
  const active = users.filter(user => user.status === "active").length;
  const disabled = users.length - active;
  const q = query.trim().toLowerCase();
  const visible = q
    ? users.filter(user => `${user.name} ${user.email} ${user.phone} ${user.employeeId ?? ""} ${roleOf(user.roleId)?.name ?? ""} ${user.customLabel ?? ""}`.toLowerCase().includes(q))
    : users;

  const toggleStatus = (user: AccessUser) => {
    const next: AccessUser["status"] = user.status === "active" ? "disabled" : "active";
    if (next === "disabled" && user.id === currentUser.id) { notify({ message: "You cannot disable the user you are signed in as.", kind: "error" }); return; }
    const problem = saveUser({ ...user, status: next });
    if (problem) notify({ message: problem, kind: "error" });
    else notify(next === "active" ? `${user.name} can sign in again` : `${user.name} disabled`);
  };
  const remove = async (user: AccessUser) => {
    if (!await confirm({ title: "Remove user?", description: `${user.name} will lose access immediately. To keep their history and block sign-in instead, disable them.`, confirmLabel: "Remove", destructive: true })) return;
    const problem = deleteUser(user.id);
    if (problem) notify({ message: problem, kind: "error" });
    else notify("User removed");
  };

  return <>
    {users.length > 8 && <SearchBar value={query} onChange={setQuery} placeholder="Search by name, email, phone or role" className="mb-0" />}
    <SettingsSection
      title="Team members"
      description={`${active} active${disabled ? ` · ${disabled} disabled` : ""}${invitations.length ? ` · ${invitations.length} pending` : ""}`}
      action={canInvite && <Button size="sm" data-allow onClick={onInvite}><UserPlus />Invite</Button>}>
      <SettingsList empty={!visible.length ? (q ? `No members match “${query}”.` : "No team members yet.") : undefined}>
        {visible.map(user => {
          const role = roleOf(user.roleId);
          const isDisabled = user.status !== "active";
          return (
            <SettingsItem key={user.id} className={cn(isDisabled && "opacity-70")}>
              <SettingsItemContent
                leading={<span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", isDisabled ? "bg-muted" : "bg-navy")}>{user.name.charAt(0).toUpperCase() || "?"}</span>}
                title={<>{user.name}{isDisabled && <span className="ml-2 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Disabled</span>}</>}
                subtitle={[user.email, user.phone, user.employeeId].filter(Boolean).join(" · ") || "No contact details"}
              />
              <span className="hidden sm:inline-flex">{memberBadge(user, role)}</span>
              {!role?.locked && (
                <SettingsActions>
                  <SettingsIconBtn title="Edit access" onClick={() => onNavigate("member-access", { userId: user.id })}><Shield /></SettingsIconBtn>
                  {can("access.edit") && (
                    <SettingsIconBtn title={isDisabled ? "Enable user" : "Disable user"} onClick={() => toggleStatus(user)}>{isDisabled ? <UserCheck /> : <UserX />}</SettingsIconBtn>
                  )}
                  {can("access.delete") && <SettingsIconBtn title="Remove user" variant="danger" onClick={() => remove(user)}><Trash2 /></SettingsIconBtn>}
                </SettingsActions>
              )}
            </SettingsItem>
          );
        })}
      </SettingsList>
    </SettingsSection>
  </>;
}

/* ------------------------------- Invitations ------------------------------ */

function InvitationsTab({ canInvite, onInvite }: { canInvite: boolean; onInvite: () => void }) {
  const { invitations, roles, resendInvitation, revokeInvitation, acceptInvitation, can } = useAccess();
  const notify = useToast();
  const roleOf = (id: string) => roles.find(role => role.id === id);

  const markJoined = (invitation: AccessInvitation) => {
    const problem = acceptInvitation(invitation.id);
    if (problem) notify({ message: problem, kind: "error" });
    else notify(`${invitation.name} added as a member`);
  };

  return (
    <SettingsSection
      title="Pending invitations"
      description="People who have been invited but haven't joined yet. This prototype doesn't send email — use Mark as joined once they accept."
      action={canInvite && <Button size="sm" data-allow onClick={onInvite}><UserPlus />Invite</Button>}>
      <SettingsList empty={!invitations.length ? "No pending invitations." : undefined}>
        {invitations.map(invitation => {
          const role = roleOf(invitation.roleId);
          return (
            <SettingsItem key={invitation.id}>
              <SettingsItemContent
                leading={<Mail className="h-4 w-4 shrink-0 text-gold" />}
                title={invitation.name}
                subtitle={`${invitation.email} · Pending · sent ${formatAppDate(invitation.sentOn)}`}
              />
              <span className="hidden sm:inline-flex"><RoleBadge role={role} customised={Boolean(invitation.permissions) && isCustomised(invitation, role)} label={invitation.customLabel} /></span>
              <SettingsActions>
                {canInvite && (
                  <SettingsIconBtn title="Mark as joined" variant="success" onClick={() => markJoined(invitation)}>
                    <UserCheck /><span className="hidden sm:inline">Mark as joined</span>
                  </SettingsIconBtn>
                )}
                {canInvite && <SettingsIconBtn title="Resend invitation" onClick={() => { resendInvitation(invitation.id); notify("Invitation resent"); }}><RefreshCw /></SettingsIconBtn>}
                {can("access.delete") && <SettingsIconBtn title="Revoke invitation" variant="danger" onClick={() => { revokeInvitation(invitation.id); notify("Invitation revoked"); }}><X /></SettingsIconBtn>}
              </SettingsActions>
            </SettingsItem>
          );
        })}
      </SettingsList>
    </SettingsSection>
  );
}

/* ---------------------------------- Roles --------------------------------- */

function RolesTab({ onNavigate }: { onNavigate: Navigate }) {
  const { roles, users, invitations, deleteRole, can } = useAccess();
  const notify = useToast();
  const confirm = useConfirm();
  const tree = roleTree(roles).filter(item => !item.role.locked);
  const builtIn = roles.filter(role => role.locked || role.kind !== "internal");
  const memberCount = (role: AccessRole) => users.filter(user => user.roleId === role.id).length;
  const parentName = (role: AccessRole) => roles.find(item => item.id === role.reportsTo)?.name;

  const remove = async (role: AccessRole) => {
    const problem = roleDeleteProblem(role, roles, users, invitations);
    if (problem) { notify({ message: problem, kind: "error" }); return; }
    if (!await confirm({ title: `Delete “${role.name}”?`, description: "This role will be removed.", confirmLabel: "Delete", destructive: true })) return;
    const result = deleteRole(role.id);
    if (result) notify({ message: result, kind: "error" });
    else notify("Role deleted");
  };

  return (
    <div className="space-y-5">
      <SettingsSection
        title="Roles"
        description="Reusable permission templates, indented by reporting line. Editing a role updates every member who follows it."
        action={can("access.create") && <Button size="sm" data-allow onClick={() => onNavigate("role-editor", { roleId: "new" })}><Plus />New role</Button>}>
        <SettingsList empty={!tree.length ? "No roles yet. Create one to reuse across members." : undefined}>
          {tree.map(({ role, depth }) => {
            const count = memberCount(role);
            const parent = parentName(role);
            return (
              <SettingsItem key={role.id}>
                <SettingsItemContent
                  leading={<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald" style={{ marginLeft: Math.min(depth, 4) * 12 }}><ShieldCheck className="h-4 w-4" /></span>}
                  title={role.name}
                  subtitle={`${count} member${count === 1 ? "" : "s"} · ${normalizeKeys(role.permissions).length} permissions${parent ? ` · Reports to ${parent}` : ""}`}
                />
                {role.builtIn
                  ? <span className="hidden shrink-0 rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted sm:inline">Built-in</span>
                  : <span className={cn("hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline", roleTone(role))}>Custom</span>}
                <SettingsActions>
                  <SettingsIconBtn title={can("access.edit") ? "Edit role" : "View role"} onClick={() => onNavigate("role-editor", { roleId: role.id })}><Pencil /></SettingsIconBtn>
                  {can("access.create") && <SettingsIconBtn title="Duplicate role" onClick={() => onNavigate("role-editor", { roleId: `copy:${role.id}` })}><Copy /></SettingsIconBtn>}
                  {can("access.delete") && !role.builtIn && <SettingsIconBtn title="Delete role" variant="danger" onClick={() => remove(role)}><Trash2 /></SettingsIconBtn>}
                </SettingsActions>
              </SettingsItem>
            );
          })}
        </SettingsList>
      </SettingsSection>

      <SettingsSection title="Built-in roles" description="Always available and cannot be edited.">
        <SettingsList>
          {builtIn.map(role => {
            const count = memberCount(role);
            return (
              <SettingsItem key={role.id}>
                <SettingsItemContent
                  leading={<span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", roleTone(role))}><Shield className="h-4 w-4" /></span>}
                  title={role.name}
                  subtitle={`${role.locked ? "Full, unrestricted access to everything." : role.description} · ${count} member${count === 1 ? "" : "s"}`}
                />
                <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{role.kind === "internal" ? "Built-in" : "Portal"}</span>
              </SettingsItem>
            );
          })}
        </SettingsList>
      </SettingsSection>
    </div>
  );
}

/* --------------------------------- Invite --------------------------------- */

type InviteDraft = { name: string; email: string; roleId: string; custom: boolean; customLabel: string; keys: PermissionKey[] };

const sameKeys = (a: PermissionKey[], b: PermissionKey[]) => a.length === b.length && a.every(key => b.includes(key));

function InviteSheet({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { roles, sendInvitation } = useAccess();
  const notify = useToast();
  // Least-privileged office role is the safest default, like Scalar's "Staff".
  const defaultRole = roleTree(roles).map(item => item.role).filter(role => !role.locked)
    .sort((a, b) => normalizeKeys(a.permissions).length - normalizeKeys(b.permissions).length)[0] ?? roles.find(role => !role.locked) ?? roles[0];
  const [draft, setDraft] = useState<InviteDraft>({ name: "", email: "", roleId: defaultRole.id, custom: false, customLabel: "", keys: roleKeys(defaultRole) });

  const role = roles.find(item => item.id === draft.roleId);
  const officeRole = role?.kind === "internal" && !role.locked;
  const template = roleKeys(role);
  const customised = officeRole && (draft.custom || !sameKeys(draft.keys, template));
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());

  const chooseRole = (roleId: string) => {
    const next = roles.find(item => item.id === roleId);
    setDraft(current => ({ ...current, roleId, custom: false, customLabel: "", keys: roleKeys(next) }));
  };
  const startCustom = () => setDraft(current => officeRole ? { ...current, custom: true } : { ...current, roleId: defaultRole.id, custom: true, keys: [] });

  const submit = () => {
    if (!draft.name.trim() || !emailValid) return;
    const invitation: AccessInvitation = {
      id: `INV-${Date.now().toString().slice(-6)}`, name: draft.name.trim(), email: draft.email.trim(), roleId: draft.roleId, sentOn: APP_TODAY,
      // Edited template permissions become this person's own copy, no longer linked to the role.
      ...(customised ? { permissions: draft.keys, customLabel: draft.customLabel.trim() || undefined } : {}),
    };
    const problem = sendInvitation(invitation);
    if (problem) { notify({ message: problem, kind: "error" }); return; }
    notify("Invitation sent");
    onSent();
  };

  return (
    <Sheet open wide title="Invite user" subtitle="They’ll appear under Invitations until they join." onClose={onClose}
      footer={<>
        <Button variant="outline" data-allow onClick={onClose}>Cancel</Button>
        <Button data-allow onClick={submit} disabled={!draft.name.trim() || !emailValid}><Mail />Send</Button>
      </>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field>
        <Field label="Email" required><Input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></Field>
        <div className="sm:col-span-2">
          {draft.custom ? (
            <Field label="Role">
              <Input value={draft.customLabel} placeholder="e.g. Payroll reviewer (optional name)" onChange={event => setDraft({ ...draft, customLabel: event.target.value })} />
              <button type="button" className="mt-1 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline" onClick={() => chooseRole(draft.roleId)}>
                Use a saved role instead
              </button>
            </Field>
          ) : (
            <Field label="Role"><RoleSelect value={draft.roleId} roles={roles} onChange={chooseRole} onCustom={startCustom} /></Field>
          )}
        </div>
        {officeRole && !draft.custom && (customised ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground sm:col-span-2">
            <span>Customised for this person. They get these permissions but won’t follow future changes to the <span className="font-semibold">{role?.name}</span> role.</span>
            <button type="button" onClick={() => chooseRole(draft.roleId)} className="font-semibold text-emerald hover:underline">Reset to role</button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald/30 bg-emerald/5 px-3 py-2 text-xs text-foreground sm:col-span-2">
            Starts with the <span className="font-semibold">{role?.name}</span> role’s permissions and follows the role. Tick or untick below to customise for this person.
          </div>
        ))}
        {draft.custom && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground sm:col-span-2">
            One-off permissions for this person. They open the app like the <span className="font-semibold">{role?.name}</span> role but won’t follow changes to any role.
          </div>
        )}
        <div className="sm:col-span-2">
          {officeRole
            ? <PermissionMatrix value={draft.keys} onChange={keys => setDraft(current => ({ ...current, keys }))} defaultCollapsed />
            : <p className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-xs text-muted">{role?.name ?? "This"} members only see their own portal, so there are no office permissions to pick.</p>}
        </div>
      </div>
    </Sheet>
  );
}
