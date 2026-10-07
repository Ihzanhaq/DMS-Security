"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { Select } from "@/components/ui-kit";
import { isCustomised, normalizeKeys, type AccessRole, type AccessUser, type PermissionKey } from "@/lib/access";
import { cn } from "@/lib/utils";

/* ------------------------- Settings list primitives ------------------------- */

export function SettingsSection({ title, description, action, children, className }: {
  title?: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)} data-enter>
      {(title || description || action) && (
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SettingsList({ children, empty }: { children?: ReactNode; empty?: string }) {
  if (empty) return <p className="px-5 py-10 text-center text-sm text-muted">{empty}</p>;
  return <div className="divide-y divide-border">{children}</div>;
}

export function SettingsItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface/40 sm:px-5", className)}>{children}</div>;
}

export function SettingsItemContent({ title, subtitle, leading }: { title: ReactNode; subtitle?: ReactNode; leading?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export function SettingsActions({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-1 sm:opacity-70 sm:group-hover:opacity-100">{children}</div>;
}

const iconButtonVariants = {
  default: "text-muted hover:bg-surface hover:text-foreground",
  danger: "text-muted hover:bg-status-danger/10 hover:text-status-danger",
  success: "inline-flex items-center gap-1 bg-emerald px-2.5 text-xs font-semibold text-white hover:bg-emerald/90",
};

export function SettingsIconBtn({ className, variant = "default", title, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof iconButtonVariants; title: string }) {
  return (
    <button type="button" title={title} aria-label={title} data-allow
      className={cn("rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4", iconButtonVariants[variant], className)}
      {...props} />
  );
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground">
      <ChevronLeft className="h-4 w-4" /> {label}
    </button>
  );
}

/**
 * Sticky footer for full-page editors. Sticky offsets are measured inside the scroll container's padding,
 * so `bottom-0` already clears the mobile bottom navigation via `main`'s `pb-24` (and sits `pb-8` up on desktop).
 */
export function PageActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

/* --------------------------------- Roles --------------------------------- */

const ROLE_TONE = {
  owner: "bg-gold/15 text-gold",
  builtIn: "bg-emerald/10 text-emerald",
  portal: "bg-foreground/10 text-foreground",
  custom: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300",
};

export function roleTone(role: AccessRole | undefined, customised = false) {
  if (!role) return ROLE_TONE.custom;
  if (role.locked) return ROLE_TONE.owner;
  if (customised) return ROLE_TONE.custom;
  if (role.kind !== "internal") return ROLE_TONE.portal;
  return role.builtIn ? ROLE_TONE.builtIn : ROLE_TONE.custom;
}

export function RoleBadge({ role, customised, label }: { role: AccessRole | undefined; customised?: boolean; label?: string }) {
  const text = customised ? (label?.trim() || `${role?.name ?? "Custom"} · custom`) : role?.name ?? "Missing role";
  return <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium", roleTone(role, customised))}>{text}</span>;
}

export function memberBadge(user: AccessUser, role: AccessRole | undefined) {
  return <RoleBadge role={role} customised={isCustomised(user, role)} label={user.customLabel} />;
}

/** Keys a role grants, with `"*"` expanded. Portal roles grant none. */
export function roleKeys(role: AccessRole | undefined): PermissionKey[] {
  if (!role || role.kind !== "internal") return [];
  return normalizeKeys(role.permissions);
}

/** Internal roles ordered by reporting line, with their depth. */
export function roleTree(roles: AccessRole[]) {
  const ordered: { role: AccessRole; depth: number }[] = [];
  const visit = (parent: string | undefined, depth: number) => {
    roles.filter(role => role.reportsTo === parent && role.kind === "internal").forEach(role => {
      ordered.push({ role, depth });
      visit(role.id, depth + 1);
    });
  };
  visit(undefined, 0);
  const placed = new Set(ordered.map(item => item.role.id));
  roles.filter(role => !placed.has(role.id) && role.kind === "internal").forEach(role => ordered.push({ role, depth: 0 }));
  return ordered;
}

/** Roles that can be assigned to a member: portal roles (built-in) and unlocked office roles. Owner is never assignable. */
export function RoleSelect({ value, roles, onChange, onCustom, disabled, className }: {
  value: string; roles: AccessRole[]; onChange: (roleId: string) => void; onCustom?: () => void; disabled?: boolean; className?: string;
}) {
  const builtIn = roles.filter(role => role.kind !== "internal");
  const assignable = roleTree(roles).map(item => item.role).filter(role => !role.locked);
  return (
    <div className="flex items-center gap-1.5">
      <Select className={className} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} aria-label="Role">
        {!roles.some(role => role.id === value && !role.locked) && <option value={value} disabled>{roles.find(role => role.id === value)?.name ?? "Choose a role"}</option>}
        {builtIn.length > 0 && <optgroup label="Built-in">{builtIn.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</optgroup>}
        {assignable.length > 0 && <optgroup label="Roles">{assignable.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</optgroup>}
      </Select>
      {onCustom && (
        <button type="button" onClick={onCustom} disabled={disabled} title="One-off custom permissions"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-emerald hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-3.5 w-3.5 text-emerald" /> Custom
        </button>
      )}
    </div>
  );
}
