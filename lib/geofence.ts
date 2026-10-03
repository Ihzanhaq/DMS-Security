import type { LatLng } from "@/types/domain";

/** Great-circle distance in metres. */
export function distanceMetres(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Ray-casting point-in-polygon on lat/lng. Adequate at site scale. */
export function pointInPolygon(point: LatLng, polygon: LatLng[]) {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const crosses = (a.lng > point.lng) !== (b.lng > point.lng)
      && point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (crosses) inside = !inside;
  }
  return inside;
}

export type GeofenceShape = { lat: number; lng: number; radius: number; polygon?: LatLng[] };

/** Polygon wins when configured; otherwise the legacy circle applies. */
export function isInsideGeofence(point: LatLng, site: GeofenceShape) {
  if (site.polygon && site.polygon.length >= 3) return pointInPolygon(point, site.polygon);
  return distanceMetres(point, site) <= site.radius;
}
