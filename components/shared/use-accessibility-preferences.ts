"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  accessibilityPreferencesSnapshot,
  defaultAccessibilityPreferences,
  subscribeAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/lib/accessibility-preferences";

const serverSnapshot = JSON.stringify(defaultAccessibilityPreferences());

export function useAccessibilityPreferences(): AccessibilityPreferences {
  // Derive from the snapshot React hands back: it is the server default during hydration,
  // then the saved preference, so the first client render matches the server HTML.
  const snapshot = useSyncExternalStore(
    subscribeAccessibilityPreferences,
    accessibilityPreferencesSnapshot,
    () => serverSnapshot,
  );
  return useMemo(() => JSON.parse(snapshot) as AccessibilityPreferences, [snapshot]);
}
