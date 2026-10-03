import type { ExportTemplate } from "@/types/domain";

type Cell = string | number;

/** Rename, reorder and drop report columns per a client's saved template. */
export function applyTemplate(
  columns: { label: string }[],
  rows: Cell[][],
  template: ExportTemplate,
): { headers: string[]; rows: Cell[][] } {
  if (!template.columns.length) return { headers: columns.map(column => column.label), rows };
  const active = template.columns.filter(column => column.include);
  const indexOf = (source: string) => columns.findIndex(column => column.label === source);
  const picks = active.map(column => ({ header: column.header, index: indexOf(column.source) })).filter(pick => pick.index >= 0);
  return {
    headers: picks.map(pick => pick.header),
    rows: rows.map(row => picks.map(pick => row[pick.index])),
  };
}

export function toCsv(headers: string[], rows: Cell[][]) {
  const escape = (cell: Cell) => {
    const text = String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(escape).join(","), ...rows.map(row => row.map(escape).join(","))].join("\n");
}
