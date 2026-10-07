import { distanceMetres } from "@/lib/geofence";
import { employees, sites } from "@/lib/mock-data";
import { averageRating } from "@/lib/ratings";
import type { Employee, LatLng, Rating } from "@/types/domain";

export type ShiftKind = "Day" | "Night";

/** What the reliever told HR: where they live, where and when they prefer to work. */
export type RelieverProfile = {
  employeeId: string;
  home: LatLng;
  preferredDistricts: string[];
  shiftPreference: ShiftKind | "Any";
};

export const relieverProfiles: RelieverProfile[] = [
  { employeeId: "BMG-2118", home: { lat: 10.0159, lng: 76.3419 }, preferredDistricts: ["Ernakulam"], shiftPreference: "Day" },
  { employeeId: "BMG-2312", home: { lat: 10.0480, lng: 76.2920 }, preferredDistricts: ["Ernakulam", "Alappuzha"], shiftPreference: "Any" },
  { employeeId: "BMG-2260", home: { lat: 9.5916, lng: 76.5222 }, preferredDistricts: ["Kottayam", "Alappuzha"], shiftPreference: "Night" },
  { employeeId: "BMG-2325", home: { lat: 9.4981, lng: 76.3388 }, preferredDistricts: ["Alappuzha"], shiftPreference: "Night" },
  { employeeId: "BMG-2295", home: { lat: 8.8932, lng: 76.6141 }, preferredDistricts: ["Kollam", "Thiruvananthapuram"], shiftPreference: "Day" },
  { employeeId: "BMG-2318", home: { lat: 8.5241, lng: 76.9366 }, preferredDistricts: ["Thiruvananthapuram"], shiftPreference: "Any" },
  { employeeId: "BMG-1469", home: { lat: 8.8800, lng: 76.5900 }, preferredDistricts: ["Kollam"], shiftPreference: "Day" },
  { employeeId: "BMG-2301", home: { lat: 10.5276, lng: 76.2144 }, preferredDistricts: ["Thrissur", "Ernakulam"], shiftPreference: "Day" },
];

export type MatchReason = { label: string; good: boolean };

export type RelieverMatch = {
  employee: Employee;
  profile: RelieverProfile;
  /** 0–100. Higher is a better fit. */
  score: number;
  /** Average HR rating, or null when HR hasn't rated them yet. */
  rating: number | null;
  distanceKm: number;
  reasons: MatchReason[];
  /** Set when the reliever can't take this slot (already deployed, on leave). */
  unavailable?: string;
};

const WEIGHTS = { rating: 35, distance: 30, location: 20, shift: 15 };

/**
 * Ranks relievers for one empty slot. HR rating, distance from home, preferred districts and preferred shift
 * each contribute to the score; anyone already deployed that day is listed last with the reason.
 * Unrated relievers count as an average 6/10 so they aren't buried, and are flagged "Not rated yet".
 */
export function rankRelievers({ site, shift, busy, ratings }: { site: string; shift: ShiftKind; busy: Map<string, string>; ratings: Rating[] }): RelieverMatch[] {
  const target = sites.find(item => item.name === site);
  return relieverProfiles.flatMap(profile => {
    const employee = employees.find(item => item.id === profile.employeeId);
    if (!employee) return [];
    const rating = averageRating(ratings, "employee", employee.id);
    const distanceKm = target ? distanceMetres(profile.home, { lat: target.lat, lng: target.lng }) / 1000 : 99;
    const prefersDistrict = !!target && profile.preferredDistricts.includes(target.district);
    const shiftFit = profile.shiftPreference === shift ? 1 : profile.shiftPreference === "Any" ? 0.7 : 0;

    const score = Math.round(
      WEIGHTS.rating * Math.min(rating ?? 6, 10) / 10
      + WEIGHTS.distance * Math.max(0, 1 - Math.max(0, distanceKm - 3) / 40)
      + WEIGHTS.location * (prefersDistrict ? 1 : 0)
      + WEIGHTS.shift * shiftFit,
    );
    const reasons: MatchReason[] = [
      rating === null ? { label: "Not rated yet", good: false } : { label: `★ ${rating.toFixed(1)} rating`, good: rating >= 8 },
      { label: distanceKm < 1 ? "Lives nearby" : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`, good: distanceKm <= 15 },
      { label: prefersDistrict ? `Prefers ${target?.district}` : `Prefers ${profile.preferredDistricts.join(", ")}`, good: prefersDistrict },
      { label: profile.shiftPreference === "Any" ? "Any shift" : `Prefers ${profile.shiftPreference.toLowerCase()}s`, good: shiftFit > 0 },
    ];
    const unavailable = employee.status === "Leave" ? "On leave" : busy.get(employee.id);
    return [{ employee, profile, score, rating, distanceKm, reasons, unavailable }];
  }).sort((a, b) => Number(!!a.unavailable) - Number(!!b.unavailable) || b.score - a.score);
}
