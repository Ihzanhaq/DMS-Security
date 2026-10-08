import { describe, expect, it } from "vitest";
import { covers, isClosed, markLabel, marksFor, marksOn } from "@/lib/site-calendar";
import type { SiteCalendarMark } from "@/types/domain";

const marks: SiteCalendarMark[] = [
  { id: "h", siteId: "all", type: "holiday", title: "Onam", start: "2026-08-26", end: "2026-08-26", payMultiplier: 2 },
  { id: "c", siteId: "S1", type: "closure", title: "Renovation", start: "2026-10-10", end: "2026-10-12" },
  { id: "e", siteId: "S2", type: "event", title: "Expo", start: "2026-10-11", end: "2026-10-11", extraGuards: 4, from: "18:00", to: "23:00" },
];

describe("covers", () => {
  it("is inclusive on both ends", () => {
    expect(covers(marks[1], "2026-10-10")).toBe(true);
    expect(covers(marks[1], "2026-10-12")).toBe(true);
    expect(covers(marks[1], "2026-10-13")).toBe(false);
  });
});

describe("marksFor", () => {
  it("includes company-wide marks", () => {
    expect(marksFor(marks, "S1").map(mark => mark.id)).toEqual(["h", "c"]);
  });
});

describe("marksOn", () => {
  it("filters by site and date", () => {
    expect(marksOn(marks, "S2", "2026-10-11").map(mark => mark.id)).toEqual(["e"]);
  });
});

describe("isClosed", () => {
  it("is true only on closure days for that site", () => {
    expect(isClosed(marks, "S1", "2026-10-11")).toBe(true);
    expect(isClosed(marks, "S2", "2026-10-11")).toBe(false);
  });
});

describe("markLabel", () => {
  it("adds pay multiplier and extra guards", () => {
    expect(markLabel(marks[0])).toBe("Onam · ×2 pay");
    expect(markLabel(marks[2])).toBe("Expo · +4 guards 18:00–23:00");
    expect(markLabel(marks[1])).toBe("Renovation");
  });
});
