import React, { useState } from "react";
import {
  IconPlus, IconChevronRight, IconLock, IconCircleCheck, IconCircle, IconBroadcast, IconUserPlus, IconX, IconUsers,
} from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, SectionLabel, ProgressBar, Card, Button, Tag, Avatar, Modal, Field, TextField, Select } from "../design-system.jsx";
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
      <PageHeader kicker="Rosters, schedule & progress" title="Classes"
        sub="A Class is the durable thing — students belong to a class, and a class studies a course"
        right={<Button variant="primary" onClick={() => setCreating((v) => !v)}><IconPlus size={16} stroke={1.75} /> New class</Button>} />

      {creating && (
        <Card className="p-4 mb-6 border-primary-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Class name">
              <TextField autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ITler — Morning" />
            </Field>
            <Field label="Course (optional — pick later)">
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">No course yet</option>
                {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mb-3">
            <span className="text-xs font-semibold text-neutral-600">Meets on</span>
            <div className="flex gap-1.5 mt-1.5">
              {DAY_LABELS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-colors ${days.includes(i) ? "border-primary-400 bg-primary-50 text-primary-700" : "border-neutral-300 text-neutral-600"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={createClass}>Create class</Button>
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
              className="text-left bg-white rounded-2xl border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all p-5">
              <div className="flex items-center justify-between mb-4">
                <Tag color="neutral">{scheduleLabel(cls.scheduleDays)}</Tag>
                <IconChevronRight size={16} stroke={1.75} className="text-neutral-300" />
              </div>
              <div className="text-lg font-bold mb-1 text-neutral-950">{cls.name}</div>
              <div className="text-sm text-neutral-600 mb-1">{course ? course.title : "No course assigned"}</div>
              <div className="text-[11px] text-neutral-500 mb-4">{current ? `Current: ${current.title}` : course ? "Not started yet" : "—"}</div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2 overflow-hidden">
                  {roster.slice(0, 5).map((s) => <Avatar key={s.id} name={s.name} size="xs" />)}
                </div>
                <span className="text-xs text-neutral-500 font-mono ml-1">
                  {roster.length ? `${roster.length}${roster.length > 5 ? "+" : ""} student${roster.length === 1 ? "" : "s"}` : "No students yet"}
                </span>
              </div>
            </button>
          );
        })}
        {!state.classes.length && !creating && (
          <Card className="p-8 text-center text-sm text-neutral-500 sm:col-span-2 lg:col-span-3">
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
      <Breadcrumbs items={[{ label: "Classes", onClick: () => go({ classId: null }) }, { label: cls.name }]} />
      <PageHeader title={cls.name}
        sub={`${scheduleLabel(cls.scheduleDays)} · ${roster.length} student${roster.length === 1 ? "" : "s"}${course ? ` · ${course.title}` : " · no course assigned"}`}
        right={<Button variant="outline" size="sm" onClick={() => setEnrollOpen((v) => !v)}><IconUserPlus size={14} stroke={1.75} /> Enroll student</Button>} />

      <div className="mb-6">
        <SectionLabel>Course</SectionLabel>
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="text-sm text-neutral-700">{course ? <><b className="text-neutral-950">{course.title}</b> · {course.level}</> : "No course assigned yet"}</div>
          <Select className="!w-auto" value={cls.courseId || ""} onChange={(e) => dispatch({ type: "SET_CLASS_COURSE", classId: cls.id, courseId: e.target.value || null })}>
            <option value="">No course</option>
            {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </Card>
      </div>

      <div className="mb-6">
        <SectionLabel>Roster</SectionLabel>
        {enrollOpen && (
          <Card className="p-4 mb-3 border-primary-200 bg-primary-50/30">
            <div className="text-xs font-semibold text-neutral-600 mb-3">Pick a student to enroll in {cls.name}</div>
            {others.length ? (
              <div className="flex flex-wrap gap-2">
                {others.map((s) => (
                  <button key={s.id}
                    onClick={() => { dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: cls.id }); toast(`${s.name.split(" ")[0]} enrolled in ${cls.name}`); setEnrollOpen(false); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-neutral-200 hover:border-primary-400 p-2 text-sm shadow-sm transition-all">
                    <Avatar name={s.name} size="xs" />
                    <span className="font-medium text-neutral-900">{s.name}</span>
                    <Tag color="neutral">{s.level}</Tag>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-neutral-500">Every student is already enrolled in this class.</p>}
          </Card>
        )}
        <Card className="divide-y divide-neutral-200">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3.5">
              <button onClick={() => go({ tab: "students", studentId: s.id })} className="flex items-center gap-3 min-w-0 flex-1 text-left hover:bg-neutral-50 -m-1 p-1 rounded-lg transition-colors">
                <Avatar name={s.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate text-neutral-950">{s.name}</div>
                  <div className="text-xs text-neutral-500">{s.level} · {s.status}</div>
                </div>
              </button>
              <div className="w-24 shrink-0 hidden sm:block"><ProgressBar pct={s.progress} /></div>
              <span className="text-xs font-mono text-neutral-500 w-10 text-right shrink-0">{s.progress}%</span>
              <button title="Remove from class" onClick={() => setConfirmRemove(s)} className="text-neutral-400 hover:text-warning-600 p-1 shrink-0"><IconX size={14} stroke={1.75} /></button>
            </div>
          ))}
          {!roster.length && <p className="p-4 text-sm text-neutral-500">No students enrolled yet — use "Enroll student" above.</p>}
        </Card>
      </div>

      {course ? (
        <div>
          <SectionLabel>Lesson progress · {course.title}</SectionLabel>
          <div className="space-y-2">
            {lessons.map((l, i) => {
              const status = currentIndex < 0 ? "upcoming" : i < currentIndex ? "done" : i === currentIndex ? "current" : "locked";
              return (
                <Card key={l.id} className={`p-4 flex items-center gap-3 ${status === "current" ? "border-primary-300 ring-2 ring-primary-100" : ""}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    status === "done" ? "bg-success-100 text-success-600" : status === "current" ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    {status === "done" ? <IconCircleCheck size={16} stroke={1.75} /> : status === "locked" ? <IconLock size={13} stroke={1.75} /> : <IconCircle size={14} stroke={1.75} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate text-neutral-950">L{l.n}: {l.title}</div>
                    <div className="text-xs text-neutral-500">{lessonBlocks(l).length} steps</div>
                  </div>
                  {status !== "current" && (
                    <button onClick={() => { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId: cls.id, lessonId: l.id }); toast(`${cls.name} is now on Lesson ${l.n}`); }}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 shrink-0">Set as current</button>
                  )}
                  <button onClick={() => go({ tab: "courses", courseId: course.id, lessonId: l.id })} className="text-xs text-neutral-500 hover:text-primary-600 shrink-0">Edit content</button>
                  <Button variant="outline" size="sm" onClick={() => startLive({ courseId: course.id, classId: cls.id, lessonId: l.id })} className="!text-warning-600 !border-warning-200 shrink-0">
                    <IconBroadcast size={12} stroke={1.75} /> Go live
                  </Button>
                </Card>
              );
            })}
            {!lessons.length && <p className="text-sm text-neutral-500">{course.title} has no lessons yet — build them in Courses.</p>}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
          <IconUsers size={20} stroke={1.75} className="text-neutral-400" />
          Assign a course above to start tracking lessons for this class.
        </Card>
      )}

      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)}
        title="Remove from this class?"
        sub={confirmRemove ? `${confirmRemove.name} — ${cls.name}` : ""}
        footer={<><Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button><Button variant="primary" className="!bg-warning-600 hover:!bg-warning-700" onClick={() => removeStudent(confirmRemove)}><IconX size={14} stroke={1.75} /> Remove</Button></>}>
        <p className="text-sm text-neutral-600">They'll lose access to this class's course and lessons. You can re-enroll them (here or in a different class) any time.</p>
      </Modal>
    </Page>
  );
}
