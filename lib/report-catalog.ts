import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarCheck,
  Clock,
  Landmark,
  ListMinus,
  Receipt,
  Shirt,
  Timer,
} from "lucide-react";

export const REPORT_NAMES = [
  "Attendance summary",
  "Late login & absenteeism",
  "Statutory contributions",
  "Deduction log",
  "Net payout register",
  "Uniform recovery",
  "Site coverage",
  "Complaint SLA",
] as const;

export type ReportName = (typeof REPORT_NAMES)[number];

const REPORT_ICON_BY_NAME: Record<ReportName, LucideIcon> = {
  "Attendance summary": CalendarCheck,
  "Late login & absenteeism": Clock,
  "Statutory contributions": Landmark,
  "Deduction log": ListMinus,
  "Net payout register": Receipt,
  "Uniform recovery": Shirt,
  "Site coverage": Building2,
  "Complaint SLA": Timer,
};

export const REPORT_CATALOG = REPORT_NAMES.map(name => ({
  name,
  icon: REPORT_ICON_BY_NAME[name],
}));

export function isReportName(value: string): value is ReportName {
  return (REPORT_NAMES as readonly string[]).includes(value);
}

export const DEFAULT_REPORT_NAME: ReportName = REPORT_NAMES[0];
