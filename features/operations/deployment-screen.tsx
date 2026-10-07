"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Lock, Moon, Plus, Search, Sun, UserMinus, UserRoundPlus, X } from "lucide-react";
import { Button, CallButton, EmptyState, FilterChips, Input, ListFilterRow, ListRow, PageHeader, Panel, SplitLayout, StatStrip, StatusChip } from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { useOps } from "@/components/shared/ops-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { NAV, ROLE_TERMS } from "@/lib/labels";
import { employees, guardChanges, rupees, sites } from "@/lib/mock-data";
import { rankRelievers, type RelieverMatch, type ShiftKind } from "@/lib/reliever-matching";
import { cn } from "@/lib/utils";
import type { GuardChangeEvent, Rating } from "@/types/domain";
import { RotationDrawer } from "./operations-screens";

type Post = { id: string; site: string; post: string; shift: ShiftKind; hours: string; slots: (string | null)[] };
type PostFilter = "all" | "open" | "Day" | "Night";
/** The slot whose picker is open, and whether it replaces someone or fills a gap. */
type Picking = { postId: string; slot: number };

const template: Post[] = [
  { id: "P1", site: "Aster Medcity", post: "Emergency", shift: "Day", hours: "08:00–20:00", slots: ["BMG-2274", null] },
  { id: "P2", site: "Lake Palace Resort", post: "Lobby", shift: "Night", hours: "20:00–08:00", slots: ["BMG-2031", null] },
  { id: "P3", site: "TCS Technopark", post: "Block A", shift: "Night", hours: "20:00–08:00", slots: ["BMG-1988", null] },
  { id: "P4", site: "Lulu Mall, Kochi", post: "Loading bay", shift: "Day", hours: "08:00–20:00", slots: ["BMG-1840", "BMG-2118"] },
  { id: "P5", site: "TCS Technopark", post: "Main gate", shift: "Day", hours: "08:00–20:00", slots: ["BMG-1655"] },
  { id: "P6", site: "Caritas Hospital", post: "Casualty", shift: "Night", hours: "20:00–08:00", slots: ["BMG-1778"] },
  { id: "P7", site: "Skyline Apartments", post: "Gate", shift: "Night", hours: "20:00–08:00", slots: ["BMG-2087"] },
];

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
/** 0 = Monday … 6 = Sunday. */
const weekdayIndex = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const mondayOf = (iso: string) => addDays(iso, -weekdayIndex(iso));
const label = (iso: string, options: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", { ...options, timeZone: "UTC" });
const person = (id: string) => employees.find(item => item.id === id);
const filled = (post: Post) => post.slots.filter(Boolean).length;
const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

/** Approved leave by employee, inclusive date range. */
const leave: Record<string, [string, string]> = { "BMG-2031": ["2026-09-20", "2026-09-25"] };
const onLeave = (id: string, iso: string) => !!leave[id] && iso >= leave[id][0] && iso <= leave[id][1];
/** Every regular guard has one fixed weekly day off, which leaves their slot open that day. */
const weeklyOff = (id: string, iso: string) => person(id)?.status !== "Reliever" && hash(id) % 7 === weekdayIndex(iso);
const needsCover = (post: Post, iso: string) => post.slots.some(slot => !slot || onLeave(slot, iso));

/**
 * The standing roster for a date: weekly offs and leave open slots. Past dates show who actually covered,
 * filled from the best-ranked relievers, so history reads as it happened.
 */
function buildRoster(iso: string, ratings: Rating[]): Post[] {
  const roster = template.map(post => ({ ...post, slots: post.slots.map(id => id && !weeklyOff(id, iso) ? id : null) }));
  if (iso >= APP_TODAY) return roster;
  const busy = new Map<string, string>();
  roster.forEach(post => post.slots.forEach(id => { if (id) busy.set(id, post.site); }));
  return roster.map(post => ({
    ...post,
    slots: post.slots.map(id => {
      if (id && !onLeave(id, iso)) return id;
      const pick = rankRelievers({ site: post.site, shift: post.shift, busy, ratings }).find(match => !match.unavailable);
      if (!pick) return id;
      busy.set(pick.employee.id, post.site);
      return pick.employee.id;
    }),
  }));
}

export function DeploymentScreen({ onAssign }: { onAssign: () => void }) {
  const notify = useToast();
  const { ratings } = useOps();
  const [day, setDay] = useState(APP_TODAY);
  // Edits are kept per date; untouched dates are built from the standing roster.
  const [rosters, setRosters] = useState<Record<string, Post[]>>({});
  const posts = useMemo(() => rosters[day] ?? buildRoster(day, ratings), [rosters, day, ratings]);
  const past = day < APP_TODAY;
  const week = Array.from({ length: 7 }, (_, index) => addDays(mondayOf(day), index));
  const go = (iso: string) => { if (iso) { setDay(iso); setPicking(null); } };
  const [filter, setFilter] = useState<PostFilter>("all");
  const [picking, setPicking] = useState<Picking | null>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [changes, setChanges] = useState<GuardChangeEvent[]>(guardChanges);

  const update = (postId: string, slot: number, next: string | null) => {
    const post = posts.find(item => item.id === postId);
    if (!post) return;
    const outgoing = post.slots[slot];
    setRosters(current => ({ ...current, [day]: (current[day] ?? buildRoster(day, ratings)).map(item => item.id === postId ? { ...item, slots: item.slots.map((value, index) => index === slot ? next : value) } : item) }));
    setChanges(current => [{ id: `GC-${Date.now()}`, site: post.site, post: `${post.post} · ${post.shift}`, outgoing: outgoing ? person(outgoing)?.name ?? outgoing : "Vacant post", incoming: next ? person(next)?.name ?? next : "Vacant post", at: `${day} 09:30` }, ...current]);
    setPicking(null);
    const officer = sites.find(site => site.name === post.site)?.fieldOfficers[0] ?? ROLE_TERMS.fieldOfficer;
    notify(next ? `${person(next)?.name} assigned to ${post.site} · ${officer} notified` : `Slot cleared at ${post.site}`);
  };
  const addSlot = (postId: string) => setRosters(current => ({ ...current, [day]: (current[day] ?? buildRoster(day, ratings)).map(item => item.id === postId ? { ...item, slots: [...item.slots, null] } : item) }));

  // Everyone deployed on the selected day, so relievers can't be double-booked.
  const busy = useMemo(() => {
    const map = new Map<string, string>();
    posts.forEach(post => post.slots.forEach(id => { if (id) map.set(id, `On ${post.shift.toLowerCase()} shift at ${post.site}`); }));
    Object.keys(leave).forEach(id => { if (onLeave(id, day)) map.set(id, "On leave"); });
    return map;
  }, [posts, day]);

  const isOpen = (post: Post) => needsCover(post, day);
  const openCount = posts.filter(isOpen).length;
  const totalSlots = posts.reduce((sum, post) => sum + post.slots.length, 0);
  const filledSlots = posts.reduce((sum, post) => sum + filled(post), 0);
  const visible = posts.filter(post => filter === "all" || (filter === "open" ? isOpen(post) : post.shift === filter));
  const toggle = (next: PostFilter) => setFilter(filter === next ? "all" : next);

  return <>
    <PageHeader title={NAV.deployment} subtitle="Who stands at which post each day. Replace or fill any slot right here; relievers are ranked by rating, distance and preference."
      actions={<Button variant="outline" onClick={onAssign}><Plus />Post a new employee</Button>} />

    <div className="mb-4 rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-3" data-enter>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button size="icon" variant="ghost" className="size-8" aria-label="Previous week" onClick={() => go(addDays(day, -7))}><ChevronLeft className="size-4" /></Button>
        <strong className="text-sm font-semibold tabular-nums">{label(week[0], { day: "numeric", month: "short" })} – {label(week[6], { day: "numeric", month: "short", year: "numeric" })}</strong>
        <Button size="icon" variant="ghost" className="size-8" aria-label="Next week" onClick={() => go(addDays(day, 7))}><ChevronRight className="size-4" /></Button>
        <div className="ml-auto flex items-center gap-2">
          {day !== APP_TODAY && <Button size="sm" variant="outline" onClick={() => go(APP_TODAY)}>Today</Button>}
          <Input type="date" className="h-8 w-[150px] text-sm" value={day} onChange={event => go(event.target.value)} aria-label="Go to date" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Day">
        {week.map(iso => (
          <button key={iso} type="button" role="tab" aria-selected={day === iso} onClick={() => go(iso)}
            className={cn("flex min-w-0 flex-col items-center rounded-xl py-1.5 transition-colors", day === iso ? "bg-foreground text-background" : "hover:bg-surface", iso < APP_TODAY && day !== iso && "text-muted")}>
            <span className={cn("text-[10px] uppercase tracking-wide sm:text-[11px]", day === iso ? "opacity-70" : "text-muted")}>{iso === APP_TODAY ? "Today" : label(iso, { weekday: "short" })}</span>
            <strong className="text-base tabular-nums">{label(iso, { day: "numeric" })}</strong>
          </button>
        ))}
      </div>
    </div>
    {past && <p className="mb-4 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-muted" data-enter><Lock className="size-4" />{formatAppDate(day)} has passed. This is who covered each post; past rosters can&apos;t be changed.</p>}

    <StatStrip items={[
      { icon: UserRoundPlus, value: `${filledSlots}/${totalSlots}`, label: "Slots filled", note: `${posts.length} posts on this roster`, onClick: () => setFilter("all"), actionLabel: "Show all posts", active: filter === "all" },
      { icon: UserMinus, value: String(openCount), label: "Need cover", note: "Empty slot or guard on leave", tone: openCount ? "red" : "green", onClick: () => toggle("open"), actionLabel: "Show posts that need cover", active: filter === "open" },
      { icon: Sun, value: String(posts.filter(post => post.shift === "Day").length), label: "Day posts", note: "08:00–20:00", onClick: () => toggle("Day"), actionLabel: "Show day posts", active: filter === "Day" },
      { icon: Moon, value: String(posts.filter(post => post.shift === "Night").length), label: "Night posts", note: "20:00–08:00", onClick: () => toggle("Night"), actionLabel: "Show night posts", active: filter === "Night" },
    ]} />

    <ListFilterRow>
      <FilterChips<PostFilter> options={[{ id: "all", label: "All posts" }, { id: "open", label: `Need cover (${openCount})` }, { id: "Day", label: "Day" }, { id: "Night", label: "Night" }]} value={filter} onChange={setFilter} />
    </ListFilterRow>

    <div className="mb-4 grid gap-3">
      {visible.length === 0 && <Panel><EmptyState icon={CalendarDays} message="No posts match this filter." /></Panel>}
      {visible.map(post => (
        <section key={post.id} className={cn("rounded-2xl border bg-card p-4 shadow-sm", isOpen(post) ? "border-status-danger/30" : "border-border")} data-enter>
          <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{post.site} · {post.post}</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted">{post.shift === "Day" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}{post.shift} shift · {post.hours} · {post.slots.length} {post.slots.length === 1 ? "guard" : "guards"} needed</p>
            </div>
            <StatusChip tone={isOpen(post) ? "danger" : "success"}>{isOpen(post) ? "Needs cover" : "Covered"}</StatusChip>
          </header>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {post.slots.map((id, slot) => {
              const guard = id ? person(id) : undefined;
              const away = !!id && onLeave(id, day);
              const active = picking?.postId === post.id && picking.slot === slot;
              if (!guard) {
                if (past) return <div key={slot} className="flex min-h-[60px] items-center justify-center rounded-xl border border-dashed border-status-danger/40 text-sm text-status-danger">Not covered</div>;
                return <button key={slot} type="button" onClick={() => setPicking(active ? null : { postId: post.id, slot })}
                  className={cn("flex min-h-[60px] items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium transition-colors",
                    active ? "border-foreground bg-surface" : "border-status-danger/50 text-status-danger hover:bg-status-danger/5")}>
                  <UserRoundPlus className="size-4" />{active ? "Choosing a reliever…" : "Fill this slot"}
                </button>;
              }
              return <div key={slot} className={cn("flex min-h-[60px] items-center gap-3 rounded-xl border px-3 py-2", active ? "border-foreground bg-surface" : away ? "border-status-warn/50 bg-status-warn/5" : "border-border")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold ring-1 ring-border">{guard.initials}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-medium">{guard.name}</b>
                  <small className={cn("block truncate text-xs", away ? "font-medium text-status-warn" : "text-muted")}>{away ? "On leave · replace" : `${guard.role}${guard.status === "Reliever" ? " · reliever" : ""}`}</small>
                </span>
                {guard.phone && <CallButton phone={guard.phone} name={guard.name} />}
                {!past && <Button size="sm" variant={away ? "default" : "outline"} onClick={() => setPicking(active ? null : { postId: post.id, slot })}>{active ? "Cancel" : "Replace"}</Button>}
                {!past && <Button size="icon" variant="ghost" className="size-8 text-muted hover:text-status-danger" title={`Remove ${guard.name} from this post`} aria-label={`Remove ${guard.name} from this post`} onClick={() => update(post.id, slot, null)}><X className="size-4" /></Button>}
              </div>;
            })}
            {!past && <button type="button" onClick={() => addSlot(post.id)} className="flex min-h-[60px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs text-muted transition-colors hover:bg-surface hover:text-foreground">
              <Plus className="size-3.5" />Add a slot
            </button>}
          </div>

          {picking?.postId === post.id && <RelieverPicker post={post} slot={picking.slot} busy={busy}
            onPick={id => update(post.id, picking.slot, id)} onClose={() => setPicking(null)} />}
        </section>
      ))}
    </div>

    <SplitLayout>
      <Panel title="Recent guard changes" description={`Every change notifies the site's ${ROLE_TERMS.fieldOfficer.toLowerCase()}.`}>
        {changes.length === 0 && <p className="text-sm text-muted">No guard changes recorded.</p>}
        {changes.slice(0, 6).map(change => (
          <ListRow key={change.id}>
            <div className="min-w-[140px] flex-1"><strong className="block text-sm font-medium">{change.site}</strong><small className="text-xs text-muted">{change.post}</small></div>
            <span className="flex-1 text-sm">{change.outgoing} <ArrowRight className="inline size-3.5 text-muted" /> <strong>{change.incoming}</strong></span>
            <span className="font-mono text-xs text-muted">{change.at}</span>
          </ListRow>
        ))}
      </Panel>
      <Panel title="24-hour pair" description="One duty per day, split between two guards.">
        <p className="text-sm">Suresh Babu and Rajeev Kumar share one 24-hour post. A 31-day month splits 16 and 15; the extra duty alternates next month.</p>
        <Button variant="outline" className="mt-3 w-full" onClick={() => setRotationOpen(true)}>View rotation calendar</Button>
      </Panel>
    </SplitLayout>
    {rotationOpen && <RotationDrawer onClose={() => setRotationOpen(false)} />}
  </>;
}

/** Inline, ranked list of relievers for one slot. Opens under the post it belongs to. */
function RelieverPicker({ post, slot, busy, onPick, onClose }: { post: Post; slot: number; busy: Map<string, string>; onPick: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [showBusy, setShowBusy] = useState(false);
  const replacing = post.slots[slot] ? person(post.slots[slot]!) : undefined;
  const { ratings } = useOps();
  const matches = rankRelievers({ site: post.site, shift: post.shift, busy, ratings });
  const q = query.trim().toLowerCase();
  const shown = matches.filter(match => (showBusy || !match.unavailable) && (!q || match.employee.name.toLowerCase().includes(q)));
  const hiddenBusy = matches.filter(match => match.unavailable).length;

  return <div className="relative mt-3 rounded-xl border border-border bg-surface/60 p-3">
    <Button size="icon" variant="ghost" className="absolute right-2 top-2 size-8" aria-label="Close" onClick={onClose}><X className="size-4" /></Button>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1 pr-9 sm:pr-0">
        <p className="text-sm font-semibold">{replacing ? `Replace ${replacing.name}` : `Fill slot ${slot + 1}`}</p>
        <p className="text-xs text-muted">Best fit first: HR rating, distance from home, preferred district and preferred shift.</p>
      </div>
      <div className="relative w-full sm:mr-9 sm:w-56">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        <Input className="h-9 pl-8" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search relievers" aria-label="Search relievers" />
      </div>
    </div>

    <ol className="grid gap-1.5">
      {shown.length === 0 && <li className="p-3 text-center text-sm text-muted">No relievers match.</li>}
      {shown.map((match, index) => <MatchRow key={match.employee.id} match={match} best={index === 0 && !match.unavailable && !q} onPick={() => onPick(match.employee.id)} />)}
    </ol>
    {hiddenBusy > 0 && <button type="button" className="mt-2 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline" onClick={() => setShowBusy(!showBusy)}>
      {showBusy ? "Hide unavailable relievers" : `Show ${hiddenBusy} unavailable ${hiddenBusy === 1 ? "reliever" : "relievers"}`}
    </button>}
  </div>;
}

function MatchRow({ match, best, onPick }: { match: RelieverMatch; best: boolean; onPick: () => void }) {
  const { employee, score, reasons, unavailable } = match;
  return <li className={cn("flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2", best ? "border-emerald/50" : "border-border", unavailable && "opacity-60")}>
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold ring-1 ring-border">{employee.initials}</span>
    <span className="min-w-[150px] flex-1">
      <b className="flex items-center gap-2 text-sm font-medium">{employee.name}{best && <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">Best fit</span>}</b>
      <span className="mt-1 flex flex-wrap gap-1">
        {unavailable
          ? <span className="text-xs text-muted">{unavailable}</span>
          : reasons.map(reason => <span key={reason.label} className={cn("rounded px-1.5 py-0.5 text-[11px]", reason.good ? "bg-emerald/10 text-emerald" : "bg-surface text-muted")}>{reason.label}</span>)}
      </span>
    </span>
    <span className="hidden w-24 sm:block" title={`Match score ${score} of 100`}>
      <span className="flex justify-between text-[10px] text-muted"><span>Match</span><span className="tabular-nums">{score}</span></span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-foreground/70" style={{ width: `${score}%` }} /></span>
    </span>
    <span className="flex w-full items-center justify-end gap-2 sm:w-auto">
      <span className="mr-auto text-sm tabular-nums sm:mr-0 sm:w-20 sm:text-right">{rupees(employee.dailyRate ?? 0)}<small className="text-[10px] text-muted sm:block"> per duty</small></span>
      {employee.phone && <CallButton phone={employee.phone} name={employee.name} />}
      <Button size="sm" disabled={!!unavailable} onClick={onPick}>Assign</Button>
    </span>
  </li>;
}
