"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { ACTIONS } from "@/lib/labels";

export type MenuUser = { id: string; name: string; roleId: string; status: string; initials?: string; email?: string; phone?: string };

export function UserMenu({
  users,
  roles,
  currentUserId,
  onSignOut,
}: {
  users: MenuUser[];
  roles: { id: string; name: string }[];
  currentUserId: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = users.find(u => u.id === currentUserId);
  const roleName = roles.find(role => role.id === current?.roleId)?.name;
  const initials = current?.initials ?? current?.name.slice(0, 2).toUpperCase() ?? "?";
  const contact = current?.email || current?.phone;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={current ? `Account: ${current.name}` : "Account"}
        title={contact || "Account"}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white shadow-sm ring-offset-2 ring-offset-card transition hover:ring-2 hover:ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
      >
        {initials}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-base font-semibold text-white">{initials}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{current?.name}</span>
                {contact && <span className="block truncate text-xs text-muted">{contact}</span>}
                {roleName && (
                  <span className="mt-1 inline-block rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-medium text-emerald">{roleName}</span>
                )}
              </span>
            </div>
            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-status-danger hover:bg-status-danger/10"
              >
                <LogOut className="h-4 w-4" />
                {ACTIONS.signOut}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
