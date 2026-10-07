"use client";

import { useSyncExternalStore } from "react";
import {
  DESKTOP_ALERTS_EVENT, desktopAlertState, desktopAlertsEnabled, enableDesktopAlerts, setDesktopAlertsEnabled,
  type DesktopAlertState,
} from "@/lib/browser-notify";

// Permission can also change in browser settings, so re-read on focus as well as on our own change event.
const subscribe = (callback: () => void) => {
  window.addEventListener("focus", callback);
  window.addEventListener(DESKTOP_ALERTS_EVENT, callback);
  return () => {
    window.removeEventListener("focus", callback);
    window.removeEventListener(DESKTOP_ALERTS_EVENT, callback);
  };
};

/** Current desktop-alert permission and the user's on/off switch. */
export function useDesktopAlerts() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${desktopAlertState()}|${desktopAlertsEnabled() ? "on" : "off"}`,
    () => "unsupported|off",
  );
  const [state, pref] = snapshot.split("|") as [DesktopAlertState, "on" | "off"];
  return {
    state,
    /** True when alerts will actually show: permission granted and the switch on. */
    active: state === "granted" && pref === "on",
    enabled: pref === "on",
    requestPermission: enableDesktopAlerts,
    setEnabled: setDesktopAlertsEnabled,
  };
}
