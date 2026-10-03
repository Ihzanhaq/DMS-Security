import { describe, expect, it } from "vitest";
import { deriveNotifications } from "@/lib/notifications";

const today = "2026-09-22";

describe("deriveNotifications", () => {
  it("flags a pending document past its due date", () => {
    const result = deriveNotifications({
      today,
      employees: [{ id: "E1", name: "Test Guard", joiningDate: "2026-09-01", pfEsiDataReceived: true }],
      documents: [{ id: "D1", employeeId: "E1", type: "PCC", status: "pending", dueBy: "2026-09-18" }],
      guardChanges: [], spareDutyPayments: [], satisfactionCalls: [], sopEdits: [],
    });
    expect(result.some(item => item.kind === "doc-delay" && item.title.includes("PCC"))).toBe(true);
  });

  it("does not flag uploaded or not-yet-due documents", () => {
    const result = deriveNotifications({
      today,
      employees: [{ id: "E1", name: "A", joiningDate: "2026-09-01", pfEsiDataReceived: true }],
      documents: [
        { id: "D1", employeeId: "E1", type: "PCC", status: "uploaded", dueBy: "2026-09-18", uploadedOn: "2026-09-17" },
        { id: "D2", employeeId: "E1", type: "Photo", status: "pending", dueBy: "2026-09-30" },
      ],
      guardChanges: [], spareDutyPayments: [], satisfactionCalls: [], sopEdits: [],
    });
    expect(result.filter(item => item.kind === "doc-delay")).toHaveLength(0);
  });

  it("flags missing PF/ESI data 15 days after joining, but not before", () => {
    const base = { today, documents: [], guardChanges: [], spareDutyPayments: [], satisfactionCalls: [], sopEdits: [] };
    const late = deriveNotifications({ ...base, employees: [{ id: "E1", name: "A", joiningDate: "2026-09-01", pfEsiDataReceived: false }] });
    const early = deriveNotifications({ ...base, employees: [{ id: "E2", name: "B", joiningDate: "2026-09-15", pfEsiDataReceived: false }] });
    const received = deriveNotifications({ ...base, employees: [{ id: "E3", name: "C", joiningDate: "2026-09-01", pfEsiDataReceived: true }] });
    expect(late.some(item => item.kind === "pf-esi-15day")).toBe(true);
    expect(early.some(item => item.kind === "pf-esi-15day")).toBe(false);
    expect(received.some(item => item.kind === "pf-esi-15day")).toBe(false);
  });

  it("notifies FOs about guard changes and Ops+Finance about spare-duty payments", () => {
    const result = deriveNotifications({
      today, employees: [], documents: [], satisfactionCalls: [], sopEdits: [],
      guardChanges: [{ id: "GC1", site: "Site A", post: "Gate", outgoing: "X", incoming: "Y", at: "2026-09-22 08:00" }],
      spareDutyPayments: [{ id: "SP1", employeeId: "E9", date: "2026-09-22", site: "Site A", amount: 650, status: "transferred" }],
    });
    const change = result.find(item => item.kind === "guard-change");
    const spare = result.find(item => item.kind === "spare-duty");
    expect(change?.audience).toContain("Field Officer");
    expect(spare?.audience).toEqual(expect.arrayContaining(["Operations In-charge", "Finance"]));
  });

  it("raises due satisfaction calls for HR and SOP edits for FOs", () => {
    const result = deriveNotifications({
      today,
      employees: [{ id: "E1", name: "New Guard", joiningDate: "2026-09-16", pfEsiDataReceived: true }],
      documents: [], guardChanges: [], spareDutyPayments: [],
      satisfactionCalls: [
        { id: "S1", employeeId: "E1", joinedOn: "2026-09-16", dueBy: "2026-09-19", status: "due" },
        { id: "S2", employeeId: "E1", joinedOn: "2026-09-01", dueBy: "2026-09-04", status: "done", score: 8 },
      ],
      sopEdits: [{ site: "Site A", title: "Loading bay SOP", updatedOn: "2026-09-21", officer: "Ajmal Khan" }],
    });
    const satisfaction = result.filter(item => item.kind === "satisfaction-due");
    expect(satisfaction).toHaveLength(1);
    expect(satisfaction[0].audience).toContain("HR");
    expect(result.some(item => item.kind === "sop-edited" && item.audience.includes("Field Officer"))).toBe(true);
  });
});
