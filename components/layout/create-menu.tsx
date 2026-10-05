"use client";

import { createMenuItems } from "@/lib/nav-config";
import type { AppView } from "@/types/domain";
import { Button } from "@/components/ui-kit";
import { X } from "lucide-react";

export function CreateMenu({
  open,
  onClose,
  onNavigate,
  canOpen,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  canOpen: (view: AppView) => boolean;
}) {
  if (!open) return null;
  const items = createMenuItems.filter(i => canOpen(i.view));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-label="Create"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Create</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <ul className="grid gap-1">
          {items.map(item => (
            <li key={item.view}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface"
                onClick={() => {
                  onNavigate(item.view);
                  onClose();
                }}
              >
                <item.icon className="h-5 w-5 text-emerald" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
