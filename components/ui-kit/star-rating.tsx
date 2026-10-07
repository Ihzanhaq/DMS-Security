"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  const score = Math.min(max, Math.max(1, value));

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-0.5" role="radiogroup" aria-label={`Satisfaction ${score} out of ${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const star = index + 1;
        const filled = star <= score;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={score === star}
            aria-label={`${star} out of ${max}`}
            className="rounded p-0.5 text-muted transition-colors hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40"
            onClick={() => onChange(star)}
          >
            <Star className={cn("h-6 w-6 sm:h-7 sm:w-7", filled ? "fill-emerald text-emerald" : "fill-transparent")} strokeWidth={1.75} />
          </button>
        );
      })}
      <span className="ml-1.5 text-sm font-semibold tabular-nums text-foreground">
        {score}<span className="font-normal text-muted">/{max}</span>
      </span>
    </div>
  );
}
