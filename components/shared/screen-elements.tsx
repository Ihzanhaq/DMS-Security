"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="screen-header" data-enter>
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="screen-actions">{actions}</div>}
    </header>
  );
}

/* Colour is reserved for state, so only the three status tones map to a
   tinted value. Everything else renders in ink. */
const statTone: Record<string, string> = { green: " is-ok", orange: " is-warn", red: " is-danger" };

export function StatStrip({ items }: { items: { label: string; value: string; note?: string; icon: Icon; tone?: string }[] }) {
  return (
    <section className="stat-strip" data-enter>
      {items.map(({ label, value, note, icon: Icon, tone }) => (
        <article className={`stat-item${statTone[tone ?? ""] ?? ""}`} key={label}>
          <span className="stat-head"><Icon size={13} /><span>{label}</span></span>
          <strong>{value}</strong>
          {note && <small>{note}</small>}
        </article>
      ))}
    </section>
  );
}

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`} data-enter>
      {(title || action) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{action}</div>}
      {children}
    </section>
  );
}

export function Toolbar({ children }: { children: ReactNode }) { return <div className="toolbar" data-enter>{children}</div>; }

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`status-chip ${tone}`}>{children}</span>;
}

export function PersonCell({ name, id }: { name: string; id: string }) {
  const initials = name.split(" ").map(part => part[0]).join("").slice(0, 2);
  return <span className="person-cell"><i>{initials}</i><span><strong>{name}</strong><small>{id}</small></span></span>;
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: string }) {
  return <span className="progress-line"><i className={tone} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

/* Side panel used by every row-level detail view. Closes on backdrop click
   and on Escape. */
export function DetailDrawer({ title, subtitle, avatar, onClose, footer, children }: {
  title: string; subtitle?: string; avatar?: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the drawer on open and hand it back to the trigger on
  // close, so keyboard and screen-reader users are not left behind it.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => trigger?.focus?.();
  }, []);

  return (
    <div className="drawer-backdrop" onMouseDown={onClose} role="presentation">
      <aside ref={panelRef} tabIndex={-1} className="detail-drawer" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-head">
          {avatar ? <span className="large-avatar">{avatar}</span> : <span />}
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-actions">{footer}</div>}
      </aside>
    </div>
  );
}

export type DefRow = { label: string; value: ReactNode; mono?: boolean; total?: boolean };

export function DefRows({ rows }: { rows: DefRow[] }) {
  return (
    <div className="def-rows">
      {rows.map(row => (
        <div className={row.total ? "total" : undefined} key={row.label}>
          <span>{row.label}</span>
          <strong className={row.mono ? "mono" : undefined}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

export type TimelineEntry = { title: string; time: string; note?: string; state?: "done" | "active" };

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ul className="timeline">
      {entries.map(entry => (
        <li className={entry.state} key={entry.title + entry.time}>
          <strong>{entry.title}</strong>
          <small>{entry.time}</small>
          {entry.note && <p>{entry.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export function SkillTags({ skills, keySkill }: { skills: string[]; keySkill?: string }) {
  return <span className="skill-tags">{skills.map(skill => <span className={skill === keySkill ? "key" : undefined} key={skill}>{skill}</span>)}</span>;
}
