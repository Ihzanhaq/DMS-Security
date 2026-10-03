import { describe, expect, it } from "vitest";
import { applyTemplate, toCsv } from "@/lib/export-mapper";

const columns = [{ label: "Employee" }, { label: "Gross" }, { label: "Net" }];
const rows = [["Suresh", 16000, 13160], ["Fathima", 16183, 15062]];

describe("applyTemplate", () => {
  it("renames, reorders and drops columns per template", () => {
    const template = { name: "Client A", report: "r", columns: [
      { source: "Net", header: "NET PAY", include: true },
      { source: "Employee", header: "STAFF NAME", include: true },
      { source: "Gross", header: "Gross", include: false },
    ]};
    const result = applyTemplate(columns, rows, template);
    expect(result.headers).toEqual(["NET PAY", "STAFF NAME"]);
    expect(result.rows[0]).toEqual([13160, "Suresh"]);
  });
  it("passes everything through when the template has no columns", () => {
    const result = applyTemplate(columns, rows, { name: "d", report: "r", columns: [] });
    expect(result.headers).toEqual(["Employee", "Gross", "Net"]);
    expect(result.rows).toEqual(rows);
  });
  it("ignores template columns whose source no longer exists", () => {
    const template = { name: "stale", report: "r", columns: [
      { source: "Removed", header: "GONE", include: true },
      { source: "Net", header: "Net", include: true },
    ]};
    const result = applyTemplate(columns, rows, template);
    expect(result.headers).toEqual(["Net"]);
  });
});

describe("toCsv", () => {
  it("quotes cells containing commas", () => {
    expect(toCsv(["A"], [["x,y"]])).toBe('A\n"x,y"');
  });
  it("escapes embedded quotes", () => {
    expect(toCsv(["A"], [['say "hi"']])).toBe('A\n"say ""hi"""');
  });
});
