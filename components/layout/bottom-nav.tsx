"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { NavLink } from "@/lib/nav-config";
import type { AppView } from "@/types/domain";
import { Sheet } from "@/components/ui-kit";

export function BottomNav({
  items,
  moreItems,
  activeView,
  onNavigate,
}: {
  items: { label: string; view: AppView; icon: LucideIcon }[];
  moreItems: NavLink[];
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryViews = items.map(item => item.view);
  const onMoreView = !primaryViews.includes(activeView);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around bg-navy md:hidden" aria-label="Main navigation">
        {items.map(item => {
          const active = activeView === item.view;
          return (
            <button key={item.view} type="button" onClick={() => onNavigate(item.view)}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-emerald" : "text-white/60")}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)}
          className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", onMoreView ? "text-emerald" : "text-white/60")}>
          <span className="flex h-5 w-5 items-center justify-center text-lg leading-none">⋯</span>
          More
        </button>
      </nav>
      <Sheet open={moreOpen} title="All services" onClose={() => setMoreOpen(false)} side="center">
        <div className="grid gap-1">
          {moreItems.map(item => (
            <button key={item.view} type="button"
              onClick={() => { onNavigate(item.view); setMoreOpen(false); }}
              className={cn("rounded-xl px-3 py-2.5 text-left text-sm", activeView === item.view ? "bg-emerald/10 font-semibold text-emerald" : "hover:bg-surface")}>
              {item.label}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
