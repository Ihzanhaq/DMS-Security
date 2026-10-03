"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus } from "@phosphor-icons/react";

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

  return <form className="add-item-row" onSubmit={submit}>
    <label htmlFor={id}>{label}</label>
    <div className="add-item-controls">
      <input id={id} value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder} disabled={disabled} autoComplete="off" />
      <button type="submit" className="primary-button" disabled={disabled || !trimmed || duplicate}><Plus />{buttonLabel}</button>
    </div>
    <small className={duplicate ? "add-item-hint warn" : "add-item-hint"}>
      {duplicate ? `"${trimmed}" is already in the list.` : "Type a name, then press Enter or click the button."}
    </small>
  </form>;
}
