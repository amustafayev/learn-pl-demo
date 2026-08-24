import React, { useState } from "react";
import {
  Plus, ChevronRight, Lock, CheckCircle2, Circle, Radio, UserPlus, X, Users,
} from "lucide-react";
import { Page, PageHead, Crumbs, Card, Bar, Btn, SectionLabel, Avatar, Modal } from "../ui.jsx";
import { useStore, useNav, lessonBlocks } from "../store.jsx";
import { DAY_LABELS, scheduleLabel } from "../data.jsx";

/* =========================================================================
   Classes — the top-level, durable thing: a roster of students on a
   schedule. A Course gets assigned to a class (not the other way around);
   a class can switch courses over time, or have none yet. Lesson
   sequencing lives here too: `class.currentLessonId` is which lesson of
   the assigned course the whole class is on right now — students don't
   get individually assigned/unassigned to lessons, they're wherever their
   class is. Courses.jsx stays pure content authoring; this file owns
   roster, enrollment, and progress.
   ========================================================================= */

export function ClassesView() {
  const { state, dispatch, toast } = useStore();
  const { go } = useNav();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState([]);
  const [courseId, setCourseId] = useState("");

  const toggleDay = (i) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  function createClass() {
    if (!name.trim()) return toast("Give the class a name", "err");
    dispatch({ type: "ADD_CLASS", name: name.trim(), scheduleDays: days, courseId: courseId || null });
    toast(`“${name.trim()}” class created`);
    setName(""); setDays([]); setCourseId(""); setCreating(false);
  }

  return (
    <Page>
      <PageHead kicker="Rosters, schedule & progress" title="Classes"
        sub="A Class is the durable thing — students belong to a class, and a class studies a course"
        right={<Btn onClick={() => setCreating((v) => !v)}><Plus size={16} /> New class</Btn>} />

      {creating && (
        <Card className="p-4 mb-6 border-indigo-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-xs font-mono uppercase tracking-wide text-slate-400">Class name</span>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ITler — Morning"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
            </label>
            <label className="block">
              <span className="text-xs font-mono uppercase tracking-wide text-slate-400">Course (optional — pick later)</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300">
                <option value="">No course yet</option>
                {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
          </div>
          <div className="mb-3">
            <span className="text-xs font-mono uppercase tracking-wide text-slate-400">Meets on</span>
            <div className="flex gap-1.5 mt-1.5">
              {DAY_LABELS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold border ${days.includes(i) ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn size="sm" onClick={createClass}>Create class</Btn>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.classes.map((cls) => {
          const roster = state.students.filter((s) => s.classId === cls.id);
          const course = state.courses.find((c) => c.id === cls.courseId);
          const lessons = state.lessons[cls.courseId] || [];
          const current = lessons.find((l) => l.id === cls.currentLessonId);
          return (
            <button key={cls.id} onClick={() => go({ tab: "classes", classId: cls.id })}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-500">{scheduleLabel(cls.scheduleDays)}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
              <div className="text-lg font-bold mb-1">{cls.name}</div>
              <div className="text-sm text-slate-500 mb-1">{course ? course.title : "No course assigned"}</div>
              <div className="text-[11px] text-slate-400 mb-4">{current ? `Current: ${current.title}` : course ? "Not started yet" : "—"}</div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2 overflow-hidden">
                  {roster.slice(0, 5).map((s) => <Avatar key={s.id} name={s.name} size={6} />)}
                </div>
                <span className="text-xs text-slate-400 font-mono ml-1">
                  {roster.length ? `${roster.length}${roster.length > 5 ? "+" : ""} student${roster.length === 1 ? "" : "s"}` : "No students yet"}
                </span>
              </div>
            </button>
          );
        })}
        {!state.classes.length && !creating && (
          <Card className="p-8 text-center text-sm text-slate-400 sm:col-span-2 lg:col-span-3">
            No classes yet — create one to enroll students and assign a course.
          </Card>
        )}
      </div>
    </Page>
  );
}

export function ClassDetailView() {
  const { state, dispatch, toast } = useStore();
  const { route, go, startLive } = useNav();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // student pending removal

  const cls = state.classes.find((c) => c.id === route.classId);
  if (!cls) return null;

  const course = state.courses.find((c) => c.id === cls.courseId);
  const roster = state.students.filter((s) => s.classId === cls.id);
  const others = state.students.filter((s) => s.classId !== cls.id);
  const lessons = state.lessons[cls.courseId] || [];
  const currentIndex = lessons.findIndex((l) => l.id === cls.currentLessonId);

  function removeStudent(s) {
    dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: null });
    toast(`${s.name.split(" ")[0]} removed from ${cls.name}`);
    setConfirmRemove(null);
  }

  return (
    <Page>
      <Crumbs items={[{ label: "Classes", onClick: () => go({ classId: null }) }, { label: cls.name }]} />
      <PageHead title={cls.name}
        sub={`${scheduleLabel(cls.scheduleDays)} · ${roster.length} student${roster.length === 1 ? "" : "s"}${course ? ` · ${course.title}` : " · no course assigned"}`}
        right={<Btn variant="outline" size="sm" onClick={() => setEnrollOpen((v) => !v)}><UserPlus size={14} /> Enroll student</Btn>} />

      <div className="mb-6">
        <SectionLabel>Course</SectionLabel>
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">{course ? <><b>{course.title}</b> · {course.level}</> : "No course assigned yet"}</div>
          <select value={cls.courseId || ""} onChange={(e) => dispatch({ type: "SET_CLASS_COURSE", classId: cls.id, courseId: e.target.value || null })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300">
            <option value="">No course</option>
            {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Card>
      </div>

      <div className="mb-6">
        <SectionLabel>Roster</SectionLabel>
        {enrollOpen && (
          <Card className="p-4 mb-3 border-indigo-200 bg-indigo-50/30">
            <div className="text-xs font-mono uppercase tracking-wide text-slate-500 mb-3 font-semibold">Pick a student to enroll in {cls.name}</div>
            {others.length ? (
              <div className="flex flex-wrap gap-2">
                {others.map((s) => (
                  <button key={s.id}
                    onClick={() => { dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: cls.id }); toast(`${s.name.split(" ")[0]} enrolled in ${cls.name}`); setEnrollOpen(false); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 p-2 text-sm shadow-sm transition-all">
                    <Avatar name={s.name} size={6} />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{s.level}</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Every student is already enrolled in this class.</p>}
          </Card>
        )}
        <Card className="divide-y divide-slate-100">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3.5">
              <button onClick={() => go({ tab: "students", studentId: s.id })} className="flex items-center gap-3 min-w-0 flex-1 text-left hover:bg-slate-50 -m-1 p-1 rounded-lg transition-colors">
                <Avatar name={s.name} size={8} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.level} · {s.status}</div>
                </div>
              </button>
              <div className="w-24 shrink-0 hidden sm:block"><Bar pct={s.progress} /></div>
              <span className="text-xs font-mono text-slate-400 w-10 text-right shrink-0">{s.progress}%</span>
              <button title="Remove from class" onClick={() => setConfirmRemove(s)} className="text-slate-300 hover:text-rose-500 p-1 shrink-0"><X size={14} /></button>
            </div>
          ))}
          {!roster.length && <p className="p-4 text-sm text-slate-400">No students enrolled yet — use "Enroll student" above.</p>}
        </Card>
      </div>

      {course ? (
        <div>
          <SectionLabel>Lesson progress · {course.title}</SectionLabel>
          <div className="space-y-2">
            {lessons.map((l, i) => {
              const status = currentIndex < 0 ? "upcoming" : i < currentIndex ? "done" : i === currentIndex ? "current" : "locked";
              return (
                <Card key={l.id} className={`p-4 flex items-center gap-3 ${status === "current" ? "border-indigo-300 ring-2 ring-indigo-100" : ""}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    status === "done" ? "bg-emerald-100 text-emerald-600" : status === "current" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {status === "done" ? <CheckCircle2 size={16} /> : status === "locked" ? <Lock size={13} /> : <Circle size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">L{l.n}: {l.title}</div>
                    <div className="text-xs text-slate-400">{lessonBlocks(l).length} steps</div>
                  </div>
                  {status !== "current" && (
                    <button onClick={() => { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId: cls.id, lessonId: l.id }); toast(`${cls.name} is now on Lesson ${l.n}`); }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0">Set as current</button>
                  )}
                  <button onClick={() => go({ tab: "courses", courseId: course.id, lessonId: l.id })} className="text-xs text-slate-400 hover:text-indigo-600 shrink-0">Edit content</button>
                  <Btn variant="outline" size="sm" onClick={() => startLive({ courseId: course.id, classId: cls.id, lessonId: l.id })} className="!text-rose-600 !border-rose-200 shrink-0">
                    <Radio size={12} /> Go live
                  </Btn>
                </Card>
              );
            })}
            {!lessons.length && <p className="text-sm text-slate-400">{course.title} has no lessons yet — build them in Courses.</p>}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
          <Users size={20} className="text-slate-300" />
          Assign a course above to start tracking lessons for this class.
        </Card>
      )}

      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)}
        title="Remove from this class?"
        sub={confirmRemove ? `${confirmRemove.name} — ${cls.name}` : ""}
        footer={<><Btn variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Btn><Btn variant="danger" onClick={() => removeStudent(confirmRemove)}><X size={14} /> Remove</Btn></>}>
        <p className="text-sm text-slate-500">They'll lose access to this class's course and lessons. You can re-enroll them (here or in a different class) any time.</p>
      </Modal>
    </Page>
  );
}
