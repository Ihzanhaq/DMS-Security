"use client";

import { Bell, Moon, Shield, Sun } from "lucide-react";
import { APP_NAME } from "@/lib/labels";
import { SearchTrigger } from "./global-search";
import { UserMenu, type MenuUser } from "./user-menu";
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
  users,
  roles,
  currentUserId,
  onSignOut,
  showSearch,
}: {
  showSearch: boolean;
  dark: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  notifications: AppNotification[];
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onNotificationClick: (item: AppNotification) => void;
  users: MenuUser[];
  roles: { id: string; name: string }[];
  currentUserId: string;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 mx-3 my-2 flex h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 shadow-sm backdrop-blur md:mx-5 lg:mx-6">
      <div className="flex min-w-0 items-center gap-2">
        {showSearch && <SearchTrigger onClick={onOpenSearch} />}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy md:hidden" aria-label={APP_NAME}>
          <Shield className="h-4 w-4 text-emerald" />
        </span>
        <h2 className={cn("truncate text-base font-semibold text-foreground", showSearch && "md:hidden")}>{APP_NAME}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme" className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative">
          <button type="button" onClick={onToggleNotifications} aria-label="Notifications" title="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground">
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-danger" />
            )}
          </button>
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
                        onClick={() => onNotificationClick(item)}
                      >
                        <strong className="block text-sm font-medium">{item.title}</strong>
                        <small className="text-xs text-muted">{item.detail}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <UserMenu
          users={users}
          roles={roles}
          currentUserId={currentUserId}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
