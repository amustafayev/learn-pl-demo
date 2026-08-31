import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  IconPlus, IconChevronRight, IconBroadcast, IconUserPlus, IconX, IconUsers, IconDots, IconCircleCheck,
} from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, SectionLabel, Card, Button, Badge, Tag, Avatar, Modal, Field, TextField, Select, PillTabs, SegmentedBar } from "../design-system.jsx";
import { useStore, useNav, lessonBlocks, activeClassCourse } from "../store.jsx";
import { DAY_LABELS, scheduleLabel } from "../data.jsx";

/* =========================================================================
   Classes — the top-level, durable thing: a roster of students on a
   schedule. Courses get assigned to a class over time (`class.courses`,
   its assignment history — see SEED_CLASSES), not the other way around.
   Entering a class shows every course it has studied (in progress / done);
   opening one drills into that course's own lesson-by-lesson progress —
   that drill-down is page-internal (own nested route, like Library's
   reader/word-set drill-down), while the Student roster panel stays
   pinned on the class-level page since it's the class's own persistent
   resource, not something scoped to one course. Courses.jsx stays pure
   content authoring; this file owns roster, enrollment, and progress.
   ========================================================================= */

export default function Classes() {
  return (
    <Routes>
      <Route index element={<ClassesView />} />
      <Route path=":classId" element={<ClassDetailRoute />} />
      <Route path=":classId/courses/:courseId" element={<ClassCourseDetailRoute />} />
      <Route path="*" element={<Navigate to="/classes" replace />} />
    </Routes>
  );
}

function ClassesView() {
  const { state, dispatch, toast } = useStore();
  const navigate = useNavigate();
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
        sub="A Class is the durable thing — students belong to a class, and a class studies courses over time"
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
          const active = activeClassCourse(cls);
          const course = state.courses.find((c) => c.id === active?.courseId);
          const lessons = state.lessons[active?.courseId] || [];
          const current = lessons.find((l) => l.id === active?.currentLessonId);
          return (
            <button key={cls.id} onClick={() => navigate(`/classes/${cls.id}`)}
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
                  {roster.slice(0, 5).map((s) => <Avatar key={s.id} name={s.name} color={avatarColorFor(s.id)} size="xs" />)}
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

// Cycles avatar colors deterministically per student so a roster reads as a
// real group of people, not one repeated color — matches the varied avatar
// palette on Learniv's Student panel.
const AVATAR_CYCLE = ["primary", "info", "success", "dark", "pending", "warning"];
const avatarColorFor = (id) => AVATAR_CYCLE[[...id].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_CYCLE.length];

// classId is page-internal drill-down state (own route param), same
// decoupling pattern as Library's textId/setId — not read from useNav().
function ClassDetailRoute() {
  const { classId } = useParams();
  return <ClassDetailView classId={classId} />;
}
function ClassCourseDetailRoute() {
  const { classId, courseId } = useParams();
  return <ClassCourseDetailView classId={classId} courseId={courseId} />;
}

function ClassDetailView({ classId }) {
  const { state, dispatch, toast } = useStore();
  const { go } = useNav();
  const navigate = useNavigate();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // student pending removal

  const cls = state.classes.find((c) => c.id === classId);
  if (!cls) return null;

  const roster = state.students.filter((s) => s.classId === cls.id);
  const others = state.students.filter((s) => s.classId !== cls.id);
  const unassignedCourses = state.courses.filter((c) => !cls.courses.some((x) => x.courseId === c.id));

  function removeStudent(s) {
    dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: null });
    toast(`${s.name.split(" ")[0]} removed from ${cls.name}`);
    setConfirmRemove(null);
  }
  function assignCourse(courseId) {
    dispatch({ type: "ASSIGN_CLASS_COURSE", classId: cls.id, courseId });
    toast(`${state.courses.find((c) => c.id === courseId)?.title} assigned to ${cls.name}`);
    setAssignOpen(false);
  }

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Classes", onClick: () => navigate("/classes") }, { label: cls.name }]} />
      <PageHeader title={cls.name}
        sub={`${scheduleLabel(cls.scheduleDays)} · ${roster.length} student${roster.length === 1 ? "" : "s"}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* main column — assigned courses */}
        <div className="lg:col-span-2">
          <SectionLabel right={
            unassignedCourses.length > 0 && (
              <div className="relative">
                <Button variant="light" size="sm" onClick={() => setAssignOpen((v) => !v)}><IconPlus size={14} stroke={1.75} /> Assign course</Button>
                {assignOpen && (
                  <>
                    <button className="fixed inset-0 z-[5] cursor-default" onClick={() => setAssignOpen(false)} aria-label="Close menu" />
                    <div className="absolute right-0 top-10 z-10 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg py-1.5">
                      {unassignedCourses.map((c) => (
                        <button key={c.id} onClick={() => assignCourse(c.id)}
                          className="w-full text-left px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50">{c.title}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          }>Courses</SectionLabel>

          <div className="space-y-3">
            {cls.courses.map((entry) => {
              const course = state.courses.find((c) => c.id === entry.courseId);
              if (!course) return null;
              const lessons = state.lessons[course.id] || [];
              const currentIndex = lessons.findIndex((l) => l.id === entry.currentLessonId);
              const pct = entry.status === "done" ? 100 : lessons.length ? Math.round(((currentIndex + 1) / lessons.length) * 100) : 0;
              const current = lessons[currentIndex];
              return (
                <button key={course.id} onClick={() => navigate(`/classes/${cls.id}/courses/${course.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-950 truncate">{course.title}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{course.level}{current ? ` · Last lesson: ${current.title}` : ""}</div>
                    </div>
                    <Badge color={entry.status === "done" ? "success" : "pending"}>{entry.status === "done" ? "Completed" : "In Progress"}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-neutral-700 shrink-0">{pct}%</span>
                    <div className="flex-1"><SegmentedBar pct={pct} /></div>
                    <IconChevronRight size={16} stroke={1.75} className="text-neutral-300 shrink-0" />
                  </div>
                </button>
              );
            })}
            {!cls.courses.length && (
              <Card className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
                <IconUsers size={20} stroke={1.75} className="text-neutral-400" />
                Assign a course above to start tracking lessons for this class.
              </Card>
            )}
          </div>
        </div>

        {/* right rail — persistent Student panel, connected straight to Students */}
        <div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-semibold text-neutral-950"><IconUsers size={16} stroke={1.75} /> Student <Badge color="neutral">{roster.length}</Badge></div>
              <button onClick={() => setEnrollOpen((v) => !v)} title="Enroll student" className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-primary-300 hover:text-primary-600">
                <IconUserPlus size={15} stroke={1.75} />
              </button>
            </div>

            {enrollOpen && (
              <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50/30 p-3">
                <div className="text-xs font-semibold text-neutral-600 mb-2">Pick a student to enroll</div>
                {others.length ? (
                  <div className="space-y-1.5">
                    {others.map((s) => (
                      <button key={s.id}
                        onClick={() => { dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: cls.id }); toast(`${s.name.split(" ")[0]} enrolled in ${cls.name}`); setEnrollOpen(false); }}
                        className="w-full inline-flex items-center gap-2 rounded-lg bg-white border border-neutral-200 hover:border-primary-400 p-2 text-sm transition-all">
                        <Avatar name={s.name} color={avatarColorFor(s.id)} size="xs" />
                        <span className="font-medium text-neutral-900 flex-1 text-left truncate">{s.name}</span>
                        <Tag color="neutral">{s.level}</Tag>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-neutral-500">Every student is already enrolled in this class.</p>}
              </div>
            )}

            <div className="divide-y divide-neutral-100">
              {roster.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2.5 group">
                  <button onClick={() => go({ tab: "students", studentId: s.id })} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <div className="relative shrink-0">
                      <Avatar name={s.name} color={avatarColorFor(s.id)} size="sm" />
                      {s.status !== "not started" && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 ring-2 ring-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-neutral-950">{s.name}</div>
                      <div className="text-xs text-neutral-500">{s.progress}% · {s.status}</div>
                    </div>
                  </button>
                  <button title="Remove from class" onClick={() => setConfirmRemove(s)} className="shrink-0 text-neutral-300 hover:text-warning-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><IconX size={13} stroke={1.75} /></button>
                </div>
              ))}
              {!roster.length && <p className="py-4 text-sm text-neutral-500">No students enrolled yet.</p>}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)}
        title="Remove from this class?"
        sub={confirmRemove ? `${confirmRemove.name} — ${cls.name}` : ""}
        footer={<><Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button><Button variant="primary" className="!bg-warning-600 hover:!bg-warning-700" onClick={() => removeStudent(confirmRemove)}><IconX size={14} stroke={1.75} /> Remove</Button></>}>
        <p className="text-sm text-neutral-600">They'll lose access to this class's course and lessons. You can re-enroll them (here or in a different class) any time.</p>
      </Modal>
    </Page>
  );
}

// One course's lesson-by-lesson progress within one class — drilled into
// from the course card above. No Student panel here: the roster is the
// class's own resource, not scoped to whichever course is open right now.
function ClassCourseDetailView({ classId, courseId }) {
  const { state, dispatch, toast } = useStore();
  const { go, startLive } = useNav();
  const navigate = useNavigate();
  const [sessionFilter, setSessionFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState(null); // lesson id whose "..." menu is open

  const cls = state.classes.find((c) => c.id === classId);
  const entry = cls?.courses.find((c) => c.courseId === courseId);
  const course = state.courses.find((c) => c.id === courseId);
  if (!cls || !entry || !course) return null;

  const lessons = state.lessons[course.id] || [];
  const currentIndex = lessons.findIndex((l) => l.id === entry.currentLessonId);
  const overallPct = entry.status === "done" ? 100 : lessons.length ? Math.round(((currentIndex + 1) / lessons.length) * 100) : 0;

  // Coarse per-lesson status — the class only tracks one "current" pointer,
  // not fine-grained per-lesson completion, so status is derived from
  // position relative to currentIndex rather than a stored percentage.
  const sessions = lessons.map((l, i) => {
    const status = entry.status === "done" ? "done" : currentIndex < 0 ? "upcoming" : i < currentIndex ? "done" : i === currentIndex ? "current" : "locked";
    return { lesson: l, i, status, steps: lessonBlocks(l).length };
  });
  const doneCount = sessions.filter((s) => s.status === "done").length;
  const inProgressCount = sessions.filter((s) => s.status === "current").length;
  const visibleSessions = sessions.filter((s) =>
    sessionFilter === "all" ? true : sessionFilter === "progress" ? s.status === "current" : s.status === "done");

  return (
    <Page>
      <Breadcrumbs items={[
        { label: "Classes", onClick: () => navigate("/classes") },
        { label: cls.name, onClick: () => navigate(`/classes/${cls.id}`) },
        { label: course.title },
      ]} />
      <PageHeader title={course.title}
        sub={`${cls.name} · ${course.level}`}
        right={entry.status === "done" ? (
          <Button variant="light" size="sm" onClick={() => { dispatch({ type: "SET_CLASS_COURSE_STATUS", classId: cls.id, courseId: course.id, status: "in-progress" }); toast(`${course.title} reopened for ${cls.name}`); }}>
            Reopen course
          </Button>
        ) : (
          <Button variant="light" size="sm" onClick={() => { dispatch({ type: "SET_CLASS_COURSE_STATUS", classId: cls.id, courseId: course.id, status: "done" }); toast(`${course.title} marked completed for ${cls.name}`); }}>
            <IconCircleCheck size={14} stroke={1.75} /> Mark as completed
          </Button>
        )} />

      <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-3xl font-bold text-neutral-950">{overallPct}%</span>
          <span className="text-sm font-semibold text-neutral-600">Total Progress</span>
        </div>
        <div className="flex-1 min-w-[160px]"><SegmentedBar pct={overallPct} /></div>
        <Badge color={entry.status === "done" ? "success" : "pending"} className="shrink-0">{entry.status === "done" ? "Completed" : "In Progress"}</Badge>
      </Card>

      <SectionLabel right={
        <PillTabs value={sessionFilter} onChange={setSessionFilter} tabs={[
          { id: "all", label: "All" },
          { id: "progress", label: "In progress", count: inProgressCount },
          { id: "done", label: "Completed", count: doneCount },
        ]} />
      }>Session</SectionLabel>

      <Card className="!p-0 overflow-hidden relative">
        {openMenu && <button className="fixed inset-0 z-[5] cursor-default" onClick={() => setOpenMenu(null)} aria-label="Close menu" />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3 font-semibold">Session</th>
                <th className="px-5 py-3 font-semibold">Progress</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleSessions.map(({ lesson: l, status, steps }) => {
                const pct = status === "done" ? 100 : status === "current" ? 50 : 0;
                const statusLabel = status === "done" ? "Completed" : status === "current" ? "In Progress" : status === "locked" ? "Locked" : "Not started yet";
                const statusColor = status === "done" ? "success" : status === "current" ? "pending" : status === "locked" ? "neutral" : "primary";
                return (
                  <tr key={l.id} className={status === "current" ? "bg-primary-50/30" : ""}>
                    <td className="px-5 py-4 align-top">
                      <div className="font-bold text-neutral-950">L{l.n}: {l.title}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{steps} step{steps === 1 ? "" : "s"}</div>
                    </td>
                    <td className="px-5 py-4 align-top min-w-[160px]">
                      <div className="text-xs font-semibold text-neutral-700 mb-1.5">{pct}%</div>
                      <SegmentedBar pct={pct} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge color={statusColor}>{statusLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top relative">
                      <button onClick={() => setOpenMenu(openMenu === l.id ? null : l.id)}
                        className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100">
                        <IconDots size={16} stroke={1.75} />
                      </button>
                      {openMenu === l.id && (
                        <div className="absolute right-5 top-10 z-10 w-44 rounded-xl border border-neutral-200 bg-white shadow-lg py-1.5">
                          {status !== "current" && entry.status !== "done" && (
                            <button onClick={() => { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId: cls.id, courseId: course.id, lessonId: l.id }); toast(`${cls.name} is now on Lesson ${l.n}`); setOpenMenu(null); }}
                              className="w-full text-left px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Set as current</button>
                          )}
                          <button onClick={() => go({ tab: "courses", courseId: course.id, lessonId: l.id })}
                            className="w-full text-left px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Edit content</button>
                          <button onClick={() => startLive({ courseId: course.id, classId: cls.id, lessonId: l.id })}
                            className="w-full text-left px-3.5 py-2 text-sm text-warning-600 hover:bg-neutral-50">
                            <IconBroadcast size={12} stroke={1.75} className="inline mr-1.5 -mt-0.5" /> Go live
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!visibleSessions.length && (
                <tr><td colSpan={4} className="px-5 py-6 text-sm text-neutral-500">
                  {lessons.length ? "No sessions match this filter." : `${course.title} has no lessons yet — build them in Courses.`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
