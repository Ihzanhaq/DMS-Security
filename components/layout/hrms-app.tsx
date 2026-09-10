"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bell, Buildings, CalendarCheck, CaretDown, ChartBar, ClipboardText, ClockCountdown,
  FileText, GearSix, HandCoins, House, IdentificationBadge, List, MagnifyingGlass,
  MapPin, Moon, Package, Plus, ShieldCheck, Sun, UploadSimple, UserFocus,
  UsersThree, Wallet, WarningCircle, X,
} from "@phosphor-icons/react";
import gsap from "gsap";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { WorkforceScreen } from "@/features/workforce/workforce-screen";
import { AttendanceScreen, DeploymentScreen, InspectionsScreen, SitesScreen } from "@/features/operations/operations-screens";
import { AdvancesScreen, PayrollScreen, UniformsScreen } from "@/features/payroll/payroll-screens";
import { ComplaintsScreen, ImportsScreen, ReportsScreen, SettingsScreen, SopsScreen } from "@/features/compliance/compliance-screens";
import { ClientPortal, GuardPortal } from "@/features/portals/portal-screens";
import {
  ActionCentreScreen, DetailedWorkflowScreen, EmployeeFormScreen, ExitClearanceScreen,
  NightVigilanceScreen, PayrollAllocationScreen, PenaltiesScreen, SiteConfigurationScreen,
} from "@/features/workflows/workflow-screens";
import { ToastProvider, useToast } from "@/components/shared/toast-context";
import type { AppView, Role } from "@/types/domain";

type IconComponent = typeof House;
type NavItem = { label: string; view: AppView; icon: IconComponent; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const internalNavigation: NavGroup[] = [
  { label: "Workspace", items: [
    { label: "Overview", view: "dashboard", icon: House },
    { label: "Workforce", view: "workforce", icon: UsersThree },
    { label: "Sites & posts", view: "sites", icon: Buildings },
    { label: "Deployment", view: "deployment", icon: IdentificationBadge },
    { label: "Attendance", view: "attendance", icon: CalendarCheck, badge: "7" },
    { label: "Night checks", view: "night-vigilance", icon: ClockCountdown, badge: "6" },
  ]},
  { label: "Finance", items: [
    { label: "Payroll", view: "payroll", icon: Wallet },
    { label: "Advances", view: "advances", icon: HandCoins },
    { label: "Uniforms", view: "uniforms", icon: Package },
    { label: "Penalties", view: "penalties", icon: WarningCircle },
  ]},
  { label: "Compliance", items: [
    { label: "Inspections", view: "inspections", icon: UserFocus },
    { label: "Complaints", view: "complaints", icon: WarningCircle, badge: "4" },
    { label: "Site SOPs", view: "sops", icon: FileText },
    { label: "Exit clearances", view: "exit-clearance", icon: IdentificationBadge, badge: "3" },
    { label: "Reports", view: "reports", icon: ChartBar },
  ]},
  { label: "Manage", items: [
    { label: "Import centre", view: "imports", icon: UploadSimple },
    { label: "Settings", view: "settings", icon: GearSix },
  ]},
];

const guardNavigation: NavGroup[] = [{ label: "My workspace", items: [
  { label: "Home", view: "guard-home", icon: House },
  { label: "Attendance", view: "guard-punch", icon: MapPin },
  { label: "Schedule", view: "guard-schedule", icon: CalendarCheck },
  { label: "Leave", view: "guard-leave", icon: ClipboardText },
  { label: "Advance", view: "guard-advance", icon: HandCoins },
  { label: "Payslips", view: "guard-payslips", icon: Wallet },
  { label: "Site SOPs", view: "guard-sops", icon: FileText },
  { label: "Night check", view: "guard-vigilance", icon: ClockCountdown },
  { label: "Profile", view: "guard-profile", icon: IdentificationBadge },
]}];

const clientNavigation: NavGroup[] = [{ label: "Client portal", items: [
  { label: "Overview", view: "client-home", icon: House },
  { label: "My sites", view: "client-sites", icon: Buildings },
  { label: "Complaints", view: "client-complaints", icon: WarningCircle },
  { label: "Coverage", view: "client-coverage", icon: ChartBar },
]}];

const roleDefaults: Record<Role, AppView> = {
  Owner: "dashboard",
  "HR & Payroll": "workforce",
  "District Operations": "deployment",
  "Field Officer": "inspections",
  Guard: "guard-home",
  Client: "client-home",
};

const roleNames: Record<Role, { name: string; initials: string }> = {
  Owner: { name: "Arun Kumar", initials: "AK" },
  "HR & Payroll": { name: "Meera Nair", initials: "MN" },
  "District Operations": { name: "Nithin Joseph", initials: "NJ" },
  "Field Officer": { name: "Ajmal Khan", initials: "AK" },
  Guard: { name: "Suresh Babu", initials: "SB" },
  Client: { name: "Lulu Group", initials: "LG" },
};

const allowedInternalViews: Record<Exclude<Role, "Guard" | "Client">, AppView[]> = {
  Owner: [...internalNavigation.flatMap(group => group.items.map(item => item.view)), "employee-form", "site-config", "assignment-form", "attendance-correction", "payroll-allocation", "uniform-issue", "inspection-form", "complaint-form", "sop-form", "action-centre"],
  "HR & Payroll": ["dashboard", "workforce", "employee-form", "attendance", "attendance-correction", "payroll", "payroll-allocation", "advances", "uniforms", "uniform-issue", "penalties", "exit-clearance", "complaints", "complaint-form", "reports", "imports", "settings", "action-centre"],
  "District Operations": ["dashboard", "workforce", "sites", "site-config", "deployment", "assignment-form", "attendance", "attendance-correction", "night-vigilance", "inspections", "inspection-form", "complaints", "complaint-form", "sops", "sop-form", "reports", "action-centre"],
  "Field Officer": ["dashboard", "sites", "deployment", "attendance", "night-vigilance", "inspections", "inspection-form", "complaints", "complaint-form", "sops", "action-centre"],
};

export function HrmsApp() {
  return <ToastProvider><HrmsShell /></ToastProvider>;
}

function HrmsShell() {
  const [role, setRole] = useState<Role>("Owner");
  const [view, setView] = useState<AppView>("dashboard");
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const notify = useToast();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem("bmg-theme");
      setDark(savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches));
      const params = new URLSearchParams(window.location.search);
      const initialRole = params.get("role") as Role | null;
      if (initialRole && initialRole in roleDefaults) {
        setRole(initialRole);
        const requestedView = params.get("view") as AppView | null;
        const roleAllowsView = requestedView && (
          (initialRole === "Guard" && requestedView.startsWith("guard-")) ||
          (initialRole === "Client" && requestedView.startsWith("client-")) ||
          (initialRole !== "Guard" && initialRole !== "Client" && allowedInternalViews[initialRole].includes(requestedView))
        );
        setView(roleAllowsView && requestedView ? requestedView : roleDefaults[initialRole]);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const context = gsap.context(() => {
      gsap.from("[data-enter]", { y: 10, opacity: 0, duration: .34, stagger: .025, ease: "power2.out" });
    }, contentRef);
    return () => context.revert();
  }, [view, role]);

  // Overlays render outside `.app`, so the theme flag also lives on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const groups = useMemo(() => {
    if (role === "Guard") return guardNavigation;
    if (role === "Client") return clientNavigation;
    return internalNavigation
      .map(group => ({ ...group, items: group.items.filter(item => allowedInternalViews[role].includes(item.view)) }))
      .filter(group => group.items.length);
  }, [role]);

  const navigate = (nextView: string) => {
    setView(nextView as AppView);
    setMobileOpen(false);
    setNotificationsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.replaceState({}, "", url);
  };

  const changeRole = (nextRole: Role) => {
    setRole(nextRole);
    setView(roleDefaults[nextRole]);
    const url = new URL(window.location.href);
    url.searchParams.set("role", nextRole);
    url.searchParams.set("view", roleDefaults[nextRole]);
    window.history.replaceState({}, "", url);
    notify(`Switched to ${nextRole} workspace`);
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("bmg-theme", next ? "dark" : "light");
  };

  const openAction = (name: string) => setQuickAction(name);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!search.trim()) return;
    notify(`Searching for “${search.trim()}”`);
  };

  return (
    <div className={dark ? "app dark" : "app"}>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand" aria-label="BMG Security">
          <span className="brand-mark"><ShieldCheck weight="fill" /></span>
          <span><strong>BMG</strong><small>Security</small></span>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
        </div>
        <label className="profile-card">
          <span className="avatar">{roleNames[role].initials}</span>
          <span className="profile-copy"><strong>{roleNames[role].name}</strong><span>{role}</span></span>
          <CaretDown size={14} />
          <select value={role} onChange={event => changeRole(event.target.value as Role)} aria-label="Switch workspace role">
            {(Object.keys(roleDefaults) as Role[]).map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <nav aria-label="Main navigation" className="sidebar-nav">
          {groups.map(group => <div className="nav-group" key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map(item => <button className={view === item.view ? "nav-item active" : "nav-item"} key={item.view} onClick={() => navigate(item.view)}>
              <item.icon size={20} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}
            </button>)}
          </div>)}
        </nav>
        <button className="sidebar-foot" onClick={() => navigate(role === "Guard" ? "guard-punch" : role === "Client" ? "client-complaints" : "action-centre")}>
          <span className="support-icon"><WarningCircle size={19} /></span>
          <span><strong>Need attention</strong><small>{role === "Client" ? "1 request awaiting update" : "3 payroll exceptions"}</small></span>
        </button>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><List /></button>
          <form className="search" onSubmit={submitSearch}>
            <MagnifyingGlass size={18} /><input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search" placeholder="Search employees, sites, clients" />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="top-actions">
            <button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
            <div className="notification-anchor">
              <button className="icon-button has-dot" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications"><Bell size={20} /></button>
              {notificationsOpen && <div className="notification-popover">
                <header><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X /></button></header>
                <button onClick={() => navigate("attendance")}><WarningCircle /><span><strong>7 late check-ins</strong><small>Attendance · 6 minutes ago</small></span></button>
                <button onClick={() => navigate("complaints")}><ClipboardText /><span><strong>Complaint SLA due soon</strong><small>CL-1082 · 24 minutes ago</small></span></button>
                <button onClick={() => navigate("payroll")}><Wallet /><span><strong>Payroll exceptions ready</strong><small>August 2026 · Today</small></span></button>
              </div>}
            </div>
            <button className="primary-button quick-action-button" onClick={() => openAction("Quick action")}>Quick action <CaretDown size={14} /></button>
          </div>
        </header>

        <div className="page" ref={contentRef}>
          {renderView(view, role, navigate, openAction)}
        </div>
      </main>

      {quickAction && <ActionModal title={quickAction} onClose={() => setQuickAction(null)} onComplete={message => { setQuickAction(null); notify(message); }} />}
    </div>
  );
}

function renderView(view: AppView, role: Role, navigate: (view: string) => void, openAction: (name: string) => void) {
  if (view === "guard-vigilance") return <NightVigilanceScreen guardMode onBack={() => navigate("guard-home")} />;
  if (view.startsWith("guard-")) return <GuardPortal view={view} onNavigate={next => navigate(next)} />;
  if (view.startsWith("client-")) return <ClientPortal view={view} onNavigate={next => navigate(next)} />;
  switch (view) {
    case "dashboard": return <DashboardScreen onNavigate={navigate} />;
    case "workforce": return <WorkforceScreen onNavigate={navigate} onCreate={() => navigate("employee-form")} onEdit={() => navigate("employee-form")} />;
    case "sites": return <SitesScreen onCreate={() => navigate("site-config")} onConfigure={() => navigate("site-config")} />;
    case "deployment": return <DeploymentScreen onAssign={() => navigate("assignment-form")} />;
    case "attendance": return <AttendanceScreen onCorrect={() => navigate("attendance-correction")} />;
    case "payroll": return <PayrollScreen onAllocation={() => navigate("payroll-allocation")} />;
    case "advances": return <AdvancesScreen onCreate={() => openAction("Salary advance")} />;
    case "uniforms": return <UniformsScreen onIssue={() => navigate("uniform-issue")} onImport={() => navigate("imports")} />;
    case "inspections": return <InspectionsScreen onLog={() => navigate("inspection-form")} />;
    case "complaints": return <ComplaintsScreen onCreate={() => navigate("complaint-form")} />;
    case "sops": return <SopsScreen onCreate={() => navigate("sop-form")} />;
    case "reports": return <ReportsScreen />;
    case "imports": return <ImportsScreen />;
    case "settings": return <SettingsScreen />;
    case "employee-form": return <EmployeeFormScreen onBack={() => navigate("workforce")} onImport={() => navigate("imports")} />;
    case "site-config": return <SiteConfigurationScreen onBack={() => navigate("sites")} />;
    case "payroll-allocation": return <PayrollAllocationScreen onBack={() => navigate("payroll")} />;
    case "night-vigilance": return <NightVigilanceScreen onBack={() => navigate("dashboard")} />;
    case "exit-clearance": return <ExitClearanceScreen onBack={() => navigate("workforce")} />;
    case "penalties": return <PenaltiesScreen onBack={() => navigate("payroll")} />;
    case "action-centre": return <ActionCentreScreen onBack={() => navigate("dashboard")} />;
    case "assignment-form": return <DetailedWorkflowScreen kind="assignment" onBack={() => navigate("deployment")} />;
    case "attendance-correction": return <DetailedWorkflowScreen kind="attendance" onBack={() => navigate("attendance")} />;
    case "uniform-issue": return <DetailedWorkflowScreen kind="uniform" onBack={() => navigate("uniforms")} />;
    case "inspection-form": return <DetailedWorkflowScreen kind="inspection" onBack={() => navigate("inspections")} />;
    case "complaint-form": return <DetailedWorkflowScreen kind="complaint" onBack={() => navigate(role === "Client" ? "client-complaints" : "complaints")} />;
    case "sop-form": return <DetailedWorkflowScreen kind="sop" onBack={() => navigate("sops")} />;
    default: return <DashboardScreen onNavigate={navigate} />;
  }
}

function ActionModal({ title, onClose, onComplete }: { title: string; onClose: () => void; onComplete: (message: string) => void }) {
  const [action, setAction] = useState(title === "Quick action" ? "Add employee" : title);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onComplete(`${action} saved in prototype mode`);
  };
  return <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
    <section className="action-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><p>New record</p><h2>{action}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
      <form onSubmit={submit}>
        {title === "Quick action" && <label><span>Action type</span><select value={action} onChange={event => setAction(event.target.value)}><option>Add employee</option><option>Manual attendance</option><option>Log complaint</option><option>Issue uniform kit</option></select></label>}
        <label><span>{action.includes("employee") ? "Employee name" : action.includes("site") ? "Site name" : "Employee or site"}</span><input required placeholder="Start typing to search" /></label>
        <label><span>Effective date</span><input required type="date" defaultValue="2026-09-10" /></label>
        <label><span>Notes</span><textarea placeholder="Add useful context for the team" rows={3} /></label>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Plus />Save record</button></footer>
      </form>
    </section>
  </div>;
}
