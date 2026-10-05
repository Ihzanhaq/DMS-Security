import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  ChartBar,
  ClipboardList,
  Coins,
  FileText,
  HandCoins,
  LayoutDashboard,
  MapPin,
  Moon,
  Package,
  Settings,
  Shield,
  Star,
  Upload,
  UserCog,
  UserRound,
  Users,
  Wallet,
  AlertTriangle,
  MessageSquare,
  ArrowLeftRight,
  ListChecks,
} from "lucide-react";
import { NAV } from "@/lib/labels";
import type { AppView } from "@/types/domain";

export type NavLink = { label: string; view: AppView; badge?: number };
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
    title: "Overview",
    eyebrow: "Work",
    icon: LayoutDashboard,
    items: [
      { label: NAV.dashboard, view: "dashboard" },
      { label: NAV.actionCentre, view: "action-centre" },
    ],
  },
  {
    id: "workforce",
    title: "Workforce",
    eyebrow: "Work",
    icon: Users,
    items: [
      { label: NAV.workforce, view: "workforce" },
      { label: NAV.recruitment, view: "recruitment" },
      { label: NAV.hrQuality, view: "hr-quality" },
      { label: NAV.exitClearance, view: "exit-clearance" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    eyebrow: "Work",
    icon: MapPin,
    items: [
      { label: NAV.sites, view: "sites" },
      { label: NAV.deployment, view: "deployment" },
      { label: NAV.attendance, view: "attendance" },
      { label: NAV.nightChecks, view: "night-vigilance" },
      { label: NAV.dutyChanges, view: "duty-changes" },
    ],
  },
  {
    id: "payroll",
    title: "Payroll",
    eyebrow: "Finance",
    icon: Wallet,
    items: [
      { label: NAV.payroll, view: "payroll" },
      { label: NAV.advances, view: "advances" },
      { label: NAV.sparePayments, view: "spare-payments" },
      { label: NAV.penalties, view: "penalties" },
      { label: NAV.uniforms, view: "uniforms" },
    ],
  },
  {
    id: "quality",
    title: "Quality",
    eyebrow: "Work",
    icon: Shield,
    items: [
      { label: NAV.inspections, view: "inspections" },
      { label: NAV.complaints, view: "complaints" },
      { label: NAV.tickets, view: "tickets" },
      { label: NAV.sops, view: "sops" },
    ],
  },
  {
    id: "insights",
    title: "Insights",
    eyebrow: "Grow",
    icon: ChartBar,
    items: [
      { label: NAV.reports, view: "reports" },
      { label: NAV.analytics, view: "analytics" },
      { label: NAV.imports, view: "imports" },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    eyebrow: "Account",
    icon: Settings,
    items: [
      { label: NAV.access, view: "access" },
      { label: NAV.settings, view: "settings" },
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
    { label: "Home", view: "guard-home" },
    { label: "Attendance punch", view: "guard-punch" },
    { label: "My schedule", view: "guard-schedule" },
    { label: "Duty change", view: "guard-duty-change" },
    { label: "Request leave", view: "guard-leave" },
    { label: "Salary advance", view: "guard-advance" },
    { label: "Uniform", view: "guard-uniform" },
    { label: "Payslips", view: "guard-payslips" },
    { label: "Site SOPs", view: "guard-sops" },
    { label: "Help and queries", view: "guard-help" },
    { label: "Night check", view: "guard-vigilance" },
    { label: "My profile", view: "guard-profile" },
  ],
};

export const clientModule: NavModule = {
  id: "client",
  title: "Client portal",
  eyebrow: "Client",
  icon: Building2,
  items: [
    { label: "Overview", view: "client-home" },
    { label: "My sites", view: "client-sites" },
    { label: "Complaints", view: "client-complaints" },
    { label: "Coverage", view: "client-coverage" },
  ],
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
  { label: "Advance request", view: "advances", icon: HandCoins },
  { label: "Deployment assignment", view: "assignment-form", icon: ClipboardList },
];
