import { describe, expect, it } from "vitest";
import { computeAdvanceEligibility } from "@/lib/advance-calculator";

describe("computeAdvanceEligibility", () => {
  it("caps at 40% of (earned minus deductions)", () => {
    const result = computeAdvanceEligibility({ grossEarned: 10000, deductionsToDate: 2000, alreadyRequested: 0 });
    expect(result.maxAdvance).toBe(3200); // (10000-2000)*0.4
    expect(result.headroom).toBe(3200);
  });
  it("subtracts already-requested advances from headroom", () => {
    const result = computeAdvanceEligibility({ grossEarned: 10000, deductionsToDate: 2000, alreadyRequested: 3000 });
    expect(result.maxAdvance).toBe(3200);
    expect(result.headroom).toBe(200);
  });
  it("never goes negative", () => {
    const result = computeAdvanceEligibility({ grossEarned: 1000, deductionsToDate: 2000, alreadyRequested: 500 });
    expect(result.maxAdvance).toBe(0);
    expect(result.headroom).toBe(0);
  });
  it("rounds to the rupee", () => {
    const result = computeAdvanceEligibility({ grossEarned: 4923, deductionsToDate: 0, alreadyRequested: 0 });
    expect(result.maxAdvance).toBe(1969); // 4923*0.4 = 1969.2
  });
  it("echoes its inputs for display", () => {
    const result = computeAdvanceEligibility({ grossEarned: 8615, deductionsToDate: 1121, alreadyRequested: 3000 });
    expect(result.grossEarned).toBe(8615);
    expect(result.deductionsToDate).toBe(1121);
    expect(result.alreadyRequested).toBe(3000);
  });
});
