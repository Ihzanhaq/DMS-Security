"use client";

import { useMemo, useState } from "react";
import {
  ArrowCounterClockwise, Copy, FloppyDisk, LockSimple, Plus, ShieldCheck, SignIn, Trash, UserGear, UsersThree, WarningCircle,
} from "@phosphor-icons/react";
import { useAccess } from "@/components/shared/access-context";
import {
  DetailDrawer, PageHeader, Panel, PersonCell, StatStrip, Status, Toolbar,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";
import {
  effectivePermissions, initialsOf, noAccess, overrideCount, permissionModules, reportsToCreatesCycle,
  type AccessRole, type AccessUser, type PermissionLevel, type PermissionMap, type PortalKind,
} from "@/lib/access";
import type { AppView } from "@/types/domain";

const levels: PermissionLevel[] = ["none", "view", "edit"];
const levelLabel: Record<PermissionLevel, string> = { none: "No access", view: "View", edit: "Edit" };
const groups = Array.from(new Set(permissionModules.map(module => module.group)));
const kindLabel: Record<PortalKind, string> = { internal: "Office staff", guard: "Guard app", client: "Client portal" };

function LevelPicker({ value, onChange, disabled, label }: { value: PermissionLevel; onChange: (level: PermissionLevel) => void; disabled?: boolean; label: string }) {
  return <span className="level-picker" role="radiogroup" aria-label={label}>
    {levels.map(level => <button key={level} type="button" role="radio" aria-checked={value === level} disabled={disabled}
      className={value === level ? `active ${level}` : undefined} onClick={() => onChange(level)}>{levelLabel[level]}</button>)}
  </span>;
}

function LevelChip({ level }: { level: PermissionLevel }) {
  return <span className={`level-chip ${level}`}>{levelLabel[level]}</span>;
}

export function AccessScreen() {
  const { can } = useAccess();
  const [tab, setTab] = useState<"Users" | "Roles">("Users");
  const readOnly = !can("access", "edit");
  return <>
    <PageHeader title="Users & roles" description="Roles set the baseline permissions; each user can be fine-tuned with overrides." />
    {readOnly && <div className="inline-alert warning access-readonly"><LockSimple /><span>You can view access settings but not change them. Ask an administrator for edit access to Users &amp; roles.</span></div>}
    <div className="tabs-row">{(["Users", "Roles"] as const).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Users" ? <UsersTab readOnly={readOnly} /> : <RolesTab readOnly={readOnly} />}
  </>;
}

/* --------------------------------- Users --------------------------------- */

function UsersTab({ readOnly }: { readOnly: boolean }) {
  const { users, roles, currentUser, signInAs } = useAccess();
  const notify = useToast();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const roleOf = (id: string) => roles.find(role => role.id === id);

  const visible = users.filter(user =>
    (roleFilter === "all" || user.roleId === roleFilter) &&
    (statusFilter === "all" || user.status === statusFilter) &&
    `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(query.toLowerCase()));

  const blankUser = (): AccessUser => ({ id: `U-${Date.now().toString().slice(-6)}`, name: "", initials: "", email: "", phone: "", roleId: "field-officer", overrides: {}, status: "active" });

  return <>
    <StatStrip items={[
      { icon: UsersThree, value: String(users.filter(user => user.status === "active").length), label: "Active users", note: `${users.length} in total` },
      { icon: ShieldCheck, value: String(roles.length), label: "Roles", note: `${roles.filter(role => !role.builtIn).length} custom`, tone: "violet" },
      { icon: UserGear, value: String(users.filter(user => overrideCount(user, roleOf(user.roleId)) > 0).length), label: "With overrides", note: "Fine-tuned beyond their role", tone: "orange" },
      { icon: LockSimple, value: String(users.filter(user => user.status === "disabled").length), label: "Disabled", note: "Cannot sign in" },
    ]} />
    <Toolbar>
      <div className="filter-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email or phone" aria-label="Search users" /></div>
      <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} aria-label="Filter by role"><option value="all">All roles</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All status</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
      <span className="toolbar-count">{visible.length} users</span>
      {!readOnly && <button className="primary-button" onClick={() => setEditing(blankUser())}><Plus />Add user</button>}
    </Toolbar>
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Portal</th><th>Overrides</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {visible.map(user => {
        const role = roleOf(user.roleId);
        const count = overrideCount(user, role);
        return <tr key={user.id} tabIndex={0} onClick={() => setEditing(user)} onKeyDown={event => { if (event.key === "Enter") setEditing(user); }}>
          <td><PersonCell name={user.name} id={user.employeeId ?? user.id} phone={user.phone || undefined} /></td>
          <td>{user.email || "—"}</td>
          <td><strong>{role?.name ?? "Missing role"}</strong></td>
          <td>{role ? kindLabel[role.kind] : "—"}</td>
          <td>{count ? <Status tone="warning">{count} override{count === 1 ? "" : "s"}</Status> : <span className="muted-text">Role only</span>}</td>
          <td><Status tone={user.status === "active" ? "success" : "neutral"}>{user.status}</Status></td>
          <td><span className="decision-buttons" onClick={event => event.stopPropagation()}>
            <button className="secondary-button compact" data-allow onClick={() => setEditing(user)}>{readOnly ? "View" : "Edit"}</button>
            <button className="secondary-button compact" data-allow disabled={user.status !== "active" || user.id === currentUser.id} onClick={() => { signInAs(user.id); notify(`Signed in as ${user.name}`); }}><SignIn />Sign in as</button>
          </span></td>
        </tr>;
      })}
    </tbody></table>{visible.length === 0 && <div className="empty-state"><UsersThree size={26} /><strong>No users match</strong><span>Change the search or filters.</span></div>}</div></Panel>
    {editing && <UserEditor key={editing.id} user={editing} readOnly={readOnly} onClose={() => setEditing(null)} />}
  </>;
}

function UserEditor({ user, readOnly, onClose }: { user: AccessUser; readOnly: boolean; onClose: () => void }) {
  const { roles, users, saveUser, deleteUser } = useAccess();
  const notify = useToast();
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
    if (!draft.name.trim()) { setProblem("Name is required."); return; }
    const result = saveUser({ ...draft, name: draft.name.trim(), initials: initialsOf(draft.name) });
    if (result) { setProblem(result); return; }
    notify(`${draft.name.trim()} saved`);
    onClose();
  };
  const remove = () => {
    const result = deleteUser(draft.id);
    if (result) { setProblem(result); return; }
    notify(`${draft.name} deleted`);
    onClose();
  };

  return <DetailDrawer title={isNew ? "New user" : draft.name} subtitle={isNew ? "Choose a role, then fine-tune if needed" : `${draft.id} · ${role?.name ?? "No role"}`} avatar={initialsOf(draft.name || "?")} onClose={onClose} wide
    footer={readOnly ? <button className="secondary-button" data-allow onClick={onClose}>Close</button> : <>
      {!isNew && <button className="secondary-button danger-text" data-allow onClick={remove}><Trash />Delete</button>}
      <button className="secondary-button" data-allow onClick={onClose}>Cancel</button>
      <button className="primary-button" data-allow onClick={save}><FloppyDisk />Save user</button>
    </>}>
    {problem && <div className="drawer-section"><div className="inline-alert warning"><WarningCircle /><span>{problem}</span></div></div>}
    <div className="drawer-section">
      <h3>Account</h3>
      <fieldset className="form-grid access-form" disabled={readOnly}>
        <label><span>Full name</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Name" /></label>
        <label><span>Email</span><input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label>
        <label><span>Phone</span><input value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></label>
        <label><span>Status</span><select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as AccessUser["status"] })}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
        <label><span>Role</span><select value={draft.roleId} onChange={event => setDraft({ ...draft, roleId: event.target.value, overrides: {} })}>{roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>Changing role clears this user&apos;s overrides.</small></label>
        {role?.kind === "guard" && <label><span>Employee ID</span><input value={draft.employeeId ?? ""} onChange={event => setDraft({ ...draft, employeeId: event.target.value || undefined })} placeholder="BMG-0000" /></label>}
      </fieldset>
    </div>
    {internal ? <div className="drawer-section">
      <div className="access-section-head">
        <h3>Permissions</h3>
        {!readOnly && Object.keys(draft.overrides).length > 0 && <button className="text-button" onClick={() => setDraft({ ...draft, overrides: {} })}><ArrowCounterClockwise />Reset to role</button>}
      </div>
      {role?.locked && <div className="inline-alert"><LockSimple /><span>{role.name} always has full access. Overrides do not apply.</span></div>}
      <div className="permission-matrix user-matrix">
        <div className="matrix-head"><span>Module</span><span>From role</span><span>Override</span><span>Effective</span></div>
        {groups.map(group => <div key={group} className="matrix-group">
          <p className="matrix-group-label">{group}</p>
          {permissionModules.filter(module => module.group === group).map(module => {
            const override = draft.overrides[module.key];
            return <div className={override ? "matrix-row overridden" : "matrix-row"} key={module.key}>
              <span className="matrix-module">{module.label}{module.hint && <small>{module.hint}</small>}</span>
              <LevelChip level={inherited[module.key] ?? "none"} />
              <select value={override ?? "inherit"} disabled={readOnly || role?.locked} onChange={event => setOverride(module.key, event.target.value as PermissionLevel | "inherit")} aria-label={`${module.label} override`}>
                <option value="inherit">Inherit</option>{levels.map(level => <option key={level} value={level}>{levelLabel[level]}</option>)}
              </select>
              <LevelChip level={effective[module.key]} />
            </div>;
          })}
        </div>)}
      </div>
    </div> : <div className="drawer-section"><div className="inline-alert"><ShieldCheck /><span>{role ? kindLabel[role.kind] : "This"} users see only their own portal. Office permissions do not apply.</span></div></div>}
  </DetailDrawer>;
}

/* --------------------------------- Roles --------------------------------- */

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

  return <div className="access-roles-layout">
    <Panel title="Roles" description="Indented by reporting line." action={!readOnly && <button className="secondary-button compact" onClick={() => startNew()}><Plus />New role</button>}>
      <div className="role-list">{tree.map(({ role, depth }) => <button key={role.id} className={!draftNew && selected.id === role.id ? "active" : ""} style={{ paddingLeft: 18 + depth * 16 }} onClick={() => { setDraftNew(null); setSelectedId(role.id); }}>
        <span><strong>{role.name}{role.locked && <LockSimple size={11} />}</strong><small>{kindLabel[role.kind]} · {users.filter(user => user.roleId === role.id).length} users</small></span>
        {!role.builtIn && <Status tone="info">Custom</Status>}
      </button>)}
      {draftNew && <button className="active" style={{ paddingLeft: 18 }}><span><strong>{draftNew.name}</strong><small>Unsaved</small></span><Status tone="warning">New</Status></button>}
      </div>
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
    if (!draft.name.trim()) { setProblem("Role name is required."); return; }
    if (roles.some(item => item.id !== draft.id && item.name.toLowerCase() === draft.name.trim().toLowerCase())) { setProblem("Another role already uses this name."); return; }
    const defaultAllowed = !internal || (permissions[permissionModules.find(module => module.views.includes(draft.defaultView))?.key ?? ""] ?? "none") !== "none";
    const next = { ...draft, name: draft.name.trim(), defaultView: defaultAllowed ? draft.defaultView : (landingOptions[0]?.views[0] ?? "dashboard") as AppView };
    const result = saveRole(next);
    if (result) { setProblem(result); return; }
    notify(`${next.name} saved${defaultAllowed ? "" : " · default screen moved to an allowed module"}`);
    onSaved(next.id);
  };
  const remove = () => {
    const result = deleteRole(role.id);
    if (result) { setProblem(result); return; }
    notify(`${role.name} deleted`);
    onDeleted();
  };

  return <Panel title={isNew ? "New role" : draft.name} description={locked ? "Locked — full access to everything. Only the name and description can change." : role.builtIn ? "Built-in role — permissions are editable." : "Custom role."}
    action={!readOnly && <span className="decision-buttons">
      {!isNew && <button className="secondary-button compact" onClick={onDuplicate}><Copy />Duplicate</button>}
      {!isNew && !role.builtIn && <button className="secondary-button compact danger-text" onClick={remove}><Trash />Delete</button>}
      {isNew && <button className="secondary-button compact" onClick={onCancelNew}>Cancel</button>}
      <button className="primary-button" disabled={!dirty} onClick={save}><FloppyDisk />Save role</button>
    </span>}>
    {problem && <div className="inline-alert warning" style={{ margin: "0 20px 14px" }}><WarningCircle /><span>{problem}</span></div>}
    <fieldset className="form-grid padded-form access-form" disabled={readOnly}>
      <label><span>Role name</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label><span>Portal</span><select value={draft.kind} disabled={!isNew} onChange={event => setDraft({ ...draft, kind: event.target.value as PortalKind, defaultView: event.target.value === "guard" ? "guard-home" : event.target.value === "client" ? "client-home" : "dashboard" })}>
        {(Object.keys(kindLabel) as PortalKind[]).map(kind => <option key={kind} value={kind}>{kindLabel[kind]}</option>)}
      </select></label>
      <label className="span-2"><span>Description</span><input value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
      {internal && <>
        <label><span>Reports to</span><select value={draft.reportsTo ?? ""} disabled={locked} onChange={event => setDraft({ ...draft, reportsTo: event.target.value || undefined })}>
          <option value="">— Top of hierarchy —</option>{parentOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label><span>Opens on</span><select value={draft.defaultView} onChange={event => setDraft({ ...draft, defaultView: event.target.value as AppView })}>
          {landingOptions.map(module => <option key={module.key} value={module.views[0]}>{module.label}</option>)}
        </select><small>Only modules this role can open are listed.</small></label>
      </>}
    </fieldset>
    {!isNew && <p className="role-assigned">{assigned.length ? `Assigned to ${assigned.map(user => user.name).join(", ")}` : "No users have this role yet."}</p>}
    {internal ? <div className="permission-matrix role-matrix-editor">
      <div className="matrix-head"><span>Module</span><span>Access</span></div>
      {groups.map(group => <div key={group} className="matrix-group">
        <div className="matrix-group-label with-actions"><span>{group}</span>
          {!readOnly && !locked && <span className="group-bulk">Set all: {levels.map(level => <button key={level} type="button" onClick={() => setGroup(group, level)}>{levelLabel[level]}</button>)}</span>}
        </div>
        {permissionModules.filter(module => module.group === group).map(module => <div className="matrix-row" key={module.key}>
          <span className="matrix-module">{module.label}{module.hint && <small>{module.hint}</small>}</span>
          <LevelPicker value={permissions[module.key] ?? "none"} onChange={level => setLevel(module.key, level)} disabled={readOnly || locked} label={`${module.label} access`} />
        </div>)}
      </div>)}
    </div> : <div className="inline-alert" style={{ margin: "0 20px 20px" }}><ShieldCheck /><span>{kindLabel[draft.kind]} roles open their own portal only, so there is no permission matrix.</span></div>}
  </Panel>;
}
