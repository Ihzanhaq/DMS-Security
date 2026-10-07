"use client";

import { useState, type FC } from "react";
import { AlertTriangle, Building2, CheckCircle2, Phone, Star, Users } from "lucide-react";
import { employees, satisfactionCalls, sites } from "@/lib/mock-data";
import { useOps } from "@/components/shared/ops-context";
import { averageRating } from "@/lib/ratings";
import {
  Button, DataTable, DetailDrawer, EmptyState, Field, FilterChips, FormStack, InlineAlert, ListFilterRow, ListRow,
  PageHeader, Panel, PersonCell, SegmentedControl, Select, StatStrip, StatusChip, Textarea,
} from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { APP_TODAY, formatAppDate } from "@/lib/app-date";
import { NAV } from "@/lib/labels";
import type { NavClickMeta } from "@/lib/nav-config";
import type { Rating, RecruitmentVacancy, SatisfactionCall } from "@/types/domain";

const scoreOptions = Array.from({ length: 10 }, (_, index) => index + 1);
type OnNavigate = (view: string, meta?: string | NavClickMeta) => void;
const scrollToId = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));

export const HrQualityScreen: FC<{ onNavigate?: OnNavigate }> = () => {
  const notify = useToast();
  const [calls, setCalls] = useState<SatisfactionCall[]>(satisfactionCalls);
  const [recording, setRecording] = useState<SatisfactionCall | null>(null);
  const [score, setScore] = useState(8);
  const [notes, setNotes] = useState("");
  const { ratings: allRatings, addRating } = useOps();
  const [tab, setTab] = useState<"Employees" | "Sites">("Employees");
  const [pendingScores, setPendingScores] = useState<Record<string, number>>({});
  const [callFilter, setCallFilter] = useState<"all" | SatisfactionCall["status"]>("all");

  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const averageFor = (type: Rating["targetType"], id: string) => averageRating(allRatings, type, id);
  const lastFor = (type: Rating["targetType"], id: string) =>
    allRatings.filter(rating => rating.targetType === type && rating.targetId === id).sort((a, b) => b.on.localeCompare(a.on))[0];
  const rate = (type: Rating["targetType"], id: string, title: string) => {
    const value = pendingScores[type + id] ?? 8;
    addRating({ targetType: type, targetId: id, score: value, ratedBy: "HR desk", on: APP_TODAY, source: "hr" });
    notify(`${title} rated ${value}/10`);
  };
  const saveCall = () => {
    if (!recording) return;
    setCalls(current => current.map(call => call.id === recording.id ? { ...call, status: "done", score, notes } : call));
    notify(`Call recorded · ${score}/10`);
    setRecording(null);
    setNotes("");
  };

  const dueCalls = calls.filter(call => call.status === "due");
  const visibleCalls = callFilter === "all" ? calls : calls.filter(call => call.status === callFilter);
  const toggleCalls = (status: SatisfactionCall["status"]) => { setCallFilter(current => current === status ? "all" : status); scrollToId("hr-welfare-calls"); };
  const showRatings = (next: typeof tab) => { setTab(next); scrollToId("hr-ratings"); };
  const targets = tab === "Employees"
    ? employees.map(employee => ({ key: employee.id, title: employee.name, subtitle: employee.id, type: "employee" as const }))
    : sites.map(site => ({ key: site.name, title: site.name, subtitle: site.client, type: "site" as const }));

  return <>
    <PageHeader title={NAV.hrQuality} subtitle="Welfare calls 3 days after joining, and 1–10 ratings for employees and sites." />
    <StatStrip items={[
      { icon: Phone, value: String(dueCalls.length), label: "Calls to make", note: "3 days after joining", tone: dueCalls.length ? "orange" : "green", onClick: () => toggleCalls("due"), actionLabel: "Show calls still to make", active: callFilter === "due" },
      { icon: CheckCircle2, value: String(calls.filter(call => call.status === "done").length), label: "Calls completed", note: "This month", tone: "green", onClick: () => toggleCalls("done"), actionLabel: "Show completed calls", active: callFilter === "done" },
      { icon: Users, value: String(new Set(allRatings.filter(rating => rating.targetType === "employee").map(rating => rating.targetId)).size), label: "Employees rated", note: "1–10 scale", onClick: () => showRatings("Employees"), actionLabel: "Show employee ratings", active: tab === "Employees" },
      { icon: Building2, value: String(new Set(allRatings.filter(rating => rating.targetType === "site").map(rating => rating.targetId)).size), label: "Sites rated", note: "1–10 scale", onClick: () => showRatings("Sites"), actionLabel: "Show site ratings", active: tab === "Sites" },
    ]} />
    <div id="hr-welfare-calls" className="scroll-mt-4"><Panel title="Welfare calls" description="A call task is created 3 days after every new joiner. Call the guard and record how they're settling in." className="mb-4">
      {visibleCalls.length === 0 && <EmptyState icon={Phone} message={callFilter === "due" ? "No calls left to make." : callFilter === "done" ? "No calls recorded yet." : "No welfare calls scheduled."} />}
      {visibleCalls.map(call => {
        const who = employeeOf(call.employeeId);
        const overdue = call.status === "due" && call.dueBy < APP_TODAY;
        return (
          <ListRow key={call.id}>
            <div className="min-w-0 flex-1"><PersonCell name={who?.name ?? call.employeeId} id={call.employeeId} phone={who?.phone} /></div>
            <span className="text-xs"><span className="block">Joined {formatAppDate(call.joinedOn)}</span><span className="text-muted">Call by {formatAppDate(call.dueBy)}</span></span>
            <StatusChip tone={call.status === "done" ? "success" : overdue ? "danger" : "warning"}>{call.status === "done" ? `Done · ${call.score}/10` : overdue ? "Overdue" : "To call"}</StatusChip>
            <Button size="sm" variant={call.status === "done" ? "ghost" : "outline"} disabled={call.status === "done"} onClick={() => { setRecording(call); setScore(call.score ?? 8); setNotes(call.notes ?? ""); }}>{call.status === "done" ? "Recorded" : "Record call"}</Button>
          </ListRow>
        );
      })}
    </Panel></div>
    <div id="hr-ratings" className="scroll-mt-4"><Panel title="Ratings" description="Averages appear wherever the employee or site is shown.">
      <SegmentedControl options={["Employees", "Sites"] as const} value={tab} onChange={setTab} />
      <div className="max-h-[460px] overflow-y-auto">
        {targets.map(target => {
          const average = averageFor(target.type, target.key);
          const last = lastFor(target.type, target.key);
          return (
            <ListRow key={target.key}>
              <div className="min-w-[160px] flex-1"><strong className="block text-sm font-medium">{target.title}</strong><small className="text-xs text-muted">{target.subtitle}</small></div>
              <span className="flex w-24 items-center gap-1 text-sm font-semibold text-emerald">{average !== null ? <><Star className="h-4 w-4 fill-current" />{average}/10</> : <span className="font-normal text-muted">Not rated</span>}</span>
              <span className="hidden w-56 text-xs text-muted md:inline">{last ? `Last ${last.score}/10 by ${last.ratedBy} · ${formatAppDate(last.on)}` : ""}</span>
              <span className="flex items-center gap-1.5">
                <Select className="h-9 w-20" value={pendingScores[target.type + target.key] ?? 8} onChange={event => setPendingScores(current => ({ ...current, [target.type + target.key]: Number(event.target.value) }))} aria-label={`Score for ${target.title}`}>
                  {scoreOptions.map(value => <option key={value} value={value}>{value}</option>)}
                </Select>
                <Button size="sm" variant="outline" onClick={() => rate(target.type, target.key, target.title)}>Add rating</Button>
              </span>
            </ListRow>
          );
        })}
      </div>
    </Panel></div>

    {recording && <DetailDrawer title="Record welfare call" subtitle={`${employeeOf(recording.employeeId)?.name ?? recording.employeeId} · joined ${formatAppDate(recording.joinedOn)}`} onClose={() => setRecording(null)}
      footer={<>
        <Button variant="outline" onClick={() => setRecording(null)}>Cancel</Button>
        <Button onClick={saveCall}><CheckCircle2 />Save call</Button>
      </>}>
      <FormStack>
        <Field label="How satisfied is the guard? (1–10)"><Select value={score} onChange={event => setScore(Number(event.target.value))}>{scoreOptions.map(value => <option key={value} value={value}>{value}</option>)}</Select></Field>
        <Field label="Notes"><Textarea rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Site conditions, uniform, salary clarity, supervisor behaviour…" /></Field>
        <InlineAlert tone={score <= 4 ? "warning" : "info"}>A score of 4 or below flags the site’s field officer for a follow-up visit.</InlineAlert>
      </FormStack>
    </DetailDrawer>}
  </>;
};

const sourceLabel: Record<RecruitmentVacancy["source"], string> = { exit: "Exit", "new-site": "New site", expansion: "Expansion" };
type VacancyFilter = "active" | "all" | "open" | "high" | "exit" | "filled";
const vacancyMatches: Record<VacancyFilter, (vacancy: RecruitmentVacancy) => boolean> = {
  active: vacancy => vacancy.status !== "filled",
  all: () => true,
  open: vacancy => vacancy.status === "open",
  high: vacancy => vacancy.priority === "high" && vacancy.status !== "filled",
  exit: vacancy => vacancy.source === "exit",
  filled: vacancy => vacancy.status === "filled",
};
const vacancyEmpty: Record<VacancyFilter, string> = {
  active: "Every vacancy is filled.", all: "No vacancies recorded.", open: "No open vacancies.", high: "No high-priority vacancies left.", exit: "No vacancies from exits.", filled: "No vacancies filled yet.",
};

export const RecruitmentScreen: FC<{ onNavigate?: OnNavigate }> = () => {
  const notify = useToast();
  const { vacancies, updateVacancy } = useOps();
  const [filter, setFilter] = useState<VacancyFilter>("active");
  const sorted = [...vacancies].sort((a, b) => (a.priority === b.priority ? b.openedOn.localeCompare(a.openedOn) : a.priority === "high" ? -1 : 1));
  const visible = sorted.filter(vacancyMatches[filter]);
  const open = vacancies.filter(vacancy => vacancy.status === "open");
  const toggle = (next: VacancyFilter) => setFilter(current => current === next ? "active" : next);

  return <>
    <PageHeader title={NAV.recruitment} subtitle="Vacancies from exits, new sites and expansion. Exits create a vacancy automatically." />
    <StatStrip items={[
      { icon: Users, value: String(open.length), label: "Open vacancies", note: "Need candidates", tone: open.length ? "orange" : "green", onClick: () => toggle("open"), actionLabel: "Show open vacancies", active: filter === "open" },
      { icon: AlertTriangle, value: String(vacancies.filter(vacancyMatches.high).length), label: "High priority", note: "Fill these first", tone: "red", onClick: () => toggle("high"), actionLabel: "Show high-priority vacancies", active: filter === "high" },
      { icon: Building2, value: String(vacancies.filter(vacancyMatches.exit).length), label: "From exits", note: "Created automatically", onClick: () => toggle("exit"), actionLabel: "Show vacancies created by exits", active: filter === "exit" },
      { icon: CheckCircle2, value: String(vacancies.filter(vacancyMatches.filled).length), label: "Filled", note: "This month", tone: "green", onClick: () => toggle("filled"), actionLabel: "Show filled vacancies", active: filter === "filled" },
    ]} />
    <ListFilterRow>
      <FilterChips<VacancyFilter> options={[{ id: "active", label: "Not yet filled" }, { id: "all", label: "All vacancies" }]} value={filter} onChange={setFilter} />
    </ListFilterRow>
    <Panel flush>
      <DataTable rows={visible} rowKey={row => row.id}
        empty={<div className="p-4"><EmptyState icon={CheckCircle2} message={vacancyEmpty[filter]} /></div>}
        columns={[
          { header: "Site", cell: vacancy => <span><strong className="block text-sm font-medium">{vacancy.site}</strong><small className="text-xs text-muted">{vacancy.post}</small></span> },
          { header: "District", cell: vacancy => vacancy.district },
          { header: "Source", cell: vacancy => <StatusChip tone={vacancy.source === "exit" ? "info" : "neutral"}>{sourceLabel[vacancy.source]}</StatusChip> },
          { header: "Priority", cell: vacancy => <StatusChip tone={vacancy.priority === "high" ? "danger" : "neutral"}>{vacancy.priority === "high" ? "High" : "Normal"}</StatusChip> },
          { header: "Opened", cell: vacancy => formatAppDate(vacancy.openedOn), hideOnMobile: true },
          { header: "Status", cell: vacancy => (
            <Select className="h-9 w-36" value={vacancy.status} onChange={event => { updateVacancy(vacancy.id, event.target.value as typeof vacancy.status); notify(`Vacancy marked ${event.target.value === "interviewing" ? "interviewing" : event.target.value}`); }} aria-label={`${vacancy.site} status`}>
              <option value="open">Open</option><option value="interviewing">Interviewing</option><option value="filled">Filled</option>
            </Select>
          ) },
        ]} />
    </Panel>
  </>;
};
