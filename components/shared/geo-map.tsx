"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };

/**
 * OpenStreetMap geofence view.
 *
 * Leaflet touches `window` at import time, so it is pulled in dynamically
 * inside an effect rather than at module scope. Markers use `divIcon` so we
 * never depend on Leaflet's bundled image assets, which break under bundlers.
 */
export function GeoMap({ center, radius, draggable = false, onMove, guard, guardInside = true, className = "" }: {
  center: LatLng;
  radius: number;
  draggable?: boolean;
  onMove?: (position: LatLng) => void;
  guard?: LatLng | null;
  guardInside?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const siteRef = useRef<Leaflet.Marker | null>(null);
  const guardRef = useRef<Leaflet.Marker | null>(null);
  const libRef = useRef<typeof Leaflet | null>(null);

  // Flipped once the Leaflet chunk has resolved and the map exists, so the
  // sync effects below re-run against a live map instead of bailing out.
  const [ready, setReady] = useState(false);

  // Keep the latest callback without forcing the map to re-initialise.
  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  useEffect(() => {
    let cancelled = false;
    let sizeTimer = 0;

    (async () => {
      const imported = await import("leaflet");
      const L = (imported.default ?? imported) as typeof Leaflet;
      if (cancelled || !hostRef.current || mapRef.current) return;

      libRef.current = L;
      const map = L.map(hostRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
        .setView([center.lat, center.lng], 16);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      circleRef.current = L.circle([center.lat, center.lng], {
        radius,
        color: "#1d5b4f",
        weight: 1.5,
        dashArray: "5 4",
        fillColor: "#1d5b4f",
        fillOpacity: .1,
      }).addTo(map);

      siteRef.current = L.marker([center.lat, center.lng], {
        draggable,
        icon: L.divIcon({ className: "", html: '<span class="map-pin"></span>', iconSize: [0, 0] }),
      }).addTo(map);

      if (draggable) {
        siteRef.current.on("drag", event => {
          const { lat, lng } = (event.target as Leaflet.Marker).getLatLng();
          circleRef.current?.setLatLng([lat, lng]);
        });
        siteRef.current.on("dragend", event => {
          const { lat, lng } = (event.target as Leaflet.Marker).getLatLng();
          onMoveRef.current?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        });
        map.on("click", event => {
          const { lat, lng } = event.latlng;
          onMoveRef.current?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        });
      }

      mapRef.current = map;
      setReady(true);
      // The container is often still being laid out on first paint. The timer
      // is cancelled on unmount so it can never fire against a removed map.
      sizeTimer = window.setTimeout(() => map.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(sizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      circleRef.current = null;
      siteRef.current = null;
      guardRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable]);

  // Follow externally driven coordinate and radius changes. Depends on `ready`
  // so a change that lands while Leaflet is still loading is not lost.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    circleRef.current?.setLatLng([center.lat, center.lng]);
    circleRef.current?.setRadius(radius);
    siteRef.current?.setLatLng([center.lat, center.lng]);
    map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
  }, [ready, center.lat, center.lng, radius]);

  // Plot the guard's live position.
  useEffect(() => {
    const map = mapRef.current;
    const L = libRef.current;
    if (!ready || !map || !L) return;

    if (!guard) {
      if (guardRef.current) { guardRef.current.remove(); guardRef.current = null; }
      return;
    }

    const html = `<span class="map-pin guard${guardInside ? "" : " outside"}"></span>`;
    if (guardRef.current) {
      guardRef.current.setLatLng([guard.lat, guard.lng]);
      guardRef.current.setIcon(L.divIcon({ className: "", html, iconSize: [0, 0] }));
    } else {
      guardRef.current = L.marker([guard.lat, guard.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [0, 0] }),
      }).addTo(map);
    }

    map.fitBounds(L.latLngBounds([[guard.lat, guard.lng], [center.lat, center.lng]]).pad(.6), { animate: false });
  }, [ready, guard, guardInside, center.lat, center.lng]);

  return <div ref={hostRef} className={`geo-map ${className}`} role="application" aria-label="Site geofence map" />;
}
