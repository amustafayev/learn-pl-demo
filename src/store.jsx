import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  reducer, createInitialState, uid, lessonBlocks, activeClassCourse, classesOnCourse, classCourseProgress, studentCourseId, courseAvgProgress,
  groupBankByParent, bankChildLabel, persistComponentBank, teacherView, classMembers, studentClasses, activeStudents, teacherRoster,
  classNotesFor, studentHistory, membershipPeriods, studentView, signedOutView, canOpenLesson,
} from "./db/mockDb.jsx";
import { openSyncChannel, sharedChanged } from "./db/mockSync.js";
import { h5pClient, withOwnH5PCopies, deleteH5PContentIn } from "./db/h5pClient.js";
import { saveMedia, loadMedia } from "./db/mediaStore.js";
import { MOTION, cssMs } from "./motion.js";

/* =========================================================================
   React binding on top of the mock "database" (src/db/mockDb.jsx). This
   file has no persistence rules of its own — it just wires that reducer
   into a Context so views can call `useStore()`/`dispatch()`. Swapping the
   mock for a real backend only ever touches db/mockDb.jsx (and, if writes
   become async, the useReducer call just below it) — no view ever imports
   the db layer directly, so no view needs to change either way.
   ========================================================================= */

// Re-exported so every view that already does `import { lessonBlocks, ... }
// from "./store.jsx"` keeps working unchanged — the actual definitions live
// in the db layer now, next to the state shape they describe.
export {
  lessonBlocks, activeClassCourse, classesOnCourse, classCourseProgress, studentCourseId, courseAvgProgress, groupBankByParent, bankChildLabel,
  classMembers, studentClasses, activeStudents, teacherRoster, classNotesFor, studentHistory, membershipPeriods, uid, h5pClient, saveMedia,
  studentView, signedOutView, canOpenLesson,
};

// Deep copy of `value` whose H5P activities each get their own server-side
// content (see db/h5pClient.js) — or null, after telling the teacher why, if
// the H5P server couldn't copy it. Resolves right away when there's no H5P.
export async function copyWithOwnH5P(toast, value) {
  try {
    return await withOwnH5PCopies(value);
  } catch (err) {
    toast(`Couldn't copy the H5P activity: ${err.message}`, "err");
    return null;
  }
}

// Removing a component, block or bank item also deletes the server-side
// content of any H5P activity in it — nothing else references that content.
export function discardH5PContent(toast, value) {
  deleteH5PContentIn(value).catch((err) => toast(`Couldn't delete the H5P content on the server: ${err.message}`, "err"));
}

// Save a single Component into the Component Library. Shared by Block Studio's editor and the course tree's leaf rows.
export async function saveComponentToBank(dispatch, toast, component, title, from) {
  const snapshot = await copyWithOwnH5P(toast, component);
  if (!snapshot) return;
  dispatch({ type: "SAVE_COMPONENT_TO_BANK", component: snapshot, title, from });
  toast(`Saved “${title}” to Component Library`);
}

// Hand one thing to one or more students (ASSIGN_WORK) — the student page's
// Assign dialog and the Library's Assign button confirm the same way. A
// block or task is snapshotted first with its own H5P content, like saving
// to My Blocks, so the student keeps exactly what they were given.
// `item` = { kind, title, blockType?, componentKind?, source?, content? }.
// Resolves false if the H5P copy failed (the teacher was already told).
export async function assignWork(dispatch, toast, studentIds, item, toWhom) {
  const content = item.content ? await copyWithOwnH5P(toast, item.content) : null;
  if (item.content && !content) return false;
  dispatch({ type: "ASSIGN_WORK", studentIds, item: { ...item, content } });
  toast(`Assigned “${item.title}” to ${toWhom}`);
  return true;
}

const StoreCtx = createContext(null);

// "This lesson was taught to this class" — ending a live lesson, or "Mark
// as taught" on a lesson opened from a class. The timestamp is taken here
// (a real backend would stamp it server-side); the db layer logs it and
// moves the class's "next up" on. Returns the lesson that's next up after
// it (null once the course runs out), for the caller's own message.
export function markLessonTaught(dispatch, toast, { cls, courseId, lesson, lessons }) {
  dispatch({ type: "MARK_LESSON_TAUGHT", classId: cls.id, courseId, lessonId: lesson.id, taughtAt: new Date().toISOString() });
  const next = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1] || null;
  toast(next ? `Lesson ${lesson.n} marked as taught for ${cls.name} — next up: Lesson ${next.n}` : `Lesson ${lesson.n} marked as taught for ${cls.name} — that was the last lesson`);
  return next;
}

// Keeps this tab's mock db in step with the other open tabs (the teacher
// app and the student app) — see db/mockSync.js. Returns whether this tab
// has caught up yet: true once the first copy from another tab arrived, or
// shortly after opening when no other tab answered (so it's the only one).
// Until then the data is the seed, not what the others see — the student
// app waits for this before announcing changes as new.
const CATCH_UP_MS = 600;
function useMockSync(db, dispatch) {
  const latest = useRef(db);
  const channel = useRef(null);
  const shared = useRef(false); // changed or received anything yet?
  const fromPeer = useRef(false); // the pending change came from another tab
  const before = useRef(db);
  const [caughtUp, setCaughtUp] = useState(false);
  useEffect(() => {
    channel.current = openSyncChannel({
      current: () => (shared.current ? latest.current : null),
      onRemote: (incoming) => { shared.current = true; fromPeer.current = true; dispatch({ type: "SYNC_STATE", db: incoming }); setCaughtUp(true); },
    });
    const timer = setTimeout(() => setCaughtUp(true), CATCH_UP_MS);
    return () => { clearTimeout(timer); channel.current.close(); };
  }, [dispatch]);
  useEffect(() => {
    latest.current = db;
    const prev = before.current;
    before.current = db;
    if (prev === db || !sharedChanged(prev, db)) return; // e.g. only a toast
    // Don't echo another tab's change straight back to it.
    if (fromPeer.current) { fromPeer.current = false; return; }
    shared.current = true;
    channel.current?.publish(db);
  }, [db]);
  return caughtUp;
}

// `scope` is what the logged-in user's API would return — the teacher's
// slice by default (teacherView); the student app passes its own. Writes
// always go to the whole mock db (the "server").
export function StoreProvider({ children, scope = teacherView, keepComponentBank = true }) {
  const [db, dispatch] = useReducer(reducer, undefined, createInitialState);
  const caughtUp = useMockSync(db, dispatch);
  // Views get the logged-in teacher's slice of the data only — their own
  // courses, classes and related students — exactly what a real API would
  // return for them.
  const state = useMemo(() => scope(db), [db, scope]);

  // A saved component is a teacher-owned template, not transient lesson
  // state. Keep just this library across reloads so it remains available
  // when the teacher starts a different lesson later. (The student app
  // never writes it.)
  useEffect(() => {
    if (keepComponentBank) persistComponentBank(state.componentBank);
  }, [state.componentBank, keepComponentBank]);

  const toast = useCallback((text, tone) => {
    const id = uid("toast");
    dispatch({ type: "PUSH_TOAST", id, text, tone });
    // How long a toast stays up is a timing setting like any other, so it
    // lives in `index.css` with the rest of them and is read back here.
    // `cssMs` (not `motionMs`) on purpose: a reduced-motion preference must
    // not cut short how long someone has to read it.
    setTimeout(() => dispatch({ type: "DISMISS_TOAST", id }), cssMs(MOTION.toastLife));
    return id;
  }, []);

  return <StoreCtx.Provider value={{ state, dispatch, toast, uid, caughtUp }}>{children}</StoreCtx.Provider>;
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

// A playable URL for a component's audio: an uploaded file (stored by id in
// db/mediaStore.js, turned into an object URL here and released again on
// unmount) wins over a pasted/seed link. `src` is null while there's no
// audio yet (or the file is still loading); `missing` is true once an
// uploaded file turns out to be gone — e.g. the browser's site data was
// cleared — so the card can say so instead of waiting forever.
export function useMediaSrc(fileId, url) {
  const [loaded, setLoaded] = useState({ fileId: null, src: null });
  useEffect(() => {
    if (!fileId) return undefined;
    let objectUrl = null; let alive = true;
    loadMedia(fileId).then((blob) => {
      if (!alive) return;
      objectUrl = blob ? URL.createObjectURL(blob) : null;
      setLoaded({ fileId, src: objectUrl });
    }).catch(() => { if (alive) setLoaded({ fileId, src: null }); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileId]);
  if (!fileId) return { src: url || null, missing: false };
  const ready = loaded.fileId === fileId;
  return { src: ready ? loaded.src : null, missing: ready && !loaded.src };
}
