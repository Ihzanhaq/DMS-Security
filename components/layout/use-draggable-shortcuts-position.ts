"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const BUTTON_SIZE = 44;
const FAB_GAP = 8;
const DRAG_THRESHOLD = 6;
const POSITION_KEY = "bmg.shortcutsPos";

type Point = { x: number; y: number };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type Ratio = { rx: number; ry: number };

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
  last?: Point;
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return desktop;
}

function readSavedRatio(): Ratio | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Ratio>;
    if (typeof parsed.rx !== "number" || typeof parsed.ry !== "number") return null;
    return {
      rx: Math.min(1, Math.max(0, parsed.rx)),
      ry: Math.min(1, Math.max(0, parsed.ry)),
    };
  } catch {
    return null;
  }
}

function writeSavedRatio(rx: number, ry: number) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ rx, ry }));
  } catch {
    // ignore
  }
}

function getBounds(desktop: boolean, bottomBar: boolean): Bounds {
  const insetX = desktop ? 32 : 16;
  const insetTop = 8;
  const insetBottom = desktop ? 32 : bottomBar ? 140 : 80;
  const minX = insetX;
  const minY = insetTop;
  const maxX = window.innerWidth - insetX - BUTTON_SIZE;
  const maxY = window.innerHeight - insetBottom - BUTTON_SIZE;
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
  };
}

function clampToBounds(x: number, y: number, bounds: Bounds): Point {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  };
}

function pointFromRatio(ratio: Ratio, bounds: Bounds): Point {
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  return clampToBounds(bounds.minX + ratio.rx * spanX, bounds.minY + ratio.ry * spanY, bounds);
}

function ratioFromPoint(point: Point, bounds: Bounds): Ratio {
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  return {
    rx: spanX === 0 ? 1 : (point.x - bounds.minX) / spanX,
    ry: spanY === 0 ? 1 : (point.y - bounds.minY) / spanY,
  };
}

function pageFabRect(): DOMRect | null {
  const el = document.querySelector('[data-page-fab="true"]');
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  return rect;
}

function stackedPoint(): Point | null {
  const fab = pageFabRect();
  if (!fab) return null;
  return {
    x: fab.right - BUTTON_SIZE,
    y: fab.top - BUTTON_SIZE - FAB_GAP,
  };
}

function defaultPoint(desktop: boolean, bottomBar: boolean): Point {
  const bounds = getBounds(desktop, bottomBar);
  return { x: bounds.maxX, y: bounds.maxY };
}

function overlapsPageFab(x: number, y: number) {
  const fab = pageFabRect();
  if (!fab) return false;
  const pad = 6;
  return !(
    x + BUTTON_SIZE + pad < fab.left
    || x - pad > fab.right
    || y + BUTTON_SIZE + pad < fab.top
    || y - pad > fab.bottom
  );
}

function applyFabRule(point: Point, desktop: boolean, bottomBar: boolean): Point {
  const bounds = getBounds(desktop, bottomBar);
  const clamped = clampToBounds(point.x, point.y, bounds);
  const stacked = stackedPoint();
  if (stacked && overlapsPageFab(clamped.x, clamped.y)) return stacked;
  return clamped;
}

function resolvePosition(desktop: boolean, bottomBar: boolean, useSaved: boolean): Point {
  const bounds = getBounds(desktop, bottomBar);
  const ratio = useSaved ? readSavedRatio() : null;
  const base = ratio ? pointFromRatio(ratio, bounds) : defaultPoint(desktop, bottomBar);
  return applyFabRule(base, desktop, bottomBar);
}

export function useDraggableShortcutsPosition() {
  const desktop = useIsDesktop();
  const bottomBar = !desktop;
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const customRef = useRef(Boolean(typeof window !== "undefined" && readSavedRatio()));
  const dragRef = useRef<DragState | null>(null);
  const draggingRef = useRef(false);

  const syncPosition = () => {
    const next = resolvePosition(desktop, bottomBar, customRef.current);
    setPoint(next);
    setReady(true);
  };

  useLayoutEffect(() => {
    let fabObserver: ResizeObserver | null = null;
    let retryId = 0;
    let retries = 0;

    const sync = () => {
      if (draggingRef.current) return;
      syncPosition();
    };

    const watchFab = () => {
      fabObserver?.disconnect();
      fabObserver = null;
      const el = document.querySelector('[data-page-fab="true"]');
      if (!el) return;
      fabObserver = new ResizeObserver(sync);
      fabObserver.observe(el);
    };

    const retry = () => {
      const fabExpected = Boolean(document.querySelector('[data-page-fab="true"]'));
      if (fabExpected && !pageFabRect() && retries < 8) {
        retries += 1;
        retryId = window.requestAnimationFrame(() => {
          sync();
          watchFab();
          retry();
        });
      }
    };

    sync();
    watchFab();
    retry();
    window.addEventListener("resize", sync);

    return () => {
      fabObserver?.disconnect();
      if (retryId) window.cancelAnimationFrame(retryId);
      window.removeEventListener("resize", sync);
    };
  }, [desktop, bottomBar]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: point.x,
      origY: point.y,
      moved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    draggingRef.current = true;
    setDragging(true);
    const bounds = getBounds(desktop, bottomBar);
    const next = clampToBounds(drag.origX + dx, drag.origY + dy, bounds);
    drag.last = next;
    setPoint(next);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>): boolean => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = drag.moved;
    const last = drag.last;
    dragRef.current = null;
    draggingRef.current = false;
    setDragging(false);

    if (moved && last) {
      customRef.current = true;
      const resolved = applyFabRule(last, desktop, bottomBar);
      setPoint(resolved);
      const bounds = getBounds(desktop, bottomBar);
      const ratio = ratioFromPoint(resolved, bounds);
      writeSavedRatio(ratio.rx, ratio.ry);
    }

    return moved;
  };

  return {
    desktop,
    point,
    ready,
    dragging,
    buttonSize: BUTTON_SIZE,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

export const SHORTCUTS_MENU_WIDTH = 288;
