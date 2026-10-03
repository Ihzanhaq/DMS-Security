import type { AdvanceEligibility } from "@/types/domain";

export const ADVANCE_RATE = 0.4;

/** Spec formula: maximum advance = (earned amount − deductions) × 40%. */
export function computeAdvanceEligibility(input: {
  grossEarned: number;
  deductionsToDate: number;
  alreadyRequested: number;
}): AdvanceEligibility {
  const base = Math.max(0, input.grossEarned - input.deductionsToDate);
  const maxAdvance = Math.round(base * ADVANCE_RATE);
  return {
    grossEarned: input.grossEarned,
    deductionsToDate: input.deductionsToDate,
    maxAdvance,
    alreadyRequested: input.alreadyRequested,
    headroom: Math.max(0, maxAdvance - input.alreadyRequested),
  };
}
