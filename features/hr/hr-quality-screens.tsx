"use client";

import { useState } from "react";
import { Buildings, CheckCircle, Phone, Star, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { employees, ratings as ratingSeed, satisfactionCalls, sites } from "@/lib/mock-data";
import { useOps } from "@/components/shared/ops-context";
import {
  DetailDrawer, PageHeader, Panel, PersonCell, StatStrip, Status,
} from "@/components/shared/screen-elements";
import { useToast } from "@/components/shared/toast-context";
import type { Rating, SatisfactionCall } from "@/types/domain";

const TODAY = "2026-09-22";

export function HrQualityScreen() {
  const notify = useToast();
  const [calls, setCalls] = useState<SatisfactionCall[]>(satisfactionCalls);
  const [recording, setRecording] = useState<SatisfactionCall | null>(null);
  const [score, setScore] = useState(8);
  const [notes, setNotes] = useState("");
  const [allRatings, setAllRatings] = useState<Rating[]>(ratingSeed);
  const [tab, setTab] = useState<"Employees" | "Sites">("Employees");
  const [pendingScores, setPendingScores] = useState<Record<string, number>>({});

  const employeeOf = (id: string) => employees.find(item => item.id === id);
  const averageFor = (type: Rating["targetType"], id: string) => {
    const scores = allRatings.filter(rating => rating.targetType === type && rating.targetId === id).map(rating => rating.score);
    return scores.length ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : null;
  };
  const lastFor = (type: Rating["targetType"], id: string) =>
    allRatings.filter(rating => rating.targetType === type && rating.targetId === id).sort((a, b) => b.on.localeCompare(a.on))[0];
  const rate = (type: Rating["targetType"], id: string) => {
    const value = pendingScores[type + id] ?? 8;
    setAllRatings(current => [...current, { targetType: type, targetId: id, score: value, ratedBy: "HR desk", on: TODAY }]);
    notify(`${id} rated ${value}/10`);
  };
  const saveCall = () => {
    if (!recording) return;
    setCalls(current => current.map(call => call.id === recording.id ? { ...call, status: "done", score, notes } : call));
    notify(`Satisfaction call recorded · ${score}/10`);
    setRecording(null);
    setNotes("");
  };

  const dueCalls = calls.filter(call => call.status === "due");

  return <>
    <PageHeader title="HR quality" description="3-day satisfaction calls and the 1–10 rating system for employees and sites." />
    <StatStrip items={[
      { icon: Phone, value: String(dueCalls.length), label: "Calls due", note: "Within 3 days of joining", tone: dueCalls.length ? "orange" : "green" },
      { icon: CheckCircle, value: String(calls.filter(call => call.status === "done").length), label: "Calls completed", note: "This month", tone: "green" },
      { icon: UsersThree, value: String(new Set(allRatings.filter(rating => rating.targetType === "employee").map(rating => rating.targetId)).size), label: "Employees rated", note: "1–10 scale" },
      { icon: Buildings, value: String(new Set(allRatings.filter(rating => rating.targetType === "site").map(rating => rating.targetId)).size), label: "Sites rated", note: "1–10 scale", tone: "violet" },
    ]} />
    <Panel title="3-day satisfaction calls" description="Automatic task created 3 days after every joining. Call the guard and record the score.">
      <div className="satisfaction-list">{calls.map(call => {
        const who = employeeOf(call.employeeId);
        const overdue = call.status === "due" && call.dueBy < TODAY;
        return <div className="satisfaction-row" key={call.id}>
          <PersonCell name={who?.name ?? call.employeeId} id={call.employeeId} phone={who?.phone} />
          <span className="satisfaction-dates">Joined {call.joinedOn}<small>Call by {call.dueBy}</small></span>
          <Status tone={call.status === "done" ? "success" : overdue ? "danger" : "warning"}>{call.status === "done" ? `Done · ${call.score}/10` : overdue ? "Overdue" : "Due"}</Status>
          <button className="secondary-button compact" disabled={call.status === "done"} onClick={() => { setRecording(call); setScore(call.score ?? 8); setNotes(call.notes ?? ""); }}>{call.status === "done" ? "Recorded" : "Record call"}</button>
        </div>;
      })}</div>
    </Panel>
    <Panel title="Ratings" description="1–10 ratings for employees and sites. The average shows across the app."
      action={<div className="tabs-row rating-tabs">{(["Employees", "Sites"] as const).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>}>
      <div className="rating-list">
        {(tab === "Employees"
          ? employees.map(employee => ({ key: employee.id, title: employee.name, subtitle: employee.id, type: "employee" as const }))
          : sites.map(site => ({ key: site.name, title: site.name, subtitle: site.client, type: "site" as const }))
        ).map(target => {
          const average = averageFor(target.type, target.key);
          const last = lastFor(target.type, target.key);
          return <div className="rating-row" key={target.key}>
            <div><strong>{target.title}</strong><small>{target.subtitle}</small></div>
            <span className="rating-average">{average !== null ? <><Star weight="fill" />{average}/10</> : "Not rated"}</span>
            <span className="rating-last">{last ? `Last: ${last.score}/10 · ${last.ratedBy} · ${last.on}` : "—"}</span>
            <span className="rating-controls">
              <select value={pendingScores[target.type + target.key] ?? 8} onChange={event => setPendingScores(current => ({ ...current, [target.type + target.key]: Number(event.target.value) }))} aria-label={`Rate ${target.title}`}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <button className="secondary-button compact" onClick={() => rate(target.type, target.key)}>Rate</button>
            </span>
          </div>;
        })}
      </div>
    </Panel>

    {recording && <DetailDrawer title="Record satisfaction call" subtitle={`${employeeOf(recording.employeeId)?.name ?? recording.employeeId} · joined ${recording.joinedOn}`} onClose={() => setRecording(null)}
      footer={<>
        <button className="secondary-button" onClick={() => setRecording(null)}>Cancel</button>
        <button className="primary-button" onClick={saveCall}><CheckCircle />Save call</button>
      </>}>
      <div className="drawer-section">
        <h3>Guard feedback</h3>
        <div className="form-stack" style={{ padding: 0 }}>
          <label><span>Satisfaction score (1–10)</span><select value={score} onChange={event => setScore(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Notes</span><textarea rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Site conditions, uniform, salary clarity, supervisor behaviour…" /></label>
        </div>
      </div>
      <div className="drawer-section">
        <div className="inline-alert"><WarningCircle /><span>A score of 4 or below automatically flags the site&apos;s field officer for a follow-up visit.</span></div>
      </div>
    </DetailDrawer>}
  </>;
}

export function RecruitmentScreen() {
  const notify = useToast();
  const { vacancies, updateVacancy } = useOps();
  const sorted = [...vacancies].sort((a, b) => (a.priority === b.priority ? b.openedOn.localeCompare(a.openedOn) : a.priority === "high" ? -1 : 1));
  const open = vacancies.filter(vacancy => vacancy.status === "open");

  return <>
    <PageHeader title="Recruitment" description="Vacancies from exits, new sites and expansion. Exit-driven entries arrive automatically with priority." />
    <StatStrip items={[
      { icon: UsersThree, value: String(open.length), label: "Open vacancies", note: "Needing candidates", tone: open.length ? "orange" : "green" },
      { icon: WarningCircle, value: String(vacancies.filter(vacancy => vacancy.priority === "high" && vacancy.status !== "filled").length), label: "High priority", note: "Fill first", tone: "red" },
      { icon: Buildings, value: String(vacancies.filter(vacancy => vacancy.source === "exit").length), label: "From exits", note: "Auto-created", tone: "violet" },
      { icon: CheckCircle, value: String(vacancies.filter(vacancy => vacancy.status === "filled").length), label: "Filled", note: "This month", tone: "green" },
    ]} />
    <Panel className="table-panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Site</th><th>Post</th><th>District</th><th>Source</th><th>Priority</th><th>Opened</th><th>Status</th></tr></thead><tbody>
      {sorted.map(vacancy => <tr key={vacancy.id}>
        <td><strong>{vacancy.site}</strong></td><td>{vacancy.post}</td><td>{vacancy.district}</td>
        <td><Status tone={vacancy.source === "exit" ? "info" : "neutral"}>{vacancy.source === "exit" ? "Exit" : vacancy.source === "new-site" ? "New site" : "Expansion"}</Status></td>
        <td><Status tone={vacancy.priority === "high" ? "danger" : "neutral"}>{vacancy.priority}</Status></td>
        <td>{vacancy.openedOn}</td>
        <td><select value={vacancy.status} onChange={event => { updateVacancy(vacancy.id, event.target.value as typeof vacancy.status); notify(`${vacancy.site} vacancy marked ${event.target.value}`); }} aria-label={`${vacancy.id} status`}>
          <option value="open">Open</option><option value="interviewing">Interviewing</option><option value="filled">Filled</option>
        </select></td>
      </tr>)}
    </tbody></table></div></Panel>
  </>;
}
