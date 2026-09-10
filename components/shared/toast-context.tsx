"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react";

const ToastContext = createContext<(message: string) => void>(() => {});

/** Report the outcome of an action. Replaces the prototype's alert() calls. */
export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const notify = useCallback((next: string) => setMessage(next), []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {message && <div className="toast" role="status"><CheckCircle weight="fill" /><span>{message}</span></div>}
    </ToastContext.Provider>
  );
}
