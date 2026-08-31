import {
  SEED_COURSES, SEED_LESSONS, SEED_STUDENTS, SEED_TEXTS, SEED_WORDSETS, SEED_BLOCK_BANK, SEED_COMPONENT_BANK, SEED_KITS, SEED_CLASSES,
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
let seq = 1000;
export const uid = (p) => `${p}${++seq}`;
export const COMPONENT_BANK_KEY = "lucid.component-bank";

function savedComponentBank() {
  try {
    const saved = window.localStorage.getItem(COMPONENT_BANK_KEY);
    return saved ? JSON.parse(saved) : clone(SEED_COMPONENT_BANK);
  } catch {
    return clone(SEED_COMPONENT_BANK);
  }
}

// Blocks for a lesson — hydrated from the shorthand `parts` list (an array
// of Block-type ids) the first time it's touched, or the live `built` array
// afterwards. Exported so any view that just needs to preview a lesson's
// pathway (Course tree, Live Session setup) can reuse the same hydration
// logic instead of re-deriving it locally.
export const lessonBlocks = (l) =>
  !l ? [] : l.built && l.built.length
    ? l.built
    : (l.parts || []).map((t) => ({ id: uid("p"), type: t, title: BLOCK_TYPES[t]?.label || t, meta: "—" }));

// A class's `courses` is its assignment history (see SEED_CLASSES); the
// student-facing/live-session views only care about the one it's actively
// studying right now.
export const activeClassCourse = (cls) => (cls?.courses || []).find((c) => c.status === "in-progress") || null;

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

// Resolve a Kit's referenced block/component ids into their current titles
// — since a Kit only stores ids, this always reflects the bank's latest
// state (rename a saved block and every kit using it updates automatically).
export function kitContents(kit, blockBank, componentBank) {
  const blocks = (kit.blockIds || []).map((id) => blockBank.find((b) => b.id === id)).filter(Boolean);
  const components = (kit.componentIds || []).map((id) => componentBank.find((c) => c.id === id)).filter(Boolean);
  return { blocks, components, count: blocks.length + components.length };
}

// Lazy-init (passed as useReducer's third arg) so each mount gets a fresh
// deep copy of the seed data instead of sharing one mutable module-level
// object across remounts.
export function createInitialState() {
  return {
    courses: clone(SEED_COURSES),
    lessons: clone(SEED_LESSONS),
    classes: clone(SEED_CLASSES),
    students: clone(SEED_STUDENTS),
    texts: clone(SEED_TEXTS),
    wordSets: clone(SEED_WORDSETS),
    blockBank: clone(SEED_BLOCK_BANK),
    componentBank: savedComponentBank(),
    kits: clone(SEED_KITS),
    teacher: clone(TEACHER),
    toasts: [],
  };
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
    case "SAVE_KIT": {
      // a Kit references bank items by id rather than copying their content,
      // so editing a saved block/component updates every kit that uses it.
      const { title, blockIds, componentIds } = action;
      const kit = { id: uid("kit"), title, blockIds: blockIds || [], componentIds: componentIds || [] };
      return { ...state, kits: [kit, ...(state.kits || [])] };
    }
    case "REMOVE_KIT":
      return { ...state, kits: (state.kits || []).filter((k) => k.id !== action.kitId) };
    case "BUILD_RECAP_LESSON": {
      // assemble a brand-new lesson from every My-Blocks item compatible with
      // the student's course template, deep-copied so it's independent of
      // the saved originals, and assign it straight to that student.
      const { studentId, focusLabel } = action;
      const student = state.students.find((s) => s.id === studentId);
      if (!student || !student.courseId) return state;
      const course = state.courses.find((c) => c.id === student.courseId);
      const templateTypes = LESSON_TEMPLATES[course?.templateId]?.blockTypes || LESSON_TEMPLATES.general.blockTypes;
      const compatible = state.blockBank.filter((b) => templateTypes.includes(b.type));
      if (!compatible.length) return state;
      const courseId = student.courseId;
      const list = state.lessons[courseId] || [];
      const built = compatible.map((item) => {
        const content = JSON.parse(JSON.stringify(item.content || { components: [] }));
        content.components = (content.components || []).map((c) => ({ ...c, id: uid("c") }));
        return { id: uid("p"), type: item.type, title: item.title, meta: "from My Blocks", content };
      });
      const lesson = { id: uid("l"), n: list.length + 1, title: `Recap: ${focusLabel}`, parts: built.map((p) => p.type), built, active: 0, progress: 0, current: false };
      const students = state.students.map((s) => (s.id === studentId ? { ...s, extraLessons: [...(s.extraLessons || []), lesson.id] } : s));
      return { ...state, lessons: { ...state.lessons, [courseId]: [...list, lesson] }, students };
    }
    case "SET_STUDENT_COURSE": {
      // Full unenroll only (courseId: null) — also drops the student from
      // whatever class they were in. Enrolling now always goes through a
      // specific Class (SET_STUDENT_CLASS) — a student's only assignment
      // is which class they're in; the class carries the course.
      const { studentId, courseId } = action;
      const student = state.students.find((s) => s.id === studentId);
      const classes = student?.classId
        ? state.classes.map((c) => (c.id === student.classId ? { ...c, studentIds: c.studentIds.filter((id) => id !== studentId) } : c))
        : state.classes;
      const students = state.students.map((s) => (s.id === studentId ? { ...s, courseId, classId: null } : s));
      return { ...state, students, classes };
    }
    case "ADD_CLASS": {
      const { courseId, name, scheduleDays } = action;
      const cls = { id: uid("cls"), name, scheduleDays: scheduleDays || [], studentIds: [],
        courses: courseId ? [{ courseId, currentLessonId: null, status: "in-progress" }] : [] };
      return { ...state, classes: [...state.classes, cls] };
    }
    // Assigns a new course to a class's history — a class can study several
    // courses over time (see SEED_CLASSES), so this appends rather than
    // replaces. No-op if the course is already in the class's history.
    case "ASSIGN_CLASS_COURSE": {
      const { classId, courseId } = action;
      const classes = state.classes.map((c) => {
        if (c.id !== classId || c.courses.some((x) => x.courseId === courseId)) return c;
        return { ...c, courses: [...c.courses, { courseId, currentLessonId: null, status: "in-progress" }] };
      });
      return { ...state, classes };
    }
    // Marks one of a class's courses done/in-progress — e.g. "the class
    // finished this course, move on to the next one".
    case "SET_CLASS_COURSE_STATUS": {
      const { classId, courseId, status } = action;
      const classes = state.classes.map((c) => (c.id !== classId ? c :
        { ...c, courses: c.courses.map((x) => (x.courseId === courseId ? { ...x, status } : x)) }));
      return { ...state, classes };
    }
    // Which lesson of one of its assigned courses the whole class is
    // currently on — the class-level equivalent of the old per-student
    // lesson assignment.
    case "SET_CLASS_CURRENT_LESSON": {
      const { classId, courseId, lessonId } = action;
      const classes = state.classes.map((c) => (c.id !== classId ? c :
        { ...c, courses: c.courses.map((x) => (x.courseId === courseId ? { ...x, currentLessonId: lessonId } : x)) }));
      return { ...state, classes };
    }
    case "SET_STUDENT_CLASS": {
      // Enrolling in a Class enrolls in its course too (classId is the
      // source of truth; courseId stays denormalized on the student so
      // every existing course-scoped view keeps working unchanged).
      // classId: null unenrolls from both the class and the course.
      const { studentId, classId } = action;
      const student = state.students.find((s) => s.id === studentId);
      const target = classId ? state.classes.find((c) => c.id === classId) : null;
      const classes = state.classes.map((c) => {
        let studentIds = c.studentIds;
        if (c.id === student?.classId) studentIds = studentIds.filter((id) => id !== studentId);
        if (c.id === classId && !studentIds.includes(studentId)) studentIds = [...studentIds, studentId];
        return studentIds === c.studentIds ? c : { ...c, studentIds };
      });
      const students = state.students.map((s) =>
        s.id === studentId ? { ...s, classId: classId || null, courseId: activeClassCourse(target)?.courseId || null } : s);
      return { ...state, students, classes };
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
