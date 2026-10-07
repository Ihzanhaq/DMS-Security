"use client";

import { useState } from "react";
import { Pencil, Plus, Star } from "lucide-react";
import { Button, Field, Input, Panel, Select } from "@/components/ui-kit";
import { StarRating } from "@/components/ui-kit/star-rating";
import { useOps } from "@/components/shared/ops-context";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { HR_RATING_TYPE, averageRating, currentRatings, ratingTypeLabel } from "@/lib/ratings";

type Draft = { source: string; score: number; ratedBy: string };

/**
 * An employee's ratings by source (HR, client, field officer, site supervisor).
 * The overall rating is the average of each source's latest score; it drives reliever ranking in Deployment.
 */
export function EmployeeRatingsPanel({ employeeId, className }: { employeeId: string; className?: string }) {
  const notify = useToast();
  const { ratings, addRating, ratingTypes } = useOps();
  const ratingSourceLabel = (id: string) => ratingTypeLabel(ratingTypes, id);
  const current = currentRatings(ratings, "employee", employeeId);
  const average = averageRating(ratings, "employee", employeeId);
  const unrated = ratingTypes.filter(type => !current.some(rating => rating.source === type.id));
  const [draft, setDraft] = useState<Draft | null>(null);

  const startChange = (source: string, score: number) => setDraft({ source, score, ratedBy: "" });
  const startAdd = () => unrated[0] && setDraft({ source: unrated[0].id, score: 8, ratedBy: "" });
  const save = () => {
    if (!draft) return;
    addRating({ targetType: "employee", targetId: employeeId, score: draft.score, ratedBy: draft.ratedBy.trim() || ratingSourceLabel(draft.source), on: APP_TODAY, source: draft.source });
    notify(`${ratingSourceLabel(draft.source)} rating saved · ${draft.score}/10`);
    setDraft(null);
  };
  const editingExisting = !!draft && current.some(rating => rating.source === draft.source);

  return <Panel className={className} title="Ratings" description="Overall is the average of each rating type's latest score. Rating types are set in Settings → Ratings."
    action={!draft && unrated.length > 0 ? <Button size="sm" variant="outline" onClick={startAdd}><Plus />Add a rating</Button> : undefined}>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums">{average ?? "—"}</span>
        <span className="text-sm text-muted">{average !== null ? "/ 10 overall" : "Not rated yet"}</span>
      </div>
      {current.length > 1 && <p className="text-xs text-muted">Average of {current.length} rating types · used to rank relievers in Deployment</p>}
    </div>

    <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
      {current.length === 0 && !draft && <li className="p-3 text-sm text-muted">No ratings yet. Add one for any rating type, e.g. {ratingTypes.map(type => type.label).slice(0, 3).join(", ")}.</li>}
      {current.map(rating => (
        <li key={rating.source} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <b className="block text-sm font-medium">{ratingSourceLabel(rating.source ?? HR_RATING_TYPE)}</b>
            <small className="block truncate text-xs text-muted">{rating.ratedBy} · {formatAppDate(rating.on)}</small>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums"><Star className="size-4 fill-emerald text-emerald" />{rating.score}<span className="font-normal text-muted">/10</span></span>
          <Button size="sm" variant="ghost" onClick={() => startChange(rating.source ?? HR_RATING_TYPE, rating.score)} aria-label={`Change ${ratingSourceLabel(rating.source ?? HR_RATING_TYPE)} rating`}><Pencil />Change</Button>
        </li>
      ))}
    </ul>

    {draft && <div className="mt-4 rounded-xl border border-border bg-surface/60 p-3">
      <p className="mb-3 text-sm font-semibold">{editingExisting ? `Change ${ratingSourceLabel(draft.source)} rating` : "Add a rating"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rating type">
          {editingExisting
            ? <Input value={ratingSourceLabel(draft.source)} disabled />
            : <Select value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })}>
              {unrated.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
            </Select>}
        </Field>
        <Field label="Name (optional)"><Input value={draft.ratedBy} onChange={event => setDraft({ ...draft, ratedBy: event.target.value })} placeholder="e.g. Ajmal Khan" /></Field>
      </div>
      <div className="mt-2 overflow-x-auto"><StarRating value={draft.score} onChange={score => setDraft({ ...draft, score })} /></div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
        <Button size="sm" onClick={save}>Save rating</Button>
      </div>
    </div>}
  </Panel>;
}
