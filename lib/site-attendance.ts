import { APP_TODAY } from "@/lib/app-date";
import { employees } from "@/lib/mock-data";
import type { Site } from "@/types/domain";

export type ShiftState = "on-time" | "late" | "left-early" | "reliever" | "absent" | "on-duty" | "scheduled";

/** One guard's shift at a site. Times are absolute minutes from 1970-01-01 (UTC calendar, no time zone maths). */
export type SiteShift = {
  id: string;
  empId: string;
  name: string;
  role: string;
  post: string;
  /** Planned shift window. */
  plannedStart: number;
  plannedEnd: number;
  /** Actual punch-in / punch-out. Missing when absent or not started; `actualEnd` missing while still on duty. */
  actualStart?: number;
  actualEnd?: number;
  state: ShiftState;
  /** Set when a reliever covered someone else's shift. */
  coveringFor?: string;
};

/** Demo clock: the app's "now" is 09:24 on APP_TODAY. */
export const NOW_MINUTES = 9 * 60 + 24;

export const dayStart = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 60000;
export const nowAbs = () => dayStart(APP_TODAY) + NOW_MINUTES;

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string) {
  const weekday = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(iso, -weekday);
}

export function clock(abs: number) {
  const mins = ((Math.round(abs) % 1440) + 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function duration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const fillerNames = [
  "Arun Prakash", "Bindu Raj", "Cyril Mathew", "Dileep Kumar", "Eldho Paul", "Faisal K",
  "Gireesh N", "Hashim A", "Ignatius V", "Jayan S", "Kiran Babu", "Lijo George",
];

type RosterEntry = { empId: string; name: string; role: string; post: string; start: number; end: number };

/** Guards regularly posted at a site: assigned employees first, topped up with demo names. Day shifts 08–20, night 20–08. */
export function siteRoster(site: Site): RosterEntry[] {
  const size = Math.min(Math.max(site.staffed, 2), 6);
  const assigned = employees.filter(employee => employee.site === site.name && employee.status !== "Reliever");
  const people = assigned.map(employee => ({ empId: employee.id, name: employee.name, role: employee.role, night: employee.shift === "Night" }));
  let n = 0;
  while (people.length < size && n < 100) {
    const name = fillerNames[Math.floor(hash(site.name + n) * fillerNames.length)];
    if (!people.some(person => person.name === name)) people.push({ empId: `BMG-${3000 + Math.floor(hash(name + site.name) * 900)}`, name, role: "Security Officer", night: people.length % 2 === 1 });
    n++;
  }
  return people.slice(0, size).map((person, index) => ({
    empId: person.empId,
    name: person.name,
    role: person.role,
    post: `${person.night ? "Night" : "Day"} post ${Math.floor(index / 2) + 1}`,
    start: person.night ? 20 * 60 : 8 * 60,
    end: person.night ? 32 * 60 : 20 * 60,
  }));
}

const relievers = employees.filter(employee => employee.status === "Reliever");

/** Shifts that start on any day from `from` to `to` (inclusive). Seeded per site and day, so the same week always looks the same. */
export function siteShifts(site: Site, from: string, to: string): SiteShift[] {
  const roster = siteRoster(site);
  const now = nowAbs();
  const shifts: SiteShift[] = [];
  for (let iso = from; iso <= to; iso = addDays(iso, 1)) {
    const base = dayStart(iso);
    roster.forEach((guard, index) => {
      const r = (salt: string) => hash(`${site.name}|${guard.empId}|${iso}|${salt}`);
      const plannedStart = base + guard.start;
      const plannedEnd = base + guard.end;
      const weekday = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
      const offDay = weekday === (index * 3) % 7;
      const reliever = relievers[Math.floor(r("reliever") * relievers.length)];
      const who = offDay && reliever
        ? { empId: reliever.id, name: reliever.name, role: "Reliever", coveringFor: guard.name }
        : { empId: guard.empId, name: guard.name, role: guard.role };
      const shift: SiteShift = { id: `${guard.empId}-${iso}`, post: guard.post, plannedStart, plannedEnd, state: "scheduled", ...who };

      if (plannedStart > now) { shifts.push(shift); return; }
      if (!offDay && r("absent") < 0.06) { shifts.push({ ...shift, state: "absent" }); return; }

      const late = r("late") < 0.12;
      const actualStart = late ? plannedStart + site.graceMins + 1 + Math.floor(r("lateBy") * 30) : plannedStart - Math.floor(r("early") * 15);
      const leftEarly = !late && r("leave") < 0.05;
      const actualEnd = leftEarly ? plannedEnd - 60 - Math.floor(r("leaveBy") * 60) : plannedEnd + Math.floor(r("over") * 20);
      if (actualStart > now) { shifts.push(shift); return; }
      if (actualEnd > now) { shifts.push({ ...shift, actualStart, state: "on-duty" }); return; }
      shifts.push({ ...shift, actualStart, actualEnd, state: offDay ? "reliever" : late ? "late" : leftEarly ? "left-early" : "on-time" });
    });
  }
  return shifts;
}

export const shiftStateLabel: Record<ShiftState, string> = {
  "on-time": "On time",
  late: "Late",
  "left-early": "Left early",
  reliever: "Reliever cover",
  absent: "Absent",
  "on-duty": "On duty now",
  scheduled: "Scheduled",
};
