import { employees, sites, complaints, tickets } from "@/lib/mock-data";
import type { AppView } from "@/types/domain";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  view: AppView;
  group: string;
};

const navTargets: SearchResult[] = [
  { id: "nav-dashboard", title: "Dashboard", subtitle: "Operations overview", view: "dashboard", group: "Navigate" },
  { id: "nav-workforce", title: "Employees", subtitle: "Employee directory", view: "workforce", group: "Navigate" },
  { id: "nav-payroll", title: "Payroll runs", subtitle: "Monthly payroll", view: "payroll", group: "Navigate" },
  { id: "nav-attendance", title: "Attendance", subtitle: "Live board", view: "attendance", group: "Navigate" },
];

export function searchApp(query: string, canOpen: (v: AppView) => boolean): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const fromEmployees = employees
    .filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.site.toLowerCase().includes(q))
    .map(e => ({
      id: `emp-${e.id}`,
      title: e.name,
      subtitle: `${e.id} · ${e.site}`,
      view: "workforce" as AppView,
      group: "Employees",
    }));

  const fromSites = sites
    .filter(s => s.name.toLowerCase().includes(q) || s.client.toLowerCase().includes(q))
    .map(s => ({
      id: `site-${s.name}`,
      title: s.name,
      subtitle: s.client,
      view: "sites" as AppView,
      group: "Sites",
    }));

  const fromComplaints = complaints
    .filter(c => c.id.toLowerCase().includes(q) || c.client.toLowerCase().includes(q))
    .map(c => ({
      id: `cmp-${c.id}`,
      title: c.id,
      subtitle: `${c.client} · ${c.state}`,
      view: "complaints" as AppView,
      group: "Complaints",
    }));

  const fromTickets = tickets
    .filter(t => t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
    .map(t => ({
      id: `tkt-${t.id}`,
      title: t.id,
      subtitle: t.subject,
      view: "tickets" as AppView,
      group: "Tickets",
    }));

  const fromNav = navTargets.filter(
    n => n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q),
  );

  return [...fromEmployees, ...fromSites, ...fromComplaints, ...fromTickets, ...fromNav]
    .filter(r => canOpen(r.view))
    .slice(0, 12);
}
