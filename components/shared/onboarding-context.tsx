"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { customFieldDefs as seedFields, documentChecklist as seedChecklist, employeeDocuments, employees } from "@/lib/mock-data";
import type { CustomFieldDef, EmployeeDocument, Nominee, UniformSizes, WorkPreference } from "@/types/domain";

const STORAGE_KEY = "bmg-onboarding-v1";
const NEW_DOC_DUE = "2026-09-29";

export type OnboardingConfig = {
  documentChecklist: string[];
  customFieldDefs: CustomFieldDef[];
  pfEsiWindowDays: number;
};

export type OnboardingProfile = {
  joiningDate: string;
  pfEsiDataReceived: boolean;
  workPreference: WorkPreference;
  uniformSizes: UniformSizes;
  nominee: Nominee;
  customFields: Record<string, string>;
  documents: EmployeeDocument[];
};

type Stored = { config: OnboardingConfig; profiles: Record<string, OnboardingProfile>; ready?: boolean };

const seedConfig: OnboardingConfig = { documentChecklist: seedChecklist, customFieldDefs: seedFields, pfEsiWindowDays: 15 };

/** Checklist types the employee has no document row for yet become pending rows. */
export function withChecklist(employeeId: string, documents: EmployeeDocument[], checklist: string[]) {
  const covered = new Set(documents.map(doc => doc.type));
  return [
    ...documents,
    ...checklist.filter(type => !covered.has(type)).map(type => ({ id: `DOC-${employeeId}-${type}`, employeeId, type, status: "pending" as const, dueBy: NEW_DOC_DUE })),
  ];
}

function seedProfile(employeeId: string, checklist: string[]): OnboardingProfile {
  const employee = employees.find(item => item.id === employeeId);
  return {
    joiningDate: employee?.joiningDate ?? "2026-09-22",
    pfEsiDataReceived: employee?.pfEsiDataReceived ?? false,
    workPreference: employee?.workPreference ?? { district: employee?.district ?? "Ernakulam", taluk: "" },
    uniformSizes: employee?.uniformSizes ?? { shirt: "L", trouser: "34", shoe: "9" },
    nominee: employee?.nominee ?? { name: "", relation: "Spouse", phone: "", address: "", bankAccount: "", ifsc: "", photoOnFile: false },
    customFields: employee?.customFields ?? {},
    // Existing employees keep only the documents on record; new hires get the full checklist.
    documents: employee
      ? employeeDocuments.filter(doc => doc.employeeId === employeeId)
      : withChecklist(employeeId, [], checklist),
  };
}

type OnboardingValue = {
  config: OnboardingConfig;
  /** False until stored edits have loaded; forms key on it so they never capture stale seed data. */
  ready: boolean;
  saveConfig: (config: OnboardingConfig) => void;
  getProfile: (employeeId: string) => OnboardingProfile;
  saveProfile: (employeeId: string, profile: OnboardingProfile) => void;
  /** Every employee's documents and joining state, for alerts. */
  allProfiles: { employeeId: string; name: string; profile: OnboardingProfile }[];
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>({ config: seedConfig, profiles: {}, ready: false });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Stored | null;
        if (stored?.config) { setState({ config: { ...seedConfig, ...stored.config }, profiles: stored.profiles ?? {}, ready: true }); return; }
      } catch { /* corrupt storage falls back to seed data */ }
      setState(current => ({ ...current, ready: true }));
    });
    return () => window.clearTimeout(timer);
  }, []);

  const write = useCallback((update: (current: Stored) => Stored) => setState(current => {
    const next = update(current);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ config: next.config, profiles: next.profiles }));
    return next;
  }), []);

  const value = useMemo<OnboardingValue>(() => {
    const getProfile = (employeeId: string) => state.profiles[employeeId] ?? seedProfile(employeeId, state.config.documentChecklist);
    return {
      config: state.config,
      ready: Boolean(state.ready),
      saveConfig: config => write(current => ({ ...current, config })),
      getProfile,
      saveProfile: (employeeId, profile) => write(current => ({ ...current, profiles: { ...current.profiles, [employeeId]: profile } })),
      allProfiles: [
        ...employees.map(employee => ({ employeeId: employee.id, name: employee.name, profile: getProfile(employee.id) })),
        ...Object.keys(state.profiles).filter(id => !employees.some(employee => employee.id === id))
          .map(id => ({ employeeId: id, name: id, profile: state.profiles[id] })),
      ],
    };
  }, [state, write]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return value;
}
