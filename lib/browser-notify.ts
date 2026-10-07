/**
 * Desktop notifications: a system notification when the tab is in the background,
 * and nothing extra when it is in front (the caller shows an in-app toast instead).
 * Turned on from Settings → Notifications; needs both browser permission and the user's own switch.
 */

export type DesktopAlertState = "unsupported" | "default" | "granted" | "denied";

/** Fired on window when a notification is clicked; the app shell listens and navigates. */
export const NAVIGATE_EVENT = "bmg:navigate";
/** Fired on window whenever permission or the on/off preference changes, so hooks can re-read. */
export const DESKTOP_ALERTS_EVENT = "bmg:desktop-alerts";

const PREF_KEY = "bmg-desktop-alerts";

export function desktopAlertState(): DesktopAlertState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as DesktopAlertState;
}

/** The user's own switch. Defaults to on once permission has been granted. */
export function desktopAlertsEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREF_KEY) !== "off";
}

export function setDesktopAlertsEnabled(enabled: boolean) {
  window.localStorage.setItem(PREF_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event(DESKTOP_ALERTS_EVENT));
}

/** Must be called from a click: browsers only show the permission prompt for a user gesture. */
export async function enableDesktopAlerts(): Promise<DesktopAlertState> {
  if (desktopAlertState() === "unsupported") return "unsupported";
  const result = (await Notification.requestPermission()) as DesktopAlertState;
  if (result === "granted") setDesktopAlertsEnabled(true);
  else window.dispatchEvent(new Event(DESKTOP_ALERTS_EVENT));
  return result;
}

/**
 * Shows a system notification when allowed. By default only while the tab is hidden;
 * `force` shows it regardless, for the test button in Settings. Returns true when one was shown.
 */
export function showDesktopAlert({ title, body, tag, view, force = false }: { title: string; body: string; tag?: string; view?: string; force?: boolean }) {
  if (desktopAlertState() !== "granted" || !desktopAlertsEnabled()) return false;
  if (!force && document.visibilityState === "visible") return false;
  const notification = new Notification(title, { body, tag, icon: "/favicon.svg", badge: "/favicon.svg" });
  notification.onclick = () => {
    window.focus();
    if (view) window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { view } }));
    notification.close();
  };
  return true;
}
