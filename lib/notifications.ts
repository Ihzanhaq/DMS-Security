import type { AppNotification, EmployeeDocument, GuardChangeEvent, SatisfactionCall, SpareDutyPayment } from "@/types/domain";

type EmployeeLite = { id: string; name: string; joiningDate: string; pfEsiDataReceived: boolean };
export type SopEdit = { site: string; title: string; updatedOn: string; officer: string };

export type NotificationInput = {
  today: string; // yyyy-mm-dd
  employees: EmployeeLite[];
  documents: EmployeeDocument[];
  guardChanges: GuardChangeEvent[];
  spareDutyPayments: SpareDutyPayment[];
  satisfactionCalls: SatisfactionCall[];
  sopEdits: SopEdit[];
  /** Days after joining before missing PF/ESI data raises an alert. */
  pfEsiWindowDays?: number;
};

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / DAY_MS);

/** Pure derivation of the alert feed from current data. UI filters by audience. */
export function deriveNotifications(input: NotificationInput): AppNotification[] {
  const list: AppNotification[] = [];

  for (const doc of input.documents) {
    if (doc.status === "pending" && doc.dueBy < input.today) {
      const who = input.employees.find(employee => employee.id === doc.employeeId);
      list.push({
        id: `doc-${doc.id}`, kind: "doc-delay",
        title: `${doc.type} overdue`,
        detail: `${who?.name ?? doc.employeeId} · due ${doc.dueBy} · not uploaded`,
        audience: ["Owner", "Branch Manager", "HR", "HR Assistant", "HR Executive"],
        targetView: "workforce", at: doc.dueBy,
      });
    }
  }

  for (const employee of input.employees) {
    if (!employee.pfEsiDataReceived && daysBetween(employee.joiningDate, input.today) >= (input.pfEsiWindowDays ?? 15)) {
      list.push({
        id: `pfesi-${employee.id}`, kind: "pf-esi-15day",
        title: `PF/ESI data missing beyond ${input.pfEsiWindowDays ?? 15} days`,
        detail: `${employee.name} joined ${employee.joiningDate}; enrolment details not received`,
        audience: ["Owner", "Branch Manager", "HR", "HR Assistant"],
        targetView: "workforce", at: input.today,
      });
    }
  }

  for (const change of input.guardChanges) {
    list.push({
      id: `gc-${change.id}`, kind: "guard-change",
      title: `Guard change at ${change.site}`,
      detail: `${change.post}: ${change.outgoing} → ${change.incoming} · ${change.at}`,
      audience: ["Field Officer", "Operations In-charge"],
      targetView: "duty-changes", at: change.at,
    });
  }

  for (const payment of input.spareDutyPayments) {
    list.push({
      id: `sp-${payment.id}`, kind: "spare-duty",
      title: payment.status === "transferred" ? "Spare duty amount transferred" : "Spare duty payment queued",
      detail: `${payment.employeeId} · ${payment.site} · ₹${payment.amount} · ${payment.date}`,
      audience: ["Operations In-charge", "Finance", "Owner", "Branch Manager"],
      targetView: "spare-payments", at: payment.date,
    });
  }

  for (const call of input.satisfactionCalls) {
    if (call.status === "due") {
      const who = input.employees.find(employee => employee.id === call.employeeId);
      list.push({
        id: `sat-${call.id}`, kind: "satisfaction-due",
        title: "3-day satisfaction call due",
        detail: `${who?.name ?? call.employeeId} joined ${call.joinedOn} · call by ${call.dueBy}`,
        audience: ["HR", "HR Assistant", "HR Executive"],
        targetView: "hr-quality", at: call.dueBy,
      });
    }
  }

  for (const edit of input.sopEdits) {
    list.push({
      id: `sop-${edit.site}-${edit.updatedOn}`, kind: "sop-edited",
      title: `Site document updated · ${edit.site}`,
      detail: `${edit.title} edited on ${edit.updatedOn} — review with your next visit`,
      audience: ["Field Officer"],
      targetView: "sops", at: edit.updatedOn,
    });
  }

  return list.sort((a, b) => b.at.localeCompare(a.at));
}
