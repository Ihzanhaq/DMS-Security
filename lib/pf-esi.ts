import type { BenefitOverride, Employee } from "@/types/domain";

/** PF Universal Account Number: 12 digits. */
export const isValidUan = (value: string) => /^\d{12}$/.test(value.replace(/\s/g, ""));
/** ESI Insurance Person (IP) number: 10 digits. */
export const isValidEsiIp = (value: string) => /^\d{10}$/.test(value.replace(/\s/g, ""));

export type StatutoryNeeds = { pf: boolean; esi: boolean };

/**
 * Whether PF and ESI apply: the employee's own flags, unless their pay settings force them on or off.
 * For a new employee with no record, "same as site" counts as needed so the numbers can still be collected.
 */
export function statutoryNeeds(employee: Pick<Employee, "pf" | "esi"> | undefined, pfOverride: BenefitOverride = "inherit", esiOverride: BenefitOverride = "inherit"): StatutoryNeeds {
  const resolve = (override: BenefitOverride, own: boolean | undefined) => override === "enabled" ? true : override === "disabled" ? false : own ?? true;
  return { pf: resolve(pfOverride, employee?.pf), esi: resolve(esiOverride, employee?.esi) };
}

export type StatutoryStatus = {
  needs: StatutoryNeeds;
  /** Numbers still missing or invalid, in plain words. */
  missing: string[];
  /** True when every number this employee needs is on file. */
  complete: boolean;
};

export function statutoryStatus(needs: StatutoryNeeds, uan = "", esiIp = ""): StatutoryStatus {
  const missing = [
    needs.pf && !isValidUan(uan) ? "UAN" : null,
    needs.esi && !isValidEsiIp(esiIp) ? "ESI IP number" : null,
  ].filter((item): item is string => !!item);
  return { needs, missing, complete: missing.length === 0 };
}

export const daysSince = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
