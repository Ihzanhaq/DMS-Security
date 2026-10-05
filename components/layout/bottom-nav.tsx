"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { AppView } from "@/types/domain";

export function BottomNav({
  items,
  activeView,
  onNavigate,
}: {
  items: { label: string; view: AppView; icon: LucideIcon }[];
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-white/10 bg-navy md:hidden">
      {items.map(item => {
        const active = activeView === item.view || (item.label === "More" && activeView.startsWith("guard-"));
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "text-emerald" : "text-white/60",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
