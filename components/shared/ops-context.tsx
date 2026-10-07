"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { dutyChangeRequests as dutySeed, nightChecks as nightSeed, ratings as ratingSeed, recruitmentVacancies as seed } from "@/lib/mock-data";
import { DEFAULT_RATING_TYPES, HR_RATING_TYPE } from "@/lib/ratings";
import type { DutyChangeRequest, NightCheck, Rating, RatingType, RecruitmentVacancy } from "@/types/domain";

type OpsValue = {
  vacancies: RecruitmentVacancy[];
  addVacancy: (vacancy: RecruitmentVacancy) => void;
  updateVacancy: (id: string, status: RecruitmentVacancy["status"]) => void;
  nightChecks: NightCheck[];
  confirmNightCheck: (empId: string) => void;
  dutyRequests: DutyChangeRequest[];
  addDutyRequest: (request: DutyChangeRequest) => void;
  decideDutyRequest: (id: string, status: "approved" | "rejected") => void;
  /** 1–10 ratings of active types only. Used wherever an employee or site is scored, including reliever ranking. */
  ratings: Rating[];
  addRating: (rating: Rating) => void;
  /** Organisation-wide rating types (Settings → Ratings). Removing a type stops its scores counting. */
  ratingTypes: RatingType[];
  addRatingType: (label: string) => void;
  renameRatingType: (id: string, label: string) => void;
  removeRatingType: (id: string) => void;
};

type OpsMessage =
  | { type: "duty-added"; request: DutyChangeRequest }
  | { type: "duty-decided"; id: string; status: "approved" | "rejected" };

const OpsContext = createContext<OpsValue | null>(null);

/**
 * Cross-screen operations state: exits push vacancies into recruitment; night checks are shared by attendance,
 * night vigilance and the guard app; duty change requests flow from the guard app to the office.
 * Duty requests are also mirrored to other open tabs (BroadcastChannel), so a guard tab and an office tab stay in sync.
 */
export function OpsProvider({ children }: { children: React.ReactNode }) {
  const [vacancies, setVacancies] = useState(seed);
  const [nightChecks, setNightChecks] = useState(nightSeed);
  const [dutyRequests, setDutyRequests] = useState(dutySeed);
  const [ratings, setRatings] = useState(ratingSeed);
  const [ratingTypes, setRatingTypes] = useState(DEFAULT_RATING_TYPES);
  const activeTypes = new Set(ratingTypes.map(type => type.id));
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("bmg-ops");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<OpsMessage>) => {
      const message = event.data;
      if (message.type === "duty-decided") {
        setDutyRequests(current => current.map(item => item.id === message.id ? { ...item, status: message.status } : item));
        return;
      }
      setDutyRequests(current => current.some(item => item.id === message.request.id) ? current : [message.request, ...current]);
    };
    return () => { channel.close(); channelRef.current = null; };
  }, []);

  const broadcast = (message: OpsMessage) => channelRef.current?.postMessage(message);

  return <OpsContext.Provider value={{
    vacancies,
    addVacancy: vacancy => setVacancies(current => [vacancy, ...current]),
    updateVacancy: (id, status) => setVacancies(current => current.map(item => item.id === id ? { ...item, status } : item)),
    nightChecks,
    confirmNightCheck: empId => setNightChecks(current => current.map(item => item.empId === empId ? { ...item, state: "Confirmed" } : item)),
    dutyRequests,
    addDutyRequest: request => {
      setDutyRequests(current => [request, ...current]);
      broadcast({ type: "duty-added", request });
    },
    ratings: ratings.filter(rating => activeTypes.has(rating.source ?? HR_RATING_TYPE)),
    addRating: rating => setRatings(current => [...current, rating]),
    ratingTypes,
    addRatingType: label => setRatingTypes(current => [...current, { id: `type-${Date.now()}`, label }]),
    renameRatingType: (id, label) => setRatingTypes(current => current.map(type => type.id === id ? { ...type, label } : type)),
    removeRatingType: id => { if (id !== HR_RATING_TYPE) setRatingTypes(current => current.filter(type => type.id !== id)); },
    decideDutyRequest: (id, status) => {
      setDutyRequests(current => current.map(item => item.id === id ? { ...item, status } : item));
      broadcast({ type: "duty-decided", id, status });
    },
  }}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const value = useContext(OpsContext);
  if (!value) throw new Error("useOps must be used inside OpsProvider");
  return value;
}
