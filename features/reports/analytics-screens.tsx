"use client";

import { useState, type CSSProperties } from "react";
import { Buildings, TrendUp, UsersThree, WarningCircle } from "@phosphor-icons/react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type LabelProps,
} from "recharts";
import { attendanceRows, employees, monthlyPerformance, ratings, siteFeedback, sites } from "@/lib/mock-data";
import { PageHeader, Panel, StatStrip } from "@/components/shared/screen-elements";

/* Chart colors: the app's single accent for the primary series, the info hue for
   the secondary. Two series only, separated by hue AND lightness, with a dashed
   secondary line and direct end-labels, so identity never rides on color alone. */
const SERIES_A = "#1d5b4f";
const SERIES_B = "#7ba3c9";

const employeeMetrics = ["Attendance", "Punctuality", "SOP", "Rating", "Complaints"] as const;
const siteMetrics = ["Coverage", "Rating", "Complaints", "Feedback"] as const;

/** 1–10 score for every employee/metric pair, derived from seed data. */
function employeeScore(employeeId: string, employeeName: string, metric: (typeof employeeMetrics)[number]): number {
  const row = attendanceRows.find(item => item.id === employeeId);
  switch (metric) {
    case "Attendance": return row ? (row.state === "On site" ? 10 : row.state === "Late" ? 5 : 1) : 7;
    case "Punctuality": return row ? (row.punch !== "—" && row.state === "On site" ? 9 : row.state === "Late" ? 4 : 2) : 6;
    case "SOP": return (employeeName.length * 7) % 4 + 6; // stable seeded 6–9
    case "Rating": {
      const scores = ratings.filter(rating => rating.targetType === "employee" && rating.targetId === employeeId).map(rating => rating.score);
      return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 7;
    }
    case "Complaints": return (employeeId.charCodeAt(4) % 3) === 0 ? 6 : 9; // fewer complaints = higher
  }
}

function siteScore(siteName: string, metric: (typeof siteMetrics)[number]): number {
  const site = sites.find(item => item.name === siteName);
  switch (metric) {
    case "Coverage": return site ? Math.max(1, Math.round(site.coverage / 10)) : 7;
    case "Rating": {
      const scores = ratings.filter(rating => rating.targetType === "site" && rating.targetId === siteName).map(rating => rating.score);
      return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 7;
    }
    case "Complaints": return siteName.includes("Skyline") || siteName.includes("TCS") ? 5 : 8;
    case "Feedback": {
      const entries = siteFeedback.filter(item => item.site === siteName).map(item => item.satisfaction);
      return entries.length ? Math.round(entries.reduce((sum, value) => sum + value, 0) / entries.length) : 7;
    }
  }
}

/** Sequential single-hue fill: deeper accent = better score. Value stays printed in the cell. */
function heatStyle(score: number): CSSProperties {
  const mix = [12, 24, 38, 54, 72][Math.min(4, Math.max(0, Math.ceil(score / 2) - 1))];
  return {
    background: `color-mix(in srgb, var(--accent) ${mix}%, var(--surface))`,
    color: mix >= 54 ? "var(--accent-ink)" : "var(--ink)",
  };
}

function HeatMap<T extends string>({ rows, columns, scoreOf }: {
  rows: { key: string; label: string }[];
  columns: readonly T[];
  scoreOf: (rowKey: string, column: T) => number;
}) {
  return (
    <div className="heat-map" style={{ gridTemplateColumns: `minmax(140px,1.2fr) repeat(${columns.length}, minmax(64px,1fr))` }}>
      <span className="heat-corner" />
      {columns.map(column => <span className="heat-col" key={column}>{column}</span>)}
      {rows.map(row => <div className="heat-row" key={row.key} style={{ display: "contents" }}>
        <span className="heat-label">{row.label}</span>
        {columns.map(column => {
          const score = scoreOf(row.key, column);
          return <span className="heat-cell" key={column} style={heatStyle(score)} title={`${row.label} · ${column}: ${score}/10`}>{score}</span>;
        })}
      </div>)}
    </div>
  );
}

const chartInk = { fontSize: 11, fill: "var(--muted)" };

/** Direct label on the last point only, so identity never relies on line color. */
const endLabel = (name: string) => function EndLabel(props: LabelProps) {
  if (props.index !== monthlyPerformance.length - 1) return <text />;
  return <text x={Number(props.x ?? 0) + 8} y={Number(props.y ?? 0) + 4} fontSize={11} fill="var(--ink)">{name} {props.value}%</text>;
};

export function AnalyticsScreen() {
  const [heatTab, setHeatTab] = useState<"Employees" | "Sites">("Employees");
  const latest = monthlyPerformance[monthlyPerformance.length - 1];

  return <>
    <PageHeader title="Analytics" description="Monthly performance trends and heat maps for employees and sites." />
    <StatStrip items={[
      { icon: TrendUp, value: `${latest.coverage}%`, label: "Coverage · Sep", note: "Staffed post-days", tone: "green" },
      { icon: UsersThree, value: `${latest.attendance}%`, label: "Attendance · Sep", note: "On-time punches" },
      { icon: WarningCircle, value: String(latest.complaints), label: "Complaints · Sep", note: "Down from 5 in Aug", tone: "orange" },
      { icon: Buildings, value: String(sites.length), label: "Sites analysed", note: "All districts", tone: "violet" },
    ]} />
    <div className="content-grid analytics-grid">
      <Panel title="Coverage and attendance" description="Monthly percentage, April to September 2026.">
        <div className="chart-host">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyPerformance} margin={{ top: 12, right: 66, bottom: 4, left: -14 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" tick={chartInk} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
              <YAxis domain={[85, 100]} tick={chartInk} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} formatter={value => `${value}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line name="Coverage" dataKey="coverage" stroke={SERIES_A} strokeWidth={2} dot={{ r: 4, fill: SERIES_A, strokeWidth: 0 }} label={endLabel("Coverage")} />
              <Line name="Attendance" dataKey="attendance" stroke={SERIES_B} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: SERIES_B, strokeWidth: 0 }} label={endLabel("Attend.")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Complaints per month" description="Client complaints logged, April to September 2026.">
        <div className="chart-host">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyPerformance} margin={{ top: 12, right: 12, bottom: 4, left: -22 }} barCategoryGap="32%">
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" tick={chartInk} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={chartInk} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} />
              <Bar name="Complaints" dataKey="complaints" fill={SERIES_A} radius={[4, 4, 0, 0]} maxBarSize={34}
                label={{ position: "top", fontSize: 10, fill: "var(--muted)" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
    <Panel title="Performance heat map" description="1–10 scores; deeper green is better. Hover any cell for the detail."
      action={<div className="tabs-row rating-tabs">{(["Employees", "Sites"] as const).map(item => <button key={item} className={heatTab === item ? "active" : ""} onClick={() => setHeatTab(item)}>{item}</button>)}</div>}>
      {heatTab === "Employees"
        ? <HeatMap rows={employees.slice(0, 10).map(employee => ({ key: employee.id, label: employee.name }))} columns={employeeMetrics}
            scoreOf={(rowKey, column) => employeeScore(rowKey, employees.find(item => item.id === rowKey)?.name ?? rowKey, column)} />
        : <HeatMap rows={sites.map(site => ({ key: site.name, label: site.name }))} columns={siteMetrics}
            scoreOf={(rowKey, column) => siteScore(rowKey, column)} />}
      <p className="heat-footnote">Scores are printed in every cell, so the map stays readable in print and for color-blind readers.</p>
    </Panel>
  </>;
}
