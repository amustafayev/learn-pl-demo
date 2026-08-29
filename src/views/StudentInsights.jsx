import React from "react";
import {
  IconSparkles, IconBrain, IconMicrophone, IconHourglass,
  IconArrowsLeftRight, IconShieldCheck, IconShieldExclamation, IconTrendingUp, IconTrendingDown,
  IconMinus, IconGauge, IconWand, IconMap, IconLanguage,
} from "@tabler/icons-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { Card, Tag, Alert, SectionLabel } from "../design-system.jsx";
import { useStore } from "../store.jsx";
import { studentTrajectory } from "./Insights.jsx";

/* =========================================================================
   Per-student AI Insights — the DERIVED layer for ONE learner (readiness,
   per-skill trajectory, confidence calibration, "you vs last month",
   cross-skill gap) plus the learner-facing outputs (transparent knowledge
   map, weekly plain-language summary). Everything here is COMPUTED from
   data already tracked elsewhere, not a raw dump of every logged signal —
   the raw hesitation/dwell/recall-speed numbers live in the tracking
   pipeline but aren't surfaced here on their own; they only matter once
   they cluster into one of the insights below.
   ========================================================================= */

const TREND_TONE = {
  improving:  { icon: IconTrendingUp, tone: "success" },
  plateauing: { icon: IconMinus, tone: "pending" },
  regressing: { icon: IconTrendingDown, tone: "warning" },
  "just started": { icon: IconMinus, tone: "neutral" },
};
// Tailwind needs each color class spelled out literally somewhere in source
// to generate it — a template string like `bg-${tone}-50` is invisible to
// its scanner, so trajectory tones are looked up here instead.
const TRAJECTORY_CHIP = {
  success: "bg-success-50 text-success-600",
  pending: "bg-pending-50 text-pending-600",
  warning: "bg-warning-50 text-warning-600",
  neutral: "bg-neutral-100 text-neutral-500",
};

// remedial-suggestion lookup — maps a stuck concept to a concrete next step
// using components that already exist in the platform (engine output: "inject
// a remedial micro-lesson at a stuck-point").
const REMEDIAL = [
  { match: /perfect|past simple|conditional/i, suggestion: "Add a Grammar block visualization (timeline / conditional flow) before more drills." },
  { match: /article/i, suggestion: "Re-run the preposition/article gap-fill with the AZ “why” shown before scoring." },
  { match: /word order/i, suggestion: "Add a Sentence scramble activity — rebuilds the pattern instead of just testing it." },
  { match: /preposition/i, suggestion: "Add a Preposition scene visualization for a concrete before/after." },
];
function remedialFor(concept) {
  const hit = REMEDIAL.find((r) => r.match.test(concept));
  return hit ? hit.suggestion : "Add one more gap-fill set with instant AZ feedback before retrying the quiz.";
}

// Trajectory PER SKILL, computed relative to the student's own average — a
// skill notably above their average moves one step better than the overall
// trend, notably below moves one step worse. No new data required.
const LADDER = ["regressing", "plateauing", "improving"];
function perSkillTrajectory(s) {
  const overall = studentTrajectory(s);
  const skills = s.skills || {};
  if (overall.label === "just started") return Object.fromEntries(Object.keys(skills).map((k) => [k, overall]));
  const vals = Object.values(skills);
  const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const baseIdx = LADDER.indexOf(overall.label);
  return Object.fromEntries(Object.entries(skills).map(([k, v]) => {
    const dev = v - avg;
    const idx = Math.min(2, Math.max(0, baseIdx + (dev >= 8 ? 1 : dev <= -8 ? -1 : 0)));
    const label = LADDER[idx];
    return [k, { label, ...TREND_TONE[label] }];
  }));
}

// Readiness to advance vs needs reinforcement — computed from trajectory,
// per-skill regressions, and outstanding weak words.
function readiness(s) {
  const overall = studentTrajectory(s);
  const perSkill = perSkillTrajectory(s);
  const weakCount = (s.words || []).filter((w) => w.status === "weak").length;
  const regressing = Object.entries(perSkill).filter(([, v]) => v.label === "regressing").map(([k]) => k);
  if (overall.label === "just started") return { ready: false, reason: "Still in placement / early days — too soon to call." };
  if (regressing.length) return { ready: false, reason: `${regressing.join(", ")} regressing — reinforce before advancing.` };
  if (weakCount >= 3) return { ready: false, reason: `${weakCount} weak words still unresolved.` };
  if (overall.label === "improving" && weakCount <= 2) return { ready: true, reason: "Trajectory improving, weak words under control." };
  return { ready: false, reason: "Progress has plateaued — reinforce before the next lesson." };
}

// "You vs last month" — reuses the existing CEFR series, no new data needed.
function monthOverMonth(s) {
  const cefr = s.cefr || [];
  if (cefr.length < 2) return null;
  const now = cefr[cefr.length - 1]; const before = cefr[cefr.length - 2];
  return { nowLabel: now.m, beforeLabel: before.m, delta: +(now.v - before.v).toFixed(1) };
}

// cross-skill correlation, computed (not authored) — "knows X in reading but
// weak in listening" style flag, per the doc's ⭐ novel-idea list.
function crossSkillGap(skills) {
  const entries = Object.entries(skills || {});
  if (entries.length < 2) return null;
  const [hi] = [...entries].sort((a, b) => b[1] - a[1]);
  const [lo] = [...entries].sort((a, b) => a[1] - b[1]);
  if (hi[0] === lo[0] || hi[1] - lo[1] < 20) return null;
  return { strongIn: hi[0], strongPct: hi[1], weakIn: lo[0], weakPct: lo[1] };
}

function weeklySummaryAz(s, mom) {
  const wf = s.wordFlow || { new: 0, learning: 0, known: 0 };
  const weakest = Object.entries(s.concepts || {}).sort((a, b) => a[1] - b[1])[0];
  const ready = readiness(s);
  return `Bu həftə ${wf.new} yeni söz öyrəndin, ${wf.known} sözü artıq mükəmməl bilirsən. ` +
    (weakest ? `${weakest[0]} sahəsində məşq etməyə davam et. ` : "") +
    (mom ? `${mom.beforeLabel}-dən ${mom.nowLabel}-a səviyyən ${mom.delta >= 0 ? "yüksəldi" : "azaldı"}. ` : "") +
    (ready.ready ? "Növbəti dərsə keçməyə hazırsan! 🎉" : "Bir az da möhkəmləndir, sonra irəli!");
}

export default function StudentInsights({ s }) {
  const { toast } = useStore();
  const t = s.tracking || {};
  const gap = crossSkillGap(s.skills);
  const overallTraj = studentTrajectory(s);
  const perSkill = perSkillTrajectory(s);
  const ready = readiness(s);
  const mom = monthOverMonth(s);
  const radarData = Object.entries(s.concepts || {}).map(([concept, mastery]) => ({ concept: concept.length > 10 ? concept.split(" ")[0] : concept, mastery }));

  return (
    <div className="space-y-6">
      {/* readiness + you vs last month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card className={`p-4 flex items-center gap-3 ${ready.ready ? "border-success-200 bg-success-50" : "border-pending-200 bg-pending-50"}`}>
          {ready.ready ? <IconShieldCheck size={22} stroke={1.75} className="text-success-600 shrink-0" /> : <IconShieldExclamation size={22} stroke={1.75} className="text-pending-600 shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-950">{ready.ready ? "Ready to advance" : "Needs reinforcement"}</div>
            <div className="text-xs text-neutral-600">{ready.reason}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TRAJECTORY_CHIP[overallTraj.tone]}`}><overallTraj.icon size={18} stroke={1.75} /></span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-950">You vs last month</div>
            <div className="text-xs text-neutral-600">{mom ? `${mom.beforeLabel} → ${mom.nowLabel}: ${mom.delta >= 0 ? "+" : ""}${mom.delta} CEFR · ${overallTraj.label}` : "Not enough history yet."}</div>
          </div>
        </Card>
      </div>

      {/* per-skill trajectory */}
      <div>
        <SectionLabel>Trajectory per skill</SectionLabel>
        <Card className="p-4 flex flex-wrap gap-2">
          {Object.entries(perSkill).map(([skill, tr]) => (
            <Tag key={skill} color={tr.tone}><tr.icon size={11} stroke={1.75} /> <span className="capitalize">{skill}</span> · {tr.label}</Tag>
          ))}
          {!Object.keys(perSkill).length && <span className="text-sm text-neutral-500">No skill data yet.</span>}
        </Card>
      </div>

      {/* stuck points, with a remedial suggestion each */}
      <div>
        <SectionLabel>Where {s.name.split(" ")[0]} got stuck</SectionLabel>
        {t.stuckPoints?.length ? (
          <Card className="divide-y divide-neutral-200">
            {t.stuckPoints.map((p, i) => (
              <div key={i} className="p-3.5 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center shrink-0"><IconHourglass size={15} stroke={1.75} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900"><b>{p.concept}</b> <span className="text-neutral-500">· {p.activity}</span></div>
                  <div className="text-xs text-neutral-500">{p.retries} retries · revisited {p.revisits}× · {p.when}</div>
                  <div className="text-xs text-primary-600 mt-1 flex items-center gap-1"><IconWand size={11} stroke={1.75} /> {remedialFor(p.concept)}</div>
                </div>
                <button onClick={() => toast(`Added a ${p.concept} refresher to ${s.name.split(" ")[0]}'s next session`)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 shrink-0">Refresh it</button>
              </div>
            ))}
          </Card>
        ) : <Card className="p-5 text-sm text-neutral-500">No stuck points detected — fails + high dwell + revisits haven't clustered anywhere yet.</Card>}
      </div>

      {/* confidence calibration */}
      <div>
        <SectionLabel>Confidence calibration</SectionLabel>
        {t.confidence?.length ? (
          <Card className="p-4 space-y-3">
            {t.confidence.map((c, i) => {
              const off = Math.abs(c.predicted - c.actual);
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-neutral-700 font-medium">{c.concept}</span><span className={`font-mono ${off >= 20 ? "text-pending-600" : "text-neutral-500"}`}>{c.predicted}% predicted vs {c.actual}% actual</span></div>
                  <div className="relative h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div className="absolute h-full bg-neutral-400" style={{ width: `${c.predicted}%` }} />
                    <div className="absolute h-full bg-primary-500" style={{ width: `${c.actual}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-neutral-500 flex items-center gap-1"><IconGauge size={11} stroke={1.75} /> Grey = self-rated confidence, orange = actual score. A big gap means they don't know what they don't know.</p>
          </Card>
        ) : <Card className="p-5 text-sm text-neutral-500">No self-assessment data yet — ask “how confident are you?” before a quiz to start tracking this.</Card>}
      </div>

      {gap && (
        <Alert icon={IconArrowsLeftRight} tone="info" title="Cross-skill gap">
          Strong in <b>{gap.strongIn}</b> ({gap.strongPct}%) but weak in <b>{gap.weakIn}</b> ({gap.weakPct}%) — knowledge in one skill isn't transferring. Worth a targeted {gap.weakIn} activity.
        </Alert>
      )}

      {/* transparent knowledge map — what the learner themselves would see */}
      <div>
        <SectionLabel><span className="inline-flex items-center gap-1.5"><IconMap size={13} stroke={1.75} /> {s.name.split(" ")[0]}'s map of English · learner-facing</span></SectionLabel>
        <Card className="p-6">
          <p className="text-xs text-neutral-500 mb-2">Shown to the student in their own app — not hidden from them.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#e5e5e5" />
                <PolarAngleAxis dataKey="concept" tick={{ fontSize: 10, fill: "#8c8c8c" }} />
                <Radar dataKey="mastery" stroke="#ff5c20" fill="#ff5c20" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* weekly plain-language summary, in Azerbaijani */}
      <div>
        <SectionLabel><span className="inline-flex items-center gap-1.5"><IconLanguage size={13} stroke={1.75} /> Weekly summary · what {s.name.split(" ")[0]} reads</span></SectionLabel>
        <Alert icon={IconSparkles} tone="primary">{weeklySummaryAz(s, mom)}</Alert>
      </div>

      {/* recording summary */}
      <div>
        <SectionLabel>Last recorded lesson</SectionLabel>
        {s.lastRecording?.summary ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2"><IconMicrophone size={13} stroke={1.75} /> {s.lastRecording.date} · {s.lastRecording.durationMin}m recorded</div>
            <Alert icon={IconSparkles} tone="primary">{s.lastRecording.summary}</Alert>
          </Card>
        ) : (
          <Card className="p-5 text-sm text-neutral-500 flex items-center gap-2"><IconBrain size={15} stroke={1.75} className="text-neutral-400" /> No recorded session yet — turn on voice recording in a live lesson to get an AI summary here.</Card>
        )}
      </div>
    </div>
  );
}
