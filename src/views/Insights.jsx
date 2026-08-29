import React, { useMemo, useState } from "react";
import {
  IconTrendingUp, IconTrendingDown, IconMinus, IconAlertTriangle, IconArrowsShuffle, IconAdjustments,
  IconClock, IconArrowUpRight, IconArrowDownRight, IconGauge,
} from "@tabler/icons-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter, ReferenceLine, Cell,
} from "recharts";
import { Page, PageHeader, Card, Tag, Alert, SectionLabel, StatCard, Avatar, Select } from "../design-system.jsx";
import { useStore, useNav } from "../store.jsx";
import { CONCEPT_TRENDS, CONCEPT_WEEKS } from "../data.jsx";

/* =========================================================================
   AI Insights — the knowledge-tracing layer, separate from Statistics
   (which is raw numbers). Everything here is a COMPUTED signal derived from
   what's already tracked (words, cefr trajectory, streak, activity) plus a
   couple of explicit signals (confusion pairs, difficulty auto-adjust log)
   that aren't derivable from snapshots alone. Class-wide by default, with a
   per-student filter for the individual-tracking half of the same feature.
   ========================================================================= */

const LINE_COLORS = ["#ff5c20", "#4cb119", "#e49d12", "#e74648", "#1783e8"];

// improving / plateauing / regressing from a 0-100-scale series (class trends)
function trendDirection(values) {
  const recent = values.slice(-3);
  const delta = recent[recent.length - 1] - recent[0];
  if (delta > 4) return { label: "improving", icon: IconTrendingUp, tone: "success" };
  if (delta < -4) return { label: "regressing", icon: IconTrendingDown, tone: "warning" };
  return { label: "plateauing", icon: IconMinus, tone: "pending" };
}

// per-student trajectory from their CEFR-level series (0-4ish scale)
export function studentTrajectory(s) {
  const cefr = s.cefr || [];
  if (cefr.length < 2) return { label: "just started", icon: IconMinus, tone: "neutral" };
  const recent = cefr.slice(-3).map((c) => c.v);
  const delta = recent[recent.length - 1] - recent[0];
  if (delta > 0.15) return { label: "improving", icon: IconTrendingUp, tone: "success" };
  if (delta < -0.05) return { label: "regressing", icon: IconTrendingDown, tone: "warning" };
  return { label: "plateauing", icon: IconMinus, tone: "pending" };
}

function forgettingList(students) {
  const items = [];
  students.forEach((s) => (s.words || []).forEach((w) => {
    if ((w.status === "weak" || w.status === "medium") && w.dueInDays <= 1) items.push({ student: s, word: w });
  }));
  return items.sort((a, b) => a.word.dueInDays - b.word.dueInDays || (a.word.status === "weak" ? -1 : 1));
}
function confusionList(students) {
  const items = [];
  students.forEach((s) => (s.confusionPairs || []).forEach((p) => items.push({ student: s, ...p })));
  return items.sort((a, b) => b.count - a.count);
}
function adjustFeed(students) {
  const items = [];
  students.forEach((s) => (s.adjustLog || []).forEach((e) => items.push({ student: s, ...e })));
  return items;
}
function churnScore(s) {
  let score = 0; const factors = [];
  if (s.streak === 0) { score += 40; factors.push("streak at 0"); }
  const dMatch = /^(\d+)d ago$/.exec(s.last || "");
  if (dMatch && +dMatch[1] >= 3) { score += Math.min(30, +dMatch[1] * 5); factors.push(`inactive ${dMatch[1]}d`); }
  const weeklyMin = Math.round((s.tracking?.rhythm?.avgSessionMin || 0) * (s.tracking?.rhythm?.sessionsPerWeek || 0));
  if (weeklyMin < 30) { score += 15; factors.push(`low time spent (${weeklyMin}m/wk)`); }
  const traj = studentTrajectory(s);
  if (traj.label === "plateauing" && s.streak >= 5) { score += 25; factors.push("high effort, flat progress"); }
  if (traj.label === "regressing") { score += 20; factors.push("scores trending down"); }
  return { score: Math.min(100, score), factors };
}
function mismatchList(students) {
  return students.filter((s) => s.streak >= 5 && ["plateauing", "regressing"].includes(studentTrajectory(s).label));
}

export default function Insights() {
  const { state, toast } = useStore();
  const { go } = useNav();
  const [filter, setFilter] = useState("all");

  const students = state.students;
  const filtered = filter === "all" ? students : students.filter((s) => s.id === filter);

  const forgetting = useMemo(() => forgettingList(filtered), [filtered]);
  const confusions = useMemo(() => confusionList(filtered), [filtered]);
  const adjustments = useMemo(() => adjustFeed(filtered), [filtered]);
  const mismatches = useMemo(() => mismatchList(students), [students]); // always class-wide
  const churn = useMemo(() => students.map((s) => ({ s, ...churnScore(s) })).sort((a, b) => b.score - a.score), [students]);
  const scatterData = useMemo(() => students.map((s) => {
    const cefr = s.cefr || [];
    const outcome = cefr.length >= 2 ? +(cefr[cefr.length - 1].v - cefr[0].v).toFixed(2) : 0;
    return { name: s.name, id: s.id, effort: s.streak, outcome, atRisk: s.atRisk };
  }), [students]);

  const chartData = CONCEPT_WEEKS.map((wk, i) => {
    const row = { wk };
    CONCEPT_TRENDS.forEach((c) => { row[c.concept] = c.values[i]; });
    return row;
  });

  return (
    <Page>
      <PageHeader kicker="Knowledge tracing" title="AI Insights"
        sub="Computed signals, not opinions — forgetting risk, confusion, mastery trends, and effort vs. outcome."
        right={
          <Select className="!w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard value={forgetting.length} label="words about to be forgotten" />
        <StatCard value={confusions.length} label="confusion pairs detected" />
        <StatCard value={adjustments.length} label="difficulty auto-adjustments" />
        <StatCard value={mismatches.length} label="effort-outcome mismatches" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* forgetting predictions */}
        <div>
          <SectionLabel>Forgetting predictions · spaced-repetition risk</SectionLabel>
          <Card className="divide-y divide-neutral-200">
            {forgetting.slice(0, 8).map((item, i) => (
              <div key={i} className="p-3.5 flex items-center gap-3">
                <button onClick={() => go({ tab: "students", studentId: item.student.id })} className="shrink-0"><Avatar name={item.student.name} /></button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900"><b>{item.word.term}</b> <span className="text-neutral-500">· {item.student.name.split(" ")[0]}</span></div>
                  <div className="text-xs text-neutral-500">{item.word.dueInDays === 0 ? "due for review now" : `due in ${item.word.dueInDays}d`}</div>
                </div>
                <Tag color={item.word.status === "weak" ? "warning" : "pending"}>{item.word.status}</Tag>
                <button onClick={() => toast(`“${item.word.term}” added to ${item.student.name.split(" ")[0]}'s next review`)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 shrink-0">Resurface</button>
              </div>
            ))}
            {!forgetting.length && <div className="p-6 text-center text-sm text-neutral-500">Nothing at risk right now.</div>}
          </Card>
        </div>

        {/* confusion pairs */}
        <div>
          <SectionLabel>Confusion pairs · what gets swapped</SectionLabel>
          <Card className="divide-y divide-neutral-200">
            {confusions.map((c, i) => (
              <button key={i} onClick={() => go({ tab: "students", studentId: c.student.id })} className="w-full text-left p-3.5 flex items-center gap-3 hover:bg-neutral-50">
                <IconArrowsShuffle size={15} stroke={1.75} className="text-pending-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono"><span className="text-warning-600">{c.a}</span> <span className="text-neutral-300">⇄</span> <span className="text-primary-600">{c.b}</span></div>
                  <div className="text-xs text-neutral-500">{c.student.name}</div>
                </div>
                <Tag color="pending">×{c.count}</Tag>
              </button>
            ))}
            {!confusions.length && <div className="p-6 text-center text-sm text-neutral-500">No confusion pairs detected for this selection.</div>}
          </Card>
          <p className="text-[11px] text-neutral-500 mt-2">L1-interference candidates surface here first — see a student's profile for the full breakdown.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* class mastery trend */}
        <Card className="p-6">
          <div className="text-sm font-semibold mb-1 text-neutral-950">Class mastery trend</div>
          <div className="text-xs text-neutral-500 mb-3">Per-concept average, last 6 weeks</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="wk" tick={{ fontSize: 11, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                <Tooltip />
                {CONCEPT_TRENDS.map((c, i) => <Line key={c.concept} dataKey={c.concept} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {CONCEPT_TRENDS.map((c, i) => {
              const t = trendDirection(c.values); const TI = t.icon;
              return (
                <span key={c.concept} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
                  {c.concept} <Tag color={t.tone}><TI size={10} stroke={1.75} /> {t.label}</Tag>
                </span>
              );
            })}
          </div>
        </Card>

        {/* effort vs outcome */}
        <Card className="p-6">
          <div className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-neutral-950"><IconGauge size={15} stroke={1.75} className="text-primary-600" /> Effort vs. outcome</div>
          <div className="text-xs text-neutral-500 mb-3">Streak (effort) vs. CEFR movement (outcome) — bottom-right is the zone to watch</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis type="number" dataKey="effort" name="streak" unit="d" tick={{ fontSize: 11, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="outcome" name="CEFR Δ" tick={{ fontSize: 11, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
                <ReferenceLine y={0.15} stroke="#e5e5e5" strokeDasharray="4 4" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return <div className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs shadow-md"><b>{d.name}</b><br />streak {d.effort}d · CEFR +{d.outcome}</div>;
                }} />
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => <Cell key={i} fill={d.atRisk ? "#fe4d4f" : "#ff5c20"} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {mismatches.length > 0 ? (
            <Alert icon={IconAlertTriangle} tone="pending">
              {mismatches.map((s, i) => (
                <React.Fragment key={s.id}>{i > 0 && ", "}<b>{s.name}</b></React.Fragment>
              ))} — high effort, flat or falling progress. A human should look, not the algorithm.
            </Alert>
          ) : (
            <p className="text-xs text-neutral-500">No effort-outcome mismatches right now — everyone's practice is translating into progress.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* churn / at-risk radar */}
        <div>
          <SectionLabel>At-risk radar · ranked by churn score</SectionLabel>
          <Card className="divide-y divide-neutral-200">
            {churn.map(({ s, score, factors }) => (
              <button key={s.id} onClick={() => go({ tab: "students", studentId: s.id })} className="w-full text-left p-3.5 flex items-center gap-3 hover:bg-neutral-50">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-950">{s.name}</div>
                  <div className="text-xs text-neutral-500 truncate">{factors.length ? factors.join(" · ") : "no risk factors"}</div>
                </div>
                <div className="w-16 shrink-0">
                  <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden"><div className={`h-full ${score >= 60 ? "bg-warning-500" : score >= 25 ? "bg-pending-500" : "bg-success-500"}`} style={{ width: `${score}%` }} /></div>
                  <div className="text-[10px] text-neutral-500 font-mono text-right mt-0.5">{score}</div>
                </div>
              </button>
            ))}
          </Card>
        </div>

        {/* auto-adjust difficulty feed */}
        <div>
          <SectionLabel>Auto-adjust difficulty · what the engine changed</SectionLabel>
          <Card className="divide-y divide-neutral-200">
            {adjustments.map((e, i) => (
              <button key={i} onClick={() => go({ tab: "students", studentId: e.student.id })} className="w-full text-left p-3.5 flex items-start gap-3 hover:bg-neutral-50">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${e.dir === "harder" ? "bg-primary-50 text-primary-600" : "bg-pending-50 text-pending-600"}`}>
                  {e.dir === "harder" ? <IconArrowUpRight size={15} stroke={1.75} /> : <IconArrowDownRight size={15} stroke={1.75} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900"><b>{e.student.name}</b> · {e.concept} — {e.dir === "harder" ? "bumped up" : "eased down"}</div>
                  <div className="text-xs text-neutral-500">{e.reason}</div>
                </div>
                <span className="text-[11px] text-neutral-400 shrink-0 inline-flex items-center gap-1"><IconClock size={11} stroke={1.75} /> {e.when}</span>
              </button>
            ))}
            {!adjustments.length && <div className="p-6 text-center text-sm text-neutral-500">No auto-adjustments logged for this selection.</div>}
          </Card>
          <p className="text-[11px] text-neutral-500 mt-2 flex items-center gap-1"><IconAdjustments size={11} stroke={1.75} /> Two-way adaptive difficulty — breeze through → harder; struggle → easier + re-explanation.</p>
        </div>
      </div>
    </Page>
  );
}
