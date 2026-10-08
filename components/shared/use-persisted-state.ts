"use client";

import { useEffect, useRef, useState } from "react";

/**
 * State seeded from mock data, saved to localStorage and mirrored to other open tabs.
 * Stored data loads after hydration so server and first client render match.
 */
export function usePersistedState<T>(key: string, seed: T) {
  const [state, setState] = useState<T>(seed);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  /** Set while applying another tab's snapshot so it isn't echoed back. */
  const fromRemote = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null;
        if (stored) setState(stored);
      } catch { /* corrupt storage falls back to seed data */ }
      setReady(true);
    });
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(key);
      channel.onmessage = (event: MessageEvent<T>) => { fromRemote.current = true; setState(event.data); };
      channelRef.current = channel;
    }
    return () => { window.clearTimeout(timer); channelRef.current?.close(); channelRef.current = null; };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(key, JSON.stringify(state));
    if (fromRemote.current) { fromRemote.current = false; return; }
    channelRef.current?.postMessage(state);
  }, [key, ready, state]);

  return [state, setState, ready] as const;
}
