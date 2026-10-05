"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button, Input } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

/** Labelled "type a name, then add" row. Enter submits; blanks and duplicates are refused with a visible reason. */
export function AddItemRow({ label, placeholder, buttonLabel, existing, onAdd, disabled = false }: {
  label: string;
  placeholder: string;
  buttonLabel: string;
  existing: string[];
  onAdd: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const duplicate = existing.some(item => item.toLowerCase() === trimmed.toLowerCase());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || duplicate) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <form className="mt-4 border-t border-border pt-4" onSubmit={submit}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={id} value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder} disabled={disabled} autoComplete="off" />
        <Button type="submit" className="h-11 shrink-0" disabled={disabled || !trimmed || duplicate}><Plus />{buttonLabel}</Button>
      </div>
      <small className={cn("mt-1 block text-xs", duplicate ? "text-status-danger" : "text-muted")}>
        {duplicate ? `"${trimmed}" is already in the list.` : "Type a name, then press Enter or select the button."}
      </small>
    </form>
  );
}
