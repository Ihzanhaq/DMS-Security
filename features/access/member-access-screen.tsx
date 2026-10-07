"use client";

import { useState } from "react";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAccess } from "@/components/shared/access-context";
import { useToast } from "@/components/shared/toast-context";
import { Button, EmptyState, Field, Input, inputClass } from "@/components/ui-kit";
import { followRole, initialsOf, isCustomised, normalizeKeys, type AccessUser, type PermissionKey } from "@/lib/access";
import type { NavClickMeta } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { BackLink, PageActionBar, RoleBadge, RoleSelect, roleKeys } from "./access-ui";
import { PermissionMatrix } from "./permission-matrix";

type Navigate = (view: string, meta?: string | NavClickMeta) => void;

export function MemberAccessScreen({ userId, onNavigate }: { userId: string | null; onNavigate: Navigate }) {
  const { users } = useAccess();
  const user = users.find(item => item.id === userId);
  const back = () => onNavigate("access");
  if (!user) {
    return <>
      <BackLink label="Back to Users & Roles" onClick={back} />
      <EmptyState icon={Users} title="Member not found" message="They may have been removed. Go back to the members list." />
    </>;
  }
  return <MemberAccess key={user.id} user={user} onBack={back} onNavigate={onNavigate} />;
}

function MemberAccess({ user, onBack, onNavigate }: { user: AccessUser; onBack: () => void; onNavigate: Navigate }) {
  const { roles, saveUser, can } = useAccess();
  const notify = useToast();
  const startRole = roles.find(role => role.id === user.roleId);
  const [draft, setDraft] = useState({
    name: user.name, email: user.email, phone: user.phone, employeeId: user.employeeId ?? "",
    roleId: user.roleId, custom: isCustomised(user, startRole), customLabel: user.customLabel ?? "",
  });
  const [keys, setKeys] = useState<PermissionKey[]>(() => isCustomised(user, startRole) ? normalizeKeys(user.permissions!) : roleKeys(startRole));

  const role = roles.find(item => item.id === draft.roleId);
  const ownerLocked = Boolean(startRole?.locked);
  const readOnly = ownerLocked || !can("access.edit");
  const officeRole = role?.kind === "internal" && !role.locked;
  const custom = draft.custom && officeRole;
  const shownKeys = custom ? keys : roleKeys(role);

  const chooseRole = (roleId: string) => {
    setDraft(current => ({ ...current, roleId, custom: false, customLabel: "" }));
    setKeys(roleKeys(roles.find(item => item.id === roleId)));
  };
  // Customising starts from whatever the person has now.
  const startCustom = () => { setKeys(shownKeys); setDraft(current => ({ ...current, custom: true })); };

  const save = () => {
    const name = draft.name.trim();
    if (!name) { notify({ message: "Enter the member’s name", kind: "error" }); return; }
    const next: AccessUser = {
      ...followRole(user), name, initials: initialsOf(name), email: draft.email.trim(), phone: draft.phone.trim(),
      employeeId: role?.kind === "guard" ? draft.employeeId.trim() || undefined : user.employeeId,
      roleId: draft.roleId,
      ...(custom ? { permissions: normalizeKeys(keys), customLabel: draft.customLabel.trim() || undefined } : {}),
    };
    const problem = saveUser(next);
    if (problem) { notify({ message: problem, kind: "error" }); return; }
    notify("Access updated");
    onBack();
  };

  return <>
    <BackLink label="Back to Users & Roles" onClick={onBack} />

    <div className="z-20 mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur md:sticky md:top-0 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-base font-semibold text-white">{user.name.charAt(0).toUpperCase() || "?"}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald" />
            <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
            <RoleBadge role={role} customised={custom} label={draft.customLabel} />
          </div>
          <div className="truncate text-xs text-muted">{user.email || user.phone || "Assign a role or fine-tune this member’s access"}</div>
        </div>
      </div>

      {!ownerLocked && (
        <div className="flex flex-wrap items-center gap-2">
          {custom ? (
            <div className="flex items-center gap-1">
              <input className={cn(inputClass, "h-9 w-44")} value={draft.customLabel} disabled={readOnly} placeholder="Name this access" aria-label="Custom access name" onChange={event => setDraft({ ...draft, customLabel: event.target.value })} />
              {!readOnly && <button type="button" className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground" onClick={() => chooseRole(draft.roleId)}>Cancel</button>}
            </div>
          ) : (
            <RoleSelect value={draft.roleId} roles={roles} onChange={chooseRole} onCustom={officeRole ? startCustom : undefined} disabled={readOnly} className="h-9 w-48" />
          )}
        </div>
      )}
    </div>

    {ownerLocked && (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        <span>{role?.name ?? "Owner"} access is locked to everything so the organisation can’t be locked out. It can’t be changed here.</span>
      </div>
    )}
    {!ownerLocked && officeRole && !custom && (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald/30 bg-emerald/5 px-4 py-2.5 text-xs text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-emerald" />
        <span>Access is managed by the <span className="font-semibold">{role?.name}</span> role. Changes to the role apply to everyone assigned to it.</span>
        <button type="button" onClick={() => onNavigate("role-editor", { roleId: role!.id })} className="font-semibold text-emerald underline-offset-2 hover:underline">Edit role →</button>
      </div>
    )}
    {custom && (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs text-foreground">
        <span>Customised for this person. They get these permissions but won’t follow future changes to the <span className="font-semibold">{role?.name}</span> role.</span>
        {!readOnly && <button type="button" onClick={() => chooseRole(draft.roleId)} className="font-semibold text-emerald hover:underline">Reset to role</button>}
      </div>
    )}

    {!ownerLocked && (
      <fieldset disabled={readOnly} className="mb-4 grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" required><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></Field>
        <Field label="Phone"><Input value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></Field>
        {role?.kind === "guard" && <Field label="Employee ID"><Input value={draft.employeeId} placeholder="BMG-0000" onChange={event => setDraft({ ...draft, employeeId: event.target.value })} /></Field>}
      </fieldset>
    )}

    {role?.kind === "internal"
      ? <PermissionMatrix value={shownKeys} onChange={setKeys} readOnly={readOnly || !custom} />
      : <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">{role?.name ?? "Portal"} members only see their own portal, so office permissions don’t apply.</p>}

    <PageActionBar>
      <span className="text-xs text-muted">{shownKeys.length} permission{shownKeys.length === 1 ? "" : "s"} enabled</span>
      <div className="flex gap-2">
        <Button variant="outline" data-allow onClick={onBack}>{readOnly ? "Back" : "Cancel"}</Button>
        {!readOnly && <Button onClick={save}>Save access</Button>}
      </div>
    </PageActionBar>
  </>;
}
