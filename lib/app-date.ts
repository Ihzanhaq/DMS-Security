/** Single operational "today" for demos and date pickers across the app. */
export const APP_TODAY = "2026-09-22";

export function formatAppDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
