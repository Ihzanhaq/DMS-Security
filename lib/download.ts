import { toCsv } from "@/lib/export-mapper";

type Cell = string | number;

/** Builds a CSV with `toCsv` and hands it to the browser as a file download. */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
