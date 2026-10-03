import { describe, expect, it } from "vitest";
import { formatBytes, MAX_UPLOAD_BYTES, uploadProblem } from "@/lib/file-store";

describe("uploadProblem", () => {
  it("accepts PDFs and images under the limit", () => {
    expect(uploadProblem({ size: 200_000, type: "application/pdf" })).toBeNull();
    expect(uploadProblem({ size: 200_000, type: "image/jpeg" })).toBeNull();
  });
  it("refuses other types, oversized and empty files", () => {
    expect(uploadProblem({ size: 10, type: "application/zip" })).toMatch(/Only PDF/);
    expect(uploadProblem({ size: MAX_UPLOAD_BYTES + 1, type: "image/png" })).toMatch(/limit is 5.0 MB/);
    expect(uploadProblem({ size: 0, type: "image/png" })).toMatch(/empty/);
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
