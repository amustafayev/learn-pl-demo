import {
  SEED_COURSES, SEED_LESSONS, SEED_STUDENTS, SEED_TEXTS, SEED_WORDSETS, SEED_BLOCK_BANK, SEED_COMPONENT_BANK, SEED_CLASSES,
  SEED_TAUGHT_LESSONS, SEED_CLASS_NOTES, SEED_MEMBERSHIPS, SEED_PURCHASES, SEED_INVITATIONS,
  TEACHER, BLOCK_TYPES, LESSON_TEMPLATES,
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
  return {
    ...db,
    courses,
    lessons: Object.fromEntries(Object.entries(db.lessons).filter(([courseId]) => courseIds.has(courseId))),
    classes,
    memberships,
    purchases,
    invitations: db.invitations.filter((i) => classIds.has(i.classId)),
    blocks,
    taughtLessons: db.taughtLessons.filter((t) => classIds.has(t.classId)),
    classNotes: db.classNotes.filter((n) => classIds.has(n.classId)),
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
  const wasMember = (studentId) => state.memberships.some((m) => m.studentId === studentId && (ENDED.has(m.status) || m.status === "active"));
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
    blocks: [],
    texts: clone(SEED_TEXTS),
    wordSets: clone(SEED_WORDSETS),
    blockBank: clone(SEED_BLOCK_BANK),
    componentBank: savedComponentBank(),
    teacher: clone(TEACHER),
    toasts: [],
  };
}

const firstLessonId = (state, courseId) => (state.lessons[courseId] || [])[0]?.id || null;
// The one-active-course rule: any other in-progress course becomes paused.
const pauseActive = (courses, exceptCourseId) =>
  courses.map((x) => (x.status === "in-progress" && x.courseId !== exceptCourseId ? { ...x, status: "paused" } : x));

const nowIso = () => new Date().toISOString();
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
// declined record rather than duplicating it, so history stays one row.
function upsertMembership(memberships, classId, studentId, source) {
  const at = nowIso();
  const existing = memberships.find((m) => m.classId === classId && m.studentId === studentId);
  if (!existing) return [...memberships, { id: uid("mb"), classId, studentId, status: "active", source, requestedAt: null, decidedAt: at, endedAt: null }];
  if (existing.status === "active") return memberships;
  return memberships.map((m) => (m === existing ? { ...m, status: "active", source, decidedAt: at, endedAt: null } : m));
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
    case "ASSIGN": {
      // attach an assignment + activity entry to each target student
      const { studentIds, what, kind } = action;
      const set = new Set(studentIds);
      const students = state.students.map((s) => {
        if (!set.has(s.id)) return s;
        const assignment = { id: uid("as"), what, kind, when: "just now", status: "assigned" };
        const activity = [{ type: kind === "reading" ? "reading" : kind === "vocabulary" ? "word" : "lesson", detail: `Assigned: ${what}`, when: "just now" }, ...(s.activity || [])];
        return { ...s, assignments: [assignment, ...(s.assignments || [])], activity };
      });
      return { ...state, students };
    }
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
    case "SAVE_BLOCK_TO_BANK": {
      // snapshot a block (deep copy) into the teacher's reusable bank
      const { block, from } = action;
      const snapshot = {
        id: uid("bb"), type: block.type, title: block.title || block.type, from: from || "—",
        content: JSON.parse(JSON.stringify(block.content || { components: [] })),
      };
      return { ...state, blockBank: [snapshot, ...state.blockBank] };
    }
    case "REMOVE_FROM_BANK":
      return { ...state, blockBank: state.blockBank.filter((b) => b.id !== action.bankId) };
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
    case "BUILD_RECAP_LESSON": {
      // assemble a brand-new lesson from every My-Blocks item compatible with
      // the student's course template, deep-copied so it's independent of
      // the saved originals, and assign it straight to that student.
      // `contents` (bank id → content) carries copies the caller already
      // made where that needs async work (their own H5P content).
      const { studentId, focusLabel, contents } = action;
      const student = state.students.find((s) => s.id === studentId);
      const courseId = studentCourseId(state, student);
      if (!student || !courseId) return state;
      const course = state.courses.find((c) => c.id === courseId);
      const templateTypes = LESSON_TEMPLATES[course?.templateId]?.blockTypes || LESSON_TEMPLATES.general.blockTypes;
      const compatible = state.blockBank.filter((b) => templateTypes.includes(b.type));
      if (!compatible.length) return state;
      const list = state.lessons[courseId] || [];
      const built = compatible.map((item) => {
        const content = JSON.parse(JSON.stringify(contents?.[item.id] || item.content || { components: [] }));
        content.components = (content.components || []).map((c) => ({ ...c, id: uid("c") }));
        return { id: uid("p"), type: item.type, title: item.title, meta: "from My Blocks", content };
      });
      const lesson = { id: uid("l"), n: list.length + 1, title: `Recap: ${focusLabel}`, parts: built.map((p) => p.type), built, active: 0, progress: 0, current: false };
      const students = state.students.map((s) => (s.id === studentId ? { ...s, extraLessons: [...(s.extraLessons || []), lesson.id] } : s));
      return { ...state, lessons: { ...state.lessons, [courseId]: [...list, lesson] }, students };
    }
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
       Class notes (private to the teacher until sent)
         ADD_CLASS_NOTE           POST   /classes/:classId/notes                     { courseId, lessonId, text }
         UPDATE_CLASS_NOTE        PATCH  /class-notes/:noteId                        { text?, done? }
         SHARE_CLASS_NOTES        POST   /classes/:classId/notes/share               { noteIds, shared }
         REMOVE_CLASS_NOTE        DELETE /class-notes/:noteId
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
       Student side (dispatched by the student app — not built yet)
         REQUEST_TO_JOIN          POST   /join                                       { token, message? }
         ACCEPT_INVITATION        POST   /invitations/:invitationId/accept
         REQUEST_PURCHASE         POST   /courses/:courseId/purchases                { message? }

       Server-side rules mirrored here: at most one "in-progress" course per
       class (activating one pauses the other); teaching a lesson logs it,
       releases it, and moves "next up" past it (never backwards); a class
       link only ever creates a *request* (the teacher accepts), while an
       email invite, chosen by the teacher, admits directly; a blocked
       student can't request again; a closed class takes no requests; a
       note belongs to a class taking the course, never to the course. */
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
    // A lesson was taught to a class (a live lesson ended, or the teacher
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
      return { ...state, memberships: state.memberships.map((m) => (m.id === membershipId && m.status === "requested" ? { ...m, status, decidedAt: nowIso() } : m)) };
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
      return { ...state, memberships: state.memberships.map((m) => (m.classId === classId && m.studentId === studentId && m.status === "active"
        ? { ...m, status: "removed", endedAt: nowIso() } : m)) };
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

    /* student side — for the student app (not built yet) */
    case "REQUEST_TO_JOIN": {
      const { token, studentId, message } = action;
      const cls = state.classes.find((c) => c.joinToken === token);
      if (!cls || !cls.joinOpen || isBlocked(state, cls.teacherId, studentId)) return state;
      const existing = state.memberships.find((m) => m.classId === cls.id && m.studentId === studentId && (m.status === "active" || m.status === "requested"));
      if (existing?.status === "active") return state;
      if (existing) return { ...state, memberships: state.memberships.map((m) => (m === existing ? { ...m, message: message || m.message } : m)) };
      return { ...state, memberships: [...state.memberships, { id: uid("mb"), classId: cls.id, studentId, status: "requested", source: "code",
        requestedAt: nowIso(), decidedAt: null, endedAt: null, message: message || "" }] };
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
    case "SET_RECORDING_SUMMARY": {
      // written when a teacher ends a recorded live lesson and drafts notes —
      // an AI-generated summary of that session, surfaced in the student's
      // AI Insights tab.
      const { studentId, recording } = action;
      const students = state.students.map((s) => (s.id === studentId ? { ...s, lastRecording: recording } : s));
      return { ...state, students };
    }
    case "UPDATE_TEACHER_PROFILE":
      return { ...state, teacher: { ...state.teacher, ...action.patch } };
    case "SET_TEACHER_2FA":
      return { ...state, teacher: { ...state.teacher, twoFactorEnabled: action.enabled } };
    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts, { id: action.id, text: action.text, tone: action.tone || "ok" }] };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}
