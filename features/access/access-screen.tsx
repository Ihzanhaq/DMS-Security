"use client";

import { useMemo, useState, type FC } from "react";
import { Copy, Eye, Lock, Plus, RotateCcw, Save, ShieldCheck, Trash2, UserCog, Users, X } from "lucide-react";
import { useAccess } from "@/components/shared/access-context";
import {
  Button, DataTable, DetailDrawer, EmptyState, Field, FormGrid, InlineAlert, Input, ListFilterRow, PageHeader, Panel,
  PersonCell, SearchBar, Section, SegmentedControl, Select, StatStrip, StatusChip, useConfirm,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import {
  effectivePermissions, initialsOf, noAccess, overrideCount, permissionModules, reportsToCreatesCycle,
  type AccessRole, type AccessUser, type PermissionLevel, type PermissionMap, type PortalKind,
} from "@/lib/access";
import { ACTIONS, NAV } from "@/lib/labels";
import type { NavClickMeta } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import type { AppView } from "@/types/domain";

const levels: PermissionLevel[] = ["none", "view", "edit"];
const levelLabel: Record<PermissionLevel, string> = { none: "No access", view: "View", edit: "Edit" };
const levelChipClass: Record<PermissionLevel, string> = {
  none: "bg-muted/15 text-muted",
  view: "bg-navy/10 text-navy dark:text-foreground",
  edit: "bg-emerald/10 text-emerald",
};
const groups = Array.from(new Set(permissionModules.map(module => module.group)));
const kindLabel: Record<PortalKind, string> = { internal: "Office staff", guard: "Guard app", client: "Client portal" };

function LevelPicker({ value, onChange, disabled, label }: { value: PermissionLevel; onChange: (level: PermissionLevel) => void; disabled?: boolean; label: string }) {
  return (
    <span className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="radiogroup" aria-label={label}>
      {levels.map(level => (
        <button key={level} type="button" role="radio" aria-checked={value === level} disabled={disabled} onClick={() => onChange(level)}
          className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed", value === level ? cn("shadow-sm", level === "none" ? "bg-card text-foreground" : level === "view" ? "bg-navy text-white" : "bg-emerald text-white") : "text-muted hover:text-foreground")}>
          {levelLabel[level]}
        </button>
      ))}
    </span>
  );
}

function LevelChip({ level }: { level: PermissionLevel }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", levelChipClass[level])}>{levelLabel[level]}</span>;
}

export const AccessScreen: FC<{ onNavigate?: (view: string, meta?: string | NavClickMeta) => void }> = () => {
  const { can } = useAccess();
  const [tab, setTab] = useState<"Users" | "Roles">("Users");
  const readOnly = !can("access", "edit");
  return <>
    <PageHeader title={NAV.access} subtitle="Roles set the baseline permissions. Individual users can be fine-tuned with overrides." />
    {readOnly && <InlineAlert tone="warning" className="mb-4">You can view access settings but not change them. Ask an administrator for edit access to Users and roles.</InlineAlert>}
    <SegmentedControl options={["Users", "Roles"] as const} value={tab} onChange={setTab} />
    {tab === "Users" ? <UsersTab readOnly={readOnly} onShowRoles={() => setTab("Roles")} /> : <RolesTab readOnly={readOnly} />}
  </>;
};

/* ---------------------------------- Users --------------------------------- */

function UsersTab({ readOnly, onShowRoles }: { readOnly: boolean; onShowRoles: () => void }) {
  const { users, roles, currentUser, signInAs } = useAccess();
  const notify = useToast();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [overridesOnly, setOverridesOnly] = useState(false);
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const roleOf = (id: string) => roles.find(role => role.id === id);
  const hasOverrides = (user: AccessUser) => overrideCount(user, roleOf(user.roleId)) > 0;
  const toggleStatus = (status: AccessUser["status"]) => setStatusFilter(current => current === status ? "all" : status);

  const visible = users.filter(user =>
    (roleFilter === "all" || user.roleId === roleFilter)
    && (statusFilter === "all" || user.status === statusFilter)
    && (!overridesOnly || hasOverrides(user))
    && `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(query.toLowerCase()));

  const blankUser = (): AccessUser => ({ id: `U-${Date.now().toString().slice(-6)}`, name: "", initials: "", email: "", phone: "", roleId: "field-officer", overrides: {}, status: "active" });

  return <>
    <StatStrip items={[
      { icon: Users, value: String(users.filter(user => user.status === "active").length), label: "Active users", note: `${users.length} in total`, onClick: () => toggleStatus("active"), actionLabel: "Show active users", active: statusFilter === "active" },
      { icon: ShieldCheck, value: String(roles.length), label: "Roles", note: `${roles.filter(role => !role.builtIn).length} custom`, onClick: onShowRoles, actionLabel: "Open the Roles tab" },
      { icon: UserCog, value: String(users.filter(hasOverrides).length), label: "With overrides", note: "Fine-tuned beyond their role", tone: "orange", onClick: () => setOverridesOnly(current => !current), actionLabel: "Show users with overrides", active: overridesOnly },
      { icon: Lock, value: String(users.filter(user => user.status === "disabled").length), label: "Disabled", note: "Cannot sign in", onClick: () => toggleStatus("disabled"), actionLabel: "Show disabled users", active: statusFilter === "disabled" },
    ]} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search by name, email or phone" />
    <ListFilterRow>
      <div className="flex flex-wrap gap-2">
        <Select className="h-9 w-auto" value={roleFilter} onChange={event => setRoleFilter(event.target.value)} aria-label="Role"><option value="all">All roles</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</Select>
        <Select className="h-9 w-auto" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Status"><option value="all">Any status</option><option value="active">Active</option><option value="disabled">Disabled</option></Select>
        {overridesOnly && <Button size="sm" variant="outline" data-allow onClick={() => setOverridesOnly(false)}><X />With overrides</Button>}
        <span className="self-center text-xs text-muted">{visible.length} users</span>
      </div>
      {!readOnly && <Button onClick={() => setEditing(blankUser())}><Plus />Add user</Button>}
    </ListFilterRow>
    <Panel flush>
      <DataTable rows={visible} rowKey={row => row.id} onRowClick={setEditing}
        empty={<div className="p-4"><EmptyState icon={Users} title="No users match" message="Change the search or filters." /></div>}
        columns={[
          { header: "User", cell: user => <PersonCell name={user.name} id={user.employeeId ?? user.id} phone={user.phone || undefined} /> },
          { header: "Email", cell: user => user.email || "—", hideOnMobile: true },
          { header: "Role", cell: user => <strong>{roleOf(user.roleId)?.name ?? "Missing role"}</strong> },
          { header: "Portal", cell: user => { const role = roleOf(user.roleId); return role ? kindLabel[role.kind] : "—"; }, hideOnMobile: true },
          { header: "Overrides", cell: user => { const count = overrideCount(user, roleOf(user.roleId)); return count ? <StatusChip tone="warning">{count} override{count === 1 ? "" : "s"}</StatusChip> : <span className="text-xs text-muted">Role only</span>; } },
          { header: "Status", cell: user => <StatusChip tone={user.status === "active" ? "success" : "neutral"}>{user.status === "active" ? "Active" : "Disabled"}</StatusChip> },
          { header: "Actions", align: "right", cell: user => (
            <span className="inline-flex gap-1" onClick={event => event.stopPropagation()}>
              <Button size="sm" variant="ghost" data-allow onClick={() => setEditing(user)}>{readOnly ? "View" : "Edit"}</Button>
              <Button size="sm" variant="ghost" data-allow disabled={user.status !== "active" || user.id === currentUser.id} title="See the app as this user"
                onClick={() => { signInAs(user.id); notify(`Viewing as ${user.name}`); }}><Eye />{ACTIONS.viewAs}</Button>
            </span>
          ) },
        ]} />
    </Panel>
    {editing && <UserEditor key={editing.id} user={editing} readOnly={readOnly} onClose={() => setEditing(null)} />}
  </>;
}

function UserEditor({ user, readOnly, onClose }: { user: AccessUser; readOnly: boolean; onClose: () => void }) {
  const { roles, users, saveUser, deleteUser } = useAccess();
  const notify = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<AccessUser>(user);
  const [problem, setProblem] = useState<string | null>(null);
  const isNew = !users.some(item => item.id === user.id);
  const role = roles.find(item => item.id === draft.roleId);
  const inherited = role?.permissions ?? noAccess();
  const effective = effectivePermissions(role, draft);
  const internal = role?.kind === "internal";

  const setOverride = (key: string, value: PermissionLevel | "inherit") => setDraft(current => {
    const overrides = { ...current.overrides };
    if (value === "inherit" || value === inherited[key]) delete overrides[key]; else overrides[key] = value;
    return { ...current, overrides };
  });

  const save = () => {
    if (!draft.name.trim()) { setProblem("Enter the user's full name."); return; }
    const result = saveUser({ ...draft, name: draft.name.trim(), initials: initialsOf(draft.name) });
    if (result) { setProblem(result); return; }
    notify(isNew ? "User added" : "User saved");
    onClose();
  };
  const remove = async () => {
    if (!await confirm({ title: `Delete ${draft.name}?`, description: "They lose access immediately. To keep their history and block sign-in instead, set the status to Disabled.", confirmLabel: "Delete user", destructive: true })) return;
    const result = deleteUser(draft.id);
    if (result) { setProblem(result); return; }
    notify("User deleted");
    onClose();
  };

  return <DetailDrawer wide title={isNew ? "Add user" : draft.name} subtitle={isNew ? "Choose a role, then fine-tune permissions if needed" : `${draft.id} · ${role?.name ?? "No role"}`} onClose={onClose}
    footer={readOnly ? <Button variant="outline" data-allow onClick={onClose}>Close</Button> : <>
      {!isNew && <Button variant="ghost" className="mr-auto text-status-danger hover:bg-status-danger/10" data-allow onClick={remove}><Trash2 />Delete user</Button>}
      <Button variant="outline" data-allow onClick={onClose}>Cancel</Button>
      <Button data-allow onClick={save}><Save />{isNew ? "Add user" : "Save changes"}</Button>
    </>}>
    {problem && <InlineAlert tone="danger" className="mb-4">{problem}</InlineAlert>}
    <Section title="Account">
      <fieldset disabled={readOnly}>
        <FormGrid>
          <Field label="Full name" required><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Name" /></Field>
          <Field label="Email"><Input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></Field>
          <Field label="Phone"><Input value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></Field>
          <Field label="Status" hint="Disabled users keep their history but can't sign in."><Select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as AccessUser["status"] })}><option value="active">Active</option><option value="disabled">Disabled</option></Select></Field>
          <Field label="Role" hint="Changing the role clears this user's overrides."><Select value={draft.roleId} onChange={event => setDraft({ ...draft, roleId: event.target.value, overrides: {} })}>{roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          {role?.kind === "guard" && <Field label="Employee ID"><Input value={draft.employeeId ?? ""} onChange={event => setDraft({ ...draft, employeeId: event.target.value || undefined })} placeholder="BMG-0000" /></Field>}
        </FormGrid>
      </fieldset>
    </Section>
    {internal ? <Section title="Permissions">
      {!readOnly && Object.keys(draft.overrides).length > 0 && <div className="mb-3 flex justify-end"><Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, overrides: {} })}><RotateCcw />Reset to role defaults</Button></div>}
      {role?.locked && <InlineAlert className="mb-3">{role.name} always has full access. Overrides don’t apply.</InlineAlert>}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[1fr_100px_130px_100px] gap-3 bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid">
          <span>Module</span><span>Role default</span><span>Override</span><span>Result</span>
        </div>
        {groups.map(group => <div key={group}>
          <p className="border-t border-border bg-surface/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
          {permissionModules.filter(module => module.group === group).map(module => {
            const override = draft.overrides[module.key];
            return (
              <div key={module.key} className={cn("grid items-center gap-2 border-t border-border px-3 py-2 sm:grid-cols-[1fr_100px_130px_100px] sm:gap-3", override && "bg-status-warn/5")}>
                <span className="text-sm">{module.label}{module.hint && <small className="block text-xs text-muted">{module.hint}</small>}</span>
                <LevelChip level={inherited[module.key] ?? "none"} />
                <Select className="h-8 text-xs" value={override ?? "inherit"} disabled={readOnly || role?.locked} onChange={event => setOverride(module.key, event.target.value as PermissionLevel | "inherit")} aria-label={`${module.label} override`}>
                  <option value="inherit">Use role default</option>{levels.map(level => <option key={level} value={level}>{levelLabel[level]}</option>)}
                </Select>
                <LevelChip level={effective[module.key]} />
              </div>
            );
          })}
        </div>)}
      </div>
    </Section> : <InlineAlert>{role ? kindLabel[role.kind] : "These"} users only see their own portal, so office permissions don’t apply.</InlineAlert>}
  </DetailDrawer>;
}

/* ---------------------------------- Roles --------------------------------- */

function roleTree(roles: AccessRole[]) {
  const ordered: { role: AccessRole; depth: number }[] = [];
  const visit = (parent: string | undefined, depth: number) => {
    roles.filter(role => role.reportsTo === parent && role.kind === "internal").forEach(role => {
      ordered.push({ role, depth });
      visit(role.id, depth + 1);
    });
  };
  visit(undefined, 0);
  const placed = new Set(ordered.map(item => item.role.id));
  roles.filter(role => !placed.has(role.id)).forEach(role => ordered.push({ role, depth: 0 }));
  return ordered;
}

function RolesTab({ readOnly }: { readOnly: boolean }) {
  const { roles, users } = useAccess();
  const [selectedId, setSelectedId] = useState(roles[0].id);
  const [draftNew, setDraftNew] = useState<AccessRole | null>(null);
  const tree = useMemo(() => roleTree(roles), [roles]);
  const selected = draftNew ?? roles.find(role => role.id === selectedId) ?? roles[0];

  const startNew = (base?: AccessRole) => setDraftNew({
    id: `role-${Date.now().toString().slice(-6)}`,
    name: base ? `${base.name} (copy)` : "New role",
    description: base?.description ?? "",
    kind: base?.kind === "internal" || !base ? "internal" : base.kind,
    defaultView: base?.defaultView ?? "dashboard",
    reportsTo: base?.reportsTo,
    permissions: base ? { ...(base.locked ? effectivePermissions(base) : base.permissions) } : { ...noAccess(), dashboard: "view" },
    builtIn: false,
  });

  return <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
    <Panel title="Roles" description="Indented by reporting line." flush action={!readOnly && <Button size="sm" variant="outline" onClick={() => startNew()}><Plus />New role</Button>}>
      <nav className="grid gap-0.5 p-2">
        {tree.map(({ role, depth }) => {
          const active = !draftNew && selected.id === role.id;
          return (
            <button key={role.id} type="button" onClick={() => { setDraftNew(null); setSelectedId(role.id); }} style={{ paddingLeft: 12 + depth * 16 }}
              className={cn("flex items-center justify-between gap-2 rounded-lg py-2 pr-3 text-left", active ? "bg-emerald/10" : "hover:bg-surface")}>
              <span className="min-w-0">
                <strong className={cn("flex items-center gap-1 text-sm", active && "text-emerald")}>{role.name}{role.locked && <Lock className="h-3 w-3" />}</strong>
                <small className="text-xs text-muted">{kindLabel[role.kind]} · {users.filter(user => user.roleId === role.id).length} users</small>
              </span>
              {!role.builtIn && <StatusChip tone="info">Custom</StatusChip>}
            </button>
          );
        })}
        {draftNew && <div className="flex items-center justify-between rounded-lg bg-emerald/10 px-3 py-2"><span><strong className="block text-sm text-emerald">{draftNew.name}</strong><small className="text-xs text-muted">Not saved yet</small></span><StatusChip tone="warning">New</StatusChip></div>}
      </nav>
    </Panel>
    <RoleEditor key={selected.id} role={selected} isNew={Boolean(draftNew)} readOnly={readOnly}
      onDuplicate={() => startNew(selected)}
      onSaved={id => { setDraftNew(null); setSelectedId(id); }}
      onDeleted={() => { setDraftNew(null); setSelectedId(roles[0].id); }}
      onCancelNew={() => setDraftNew(null)} />
  </div>;
}

function RoleEditor({ role, isNew, readOnly, onDuplicate, onSaved, onDeleted, onCancelNew }: {
  role: AccessRole; isNew: boolean; readOnly: boolean;
  onDuplicate: () => void; onSaved: (id: string) => void; onDeleted: () => void; onCancelNew: () => void;
}) {
  const { roles, users, saveRole, deleteRole } = useAccess();
  const notify = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<AccessRole>(role);
  const [problem, setProblem] = useState<string | null>(null);
  const locked = Boolean(role.locked);
  const internal = draft.kind === "internal";
  const permissions: PermissionMap = locked ? effectivePermissions(role) : draft.permissions;
  const dirty = JSON.stringify(draft) !== JSON.stringify(role) || isNew;
  const parentOptions = roles.filter(item => item.kind === "internal" && item.id !== draft.id && !reportsToCreatesCycle(draft.id, item.id, roles));
  const landingOptions = permissionModules.filter(module => module.views.length && permissions[module.key] !== "none");
  const assigned = users.filter(user => user.roleId === role.id);

  const setLevel = (key: string, level: PermissionLevel) => setDraft(current => ({ ...current, permissions: { ...current.permissions, [key]: level } }));
  const setGroup = (group: string, level: PermissionLevel) => setDraft(current => ({
    ...current,
    permissions: { ...current.permissions, ...Object.fromEntries(permissionModules.filter(module => module.group === group).map(module => [module.key, level])) },
  }));

  const save = () => {
    if (!draft.name.trim()) { setProblem("Enter a role name."); return; }
    if (roles.some(item => item.id !== draft.id && item.name.toLowerCase() === draft.name.trim().toLowerCase())) { setProblem("Another role already uses this name."); return; }
    const defaultAllowed = !internal || (permissions[permissionModules.find(module => module.views.includes(draft.defaultView))?.key ?? ""] ?? "none") !== "none";
    const next = { ...draft, name: draft.name.trim(), defaultView: defaultAllowed ? draft.defaultView : (landingOptions[0]?.views[0] ?? "dashboard") as AppView };
    const result = saveRole(next);
    if (result) { setProblem(result); return; }
    notify(defaultAllowed ? "Role saved" : "Role saved · start screen moved to a module this role can open");
    onSaved(next.id);
  };
  const remove = async () => {
    if (!await confirm({
      title: `Delete the ${role.name} role?`,
      description: assigned.length ? `${assigned.length} user${assigned.length === 1 ? " has" : "s have"} this role and must be moved to another role first.` : "This can't be undone.",
      confirmLabel: "Delete role",
      destructive: true,
    })) return;
    const result = deleteRole(role.id);
    if (result) { setProblem(result); return; }
    notify("Role deleted");
    onDeleted();
  };

  return <Panel title={isNew ? "New role" : draft.name}
    description={locked ? "Locked: full access to everything. Only the name and description can change." : role.builtIn ? "Built-in role. Permissions can be edited." : "Custom role."}
    action={!readOnly && <>
      {!isNew && <Button size="sm" variant="ghost" onClick={onDuplicate}><Copy />Duplicate</Button>}
      {!isNew && !role.builtIn && <Button size="sm" variant="ghost" className="text-status-danger hover:bg-status-danger/10" onClick={remove}><Trash2 />Delete</Button>}
      {isNew && <Button size="sm" variant="ghost" onClick={onCancelNew}>Cancel</Button>}
      <Button disabled={!dirty} onClick={save}><Save />{isNew ? "Create role" : "Save changes"}</Button>
    </>}>
    {problem && <InlineAlert tone="danger" className="mb-4">{problem}</InlineAlert>}
    <fieldset disabled={readOnly}>
      <FormGrid>
        <Field label="Role name" required><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field>
        <Field label="Portal" hint={isNew ? undefined : "Can't be changed after creation."}>
          <Select value={draft.kind} disabled={!isNew} onChange={event => setDraft({ ...draft, kind: event.target.value as PortalKind, defaultView: event.target.value === "guard" ? "guard-home" : event.target.value === "client" ? "client-home" : "dashboard" })}>
            {(Object.keys(kindLabel) as PortalKind[]).map(kind => <option key={kind} value={kind}>{kindLabel[kind]}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2"><Field label="Description"><Input value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></Field></div>
        {internal && <>
          <Field label="Reports to">
            <Select value={draft.reportsTo ?? ""} disabled={locked} onChange={event => setDraft({ ...draft, reportsTo: event.target.value || undefined })}>
              <option value="">Nobody (top of hierarchy)</option>{parentOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </Field>
          <Field label="Start screen" hint="Only modules this role can open are listed.">
            <Select value={draft.defaultView} onChange={event => setDraft({ ...draft, defaultView: event.target.value as AppView })}>
              {landingOptions.map(module => <option key={module.key} value={module.views[0]}>{module.label}</option>)}
            </Select>
          </Field>
        </>}
      </FormGrid>
    </fieldset>
    {!isNew && <p className="mt-4 text-xs text-muted">{assigned.length ? `Assigned to ${assigned.map(user => user.name).join(", ")}` : "No users have this role yet."}</p>}
    {internal ? <div className="mt-4 overflow-hidden rounded-xl border border-border">
      {groups.map(group => <div key={group}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2 first:border-t-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</span>
          {!readOnly && !locked && <span className="flex items-center gap-1 text-xs text-muted">Set all:{levels.map(level => <button key={level} type="button" className="rounded px-1.5 py-0.5 font-medium text-emerald hover:bg-emerald/10" onClick={() => setGroup(group, level)}>{levelLabel[level]}</button>)}</span>}
        </div>
        {permissionModules.filter(module => module.group === group).map(module => (
          <div key={module.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
            <span className="text-sm">{module.label}{module.hint && <small className="block text-xs text-muted">{module.hint}</small>}</span>
            <LevelPicker value={permissions[module.key] ?? "none"} onChange={level => setLevel(module.key, level)} disabled={readOnly || locked} label={`${module.label} access`} />
          </div>
        ))}
      </div>)}
    </div> : <InlineAlert className="mt-4">{kindLabel[draft.kind]} roles open their own portal only, so there’s no permission matrix.</InlineAlert>}
  </Panel>;
}
