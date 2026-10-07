import type { Rating, RatingType } from "@/types/domain";

/** HR is built in: HR Quality records its ratings under it, so it can be renamed but not removed. */
export const HR_RATING_TYPE = "hr";

export const DEFAULT_RATING_TYPES: RatingType[] = [
  { id: HR_RATING_TYPE, label: "HR" },
  { id: "client", label: "Client" },
  { id: "field-officer", label: "Field officer" },
  { id: "supervisor", label: "Site supervisor" },
];

export const ratingTypeLabel = (types: RatingType[], id: string) => types.find(type => type.id === id)?.label ?? id;

/** Latest rating from each type for one employee or site. A newer rating of the same type replaces the older one. */
export function currentRatings(ratings: Rating[], targetType: Rating["targetType"], targetId: string): Rating[] {
  const latest = new Map<string, Rating>();
  ratings
    .filter(rating => rating.targetType === targetType && rating.targetId === targetId)
    .forEach(rating => {
      const source = rating.source ?? HR_RATING_TYPE;
      const existing = latest.get(source);
      if (!existing || rating.on >= existing.on) latest.set(source, { ...rating, source });
    });
  return [...latest.values()];
}

/** Average of the latest score of each rating type, to one decimal place. Null when nobody has rated yet. */
export function averageRating(ratings: Rating[], targetType: Rating["targetType"], targetId: string): number | null {
  const current = currentRatings(ratings, targetType, targetId);
  if (!current.length) return null;
  return Math.round(current.reduce((sum, rating) => sum + rating.score, 0) / current.length * 10) / 10;
}
