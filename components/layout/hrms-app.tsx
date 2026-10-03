"use client";

import { FormEvent, type MouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsLeftRight, Bell, Buildings, CalendarCheck, CaretDown, ChartBar, ChatCircleText, ClipboardText, ClockCountdown,
  Coins, FileText, GearSix, HandCoins, House, IdentificationBadge, List, LockSimple, MagnifyingGlass,
  MapPin, Moon, Package, Plus, ShieldCheck, Star, Sun, UploadSimple, UserFocus, UserGear,
  UsersThree, Wallet, WarningCircle, X,
} from "@phosphor-icons/react";
import gsap from "gsap";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { WorkforceScreen } from "@/features/workforce/workforce-screen";
import { AttendanceScreen, DeploymentScreen, DutyChangesScreen, InspectionsScreen, SitesScreen } from "@/features/operations/operations-screens";
import { AdvancesScreen, PayrollScreen, SparePaymentsScreen, UniformsScreen } from "@/features/payroll/payroll-screens";
import { ComplaintsScreen, ImportsScreen, ReportsScreen, SettingsScreen, SopsScreen } from "@/features/compliance/compliance-screens";
import { TicketsScreen } from "@/features/compliance/tickets-screen";
import { AnalyticsScreen } from "@/features/reports/analytics-screens";
import { ClientPortal, GuardPortal, type GuardUser } from "@/features/portals/portal-screens";
import {
  ActionCentreScreen, DetailedWorkflowScreen, EmployeeFormScreen, ExitClearanceScreen,
  NightVigilanceScreen, PayrollAllocationScreen, PenaltiesScreen, SiteConfigurationScreen,
} from "@/features/workflows/workflow-screens";
import { AccessScreen } from "@/features/access/access-screen";
import { AccessProvider, useAccess } from "@/components/shared/access-context";
import { OnboardingProvider, useOnboarding } from "@/components/shared/onboarding-context";
import { OpsProvider } from "@/components/shared/ops-context";
import { ToastProvider, useToast } from "@/components/shared/toast-context";
import { HrQualityScreen, RecruitmentScreen } from "@/features/hr/hr-quality-screens";
import { guardChanges, satisfactionCalls, spareDutyPayments } from "@/lib/mock-data";
import { deriveNotifications } from "@/lib/notifications";
import { effectivePermissions, landingView, type AccessRole } from "@/lib/access";
import type { AppNotification, AppView } from "@/types/domain";

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
    { label: "Duty changes", view: "duty-changes", icon: ArrowsLeftRight, badge: "2" },
  ]},
  { label: "Finance", items: [
    { label: "Payroll", view: "payroll", icon: Wallet },
    { label: "Advances", view: "advances", icon: HandCoins },
    { label: "Spare payments", view: "spare-payments", icon: Coins },
    { label: "Uniforms", view: "uniforms", icon: Package },
    { label: "Penalties & exceptions", view: "penalties", icon: WarningCircle },
  ]},
  { label: "People", items: [
    { label: "HR quality", view: "hr-quality", icon: Star },
    { label: "Recruitment", view: "recruitment", icon: UsersThree },
  ]},
  { label: "Compliance", items: [
    { label: "Inspections", view: "inspections", icon: UserFocus },
    { label: "Complaints", view: "complaints", icon: WarningCircle, badge: "4" },
    { label: "Tickets", view: "tickets", icon: ChatCircleText, badge: "2" },
    { label: "Site SOPs", view: "sops", icon: FileText },
    { label: "Exit clearances", view: "exit-clearance", icon: IdentificationBadge, badge: "3" },
    { label: "Reports", view: "reports", icon: FileText },
    { label: "Analytics", view: "analytics", icon: ChartBar },
  ]},
  { label: "Manage", items: [
    { label: "Import centre", view: "imports", icon: UploadSimple },
    { label: "Users & roles", view: "access", icon: UserGear },
    { label: "Settings", view: "settings", icon: GearSix },
  ]},
];

const guardNavigation: NavGroup[] = [{ label: "My workspace", items: [
  { label: "Home", view: "guard-home", icon: House },
  { label: "Attendance", view: "guard-punch", icon: MapPin },
  { label: "Schedule", view: "guard-schedule", icon: CalendarCheck },
  { label: "Duty change", view: "guard-duty-change", icon: ArrowsLeftRight },
  { label: "Leave", view: "guard-leave", icon: ClipboardText },
  { label: "Advance", view: "guard-advance", icon: HandCoins },
  { label: "Uniform", view: "guard-uniform", icon: Package },
  { label: "Payslips", view: "guard-payslips", icon: Wallet },
  { label: "Site SOPs", view: "guard-sops", icon: FileText },
  { label: "Help & queries", view: "guard-help", icon: ChatCircleText },
  { label: "Night check", view: "guard-vigilance", icon: ClockCountdown },
  { label: "Profile", view: "guard-profile", icon: IdentificationBadge },
]}];

const clientNavigation: NavGroup[] = [{ label: "Client portal", items: [
  { label: "Overview", view: "client-home", icon: House },
  { label: "My sites", view: "client-sites", icon: Buildings },
  { label: "Complaints", view: "client-complaints", icon: WarningCircle },
  { label: "Coverage", view: "client-coverage", icon: ChartBar },
]}];

export function HrmsApp() {
  return <ToastProvider><AccessProvider><OnboardingProvider><OpsProvider><HrmsShell /></OpsProvider></OnboardingProvider></AccessProvider></ToastProvider>;
}

function HrmsShell() {
  const { users, roles, currentUser, currentRole, canOpen, canEdit, landing, signInAs } = useAccess();
  const portal = currentRole.kind;
  const [requestedView, setView] = useState<AppView>("dashboard");
  // A view the user may not open (bookmarked URL, permission just removed) falls back to their landing screen.
  const view = canOpen(requestedView) ? requestedView : landing;
  const readOnly = portal === "internal" && !canEdit(view);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [allocationEmployeeId, setAllocationEmployeeId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [siteInitialTab, setSiteInitialTab] = useState<"profile"|"salary">("profile");
  const [guestGuard, setGuestGuard] = useState<GuardUser | null>(null);
  const activeGuard: GuardUser = guestGuard ?? { id: currentUser.employeeId ?? currentUser.id, name: currentUser.name, initials: currentUser.initials };
  const [search, setSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const notify = useToast();
  const onboarding = useOnboarding();
  const notifications = useMemo(() => {
    if (portal !== "internal") return [];
    const derived = deriveNotifications({
      today: "2026-09-22",
      employees: onboarding.allProfiles.map(item => ({ id: item.employeeId, name: item.name, joiningDate: item.profile.joiningDate, pfEsiDataReceived: item.profile.pfEsiDataReceived })),
      documents: onboarding.allProfiles.flatMap(item => item.profile.documents),
      guardChanges, spareDutyPayments, satisfactionCalls, sopEdits: [],
      pfEsiWindowDays: onboarding.config.pfEsiWindowDays,
    });
    const generics: AppNotification[] = [
      { id:"gen-sla", kind:"complaint-sla", title:"Complaint SLA due soon", detail:"CMP-26091 · TCS Technopark · due 16:00", audience:[], targetView:"complaints", at:"2026-09-22" },
      { id:"gen-payroll", kind:"generic", title:"Payroll exceptions ready", detail:"August 2026 · 3 configuration exceptions", audience:[], targetView:"payroll", at:"2026-09-22" },
    ];
    return [...derived, ...generics].filter(item => canOpen(item.targetView));
  }, [portal, canOpen, onboarding]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("bmg-theme");
      setDark(savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches));
      const requested = new URLSearchParams(window.location.search).get("view") as AppView | null;
      if (requested) setView(requested);
    });
    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const context = gsap.context(() => {
      gsap.from("[data-enter]", { y: 10, opacity: 0, duration: .34, stagger: .025, ease: "power2.out" });
    }, contentRef);
    return () => context.revert();
  }, [view, currentUser.id]);

  // Overlays render outside `.app`, so the theme flag also lives on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const groups = useMemo(() => {
    if (portal === "guard") return guardNavigation;
    if (portal === "client") return clientNavigation;
    return internalNavigation
      .map(group => ({ ...group, items: group.items.filter(item => canOpen(item.view)) }))
      .filter(group => group.items.length);
  }, [portal, canOpen]);

  const navigate = (nextView: string) => {
    setView(nextView as AppView);
    setMobileOpen(false);
    setNotificationsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.replaceState({}, "", url);
  };

  const switchUser = (userId: string) => {
    const user = users.find(item => item.id === userId);
    const role = roles.find(item => item.id === user?.roleId);
    if (!user || !role) return;
    signInAs(user.id);
    setGuestGuard(null);
    navigate(landingView(role, effectivePermissions(role, user)));
    notify(`Signed in as ${user.name} · ${role.name}`);
  };

  // View-only screens keep reading and navigation, but block the action buttons.
  const blockReadOnlyActions = (event: MouseEvent<HTMLDivElement>) => {
    if (!readOnly) return;
    const button = (event.target as HTMLElement).closest("button");
    if (!button || button.hasAttribute("data-allow")) return;
    if (button.matches(".primary-button, .secondary-button.compact")) {
      event.preventDefault();
      event.stopPropagation();
      notify("View-only access — ask an administrator for edit rights");
    }
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("bmg-theme", next ? "dark" : "light");
  };

  const openAction = (name: string) => setQuickAction(name);
  const openEmployeeForm = (employeeId:string|null) => { setEditingEmployeeId(employeeId); navigate("employee-form"); };
  const openAllocationAudit = (employeeId?: string) => { setAllocationEmployeeId(employeeId ?? null); navigate("payroll-allocation"); };
  const openSiteConfig = (site:string|null, tab:"profile"|"salary"="profile") => { setSelectedSite(site); setSiteInitialTab(tab); navigate("site-config"); };
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
          <span className="avatar">{portal === "guard" ? activeGuard.initials : currentUser.initials}</span>
          <span className="profile-copy"><strong>{portal === "guard" ? activeGuard.name : currentUser.name}</strong><span>{currentRole.name}</span></span>
          <CaretDown size={14} />
          <select value={currentUser.id} onChange={event => switchUser(event.target.value)} aria-label="Sign in as user">
            {roles.map(role => {
              const members = users.filter(user => user.roleId === role.id && user.status === "active");
              return members.length ? <optgroup key={role.id} label={role.name}>{members.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</optgroup> : null;
            })}
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
        <button className="sidebar-foot" onClick={() => navigate(portal === "guard" ? "guard-punch" : portal === "client" ? "client-complaints" : "action-centre")}>
          <span className="support-icon"><WarningCircle size={19} /></span>
          <span><strong>Need attention</strong><small>{portal === "client" ? "1 request awaiting update" : `${notifications.length} open alerts`}</small></span>
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
              <button className={notifications.length ? "icon-button has-dot" : "icon-button"} onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications"><Bell size={20} /></button>
              {notificationsOpen && <div className="notification-popover">
                <header><strong>Notifications{notifications.length > 0 ? ` · ${notifications.length}` : ""}</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X /></button></header>
                {notifications.length === 0 && <p className="notification-empty">Nothing needs your attention right now.</p>}
                {notifications.slice(0, 8).map(item => <button key={item.id} onClick={() => navigate(item.targetView)}>
                  {item.kind === "spare-duty" || item.kind === "generic" ? <Wallet /> : item.kind === "guard-change" || item.kind === "sop-edited" ? <ClipboardText /> : <WarningCircle />}
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                </button>)}
              </div>}
            </div>
            <button className="primary-button quick-action-button" onClick={() => openAction("Quick action")}>Quick action <CaretDown size={14} /></button>
          </div>
        </header>

        <div className={readOnly ? "page read-only" : "page"} ref={contentRef} onClickCapture={blockReadOnlyActions}>
          {readOnly && <div className="readonly-banner" data-enter><LockSimple /><span><strong>View only.</strong> You can read this screen; changes need edit access to this module.</span></div>}
          {renderView(view, currentRole, navigate, openAction, editingEmployeeId, openEmployeeForm, allocationEmployeeId, openAllocationAudit, selectedSite, openSiteConfig, siteInitialTab, canOpen, onboarding.ready, activeGuard, guard => {
            const registered = users.find(user => user.employeeId === guard.id && user.status === "active");
            if (registered) { signInAs(registered.id); setGuestGuard(null); } else setGuestGuard(guard);
            notify(`Signed in as ${guard.name}`);
            navigate("guard-home");
          })}
        </div>
      </main>

      {quickAction && <ActionModal title={quickAction} onClose={() => setQuickAction(null)} onComplete={message => { setQuickAction(null); notify(message); }} />}
    </div>
  );
}

function renderView(view: AppView, role: AccessRole, navigate: (view: string) => void, openAction: (name: string) => void, editingEmployeeId:string|null, openEmployeeForm:(employeeId:string|null)=>void, allocationEmployeeId:string|null, openAllocationAudit:(employeeId?:string)=>void, selectedSite:string|null, openSiteConfig:(site:string|null,tab?:"profile"|"salary")=>void, siteInitialTab:"profile"|"salary", canOpen:(view:AppView)=>boolean, onboardingReady:boolean, activeGuard?:GuardUser, onSwitchUser?:(user:GuardUser)=>void) {
  if (view === "guard-vigilance") return <NightVigilanceScreen guardMode onBack={() => navigate("guard-home")} />;
  if (view.startsWith("guard-")) return <GuardPortal view={view} onNavigate={next => navigate(next)} activeGuard={activeGuard} onSwitchUser={onSwitchUser} />;
  if (view.startsWith("client-")) return <ClientPortal view={view} onNavigate={next => navigate(next)} />;
  switch (view) {
    case "dashboard": return <DashboardScreen onNavigate={navigate} />;
    case "workforce": return <WorkforceScreen onNavigate={navigate} onCreate={() => openEmployeeForm(null)} onEdit={openEmployeeForm} />;
    case "sites": return <SitesScreen onCreate={() => openSiteConfig(null)} onConfigure={site=>openSiteConfig(site)} />;
    case "deployment": return <DeploymentScreen onAssign={() => navigate("assignment-form")} />;
    case "duty-changes": return <DutyChangesScreen />;
    case "attendance": return <AttendanceScreen onCorrect={() => navigate("attendance-correction")} />;
    case "payroll": return <PayrollScreen onAllocation={openAllocationAudit} />;
    case "advances": return <AdvancesScreen onCreate={() => openAction("Salary advance")} />;
    case "uniforms": return <UniformsScreen onIssue={() => navigate("uniform-issue")} onImport={() => navigate("imports")} />;
    case "inspections": return <InspectionsScreen onLog={() => navigate("inspection-form")} />;
    case "complaints": return <ComplaintsScreen onCreate={() => navigate("complaint-form")} />;
    case "sops": return <SopsScreen onCreate={() => navigate("sop-form")} />;
    case "reports": return <ReportsScreen />;
    case "imports": return <ImportsScreen />;
    case "settings": return <SettingsScreen onOpenAccess={() => navigate("access")} />;
    case "employee-form": return <EmployeeFormScreen key={`${editingEmployeeId ?? "new"}-${onboardingReady}`} employeeId={editingEmployeeId} onBack={() => navigate("workforce")} onImport={() => navigate("imports")} />;
    case "site-config": return <SiteConfigurationScreen role={role.name} siteName={selectedSite} initialTab={siteInitialTab} onBack={() => navigate(canOpen("sites") ? "sites" : "payroll")} />;
    case "payroll-allocation": return <PayrollAllocationScreen employeeId={allocationEmployeeId} onBack={() => navigate("payroll")} />;
    case "night-vigilance": return <NightVigilanceScreen onBack={() => navigate("dashboard")} />;
    case "exit-clearance": return <ExitClearanceScreen onBack={() => navigate("workforce")} />;
    case "penalties": return <PenaltiesScreen onBack={() => navigate("payroll")} />;
    case "spare-payments": return <SparePaymentsScreen />;
    case "hr-quality": return <HrQualityScreen />;
    case "recruitment": return <RecruitmentScreen />;
    case "tickets": return <TicketsScreen />;
    case "analytics": return <AnalyticsScreen />;
    case "access": return <AccessScreen />;
    case "action-centre": return <ActionCentreScreen onBack={() => navigate("dashboard")} />;
    case "assignment-form": return <DetailedWorkflowScreen kind="assignment" onBack={() => navigate("deployment")} />;
    case "attendance-correction": return <DetailedWorkflowScreen kind="attendance" onBack={() => navigate("attendance")} />;
    case "uniform-issue": return <DetailedWorkflowScreen kind="uniform" onBack={() => navigate("uniforms")} />;
    case "inspection-form": return <DetailedWorkflowScreen kind="inspection" onBack={() => navigate("inspections")} />;
    case "complaint-form": return <DetailedWorkflowScreen kind="complaint" onBack={() => navigate(role.kind === "client" ? "client-complaints" : "complaints")} />;
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
