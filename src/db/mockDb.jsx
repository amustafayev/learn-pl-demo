import {
  SEED_COURSES, SEED_LESSONS, SEED_STUDENTS, SEED_TEXTS, SEED_WORDSETS, SEED_COMPONENT_BANK, SEED_CLASSES,
  SEED_TAUGHT_LESSONS, SEED_CLASS_NOTES, SEED_MEMBERSHIPS, SEED_PURCHASES, SEED_INVITATIONS, SEED_ATTENDANCE, SEED_LESSON_COMPLETIONS, SEED_ASSIGNMENTS,
  TEACHER, TEACHER_PROFILES, BLOCK_TYPES,
} from "../data.jsx";

/* =========================================================================
   The mock "database": everything that persists app state and enforces the
   rules for how a write changes it. This is the ONLY layer that should
   change to plug in a real backend — swap `reducer`/`createInitialState`
   for real API calls (e.g. have StoreProvider in store.jsx fetch + POST
   instead of useReducer) and every view keeps working unchanged, since
   views never import from here directly — they only ever call
   `useStore()`/`dispatch()` from store.jsx, which is just the React
   binding on top of whatever this layer does.

   `../data.jsx` is the fixture/seed side (what a real backend's database
   would already contain) and static UI config (icons, labels, templates);
   this file is the mutation/query rules (what a real backend's endpoints
   would do with that data).
   ========================================================================= */

const clone = (x) => JSON.parse(JSON.stringify(x));
// Random rather than a counter: a counter restarts on every page load, so ids
// minted after a reload would collide with ones already stored (the
// component library survives reloads in localStorage). getRandomValues, not
// randomUUID, because randomUUID is missing on plain http (e.g. opening the
// dev server from a phone via its LAN address).
export const uid = (prefix) =>
  prefix + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
const COMPONENT_BANK_KEY = "lucid.component-bank";

// Which seed items a saved library has already been offered. A seed item
// added to data.jsx later should still reach someone whose library was saved
// before it existed — but only once, so one they deleted doesn't reappear on
// the next reload. A library saved before this key existed had the original
// three seeds.
const OFFERED_SEEDS_KEY = "lucid.component-bank.offered-seeds";
const ORIGINAL_SEED_IDS = ["cb1", "cb2", "cb3"];

// Read-only on purpose: this runs as useReducer's lazy initializer, which
// StrictMode calls twice in dev — writing here would make the second call
// see every seed as already offered. The write happens in
// persistComponentBank, after the state has actually been committed.
function savedComponentBank() {
  try {
    const saved = window.localStorage.getItem(COMPONENT_BANK_KEY);
    if (!saved) return clone(SEED_COMPONENT_BANK);
    const bank = JSON.parse(saved);
    const offered = JSON.parse(window.localStorage.getItem(OFFERED_SEEDS_KEY) || "null") || ORIGINAL_SEED_IDS;
    const fresh = SEED_COMPONENT_BANK.filter((c) => !offered.includes(c.id) && !bank.some((b) => b.id === c.id));
    return [...bank, ...clone(fresh)];
  } catch {
    return clone(SEED_COMPONENT_BANK);
  }
}

export function persistComponentBank(bank) {
  try {
    window.localStorage.setItem(COMPONENT_BANK_KEY, JSON.stringify(bank));
    window.localStorage.setItem(OFFERED_SEEDS_KEY, JSON.stringify(SEED_COMPONENT_BANK.map((c) => c.id)));
  } catch { /* prototype still works without storage */ }
}

// Blocks for a lesson — hydrated from the shorthand `parts` list (an array
// of Block-type ids) the first time it's touched, or the live `built` array
// afterwards. Exported so any view that just needs to preview a lesson's
// pathway (Course tree, Live Session setup) can reuse the same hydration
// logic instead of re-deriving it locally. Hydrated ids are derived from the
// lesson, not random, so a block's URL still resolves after a reload
// re-hydrates the lesson from its seed.
export const lessonBlocks = (l) =>
  !l ? [] : l.built && l.built.length
    ? l.built
    : (l.parts || []).map((t, i) => ({ id: `${l.id}-${i + 1}`, type: t, title: BLOCK_TYPES[t]?.label || t, meta: "—" }));

// A class's `courses` is its assignment history (see SEED_CLASSES); the
// student-facing/live-session views only care about the one it's actively
// studying right now.
export const activeClassCourse = (cls) => (cls?.courses || []).find((c) => c.status === "in-progress") || null;


// Where one class stands on one course, teacher-side and lesson-level only:
// the lesson it's on next, what it was last taught and when, and how many
// of the course's lessons it has been taught. All derived from the class's
// `courses` entry plus the taughtLessons log — a real backend would return
// the same shape from GET /classes/:classId/courses/:courseId.
// null when the class isn't assigned that course.
export function classCourseProgress(state, cls, courseId) {
  const entry = cls?.courses.find((c) => c.courseId === courseId);
  if (!entry) return null;
  const lessons = state.lessons[courseId] || [];
  const log = (state.taughtLessons || [])
    .filter((t) => t.classId === cls.id && t.courseId === courseId)
    .sort((a, b) => (a.taughtAt < b.taughtAt ? 1 : -1)); // newest first
  // lessonId -> the latest time it was taught
  const taughtAt = {};
  log.forEach((t) => { if (!taughtAt[t.lessonId]) taughtAt[t.lessonId] = t.taughtAt; });
  const taughtCount = lessons.filter((l) => taughtAt[l.id]).length;
  const nextIndex = lessons.findIndex((l) => l.id === entry.currentLessonId);
  const last = log[0] ? { lesson: lessons.find((l) => l.id === log[0].lessonId) || null, taughtAt: log[0].taughtAt } : null;
  const allTaught = lessons.length > 0 && taughtCount === lessons.length;
  // Lessons the class's students can open (see canOpenLesson).
  const released = new Set(entry.releasedLessonIds || []);
  return {
    entry, lessons, taughtAt, taughtCount, total: lessons.length, last, allTaught, released,
    // "Next up" means nothing once the course is done or every lesson has
    // been taught; before any lesson is set it falls back to the first.
    next: entry.status === "done" || allTaught ? null : lessons[nextIndex >= 0 ? nextIndex : 0] || null,
    pct: entry.status === "done" ? 100 : lessons.length ? Math.round((taughtCount / lessons.length) * 100) : 0,
  };
}

// A course has no progress of its own — it's just authored content until a
// class is actually assigned to it. Progress only exists per class (see
// classCourseProgress). Returns one row per class actually assigned to
// `courseId` — empty if none are, which is the "this course isn't being
// taught anywhere yet" case.
export function classesOnCourse(state, courseId) {
  return state.classes
    .map((cls) => ({ cls, progress: classCourseProgress(state, cls, courseId) }))
    .filter((x) => x.progress)
    .map(({ cls, progress }) => ({ cls, entry: progress.entry, pct: progress.pct, progress }));
}

// The single number a course card can show — the average of every class
// actually taking it, or `null` (not 0%) when no class has been assigned,
// since "no progress yet" and "0% progress" are different facts.
export function courseAvgProgress(state, courseId) {
  const rows = classesOnCourse(state, courseId);
  return rows.length ? Math.round(rows.reduce((sum, r) => sum + r.pct, 0) / rows.length) : null;
}

/* ------------------------ students, classes & access ------------------------
   See "Students, classes & access" in CLAUDE.md. A teacher only ever sees
   students they have a relationship with — a class membership (any status)
   or a purchase of one of their courses. teacherView() applies that rule to
   the whole state before any view gets it, exactly as a real API scopes
   every response to the logged-in teacher. */

// Everything the logged-in teacher's API would return, and nothing else:
// their own courses (and those courses' lessons), their own classes, the
// memberships/purchases/invites attached to those, and only the students
// behind them. Another teacher's students never reach a view.
export function teacherView(db) {
  const me = db.teacher.id;
  const courses = db.courses.filter((c) => c.teacherId === me);
  const courseIds = new Set(courses.map((c) => c.id));
  const classes = db.classes.filter((c) => c.teacherId === me);
  const classIds = new Set(classes.map((c) => c.id));
  const blocks = db.blocks.filter((b) => b.teacherId === me);
  const blocked = new Set(blocks.map((b) => b.studentId));
  // A blocked student's new requests never reach the teacher.
  const memberships = db.memberships.filter((m) => classIds.has(m.classId) && !(m.status === "requested" && blocked.has(m.studentId)));
  const purchases = db.purchases.filter((p) => courseIds.has(p.courseId) && !(p.status === "requested" && blocked.has(p.studentId)));
  const related = new Set([...memberships.map((m) => m.studentId), ...purchases.map((p) => p.studentId)]);
  const taughtLessons = db.taughtLessons.filter((t) => classIds.has(t.classId));
  const taughtIds = new Set(taughtLessons.map((t) => t.id));
  // Self-paced work reaches the teacher only for a course the student
  // bought from them (paid, or refunded — history of what they had).
  const bought = new Set(purchases.filter((p) => p.status === "paid" || p.status === "refunded").map((p) => `${p.studentId}:${p.courseId}`));
  return {
    ...db,
    courses,
    lessons: Object.fromEntries(Object.entries(db.lessons).filter(([courseId]) => courseIds.has(courseId))),
    classes,
    memberships,
    purchases,
    invitations: db.invitations.filter((i) => classIds.has(i.classId)),
    blocks,
    taughtLessons,
    classNotes: db.classNotes.filter((n) => classIds.has(n.classId)),
    attendance: db.attendance.filter((a) => taughtIds.has(a.taughtLessonId) && related.has(a.studentId)),
    lessonCompletions: db.lessonCompletions.filter((c) => bought.has(`${c.studentId}:${c.courseId}`)),
    assignments: db.assignments.filter((a) => a.teacherId === me && related.has(a.studentId)),
    students: db.students.filter((s) => related.has(s.id)),
  };
}

// A class's students with the given membership status (default: active).
export const classMembers = (state, classId, status = "active") =>
  state.memberships
    .filter((m) => m.classId === classId && m.status === status)
    .map((m) => ({ ...m, student: state.students.find((s) => s.id === m.studentId) }))
    .filter((m) => m.student);

// The classes a student is in (or was in, with another status).
export const studentClasses = (state, studentId, status = "active") =>
  state.memberships
    .filter((m) => m.studentId === studentId && m.status === status)
    .map((m) => state.classes.find((c) => c.id === m.classId))
    .filter(Boolean);

// Students currently in at least one of the teacher's classes — what
// "my students" means for rosters, assigning, the dashboard.
export const activeStudents = (state) =>
  state.students.filter((s) => state.memberships.some((m) => m.studentId === s.id && m.status === "active"));

// Which course a student is studying in class — the active course of their
// (first) active class. Derived, never stored on the student.
export function studentCourseId(state, student) {
  for (const cls of studentClasses(state, student?.id)) {
    const c = activeClassCourse(cls);
    if (c) return c.courseId;
  }
  return null;
}

const ENDED = new Set(["removed", "left"]);

// The teacher's Students page, grouped: active, requests waiting for an
// answer (class joins and purchases), former students, and course customers.
export function teacherRoster(state) {
  const byId = (id) => state.students.find((s) => s.id === id);
  const blocked = new Set(state.blocks.map((b) => b.studentId));
  // Any stint in one of the teacher's classes — even on a row that's back to
  // "requested" because they asked to rejoin.
  const wasMember = (studentId) => state.memberships.some((m) => m.studentId === studentId && membershipPeriods(m).length > 0);
  const active = activeStudents(state);
  const activeIds = new Set(active.map((s) => s.id));
  const requests = [
    ...state.memberships.filter((m) => m.status === "requested").map((m) => ({
      kind: "class", id: m.id, at: m.requestedAt, membership: m, student: byId(m.studentId),
      cls: state.classes.find((c) => c.id === m.classId), previously: wasMember(m.studentId),
    })),
    ...state.purchases.filter((p) => p.status === "requested").map((p) => ({
      kind: "purchase", id: p.id, at: p.requestedAt, purchase: p, student: byId(p.studentId),
      course: state.courses.find((c) => c.id === p.courseId), previously: wasMember(p.studentId),
    })),
  ].filter((r) => r.student).sort((a, b) => (a.at < b.at ? 1 : -1));
  const former = state.students
    .filter((s) => !activeIds.has(s.id) && state.memberships.some((m) => m.studentId === s.id && ENDED.has(m.status)))
    .map((s) => ({ student: s, blocked: blocked.has(s.id), ended: state.memberships.filter((m) => m.studentId === s.id && ENDED.has(m.status)) }));
  const customers = state.purchases.filter((p) => p.status === "paid")
    .map((p) => ({ purchase: p, student: byId(p.studentId), course: state.courses.find((c) => c.id === p.courseId) }))
    .filter((c) => c.student);
  // Blocked students who aren't already listed as former (e.g. blocked
  // straight from a request) — so the teacher can always unblock them.
  const formerIds = new Set(former.map((f) => f.student.id));
  const blockedOnly = [...blocked].filter((id) => !formerIds.has(id)).map(byId).filter(Boolean);
  return { active, requests, former, customers, blocked: blockedOnly };
}

// Every stint a student was actually in a class — { startedAt, endedAt,
// endReason }. Rows written before periods existed fall back to their
// latest dates, so an old membership still reads as one stint.
export function membershipPeriods(m) {
  if (m.periods?.length) return m.periods;
  if (!m.decidedAt || !(m.status === "active" || ENDED.has(m.status))) return [];
  return [{ startedAt: m.decidedAt, endedAt: m.endedAt || null, endReason: ENDED.has(m.status) ? m.status : null }];
}
const inPeriods = (periods, at) => periods.some((p) => p.startedAt <= at && (!p.endedAt || at <= p.endedAt));
const newestFirst = (a, b) => (a.at < b.at ? 1 : -1);

// One student's history with this teacher — what
// GET /students/:studentId/history returns (already teacher-scoped):
//   classes    every class they've been in: its stints, what it's on now
//              (active only), and the lessons taught while they were in it
//   purchases  courses they bought, with the lessons they finished
//   lessons    both kinds of lesson, newest first:
//                kind "class"      taught to their class during one of
//                                  their stints (absent: marked missed)
//                kind "self-paced" finished on their own (a bought course)
//   assignments work handed to them, newest first (withdrawn included, as
//              history — filter on `status` to hide it)
//   timeline   lessons plus the milestones between them (joined / left a
//              class, bought a course, work assigned / finished), newest first
//   totals     { taken, inClass, selfPaced, missed, lastAt, toDo }
// A lesson taught before they joined, between stints, or after they left
// is never theirs — nothing new about a former student reaches the teacher.
export function studentHistory(state, studentId) {
  const courseOf = (id) => state.courses.find((c) => c.id === id) || null;
  const lessonOf = (courseId, lessonId) => (state.lessons[courseId] || []).find((l) => l.id === lessonId) || null;
  const absent = new Set((state.attendance || []).filter((a) => a.studentId === studentId && a.status === "absent").map((a) => a.taughtLessonId));

  const classes = state.memberships
    .filter((m) => m.studentId === studentId)
    .map((m) => ({ m, cls: state.classes.find((c) => c.id === m.classId), periods: membershipPeriods(m) }))
    .filter((x) => x.cls && x.periods.length)
    .map(({ m, cls, periods }) => {
      const lessons = state.taughtLessons
        .filter((t) => t.classId === cls.id && inPeriods(periods, t.taughtAt))
        .map((t) => ({ kind: "class", id: t.id, at: t.taughtAt, taughtLesson: t, cls, course: courseOf(t.courseId), lesson: lessonOf(t.courseId, t.lessonId), absent: absent.has(t.id) }))
        .sort(newestFirst);
      const active = m.status === "active";
      const onNow = active ? activeClassCourse(cls) : null;
      return {
        membership: m, cls, active, periods, lessons,
        attended: lessons.filter((l) => !l.absent).length,
        missed: lessons.filter((l) => l.absent).length,
        now: onNow ? { course: courseOf(onNow.courseId), progress: classCourseProgress(state, cls, onNow.courseId) } : null,
      };
    })
    .sort((a, b) => (a.active !== b.active ? (a.active ? -1 : 1) : a.periods.at(-1).startedAt < b.periods.at(-1).startedAt ? 1 : -1));

  const purchases = state.purchases
    .filter((p) => p.studentId === studentId && (p.status === "paid" || p.status === "refunded"))
    .map((p) => {
      const course = courseOf(p.courseId);
      const lessons = (state.lessonCompletions || [])
        .filter((c) => c.studentId === studentId && c.courseId === p.courseId)
        .map((c) => ({ kind: "self-paced", id: c.id, at: c.completedAt, course, lesson: lessonOf(c.courseId, c.lessonId) }))
        .sort(newestFirst);
      const total = (state.lessons[p.courseId] || []).length;
      return { purchase: p, course, lessons, completed: new Set(lessons.map((l) => l.lesson?.id)).size, total, lastAt: lessons[0]?.at || null };
    });

  const lessons = [...classes.flatMap((c) => c.lessons), ...purchases.flatMap((p) => p.lessons)].sort(newestFirst);
  const assignments = (state.assignments || []).filter((a) => a.studentId === studentId).sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));
  const milestones = [
    ...classes.flatMap(({ cls, periods, membership }) => periods.flatMap((p, i) => [
      { kind: "joined", id: `${membership.id}:${i}:in`, at: p.startedAt, cls, again: i > 0 },
      ...(p.endedAt ? [{ kind: "ended", id: `${membership.id}:${i}:out`, at: p.endedAt, cls, reason: p.endReason }] : []),
    ])),
    ...purchases.filter((x) => x.purchase.paidAt).map((x) => ({ kind: "bought", id: `${x.purchase.id}:paid`, at: x.purchase.paidAt, course: x.course, purchase: x.purchase })),
    ...assignments.flatMap((a) => [
      { kind: "assigned", id: `${a.id}:in`, at: a.assignedAt, assignment: a },
      ...(a.completedAt ? [{ kind: "finished", id: `${a.id}:done`, at: a.completedAt, assignment: a }] : []),
    ]),
  ];
  const inClass = classes.reduce((n, c) => n + c.attended, 0);
  const selfPaced = purchases.reduce((n, p) => n + p.lessons.length, 0);
  return {
    classes, purchases, lessons, assignments,
    timeline: [...lessons, ...milestones].sort(newestFirst),
    totals: { taken: inClass + selfPaced, inClass, selfPaced, missed: classes.reduce((n, c) => n + c.missed, 0), lastAt: lessons.find((l) => !l.absent)?.at || null,
      toDo: assignments.filter((a) => a.status === "assigned").length },
  };
}

// THE access rule the student app (and a real backend) enforces — a student
// can open lesson L of course C if they bought C, or they're an active
// member of a class taking C and L has been released to that class.
// Pass the unscoped db state (the server's view, not a teacher's).
export function canOpenLesson(db, studentId, courseId, lessonId) {
  if (db.purchases.some((p) => p.studentId === studentId && p.courseId === courseId && p.status === "paid")) return true;
  return db.memberships.some((m) => {
    if (m.studentId !== studentId || m.status !== "active") return false;
    const entry = db.classes.find((c) => c.id === m.classId)?.courses.find((x) => x.courseId === courseId);
    return !!entry && (entry.releasedLessonIds || []).includes(lessonId);
  });
}

// A class's notes, optionally for one lesson — open ones first, newest on
// top, then the ones the teacher has ticked off.
export function classNotesFor(state, classId, lessonId) {
  const notes = (state.classNotes || [])
    .filter((n) => n.classId === classId && (!lessonId || n.lessonId === lessonId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return [...notes.filter((n) => !n.done), ...notes.filter((n) => n.done)];
}

// What a student receives: the notes a teacher sent to a class the student
// is an active member of — leave the class and they're gone, like its
// lessons. For the student app. Pass the unscoped db state.
export function notesSentToStudent(db, studentId) {
  const classIds = new Set(db.memberships.filter((m) => m.studentId === studentId && m.status === "active").map((m) => m.classId));
  return db.classNotes.filter((n) => n.sharedAt && classIds.has(n.classId)).sort((a, b) => (a.sharedAt < b.sharedAt ? 1 : -1));
}

/* ------------------------------- the student app -------------------------------
   The student-side twin of teacherView: everything the logged-in student's
   API would return, and nothing else. Their own record; their memberships
   and those classes (a class they only asked to join, were invited to, or
   left shows its name, never its content); their purchases and the invites
   sent to their email; the courses they can reach (their classes' courses,
   what they bought, the public catalog) with those courses' lessons; what
   was taught to their classes; the work assigned to them; and only the
   notes sent to them. No other student ever appears. See "The student app"
   in CLAUDE.md. */
export function studentView(db, studentId) {
  const me = db.students.find((s) => s.id === studentId) || null;
  if (!me) return signedOutView(db);
  const memberships = db.memberships.filter((m) => m.studentId === studentId);
  const active = new Set(memberships.filter((m) => m.status === "active").map((m) => m.classId));
  const invitations = db.invitations.filter((i) => i.email === (me.email || "").toLowerCase());
  const known = new Set([...memberships.map((m) => m.classId), ...invitations.filter((i) => i.status === "pending").map((i) => i.classId)]);
  const classes = db.classes.filter((c) => known.has(c.id)).map((c) => (active.has(c.id) ? c
    : { id: c.id, teacherId: c.teacherId, name: c.name, scheduleDays: c.scheduleDays, courses: [], ...(memberships.some((m) => m.classId === c.id) ? { joinToken: c.joinToken } : {}) }));
  const purchases = db.purchases.filter((p) => p.studentId === studentId);
  const courseIds = new Set([
    ...db.classes.filter((c) => active.has(c.id)).flatMap((c) => c.courses.map((x) => x.courseId)),
    ...purchases.map((p) => p.courseId),
    ...db.courses.filter((c) => c.sale?.forSale).map((c) => c.id),
  ]);
  return {
    me,
    students: [me],
    teachers: db.teacherProfiles.map((t) => (t.id === db.teacher.id ? { ...t, name: db.teacher.name } : t)),
    memberships,
    classes,
    purchases,
    invitations,
    courses: db.courses.filter((c) => courseIds.has(c.id)),
    lessons: Object.fromEntries(Object.entries(db.lessons).filter(([courseId]) => courseIds.has(courseId))),
    taughtLessons: db.taughtLessons.filter((t) => active.has(t.classId)),
    classNotes: notesSentToStudent(db, studentId),
    lessonCompletions: db.lessonCompletions.filter((c) => c.studentId === studentId),
    // Work handed to them — not what a teacher took back.
    assignments: db.assignments.filter((a) => a.studentId === studentId && a.status !== "withdrawn"),
    texts: db.texts,
    wordSets: db.wordSets,
    toasts: db.toasts,
  };
}

// Before anyone signs in: the demo accounts the sign-in page offers (a
// stand-in for a real login), each with a hint of what's waiting for them.
export function signedOutView(db) {
  const hint = (s) => {
    const mine = db.memberships.filter((m) => m.studentId === s.id);
    const inClass = mine.filter((m) => m.status === "active").map((m) => db.classes.find((c) => c.id === m.classId)?.name).filter(Boolean);
    if (inClass.length) return `In ${inClass.join(", ")}`;
    const asked = mine.find((m) => m.status === "requested");
    if (asked) return `Asked to join ${db.classes.find((c) => c.id === asked.classId)?.name || "a class"}`;
    const bought = db.purchases.find((p) => p.studentId === s.id && p.status === "paid");
    if (bought) return `Bought ${db.courses.find((c) => c.id === bought.courseId)?.title || "a course"}`;
    return "No class yet";
  };
  return { me: null, accounts: db.students.map((s) => ({ id: s.id, name: s.name, email: s.email, hint: hint(s) })), toasts: db.toasts };
}

// Group bank items (saved Blocks or saved Components) by the course/parent
// they were saved from — every "reuse a saved thing" picker (My Blocks, the
// Add-block dialog, the Component Library) organizes its list the same way,
// so a growing bank reads as folders instead of one flat pile.
export function groupBankByParent(items) {
  const order = [];
  const groups = new Map();
  for (const item of items) {
    const parent = (item.from || "Other").split(" · ")[0] || "Other";
    if (!groups.has(parent)) { groups.set(parent, []); order.push(parent); }
    groups.get(parent).push(item);
  }
  return order.map((parent) => ({ parent, items: groups.get(parent) }));
}

// The part of `from` after the parent (e.g. "Lesson 4") — shown as the
// item's own detail line instead of repeating the parent in every row.
export const bankChildLabel = (item) => (item.from || "").split(" · ").slice(1).join(" · ");

// Lazy-init (passed as useReducer's third arg) so each mount gets a fresh
// deep copy of the seed data instead of sharing one mutable module-level
// object across remounts.
export function createInitialState() {
  return {
    courses: clone(SEED_COURSES),
    lessons: clone(SEED_LESSONS),
    classes: clone(SEED_CLASSES),
    students: clone(SEED_STUDENTS),
    taughtLessons: clone(SEED_TAUGHT_LESSONS),
    classNotes: clone(SEED_CLASS_NOTES),
    memberships: clone(SEED_MEMBERSHIPS),
    purchases: clone(SEED_PURCHASES),
    invitations: clone(SEED_INVITATIONS),
    attendance: clone(SEED_ATTENDANCE),
    lessonCompletions: clone(SEED_LESSON_COMPLETIONS),
    assignments: clone(SEED_ASSIGNMENTS),
    blocks: [],
    texts: clone(SEED_TEXTS),
    wordSets: clone(SEED_WORDSETS),
    componentBank: savedComponentBank(),
    teacher: clone(TEACHER),
    teacherProfiles: clone(TEACHER_PROFILES),
    toasts: [],
  };
}

const firstLessonId = (state, courseId) => (state.lessons[courseId] || [])[0]?.id || null;
// The one-active-course rule: any other in-progress course becomes paused.
const pauseActive = (courses, exceptCourseId) =>
  courses.map((x) => (x.status === "in-progress" && x.courseId !== exceptCourseId ? { ...x, status: "paused" } : x));

const nowIso = () => new Date().toISOString();
const ASSIGNMENT_KINDS = new Set(["block", "task", "wordSet", "reading"]);
const withItem = (list, item) => ((list || []).includes(item) ? list || [] : [...(list || []), item]);
const isBlocked = (state, teacherId, studentId) => state.blocks.some((b) => b.teacherId === teacherId && b.studentId === studentId);
// A short, unambiguous class code (no 0/O, 1/I/L) — what goes in the join link.
function joinToken() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}
// Apply fn to one class's entry for one course.
const mapClassCourse = (classes, classId, courseId, fn) =>
  classes.map((c) => (c.id !== classId ? c : { ...c, courses: c.courses.map((x) => (x.courseId === courseId ? fn(x) : x)) }));
// Make (classId, studentId) an active membership — reactivating an ended or
// declined record rather than duplicating it, so history stays one row. A
// reactivation opens a new period; the earlier stints keep their dates.
const openPeriod = (m, at) => [...membershipPeriods(m), { startedAt: at, endedAt: null, endReason: null }];
const closePeriod = (m, at, endReason) => membershipPeriods(m).map((p) => (p.endedAt ? p : { ...p, endedAt: at, endReason }));
function upsertMembership(memberships, classId, studentId, source) {
  const at = nowIso();
  const existing = memberships.find((m) => m.classId === classId && m.studentId === studentId);
  if (!existing) return [...memberships, { id: uid("mb"), classId, studentId, status: "active", source, requestedAt: null, decidedAt: at, endedAt: null,
    periods: [{ startedAt: at, endedAt: null, endReason: null }] }];
  if (existing.status === "active") return memberships;
  return memberships.map((m) => (m === existing ? { ...m, status: "active", source, decidedAt: at, endedAt: null, periods: openPeriod(m, at) } : m));
}

export function reducer(state, action) {
  switch (action.type) {
    case "ADD_COURSE": {
      const { title, level, hue, templateId } = action;
      const id = uid("c");
      return {
        ...state,
        courses: [...state.courses, { id, title, level, hue, templateId: templateId || "general", students: 0, completion: 0 }],
        lessons: { ...state.lessons, [id]: [] },
      };
    }
    case "ADD_LESSON": {
      const { courseId, title, id } = action;
      const list = state.lessons[courseId] || [];
      const n = list.length + 1;
      const lesson = { id: id || uid("l"), n, title, parts: [], active: 0, progress: 0, current: false, built: [] };
      return { ...state, lessons: { ...state.lessons, [courseId]: [...list, lesson] } };
    }
    case "ENSURE_BUILT": {
      const { courseId, lessonId } = action;
      const list = (state.lessons[courseId] || []).map((l) =>
        l.id === lessonId && !(l.built && l.built.length) ? { ...l, built: lessonBlocks(l) } : l
      );
      return { ...state, lessons: { ...state.lessons, [courseId]: list } };
    }
    case "ADD_PART": {
      const { courseId, lessonId, part } = action;
      const list = state.lessons[courseId].map((l) => {
        if (l.id !== lessonId) return l;
        const b = [...lessonBlocks(l), part];
        return { ...l, built: b, parts: b.map((p) => p.type) };
      });
      return { ...state, lessons: { ...state.lessons, [courseId]: list } };
    }
    case "REMOVE_PART": {
      const { courseId, lessonId, partId } = action;
      const list = state.lessons[courseId].map((l) => {
        if (l.id !== lessonId) return l;
        const b = lessonBlocks(l).filter((p) => p.id !== partId);
        return { ...l, built: b, parts: b.map((p) => p.type) };
      });
      return { ...state, lessons: { ...state.lessons, [courseId]: list } };
    }
    case "MOVE_PART": {
      const { courseId, lessonId, partId, dir } = action;
      const list = state.lessons[courseId].map((l) => {
        if (l.id !== lessonId) return l;
        const b = [...lessonBlocks(l)];
        const i = b.findIndex((p) => p.id === partId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= b.length) return l;
        [b[i], b[j]] = [b[j], b[i]];
        return { ...l, built: b, parts: b.map((p) => p.type) };
      });
      return { ...state, lessons: { ...state.lessons, [courseId]: list } };
    }
    case "UPDATE_PART": {
      const { courseId, lessonId, partId, patch } = action;
      const list = state.lessons[courseId].map((l) => {
        if (l.id !== lessonId) return l;
        const b = lessonBlocks(l).map((p) => (p.id === partId ? { ...p, ...patch } : p));
        return { ...l, built: b, parts: b.map((p) => p.type) };
      });
      return { ...state, lessons: { ...state.lessons, [courseId]: list } };
    }
    case "ADD_TEXT": {
      const { text } = action;
      return { ...state, texts: [{ ...text, id: uid("t") }, ...state.texts] };
    }
    // Hand work to one or more students — one `assignments` row each. Only
    // students in one of the teacher's classes right now; a block or task
    // keeps its own snapshot (`content`), copied per student.
    case "ASSIGN_WORK": {
      const { studentIds, item } = action;
      if (!item?.title || !ASSIGNMENT_KINDS.has(item.kind)) return state;
      const me = state.teacher.id;
      const mine = new Set(state.classes.filter((c) => c.teacherId === me).map((c) => c.id));
      const allowed = new Set(state.memberships.filter((m) => mine.has(m.classId) && m.status === "active").map((m) => m.studentId));
      const at = nowIso();
      const rows = [...new Set(studentIds || [])].filter((id) => allowed.has(id)).map((studentId) => ({
        id: uid("as"), teacherId: me, studentId, kind: item.kind, title: item.title,
        blockType: item.blockType || null, componentKind: item.componentKind || null,
        source: { ...(item.source || {}) }, content: item.content ? clone(item.content) : null,
        assignedAt: at, status: "assigned", completedAt: null, withdrawnAt: null,
      }));
      return rows.length ? { ...state, assignments: [...state.assignments, ...rows] } : state;
    }
    // Take back work the student hasn't done yet. The row stays, as history.
    case "WITHDRAW_ASSIGNMENT":
      return { ...state, assignments: state.assignments.map((a) => (a.id === action.assignmentId && a.status === "assigned" && a.teacherId === state.teacher.id
        ? { ...a, status: "withdrawn", withdrawnAt: nowIso() } : a)) };
    case "SET_WORD_STATUS": {
      const { studentId, term, status } = action;
      const students = state.students.map((s) => {
        if (s.id !== studentId) return s;
        return { ...s, words: s.words.map((wd) => (wd.term === term ? { ...wd, status } : wd)) };
      });
      return { ...state, students };
    }
    case "SAVE_NOTE": {
      const { studentId, note } = action;
      const students = state.students.map((s) => {
        if (s.id !== studentId) return s;
        // new words from the note drop into the student's vocab list (as weak)
        const newWords = (note.newWords || []).map((t) => ({
          term: t, az: "—", def: "added from lesson notes", example: "", status: "weak",
          source: `Note · ${note.date}`, daysAgo: 0, dueInDays: 0,
        }));
        const existing = new Set(s.words.map((wd) => wd.term));
        const merged = [...newWords.filter((wd) => !existing.has(wd.term)), ...s.words];
        return { ...s, notes: [{ ...note, id: uid("n"), saved: true }, ...(s.notes || [])], words: merged };
      });
      return { ...state, students };
    }
    case "SAVE_COMPONENT_TO_BANK": {
      const { component, title, from } = action;
      const snapshot = {
        id: uid("cb"),
        title: title || component.title || "Saved Component",
        kind: component.kind,
        from: from || "—",
        data: JSON.parse(JSON.stringify(component)),
      };
      return { ...state, componentBank: [snapshot, ...(state.componentBank || [])] };
    }
    case "REMOVE_COMPONENT_FROM_BANK":
      return { ...state, componentBank: (state.componentBank || []).filter((c) => c.id !== action.bankId) };
    /* ---------------- classes, students & access (teacher side) ----------------
       Each action below is one call a real backend would expose — the
       payload is exactly the request body, and the reducer applies the
       same rules the server would (so swapping this for fetches changes
       nothing a view sees). Times are stamped here, as the server would.
       Full model: "Students, classes & access" in CLAUDE.md.

       Class progress
         ADD_CLASS                POST   /classes                                    { name, scheduleDays, courseId? }
         ASSIGN_CLASS_COURSE      POST   /classes/:classId/courses                   { courseId }
         SET_CLASS_COURSE_STATUS  PATCH  /classes/:classId/courses/:courseId         { status }
         SET_CLASS_CURRENT_LESSON PATCH  /classes/:classId/courses/:courseId         { currentLessonId }
         MARK_LESSON_TAUGHT       POST   /classes/:classId/courses/:courseId/taught-lessons  { lessonId }  (also releases it)
         SET_LESSON_RELEASED      PUT    /classes/:classId/courses/:courseId/released/:lessonId  { released }
         SET_ATTENDANCE           PUT    /taught-lessons/:taughtLessonId/attendance/:studentId  { status: present | absent }
       Class notes (private to the teacher until sent)
         ADD_CLASS_NOTE           POST   /classes/:classId/notes                     { courseId, lessonId, text }
         UPDATE_CLASS_NOTE        PATCH  /class-notes/:noteId                        { text?, done? }
         SHARE_CLASS_NOTES        POST   /classes/:classId/notes/share               { noteIds, shared }
         REMOVE_CLASS_NOTE        DELETE /class-notes/:noteId
       Assigning work to students
         ASSIGN_WORK              POST   /assignments                                { studentIds, kind, title, blockType?, componentKind?, source, content? }
         WITHDRAW_ASSIGNMENT      PATCH  /assignments/:assignmentId                  { status: withdrawn }
       Joining a class
         REGENERATE_JOIN_TOKEN    POST   /classes/:classId/join-token                (old link stops working)
         SET_CLASS_JOINING        PATCH  /classes/:classId                           { joinOpen }
         CREATE_INVITATION        POST   /classes/:classId/invitations               { email, name? }
         REVOKE_INVITATION        DELETE /invitations/:invitationId
         DECIDE_MEMBERSHIP        PATCH  /memberships/:membershipId                  { status: active | declined }
         ADD_CLASS_MEMBER         POST   /classes/:classId/members                   { studentId }  (teacher adds one of their students)
         REMOVE_CLASS_MEMBER      PATCH  /memberships/:membershipId                  { status: removed }
         BLOCK_STUDENT            POST   /blocks                                     { studentId }
         UNBLOCK_STUDENT          DELETE /blocks/:studentId
       Selling a course (self-paced)
         UPDATE_COURSE_SALE       PATCH  /courses/:courseId                          { sale }
         DECIDE_PURCHASE          PATCH  /purchases/:purchaseId                      { status: paid | declined }
       Student side (dispatched by the student app, student/)
         REGISTER_STUDENT         POST   /students                                   { name, email }  (sign up)
         REQUEST_TO_JOIN          POST   /join                                       { token, message? }
         ACCEPT_INVITATION        POST   /invitations/:invitationId/accept
         REQUEST_PURCHASE         POST   /courses/:courseId/purchases                { message? }
         COMPLETE_LESSON          POST   /me/courses/:courseId/lessons/:lessonId/completion
         COMPLETE_ASSIGNMENT      POST   /me/assignments/:assignmentId/complete
       Reads (selectors below the reducer's inputs, same shapes)
         classCourseProgress      GET    /classes/:classId/courses/:courseId
         teacherRoster            GET    /students  (grouped)
         studentHistory           GET    /students/:studentId/history

       Server-side rules mirrored here: at most one "in-progress" course per
       class (activating one pauses the other); teaching a lesson logs it,
       releases it, and moves "next up" past it (never backwards); a class
       link only ever creates a *request* (the teacher accepts), while an
       email invite, chosen by the teacher, admits directly; a blocked
       student can't request again; a closed class takes no requests; a
       note belongs to a class taking the course, never to the course;
       re-adding a former member opens a new membership period (old stints
       keep their dates); only a student who was in the class when a lesson
       was taught can be marked absent from it. */
    case "ADD_CLASS": {
      const { courseId, name, scheduleDays } = action;
      const cls = { id: uid("cls"), teacherId: state.teacher.id, name, scheduleDays: scheduleDays || [],
        joinToken: joinToken(), joinOpen: true,
        courses: courseId ? [{ courseId, currentLessonId: firstLessonId(state, courseId), status: "in-progress", releasedLessonIds: [] }] : [] };
      return { ...state, classes: [...state.classes, cls] };
    }
    // Adds a course to the class's history and makes it the active one; a
    // course already in progress is paused (not finished), so it can be
    // resumed later. No-op if the course is already in the history.
    case "ASSIGN_CLASS_COURSE": {
      const { classId, courseId } = action;
      const classes = state.classes.map((c) => {
        if (c.id !== classId || c.courses.some((x) => x.courseId === courseId)) return c;
        return { ...c, courses: [...pauseActive(c.courses), { courseId, currentLessonId: firstLessonId(state, courseId), status: "in-progress", releasedLessonIds: [] }] };
      });
      return { ...state, classes };
    }
    // done / in-progress / paused. Making one in-progress (resume, reopen)
    // pauses whichever other course was active.
    case "SET_CLASS_COURSE_STATUS": {
      const { classId, courseId, status } = action;
      const classes = state.classes.map((c) => {
        if (c.id !== classId) return c;
        const courses = status === "in-progress" ? pauseActive(c.courses, courseId) : c.courses;
        return { ...c, courses: courses.map((x) => (x.courseId === courseId ? { ...x, status } : x)) };
      });
      return { ...state, classes };
    }
    // The teacher's manual correction of "next up".
    case "SET_CLASS_CURRENT_LESSON": {
      const { classId, courseId, lessonId } = action;
      return { ...state, classes: mapClassCourse(state.classes, classId, courseId, (x) => ({ ...x, currentLessonId: lessonId })) };
    }
    // A lesson was taught to a class (the teacher finished the lesson, or
    // pressed "Mark as taught"): log it, release it to the class's students,
    // and move "next up" to the lesson after it — unless the class is
    // already further along (re-teaching an earlier lesson as a review
    // never drags the class back). Teaching a course also makes it the
    // class's active one.
    case "MARK_LESSON_TAUGHT": {
      const { classId, courseId, lessonId } = action;
      const lessons = state.lessons[courseId] || [];
      const taughtIdx = lessons.findIndex((l) => l.id === lessonId);
      if (taughtIdx < 0) return state;
      const classes = state.classes.map((c) => {
        if (c.id !== classId) return c;
        // Reviewing a finished course doesn't take over from the active one.
        const done = c.courses.find((x) => x.courseId === courseId)?.status === "done";
        const courses = (done ? c.courses : pauseActive(c.courses, courseId)).map((x) => {
          if (x.courseId !== courseId) return x;
          const curIdx = lessons.findIndex((l) => l.id === x.currentLessonId);
          const nextIdx = Math.min(Math.max(curIdx, taughtIdx + 1), lessons.length - 1);
          return { ...x, status: x.status === "done" ? "done" : "in-progress", currentLessonId: lessons[nextIdx].id,
            releasedLessonIds: withItem(x.releasedLessonIds, lessonId) };
        });
        return { ...c, courses };
      });
      const entry = { id: uid("tl"), classId, courseId, lessonId, taughtAt: action.taughtAt || nowIso() };
      return { ...state, classes, taughtLessons: [...state.taughtLessons, entry] };
    }
    // Share a lesson with the class's students (or take it back). Students
    // in a class only ever see released lessons.
    case "SET_LESSON_RELEASED": {
      const { classId, courseId, lessonId, released } = action;
      return { ...state, classes: mapClassCourse(state.classes, classId, courseId, (x) => ({
        ...x, releasedLessonIds: released ? withItem(x.releasedLessonIds, lessonId) : (x.releasedLessonIds || []).filter((id) => id !== lessonId),
      })) };
    }

    // Mark a student present or absent for one taught lesson. Only someone
    // who was in the class when it was taught can be marked.
    case "SET_ATTENDANCE": {
      const { taughtLessonId, studentId, status } = action;
      if (status !== "present" && status !== "absent") return state;
      const t = state.taughtLessons.find((x) => x.id === taughtLessonId);
      const m = t && state.memberships.find((x) => x.classId === t.classId && x.studentId === studentId);
      if (!m || !inPeriods(membershipPeriods(m), t.taughtAt)) return state;
      const row = { taughtLessonId, studentId, status, markedAt: nowIso() };
      const rest = state.attendance.filter((a) => !(a.taughtLessonId === taughtLessonId && a.studentId === studentId));
      return { ...state, attendance: [...rest, row] };
    }

    /* class notes */
    // A note on one lesson, owned by the class — only for a course the
    // class is actually taking, so notes never end up on the course itself.
    case "ADD_CLASS_NOTE": {
      const { classId, courseId, lessonId, text } = action;
      const clean = (text || "").trim();
      const cls = state.classes.find((c) => c.id === classId);
      if (!clean || !cls?.courses.some((x) => x.courseId === courseId)) return state;
      if (!(state.lessons[courseId] || []).some((l) => l.id === lessonId)) return state;
      const at = nowIso();
      const note = { id: uid("cn"), classId, courseId, lessonId, text: clean, done: false, sharedAt: null, createdAt: at, updatedAt: at };
      return { ...state, classNotes: [...state.classNotes, note] };
    }
    // Edit the text and/or tick it off. An empty edit keeps the old text.
    case "UPDATE_CLASS_NOTE": {
      const { noteId, text, done } = action;
      return { ...state, classNotes: state.classNotes.map((n) => {
        if (n.id !== noteId) return n;
        const clean = text === undefined ? n.text : text.trim() || n.text;
        return { ...n, text: clean, done: done === undefined ? n.done : !!done, updatedAt: nowIso() };
      }) };
    }
    // Send notes to the class's students (or take them back). Sending again
    // keeps the first send time.
    case "SHARE_CLASS_NOTES": {
      const { classId, noteIds, shared } = action;
      const ids = new Set(noteIds || []);
      const at = nowIso();
      return { ...state, classNotes: state.classNotes.map((n) => (n.classId === classId && ids.has(n.id)
        ? { ...n, sharedAt: shared ? n.sharedAt || at : null } : n)) };
    }
    case "REMOVE_CLASS_NOTE":
      return { ...state, classNotes: state.classNotes.filter((n) => n.id !== action.noteId) };

    /* joining a class */
    case "REGENERATE_JOIN_TOKEN": {
      const { classId } = action;
      return { ...state, classes: state.classes.map((c) => (c.id === classId ? { ...c, joinToken: joinToken() } : c)) };
    }
    case "SET_CLASS_JOINING": {
      const { classId, joinOpen } = action;
      return { ...state, classes: state.classes.map((c) => (c.id === classId ? { ...c, joinOpen } : c)) };
    }
    case "CREATE_INVITATION": {
      const { classId, email, name } = action;
      const at = nowIso();
      const clean = (email || "").trim().toLowerCase();
      if (!clean || state.invitations.some((i) => i.classId === classId && i.email === clean && i.status === "pending")) return state;
      const inv = { id: uid("inv"), classId, email: clean, name: (name || "").trim() || null, status: "pending",
        createdAt: at, expiresAt: new Date(Date.parse(at) + 14 * 864e5).toISOString() };
      return { ...state, invitations: [...state.invitations, inv] };
    }
    case "REVOKE_INVITATION":
      return { ...state, invitations: state.invitations.map((i) => (i.id === action.invitationId ? { ...i, status: "revoked" } : i)) };
    // Accept or decline a request that came in with the class link/code.
    case "DECIDE_MEMBERSHIP": {
      const { membershipId, status } = action;
      if (status !== "active" && status !== "declined") return state;
      const at = nowIso();
      return { ...state, memberships: state.memberships.map((m) => (m.id === membershipId && m.status === "requested"
        ? { ...m, status, decidedAt: at, ...(status === "active" ? { periods: openPeriod(m, at) } : {}) } : m)) };
    }
    // The teacher puts one of their own students into a class directly (the
    // "+" on a class). Re-adding a former member reactivates their record.
    case "ADD_CLASS_MEMBER": {
      const { classId, studentId } = action;
      return { ...state, memberships: upsertMembership(state.memberships, classId, studentId, "teacher") };
    }
    // Out of the class: history stays (they read as a former student).
    case "REMOVE_CLASS_MEMBER": {
      const { classId, studentId } = action;
      const at = nowIso();
      return { ...state, memberships: state.memberships.map((m) => (m.classId === classId && m.studentId === studentId && m.status === "active"
        ? { ...m, status: "removed", endedAt: at, periods: closePeriod(m, at, "removed") } : m)) };
    }
    // No more requests from this student; any pending ones are declined.
    case "BLOCK_STUDENT": {
      const { studentId } = action;
      const me = state.teacher.id;
      if (state.blocks.some((b) => b.teacherId === me && b.studentId === studentId)) return state;
      const mine = new Set(state.classes.filter((c) => c.teacherId === me).map((c) => c.id));
      const myCourses = new Set(state.courses.filter((c) => c.teacherId === me).map((c) => c.id));
      return {
        ...state,
        blocks: [...state.blocks, { teacherId: me, studentId, createdAt: nowIso() }],
        memberships: state.memberships.map((m) => (mine.has(m.classId) && m.studentId === studentId && m.status === "requested" ? { ...m, status: "declined", decidedAt: nowIso() } : m)),
        purchases: state.purchases.map((p) => (myCourses.has(p.courseId) && p.studentId === studentId && p.status === "requested" ? { ...p, status: "declined" } : p)),
      };
    }
    case "UNBLOCK_STUDENT":
      return { ...state, blocks: state.blocks.filter((b) => !(b.teacherId === state.teacher.id && b.studentId === action.studentId)) };

    /* selling a course */
    case "UPDATE_COURSE_SALE": {
      const { courseId, sale } = action;
      return { ...state, courses: state.courses.map((c) => (c.id === courseId ? { ...c, sale: { ...c.sale, ...sale } } : c)) };
    }
    // The teacher confirms a purchase paid outside the app (or declines it).
    case "DECIDE_PURCHASE": {
      const { purchaseId, status } = action;
      if (status !== "paid" && status !== "declined") return state;
      return { ...state, purchases: state.purchases.map((p) => (p.id === purchaseId && p.status === "requested"
        ? { ...p, status, paidAt: status === "paid" ? nowIso() : null, confirmedBy: status === "paid" ? state.teacher.id : null } : p)) };
    }

    /* student side — dispatched by the student app (student/) */
    // Sign up: a new student account, nothing else. No teacher sees it until
    // the student asks to join a class or buys a course (the visibility
    // rule). One account per email.
    case "REGISTER_STUDENT": {
      const name = (action.name || "").trim();
      const email = (action.email || "").trim().toLowerCase();
      if (!name || !email || state.students.some((s) => (s.email || "").toLowerCase() === email)) return state;
      return { ...state, students: [...state.students, { id: uid("s"), name, email, level: "", goal: "", notes: [], createdAt: nowIso() }] };
    }
    case "REQUEST_TO_JOIN": {
      const { token, studentId, message } = action;
      const cls = state.classes.find((c) => c.joinToken === token);
      if (!cls || !cls.joinOpen || isBlocked(state, cls.teacherId, studentId)) return state;
      // One row per (class, student): a former or declined member asking
      // again reuses theirs, so earlier stints stay attached to it.
      const existing = state.memberships.find((m) => m.classId === cls.id && m.studentId === studentId);
      if (existing?.status === "active") return state;
      if (existing?.status === "requested") return { ...state, memberships: state.memberships.map((m) => (m === existing ? { ...m, message: message || m.message } : m)) };
      if (existing) return { ...state, memberships: state.memberships.map((m) => (m === existing
        ? { ...m, status: "requested", source: "code", requestedAt: nowIso(), message: message || "" } : m)) };
      return { ...state, memberships: [...state.memberships, { id: uid("mb"), classId: cls.id, studentId, status: "requested", source: "code",
        requestedAt: nowIso(), decidedAt: null, endedAt: null, periods: [], message: message || "" }] };
    }
    case "ACCEPT_INVITATION": {
      const { invitationId, studentId } = action;
      const inv = state.invitations.find((i) => i.id === invitationId);
      if (!inv || inv.status !== "pending" || inv.expiresAt < nowIso()) return state;
      return {
        ...state,
        invitations: state.invitations.map((i) => (i.id === invitationId ? { ...i, status: "accepted", acceptedAt: nowIso(), studentId } : i)),
        memberships: upsertMembership(state.memberships, inv.classId, studentId, "invite"),
      };
    }
    case "REQUEST_PURCHASE": {
      const { courseId, studentId, message } = action;
      const course = state.courses.find((c) => c.id === courseId);
      if (!course?.sale?.forSale || isBlocked(state, course.teacherId, studentId)) return state;
      if (state.purchases.some((p) => p.courseId === courseId && p.studentId === studentId && (p.status === "paid" || p.status === "requested"))) return state;
      return { ...state, purchases: [...state.purchases, { id: uid("pu"), courseId, studentId, status: "requested", amount: course.sale.price,
        currency: course.sale.currency, method: "external", requestedAt: nowIso(), paidAt: null, confirmedBy: null, message: message || "" }] };
    }
    // A student finished a lesson in the student app. Only a lesson they can
    // open (canOpenLesson); finishing it again is a no-op.
    case "COMPLETE_LESSON": {
      const { studentId, courseId, lessonId } = action;
      if (!canOpenLesson(state, studentId, courseId, lessonId)) return state;
      if (state.lessonCompletions.some((c) => c.studentId === studentId && c.lessonId === lessonId && c.courseId === courseId)) return state;
      return { ...state, lessonCompletions: [...state.lessonCompletions, { id: uid("lc"), studentId, courseId, lessonId, completedAt: nowIso() }] };
    }
    // A student finished work assigned to them (their own, still open).
    case "COMPLETE_ASSIGNMENT": {
      const { assignmentId, studentId } = action;
      return { ...state, assignments: state.assignments.map((a) => (a.id === assignmentId && a.studentId === studentId && a.status === "assigned"
        ? { ...a, status: "done", completedAt: nowIso() } : a)) };
    }
    case "UPDATE_TEACHER_PROFILE":
      return { ...state, teacher: { ...state.teacher, ...action.patch } };
    case "SET_TEACHER_2FA":
      return { ...state, teacher: { ...state.teacher, twoFactorEnabled: action.enabled } };
    // Another open tab (the teacher app or the student app) changed the data:
    // take its copy, the way a client applies a server push (see
    // db/mockSync.js). Toasts are this tab's own and stay.
    case "SYNC_STATE":
      return { ...state, ...action.db, toasts: state.toasts };
    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts, { id: action.id, text: action.text, tone: action.tone || "ok" }] };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}
