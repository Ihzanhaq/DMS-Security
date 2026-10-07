"use client";

import {
  Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type ChangeEvent, type KeyboardEvent, type ReactElement, type ReactNode, type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** `group` is the label of the enclosing `<optgroup>`, rendered as a non-selectable heading. */
type Option = { value: string; label: string; disabled: boolean; group?: string };

/** Plain text of an option's children, e.g. `{name} · {id}` → "Asha · BMG-1". */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Reads `<option>` elements from children, including ones inside fragments, arrays and `<optgroup>`s. */
function collectOptions(children: ReactNode, out: Option[] = [], group?: string): Option[] {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; label?: string }>;
    if (element.type === "option") {
      const label = textOf(element.props.children);
      out.push({ value: element.props.value !== undefined ? String(element.props.value) : label, label, disabled: !!element.props.disabled, group });
    } else if (element.type === "optgroup") {
      collectOptions(element.props.children, out, element.props.label);
    } else if (element.props.children) {
      collectOptions(element.props.children, out, group);
    }
  });
  return out;
}

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

/**
 * Drop-in replacement for a native `<select>` with a search box. Same props as `<select>`: `value` /
 * `defaultValue`, `onChange(event)` with `event.target.value`, `<option>` children, `disabled`, `className`.
 * The list renders in a portal so it isn't clipped by cards, tables or side sheets.
 */
export function SearchableSelect({
  className, children, value, defaultValue, onChange, disabled, name, id, required,
  "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy,
}: SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  const options = useMemo(() => collectOptions(children), [children]);
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() => defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? "");
  const current = controlled ? String(value) : internal;
  const selected = options.find(option => option.value === current);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(option => option.label.toLowerCase().includes(q)) : options;

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const width = Math.max(rect.width, 200);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPosition(below >= 240 || below >= above
      ? { left, width, top: rect.bottom + 4, maxHeight: Math.min(320, below) }
      : { left, width, bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(320, above) });
  };

  const show = (initialQuery = "") => {
    if (disabled) return;
    place();
    setQuery(initialQuery);
    const index = options.findIndex(option => option.value === current);
    setHighlight(initialQuery ? 0 : Math.max(0, index));
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (option: Option) => {
    if (option.disabled) return;
    if (!controlled) setInternal(option.value);
    if (option.value !== current) {
      const target = { value: option.value, name } as HTMLSelectElement;
      onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>);
    }
    hide();
  };

  // Keep the list attached to the trigger while the page scrolls or resizes; close when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.parentElement?.contains(target)) hide(false);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("mousedown", outside);
    searchRef.current?.focus();
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("mousedown", outside);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); show(); return; }
    // Typing on the closed control starts a search, like a native select's type-ahead.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); show(event.key); }
  };
  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setHighlight(index => Math.min(filtered.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); const option = filtered[highlight]; if (option) choose(option); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); hide(); }
    else if (event.key === "Tab") hide(false);
  };

  return <>
    <button ref={triggerRef} type="button" id={id} disabled={disabled}
      role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} aria-required={required}
      onClick={() => open ? hide() : show()} onKeyDown={onTriggerKey}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30",
        "flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}>
      <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>{selected?.label ?? "Select…"}</span>
      <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
    </button>
    {name && <input type="hidden" name={name} value={current} />}

    {open && position && createPortal(
      <div className="fixed z-[80] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        style={{ left: position.left, width: position.width, top: position.top, bottom: position.bottom, maxHeight: position.maxHeight }}
        onMouseDown={event => event.stopPropagation()}>
        <div className="relative shrink-0 border-b border-border p-1.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input ref={searchRef} value={query} onChange={event => { setQuery(event.target.value); setHighlight(0); }} onKeyDown={onSearchKey}
            placeholder="Search…" aria-label="Search options" aria-controls={listId} aria-activedescendant={filtered[highlight] ? `${listId}-${highlight}` : undefined}
            className="h-9 w-full rounded-lg bg-surface pl-8 pr-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald/30" />
        </div>
        <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="flex-1 overflow-y-auto p-1">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
          {filtered.map((option, index) => {
            const isSelected = option.value === current;
            const heading = option.group && option.group !== filtered[index - 1]?.group
              ? <li role="presentation" className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{option.group}</li>
              : null;
            return <Fragment key={`${option.value}-${index}`}>{heading}<li id={`${listId}-${index}`} data-index={index} role="option" aria-selected={isSelected} aria-disabled={option.disabled}
              onMouseEnter={() => setHighlight(index)} onClick={() => choose(option)}
              className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm",
                index === highlight && "bg-surface", isSelected && "font-medium", option.disabled && "cursor-not-allowed opacity-50")}>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {isSelected && <Check className="size-4 shrink-0 text-emerald" aria-hidden />}
            </li></Fragment>;
          })}
        </ul>
      </div>,
      document.body,
    )}
  </>;
}
