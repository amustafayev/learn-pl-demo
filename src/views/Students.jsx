import React, { useState } from "react";
import {
  Send, Download, Flame, Brain, AlertTriangle, Check, X,
  CheckCircle2, Circle, Lock, NotebookPen, Sparkles, ArrowRight, Clock, TrendingUp,
  RotateCcw, Search,
} from "lucide-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  Page, PageHead, Crumbs, Card, Bar, Btn, Pill, Avatar, SectionLabel, AiNote, StatCard,
  Field, inputCls, Modal,
} from "../ui.jsx";
import { useStore, useNav, buildRecapLesson } from "../store.jsx";
import { statusPill } from "../data.jsx";
import { StudentAssignModal } from "../components/StudentAssignModal.jsx";
import { WordStatusPill } from "./grammar.jsx";
import StudentInsights from "./StudentInsights.jsx";

const weakest = (c) => Object.entries(c).sort((a, b) => a[1] - b[1])[0];

/* ------------------------------- roster ------------------------------- */

export function StudentsView() {
  const { state } = useStore();
  const { route, go } = useNav();
  const [q, setQ] = useState("");
  const atRiskOnly = route.filter === "atRisk";
  const list = state.students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) && (!atRiskOnly || s.atRisk));
  const courseName = (id) => state.courses.find((c) => c.id === id)?.title || "—";
  const className = (classId) => state.classes.find((c) => c.id === classId)?.name;
  return (
    <Page>
      <PageHead kicker="Everyone you teach" title="Students"
        right={
          <div className="flex items-center gap-3">
            {atRiskOnly && (
              <button onClick={() => go({ filter: undefined })}
                className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1 font-medium">
                <AlertTriangle size={13} /> Needs attention only <X size={12} />
              </button>
            )}
            <div className="relative hidden sm:block">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${inputCls} pl-9 w-48`} />
            </div>
          </div>
        } />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-400 text-xs">
            <tr>
              <th className="text-left font-medium p-4">Student</th>
              <th className="text-left font-medium p-4 hidden md:table-cell">Course</th>
              <th className="text-left font-medium p-4">Level</th>
              <th className="text-left font-medium p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((s) => (
              <tr key={s.id} onClick={() => go({ studentId: s.id })} className="hover:bg-slate-50 cursor-pointer">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        {s.name}
                        {className(s.classId) && <Pill className="bg-slate-100 text-slate-500">{className(s.classId)}</Pill>}
                        {s.atRisk && <AlertTriangle size={13} className="text-rose-500" />}
                      </div>
                      <div className="text-xs text-slate-400">{s.goal}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-500 hidden md:table-cell">{courseName(s.courseId)}</td>
                <td className="p-4 font-mono text-slate-500">{s.level}</td>
                <td className="p-4"><Pill className={statusPill(s.status)}>{s.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

/* ------------------------------- detail ------------------------------- */

export function StudentDetail() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [tab, setTab] = useState("overview");
  const [assign, setAssign] = useState(false);
  const [pickingClass, setPickingClass] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const s = state.students.find((x) => x.id === route.studentId);
  if (!s) return null;

  const tabs = [["overview", "Overview"], ["words", "Words"], ["activity", "Activity"], ["insights", "AI Insights"], ["notes", "Lesson notes"], ["path", "Learning path"]];
  const cls = state.classes.find((c) => c.id === s.classId);
  const course = state.courses.find((c) => c.id === s.courseId);

  function moveToClass(classId) {
    dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId });
    const target = state.classes.find((c) => c.id === classId);
    toast(`Moved to ${target?.name}`);
    setPickingClass(false);
  }
  function removeFromClass() {
    dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: null });
    toast(`Removed from ${cls?.name}`);
    setConfirmRemove(false);
  }

  return (
    <Page>
      <Crumbs items={[{ label: "Students", onClick: () => go({ studentId: null }) }, { label: s.name }]} />
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={s.name} size={14} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {s.name}
              {cls && <Pill className="bg-slate-100 text-slate-500">{cls.name}</Pill>}
              {s.atRisk && <Pill className="bg-rose-50 text-rose-600"><AlertTriangle size={12} /> needs attention</Pill>}
            </h1>
            <div className="text-slate-400 text-sm mt-0.5">{s.goal} · placed at {s.placement.level} ({s.placement.when})</div>
          </div>
        </div>
        <Btn onClick={() => setAssign(true)}><Send size={15} /> Assign</Btn>
      </div>

      {/* Class + progress strip — a student's only "assignment" is which
          class they're in; lesson access/sequencing follows the class. */}
      <Card className="p-3.5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="sm:w-48 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400">Progress</span>
              <span className="text-xs font-mono text-slate-500">{s.progress}%</span>
            </div>
            <Bar pct={s.progress} />
          </div>
          <div className="hidden sm:block w-px self-stretch bg-slate-100" />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {cls ? (
              <>
                <span className="text-sm text-slate-700"><b>{cls.name}</b>{course ? ` · ${course.title}` : ""}</span>
                <button onClick={() => setConfirmRemove(true)} title="Remove from class" className="text-slate-300 hover:text-rose-500 p-0.5"><X size={13} /></button>
              </>
            ) : <span className="text-xs text-slate-400">Not in a class yet.</span>}
            <button onClick={() => setPickingClass(true)} className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              {cls ? "Change class" : "Assign a class"}
            </button>
          </div>
        </div>
      </Card>

      <Modal open={pickingClass} onClose={() => setPickingClass(false)} title={cls ? "Change class" : "Assign a class"} sub={`Pick a class for ${s.name.split(" ")[0]}`}>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {state.classes.map((c) => {
            const on = c.id === s.classId;
            const courseTitle = state.courses.find((co) => co.id === c.courseId)?.title;
            return (
              <button key={c.id} onClick={() => moveToClass(c.id)} disabled={on}
                className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-slate-400">{courseTitle || "No course assigned"}</div>
                </div>
                {on && <Check size={15} className="text-indigo-600 shrink-0" />}
              </button>
            );
          })}
          {!state.classes.length && <p className="text-sm text-slate-400 p-2">No classes yet — create one in Classes first.</p>}
        </div>
      </Modal>

      <Modal open={confirmRemove} onClose={() => setConfirmRemove(false)}
        title="Remove from this class?"
        sub={cls ? `${s.name} — ${cls.name}` : ""}
        footer={<><Btn variant="outline" onClick={() => setConfirmRemove(false)}>Cancel</Btn><Btn variant="danger" onClick={removeFromClass}><X size={14} /> Remove</Btn></>}>
        <p className="text-sm text-slate-500">They'll lose access to this class's course and lessons. You can re-assign them any time.</p>
      </Modal>

      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`text-sm font-semibold px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>
        ))}
      </div>

      {tab === "overview" && <Overview s={s} />}
      {tab === "words" && <Words s={s} />}
      {tab === "activity" && <Activity s={s} />}
      {tab === "insights" && <StudentInsights s={s} />}
      {tab === "notes" && <Notes s={s} />}
      {tab === "path" && <PathView s={s} />}

      <StudentAssignModal open={assign} onClose={() => setAssign(false)} student={s} />
    </Page>
  );
}

function Overview({ s }) {
  const { state, dispatch, toast } = useStore();
  const [concept, score] = weakest(s.concepts);
  const radar = Object.entries(s.concepts).map(([k, v]) => ({ concept: k.length > 10 ? k.split(" ")[0] : k, mastery: v }));
  const course = state.courses.find((c) => c.id === s.courseId);
  const lessons = state.lessons[s.courseId] || [];
  const recapLessons = (s.extraLessons || []).map((lid) => lessons.find((l) => l.id === lid)).filter(Boolean);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <AiNote icon={Brain} tone="violet" title="Pre-lesson brief">
          <b>{s.name.split(" ")[0]}</b> is stuck on <b>{concept.toLowerCase()}</b> ({score}%), last active {s.last}. Vocab is {s.skills.vocab >= 75 ? "strong" : "developing"} ({s.skills.vocab}%); listening is the weakest skill ({s.skills.listening}%). Spend the hour on {concept.toLowerCase()} with the visual timeline, then a short listening task.
        </AiNote>

        {s.atRisk && <AiNote icon={AlertTriangle} tone="rose" title="Why this student is flagged">{s.riskReason}</AiNote>}

        <div>
          <SectionLabel right={course && (
            <button
              onClick={() => buildRecapLesson(dispatch, toast, s, course, state.blockBank, concept)}
              className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-medium">
              <RotateCcw size={12} /> Build recap lesson from My Blocks
            </button>
          )}>Focus next · 2–3 concrete actions</SectionLabel>
          <Card className="p-4 space-y-2.5">
            {[`Review ${concept.toLowerCase()} with the visual timeline`, `Resurface ${s.words.filter((w) => w.status === "weak").length || 3} weak words in spaced repetition`, "Add one scenario task (work email) to build listening"].map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm"><span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</span>{a}</div>
            ))}
          </Card>
          {recapLessons.length > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Recap lessons built for {s.name.split(" ")[0]}: {recapLessons.map((l) => l.title).join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Skill breakdown</div>
            {Object.entries(s.skills).map(([k, v]) => (
              <div key={k} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1"><span className="capitalize text-slate-500">{k}</span><span className="font-mono text-slate-400">{v}%</span></div>
                <Bar pct={v} />
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <div className="text-sm font-semibold mb-1">Grammar mastery</div>
            <div className="text-xs text-slate-400 mb-1">per concept (%)</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="concept" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <Radar dataKey="mastery" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {s.l1.length > 0 && (
          <div>
            <SectionLabel>L1 interference · Azerbaijani → English ⭐</SectionLabel>
            <Card className="p-4 space-y-3">
              {s.l1.map((x, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Pill className="bg-rose-50 text-rose-700 font-mono shrink-0">×{x.count}</Pill>
                  <div><div className="text-sm font-medium">{x.issue}</div><div className="text-xs text-slate-400">{x.why}</div></div>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 pt-1">Mistakes specific to this learner's native language — the kind global apps can't model.</p>
            </Card>
          </div>
        )}
      </div>

      {/* right rail */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={<span className="inline-flex items-center gap-1"><Flame size={20} className="text-amber-500" />{s.streak}</span>} label="day streak" />
          <StatCard value={s.xp.toLocaleString()} label="XP" tone="text-indigo-600" />
        </div>
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Clock size={15} className="text-indigo-600" /> Time spent</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-indigo-600">{Math.round(s.tracking.rhythm.avgSessionMin * s.tracking.rhythm.sessionsPerWeek)}</span>
            <span className="text-xs text-slate-400">min this week · {s.tracking.rhythm.sessionsPerWeek} session{s.tracking.rhythm.sessionsPerWeek === 1 ? "" : "s"}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">{s.streakFreeze} streak freeze{s.streakFreeze !== 1 ? "s" : ""} available</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold mb-1">Words this week</div>
          <div className="flex items-end gap-2 text-center mt-3">
            {[["new", s.wordFlow.new, "text-sky-600"], ["learning", s.wordFlow.learning, "text-amber-600"], ["known", s.wordFlow.known, "text-emerald-600"]].map(([l, v, t]) => (
              <div key={l} className="flex-1"><div className={`font-mono text-2xl font-bold ${t}`}>{v}</div><div className="text-[11px] text-slate-400">{l}</div></div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Moved to <b>known</b> per week is the north-star signal.</p>
        </Card>
      </div>
    </div>
  );
}

function Words({ s }) {
  const { dispatch, toast } = useStore();
  const cycle = { weak: "medium", medium: "strong", strong: "weak" };
  const weak = s.words.filter((w) => w.status === "weak");
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{s.words.length} saved words · click a status to cycle it · weak words resurface more often.</p>
        <Btn variant="outline" size="sm" onClick={() => toast("Vocabulary exported with definitions (.csv)")}><Download size={14} /> Export</Btn>
      </div>

      {weak.length > 0 && (
        <div className="mb-5">
          <AiNote icon={RotateCcw} tone="amber" title={`${weak.length} weak word${weak.length > 1 ? "s" : ""} due for review`}>
            Sticky words saved a while ago but still weak: {weak.map((w) => <b key={w.term}>{w.term} </b>)}— spaced repetition is bringing them back.
          </AiNote>
        </div>
      )}

      {s.words.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">No saved words yet.</Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {s.words.map((w) => (
            <div key={w.term} className="p-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><b className="text-slate-900">{w.term}</b><span className="text-indigo-600 text-sm">{w.az}</span></div>
                <div className="text-sm text-slate-500">{w.def}</div>
                <div className="text-xs text-slate-400 mt-0.5">from “{w.source}” · saved {w.daysAgo}d ago</div>
              </div>
              <div className="text-right shrink-0">
                <button onClick={() => { dispatch({ type: "SET_WORD_STATUS", studentId: s.id, term: w.term, status: cycle[w.status] }); }} title="Cycle status">
                  <WordStatusPill status={w.status} />
                </button>
                <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1 justify-end"><Clock size={11} />{w.dueInDays === 0 ? "due now" : `in ${w.dueInDays}d`}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Activity({ s }) {
  const icon = { word: "📗", test: "✍️", reading: "📖", lesson: "🎯" };
  return (
    <div className="max-w-2xl">
      <SectionLabel>Recent activity</SectionLabel>
      <div className="relative">
        {s.activity.map((a, i) => (
          <div key={i} className="relative pl-8 pb-4">
            {i < s.activity.length - 1 && <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200" />}
            <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px]">{icon[a.type] || "•"}</div>
            <div className="text-sm text-slate-700">{a.detail}</div>
            <div className="text-xs text-slate-400">{a.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notes({ s }) {
  const { dispatch, toast } = useStore();
  const [form, setForm] = useState(null);
  const blank = { date: "Today", covered: "", newWords: "", mistakes: "", next: "" };
  const [summary, setSummary] = useState("");

  function generate() {
    setSummary(`Bu dərsdə ${form.covered || "yeni mövzu"} üzərində işlədik. Yeni sözlər: ${form.newWords || "—"}. Növbəti dəfə: ${form.next || "təkrar"}. (Draft — edit before saving.)`);
  }
  function save() {
    dispatch({ type: "SAVE_NOTE", studentId: s.id, note: {
      date: form.date, covered: form.covered,
      newWords: form.newWords.split(",").map((x) => x.trim()).filter(Boolean),
      mistakes: form.mistakes.split(",").map((x) => x.trim()).filter(Boolean),
      next: form.next,
    } });
    toast("Note saved — new words dropped into the student's vocab");
    setForm(null); setSummary("");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <SectionLabel right={!form && <Btn size="sm" onClick={() => setForm(blank)}><NotebookPen size={14} /> New note</Btn>}>AI lesson notes · you review before saving</SectionLabel>

        {form && (
          <Card className="p-5 border-indigo-200">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Sparkles size={15} className="text-violet-600" /> Capture the live lesson</div>
            <Field label="What was covered"><input className={inputCls} value={form.covered} onChange={(e) => setForm({ ...form, covered: e.target.value })} placeholder="present perfect vs past simple" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="New words (comma-sep)"><input className={inputCls} value={form.newWords} onChange={(e) => setForm({ ...form, newWords: e.target.value })} placeholder="ship, by then" /></Field>
              <Field label="Mistakes"><input className={inputCls} value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: e.target.value })} placeholder="said 'I finish yesterday'" /></Field>
            </div>
            <Field label="Agreed next steps"><input className={inputCls} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} placeholder="10 gap-fill items on tenses" /></Field>
            {summary && (
              <div className="mb-3"><div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1.5">Student summary (AZ) · editable</div>
                <textarea className={`${inputCls} h-20 resize-none`} value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <Btn variant="outline" size="sm" onClick={() => { setForm(null); setSummary(""); }}>Cancel</Btn>
              <Btn variant="soft" size="sm" onClick={generate}><Sparkles size={13} /> Generate summary</Btn>
              <Btn size="sm" onClick={save}><Check size={13} /> Review & save</Btn>
            </div>
          </Card>
        )}

        {s.notes.length === 0 && !form && <Card className="p-8 text-center text-slate-400 text-sm">No lesson notes yet. Capture one after your next live lesson.</Card>}
        {s.notes.map((n) => (
          <Card key={n.id} className="p-5">
            <div className="flex items-center justify-between mb-2"><div className="font-semibold text-sm">{n.date}</div><Pill className="bg-emerald-50 text-emerald-700"><Check size={11} /> saved</Pill></div>
            <div className="text-sm text-slate-700 mb-2">{n.covered}</div>
            {n.newWords?.length > 0 && <div className="text-xs text-slate-500 mb-1"><b>New words:</b> {n.newWords.join(", ")}</div>}
            {n.mistakes?.length > 0 && <div className="text-xs text-slate-500 mb-1"><b>Mistakes:</b> {n.mistakes.join(", ")}</div>}
            {n.next && <div className="text-xs text-slate-500"><b>Next:</b> {n.next}</div>}
          </Card>
        ))}
      </div>
      <div>
        <AiNote icon={NotebookPen} tone="sky" title="How notes work">
          The app drafts notes from the live lesson; you edit and approve. New words auto-connect to the learner's vocab list, errors to their practice queue. A clean summary goes to the student — in Azerbaijani.
        </AiNote>
        <p className="text-[11px] text-slate-400 mt-3">Speaking stays human-graded — the app never grades speech. Recording needs the learner's consent.</p>
      </div>
    </div>
  );
}

function PathView({ s }) {
  const { state } = useStore();
  const lessons = state.lessons[s.courseId] || [];
  const reached = s.step;
  const checkpoints = lessons.map((l, i) => ({
    n: l.n, title: l.title,
    status: i < reached || s.progress === 100 ? "done" : i === reached ? "current" : "locked",
  }));
  return (
    <div className="max-w-2xl">
      <AiNote icon={TrendingUp} tone="emerald" title="Visible learning path">A progress map with checkpoints — the learner always sees where they are and what's next.</AiNote>
      <div className="relative mt-6">
        {checkpoints.map((c, i) => (
          <div key={c.n} className="relative pl-11 pb-5">
            {i < checkpoints.length - 1 && <div className={`absolute left-4 top-9 bottom-0 w-0.5 ${c.status === "done" ? "bg-emerald-300" : "bg-slate-200"}`} />}
            <div className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center ${
              c.status === "done" ? "bg-emerald-100 text-emerald-600" : c.status === "current" ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-100 text-slate-400"}`}>
              {c.status === "done" ? <CheckCircle2 size={18} /> : c.status === "current" ? <Circle size={16} /> : <Lock size={14} />}
            </div>
            <div className={`rounded-xl border p-4 ${c.status === "current" ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"}`}>
              <div className="text-xs font-mono text-slate-400">Checkpoint {c.n}</div>
              <div className="font-medium">{c.title}</div>
              {c.status === "current" && <div className="text-xs text-indigo-600 mt-1 flex items-center gap-1"><ArrowRight size={12} /> {s.progress}% through this lesson</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
