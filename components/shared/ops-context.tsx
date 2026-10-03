"use client";

import { createContext, useContext, useState } from "react";
import { recruitmentVacancies as seed } from "@/lib/mock-data";
import type { RecruitmentVacancy } from "@/types/domain";

type OpsValue = {
  vacancies: RecruitmentVacancy[];
  addVacancy: (vacancy: RecruitmentVacancy) => void;
  updateVacancy: (id: string, status: RecruitmentVacancy["status"]) => void;
};

const OpsContext = createContext<OpsValue | null>(null);

/** Cross-screen operations state: exits push vacancies straight into recruitment. */
export function OpsProvider({ children }: { children: React.ReactNode }) {
  const [vacancies, setVacancies] = useState(seed);
  return <OpsContext.Provider value={{
    vacancies,
    addVacancy: vacancy => setVacancies(current => [vacancy, ...current]),
    updateVacancy: (id, status) => setVacancies(current => current.map(item => item.id === id ? { ...item, status } : item)),
  }}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const value = useContext(OpsContext);
  if (!value) throw new Error("useOps must be used inside OpsProvider");
  return value;
}
