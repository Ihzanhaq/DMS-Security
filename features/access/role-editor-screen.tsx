"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAccess } from "@/components/shared/access-context";
import { useToast } from "@/components/shared/toast-context";
import { Button, EmptyState, Field, Input, Select } from "@/components/ui-kit";
import {
  normalizeKeys, permissionKey, permissionModules, reportsToCreatesCycle,
  type AccessRole, type PermissionKey,
} from "@/lib/access";
import type { NavClickMeta } from "@/lib/nav-config";
import type { AppView } from "@/types/domain";
import { BackLink, PageActionBar, roleKeys } from "./access-ui";
import { PermissionMatrix } from "./permission-matrix";

type Navigate = (view: string, meta?: string | NavClickMeta) => void;

const newRoleId = () => `role-${Date.now().toString(36)}`;

/** `roleId` is an existing role id, `"new"`, or `"copy:<id>"` to start from another role. */
export function RoleEditorScreen({ roleId, onNavigate }: { roleId: string | null; onNavigate: Navigate }) {
  const { roles, users } = useAccess();
  const back = () => onNavigate("access", { tab: "roles" });
  const copyOf = roleId?.startsWith("copy:") ? roles.find(role => role.id === roleId.slice(5)) : undefined;
  const isNew = !roleId || roleId === "new" || Boolean(copyOf);
  const existing = isNew ? undefined : roles.find(role => role.id === roleId);

  if (!isNew && !existing) {
    return <>
      <BackLink label="Back to Roles" onClick={back} />
      <EmptyState icon={ShieldCheck} title="Role not found" message="It may have been deleted. Go back to the roles list." />
    </>;
  }

  const initial: AccessRole = existing ?? {
    id: "",
    name: copyOf ? `${copyOf.name} (copy)` : "",
    description: copyOf?.description ?? "",
    kind: "internal",
    defaultView: copyOf?.kind === "internal" ? copyOf.defaultView : "dashboard",
    reportsTo: copyOf?.kind === "internal" ? (copyOf.locked ? copyOf.id : copyOf.reportsTo) : undefined,
    permissions: copyOf ? roleKeys(copyOf) : [permissionKey("dashboard", "view")],
    builtIn: false,
  };
  const memberCount = existing ? users.filter(user => user.roleId === existing.id).length : 0;
  return <RoleEditor key={roleId ?? "new"} initial={initial} isNew={isNew} memberCount={memberCount} onBack={back} />;
}

function RoleEditor({ initial, isNew, memberCount, onBack }: { initial: AccessRole; isNew: boolean; memberCount: number; onBack: () => void }) {
  const { roles, users, saveRole, can } = useAccess();
  const notify = useToast();
  const [draft, setDraft] = useState<AccessRole>(initial);
  const [keys, setKeys] = useState<PermissionKey[]>(() => roleKeys(initial));
  const locked = Boolean(initial.locked) || initial.kind !== "internal";
  const readOnly = locked || !can(isNew ? "access.create" : "access.edit");
  const following = users.filter(user => user.roleId === initial.id && !user.permissions).length;

  const parentOptions = roles.filter(item => item.kind === "internal" && item.id !== draft.id && !reportsToCreatesCycle(draft.id, item.id, roles));
  const granted = new Set(keys);
  const landingOptions = permissionModules.filter(module => module.views.length && granted.has(permissionKey(module.key, "view")));

  const save = () => {
    const name = draft.name.trim();
    if (!name) { notify({ message: "Enter a role name", kind: "error" }); return; }
    if (roles.some(item => item.id !== draft.id && item.name.toLowerCase() === name.toLowerCase())) { notify({ message: "Another role already uses this name", kind: "error" }); return; }
    const defaultAllowed = landingOptions.some(module => module.views.includes(draft.defaultView));
    const id = draft.id || newRoleId();
    const next: AccessRole = { ...draft, id, name, description: draft.description.trim(), permissions: normalizeKeys(keys), defaultView: defaultAllowed ? draft.defaultView : (landingOptions[0]?.views[0] ?? "dashboard") };
    const problem = saveRole(next);
    if (problem) { notify({ message: problem, kind: "error" }); return; }
    notify(isNew ? "Role created" : defaultAllowed ? "Role updated" : "Role updated · opening screen moved to a module this role can open");
    onBack();
  };

  return <>
    <BackLink label="Back to Roles" onClick={onBack} />

    <div className="z-20 mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur md:sticky md:top-0 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald/10 text-emerald"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{isNew ? "New role" : locked ? initial.name : readOnly ? "View role" : "Edit role"}</div>
          <div className="truncate text-xs text-muted">
            {isNew ? "A reusable permission template you can assign to members"
              : locked ? "Built-in role. It can’t be edited."
              : `Applied to ${memberCount} member${memberCount === 1 ? "" : "s"}${following !== memberCount ? ` (${following} follow it)` : ""} — saving updates everyone who follows it`}
          </div>
        </div>
      </div>
      <div className="w-full sm:w-72">
        <Field label="Role name" required>
          <Input value={draft.name} disabled={readOnly} placeholder="e.g. Payroll reviewer, Site supervisor" onChange={event => setDraft({ ...draft, name: event.target.value })} autoFocus={isNew} />
        </Field>
      </div>
    </div>

    {!locked && (
      <fieldset disabled={readOnly} className="mb-4 grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Description"><Input value={draft.description} placeholder="What this role is for" onChange={event => setDraft({ ...draft, description: event.target.value })} /></Field>
        <Field label="Reports to" hint="Sets the reporting line shown in the roles list.">
          <Select value={draft.reportsTo ?? ""} disabled={readOnly} onChange={event => setDraft({ ...draft, reportsTo: event.target.value || undefined })}>
            <option value="">Nobody (top of hierarchy)</option>
            {parentOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </Field>
        <Field label="Opens on" hint="Only screens this role can view are listed.">
          <Select value={landingOptions.some(module => module.views.includes(draft.defaultView)) ? draft.defaultView : ""} disabled={readOnly || !landingOptions.length} onChange={event => setDraft({ ...draft, defaultView: event.target.value as AppView })}>
            {!landingOptions.some(module => module.views.includes(draft.defaultView)) && <option value="" disabled>{landingOptions.length ? "Choose a screen" : "Grant a View permission first"}</option>}
            {landingOptions.map(module => <option key={module.key} value={module.views[0]}>{module.label}</option>)}
          </Select>
        </Field>
      </fieldset>
    )}

    {initial.kind === "internal"
      ? <PermissionMatrix value={keys} onChange={setKeys} readOnly={readOnly} />
      : <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">{initial.name} members open their own portal only, so there’s no permission matrix.</p>}

    <PageActionBar>
      <span className="text-xs text-muted">{keys.length} permission{keys.length === 1 ? "" : "s"} in this role</span>
      <div className="flex gap-2">
        <Button variant="outline" data-allow onClick={onBack}>{readOnly ? "Back" : "Cancel"}</Button>
        {!readOnly && <Button onClick={save}>{isNew ? "Create role" : "Save role"}</Button>}
      </div>
    </PageActionBar>
  </>;
}
