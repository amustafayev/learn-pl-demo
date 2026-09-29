import {
  SEED_COURSES, SEED_LESSONS, SEED_STUDENTS, SEED_TEXTS, SEED_WORDSETS, SEED_BLOCK_BANK, SEED_COMPONENT_BANK, SEED_CLASSES,
  SEED_TAUGHT_LESSONS,
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

// Which course a student is studying — derived from their class's active
// course, never stored on the student (it would go stale the moment the
// class's course changes).
export const studentCourseId = (state, student) =>
  activeClassCourse(state.classes.find((c) => c.id === student?.classId))?.courseId || null;

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
  return {
    entry, lessons, taughtAt, taughtCount, total: lessons.length, last, allTaught,
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
    // A teacher's own running scratchpad for one lesson — separate from the
    // AI-drafted per-student notes on the student page (Notes tab); this is
    // just plain text, autosaved as the teacher types while building or
    // teaching the lesson.
    case "UPDATE_LESSON_NOTES": {
      const { courseId, lessonId, notes } = action;
      const list = (state.lessons[courseId] || []).map((l) => (l.id === lessonId ? { ...l, teacherNotes: notes } : l));
      return { ...state, lessons: { ...state.lessons, [courseId]: list } };
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
    /* ---------------- classes (teacher side) ----------------
       Each action below is one call a real backend would expose — the
       payload is exactly the request body, and the reducer applies the
       same rules the server would (so swapping this for fetches changes
       nothing a view sees):

         ADD_CLASS                POST   /classes                              { name, scheduleDays, courseId? }
         ASSIGN_CLASS_COURSE      POST   /classes/:classId/courses             { courseId }
         SET_CLASS_COURSE_STATUS  PATCH  /classes/:classId/courses/:courseId   { status }
         SET_CLASS_CURRENT_LESSON PATCH  /classes/:classId/courses/:courseId   { currentLessonId }
         MARK_LESSON_TAUGHT       POST   /classes/:classId/courses/:courseId/taught-lessons  { lessonId, taughtAt }
         SET_STUDENT_CLASS        PATCH  /students/:studentId                  { classId }  (null = leave the class)

       Server-side rules mirrored here: at most one "in-progress" course
       per class (activating one pauses the other); teaching a lesson
       appends to the log and moves "next up" past it, never backwards. */
    case "ADD_CLASS": {
      const { courseId, name, scheduleDays } = action;
      const cls = { id: uid("cls"), name, scheduleDays: scheduleDays || [],
        courses: courseId ? [{ courseId, currentLessonId: firstLessonId(state, courseId), status: "in-progress" }] : [] };
      return { ...state, classes: [...state.classes, cls] };
    }
    // Adds a course to the class's history and makes it the active one; a
    // course already in progress is paused (not finished), so it can be
    // resumed later. No-op if the course is already in the history.
    case "ASSIGN_CLASS_COURSE": {
      const { classId, courseId } = action;
      const classes = state.classes.map((c) => {
        if (c.id !== classId || c.courses.some((x) => x.courseId === courseId)) return c;
        return { ...c, courses: [...pauseActive(c.courses), { courseId, currentLessonId: firstLessonId(state, courseId), status: "in-progress" }] };
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
      const classes = state.classes.map((c) => (c.id !== classId ? c :
        { ...c, courses: c.courses.map((x) => (x.courseId === courseId ? { ...x, currentLessonId: lessonId } : x)) }));
      return { ...state, classes };
    }
    // A lesson was taught to a class (a live lesson ended, or the teacher
    // pressed "Mark as taught"): log it, and move "next up" to the lesson
    // after it — unless the class is already further along (re-teaching an
    // earlier lesson as a review never drags the class back). Teaching a
    // course also makes it the class's active one.
    case "MARK_LESSON_TAUGHT": {
      const { classId, courseId, lessonId, taughtAt } = action;
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
          return { ...x, status: x.status === "done" ? "done" : "in-progress", currentLessonId: lessons[nextIdx].id };
        });
        return { ...c, courses };
      });
      const entry = { id: uid("tl"), classId, courseId, lessonId, taughtAt };
      return { ...state, classes, taughtLessons: [...(state.taughtLessons || []), entry] };
    }
    // Membership is the student's classId alone — the roster and the
    // student's course are derived from it (see studentCourseId).
    case "SET_STUDENT_CLASS": {
      const { studentId, classId } = action;
      const students = state.students.map((s) => (s.id === studentId ? { ...s, classId: classId || null } : s));
      return { ...state, students };
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
