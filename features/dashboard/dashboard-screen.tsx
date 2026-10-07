"use client";

import type { ComponentType, ReactNode } from "react";
import { ArrowUpRight, Briefcase, CalendarCheck, Moon, Repeat, Sun, UserPlus, Users } from "lucide-react";
import { CallButton } from "@/components/ui-kit";
import { useAccess } from "@/components/shared/access-context";
import { useOps } from "@/components/shared/ops-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { employees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Navigate = (view: string) => void;
type Icon = ComponentType<{ className?: string }>;

const NOW = "09:24";
const weekday = new Date(`${APP_TODAY}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

/** Soft tinted tiles. Each tint keeps enough contrast in dark mode. */
const tints = {
  lavender: "bg-violet-100/80 dark:bg-violet-400/10",
  peach: "bg-orange-100/80 dark:bg-orange-400/10",
  mint: "bg-emerald-100/70 dark:bg-emerald-400/10",
  sky: "bg-sky-100/80 dark:bg-sky-400/10",
};

function ArrowHint() {
  return <span aria-hidden
    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-foreground/70 transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
    <ArrowUpRight className="size-4" />
  </span>;
}

function Tile({ tint, icon: TileIcon, label, value, note, onOpen }: { tint: keyof typeof tints; icon: Icon; label: string; value: string; note: string; onOpen: () => void }) {
  return <button type="button" onClick={onOpen}
    className={cn("group flex min-h-[132px] flex-col justify-between rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tints[tint])}>
    <span className="flex size-9 items-center justify-center rounded-full bg-white/80 text-foreground/80 dark:bg-white/10"><TileIcon className="size-4" /></span>
    <span className="mt-4 block">
      <span className="block text-xs font-medium text-foreground/70">{label}</span>
      <span className="mt-0.5 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
        <span className="flex size-7 items-center justify-center rounded-full border border-foreground/20 text-foreground/60 transition-colors group-hover:border-foreground group-hover:text-foreground" aria-hidden>
          <ArrowUpRight className="size-3.5" />
        </span>
      </span>
      <span className="mt-1 block text-[11px] text-foreground/55">{note}</span>
    </span>
  </button>;
}

/**
 * Clicking anywhere on the card opens its screen. It is a div with role="button" rather than a <button>
 * because cards contain call links, and links can't be nested inside buttons.
 */
function Card({ title, openLabel, onOpen, children, className }: { title: string; openLabel: string; onOpen: () => void; children: ReactNode; className?: string }) {
  return <section className={cn("flex min-w-0 flex-col", className)} data-enter>
    <div role="button" tabIndex={0} aria-label={`${title}. ${openLabel}`} onClick={onOpen}
      onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen(); } }}
      className="group flex flex-1 cursor-pointer flex-col rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <ArrowHint />
      </header>
      <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-shadow group-hover:shadow-md">{children}</div>
    </div>
  </section>;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(part => part[0]).join("").slice(0, 2);
  return <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-foreground/70 ring-1 ring-border">{initials}</span>;
}

export function DashboardScreen({ onNavigate }: { onNavigate: Navigate }) {
  const { currentUser } = useAccess();
  const { dutyRequests, nightChecks } = useOps();
  const firstName = currentUser.name.split(" ")[0];
  const newest = [...employees].sort((a, b) => b.joiningDate.localeCompare(a.joiningDate)).slice(0, 4);
  const pendingDuty = dutyRequests.filter(item => item.status === "pending");
  const nightDue = nightChecks.filter(item => item.state !== "Confirmed").length;

  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3" data-enter>
      <div>
        <p className="text-sm text-muted">Hello {firstName} <span aria-hidden>👋</span></p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">Good morning</h1>
      </div>
      <p className="text-sm text-muted">{weekday} · <span className="tabular-nums">{NOW}</span></p>
    </div>

    <div className="grid gap-6 lg:grid-cols-12">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:col-span-5" data-enter>
        <Tile tint="lavender" icon={Users} label="Active employees" value="468" note="12 joined this month" onOpen={() => onNavigate("workforce")} />
        <Tile tint="peach" icon={CalendarCheck} label="Absent today" value="21" note="14 covered by relievers" onOpen={() => onNavigate("attendance")} />
        <Tile tint="mint" icon={UserPlus} label="New joiners" value="12" note="Welfare calls due for 3" onOpen={() => onNavigate("hr-quality")} />
        <Tile tint="sky" icon={Briefcase} label="Open vacancies" value="7" note="3 need action now" onOpen={() => onNavigate("recruitment")} />
      </div>

      {/* Today's shift */}
      <Card className="lg:col-span-4" title="Today's shift" openLabel="Open today's attendance" onOpen={() => onNavigate("attendance")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted"><Sun className="size-3.5" />Day shift</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">08:00 – 20:00</p>
          </div>
          <span className="rounded-full bg-emerald/10 px-2.5 py-1 text-xs font-medium text-emerald">In progress</span>
        </div>
        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Posts manned</span>
            <span><b className="text-lg font-semibold tabular-nums">442</b><span className="text-muted"> / 449</span></span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-foreground/80" style={{ width: "98.4%" }} /></div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          <div><dt className="text-[11px] text-muted">On time</dt><dd className="text-base font-semibold tabular-nums">421</dd></div>
          <div><dt className="text-[11px] text-muted">Late</dt><dd className="text-base font-semibold tabular-nums">7</dd></div>
          <div><dt className="text-[11px] text-muted">Empty posts</dt><dd className="text-base font-semibold tabular-nums text-status-danger">7</dd></div>
        </dl>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Moon className="size-3.5" />Night handover at 20:00 · {nightDue} night checks pending</p>
      </Card>

      {/* Newest members */}
      <Card className="lg:col-span-3" title="Newest members" openLabel="Open employees" onOpen={() => onNavigate("workforce")}>
        <ul className="-my-1 divide-y divide-border">
          {newest.map(person => (
            <li key={person.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={person.name} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm font-medium">{person.name}</b>
                <small className="block truncate text-xs text-muted">{person.role} · joined {formatAppDate(person.joiningDate)}</small>
              </span>
              {person.phone && <CallButton phone={person.phone} name={person.name} />}
            </li>
          ))}
        </ul>
      </Card>

      {/* Attendance */}
      <Card className="lg:col-span-4" title="Attendance" openLabel="Open attendance" onOpen={() => onNavigate("attendance")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{weekday}</p>
            <p className="mt-1 text-sm">On time today</p>
          </div>
          <p className="text-right"><span className="text-2xl font-semibold tabular-nums">421</span><span className="text-sm text-muted"> / 449</span></p>
        </div>
        <ul className="mt-4 grid gap-2 text-sm">
          <li className="flex items-center justify-between rounded-xl bg-surface px-3 py-2"><span className="text-muted">Punched in</span><b className="font-semibold tabular-nums">428 of 449</b></li>
          <li className="flex items-center justify-between rounded-xl bg-surface px-3 py-2"><span className="text-muted">Late after grace</span><b className="font-semibold tabular-nums">7</b></li>
          <li className="flex items-center justify-between rounded-xl bg-surface px-3 py-2"><span className="text-muted">Corrections waiting</span><b className="font-semibold tabular-nums">1</b></li>
        </ul>
      </Card>

      {/* Duty changes */}
      <Card className="lg:col-span-4" title="Duty changes" openLabel="Open duty changes" onOpen={() => onNavigate("duty-changes")}>
        {pendingDuty.length
          ? <>
            <ul className="-my-1 divide-y divide-border">
              {pendingDuty.slice(0, 4).map(request => {
                const person = employees.find(item => item.id === request.employeeId);
                const name = person?.name ?? request.employeeId;
                return <li key={request.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-orange-100/80 py-1 dark:bg-orange-400/10">
                    <span className="text-sm font-semibold leading-none tabular-nums">{request.date.slice(8)}</span>
                    <span className="mt-0.5 text-[9px] uppercase tracking-wide text-foreground/60">{new Date(`${request.date}T12:00:00`).toLocaleDateString("en-IN", { month: "short" })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-medium">{name}</b>
                    <small className="block truncate text-xs text-muted">{request.type === "ot" ? `Extra duty · ${request.hours} h` : request.type === "swap" ? "Shift swap" : "Needs cover"} · {request.site}</small>
                  </span>
                  {person?.phone && <CallButton phone={person.phone} name={name} />}
                </li>;
              })}
            </ul>
            <p className="mt-3 text-xs text-muted">{pendingDuty.length > 4 ? `+${pendingDuty.length - 4} more · ` : ""}{pendingDuty.length} waiting for a decision</p>
          </>
          : <p className="py-6 text-center text-sm text-muted">No requests waiting. New ones from the guard app appear here.</p>}
      </Card>

      {/* Payroll */}
      <Card className="lg:col-span-4" title="August payroll" openLabel="Open payroll" onOpen={() => onNavigate("payroll")}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Ready to approve</span>
          <span className="text-2xl font-semibold tabular-nums">82%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-foreground/80" style={{ width: "82%" }} /></div>
        <ul className="mt-4 grid gap-2 text-sm">
          {[
            { label: "Attendance locked", done: true },
            { label: "Deductions reviewed", done: true },
            { label: "3 exceptions to resolve", done: false },
          ].map(step => (
            <li key={step.label} className="flex items-center gap-2.5">
              <span className={cn("flex size-5 items-center justify-center rounded-full border text-[10px]", step.done ? "border-transparent bg-emerald/15 text-emerald" : "border-foreground/25 text-transparent")}>✓</span>
              <span className={step.done ? "text-muted line-through decoration-muted/40" : "font-medium"}>{step.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Repeat className="size-3.5" />Closes in 3 days</p>
      </Card>
    </div>
  </div>;
}
