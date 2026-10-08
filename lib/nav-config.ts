import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarX,
  ChartBar,
  ClipboardList,
  FileText,
  HandCoins,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  MessageSquare,
  MessageSquareWarning,
  Moon,
  Package,
  Receipt,
  Repeat,
  Scale,
  Settings,
  Shirt,
  Shield,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { NAV } from "@/lib/labels";
import { REPORT_CATALOG } from "@/lib/report-catalog";
import { SETTINGS_CATALOG } from "@/lib/settings-catalog";
import type { AppView } from "@/types/domain";

export type NavClickMeta = { report?: string; settingsGroup?: string; site?: string; roleId?: string; userId?: string; tab?: string };

export type NavLink = {
  label: string;
  view: AppView;
  icon: LucideIcon;
  badge?: number;
  report?: string;
  settingsGroup?: string;
};
export type NavModule = {
  id: string;
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  items: NavLink[];
};

export const internalModules: NavModule[] = [
  {
    id: "overview",
    title: "Dashboard",
    eyebrow: "Home",
    icon: LayoutDashboard,
    items: [{ label: NAV.dashboard, view: "dashboard", icon: LayoutDashboard }],
  },
  {
    id: "workforce",
    title: "Workforce",
    eyebrow: "Work",
    icon: Users,
    items: [
      { label: NAV.workforce, view: "workforce", icon: Users },
      { label: NAV.recruitment, view: "recruitment", icon: UserPlus },
      { label: NAV.hrQuality, view: "hr-quality", icon: HeartHandshake },
      { label: NAV.exitClearance, view: "exit-clearance", icon: LogOut },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    eyebrow: "Work",
    icon: MapPin,
    items: [
      { label: NAV.sites, view: "sites", icon: Building2 },
      { label: NAV.deployment, view: "deployment", icon: ClipboardList },
      { label: NAV.attendance, view: "attendance", icon: CalendarCheck },
      { label: NAV.nightChecks, view: "night-vigilance", icon: Moon },
      { label: NAV.dutyChanges, view: "duty-changes", icon: Repeat },
    ],
  },
  {
    id: "payroll",
    title: "Payroll",
    eyebrow: "Finance",
    icon: Wallet,
    items: [
      { label: NAV.payroll, view: "payroll", icon: Wallet },
      { label: NAV.advances, view: "advances", icon: HandCoins },
      { label: NAV.sparePayments, view: "spare-payments", icon: Banknote },
      { label: NAV.penalties, view: "penalties", icon: Scale },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    eyebrow: "Stock",
    icon: Boxes,
    items: [
      { label: NAV.inventory, view: "inventory", icon: Boxes },
      { label: NAV.uniformRequests, view: "uniform-requests", icon: Shirt },
      { label: NAV.stores, view: "inventory-stores", icon: Warehouse },
      { label: NAV.recoveryPlans, view: "recovery-plans", icon: HandCoins },
    ],
  },
  {
    id: "quality",
    title: "Quality",
    eyebrow: "Work",
    icon: Shield,
    items: [
      { label: NAV.inspections, view: "inspections", icon: ListChecks },
      { label: NAV.complaints, view: "complaints", icon: MessageSquareWarning },
      { label: NAV.tickets, view: "tickets", icon: MessageSquare },
    ],
  },
  {
    id: "insights",
    title: "Insights",
    eyebrow: "Grow",
    icon: ChartBar,
    items: [
      ...REPORT_CATALOG.map(({ name, icon }) => ({ label: name, view: "reports" as AppView, icon, report: name })),
      { label: NAV.analytics, view: "analytics", icon: ChartBar },
      { label: NAV.imports, view: "imports", icon: Upload },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    eyebrow: "Work",
    icon: AlertTriangle,
    items: [{ label: NAV.actionCentre, view: "action-centre", icon: AlertTriangle }],
  },
  {
    id: "admin",
    title: "Admin",
    eyebrow: "Account",
    icon: Settings,
    items: [
      ...SETTINGS_CATALOG.map(({ name, icon }) => ({
        label: name,
        view: "settings" as AppView,
        icon,
        settingsGroup: name,
      })),
      { label: NAV.access, view: "access", icon: ShieldCheck },
    ],
  },
];

export const guardMobileNav = [
  { label: "Home", view: "guard-home" as AppView, icon: LayoutDashboard },
  { label: "Punch in", view: "guard-punch" as AppView, icon: MapPin },
  { label: "Schedule", view: "guard-schedule" as AppView, icon: CalendarCheck },
  { label: "Help", view: "guard-help" as AppView, icon: MessageSquare },
];

export const internalMobileNav = [
  { label: "Dashboard", view: "dashboard" as AppView, icon: LayoutDashboard },
  { label: "Employees", view: "workforce" as AppView, icon: Users },
  { label: "Attendance", view: "attendance" as AppView, icon: CalendarCheck },
  { label: "Payroll", view: "payroll" as AppView, icon: Wallet },
];

export const clientMobileNav = [
  { label: "Overview", view: "client-home" as AppView, icon: LayoutDashboard },
  { label: "Sites", view: "client-sites" as AppView, icon: Building2 },
  { label: "Complaints", view: "client-complaints" as AppView, icon: AlertTriangle },
];

export const guardModule: NavModule = {
  id: "guard",
  title: "My workspace",
  eyebrow: "Guard",
  icon: UserRound,
  items: [
    { label: "Home", view: "guard-home", icon: LayoutDashboard },
    { label: "Attendance punch", view: "guard-punch", icon: MapPin },
    { label: "My schedule", view: "guard-schedule", icon: CalendarCheck },
    { label: "Duty change", view: "guard-duty-change", icon: Repeat },
    { label: "Request leave", view: "guard-leave", icon: CalendarX },
    { label: "Salary advance", view: "guard-advance", icon: HandCoins },
    { label: "Uniform", view: "guard-uniform", icon: Package },
    { label: "Payslips", view: "guard-payslips", icon: Receipt },
    { label: "Site SOPs", view: "guard-sops", icon: FileText },
    { label: "Help and queries", view: "guard-help", icon: MessageSquare },
    { label: "Night check", view: "guard-vigilance", icon: Moon },
    { label: "My profile", view: "guard-profile", icon: UserRound },
  ],
};

export const clientModule: NavModule = {
  id: "client",
  title: "Client portal",
  eyebrow: "Client",
  icon: Building2,
  items: [
    { label: "Overview", view: "client-home", icon: LayoutDashboard },
    { label: "My sites", view: "client-sites", icon: Building2 },
    { label: "Complaints", view: "client-complaints", icon: AlertTriangle },
    { label: "Coverage", view: "client-coverage", icon: ChartBar },
  ],
};

/** Form and detail screens highlight the list page they belong to. */
export const parentView: Partial<Record<AppView, AppView>> = {
  "employee-form": "workforce",
  "site-config": "sites",
  "site-detail": "sites",
  "site-attendance": "site-detail",
  "assignment-form": "deployment",
  "attendance-correction": "attendance",
  "payroll-allocation": "payroll",
  "uniform-issue": "inventory",
  uniforms: "inventory",
  "stock-movement": "inventory",
  "inventory-item": "inventory",
  "inspection-form": "inspections",
  "complaint-form": "complaints",
  "sop-form": "site-detail",
  "advance-form": "advances",
  "role-editor": "access",
  "member-access": "access",
};

/** Icons for create menu */
export const createMenuItems: { label: string; view: AppView; icon: LucideIcon }[] = [
  { label: "Employee", view: "employee-form", icon: Users },
  { label: "Site", view: "site-config", icon: Building2 },
  { label: "Attendance correction", view: "attendance-correction", icon: CalendarCheck },
  { label: "Complaint", view: "complaint-form", icon: AlertTriangle },
  { label: "Ticket", view: "tickets", icon: MessageSquare },
  { label: "Inspection visit", view: "inspection-form", icon: ListChecks },
  { label: "Site SOP", view: "sop-form", icon: FileText },
  { label: "Uniform issue", view: "uniform-issue", icon: Package },
  { label: "Salary advance", view: "advance-form", icon: HandCoins },
  { label: "Deployment assignment", view: "assignment-form", icon: ClipboardList },
];
