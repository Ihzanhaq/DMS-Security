"use client";

import { Bell, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui-kit";
import { SearchTrigger } from "./global-search";
import { UserMenu } from "./user-menu";
import type { AppNotification } from "@/types/domain";
import { cn } from "@/lib/utils";

export function TopBar({
  dark,
  onToggleTheme,
  onOpenSearch,
  notifications,
  notificationsOpen,
  onToggleNotifications,
  onNotificationClick,
  onCreateOpen,
  users,
  roles,
  currentUserId,
  onViewAs,
  onSignOut,
  showCreate,
}: {
  dark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  notifications: AppNotification[];
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onNotificationClick: (id: string, view: string) => void;
  onCreateOpen: () => void;
  users: { id: string; name: string; roleId: string; status: string }[];
  roles: { id: string; name: string }[];
  currentUserId: string;
  onViewAs: (userId: string) => void;
  onSignOut: () => void;
  showCreate: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 mx-3 my-2 flex h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 shadow-sm backdrop-blur md:mx-5 lg:mx-6">
      <SearchTrigger onClick={onOpenSearch} />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleNotifications}
            aria-label="Notifications"
            className={cn(notifications.length > 0 && "relative")}
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-status-danger ring-2 ring-card" />
            )}
          </Button>
          {notificationsOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-border bg-card shadow-xl">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold">
                Notifications{notifications.length ? ` · ${notifications.length}` : ""}
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Nothing needs your attention right now.</p>
              ) : (
                <ul className="max-h-72 overflow-y-auto p-2">
                  {notifications.slice(0, 8).map(item => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
                        onClick={() => onNotificationClick(item.id, item.targetView)}
                      >
                        <strong className="block text-sm">{item.title}</strong>
                        <small className="text-xs text-muted">{item.detail}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {showCreate && (
          <Button onClick={onCreateOpen} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        )}
        <UserMenu
          users={users}
          roles={roles}
          currentUserId={currentUserId}
          onViewAs={onViewAs}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
