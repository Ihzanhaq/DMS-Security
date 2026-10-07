export type UnifiedSidebarTheme = "white" | "navy";

export type AccessibilityPreferences = {
  showQuickActions: boolean;
  unifiedSidebar: boolean;
  unifiedSidebarTheme: UnifiedSidebarTheme;
};

const STORAGE_KEY = "bmg-accessibility-v1";
const CHANGE_EVENT = "bmg:accessibilityChanged";

export function defaultAccessibilityPreferences(): AccessibilityPreferences {
  return {
    showQuickActions: true,
    unifiedSidebar: false,
    unifiedSidebarTheme: "white",
  };
}

function defaultPreferences(): AccessibilityPreferences {
  return defaultAccessibilityPreferences();
}

function normalize(raw: Partial<AccessibilityPreferences> | null | undefined): AccessibilityPreferences {
  const base = defaultPreferences();
  if (!raw || typeof raw !== "object") return base;
  return {
    showQuickActions: raw.showQuickActions !== false,
    unifiedSidebar: raw.unifiedSidebar === true,
    unifiedSidebarTheme: raw.unifiedSidebarTheme === "navy" ? "navy" : "white",
  };
}

function read(): AccessibilityPreferences {
  if (typeof window === "undefined") return defaultPreferences();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<AccessibilityPreferences>;
    return normalize(parsed);
  } catch {
    return defaultPreferences();
  }
}

let cached: AccessibilityPreferences | null = null;

function getCached(): AccessibilityPreferences {
  if (cached === null) cached = read();
  return cached;
}

function persist(next: AccessibilityPreferences) {
  cached = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getAccessibilityPreferences(): AccessibilityPreferences {
  return getCached();
}

export function setAccessibilityPreference<K extends keyof AccessibilityPreferences>(
  key: K,
  value: AccessibilityPreferences[K],
) {
  persist({ ...getCached(), [key]: value });
}

export function subscribeAccessibilityPreferences(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export function accessibilityPreferencesSnapshot() {
  if (typeof window !== "undefined") cached = read();
  return JSON.stringify(getCached());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) cached = read();
  });
}
