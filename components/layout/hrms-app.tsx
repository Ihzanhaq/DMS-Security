"use client";

import { type MouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Lock, Plus } from "lucide-react";
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
import { ConfirmProvider } from "@/components/ui-kit";
import { HrQualityScreen, RecruitmentScreen } from "@/features/hr/hr-quality-screens";
import { complaints, dutyChangeRequests, guardChanges, satisfactionCalls, spareDutyPayments, tickets } from "@/lib/mock-data";
import { deriveNotifications } from "@/lib/notifications";
import { effectivePermissions, landingView, type AccessRole } from "@/lib/access";
import { APP_TODAY } from "@/lib/app-date";
import { clientMobileNav, clientModule, guardMobileNav, guardModule, internalMobileNav, internalModules, parentView, type NavModule } from "@/lib/nav-config";
import type { AppNotification, AppView } from "@/types/domain";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { GlobalSearch } from "./global-search";
import { BottomNav } from "./bottom-nav";
import { CreateMenu } from "./create-menu";
import { FAB } from "@/components/ui-kit";

export function HrmsApp() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AccessProvider>
          <OnboardingProvider>
            <OpsProvider>
              <HrmsShell />
            </OpsProvider>
          </OnboardingProvider>
        </AccessProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

function HrmsShell() {
  const { users, roles, currentUser, currentRole, canOpen, canEdit, signInAs } = useAccess();
  const portal = currentRole.kind;
  const [signedOut, setSignedOut] = useState(false);
  const [requestedView, setView] = useState<AppView>("dashboard");
  const view = canOpen(requestedView) ? requestedView : landingView(currentRole, effectivePermissions(currentRole, currentUser));
  const readOnly = portal === "internal" && !canEdit(view);
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [allocationEmployeeId, setAllocationEmployeeId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [siteInitialTab, setSiteInitialTab] = useState<"profile" | "salary" | "boundary">("profile");
  const [importKind, setImportKind] = useState<string | undefined>();
  const [ticketCreate, setTicketCreate] = useState(false);
  const [guestGuard, setGuestGuard] = useState<GuardUser | null>(null);
  const activeGuard: GuardUser = guestGuard ?? { id: currentUser.employeeId ?? currentUser.id, name: currentUser.name, initials: currentUser.initials };
  // Set while the user browses another rail section; cleared on navigation so the rail follows the open screen.
  const [browsedModuleId, setBrowsedModuleId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const notify = useToast();
  const onboarding = useOnboarding();

  const notifications = useMemo(() => {
    if (portal !== "internal") return [];
    const derived = deriveNotifications({
      today: APP_TODAY,
      employees: onboarding.allProfiles.map(item => ({
        id: item.employeeId, name: item.name, joiningDate: item.profile.joiningDate, pfEsiDataReceived: item.profile.pfEsiDataReceived,
      })),
      documents: onboarding.allProfiles.flatMap(item => item.profile.documents),
      guardChanges, spareDutyPayments, satisfactionCalls, sopEdits: [],
      pfEsiWindowDays: onboarding.config.pfEsiWindowDays,
    });
    const generics: AppNotification[] = [
      { id: "gen-sla", kind: "complaint-sla", title: "Complaint SLA due soon", detail: "CMP-26091 · TCS Technopark · due 16:00", audience: [], targetView: "complaints", at: APP_TODAY },
      { id: "gen-payroll", kind: "generic", title: "Payroll exceptions ready", detail: "August 2026 · 3 configuration exceptions", audience: [], targetView: "payroll", at: APP_TODAY },
    ];
    return [...derived, ...generics].filter(item => canOpen(item.targetView));
  }, [portal, canOpen, onboarding]);

  const navModules = useMemo((): NavModule[] => {
    if (portal === "guard") return [guardModule];
    if (portal === "client") return [clientModule];
    const pendingDuty = dutyChangeRequests.filter(g => g.status === "pending").length;
    const openComplaints = complaints.filter(c => c.state !== "Resolved").length;
    const openTickets = tickets.filter(t => t.status !== "resolved").length;
    return internalModules.map(mod => ({
      ...mod,
      items: mod.items
        .filter(item => canOpen(item.view))
        .map(item => {
          let badge: number | undefined;
          if (item.view === "attendance") badge = 7;
          if (item.view === "night-vigilance") badge = 6;
          if (item.view === "duty-changes") badge = pendingDuty;
          if (item.view === "complaints") badge = openComplaints;
          if (item.view === "tickets") badge = openTickets;
          if (item.view === "exit-clearance") badge = 3;
          return { ...item, badge };
        }),
    })).filter(mod => mod.items.length);
  }, [portal, canOpen]);

  const navView = parentView[view] ?? view;
  const activeModuleId = browsedModuleId ?? navModules.find(mod => mod.items.some(item => item.view === navView))?.id ?? navModules[0]?.id ?? "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("bmg-theme");
      setDark(savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches));
      const requested = new URLSearchParams(window.location.search).get("view") as AppView | null;
      if (requested) setView(requested);
    });
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const context = gsap.context(() => {
      gsap.from("[data-enter]", { y: 10, opacity: 0, duration: 0.34, stagger: 0.025, ease: "power2.out" });
    }, contentRef);
    return () => context.revert();
  }, [view, currentUser.id]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navigate = (nextView: string) => {
    setView(nextView as AppView);
    setNotificationsOpen(false);
    setImportKind(undefined);
    setTicketCreate(false);
    setBrowsedModuleId(null);
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
    setSignedOut(false);
    navigate(landingView(role, effectivePermissions(role, user)));
    notify(`Signed in as ${user.name}`);
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("bmg-theme", next ? "dark" : "light");
  };

  const openEmployeeForm = (employeeId: string | null) => { setEditingEmployeeId(employeeId); navigate("employee-form"); };
  const openAllocationAudit = (employeeId?: string) => { setAllocationEmployeeId(employeeId ?? null); navigate("payroll-allocation"); };
  const openImports = (kind: string) => { navigate("imports"); setImportKind(kind); };
  const openNewTicket = () => { navigate("tickets"); setTicketCreate(true); };
  const openSiteConfig = (site: string | null, tab: "profile" | "salary" | "boundary" = "profile") => {
    setSelectedSite(site);
    setSiteInitialTab(tab);
    navigate("site-config");
  };

  const blockReadOnlyActions = (event: MouseEvent<HTMLDivElement>) => {
    if (!readOnly) return;
    const button = (event.target as HTMLElement).closest("button");
    if (!button || button.hasAttribute("data-allow") || button.disabled) return;
    if (!button.matches('[data-variant="default"], [data-variant="destructive"], [data-variant="outline"][data-size="sm"]')) return;
    event.preventDefault();
    event.stopPropagation();
    notify({ message: "View-only access — ask an administrator for edit rights", kind: "info" });
  };

  if (signedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Choose who is using BMG Security on this device.</p>
          <div className="mt-4 grid gap-2">
            {roles.flatMap(role => {
              const members = users.filter(u => u.roleId === role.id && u.status === "active");
              return members.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => switchUser(user.id)}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-emerald hover:bg-emerald/5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{user.initials}</span>
                  <span>
                    <strong className="block text-sm">{user.name}</strong>
                    <small className="text-xs text-muted">{role.name}</small>
                  </span>
                </button>
              ));
            })}
          </div>
        </div>
      </div>
    );
  }

  const showInternalShell = portal === "internal";
  const mobileNavItems = portal === "guard" ? guardMobileNav : portal === "client" ? clientMobileNav : internalMobileNav.filter(item => canOpen(item.view));
  const moreItems = navModules.flatMap(mod => mod.items);
  const attention = portal === "internal"
    ? { count: notifications.length, view: "action-centre" as AppView }
    : portal === "guard"
      ? { count: 1, view: "guard-vigilance" as AppView }
      : { count: complaints.filter(c => c.state !== "Resolved").length, view: "client-complaints" as AppView };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar
        modules={navModules}
        activeView={navView}
        activeModuleId={activeModuleId}
        onSelectModule={setBrowsedModuleId}
        onNavigate={navigate}
        attentionCount={attention.count}
        onAttention={() => navigate(attention.view)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          dark={dark}
          onToggleTheme={toggleTheme}
          onOpenSearch={() => setSearchOpen(true)}
          showSearch={showInternalShell}
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => setNotificationsOpen(o => !o)}
          onNotificationClick={(_, targetView) => navigate(targetView)}
          onCreateOpen={() => setCreateOpen(true)}
          showCreate={showInternalShell}
          users={users}
          roles={roles}
          currentUserId={currentUser.id}
          onViewAs={switchUser}
          onSignOut={() => setSignedOut(true)}
        />

        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-8">
          <div className="mx-auto max-w-[1580px] p-3 md:px-5 md:py-5 lg:px-6" ref={contentRef} onClickCapture={blockReadOnlyActions} data-read-only={readOnly || undefined}>
            {readOnly && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm" data-enter>
                <Lock className="h-4 w-4 text-muted" />
                <span><strong>View only.</strong> You can browse this screen, but saving changes needs edit access. Ask an administrator.</span>
              </div>
            )}
            {renderView(view, {
              role: currentRole, navigate, canOpen, onboardingReady: onboarding.ready,
              editingEmployeeId, openEmployeeForm, allocationEmployeeId, openAllocationAudit,
              selectedSite, openSiteConfig, siteInitialTab, importKind, openImports, ticketCreate,
              activeGuard,
              onSwitchGuard: guard => {
                const registered = users.find(user => user.employeeId === guard.id && user.status === "active");
                if (registered) { signInAs(registered.id); setGuestGuard(null); }
                else setGuestGuard(guard);
                notify(`Signed in as ${guard.name}`);
                navigate("guard-home");
              },
              onSignOut: () => setSignedOut(true),
            })}
          </div>
        </main>
      </div>

      <BottomNav items={mobileNavItems} moreItems={moreItems} activeView={navView} onNavigate={navigate} />
      {showInternalShell && (
        <FAB icon={Plus} label="Create" onClick={() => setCreateOpen(true)} className="md:hidden" />
      )}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={navigate} canOpen={canOpen} />
      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} onNavigate={target => {
        if (target === "employee-form") openEmployeeForm(null);
        else if (target === "site-config") openSiteConfig(null);
        else if (target === "tickets") openNewTicket();
        else navigate(target);
      }} canOpen={canOpen} />
    </div>
  );
}

type SiteTab = "profile" | "salary" | "boundary";

type ViewContext = {
  role: AccessRole;
  navigate: (view: string) => void;
  canOpen: (view: AppView) => boolean;
  onboardingReady: boolean;
  editingEmployeeId: string | null;
  openEmployeeForm: (employeeId: string | null) => void;
  allocationEmployeeId: string | null;
  openAllocationAudit: (employeeId?: string) => void;
  selectedSite: string | null;
  openSiteConfig: (site: string | null, tab?: SiteTab) => void;
  siteInitialTab: SiteTab;
  importKind: string | undefined;
  openImports: (kind: string) => void;
  ticketCreate: boolean;
  activeGuard: GuardUser;
  onSwitchGuard: (user: GuardUser) => void;
  onSignOut: () => void;
};

function renderView(view: AppView, ctx: ViewContext) {
  const {
    role, navigate, canOpen, onboardingReady, editingEmployeeId, openEmployeeForm, allocationEmployeeId,
    openAllocationAudit, selectedSite, openSiteConfig, siteInitialTab, importKind, openImports, ticketCreate,
  } = ctx;
  if (view === "guard-vigilance") return <NightVigilanceScreen guardMode onBack={() => navigate("guard-home")} />;
  if (view.startsWith("guard-")) {
    return <GuardPortal view={view} onNavigate={next => navigate(next)} activeGuard={ctx.activeGuard} onSwitchUser={ctx.onSwitchGuard} onSignOut={ctx.onSignOut} />;
  }
  if (view.startsWith("client-")) return <ClientPortal view={view} onNavigate={next => navigate(next)} />;
  switch (view) {
    case "dashboard": return <DashboardScreen onNavigate={navigate} />;
    case "workforce": return <WorkforceScreen onNavigate={navigate} onCreate={() => openEmployeeForm(null)} onEdit={openEmployeeForm} />;
    case "sites": return (
      <SitesScreen
        onCreate={() => openSiteConfig(null)}
        onConfigure={(site: string) => openSiteConfig(site)}
        onEditBoundary={(site: string) => openSiteConfig(site, "boundary")}
      />
    );
    case "deployment": return <DeploymentScreen onAssign={() => navigate("assignment-form")} />;
    case "duty-changes": return <DutyChangesScreen />;
    case "attendance": return <AttendanceScreen onCorrect={() => navigate("attendance-correction")} />;
    case "payroll": return <PayrollScreen onAllocation={openAllocationAudit} />;
    case "advances": return <AdvancesScreen onCreate={() => navigate("advance-form")} />;
    case "uniforms": return <UniformsScreen onIssue={() => navigate("uniform-issue")} onImport={() => openImports("Opening balances")} />;
    case "inspections": return <InspectionsScreen onLog={() => navigate("inspection-form")} />;
    case "complaints": return <ComplaintsScreen onCreate={() => navigate("complaint-form")} />;
    case "sops": return <SopsScreen onCreate={() => navigate("sop-form")} />;
    case "reports": return <ReportsScreen />;
    case "imports": return <ImportsScreen key={importKind ?? "default"} initialKind={importKind} />;
    case "settings": return <SettingsScreen onOpenAccess={() => navigate("access")} />;
    case "employee-form": return <EmployeeFormScreen key={`${editingEmployeeId ?? "new"}-${onboardingReady}`} employeeId={editingEmployeeId} onBack={() => navigate("workforce")} onImport={() => openImports("Employees")} />;
    case "site-config": return <SiteConfigurationScreen role={role.name} siteName={selectedSite} initialTab={siteInitialTab} onBack={() => navigate(canOpen("sites") ? "sites" : "payroll")} />;
    case "payroll-allocation": return <PayrollAllocationScreen key={allocationEmployeeId ?? "default"} employeeId={allocationEmployeeId} onBack={() => navigate("payroll")} />;
    case "night-vigilance": return <NightVigilanceScreen onBack={() => navigate("dashboard")} />;
    case "exit-clearance": return <ExitClearanceScreen />;
    case "penalties": return <PenaltiesScreen onBack={() => navigate("payroll")} />;
    case "spare-payments": return <SparePaymentsScreen />;
    case "hr-quality": return <HrQualityScreen />;
    case "recruitment": return <RecruitmentScreen />;
    case "tickets": return <TicketsScreen key={ticketCreate ? "create" : "list"} startCreating={ticketCreate} />;
    case "analytics": return <AnalyticsScreen />;
    case "access": return <AccessScreen />;
    case "action-centre": return <ActionCentreScreen onOpen={navigate} />;
    case "assignment-form": return <DetailedWorkflowScreen kind="assignment" onBack={() => navigate("deployment")} />;
    case "attendance-correction": return <DetailedWorkflowScreen kind="attendance" onBack={() => navigate("attendance")} />;
    case "uniform-issue": return <DetailedWorkflowScreen kind="uniform" onBack={() => navigate("uniforms")} />;
    case "inspection-form": return <DetailedWorkflowScreen kind="inspection" onBack={() => navigate("inspections")} />;
    case "complaint-form": return <DetailedWorkflowScreen kind="complaint" onBack={() => navigate(role.kind === "client" ? "client-complaints" : "complaints")} />;
    case "sop-form": return <DetailedWorkflowScreen kind="sop" onBack={() => navigate("sops")} />;
    case "advance-form": return <DetailedWorkflowScreen kind="advance" onBack={() => navigate("advances")} />;
    default: return <DashboardScreen onNavigate={navigate} />;
  }
}
