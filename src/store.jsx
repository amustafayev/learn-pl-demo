import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { BLOCK_TYPES, LESSON_TEMPLATES } from "./data.jsx";
import { reducer, createInitialState, uid, lessonBlocks, activeClassCourse, classesOnCourse, courseAvgProgress, groupBankByParent, bankChildLabel, kitContents, persistComponentBank } from "./db/mockDb.jsx";
import { h5pClient, withOwnH5PCopies, deleteH5PContentIn } from "./db/h5pClient.js";
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
export { lessonBlocks, activeClassCourse, classesOnCourse, courseAvgProgress, groupBankByParent, bankChildLabel, kitContents, uid, h5pClient };

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

// One place to save a Block (with all its Components) into the teacher's
// reusable bank and confirm it via toast — used by both the lesson builder
// and Block Studio so the message and payload never drift apart.
export async function saveBlockToBank(dispatch, toast, block, from) {
  const snapshot = await copyWithOwnH5P(toast, block);
  if (!snapshot) return;
  dispatch({ type: "SAVE_BLOCK_TO_BANK", block: snapshot, from });
  toast(`“${block.title || BLOCK_TYPES[block.type]?.label || block.type}” saved to My Blocks`);
}

// Same idea, one level down — save a single Component into the Component
// Library. Shared by Block Studio's editor and the course tree's leaf rows.
export async function saveComponentToBank(dispatch, toast, component, title, from) {
  const snapshot = await copyWithOwnH5P(toast, component);
  if (!snapshot) return;
  dispatch({ type: "SAVE_COMPONENT_TO_BANK", component: snapshot, title, from });
  toast(`Saved “${title}” to Component Library`);
}

// One student, one thing assigned — wraps the generic ASSIGN action so every
// "assign this to a student" surface (student page, saved blocks, word
// sets, a freshly created component) confirms with the same toast wording.
export function assignToStudent(dispatch, toast, studentId, what, kind) {
  dispatch({ type: "ASSIGN", studentIds: [studentId], what, kind });
  toast(`Assigned “${what}”`);
}

// "Build a recap lesson" — assembles a brand-new lesson entirely from
// blocks already saved in My Blocks (deep-copied, so editing the recap never
// touches the originals) and assigns it straight to the student. The guard
// (nothing compatible saved yet) lives here so every call site gets the
// same message instead of a silently empty lesson.
export async function buildRecapLesson(dispatch, toast, student, course, blockBank, focusLabel) {
  const templateTypes = LESSON_TEMPLATES[course?.templateId]?.blockTypes || LESSON_TEMPLATES.general.blockTypes;
  const compatible = blockBank.filter((b) => templateTypes.includes(b.type));
  if (!compatible.length) { toast("Save some blocks to My Blocks first — nothing compatible with this course yet", "err"); return; }
  const copies = await copyWithOwnH5P(toast, compatible.map((b) => b.content || { components: [] }));
  if (!copies) return;
  const contents = Object.fromEntries(compatible.map((b, i) => [b.id, copies[i]]));
  dispatch({ type: "BUILD_RECAP_LESSON", studentId: student.id, focusLabel, contents });
  toast(`Recap lesson built from ${compatible.length} saved block${compatible.length === 1 ? "" : "s"} and assigned to ${student.name.split(" ")[0]}`);
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // A saved component is a teacher-owned template, not transient lesson
  // state. Keep just this library across reloads so it remains available
  // when the teacher starts a different lesson later.
  useEffect(() => {
    persistComponentBank(state.componentBank);
  }, [state.componentBank]);

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
