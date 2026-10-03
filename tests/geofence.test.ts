import { describe, expect, it } from "vitest";
import { distanceMetres, isInsideGeofence, pointInPolygon } from "@/lib/geofence";

const square = [
  { lat: 10.000, lng: 76.000 }, { lat: 10.000, lng: 76.010 },
  { lat: 10.010, lng: 76.010 }, { lat: 10.010, lng: 76.000 },
];

describe("pointInPolygon", () => {
  it("accepts a point inside the square", () => {
    expect(pointInPolygon({ lat: 10.005, lng: 76.005 }, square)).toBe(true);
  });
  it("rejects a point outside the square", () => {
    expect(pointInPolygon({ lat: 10.020, lng: 76.005 }, square)).toBe(false);
  });
  it("rejects degenerate polygons (fewer than 3 vertices)", () => {
    expect(pointInPolygon({ lat: 10.005, lng: 76.005 }, square.slice(0, 2))).toBe(false);
  });
});

describe("isInsideGeofence", () => {
  it("uses the polygon when present, ignoring the radius", () => {
    const site = { lat: 10.005, lng: 76.005, radius: 1, polygon: square };
    expect(isInsideGeofence({ lat: 10.009, lng: 76.009 }, site)).toBe(true);
  });
  it("falls back to the radius circle when no polygon", () => {
    const site = { lat: 10.005, lng: 76.005, radius: 120 };
    expect(isInsideGeofence({ lat: 10.005, lng: 76.0055 }, site)).toBe(true);   // ~55 m east
    expect(isInsideGeofence({ lat: 10.005, lng: 76.0100 }, site)).toBe(false);  // ~490 m east
  });
});

describe("distanceMetres", () => {
  it("is 0 for identical points", () => {
    expect(distanceMetres({ lat: 10, lng: 76 }, { lat: 10, lng: 76 })).toBe(0);
  });
});
