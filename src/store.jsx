import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import {
  SEED_COURSES, SEED_LESSONS, SEED_STUDENTS, SEED_TEXTS, SEED_WORDSETS, SEED_BLOCK_BANK, SEED_COMPONENT_BANK,
} from "./data.jsx";

/* =========================================================================
   Live, mutable prototype state. Everything the teacher can change lives
   here (courses, lessons, parts, reading library, word sets, students'
   words + notes + assignments). No backend — pure in-memory React state.
   ========================================================================= */

import { BLOCK_TYPES } from "./data.jsx";

const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 1000;
const uid = (p) => `${p}${++seq}`;
const COMPONENT_BANK_KEY = "lucid.component-bank";

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

// One place to save a Block (with all its Components) into the teacher's
// reusable bank and confirm it via toast — used by both the lesson builder
// and Block Studio so the message and payload never drift apart.
export function saveBlockToBank(dispatch, toast, block, from) {
  dispatch({ type: "SAVE_BLOCK_TO_BANK", block, from });
  toast(`“${block.title || BLOCK_TYPES[block.type]?.label || block.type}” saved to My Blocks`);
}

const initialState = {
  courses: clone(SEED_COURSES),
  lessons: clone(SEED_LESSONS),
  students: clone(SEED_STUDENTS),
  texts: clone(SEED_TEXTS),
  wordSets: clone(SEED_WORDSETS),
  blockBank: clone(SEED_BLOCK_BANK),
  componentBank: savedComponentBank(),
  toasts: [],
};

function reducer(state, action) {
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
      const { courseId, title } = action;
      const list = state.lessons[courseId] || [];
      const n = list.length + 1;
      const lesson = { id: uid("l"), n, title, parts: [], active: 0, progress: 0, current: false, built: [] };
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
        const activity = [{ type: kind === "reading" ? "reading" : kind === "words" ? "word" : "lesson", detail: `Assigned: ${what}`, when: "just now" }, ...(s.activity || [])];
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
    case "SET_STUDENT_COURSE": {
      // enroll (courseId) or unenroll (null); assignments from other courses are dropped
      const { studentId, courseId } = action;
      const students = state.students.map((s) => (s.id === studentId ? { ...s, courseId, assignedLessons: [] } : s));
      return { ...state, students };
    }
    case "ASSIGN_LESSON": {
      const { studentId, lessonId } = action;
      const students = state.students.map((s) =>
        s.id === studentId && !(s.assignedLessons || []).includes(lessonId)
          ? { ...s, assignedLessons: [...(s.assignedLessons || []), lessonId] } : s);
      return { ...state, students };
    }
    case "UNASSIGN_LESSON": {
      const { studentId, lessonId } = action;
      const students = state.students.map((s) =>
        s.id === studentId ? { ...s, assignedLessons: (s.assignedLessons || []).filter((l) => l !== lessonId) } : s);
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
    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts, { id: action.id, text: action.text, tone: action.tone || "ok" }] };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // A saved component is a teacher-owned template, not transient lesson
  // state. Keep just this library across reloads so it remains available
  // when the teacher starts a different lesson later.
  useEffect(() => {
    try { window.localStorage.setItem(COMPONENT_BANK_KEY, JSON.stringify(state.componentBank)); } catch { /* prototype still works without storage */ }
  }, [state.componentBank]);

  const toast = useCallback((text, tone) => {
    const id = uid("toast");
    dispatch({ type: "PUSH_TOAST", id, text, tone });
    setTimeout(() => dispatch({ type: "DISMISS_TOAST", id }), 2600);
    return id;
  }, []);

  return <StoreCtx.Provider value={{ state, dispatch, toast, uid }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/* -------- navigation (single route object shared across views) -------- */

const NavCtx = createContext(null);
export function NavProvider({ value, children }) {
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}
export function useNav() {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used inside <NavProvider>");
  return ctx;
}
