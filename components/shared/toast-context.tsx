"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

type ToastPayload = { message: string; kind?: ToastKind };

const ToastContext = createContext<(message: string | ToastPayload) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const notify = useCallback((next: string | ToastPayload) => {
    setToast(typeof next === "string" ? { message: next, kind: "success" } : next);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const Icon = toast?.kind === "error" ? XCircle : toast?.kind === "info" ? Info : CheckCircle2;
  const iconClass =
    toast?.kind === "error" ? "text-status-danger" : toast?.kind === "info" ? "text-navy" : "text-emerald";

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div
          className="fixed right-4 top-4 z-[70] flex max-w-xs items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-lg"
          role="status"
        >
          <Icon className={cn("h-5 w-5 shrink-0", iconClass)} />
          <span className="text-sm text-foreground">{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
