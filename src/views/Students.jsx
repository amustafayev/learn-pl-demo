import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  IconSend, IconDownload, IconFlame, IconBrain, IconAlertTriangle, IconCheck, IconX,
  IconCircleCheck, IconCircle, IconLock, IconNotebook, IconSparkles, IconArrowRight, IconClock, IconTrendingUp,
  IconRefresh, IconSearch,
} from "@tabler/icons-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  Page, Breadcrumbs, PageHeader, SectionLabel, ProgressBar, Card, Button, Tag, Avatar, Alert, StatCard,
  Field, TextField, TextArea, Modal,
} from "../design-system.jsx";
import { useStore, useNav, buildRecapLesson } from "../store.jsx";
import { statusPill } from "../data.jsx";
import { StudentAssignModal } from "../components/StudentAssignModal.jsx";
import { WordStatusPill } from "./grammar.jsx";
import StudentInsights from "./StudentInsights.jsx";

const weakest = (c) => Object.entries(c).sort((a, b) => a[1] - b[1])[0];

/* ------------------------------- roster ------------------------------- */

// Roster card follows the kit's "Student" list widget (course detail sheet):
// title + count pill + a plain avatar/name/status list, not a data table.
const presence = (last) => (/^\d+m ago$/.test(last) ? "online" : "offline");

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
      <PageHeader kicker="Everyone you teach" title="Students"
        right={
          <div className="flex items-center gap-3">
            {atRiskOnly && (
              <button onClick={() => go({ filter: undefined })}
                className="text-xs bg-warning-50 text-warning-600 hover:bg-warning-100 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1 font-medium">
                <IconAlertTriangle size={13} stroke={1.75} /> Needs attention only <IconX size={12} stroke={1.75} />
              </button>
            )}
            <div className="relative hidden sm:block">
              <IconSearch size={15} stroke={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <TextField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9 w-48 !h-10" />
            </div>
          </div>
        } />
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-neutral-200">
          <span className="font-semibold text-neutral-950">Student</span>
          <span className="rounded-full bg-neutral-200 text-neutral-600 px-1.5 py-0.5 text-[11px] font-bold">{list.length}</span>
        </div>
        <div className="divide-y divide-neutral-200">
          {list.map((s) => (
            <div key={s.id} onClick={() => go({ studentId: s.id })}
              className="flex items-center gap-3 p-4 hover:bg-neutral-50 cursor-pointer">
              <Avatar name={s.name} status={presence(s.last)} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-neutral-950 flex items-center gap-1.5 truncate">
                  {s.name}
                  {className(s.classId) && <Tag color="neutral">{className(s.classId)}</Tag>}
                  {s.atRisk && <IconAlertTriangle size={13} stroke={1.75} className="text-warning-500 shrink-0" />}
                </div>
                <div className="text-xs text-neutral-500 truncate">{courseName(s.courseId)} · {s.goal}</div>
              </div>
              <span className="font-mono text-xs text-neutral-500 hidden sm:inline shrink-0">{s.level}</span>
              <Tag color={statusPill(s.status)}>{s.status}</Tag>
            </div>
          ))}
          {!list.length && <p className="text-sm text-neutral-500 p-8 text-center">No students match.</p>}
        </div>
      </Card>
    </Page>
  );
}

/* ------------------------------- detail ------------------------------- */

// The tab strip is real page-internal navigation (/students/:id/:section),
// managed with router hooks directly rather than the shared useNav() shim —
// same "decoupled sub-navigation" pattern as Library's own routes.
export function StudentDetail() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const { section = "overview" } = useParams();
  const navigate = useNavigate();
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
      <Breadcrumbs items={[{ label: "Students", onClick: () => go({ studentId: null }) }, { label: s.name }]} />
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={s.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 flex items-center gap-2">
              {s.name}
              {cls && <Tag color="neutral">{cls.name}</Tag>}
              {s.atRisk && <Tag color="warning"><IconAlertTriangle size={12} stroke={1.75} /> needs attention</Tag>}
            </h1>
            <div className="text-neutral-500 text-sm mt-0.5">{s.goal} · placed at {s.placement.level} ({s.placement.when})</div>
          </div>
        </div>
        <Button variant="primary" onClick={() => setAssign(true)}><IconSend size={15} stroke={1.75} /> Assign</Button>
      </div>

      {/* Class + progress strip — a student's only "assignment" is which
          class they're in; lesson access/sequencing follows the class. */}
      <Card className="p-3.5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="sm:w-48 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Progress</span>
              <span className="text-xs font-mono text-neutral-600">{s.progress}%</span>
            </div>
            <ProgressBar pct={s.progress} />
          </div>
          <div className="hidden sm:block w-px self-stretch bg-neutral-200" />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {cls ? (
              <>
                <span className="text-sm text-neutral-700"><b className="text-neutral-950">{cls.name}</b>{course ? ` · ${course.title}` : ""}</span>
                <button onClick={() => setConfirmRemove(true)} title="Remove from class" className="text-neutral-400 hover:text-warning-500 p-0.5"><IconX size={13} stroke={1.75} /></button>
              </>
            ) : <span className="text-xs text-neutral-500">Not in a class yet.</span>}
            <button onClick={() => setPickingClass(true)} className="ml-auto text-xs font-semibold text-primary-600 hover:text-primary-700">
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
                className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-primary-300 bg-primary-50" : "border-neutral-200 hover:border-neutral-300"}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate text-neutral-950">{c.name}</div>
                  <div className="text-xs text-neutral-500">{courseTitle || "No course assigned"}</div>
                </div>
                {on && <IconCheck size={15} stroke={1.75} className="text-primary-600 shrink-0" />}
              </button>
            );
          })}
          {!state.classes.length && <p className="text-sm text-neutral-500 p-2">No classes yet — create one in Classes first.</p>}
        </div>
      </Modal>

      <Modal open={confirmRemove} onClose={() => setConfirmRemove(false)}
        title="Remove from this class?"
        sub={cls ? `${s.name} — ${cls.name}` : ""}
        footer={<><Button variant="outline" onClick={() => setConfirmRemove(false)}>Cancel</Button><Button variant="primary" className="!bg-warning-600 hover:!bg-warning-700" onClick={removeFromClass}><IconX size={14} stroke={1.75} /> Remove</Button></>}>
        <p className="text-sm text-neutral-600">They'll lose access to this class's course and lessons. You can re-assign them any time.</p>
      </Modal>

      <div className="flex gap-1 mb-6 border-b border-neutral-200 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => navigate(`/students/${s.id}/${id}`)}
            className={`text-sm font-semibold px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors ${section === id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>{label}</button>
        ))}
      </div>

      {section === "overview" && <Overview s={s} />}
      {section === "words" && <Words s={s} />}
      {section === "activity" && <Activity s={s} />}
      {section === "insights" && <StudentInsights s={s} />}
      {section === "notes" && <Notes s={s} />}
      {section === "path" && <PathView s={s} />}

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
        <Alert icon={IconBrain} tone="primary" title="Pre-lesson brief">
          <b>{s.name.split(" ")[0]}</b> is stuck on <b>{concept.toLowerCase()}</b> ({score}%), last active {s.last}. Vocab is {s.skills.vocab >= 75 ? "strong" : "developing"} ({s.skills.vocab}%); listening is the weakest skill ({s.skills.listening}%). Spend the hour on {concept.toLowerCase()} with the visual timeline, then a short listening task.
        </Alert>

        {s.atRisk && <Alert icon={IconAlertTriangle} tone="warning" title="Why this student is flagged">{s.riskReason}</Alert>}

        <div>
          <SectionLabel right={course && (
            <button
              onClick={() => buildRecapLesson(dispatch, toast, s, course, state.blockBank, concept)}
              className="text-xs text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 font-medium">
              <IconRefresh size={12} stroke={1.75} /> Build recap lesson from My Blocks
            </button>
          )}>Focus next · 2–3 concrete actions</SectionLabel>
          <Card className="p-4 space-y-2.5">
            {[`Review ${concept.toLowerCase()} with the visual timeline`, `Resurface ${s.words.filter((w) => w.status === "weak").length || 3} weak words in spaced repetition`, "Add one scenario task (work email) to build listening"].map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-neutral-800"><span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</span>{a}</div>
            ))}
          </Card>
          {recapLessons.length > 0 && (
            <p className="text-xs text-neutral-500 mt-2">
              Recap lessons built for {s.name.split(" ")[0]}: {recapLessons.map((l) => l.title).join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3 text-neutral-950">Skill breakdown</div>
            {Object.entries(s.skills).map(([k, v]) => (
              <div key={k} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1"><span className="capitalize text-neutral-600">{k}</span><span className="font-mono text-neutral-500">{v}%</span></div>
                <ProgressBar pct={v} />
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <div className="text-sm font-semibold mb-1 text-neutral-950">Grammar mastery</div>
            <div className="text-xs text-neutral-500 mb-1">per concept (%)</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="#e5e5e5" />
                  <PolarAngleAxis dataKey="concept" tick={{ fontSize: 9, fill: "#8c8c8c" }} />
                  <Radar dataKey="mastery" stroke="#ff5c20" fill="#ff5c20" fillOpacity={0.35} />
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
                  <Tag color="warning">×{x.count}</Tag>
                  <div><div className="text-sm font-medium text-neutral-900">{x.issue}</div><div className="text-xs text-neutral-500">{x.why}</div></div>
                </div>
              ))}
              <p className="text-[11px] text-neutral-500 pt-1">Mistakes specific to this learner's native language — the kind global apps can't model.</p>
            </Card>
          </div>
        )}
      </div>

      {/* right rail */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={IconFlame} value={s.streak} label="day streak" />
          <StatCard value={s.xp.toLocaleString()} label="XP" />
        </div>
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-neutral-950"><IconClock size={15} stroke={1.75} className="text-primary-600" /> Time spent</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-primary-600">{Math.round(s.tracking.rhythm.avgSessionMin * s.tracking.rhythm.sessionsPerWeek)}</span>
            <span className="text-xs text-neutral-500">min this week · {s.tracking.rhythm.sessionsPerWeek} session{s.tracking.rhythm.sessionsPerWeek === 1 ? "" : "s"}</span>
          </div>
          <div className="text-xs text-neutral-500 mt-2">{s.streakFreeze} streak freeze{s.streakFreeze !== 1 ? "s" : ""} available</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold mb-1 text-neutral-950">Words this week</div>
          <div className="flex items-end gap-2 text-center mt-3">
            {[["new", s.wordFlow.new, "text-info-600"], ["learning", s.wordFlow.learning, "text-pending-600"], ["known", s.wordFlow.known, "text-success-600"]].map(([l, v, t]) => (
              <div key={l} className="flex-1"><div className={`font-mono text-2xl font-bold ${t}`}>{v}</div><div className="text-[11px] text-neutral-500">{l}</div></div>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500 mt-3">Moved to <b>known</b> per week is the north-star signal.</p>
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
        <p className="text-sm text-neutral-600">{s.words.length} saved words · click a status to cycle it · weak words resurface more often.</p>
        <Button variant="outline" size="sm" onClick={() => toast("Vocabulary exported with definitions (.csv)")}><IconDownload size={14} stroke={1.75} /> Export</Button>
      </div>

      {weak.length > 0 && (
        <div className="mb-5">
          <Alert icon={IconRefresh} tone="pending" title={`${weak.length} weak word${weak.length > 1 ? "s" : ""} due for review`}>
            Sticky words saved a while ago but still weak: {weak.map((w) => <b key={w.term}>{w.term} </b>)}— spaced repetition is bringing them back.
          </Alert>
        </div>
      )}

      {s.words.length === 0 ? (
        <Card className="p-8 text-center text-neutral-500 text-sm">No saved words yet.</Card>
      ) : (
        <Card className="divide-y divide-neutral-200">
          {s.words.map((w) => (
            <div key={w.term} className="p-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><b className="text-neutral-950">{w.term}</b><span className="text-primary-600 text-sm">{w.az}</span></div>
                <div className="text-sm text-neutral-600">{w.def}</div>
                <div className="text-xs text-neutral-500 mt-0.5">from “{w.source}” · saved {w.daysAgo}d ago</div>
              </div>
              <div className="text-right shrink-0">
                <button onClick={() => { dispatch({ type: "SET_WORD_STATUS", studentId: s.id, term: w.term, status: cycle[w.status] }); }} title="Cycle status">
                  <WordStatusPill status={w.status} />
                </button>
                <div className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1 justify-end"><IconClock size={11} stroke={1.75} />{w.dueInDays === 0 ? "due now" : `in ${w.dueInDays}d`}</div>
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
            {i < s.activity.length - 1 && <div className="absolute left-2.5 top-6 bottom-0 w-px bg-neutral-200" />}
            <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-[10px]">{icon[a.type] || "•"}</div>
            <div className="text-sm text-neutral-700">{a.detail}</div>
            <div className="text-xs text-neutral-500">{a.when}</div>
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
        <SectionLabel right={!form && <Button variant="primary" size="sm" onClick={() => setForm(blank)}><IconNotebook size={14} stroke={1.75} /> New note</Button>}>AI lesson notes · you review before saving</SectionLabel>

        {form && (
          <Card className="p-5 border-primary-200">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-neutral-950"><IconSparkles size={15} stroke={1.75} className="text-primary-600" /> Capture the live lesson</div>
            <Field label="What was covered"><TextField value={form.covered} onChange={(e) => setForm({ ...form, covered: e.target.value })} placeholder="present perfect vs past simple" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="New words (comma-sep)"><TextField value={form.newWords} onChange={(e) => setForm({ ...form, newWords: e.target.value })} placeholder="ship, by then" /></Field>
              <Field label="Mistakes"><TextField value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: e.target.value })} placeholder="said 'I finish yesterday'" /></Field>
            </div>
            <Field label="Agreed next steps"><TextField value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} placeholder="10 gap-fill items on tenses" /></Field>
            {summary && (
              <div className="mb-3"><div className="text-xs font-semibold text-neutral-600 mb-1.5">Student summary (AZ) · editable</div>
                <TextArea className="!min-h-[80px]" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <Button variant="outline" size="sm" onClick={() => { setForm(null); setSummary(""); }}>Cancel</Button>
              <Button variant="light" size="sm" onClick={generate}><IconSparkles size={13} stroke={1.75} /> Generate summary</Button>
              <Button variant="primary" size="sm" onClick={save}><IconCheck size={13} stroke={1.75} /> Review & save</Button>
            </div>
          </Card>
        )}

        {s.notes.length === 0 && !form && <Card className="p-8 text-center text-neutral-500 text-sm">No lesson notes yet. Capture one after your next live lesson.</Card>}
        {s.notes.map((n) => (
          <Card key={n.id} className="p-5">
            <div className="flex items-center justify-between mb-2"><div className="font-semibold text-sm text-neutral-950">{n.date}</div><Tag color="success"><IconCheck size={11} stroke={1.75} /> saved</Tag></div>
            <div className="text-sm text-neutral-700 mb-2">{n.covered}</div>
            {n.newWords?.length > 0 && <div className="text-xs text-neutral-600 mb-1"><b>New words:</b> {n.newWords.join(", ")}</div>}
            {n.mistakes?.length > 0 && <div className="text-xs text-neutral-600 mb-1"><b>Mistakes:</b> {n.mistakes.join(", ")}</div>}
            {n.next && <div className="text-xs text-neutral-600"><b>Next:</b> {n.next}</div>}
          </Card>
        ))}
      </div>
      <div>
        <Alert icon={IconNotebook} tone="info" title="How notes work">
          The app drafts notes from the live lesson; you edit and approve. New words auto-connect to the learner's vocab list, errors to their practice queue. A clean summary goes to the student — in Azerbaijani.
        </Alert>
        <p className="text-[11px] text-neutral-500 mt-3">Speaking stays human-graded — the app never grades speech. Recording needs the learner's consent.</p>
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
      <Alert icon={IconTrendingUp} tone="success" title="Visible learning path">A progress map with checkpoints — the learner always sees where they are and what's next.</Alert>
      <div className="relative mt-6">
        {checkpoints.map((c, i) => (
          <div key={c.n} className="relative pl-11 pb-5">
            {i < checkpoints.length - 1 && <div className={`absolute left-4 top-9 bottom-0 w-0.5 ${c.status === "done" ? "bg-success-300" : "bg-neutral-200"}`} />}
            <div className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center ${
              c.status === "done" ? "bg-success-100 text-success-600" : c.status === "current" ? "bg-primary-500 text-white ring-4 ring-primary-100" : "bg-neutral-100 text-neutral-400"}`}>
              {c.status === "done" ? <IconCircleCheck size={18} stroke={1.75} /> : c.status === "current" ? <IconCircle size={16} stroke={1.75} /> : <IconLock size={14} stroke={1.75} />}
            </div>
            <div className={`rounded-xl border p-4 ${c.status === "current" ? "border-primary-300 bg-primary-50" : "border-neutral-200"}`}>
              <div className="text-xs font-mono text-neutral-500">Checkpoint {c.n}</div>
              <div className="font-medium text-neutral-900">{c.title}</div>
              {c.status === "current" && <div className="text-xs text-primary-600 mt-1 flex items-center gap-1"><IconArrowRight size={12} stroke={1.75} /> {s.progress}% through this lesson</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
