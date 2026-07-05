import React from "react";
import {
  BookOpen, Headphones, Lightbulb, LogOut, Sparkles, Brain, Mic, Hourglass,
  CalendarClock, ArrowLeftRight, ShieldCheck, ShieldAlert, TrendingUp, TrendingDown,
  Minus, Gauge, Repeat, CheckCircle2, Circle, Wand2, Map, Languages,
} from "lucide-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { Card, Pill, AiNote, SectionLabel } from "../ui.jsx";
import { useStore } from "../store.jsx";
import { studentTrajectory } from "./Insights.jsx";

/* =========================================================================
   Per-student AI Insights — the raw + derived tracking signals for ONE
   learner, straight from the doc's "AI Tracking — Advanced" list, plus the
   AI-derived layer (readiness, per-skill trajectory, confidence calibration,
   "you vs last month") and the learner-facing outputs (transparent knowledge
   map, weekly plain-language summary). Everything not explicitly authored
   (readiness, per-skill trajectory, cross-skill gap, month-over-month) is
   COMPUTED from data already tracked elsewhere — not a separate opinion.
   ========================================================================= */

const METHODS = [
  "Dwell time per section", "Hesitation & retries", "Reading pace", "Listening replays",
  "Hint usage", "Recall speed / memory strength", "Session rhythm", "Abandonment point",
  "Confidence calibration", "Recording summarization",
];

const TYPE_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing" };
const TYPE_COLOR = { grammar: "bg-emerald-500", vocabulary: "bg-indigo-500", reading: "bg-sky-500", listening: "bg-violet-500", speaking: "bg-teal-500", writing: "bg-rose-500" };
const TREND_TONE = {
  improving:  { icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50" },
  plateauing: { icon: Minus, tone: "text-amber-600 bg-amber-50" },
  regressing: { icon: TrendingDown, tone: "text-rose-600 bg-rose-50" },
  "just started": { icon: Minus, tone: "text-slate-400 bg-slate-100" },
};
const LOOP_STAGES = ["Quick review", "Sentence challenge", "Speaking challenge", "Story with the word"];

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
  const dwell = t.dwellByType || {};
  const totalDwell = Object.values(dwell).reduce((a, b) => a + b, 0) || 1;
  const gap = crossSkillGap(s.skills);
  const overallTraj = studentTrajectory(s);
  const perSkill = perSkillTrajectory(s);
  const ready = readiness(s);
  const mom = monthOverMonth(s);
  const radarData = Object.entries(s.concepts || {}).map(([concept, mastery]) => ({ concept: concept.length > 10 ? concept.split(" ")[0] : concept, mastery }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {METHODS.map((m) => <Pill key={m} className="bg-slate-100 text-slate-500">{m}</Pill>)}
      </div>

      {/* readiness + you vs last month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card className={`p-4 flex items-center gap-3 ${ready.ready ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
          {ready.ready ? <ShieldCheck size={22} className="text-emerald-600 shrink-0" /> : <ShieldAlert size={22} className="text-amber-600 shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold">{ready.ready ? "Ready to advance" : "Needs reinforcement"}</div>
            <div className="text-xs text-slate-500">{ready.reason}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${overallTraj.tone}`}><overallTraj.icon size={18} /></span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">You vs last month</div>
            <div className="text-xs text-slate-500">{mom ? `${mom.beforeLabel} → ${mom.nowLabel}: ${mom.delta >= 0 ? "+" : ""}${mom.delta} CEFR · ${overallTraj.label}` : "Not enough history yet."}</div>
          </div>
        </Card>
      </div>

      {/* per-skill trajectory */}
      <div>
        <SectionLabel>Trajectory per skill</SectionLabel>
        <Card className="p-4 flex flex-wrap gap-2">
          {Object.entries(perSkill).map(([skill, tr]) => (
            <Pill key={skill} className={tr.tone}><tr.icon size={11} /> <span className="capitalize">{skill}</span> · {tr.label}</Pill>
          ))}
          {!Object.keys(perSkill).length && <span className="text-sm text-slate-400">No skill data yet.</span>}
        </Card>
      </div>

      {/* dwell time per section */}
      <div>
        <SectionLabel>Time spent per section this week</SectionLabel>
        <Card className="p-5">
          {Object.keys(dwell).length ? Object.entries(dwell).sort((a, b) => b[1] - a[1]).map(([type, min]) => (
            <div key={type} className="mb-2.5 last:mb-0">
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{TYPE_LABEL[type] || type}</span><span className="font-mono text-slate-400">{min}m · {Math.round((min / totalDwell) * 100)}%</span></div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${TYPE_COLOR[type] || "bg-slate-400"}`} style={{ width: `${(min / totalDwell) * 100}%` }} /></div>
            </div>
          )) : <p className="text-sm text-slate-400">No session time logged yet.</p>}
        </Card>
      </div>

      {/* stuck points, with a remedial suggestion each */}
      <div>
        <SectionLabel>Where {s.name.split(" ")[0]} got stuck</SectionLabel>
        {t.stuckPoints?.length ? (
          <Card className="divide-y divide-slate-100">
            {t.stuckPoints.map((p, i) => (
              <div key={i} className="p-3.5 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><Hourglass size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm"><b>{p.concept}</b> <span className="text-slate-400">· {p.activity}</span></div>
                  <div className="text-xs text-slate-400">{p.retries} retries · {p.avgDwellSec}s avg dwell · revisited {p.revisits}× · {p.when}</div>
                  <div className="text-xs text-indigo-600 mt-1 flex items-center gap-1"><Wand2 size={11} /> {remedialFor(p.concept)}</div>
                </div>
                <button onClick={() => toast(`Added a ${p.concept} refresher to ${s.name.split(" ")[0]}'s next session`)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0">Refresh it</button>
              </div>
            ))}
          </Card>
        ) : <Card className="p-5 text-sm text-slate-400">No stuck points detected — fails + high dwell + revisits haven't clustered anywhere yet.</Card>}
      </div>

      {/* response speed & accuracy */}
      <div>
        <SectionLabel>Time to respond correctly</SectionLabel>
        {t.responseSpeed?.length ? (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-400 text-xs"><tr>
                <th className="text-left font-medium p-3">Concept</th>
                <th className="text-left font-medium p-3">Avg time to correct</th>
                <th className="text-left font-medium p-3">First-try accuracy</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {t.responseSpeed.map((r, i) => (
                  <tr key={i}>
                    <td className="p-3 font-medium">{r.concept}</td>
                    <td className="p-3 font-mono text-slate-500">{r.avgSecToCorrect}s</td>
                    <td className="p-3"><span className={`font-mono ${r.firstTryAccuracy < 50 ? "text-rose-600" : r.firstTryAccuracy < 75 ? "text-amber-600" : "text-emerald-600"}`}>{r.firstTryAccuracy}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : <Card className="p-5 text-sm text-slate-400">Not enough graded attempts yet.</Card>}
        <p className="text-[11px] text-slate-400 mt-2">Slow + low-accuracy concepts need re-explanation, not just more practice.</p>
      </div>

      {/* recall speed & the escalating memory loop */}
      <div>
        <SectionLabel>Recall speed & memory strength</SectionLabel>
        <Card className="p-4">
          {(() => {
            const loopWord = (s.words || []).find((w) => w.loopStage != null);
            if (!loopWord) return <p className="text-sm text-slate-400">No word currently in the escalating review loop.</p>;
            return (
              <div>
                <div className="text-sm mb-3">You learned <b>{loopWord.term}</b> {loopWord.daysAgo}d ago — recall speed across intervals decides what's next.</div>
                <div className="flex items-center gap-1">
                  {LOOP_STAGES.map((stage, i) => (
                    <React.Fragment key={stage}>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        {i < loopWord.loopStage ? <CheckCircle2 size={18} className="text-emerald-500" /> : i === loopWord.loopStage ? <Repeat size={18} className="text-indigo-600" /> : <Circle size={18} className="text-slate-300" />}
                        <span className={`text-[10px] text-center ${i === loopWord.loopStage ? "text-indigo-700 font-semibold" : "text-slate-400"}`}>{stage}</span>
                      </div>
                      {i < LOOP_STAGES.length - 1 && <div className={`h-px flex-1 -mt-4 ${i < loopWord.loopStage ? "bg-emerald-300" : "bg-slate-200"}`} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </Card>
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
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 font-medium">{c.concept}</span><span className={`font-mono ${off >= 20 ? "text-amber-600" : "text-slate-400"}`}>{c.predicted}% predicted vs {c.actual}% actual</span></div>
                  <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="absolute h-full bg-slate-300" style={{ width: `${c.predicted}%` }} />
                    <div className="absolute h-full bg-indigo-500" style={{ width: `${c.actual}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-slate-400 flex items-center gap-1"><Gauge size={11} /> Grey = self-rated confidence, indigo = actual score. A big gap means they don't know what they don't know.</p>
          </Card>
        ) : <Card className="p-5 text-sm text-slate-400">No self-assessment data yet — ask “how confident are you?” before a quiz to start tracking this.</Card>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* reading & listening signals */}
        <div>
          <SectionLabel>Reading & listening behaviour</SectionLabel>
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><BookOpen size={15} /></span>
              <div className="text-sm"><div>{t.reading?.paceWpm || 0} words/min · {t.reading?.rereads || 0} re-reads · {t.reading?.wordsTappedPerText || 0} words tapped/text</div></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Headphones size={15} /></span>
              <div className="text-sm">
                <div>{t.listening?.avgReplays ?? 0} replays / audio, avg</div>
                {t.listening?.struggle && <div className="text-xs text-slate-400">{t.listening.struggle}</div>}
              </div>
            </div>
          </Card>
        </div>

        {/* rhythm + hints + abandonment */}
        <div>
          <SectionLabel>Rhythm, hints & drop-off</SectionLabel>
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><CalendarClock size={15} /></span>
              <div className="text-sm">{t.rhythm?.avgSessionMin || 0}m sessions · {t.rhythm?.sessionsPerWeek ?? 0}/wk · {t.rhythm?.commonTimeOfDay || "—"}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Lightbulb size={15} /></span>
              <div className="text-sm">{t.hints?.used || 0} hints used{t.hints?.mostUsedOn ? ` · mostly on ${t.hints.mostUsedOn}` : ""}</div>
            </div>
            {t.abandonment?.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><LogOut size={15} /></span>
                <div className="text-sm">Quit “{t.abandonment[0].lesson}” at {t.abandonment[0].part} · {t.abandonment[0].when}</div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {gap && (
        <AiNote icon={ArrowLeftRight} tone="sky" title="Cross-skill gap">
          Strong in <b>{gap.strongIn}</b> ({gap.strongPct}%) but weak in <b>{gap.weakIn}</b> ({gap.weakPct}%) — knowledge in one skill isn't transferring. Worth a targeted {gap.weakIn} activity.
        </AiNote>
      )}

      {/* transparent knowledge map — what the learner themselves would see */}
      <div>
        <SectionLabel><span className="inline-flex items-center gap-1.5"><Map size={13} /> {s.name.split(" ")[0]}'s map of English · learner-facing</span></SectionLabel>
        <Card className="p-6">
          <p className="text-xs text-slate-400 mb-2">Shown to the student in their own app — not hidden from them.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="concept" tick={{ fontSize: 10, fill: "#64748b" }} />
                <Radar dataKey="mastery" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* weekly plain-language summary, in Azerbaijani */}
      <div>
        <SectionLabel><span className="inline-flex items-center gap-1.5"><Languages size={13} /> Weekly summary · what {s.name.split(" ")[0]} reads</span></SectionLabel>
        <AiNote icon={Sparkles} tone="violet">{weeklySummaryAz(s, mom)}</AiNote>
      </div>

      {/* recording summary */}
      <div>
        <SectionLabel>Last recorded lesson</SectionLabel>
        {s.lastRecording?.summary ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><Mic size={13} /> {s.lastRecording.date} · {s.lastRecording.durationMin}m recorded</div>
            <AiNote icon={Sparkles} tone="violet">{s.lastRecording.summary}</AiNote>
          </Card>
        ) : (
          <Card className="p-5 text-sm text-slate-400 flex items-center gap-2"><Brain size={15} className="text-slate-300" /> No recorded session yet — turn on voice recording in a live lesson to get an AI summary here.</Card>
        )}
      </div>
    </div>
  );
}
