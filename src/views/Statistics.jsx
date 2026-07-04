import React from "react";
import { Brain, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip,
} from "recharts";
import { Page, PageHead, Card, StatCard, AiNote, SectionLabel } from "../ui.jsx";
import { useStore, useNav } from "../store.jsx";
import { CONCEPTS, CLASS_HEATMAP, HEATMAP_CONCEPTS, NORTHSTAR, heat } from "../data.jsx";

export default function Statistics() {
  const { state } = useStore();
  const { go } = useNav();
  const students = state.students;
  const active = students.filter((s) => s.status !== "not started").length;
  const atRisk = students.filter((s) => s.atRisk);

  // class-average mastery per concept for the confusion radar
  const radar = CONCEPTS.map((c) => ({
    concept: c.length > 10 ? c.split(" ")[0] : c,
    mastery: Math.round(students.reduce((a, s) => a + (s.concepts[c] || 0), 0) / students.length),
  }));

  return (
    <Page>
      <PageHead kicker="Class analytics" title="Statistics" sub="The numbers, not the material — kept separate from your course content on purpose." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard value={active} label="active students" tone="text-indigo-600" />
        <StatCard value="62%" label="avg completion" tone="text-emerald-600" />
        <StatCard value={atRisk.length} label="at-risk / idle" tone="text-rose-500" />
        <StatCard value="9.1" label="words → known / wk" hint="north-star" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-6">
          <div className="text-sm font-semibold mb-1">Confusion radar</div>
          <div className="text-xs text-slate-400 mb-2">Class mastery by grammar concept (%)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="concept" tick={{ fontSize: 11, fill: "#64748b" }} />
                <Radar dataKey="mastery" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold mb-1 flex items-center gap-1.5"><TrendingUp size={15} className="text-emerald-600" /> North-star trend</div>
          <div className="text-xs text-slate-400 mb-2">Words moved to “known” per active learner, per week</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={NORTHSTAR} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <XAxis dataKey="wk" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line dataKey="v" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="text-sm font-semibold mb-4">Who struggles with what</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-left font-medium pb-2 pr-3">Student</th>
                  {HEATMAP_CONCEPTS.map((c) => <th key={c} className="font-medium pb-2 px-1 text-center">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {CLASS_HEATMAP.map((s) => (
                  <tr key={s.name}>
                    <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                    {s.cells.map((v, i) => (
                      <td key={i} className="px-1 py-1.5"><div className={`h-9 rounded-md flex items-center justify-center font-mono text-xs ${heat(v)}`}>{v}</div></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AiNote icon={Brain} tone="violet" title="Suggested group focus"><span className="mt-1 inline-block">Three students are weak on <b>Articles</b> — expected for Azerbaijani speakers (no articles in L1). Worth a group mini-lesson, then re-check next week.</span></AiNote>
        </Card>

        <div className="space-y-5">
          <div>
            <SectionLabel>At-risk / churn flags</SectionLabel>
            <div className="space-y-2.5">
              {atRisk.map((s) => (
                <button key={s.id} onClick={() => go({ tab: "students", studentId: s.id })} className="w-full text-left">
                  <AiNote icon={AlertTriangle} tone="rose" title={s.name}>{s.riskReason}</AiNote>
                </button>
              ))}
            </div>
          </div>
          <AiNote icon={Lightbulb} tone="amber" title="Effort vs outcome — a human should look">
            <b>Aysel</b> is working hard (11 sessions/wk) but her grammar score has been flat for 3 weeks. High effort + no gain is exactly what the model flags for you, not the learner.
          </AiNote>
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Class skill mix</div>
            {[["Vocabulary", 74, "bg-indigo-500"], ["Grammar", 58, "bg-emerald-500"], ["Reading", 70, "bg-sky-500"], ["Listening", 51, "bg-violet-500"]].map(([l, v, c]) => (
              <div key={l} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{l}</span><span className="font-mono text-slate-400">{v}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${c}`} style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </Page>
  );
}
