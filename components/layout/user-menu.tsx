"use client";

import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { ACTIONS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function UserMenu({
  users,
  roles,
  currentUserId,
  onViewAs,
  onSignOut,
}: {
  users: { id: string; name: string; roleId: string; status: string; initials?: string }[];
  roles: { id: string; name: string }[];
  currentUserId: string;
  onViewAs: (userId: string) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = users.find(u => u.id === currentUserId);
  const initials = current?.initials ?? current?.name.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={current ? `Account: ${current.name}` : "Account"}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white shadow-sm ring-offset-2 ring-offset-card transition hover:bg-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
      >
        {initials}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{ACTIONS.viewAs}</p>
            <div className="max-h-48 overflow-y-auto">
              {roles.map(role => {
                const members = users.filter(u => u.roleId === role.id && u.status === "active");
                if (!members.length) return null;
                return (
                  <div key={role.id} className="mb-2">
                    <p className="px-3 py-1 text-[11px] font-medium text-muted">{role.name}</p>
                    {members.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onViewAs(user.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface",
                          user.id === currentUserId && "bg-emerald/10 font-medium text-emerald",
                        )}
                      >
                        <UserRound className="h-4 w-4 shrink-0" />
                        {user.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                onSignOut();
                setOpen(false);
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-status-danger hover:bg-status-danger/10"
            >
              <LogOut className="h-4 w-4" />
              {ACTIONS.signOut}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
