"use client";

import { useState } from "react";
import { AlertTriangle, Building2, TrendingUp, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type LabelProps,
} from "recharts";
import { attendanceRows, employees, monthlyPerformance, ratings, siteFeedback, sites } from "@/lib/mock-data";
import { PageHeader, Panel, SegmentedControl, SplitLayout, StatStrip } from "@/components/ui-kit";
import { NAV } from "@/lib/labels";

/* Two series only, separated by hue and lightness, with a dashed secondary line
   and direct end-labels so identity never rides on color alone. */
const SERIES_A = "#00be73";
const SERIES_B = "#0b2545";
const GRID = "hsl(var(--border))";
const MUTED = "hsl(var(--muted))";

const employeeMetrics = ["Attendance", "Punctuality", "SOP", "Rating", "Complaints"] as const;
const siteMetrics = ["Coverage", "Rating", "Complaints", "Feedback"] as const;

/** 1–10 score for every employee/metric pair, derived from seed data. */
function employeeScore(employeeId: string, employeeName: string, metric: (typeof employeeMetrics)[number]): number {
  const row = attendanceRows.find(item => item.id === employeeId);
  switch (metric) {
    case "Attendance": return row ? (row.state === "On site" ? 10 : row.state === "Late" ? 5 : 1) : 7;
    case "Punctuality": return row ? (row.punch !== "—" && row.state === "On site" ? 9 : row.state === "Late" ? 4 : 2) : 6;
    case "SOP": return (employeeName.length * 7) % 4 + 6;
    case "Rating": {
      const scores = ratings.filter(rating => rating.targetType === "employee" && rating.targetId === employeeId).map(rating => rating.score);
      return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 7;
    }
    case "Complaints": return (employeeId.charCodeAt(4) % 3) === 0 ? 6 : 9;
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

/** Deeper emerald = better score. The value stays printed in the cell. */
const heatShades = ["bg-emerald/10", "bg-emerald/25", "bg-emerald/40", "bg-emerald/60 text-white", "bg-emerald text-white"];
const heatClass = (score: number) => heatShades[Math.min(4, Math.max(0, Math.ceil(score / 2) - 1))];

function HeatMap<T extends string>({ rows, columns, scoreOf }: {
  rows: { key: string; label: string }[];
  columns: readonly T[];
  scoreOf: (rowKey: string, column: T) => number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[520px] gap-1" style={{ gridTemplateColumns: `minmax(140px,1.2fr) repeat(${columns.length}, minmax(64px,1fr))` }}>
        <span />
        {columns.map(column => <span key={column} className="px-1 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{column}</span>)}
        {rows.map(row => <div key={row.key} className="contents">
          <span className="truncate self-center pr-2 text-sm">{row.label}</span>
          {columns.map(column => {
            const score = scoreOf(row.key, column);
            return <span key={column} className={`flex h-9 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${heatClass(score)}`} title={`${row.label} · ${column}: ${score}/10`}>{score}</span>;
          })}
        </div>)}
      </div>
    </div>
  );
}

const chartTick = { fontSize: 11, fill: MUTED };
const tooltipStyle = { background: "hsl(var(--card))", border: `1px solid ${GRID}`, borderRadius: 12, fontSize: 12 };

/** Direct label on the last point only, so identity never relies on line color. */
const endLabel = (name: string) => function EndLabel(props: LabelProps) {
  if (props.index !== monthlyPerformance.length - 1) return <text />;
  return <text x={Number(props.x ?? 0) + 8} y={Number(props.y ?? 0) + 4} fontSize={11} fill="hsl(var(--foreground))">{name} {props.value}%</text>;
};

export function AnalyticsScreen() {
  const [heatTab, setHeatTab] = useState<"Employees" | "Sites">("Employees");
  const latest = monthlyPerformance[monthlyPerformance.length - 1];
  const previous = monthlyPerformance[monthlyPerformance.length - 2];

  return <>
    <PageHeader title={NAV.analytics} subtitle="Monthly trends and performance heat maps for employees and sites." />
    <StatStrip items={[
      { icon: TrendingUp, value: `${latest.coverage}%`, label: `Coverage · ${latest.month}`, note: "Posts staffed", tone: "green" },
      { icon: Users, value: `${latest.attendance}%`, label: `Attendance · ${latest.month}`, note: "On-time punches" },
      { icon: AlertTriangle, value: String(latest.complaints), label: `Complaints · ${latest.month}`, note: `${previous.complaints} in ${previous.month}`, tone: "orange" },
      { icon: Building2, value: String(sites.length), label: "Sites analysed", note: "All districts" },
    ]} />
    <SplitLayout>
      <Panel title="Coverage and attendance" description="Monthly percentage, April to September 2026.">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyPerformance} margin={{ top: 12, right: 66, bottom: 4, left: -14 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" tick={chartTick} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis domain={[85, 100]} tick={chartTick} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={value => `${value}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line name="Coverage" dataKey="coverage" stroke={SERIES_A} strokeWidth={2} dot={{ r: 4, fill: SERIES_A, strokeWidth: 0 }} label={endLabel("Coverage")} />
            <Line name="Attendance" dataKey="attendance" stroke={SERIES_B} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: SERIES_B, strokeWidth: 0 }} label={endLabel("Attend.")} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Complaints per month" description="Client complaints logged, April to September 2026.">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyPerformance} margin={{ top: 12, right: 12, bottom: 4, left: -22 }} barCategoryGap="32%">
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" tick={chartTick} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis allowDecimals={false} tick={chartTick} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "hsl(var(--surface))" }} contentStyle={tooltipStyle} />
            <Bar name="Complaints" dataKey="complaints" fill={SERIES_A} radius={[6, 6, 0, 0]} maxBarSize={34} label={{ position: "top", fontSize: 10, fill: MUTED }} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </SplitLayout>
    <Panel title="Performance heat map" description="Scores out of 10. Deeper green is better; hover a cell for detail.">
      <SegmentedControl options={["Employees", "Sites"] as const} value={heatTab} onChange={setHeatTab} />
      {heatTab === "Employees"
        ? <HeatMap rows={employees.slice(0, 10).map(employee => ({ key: employee.id, label: employee.name }))} columns={employeeMetrics}
          scoreOf={(rowKey, column) => employeeScore(rowKey, employees.find(item => item.id === rowKey)?.name ?? rowKey, column)} />
        : <HeatMap rows={sites.map(site => ({ key: site.name, label: site.name }))} columns={siteMetrics} scoreOf={siteScore} />}
      <p className="mt-3 text-xs text-muted">Every cell shows its score, so the map stays readable in print and for colour-blind readers.</p>
    </Panel>
  </>;
}
