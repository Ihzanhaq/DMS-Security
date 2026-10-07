import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  Bell,
  Building2,
  CalendarCheck,
  ListOrdered,
  Scale,
  Star,
  UserPlus,
  Wallet,
} from "lucide-react";

export const SETTINGS_GROUPS = [
  "Organization",
  "Onboarding",
  "Attendance",
  "Payroll",
  "PF and ESI",
  "Duty units",
  "Ratings",
  "Notifications",
  "Accessibility",
] as const;

export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

const SETTINGS_ICON_BY_NAME: Record<SettingsGroup, LucideIcon> = {
  Organization: Building2,
  Onboarding: UserPlus,
  Attendance: CalendarCheck,
  Payroll: Wallet,
  "PF and ESI": Scale,
  "Duty units": ListOrdered,
  Ratings: Star,
  Notifications: Bell,
  Accessibility,
};

export const SETTINGS_CATALOG = SETTINGS_GROUPS.map(name => ({
  name,
  icon: SETTINGS_ICON_BY_NAME[name],
}));

export function isSettingsGroup(value: string): value is SettingsGroup {
  return (SETTINGS_GROUPS as readonly string[]).includes(value);
}

export const DEFAULT_SETTINGS_GROUP: SettingsGroup = SETTINGS_GROUPS[0];
