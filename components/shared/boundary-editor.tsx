"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Circle, Hexagon, Maximize2, Move, PenLine, Trash2, Undo2 } from "lucide-react";
import { Button, SegmentedControl } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import type { LatLng } from "./geo-map";

export type BoundaryMode = "circle" | "polygon";

const STYLE = { color: "#00be73", weight: 2, fillColor: "#00be73", fillOpacity: .15 };
const round = (value: number) => Number(value.toFixed(6));
const toPoint = (latlng: Leaflet.LatLng): LatLng => ({ lat: round(latlng.lat), lng: round(latlng.lng) });

/** Approximate area in m² (equirectangular projection, accurate enough for a site boundary). */
export function polygonArea(points: LatLng[]) {
  if (points.length < 3) return 0;
  const R = 6371000;
  const lat0 = points.reduce((sum, p) => sum + p.lat, 0) / points.length * Math.PI / 180;
  const xy = points.map(p => [p.lng * Math.PI / 180 * R * Math.cos(lat0), p.lat * Math.PI / 180 * R]);
  let area = 0;
  xy.forEach(([x1, y1], i) => { const [x2, y2] = xy[(i + 1) % xy.length]; area += x1 * y2 - x2 * y1; });
  return Math.abs(area / 2);
}

/** Regular polygon approximating a circle, so a radius boundary can be refined corner by corner. */
function circleToPolygon(center: LatLng, radius: number, sides = 8): LatLng[] {
  const dLat = radius / 111320;
  const dLng = radius / (111320 * Math.cos(center.lat * Math.PI / 180));
  return Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * Math.PI * 2;
    return { lat: round(center.lat + dLat * Math.sin(angle)), lng: round(center.lng + dLng * Math.cos(angle)) };
  });
}

const samePolygon = (a: LatLng[], b: LatLng[]) => a.length === b.length && a.every((p, i) => p.lat === b[i].lat && p.lng === b[i].lng);

/**
 * Site boundary editor built on Leaflet-Geoman.
 * Circle: drag the centre or the edge handle to resize.
 * Polygon: drag corners, drag the faint midpoint handles to add corners, right-click a corner to remove it.
 */
export function BoundaryEditor({ mode, onModeChange, center, radius, polygon, onCircleChange, onPolygonChange }: {
  mode: BoundaryMode;
  onModeChange: (mode: BoundaryMode) => void;
  center: LatLng;
  radius: number;
  polygon: LatLng[];
  onCircleChange: (center: LatLng, radius: number) => void;
  onPolygonChange: (points: LatLng[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const libRef = useRef<typeof Leaflet | null>(null);
  const shapeRef = useRef<Leaflet.Circle | Leaflet.Polygon | null>(null);
  const streetRef = useRef<Leaflet.TileLayer | null>(null);
  const satelliteRef = useRef<Leaflet.TileLayer | null>(null);
  const emittedRef = useRef<LatLng[]>(polygon);
  const [ready, setReady] = useState(false);
  /** Bumped to force the editable shape to be rebuilt (after drawing or cancelling). */
  const [redrawKey, setRedrawKey] = useState(0);
  const fittedRef = useRef(false);
  const [drawing, setDrawing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [layer, setLayer] = useState<"street" | "satellite">("satellite");
  const [history, setHistory] = useState<LatLng[][]>([]);

  const latest = useRef({ onCircleChange, onPolygonChange });
  useEffect(() => { latest.current = { onCircleChange, onPolygonChange }; }, [onCircleChange, onPolygonChange]);

  /** `fromMap`: the map already shows `next`, so the redraw effect can skip rebuilding the layer. */
  const commitPolygon = (next: LatLng[], previous: LatLng[], fromMap = false) => {
    setHistory(current => [...current.slice(-29), previous]);
    if (fromMap) emittedRef.current = next;
    latest.current.onPolygonChange(next);
  };
  const commitRef = useRef(commitPolygon);
  useEffect(() => { commitRef.current = commitPolygon; });

  // Create the map once. Geoman is a classic script that patches the global `L`, so Leaflet is exposed on window first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const imported = await import("leaflet");
      const L = (imported.default ?? imported) as typeof Leaflet;
      (window as unknown as { L: typeof Leaflet }).L = L;
      await import("@geoman-io/leaflet-geoman-free");
      if (cancelled || !hostRef.current || mapRef.current) return;
      libRef.current = L;
      const map = L.map(hostRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([center.lat, center.lng], 18);
      streetRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      satelliteRef.current = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19, attribution: "Imagery &copy; Esri",
      }).addTo(map);
      map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: true, pathOptions: STYLE, templineStyle: STYLE, hintlineStyle: { ...STYLE, dashArray: "5 5" } });
      map.on("pm:create", event => {
        setDrawing(false);
        if (event.layer instanceof L.Circle) {
          const created = event.layer;
          created.remove();
          setRedrawKey(key => key + 1);
          latest.current.onCircleChange(toPoint(created.getLatLng()), Math.max(10, Math.round(created.getRadius())));
          return;
        }
        const created = event.layer as Leaflet.Polygon;
        const points = (created.getLatLngs()[0] as Leaflet.LatLng[]).map(toPoint);
        created.remove();
        commitRef.current(points, emittedRef.current);
      });
      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 60);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      shapeRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !streetRef.current || !satelliteRef.current) return;
    const [show, hide] = layer === "satellite" ? [satelliteRef.current, streetRef.current] : [streetRef.current, satelliteRef.current];
    hide.remove();
    show.addTo(map);
  }, [ready, layer]);

  // (Re)draw the editable shape whenever the mode or the value changes from outside the map.
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!ready || !map || !L) return;
    if (mode === "polygon" && shapeRef.current instanceof L.Polygon && samePolygon(polygon, emittedRef.current)) return;
    shapeRef.current?.remove();
    shapeRef.current = null;
    emittedRef.current = polygon;
    setMoving(false);

    if (mode === "circle") {
      const circle = L.circle([center.lat, center.lng], { radius, ...STYLE }).addTo(map);
      circle.pm.enable({ snappable: false });
      const emit = () => latest.current.onCircleChange(toPoint(circle.getLatLng()), Math.round(circle.getRadius()));
      circle.on("pm:edit", emit);
      circle.on("pm:dragend", emit);
      shapeRef.current = circle;
      if (!fittedRef.current) { fittedRef.current = true; map.fitBounds(circle.getBounds().pad(.4)); }
      return;
    }
    if (polygon.length < 3) return;
    const shape = L.polygon(polygon.map(p => [p.lat, p.lng] as [number, number]), STYLE).addTo(map);
    shape.pm.enable({ allowSelfIntersection: false, snappable: false });
    const emit = () => {
      const next = (shape.getLatLngs()[0] as Leaflet.LatLng[]).map(toPoint);
      if (samePolygon(next, emittedRef.current)) return;
      commitRef.current(next, emittedRef.current, true);
    };
    shape.on("pm:edit", emit);
    shape.on("pm:dragend", emit);
    shapeRef.current = shape;
    if (!fittedRef.current) { fittedRef.current = true; map.fitBounds(shape.getBounds().pad(.3)); }
  }, [ready, mode, polygon, center.lat, center.lng, radius, redrawKey]);

  // Keep the circle in sync with the latitude/longitude/radius fields without rebuilding it.
  useEffect(() => {
    const L = libRef.current;
    const shape = shapeRef.current;
    if (!ready || !L || !(shape instanceof L.Circle)) return;
    shape.setLatLng([center.lat, center.lng]);
    shape.setRadius(radius);
  }, [ready, center.lat, center.lng, radius]);

  const startDrawing = () => {
    const map = mapRef.current;
    if (!map) return;
    shapeRef.current?.remove();
    shapeRef.current = null;
    setDrawing(true);
    if (mode === "circle") map.pm.enableDraw("Circle", { snappable: false });
    else map.pm.enableDraw("Polygon", { snappable: false, finishOn: "dblclick" });
  };
  const cancelDrawing = () => {
    mapRef.current?.pm.disableDraw();
    setDrawing(false);
    emittedRef.current = [];
    setRedrawKey(key => key + 1);
  };
  const changeMode = (next: BoundaryMode) => {
    if (drawing) cancelDrawing();
    onModeChange(next);
  };
  const toggleMove = () => {
    const shape = shapeRef.current;
    if (!shape) return;
    if (moving) { shape.pm.disableLayerDrag(); shape.pm.enable({ allowSelfIntersection: false, snappable: false }); }
    else { shape.pm.disable(); shape.pm.enableLayerDrag(); }
    setMoving(!moving);
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(current => current.slice(0, -1));
    latest.current.onPolygonChange(previous);
  };
  const fit = () => {
    const map = mapRef.current;
    const shape = shapeRef.current;
    if (map && shape) map.fitBounds(shape.getBounds().pad(.3));
  };

  const startFromCircle = () => commitPolygon(circleToPolygon(center, radius), polygon);
  const clear = () => { if (polygon.length) commitPolygon([], polygon); };

  // Keyboard shortcuts. Ignored while typing in a field; the handler reads the latest render through a ref.
  const keysRef = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keysRef.current = event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable=true]") || event.altKey) return;
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      if (mod && key === "z") { if (mode === "polygon" && !drawing) { event.preventDefault(); undo(); } return; }
      if (mod) return;
      if (key === "escape") { if (drawing) cancelDrawing(); else if (moving) toggleMove(); return; }
      if (key === "delete" && event.shiftKey) { if (mode === "polygon" && !drawing) clear(); return; }
      if (event.shiftKey) return;
      const actions: Record<string, () => void> = {
        d: () => { if (!drawing) startDrawing(); },
        m: () => { if (!drawing && (mode === "circle" || polygon.length >= 3)) toggleMove(); },
        f: fit,
        s: () => setLayer(current => current === "satellite" ? "street" : "satellite"),
        c: () => changeMode("circle"),
        p: () => changeMode("polygon"),
        o: () => { if (mode === "polygon" && !drawing) startFromCircle(); },
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keysRef.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const area = mode === "polygon" ? polygonArea(polygon) : Math.PI * radius * radius;
  const hint = drawing
    ? mode === "circle"
      ? "Click the centre of the site, move outward, then click again to set the radius."
      : "Click each corner of the site. Click the first corner or double-click to finish."
    : moving
      ? `Drag the ${mode === "circle" ? "circle" : "shape"} anywhere to move it. Click 'Done moving' when finished.`
      : mode === "circle"
        ? "Drag the centre to move the boundary. Drag the handle on the edge to resize it."
        : polygon.length < 3
          ? "Draw the site outline, or start from the current circle and adjust it."
          : "Drag a corner to adjust it · drag a faint midpoint to add a corner · right-click a corner to remove it.";

  return <div>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <SegmentedControl className="mb-0" options={[{ id: "circle", label: "Circle" }, { id: "polygon", label: "Custom shape" }] as const} value={mode} onChange={changeMode} />
      <SegmentedControl className="mb-0 ml-auto" options={[{ id: "satellite", label: "Satellite" }, { id: "street", label: "Street" }] as const} value={layer} onChange={setLayer} />
    </div>

    {mode === "circle" && <div className="mb-3 flex flex-wrap items-center gap-2">
      {drawing
        ? <Button size="sm" variant="outline" onClick={cancelDrawing} title="Esc">Cancel drawing<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">Esc</kbd></Button>
        : <>
          <Button size="sm" onClick={startDrawing} title="Shortcut: D"><PenLine />Draw circle<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">D</kbd></Button>
          <Button size="sm" variant="outline" onClick={toggleMove} aria-pressed={moving} title={moving ? "Shortcut: Esc or M" : "Shortcut: M"}><Move />{moving ? "Done moving" : "Move circle"}<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">M</kbd></Button>
        </>}
    </div>}

    {mode === "polygon" && <div className="mb-3 flex flex-wrap items-center gap-2">
      {drawing
        ? <Button size="sm" variant="outline" onClick={cancelDrawing} title="Esc">Cancel drawing<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">Esc</kbd></Button>
        : <>
          <Button size="sm" onClick={startDrawing} title="Shortcut: D"><PenLine />{polygon.length >= 3 ? "Redraw" : "Draw outline"}<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">D</kbd></Button>
          <Button size="sm" variant="outline" onClick={startFromCircle} title="Shortcut: O"><Hexagon />Start from circle<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">O</kbd></Button>
          <Button size="sm" variant="outline" disabled={polygon.length < 3} onClick={toggleMove} aria-pressed={moving} title={moving ? "Shortcut: Esc or M" : "Shortcut: M"}><Move />{moving ? "Done moving" : "Move shape"}<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">M</kbd></Button>
          <Button size="sm" variant="ghost" disabled={!history.length} onClick={undo} title="Shortcut: Ctrl+Z"><Undo2 />Undo<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">Ctrl Z</kbd></Button>
          <Button size="sm" variant="ghost" className="text-status-danger" disabled={!polygon.length} onClick={clear} title="Shortcut: Shift+Delete"><Trash2 />Clear<kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] font-medium opacity-70">⇧ Del</kbd></Button>
        </>}
    </div>}

    {/* The map element's className must stay static: Leaflet adds its own classes to it, and a React re-render would wipe them. */}
    <div className={cn("relative", drawing && "[&_.leaflet-container]:cursor-crosshair")}>
      <div ref={hostRef} className="geo-map boundary-editor" role="application" aria-label="Site boundary editor" />
      <Button size="icon" variant="outline" className="absolute right-3 top-3 z-[500] size-8 bg-card" title="Fit boundary in view (F)" aria-label="Fit boundary in view" onClick={fit}><Maximize2 /></Button>
    </div>

    <p className="mt-2 text-[11px] text-muted">Shortcuts: <b>C</b> circle · <b>P</b> custom shape · <b>S</b> satellite/street · <b>F</b> fit to boundary · <b>Esc</b> cancel</p>
    <p className={cn("mt-2 rounded-lg px-3 py-2 text-xs", drawing ? "bg-primary/10 text-foreground" : "bg-surface text-muted")}>{hint}</p>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {mode === "circle"
        ? <><span className="inline-flex items-center gap-1"><Circle size={12} />Radius <b className="text-foreground">{radius} m</b></span></>
        : <span>Corners <b className="text-foreground">{polygon.length}</b>{polygon.length > 0 && polygon.length < 3 && " · need at least 3"}</span>}
      {area > 0 && <span>Area <b className="text-foreground">{area >= 10000 ? `${(area / 10000).toFixed(2)} ha` : `${Math.round(area).toLocaleString("en-IN")} m²`}</b></span>}
    </div>
  </div>;
}
