"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Command, Moon, Search, Sun } from "lucide-react";
import { createMenuItems } from "@/lib/nav-config";
import type { AppView } from "@/types/domain";
import { cn } from "@/lib/utils";
import { SHORTCUTS_MENU_WIDTH, useDraggableShortcutsPosition } from "./use-draggable-shortcuts-position";

function MenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function QuickActions({
  canOpen,
  onNavigate,
  onOpenSearch,
  dark,
  onToggleTheme,
}: {
  canOpen: (view: AppView) => boolean;
  onNavigate: (view: AppView) => void;
  onOpenSearch: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { desktop, point, ready, dragging, buttonSize, onPointerDown, onPointerMove, onPointerUp } =
    useDraggableShortcutsPosition();

  useEffect(() => {
    if (dragging) setOpen(false);
  }, [dragging]);

  useEffect(() => {
    if (!open || !desktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDownOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDownOutside);
    };
  }, [open, desktop]);

  const createItems = useMemo(
    () => createMenuItems.filter(item => canOpen(item.view)),
    [canOpen],
  );

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const menu = (
    <div className="space-y-4">
      {createItems.length > 0 && (
        <MenuGroup label="Create">
          {createItems.map(item => (
            <MenuButton
              key={item.view}
              icon={item.icon}
              label={item.label}
              onClick={() => run(() => onNavigate(item.view))}
            />
          ))}
        </MenuGroup>
      )}
      <MenuGroup label="App">
        <MenuButton icon={Search} label="Search" onClick={() => run(onOpenSearch)} />
      </MenuGroup>
      <MenuGroup label="Appearance">
        <MenuButton
          icon={dark ? Sun : Moon}
          label={dark ? "Light mode" : "Dark mode"}
          onClick={() => run(onToggleTheme)}
        />
      </MenuGroup>
    </div>
  );

  const menuAbove = point.y > 360;
  const menuAlignRight = point.x + buttonSize - SHORTCUTS_MENU_WIDTH >= 8;

  const handleButtonPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const moved = onPointerUp(event);
    if (moved) {
      setOpen(false);
      return;
    }
    if (!moved) {
      setOpen(value => !value);
    }
  };

  return (
    <>
      <div
        ref={rootRef}
        data-quick-actions-root="true"
        className={cn("fixed z-40", dragging && "cursor-grabbing")}
        style={{
          left: point.x,
          top: point.y,
          visibility: ready ? "visible" : "hidden",
        }}
      >
        {desktop && open && !dragging && (
          <div
            role="menu"
            aria-label="Shortcuts"
            className={cn(
              "absolute w-72 max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-xl",
              menuAbove ? "bottom-14 mb-2" : "top-14 mt-2",
              menuAlignRight ? "right-0" : "left-0",
            )}
          >
            {menu}
          </div>
        )}
        <button
          type="button"
          aria-label="Shortcuts"
          aria-haspopup="menu"
          aria-expanded={open}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={handleButtonPointerUp}
          onPointerCancel={handleButtonPointerUp}
          className={cn(
            "flex h-11 w-11 touch-none items-center justify-center rounded-full bg-navy text-white",
            "border border-white/20 shadow-lg shadow-navy/30 dark:border-white/25 dark:shadow-[0_8px_28px_rgba(0,0,0,0.55)]",
            "select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            dragging ? "cursor-grabbing" : "cursor-grab hover:bg-[#0d2d52] dark:hover:bg-[#132f52]",
            !dragging && "active:scale-95 transition",
          )}
        >
          <Command className="pointer-events-none h-5 w-5" />
        </button>
      </div>

      {!desktop && open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 p-0"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="max-h-[min(32rem,85vh)] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-8 shadow-xl"
            onMouseDown={event => event.stopPropagation()}
            role="dialog"
            aria-label="Shortcuts"
          >
            <h2 className="mb-3 text-base font-semibold">Shortcuts</h2>
            {menu}
          </div>
        </div>
      )}
    </>
  );
}
