import React from "react";
import {
  BookOpen, Headphones, Lightbulb, LogOut,
  Sparkles, Brain, Mic, Hourglass, CalendarClock, ArrowLeftRight,
} from "lucide-react";
import { Card, Pill, AiNote, SectionLabel } from "../ui.jsx";
import { useStore } from "../store.jsx";

/* =========================================================================
   Per-student AI Insights — the raw + derived tracking signals for ONE
   learner, straight from the doc's "AI Tracking — Advanced" list: dwell
   time per content type, hesitation/retries, reading pace, listening
   replays, hint usage, abandonment, session rhythm, and a recording-derived
   summary. A couple of signals (cross-skill correlation) are computed here
   rather than authored, in the same spirit as the class-wide AI Insights tab.
   ========================================================================= */

const METHODS = [
  "Dwell time per section", "Hesitation & retries", "Reading pace", "Listening replays",
  "Hint usage", "Session rhythm", "Abandonment point", "Recording summarization",
];

const TYPE_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing" };
const TYPE_COLOR = { grammar: "bg-emerald-500", vocabulary: "bg-indigo-500", reading: "bg-sky-500", listening: "bg-violet-500", speaking: "bg-teal-500", writing: "bg-rose-500" };

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

export default function StudentInsights({ s }) {
  const { toast } = useStore();
  const t = s.tracking || {};
  const dwell = t.dwellByType || {};
  const totalDwell = Object.values(dwell).reduce((a, b) => a + b, 0) || 1;
  const gap = crossSkillGap(s.skills);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {METHODS.map((m) => <Pill key={m} className="bg-slate-100 text-slate-500">{m}</Pill>)}
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

      {/* stuck points */}
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
