import React, { useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  IconPlus, IconChevronRight, IconUserPlus, IconUserMinus, IconX, IconCheck, IconUsers, IconSchool,
} from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, SectionLabel, Card, Button, Badge, Tag, Avatar, Modal, Field, TextField, Select, SegmentedBar, ClassCard, CountBadge, PRESS, PRESS_FLAT } from "../design-system.jsx";
import { useStore, useNav, activeClassCourse, classCourseProgress } from "../store.jsx";
import { timeAgo, shortDate } from "../format.js";
import { DAY_LABELS, CLASS_COURSE_STATUS, scheduleLabel } from "../data.jsx";

// A course's hue is authored as a Tailwind indigo/emerald/etc. hue key —
// map it onto the design-system's own tone vocabulary, same as Courses.jsx.
const HUE_TO_TONE = { indigo: "primary", emerald: "success", amber: "pending", rose: "warning", sky: "info" };

/* =========================================================================
   Classes — the top-level, durable thing: a roster of students on a
   schedule. Courses get assigned to a class over time (`class.courses`,
   its assignment history — see SEED_CLASSES), not the other way around.
   Entering a class shows every course it has studied (in progress / done);
   opening one goes to the SAME Course detail page Courses.jsx uses
   (/courses/:courseId) — not a separate view — just opened "as" this class
   (?classId=) so its lesson tree reflects this class's own progress instead
   of the course's generic authored state (see CourseView in Courses.jsx).
   The Student roster panel stays pinned on the class-level page since it's
   the class's own persistent resource, not something scoped to one course.
   Courses.jsx stays pure content authoring; this file owns roster,
   enrollment, and progress.
   ========================================================================= */

export default function Classes() {
  return (
    <Routes>
      <Route index element={<ClassesView />} />
      <Route path=":classId" element={<ClassDetailRoute />} />
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
          const p = active ? classCourseProgress(state, cls, active.courseId) : null;
          return (
            <ClassCard key={cls.id} icon={IconSchool} tone={course ? HUE_TO_TONE[course.hue] || "primary" : "primary"}
              title={cls.name} scheduleLabel={scheduleLabel(cls.scheduleDays)}
              courseTitle={course ? course.title : "No course in progress"}
              lessonLine={p?.next ? `Next up: Lesson ${p.next.n} · ${p.next.title}` : p?.allTaught ? "Every lesson taught" : ""}
              progressLabel={p ? `${p.taughtCount} of ${p.total} lessons taught` : undefined}
              roster={roster.map((s) => ({ id: s.id, name: s.name, color: avatarColorFor(s.id) }))}
              studentCountLabel={roster.length ? `${roster.length}${roster.length > 5 ? "+" : ""} student${roster.length === 1 ? "" : "s"}` : "No students yet"}
              progressPct={p ? p.pct : null} onViewDetail={() => navigate(`/classes/${cls.id}`)} />
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

function ClassDetailView({ classId }) {
  const { state, dispatch, toast } = useStore();
  const { go } = useNav();
  const navigate = useNavigate();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // student pending removal
  // The confirm dialog keeps showing the student it was opened for while it
  // plays its exit animation, after confirmRemove is already cleared.
  const lastRemove = useRef(null);
  if (confirmRemove) lastRemove.current = confirmRemove;
  const removing = confirmRemove || lastRemove.current;

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
  // The new course becomes the class's active one; whatever was in
  // progress is paused (resumable from its course page), and the toast
  // says so rather than letting it happen silently.
  function assignCourse(courseId) {
    const paused = state.courses.find((c) => c.id === activeClassCourse(cls)?.courseId);
    dispatch({ type: "ASSIGN_CLASS_COURSE", classId: cls.id, courseId });
    const title = state.courses.find((c) => c.id === courseId)?.title;
    toast(paused ? `${title} is now in progress for ${cls.name} — ${paused.title} paused` : `${title} assigned to ${cls.name}`);
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
                    <div className="absolute right-0 top-10 z-10 w-56 rounded-xl border border-neutral-200 bg-surface shadow-lg py-1.5">
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
            {/* Active course first — it's where the class left off. */}
            {[...cls.courses].sort((a, b) => (a.status === "in-progress" ? -1 : b.status === "in-progress" ? 1 : 0)).map((entry) => {
              const course = state.courses.find((c) => c.id === entry.courseId);
              if (!course) return null;
              const p = classCourseProgress(state, cls, course.id);
              const st = CLASS_COURSE_STATUS[entry.status] || CLASS_COURSE_STATUS["in-progress"];
              const openCourse = () => go({ tab: "courses", courseId: course.id, classId: cls.id });
              return (
                <Card key={course.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <button onClick={openCourse} className="min-w-0 text-left group">
                      <div className="font-bold text-neutral-950 truncate group-hover:text-primary-600">{course.title}</div>
                      <div className="text-sm text-neutral-600 mt-0.5">{course.level} · {p.taughtCount} of {p.total} lessons taught</div>
                    </button>
                    <Badge color={st.color}>{st.label}</Badge>
                  </div>
                  <SegmentedBar pct={p.pct} cells={Math.max(p.total, 1)} />
                  {/* Where the class left off — the whole point of the card. */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    {p.next ? (
                      <span className="text-neutral-700">Next up: <b className="text-neutral-950">Lesson {p.next.n} · {p.next.title}</b></span>
                    ) : (
                      <span className="text-neutral-700">{entry.status === "done" ? "Course completed" : "Every lesson has been taught"}</span>
                    )}
                    <span className="text-neutral-600" title={p.last ? shortDate(p.last.taughtAt) : undefined}>
                      {p.last?.lesson ? `Last taught: Lesson ${p.last.lesson.n} · ${timeAgo(p.last.taughtAt)}` : "Nothing taught yet"}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={openCourse}>All lessons</Button>
                      {p.next && entry.status !== "done" && (
                        <Button size="sm" variant={entry.status === "in-progress" ? "primary" : "light"}
                          onClick={() => go({ tab: "courses", courseId: course.id, classId: cls.id, lessonId: p.next.id })}>
                          Continue Lesson {p.next.n} <IconChevronRight size={15} stroke={1.75} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
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
              <div className="flex items-center gap-2 text-base font-semibold text-neutral-950"><IconUsers size={18} stroke={1.75} /> Students <CountBadge>{roster.length}</CountBadge></div>
              <Button variant="outline" size="sm" iconOnly icon={IconUserPlus} onClick={() => setEnrollOpen((v) => !v)}
                title="Enroll a student" aria-label="Enroll a student" aria-expanded={enrollOpen} />
            </div>

            {enrollOpen && (
              <div className="mb-3 rounded-xl border border-primary-200 bg-primary-50/30 p-3">
                <div className="text-xs font-semibold text-neutral-600 mb-2">Pick a student to enroll</div>
                {others.length ? (
                  <div className="space-y-1.5">
                    {others.map((s) => (
                      <button key={s.id}
                        onClick={() => { dispatch({ type: "SET_STUDENT_CLASS", studentId: s.id, classId: cls.id }); toast(`${s.name.split(" ")[0]} enrolled in ${cls.name}`); setEnrollOpen(false); }}
                        className={`w-full inline-flex items-center gap-2 rounded-lg bg-surface border border-neutral-200 hover:border-primary-400 p-2 text-sm ${PRESS}`}>
                        <Avatar name={s.name} color={avatarColorFor(s.id)} size="xs" />
                        <span className="font-medium text-neutral-900 flex-1 text-left truncate">{s.name}</span>
                        <Tag color="neutral">{s.level}</Tag>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-neutral-500">Every student is already enrolled in this class.</p>}
              </div>
            )}

            <div className="divide-y divide-neutral-400">
              {roster.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-2.5">
                  <button onClick={() => go({ tab: "students", studentId: s.id })} className={`flex items-center gap-2.5 min-w-0 flex-1 text-left ${PRESS_FLAT}`}>
                    <div className="relative shrink-0">
                      <Avatar name={s.name} color={avatarColorFor(s.id)} size="sm" />
                      {s.status !== "not started" && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 ring-2 ring-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-neutral-950">{s.name}</div>
                      <div className="text-xs text-neutral-600">{s.progress}% · {s.status}</div>
                    </div>
                  </button>
                  {/* Always visible (no hover-only reveal — a tablet has no hover),
                      quiet until pointed at, then the danger color. */}
                  <button type="button" onClick={() => setConfirmRemove(s)}
                    title={`Remove ${s.name.split(" ")[0]} from this class`} aria-label={`Remove ${s.name} from ${cls.name}`}
                    className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-warning-50 hover:text-warning-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-200 ${PRESS_FLAT}`}>
                    <IconUserMinus size={17} stroke={1.75} />
                  </button>
                </div>
              ))}
              {!roster.length && <p className="py-4 text-sm text-neutral-600">No students enrolled yet.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel takes focus, so Enter on a stray keypress never removes. */}
      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)}
        icon={IconUserMinus} iconTone="warning"
        title={`Remove ${removing?.name.split(" ")[0] || "student"} from this class?`} sub={cls.name}
        footer={<>
          <Button variant="outline" autoFocus onClick={() => setConfirmRemove(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => removeStudent(confirmRemove)}><IconUserMinus size={16} stroke={1.75} /> Remove from class</Button>
        </>}>
        {removing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-neutral-400 p-3">
              <Avatar name={removing.name} color={avatarColorFor(removing.id)} size="md" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-neutral-950">{removing.name}</div>
                <div className="text-sm text-neutral-600">{removing.level} · {removing.progress}% · {removing.status}</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex gap-2"><IconX size={16} stroke={1.75} className="mt-0.5 shrink-0 text-warning-600" /> Leaves this class and its course — no more of its lessons or live sessions.</li>
              <li className="flex gap-2"><IconCheck size={16} stroke={1.75} className="mt-0.5 shrink-0 text-success-600" /> Their profile, progress and saved words stay. Nothing is deleted.</li>
              <li className="flex gap-2"><IconCheck size={16} stroke={1.75} className="mt-0.5 shrink-0 text-success-600" /> You can re-enroll them here, or in another class, any time.</li>
            </ul>
          </div>
        )}
      </Modal>
    </Page>
  );
}
