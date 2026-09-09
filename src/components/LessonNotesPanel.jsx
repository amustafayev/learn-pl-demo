import React, { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
import { Drawer } from "../design-system.jsx";
import { useStore } from "../store.jsx";

/* =========================================================================
   A teacher's own quick scratchpad for one lesson — plain text, autosaved,
   local to that lesson. Deliberately separate from the AI-drafted
   per-student notes on the student page (Students.jsx's "Lesson notes"
   tab): those are structured, per-student, and reviewed before saving; this
   is just a running notepad the teacher jots in while building or teaching
   the lesson itself. Built on the shared Drawer (design-system.jsx) — it
   was the original for that component before BlockStudio's "add a
   component" picker needed the same shape and the sliding-panel-with-a-dim-
   backdrop pattern got pulled out into one place.
   ========================================================================= */

// The small trigger button any lesson surface (builder, live session) can
// drop into its header/toolbar to open the panel for that lesson.
export function LessonNotesButton({ onOpen, hasNotes }) {
  return (
    <button onClick={onOpen} title="Lesson notes"
      className={`relative inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3.5 py-2 border transition duration-(--dur-fast) ${
        hasNotes ? "border-pending-200 bg-pending-50 text-pending-700 hover:bg-pending-100" : "border-neutral-300 hover:border-primary-300 text-neutral-700 bg-white"}`}>
      <NotebookText size={15} /> Notes
      {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-pending-500" />}
    </button>
  );
}

export function LessonNotesPanel({ open, onClose, courseId, lessonId, lessonLabel, notes }) {
  const { dispatch } = useStore();
  const [draft, setDraft] = useState(notes || "");

  // re-sync if a different lesson's panel opens
  useEffect(() => { setDraft(notes || ""); }, [lessonId, notes]);

  function save(value) {
    setDraft(value);
    dispatch({ type: "UPDATE_LESSON_NOTES", courseId, lessonId, notes: value });
  }

  return (
    <Drawer open={open} onClose={onClose} title={lessonLabel} sub="Lesson notes">
      <div className="p-5 h-full flex flex-col">
        <textarea value={draft} onChange={(e) => save(e.target.value)} autoFocus
          className="flex-1 w-full resize-none border border-neutral-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          placeholder="Jot anything here while you build or teach this lesson — timing, what worked, what to change next time…" />
        <p className="text-[11px] text-neutral-500 mt-2">Saved automatically. Private to you — not shown to students.</p>
      </div>
    </Drawer>
  );
}
