"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Sheet({
  open,
  title,
  subtitle,
  onClose,
  footer,
  children,
  side = "right",
  wide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  side?: "right" | "center";
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => trigger?.focus?.();
  }, [open]);

  if (!open) return null;

  const panelClass =
    side === "center"
      ? cn("w-full max-w-lg rounded-2xl", wide && "max-w-2xl")
      : cn("ml-auto h-full w-full max-w-md rounded-none sm:max-w-lg sm:rounded-l-2xl", wide && "max-w-2xl");

  return (
    <div className="fixed inset-0 z-50 flex bg-black/45 p-0 sm:p-4" onMouseDown={onClose} role="presentation">
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={cn("flex max-h-full flex-col border border-border bg-card shadow-xl outline-none", panelClass)}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">{footer}</div>}
      </aside>
    </div>
  );
}

/** Drawer API used by legacy screens */
export function DetailDrawer({
  title,
  subtitle,
  avatar,
  onClose,
  footer,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  avatar?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Sheet open title={title} subtitle={subtitle} onClose={onClose} footer={footer} wide={wide}>
      {avatar && <div className="mb-4">{avatar}</div>}
      {children}
    </Sheet>
  );
}
