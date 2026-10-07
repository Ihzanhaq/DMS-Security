"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "./searchable-select";

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted focus:border-emerald focus:ring-2 focus:ring-emerald/30";

export const textareaClass =
  "min-h-[88px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-emerald focus:ring-2 focus:ring-emerald/30";

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-medium text-foreground">
        {label}
        {required && <span className="text-status-danger"> *</span>}
      </span>
      {children}
      {hint && <small className="mt-1 block text-xs text-muted">{hint}</small>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

/** Every dropdown in the app is searchable. Same props as a native <select>. */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <SearchableSelect {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(textareaClass, className)} {...props} />;
}
