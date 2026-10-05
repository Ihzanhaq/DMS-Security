"use client";

import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function PersonCell({ name, id, phone }: { name: string; id: string; phone?: string }) {
  const initials = name.split(" ").map(part => part[0]).join("").slice(0, 2);
  return (
    <span className="inline-flex items-center gap-2">
      <i className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-xs font-bold not-italic text-emerald">
        {initials}
      </i>
      <span className="min-w-0">
        <strong className="block text-sm font-medium text-foreground">{name}</strong>
        <small className="text-xs text-muted">
          {id}
          {phone && (
            <>
              {" · "}
              <a
                className="inline-flex items-center gap-0.5 text-emerald hover:underline"
                href={`tel:${phone.replace(/\s/g, "")}`}
                onClick={e => e.stopPropagation()}
                aria-label={`Call ${name}`}
              >
                <Phone className="h-3 w-3" />
                {phone}
              </a>
            </>
          )}
        </small>
      </span>
    </span>
  );
}

export function ProgressBar({ value, tone = "emerald" }: { value: number; tone?: string }) {
  const bar =
    tone === "warn"
      ? "bg-status-warn"
      : tone === "danger"
        ? "bg-status-danger"
        : "bg-emerald";
  const pct = Math.min(100, Math.max(0, value));
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-surface">
      <i className={cn("block h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
    </span>
  );
}

export type DefRow = { label: string; value: ReactNode; mono?: boolean; total?: boolean };

export function DefRows({ rows }: { rows: DefRow[] }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {rows.map(row => (
        <div
          key={row.label}
          className={cn(
            "flex items-center justify-between gap-4 px-3 py-2 text-sm",
            row.total && "bg-surface font-semibold",
          )}
        >
          <span className="text-muted">{row.label}</span>
          <strong className={cn("text-foreground", row.mono && "font-mono text-xs")}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

export type TimelineEntry = { title: string; time: string; note?: string; state?: "done" | "active" };

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ul className="space-y-3 border-l-2 border-border pl-4">
      {entries.map(entry => (
        <li
          key={entry.title + entry.time}
          className={cn(
            "relative text-sm",
            entry.state === "done" && "text-muted",
            entry.state === "active" && "font-medium text-emerald",
          )}
        >
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-border" />
          <strong className="block">{entry.title}</strong>
          <small className="text-xs text-muted">{entry.time}</small>
          {entry.note && <p className="mt-1 text-xs text-muted">{entry.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export function SkillTags({ skills, keySkill }: { skills: string[]; keySkill?: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {skills.map(skill => (
        <span
          key={skill}
          className={cn(
            "rounded-md px-2 py-0.5 text-xs",
            skill === keySkill ? "bg-emerald/15 font-medium text-emerald" : "bg-surface text-muted",
          )}
        >
          {skill}
        </span>
      ))}
    </span>
  );
}
