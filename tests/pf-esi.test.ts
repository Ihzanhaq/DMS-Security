import { describe, expect, it } from "vitest";
import { isValidEsiIp, isValidUan, statutoryNeeds, statutoryStatus } from "@/lib/pf-esi";

describe("PF/ESI numbers", () => {
  it("validates UAN (12 digits) and ESI IP number (10 digits), ignoring spaces", () => {
    expect(isValidUan("1010 1234 5678")).toBe(true);
    expect(isValidUan("10101234567")).toBe(false);
    expect(isValidEsiIp("3112345678")).toBe(true);
    expect(isValidEsiIp("31123456")).toBe(false);
  });

  it("uses the employee's flags unless pay settings force PF/ESI on or off", () => {
    expect(statutoryNeeds({ pf: true, esi: false })).toEqual({ pf: true, esi: false });
    expect(statutoryNeeds({ pf: true, esi: false }, "disabled", "enabled")).toEqual({ pf: false, esi: true });
    expect(statutoryNeeds(undefined)).toEqual({ pf: true, esi: true });
  });

  it("lists only the numbers the employee needs", () => {
    expect(statutoryStatus({ pf: true, esi: true }, "", "").missing).toEqual(["UAN", "ESI IP number"]);
    expect(statutoryStatus({ pf: false, esi: true }, "", "3112345678")).toMatchObject({ missing: [], complete: true });
    expect(statutoryStatus({ pf: false, esi: false }).complete).toBe(true);
  });
});
