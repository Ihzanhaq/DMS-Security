import type {
  ApprovedDuty, BenefitOverride, EmployeePayRule, PayrollBreakdown, PayrollDeduction,
  PayrollDutyLine, PayrollException, PayrollSiteBreakdown, PostRateRule, SitePayRule,
  StatutorySettings,
} from "@/types/domain";

export type PayrollCalculatorInput = {
  employeeId: string;
  period: string;
  duties: ApprovedDuty[];
  employeeRules: EmployeePayRule[];
  siteRules: SitePayRule[];
  postRules: PostRateRule[];
  deductions: PayrollDeduction[];
  statutory: StatutorySettings;
  includePaidLeave?: boolean;
};

const money2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function effective<T extends { effectiveFrom: string }>(rules: T[], date: string) {
  return rules
    .filter(rule => rule.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

function benefitValue(override: BenefitOverride, inherited: boolean) {
  if (override === "enabled") return true;
  if (override === "disabled") return false;
  return inherited;
}

/** Allocate an integer total proportionally without losing or creating a rupee. */
function allocateInteger(total: number, weights: number[]) {
  const result = weights.map(() => 0);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || weightTotal <= 0) return result;
  const raw = weights.map(value => total * value / weightTotal);
  raw.forEach((value, index) => { result[index] = Math.floor(value); });
  const remaining = total - result.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) result[order[index % order.length].index] += 1;
  return result;
}

export function calculatePayroll(input: PayrollCalculatorInput): PayrollBreakdown {
  const exceptions: PayrollException[] = [];
  const periodDuties = input.duties
    .filter(duty => duty.employeeId === input.employeeId && duty.date.startsWith(input.period))
    .filter(duty => duty.status === "approved" && (!duty.paidLeave || input.includePaidLeave !== false))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const lines: PayrollDutyLine[] = periodDuties.map(duty => {
    const employeeRule = effective(input.employeeRules.filter(rule => rule.employeeId === duty.employeeId), duty.date);
    const siteRule = effective(input.siteRules.filter(rule => rule.site === duty.site), duty.date);
    const postRule = effective(input.postRules.filter(rule => rule.site === duty.site && rule.post === duty.post), duty.date);
    let rate: number | null = null;
    let rateSource: PayrollDutyLine["rateSource"] = "Missing";

    if (!employeeRule) {
      exceptions.push({ dutyId: duty.id, code: "missing-employee-rule", message: `No employee pay rule applies on ${duty.date}.` });
    } else if (employeeRule.basis === "monthly") {
      if (!employeeRule.monthlySalary || employeeRule.payableDays <= 0) {
        exceptions.push({ dutyId: duty.id, code: "invalid-denominator", message: `Monthly salary or payable days are invalid on ${duty.date}.` });
      } else {
        rate = employeeRule.monthlySalary / employeeRule.payableDays;
        rateSource = "Monthly";
      }
    } else if (employeeRule.basis === "daily") {
      rate = employeeRule.dailyRate && employeeRule.dailyRate > 0 ? employeeRule.dailyRate : null;
      rateSource = rate === null ? "Missing" : "Daily";
      if (rate === null) exceptions.push({ dutyId: duty.id, code: "missing-employee-rule", message: `No employee duty rate applies on ${duty.date}.` });
    } else if (postRule?.dutyRate) {
      rate = postRule.dutyRate;
      rateSource = "Post";
    } else if (siteRule?.defaultDutyRate) {
      rate = siteRule.defaultDutyRate;
      rateSource = "Site";
    } else {
      exceptions.push({ dutyId: duty.id, code: "missing-site-rate", message: `${duty.site} has no site or post duty rate on ${duty.date}.` });
    }

    if (!siteRule) exceptions.push({ dutyId: duty.id, code: "missing-site-rule", message: `${duty.site} has no statutory profile on ${duty.date}.` });
    const inheritedPf = siteRule?.scheme === "pf-esi";
    const inheritedEsi = siteRule?.scheme === "pf-esi" || siteRule?.scheme === "esi";
    const pfEligible = employeeRule ? benefitValue(employeeRule.pfOverride, inheritedPf) : inheritedPf;
    const esiEligible = employeeRule ? benefitValue(employeeRule.esiOverride, inheritedEsi) : inheritedEsi;

    return {
      id: duty.id, date: duty.date, site: duty.site, post: duty.post, quantity: duty.quantity,
      rate: rate === null ? null : money2(rate), rateSource,
      gross: rate === null ? 0 : money2(rate * duty.quantity), pfEligible, esiEligible,
    };
  });

  const grouped = new Map<string, PayrollDutyLine[]>();
  lines.forEach(line => grouped.set(line.site, [...(grouped.get(line.site) ?? []), line]));
  const sites: PayrollSiteBreakdown[] = Array.from(grouped.entries()).map(([site, siteLines]) => {
    const grossExact = money2(siteLines.reduce((sum, line) => sum + line.gross, 0));
    const pf = siteLines.some(line => line.pfEligible);
    const esi = siteLines.some(line => line.esiEligible);
    return {
      site,
      duties: money2(siteLines.reduce((sum, line) => sum + line.quantity, 0)),
      grossExact,
      gross: 0,
      pf: 0,
      esi: 0,
      net: 0,
      schemeLabel: pf && esi ? "PF + ESI" : esi ? "ESI" : pf ? "PF" : "Salary only",
      rateSources: Array.from(new Set(siteLines.map(line => line.rateSource))),
      lines: siteLines,
    };
  });

  const grossExact = money2(sites.reduce((sum, site) => sum + site.grossExact, 0));
  const gross = Math.round(grossExact);
  const grossBySite = allocateInteger(gross, sites.map(site => site.grossExact));
  grossBySite.forEach((value, index) => { sites[index].gross = value; });

  const pfWeights = sites.map(site => money2(site.lines.filter(line => line.pfEligible).reduce((sum, line) => sum + line.gross, 0)));
  const pfEligibleGross = pfWeights.reduce((sum, value) => sum + value, 0);
  const pf = Math.round(Math.min(pfEligibleGross, input.statutory.pfWageCeiling) * input.statutory.pfRate);
  allocateInteger(pf, pfWeights).forEach((value, index) => { sites[index].pf = value; });

  const esiWeights = sites.map(site => money2(site.lines.filter(line => line.esiEligible).reduce((sum, line) => sum + line.gross, 0)));
  const esiEligibleGross = esiWeights.reduce((sum, value) => sum + value, 0);
  const esi = grossExact <= input.statutory.esiWageCeiling
    ? Math.round(esiEligibleGross * input.statutory.esiRate)
    : 0;
  allocateInteger(esi, esiWeights).forEach((value, index) => { sites[index].esi = value; });

  sites.forEach(site => { site.net = site.gross - site.pf - site.esi; });
  const deductions = input.deductions.filter(item => item.employeeId === input.employeeId && item.period === input.period);
  const otherDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  const employeeRule = effective(input.employeeRules.filter(rule => rule.employeeId === input.employeeId), `${input.period}-31`);

  return {
    employeeId: input.employeeId,
    period: input.period,
    payBasis: employeeRule?.basis ?? "monthly",
    duties: money2(lines.reduce((sum, line) => sum + line.quantity, 0)),
    gross,
    pf,
    esi,
    otherDeductions,
    net: gross - pf - esi - otherDeductions,
    sites,
    deductions,
    exceptions,
  };
}

export function payBasisLabel(basis: PayrollBreakdown["payBasis"]) {
  return basis === "monthly" ? "Monthly salary" : basis === "daily" ? "Fixed daily rate" : "Site-wise rate";
}
