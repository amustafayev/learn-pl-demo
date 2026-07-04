import React, { useState } from "react";
import {
  LayoutGrid, BarChart3, Users, BookOpen, Layers, Video, Headphones,
  Shapes, PenTool, ClipboardList, ChevronRight, Plus, Clock, CheckCircle2,
  Circle, Lock, GripVertical, Pencil, Sparkles, ArrowLeft, Brain, AlertTriangle
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from "recharts";

/* ------------------------------- data ------------------------------- */

const COURSES = [
  { id: "it", title: "IT English", level: "B1 → B2", lessons: 8, students: 14, completion: 62, hue: "indigo" },
  { id: "ielts", title: "IELTS Speaking", level: "B2 → C1", lessons: 12, students: 9, completion: 41, hue: "emerald" },
  { id: "every", title: "Everyday English", level: "A2 → B1", lessons: 10, students: 21, completion: 78, hue: "amber" },
];

const LESSONS = {
  it: [
    { n: 1, title: "Introducing yourself on a team", parts: ["passage", "words", "listening", "grammar", "practice"], active: 14, progress: 100 },
    { n: 2, title: "Describing what you work on", parts: ["passage", "words", "video", "grammar", "homework"], active: 14, progress: 88 },
    { n: 3, title: "Talking about a bug in standup", parts: ["passage", "words", "listening", "grammar", "practice", "homework"], active: 13, progress: 64 },
    { n: 4, title: "Tense forms", parts: ["passage", "words", "video", "listening", "grammar", "practice", "homework"], active: 11, progress: 29, current: true },
    { n: 5, title: "Writing clear code-review comments", parts: ["passage", "words", "grammar", "practice"], active: 4, progress: 6, locked: true },
    { n: 6, title: "Explaining a technical decision", parts: ["passage", "words", "video", "grammar", "homework"], active: 0, progress: 0, locked: true },
  ],
  ielts: [], every: [],
};

const PART_TYPES = {
  passage:   { label: "Reading passage", icon: BookOpen,      tone: "text-sky-600 bg-sky-50" },
  words:     { label: "Vocabulary",      icon: Layers,        tone: "text-indigo-600 bg-indigo-50" },
  video:     { label: "Video",           icon: Video,         tone: "text-rose-600 bg-rose-50" },
  listening: { label: "Listening",       icon: Headphones,    tone: "text-violet-600 bg-violet-50" },
  grammar:   { label: "Grammar (visual)",icon: Shapes,        tone: "text-emerald-600 bg-emerald-50" },
  practice:  { label: "Practice grammar",icon: PenTool,       tone: "text-amber-600 bg-amber-50" },
  homework:  { label: "Homework",        icon: ClipboardList, tone: "text-slate-600 bg-slate-100" },
};

// pathway content for the "Tense forms" lesson
const TENSE_LESSON = [
  { type: "passage",   title: "How we talk about time at work", meta: "240 words · B1 · tap-to-translate on" },
  { type: "words",     title: "12 tense & time words",           meta: "deploy · ship · release · by then …" },
  { type: "video",     title: "Past simple vs present perfect",  meta: "3:10 · subtitled" },
  { type: "listening", title: "A real standup recording",        meta: "1:45 · with transcript" },
  { type: "grammar",   title: "Tenses on a timeline",            meta: "Interactive visual block" },
  { type: "practice",  title: "Fill the gaps · 10 items",        meta: "Auto-graded · instant feedback" },
  { type: "homework",  title: "Write 5 sentences about your week",meta: "You review before it's marked done" },
];

const STUDENTS = [
  { name: "Rashad Aliyev",  step: 4, progress: 57, status: "in progress", last: "2h ago" },
  { name: "Nigar Mammadova", step: 6, progress: 92, status: "in progress", last: "20m ago" },
  { name: "Elvin Huseynov", step: 1, progress: 24, status: "in progress", last: "1d ago" },
  { name: "Leyla Qasimova", step: 7, progress: 100, status: "completed", last: "3h ago" },
  { name: "Kamran Safarov", step: -1, progress: 0, status: "not started", last: "—" },
  { name: "Aysel Rahimli",  step: 5, progress: 71, status: "in progress", last: "5h ago" },
];

const ROSTER = [
  { name: "Rashad Aliyev", course: "IT English", level: "B1+", progress: 57, streak: 12 },
  { name: "Nigar Mammadova", course: "IT English", level: "B2", progress: 74, streak: 30 },
  { name: "Elvin Huseynov", course: "IT English", level: "B1", progress: 33, streak: 3 },
  { name: "Leyla Qasimova", course: "IT English", level: "B2", progress: 88, streak: 21 },
  { name: "Kamran Safarov", course: "IT English", level: "A2+", progress: 12, streak: 0 },
  { name: "Aysel Rahimli", course: "IELTS Speaking", level: "B2", progress: 61, streak: 8 },
];

const RADAR = [
  { concept: "Articles", mastery: 42 }, { concept: "Present perfect", mastery: 58 },
  { concept: "Prepositions", mastery: 74 }, { concept: "Phrasal verbs", mastery: 55 },
  { concept: "Word order", mastery: 83 }, { concept: "Tenses", mastery: 68 },
];
const CLASS = [
  { name: "Rashad", cells: [80, 55, 40, 70, 85] }, { name: "Nigar", cells: [60, 75, 65, 50, 90] },
  { name: "Elvin", cells: [45, 40, 55, 60, 70] }, { name: "Leyla", cells: [90, 85, 80, 75, 95] },
];
const CLASS_CONCEPTS = ["Articles", "Perfect", "Prepos.", "Phrasal", "Order"];

/* ------------------------------- helpers ------------------------------- */

const HUE = {
  indigo: "bg-indigo-600", emerald: "bg-emerald-600", amber: "bg-amber-500",
};
const HUE_SOFT = {
  indigo: "bg-indigo-50 text-indigo-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700",
};
function heat(v) {
  if (v >= 80) return "bg-emerald-500 text-white";
  if (v >= 65) return "bg-emerald-300 text-emerald-900";
  if (v >= 50) return "bg-amber-300 text-amber-900";
  return "bg-rose-300 text-rose-900";
}
function statusPill(status) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "in progress") return "bg-indigo-50 text-indigo-700";
  return "bg-slate-100 text-slate-400";
}
function initials(name) { return name.split(" ").map((s) => s[0]).slice(0, 2).join(""); }

/* ------------------------------- shell ------------------------------- */

export default function App() {
  const [tab, setTab] = useState("courses");
  const [courseId, setCourseId] = useState(null);
  const [lessonN, setLessonN] = useState(null);

  const nav = [
    { id: "courses", label: "Courses", icon: LayoutGrid },
    { id: "stats", label: "Statistics", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
  ];

  function goTab(id) { setTab(id); setCourseId(null); setLessonN(null); }

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <aside className="w-16 sm:w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><Sparkles size={18} /></div>
            <div className="hidden sm:block leading-none">
              <div className="font-bold tracking-tight">Lucid</div>
              <div className="text-[11px] text-slate-400 mt-0.5">for teachers</div>
            </div>
          </div>
          <nav className="flex-1 py-3">
            {nav.map((n) => {
              const A = n.icon; const active = tab === n.id;
              return (
                  <button key={n.id} onClick={() => goTab(n.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${active ? "bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}>
                    <A size={18} className="shrink-0" /><span className="hidden sm:block">{n.label}</span>
                  </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">LQ</div>
            <div className="hidden sm:block leading-none">
              <div className="text-sm font-medium">Leyla Q.</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Teacher</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {tab === "courses" && courseId === null && <CoursesView open={(id) => setCourseId(id)} />}
          {tab === "courses" && courseId !== null && lessonN === null && (
              <CourseView courseId={courseId} back={() => setCourseId(null)} openLesson={(n) => setLessonN(n)} />
          )}
          {tab === "courses" && courseId !== null && lessonN !== null && (
              <LessonView courseId={courseId} lessonN={lessonN} back={() => setLessonN(null)} toCourses={() => { setCourseId(null); setLessonN(null); }} />
          )}
          {tab === "stats" && <StatsView />}
          {tab === "students" && <StudentsView />}
        </main>
      </div>
  );
}

/* ------------------------------- pieces ------------------------------- */

function Page({ children }) { return <div className="p-5 sm:p-8 max-w-5xl">{children}</div>; }
function Crumbs({ items }) {
  return (
      <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4 flex-wrap">
        {items.map((it, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} />}
              {it.onClick ? <button onClick={it.onClick} className="hover:text-indigo-600">{it.label}</button> : <span className="text-slate-700 font-medium">{it.label}</span>}
            </React.Fragment>
        ))}
      </div>
  );
}
function Bar({ pct, hue = "indigo" }) {
  return (
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${HUE[hue]}`} style={{ width: `${pct}%` }} />
      </div>
  );
}

/* ------------------------------- COURSES ------------------------------- */

function CoursesView({ open }) {
  return (
      <Page>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">Your courses</div>
            <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          </div>
          <button className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5"><Plus size={16} /> New course</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURSES.map((c) => (
              <button key={c.id} onClick={() => open(c.id)} className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-mono px-2 py-1 rounded-md ${HUE_SOFT[c.hue]}`}>{c.level}</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <div className="text-lg font-bold mb-1">{c.title}</div>
                <div className="text-sm text-slate-400 mb-4">{c.lessons} lessons · {c.students} students</div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1"><span>Avg completion</span><span className="font-mono">{c.completion}%</span></div>
                <Bar pct={c.completion} hue={c.hue} />
              </button>
          ))}
        </div>
      </Page>
  );
}

/* ------------------------------- COURSE ------------------------------- */

function CourseView({ courseId, back, openLesson }) {
  const course = COURSES.find((c) => c.id === courseId);
  const lessons = LESSONS[courseId] || [];
  return (
      <Page>
        <Crumbs items={[{ label: "Courses", onClick: back }, { label: course.title }]} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            <div className="text-slate-400 text-sm mt-1">{course.level} · {course.students} students · {course.lessons} lessons</div>
          </div>
          <button className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5"><Plus size={16} /> New lesson</button>
        </div>

        <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">Lesson pathway</div>
        <div className="relative">
          {lessons.map((l, i) => (
              <div key={l.n} className="relative pl-10 pb-3">
                {/* connector */}
                {i < lessons.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-200" />}
                <div className={`absolute left-0 top-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-semibold ${l.locked ? "bg-slate-100 text-slate-400" : l.progress === 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white"}`}>
                  {l.locked ? <Lock size={13} /> : l.n}
                </div>
                <button disabled={l.locked} onClick={() => !l.locked && openLesson(l.n)}
                        className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${l.locked ? "border-slate-100 opacity-60" : l.current ? "border-indigo-300 ring-1 ring-indigo-100 hover:shadow-sm" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold flex items-center gap-2">
                      Lesson {l.n}: {l.title}
                      {l.current && <span className="text-[11px] font-mono bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">in focus</span>}
                    </div>
                    {!l.locked && <ChevronRight size={16} className="text-slate-300" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    {l.parts.map((p) => {
                      const P = PART_TYPES[p]; const I = P.icon;
                      return <span key={p} title={P.label} className={`w-7 h-7 rounded-md flex items-center justify-center ${P.tone}`}><I size={14} /></span>;
                    })}
                  </div>
                  {!l.locked && (
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span>{l.active} students</span>
                        <span className="flex-1"><Bar pct={l.progress} hue={course.hue} /></span>
                        <span className="font-mono">{l.progress}%</span>
                      </div>
                  )}
                </button>
              </div>
          ))}
        </div>
      </Page>
  );
}

/* ------------------------------- LESSON ------------------------------- */

function LessonView({ courseId, lessonN, back, toCourses }) {
  const course = COURSES.find((c) => c.id === courseId);
  const lesson = (LESSONS[courseId] || []).find((l) => l.n === lessonN);
  const parts = lessonN === 4 ? TENSE_LESSON : lesson.parts.map((t) => ({ type: t, title: PART_TYPES[t].label, meta: "—" }));
  const done = STUDENTS.filter((s) => s.status === "completed").length;
  const started = STUDENTS.filter((s) => s.status !== "not started").length;

  return (
      <Page>
        <Crumbs items={[{ label: "Courses", onClick: toCourses }, { label: course.title, onClick: back }, { label: `Lesson ${lesson.n}` }]} />
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          <button onClick={back} className="text-sm text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</button>
        </div>
        <div className="text-slate-400 text-sm mb-6">{parts.length} parts · {started}/{STUDENTS.length} started · {done} completed</div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* content pathway */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-400">Lesson content · pathway</div>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"><Plus size={13} /> Add part</button>
            </div>
            <div className="relative">
              {parts.map((p, i) => {
                const P = PART_TYPES[p.type]; const I = P.icon;
                return (
                    <div key={i} className="relative pl-10 pb-2.5">
                      {i < parts.length - 1 && <div className="absolute left-4 top-9 bottom-0 w-px bg-slate-200" />}
                      <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-mono text-slate-400">{i + 1}</div>
                      <div className="group bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${P.tone}`}><I size={17} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400">{P.label}</div>
                          <div className="font-medium truncate">{p.title}</div>
                          <div className="text-xs text-slate-400 truncate">{p.meta}</div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          <button className="hover:text-slate-500 p-1"><Pencil size={14} /></button>
                          <GripVertical size={14} className="cursor-grab" />
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
          </div>

          {/* students working on this lesson */}
          <div className="lg:col-span-2">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">Students on this lesson</div>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {STUDENTS.map((s) => (
                  <div key={s.name} className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold shrink-0">{initials(s.name)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="text-xs text-slate-400">
                          {s.step === -1 ? "not started" : s.step >= parts.length ? "finished" : `on ${PART_TYPES[parts[s.step].type].label}`} · {s.last}
                        </div>
                      </div>
                      <span className={`text-[11px] rounded-md px-2 py-0.5 shrink-0 ${statusPill(s.status)}`}>{s.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex-1"><Bar pct={s.progress} /></span>
                      <span className="font-mono text-xs text-slate-400 w-9 text-right">{s.progress}%</span>
                    </div>
                  </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Detailed analytics live in the <b>Statistics</b> tab — kept out of the lesson content on purpose.</p>
          </div>
        </div>
      </Page>
  );
}

/* ------------------------------- STATS ------------------------------- */

function StatsView() {
  return (
      <Page>
        <div className="mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">Class analytics</div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="text-slate-500 mt-1">Separate from your course content — the numbers, not the material.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[["44", "active students", "text-indigo-600"], ["62%", "avg completion", "text-emerald-600"], ["18", "at-risk (idle 5d+)", "text-rose-500"], ["3.1k", "words learned / wk", "text-slate-900"]].map(([v, l, t]) => (
              <div key={l} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className={`font-mono text-3xl font-bold ${t}`}>{v}</div>
                <div className="text-slate-400 text-sm mt-1">{l}</div>
              </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="text-sm font-semibold mb-1">Confusion radar</div>
            <div className="text-xs text-slate-400 mb-2">Class mastery by grammar concept (%)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={RADAR} outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="concept" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Radar dataKey="mastery" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="text-sm font-semibold mb-4">Who struggles with what</div>
            <table className="w-full text-sm">
              <thead>
              <tr className="text-slate-400 text-xs">
                <th className="text-left font-medium pb-2 pr-3">Student</th>
                {CLASS_CONCEPTS.map((c) => <th key={c} className="font-medium pb-2 px-1 text-center">{c}</th>)}
              </tr>
              </thead>
              <tbody>
              {CLASS.map((s) => (
                  <tr key={s.name}>
                    <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                    {s.cells.map((v, i) => (
                        <td key={i} className="px-1 py-1.5"><div className={`h-9 rounded-md flex items-center justify-center font-mono text-xs ${heat(v)}`}>{v}</div></td>
                    ))}
                  </tr>
              ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-start gap-2 bg-violet-50 rounded-lg p-3">
              <Brain size={16} className="text-violet-600 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-900/80">Two students are weak on <b>Articles</b> — expected for Azerbaijani speakers. Worth a group mini-lesson.</p>
            </div>
          </div>
        </div>
      </Page>
  );
}

/* ------------------------------- STUDENTS ------------------------------- */

function StudentsView() {
  return (
      <Page>
        <div className="mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">Everyone you teach</div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-400 text-xs">
            <tr>
              <th className="text-left font-medium p-4">Student</th>
              <th className="text-left font-medium p-4 hidden sm:table-cell">Course</th>
              <th className="text-left font-medium p-4">Level</th>
              <th className="text-left font-medium p-4">Progress</th>
              <th className="text-left font-medium p-4">Streak</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {ROSTER.map((s) => (
                <tr key={s.name} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">{initials(s.name)}</div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 hidden sm:table-cell">{s.course}</td>
                  <td className="p-4 font-mono text-slate-500">{s.level}</td>
                  <td className="p-4 w-40"><div className="flex items-center gap-2"><span className="flex-1"><Bar pct={s.progress} /></span><span className="font-mono text-xs text-slate-400">{s.progress}%</span></div></td>
                  <td className="p-4"><span className="inline-flex items-center gap-1 font-mono text-slate-500">{s.streak > 0 ? `${s.streak}d` : "—"}</span></td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </Page>
  );
}
