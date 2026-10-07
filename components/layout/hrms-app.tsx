"use client";

import { type MouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Lock } from "lucide-react";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { WorkforceScreen } from "@/features/workforce/workforce-screen";
import { AttendanceScreen, DutyChangesScreen, InspectionsScreen, SiteDetailScreen, SitesScreen } from "@/features/operations/operations-screens";
import { DeploymentScreen } from "@/features/operations/deployment-screen";
import { SiteAttendanceScreen } from "@/features/operations/site-attendance-calendar";
import { AdvancesScreen, PayrollScreen, SparePaymentsScreen, UniformsScreen } from "@/features/payroll/payroll-screens";
import { ComplaintsScreen, ImportsScreen, ReportsScreen, SettingsScreen } from "@/features/compliance/compliance-screens";
import { TicketsScreen } from "@/features/compliance/tickets-screen";
import { AnalyticsScreen } from "@/features/reports/analytics-screens";
import { ClientPortal, GuardPortal, type GuardUser } from "@/features/portals/portal-screens";
import {
  ActionCentreScreen, DetailedWorkflowScreen, EmployeeFormScreen, ExitClearanceScreen,
  NightVigilanceScreen, PayrollAllocationScreen, PenaltiesScreen, SiteConfigurationScreen,
} from "@/features/workflows/workflow-screens";
import { AccessScreen, isAccessTab, type AccessTab } from "@/features/access/access-screen";
import { RoleEditorScreen } from "@/features/access/role-editor-screen";
import { MemberAccessScreen } from "@/features/access/member-access-screen";
import { AccessProvider, useAccess } from "@/components/shared/access-context";
import { OnboardingProvider, useOnboarding } from "@/components/shared/onboarding-context";
import { OpsProvider, useOps } from "@/components/shared/ops-context";
import { NAVIGATE_EVENT, showDesktopAlert } from "@/lib/browser-notify";
import { ToastProvider, useToast } from "@/components/shared/toast-context";
import { ConfirmProvider } from "@/components/ui-kit";
import { HrQualityScreen, RecruitmentScreen } from "@/features/hr/hr-quality-screens";
import { complaints, employees, guardChanges, satisfactionCalls, spareDutyPayments, tickets } from "@/lib/mock-data";
import { deriveNotifications } from "@/lib/notifications";
import { effectivePermissions, landingView, type AccessRole } from "@/lib/access";
import { APP_TODAY } from "@/lib/app-date";
import { clientMobileNav, clientModule, guardMobileNav, guardModule, internalMobileNav, internalModules, parentView, type NavModule } from "@/lib/nav-config";
import { DEFAULT_REPORT_NAME, isReportName, type ReportName } from "@/lib/report-catalog";
import { DEFAULT_SETTINGS_GROUP, isSettingsGroup, type SettingsGroup } from "@/lib/settings-catalog";
import type { NavClickMeta } from "@/lib/nav-config";
import { navItemActive, parseNavMeta } from "@/lib/navigate-meta";
import type { AppNotification, AppView } from "@/types/domain";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { GlobalSearch } from "./global-search";
import { BottomNav } from "./bottom-nav";
import { QuickActions } from "./quick-actions";
import { useAccessibilityPreferences } from "@/components/shared/use-accessibility-preferences";

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
  const { dutyRequests } = useOps();
  const portal = currentRole.kind;
  const [signedOut, setSignedOut] = useState(false);
  const [requestedView, setView] = useState<AppView>("dashboard");
  const view = canOpen(requestedView) ? requestedView : landingView(currentRole, effectivePermissions(currentRole, currentUser));
  const readOnly = portal === "internal" && !canEdit(view);
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { showQuickActions } = useAccessibilityPreferences();
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [allocationEmployeeId, setAllocationEmployeeId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [accessTab, setAccessTab] = useState<AccessTab>("members");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  // Content waits until URL params are applied, so deep links never flash the dashboard.
  const [urlReady, setUrlReady] = useState(false);
  const [siteInitialTab, setSiteInitialTab] = useState<"profile" | "salary" | "boundary" | "documents">("profile");
  const [importKind, setImportKind] = useState<string | undefined>();
  const [ticketCreate, setTicketCreate] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportName>(DEFAULT_REPORT_NAME);
  const [activeSettingsGroup, setActiveSettingsGroup] = useState<SettingsGroup>(DEFAULT_SETTINGS_GROUP);
  const [guestGuard, setGuestGuard] = useState<GuardUser | null>(null);
  const activeGuard: GuardUser = guestGuard ?? { id: currentUser.employeeId ?? currentUser.id, name: currentUser.name, initials: currentUser.initials };
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
    const dutyAlerts: AppNotification[] = dutyRequests
      .filter(request => request.status === "pending" && request.loggedBy !== "office")
      .map(request => {
        const name = employees.find(item => item.id === request.employeeId)?.name ?? request.employeeId;
        const what = request.type === "ot" ? `extra duty (${request.hours} h)` : request.type === "swap" ? "a shift swap" : "cover for their duty";
        return {
          id: `duty-${request.id}`, kind: "generic", title: `Duty change · ${name}`,
          detail: `Needs ${what} at ${request.site}${request.note ? ` · ${request.note}` : ""}`,
          audience: [], targetView: "duty-changes", at: request.date,
        };
      });
    return [...dutyAlerts, ...derived, ...generics].filter(item => canOpen(item.targetView));
  }, [portal, canOpen, onboarding, dutyRequests]);

  // Each new bell item pops a desktop notification while this tab is in the background
  // (Settings → Notifications → Desktop alerts). Items already present when the app opened are not announced.
  const announcedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(notifications.map(item => item.id));
    if (!announcedRef.current) { announcedRef.current = ids; return; }
    const fresh = notifications.filter(item => !announcedRef.current!.has(item.id));
    announcedRef.current = ids;
    for (const item of fresh) {
      if (!showDesktopAlert({ title: item.title, body: item.detail, tag: item.id, view: item.targetView })) notify({ message: `${item.title} · ${item.detail}`, kind: "info" });
    }
  }, [notifications, notify]);

  const navModules = useMemo((): NavModule[] => {
    if (portal === "guard") return [guardModule];
    if (portal === "client") return [clientModule];
    const pendingDuty = dutyRequests.filter(g => g.status === "pending").length;
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
          if (item.view === "action-centre") badge = notifications.length;
          return { ...item, badge };
        }),
    })).filter(mod => mod.items.length);
  }, [portal, canOpen, notifications.length, dutyRequests]);

  let navView: AppView = view;
  while (parentView[navView]) navView = parentView[navView]!;
  const activeModuleId = navModules.find(mod => mod.items.some(item => (
    navItemActive(item, navView, activeReport, activeSettingsGroup)
  )))?.id ?? navModules[0]?.id ?? "";

  // Layout effect: state is applied before the first paint after hydration.
  /* eslint-disable react-hooks/set-state-in-effect -- browser-only URL and theme must be read after hydration */
  useLayoutEffect(() => {
    const savedTheme = window.localStorage.getItem("bmg-theme");
    setDark(savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches));
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view");
    if (requested === "sops") setView("sites");
    else if (requested) setView(requested as AppView);
    const requestedSite = params.get("site");
    if (requestedSite) setSelectedSite(requestedSite);
    const requestedTab = params.get("tab");
    if (isAccessTab(requestedTab)) setAccessTab(requestedTab);
    const requestedRole = params.get("role");
    if (requestedRole) setSelectedRoleId(requestedRole);
    const requestedMember = params.get("member");
    if (requestedMember) setSelectedMemberId(requestedMember);
    const requestedReport = params.get("report");
    if (requestedReport && isReportName(requestedReport)) setActiveReport(requestedReport);
    const requestedSettings = params.get("settings");
    if (requestedSettings && isSettingsGroup(requestedSettings)) setActiveSettingsGroup(requestedSettings);
    setUrlReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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
  }, [view, currentUser.id, urlReady]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navigate = (nextView: string, meta?: string | NavClickMeta) => {
    const options = parseNavMeta(meta);
    const viewKey = nextView === "sops" ? "sites" : nextView;
    if (options?.site) setSelectedSite(options.site);
    if (viewKey === "access") setAccessTab(isAccessTab(options?.tab) ? options.tab : "members");
    if (options?.roleId) setSelectedRoleId(options.roleId);
    if (options?.userId) setSelectedMemberId(options.userId);
    setView(viewKey as AppView);
    if (options?.report && isReportName(options.report)) setActiveReport(options.report);
    if (options?.settingsGroup && isSettingsGroup(options.settingsGroup)) setActiveSettingsGroup(options.settingsGroup);
    setNotificationsOpen(false);
    setImportKind(undefined);
    setTicketCreate(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", viewKey);
    if ((viewKey === "site-detail" || viewKey === "site-attendance") && (options?.site ?? selectedSite)) url.searchParams.set("site", (options?.site ?? selectedSite)!);
    else url.searchParams.delete("site");
    if (viewKey === "reports" && options?.report && isReportName(options.report)) url.searchParams.set("report", options.report);
    else url.searchParams.delete("report");
    if (viewKey === "settings" && options?.settingsGroup && isSettingsGroup(options.settingsGroup)) {
      url.searchParams.set("settings", options.settingsGroup);
    } else if (viewKey !== "settings") url.searchParams.delete("settings");
    if (viewKey === "access" && isAccessTab(options?.tab) && options.tab !== "members") url.searchParams.set("tab", options.tab);
    else url.searchParams.delete("tab");
    if (viewKey === "role-editor" && (options?.roleId ?? selectedRoleId)) url.searchParams.set("role", (options?.roleId ?? selectedRoleId)!);
    else url.searchParams.delete("role");
    if (viewKey === "member-access" && (options?.userId ?? selectedMemberId)) url.searchParams.set("member", (options?.userId ?? selectedMemberId)!);
    else url.searchParams.delete("member");
    window.history.replaceState({}, "", url);
  };

  // Clicking a desktop notification brings the tab forward and opens the related screen.
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; });
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const view = (event as CustomEvent<{ view?: string }>).detail?.view;
      if (view) navigateRef.current(view);
    };
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    return () => window.removeEventListener(NAVIGATE_EVENT, onNavigate);
  }, []);

  const selectModule = (moduleId: string) => {
    const mod = navModules.find(item => item.id === moduleId);
    const first = mod?.items[0];
    if (first) navigate(first.view, { report: first.report, settingsGroup: first.settingsGroup });
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
  const quickNavigate = (target: AppView) => {
    if (target === "employee-form") openEmployeeForm(null);
    else if (target === "site-config") openSiteConfig(null);
    else if (target === "tickets") openNewTicket();
    else navigate(target);
  };
  const openSiteConfig = (site: string | null, tab: "profile" | "salary" | "boundary" | "documents" = "profile") => {
    setSelectedSite(site);
    setSiteInitialTab(tab);
    navigate("site-config");
  };
  const openSiteDetail = (site: string) => {
    setSelectedSite(site);
    navigate("site-detail", { site });
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
                    <strong className="block text-sm font-medium">{user.name}</strong>
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
        onSelectModule={selectModule}
        onNavigate={navigate}
        activeReport={view === "reports" ? activeReport : undefined}
        activeSettingsGroup={view === "settings" ? activeSettingsGroup : undefined}
        bottomAttention={portal !== "internal" ? { count: attention.count, onClick: () => navigate(attention.view) } : undefined}
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
          onNotificationClick={item => {
            if (item.targetSite) setSelectedSite(item.targetSite);
            navigate(item.targetView, item.targetSite ? { site: item.targetSite } : undefined);
          }}
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
            {urlReady && renderView(view, {
              role: currentRole, navigate, canOpen, onboardingReady: onboarding.ready,
              editingEmployeeId, openEmployeeForm, allocationEmployeeId, openAllocationAudit,
              selectedSite, openSiteConfig, openSiteDetail, siteInitialTab, importKind, openImports, ticketCreate,
              accessTab, selectedRoleId, selectedMemberId,
              activeReport,
              activeSettingsGroup,
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

      <BottomNav
        items={mobileNavItems}
        moreItems={moreItems}
        activeView={navView}
        activeReport={view === "reports" ? activeReport : undefined}
        activeSettingsGroup={view === "settings" ? activeSettingsGroup : undefined}
        onNavigate={navigate}
      />
      {showInternalShell && showQuickActions && (
        <QuickActions
          canOpen={canOpen}
          onNavigate={quickNavigate}
          onOpenSearch={() => setSearchOpen(true)}
          dark={dark}
          onToggleTheme={toggleTheme}
        />
      )}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={navigate} canOpen={canOpen} />
    </div>
  );
}

type SiteTab = "profile" | "salary" | "boundary" | "documents";

type ViewContext = {
  role: AccessRole;
  navigate: (view: string, meta?: string | NavClickMeta) => void;
  canOpen: (view: AppView) => boolean;
  onboardingReady: boolean;
  editingEmployeeId: string | null;
  openEmployeeForm: (employeeId: string | null) => void;
  allocationEmployeeId: string | null;
  openAllocationAudit: (employeeId?: string) => void;
  selectedSite: string | null;
  openSiteConfig: (site: string | null, tab?: SiteTab) => void;
  openSiteDetail: (site: string) => void;
  siteInitialTab: SiteTab;
  importKind: string | undefined;
  openImports: (kind: string) => void;
  ticketCreate: boolean;
  accessTab: AccessTab;
  selectedRoleId: string | null;
  selectedMemberId: string | null;
  activeReport: ReportName;
  activeSettingsGroup: SettingsGroup;
  activeGuard: GuardUser;
  onSwitchGuard: (user: GuardUser) => void;
  onSignOut: () => void;
};

function renderView(view: AppView, ctx: ViewContext) {
  const {
    role, navigate, canOpen, onboardingReady, editingEmployeeId, openEmployeeForm, allocationEmployeeId,
    openAllocationAudit, selectedSite, openSiteConfig, openSiteDetail, siteInitialTab, importKind, openImports, ticketCreate, activeReport,
    activeSettingsGroup,
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
        onNavigate={navigate}
        onCreate={() => openSiteConfig(null)}
        onViewDetails={openSiteDetail}
        onConfigure={(site: string) => openSiteConfig(site)}
        onEditBoundary={(site: string) => openSiteConfig(site, "boundary")}
      />
    );
    case "site-detail": return (
      <SiteDetailScreen
        onNavigate={navigate}
        key={selectedSite ?? "unknown"}
        siteName={selectedSite}
        onBack={() => navigate("sites")}
        onConfigure={() => selectedSite && openSiteConfig(selectedSite)}
        onManageDocuments={() => selectedSite && openSiteConfig(selectedSite, "documents")}
        onEditBoundary={() => selectedSite && openSiteConfig(selectedSite, "boundary")}
        onCreateSop={() => navigate("sop-form")}
        onOpenCalendar={() => selectedSite && navigate("site-attendance", { site: selectedSite })}
      />
    );
    case "site-attendance": return (
      <SiteAttendanceScreen
        key={selectedSite ?? "unknown"}
        siteName={selectedSite}
        onBackToSites={() => navigate("sites")}
        onBack={() => navigate(selectedSite ? "site-detail" : "sites", selectedSite ? { site: selectedSite } : undefined)}
      />
    );
    case "deployment": return <DeploymentScreen onAssign={() => navigate("assignment-form")} />;
    case "duty-changes": return <DutyChangesScreen onNavigate={navigate} />;
    case "attendance": return <AttendanceScreen onNavigate={navigate} onCorrect={() => navigate("attendance-correction")} />;
    case "payroll": return <PayrollScreen onNavigate={navigate} onAllocation={openAllocationAudit} />;
    case "advances": return <AdvancesScreen onNavigate={navigate} onCreate={() => navigate("advance-form")} />;
    case "uniforms": return <UniformsScreen onNavigate={navigate} onIssue={() => navigate("uniform-issue")} onImport={() => openImports("Opening balances")} />;
    case "inspections": return <InspectionsScreen onNavigate={navigate} onLog={() => navigate("inspection-form")} />;
    case "complaints": return <ComplaintsScreen onNavigate={navigate} onCreate={() => navigate("complaint-form")} />;
    case "reports": return <ReportsScreen key={ctx.activeReport} report={ctx.activeReport} />;
    case "imports": return <ImportsScreen key={importKind ?? "default"} initialKind={importKind} />;
    case "settings": return (
      <SettingsScreen key={ctx.activeSettingsGroup} group={ctx.activeSettingsGroup} />
    );
    case "employee-form": return <EmployeeFormScreen key={`${editingEmployeeId ?? "new"}-${onboardingReady}`} employeeId={editingEmployeeId} onBack={() => navigate("workforce")} onImport={() => openImports("Employees")} />;
    case "site-config": return (
      <SiteConfigurationScreen
        key={`${selectedSite ?? "new"}-${siteInitialTab}`}
        role={role.name}
        siteName={selectedSite}
        initialTab={siteInitialTab}
        onBack={() => navigate(canOpen("sites") ? "sites" : "payroll")}
      />
    );
    case "payroll-allocation": return <PayrollAllocationScreen onNavigate={navigate} key={allocationEmployeeId ?? "default"} employeeId={allocationEmployeeId} onBack={() => navigate("payroll")} />;
    case "night-vigilance": return <NightVigilanceScreen onBack={() => navigate("dashboard")} />;
    case "exit-clearance": return <ExitClearanceScreen />;
    case "penalties": return <PenaltiesScreen onBack={() => navigate("payroll")} />;
    case "spare-payments": return <SparePaymentsScreen onNavigate={navigate} />;
    case "hr-quality": return <HrQualityScreen onNavigate={navigate} />;
    case "recruitment": return <RecruitmentScreen onNavigate={navigate} />;
    case "tickets": return <TicketsScreen key={ticketCreate ? "create" : "list"} onNavigate={navigate} startCreating={ticketCreate} />;
    case "analytics": return <AnalyticsScreen onNavigate={navigate} />;
    case "access": return <AccessScreen tab={ctx.accessTab} onNavigate={navigate} />;
    case "role-editor": return <RoleEditorScreen key={ctx.selectedRoleId ?? "new"} roleId={ctx.selectedRoleId} onNavigate={navigate} />;
    case "member-access": return <MemberAccessScreen key={ctx.selectedMemberId ?? "none"} userId={ctx.selectedMemberId} onNavigate={navigate} />;
    case "action-centre": return <ActionCentreScreen onOpen={navigate} />;
    case "assignment-form": return <DetailedWorkflowScreen kind="assignment" onBack={() => navigate("deployment")} />;
    case "attendance-correction": return <DetailedWorkflowScreen kind="attendance" onBack={() => navigate("attendance")} />;
    case "uniform-issue": return <DetailedWorkflowScreen kind="uniform" onBack={() => navigate("uniforms")} />;
    case "inspection-form": return <DetailedWorkflowScreen kind="inspection" onBack={() => navigate("inspections")} />;
    case "complaint-form": return <DetailedWorkflowScreen kind="complaint" onBack={() => navigate(role.kind === "client" ? "client-complaints" : "complaints")} />;
    case "sop-form": return (
      <DetailedWorkflowScreen
        kind="sop"
        onBack={() => navigate(selectedSite ? "site-detail" : "sites", selectedSite ? { site: selectedSite } : undefined)}
      />
    );
    case "advance-form": return <DetailedWorkflowScreen kind="advance" onBack={() => navigate("advances")} />;
    default: return <DashboardScreen onNavigate={navigate} />;
  }
}
