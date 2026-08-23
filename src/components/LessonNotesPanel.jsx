import React, { useEffect, useState } from "react";
import { NotebookText, X } from "lucide-react";
import { useStore } from "../store.jsx";

/* =========================================================================
   A teacher's own quick scratchpad for one lesson — plain text, autosaved,
   local to that lesson. Deliberately separate from the AI-drafted
   per-student notes on the student page (Students.jsx's "Lesson notes"
   tab): those are structured, per-student, and reviewed before saving; this
   is just a running notepad the teacher jots in while building or teaching
   the lesson itself. Slides in from the right so it never blocks the
   pathway/live-room behind it.
   ========================================================================= */

// The small trigger button any lesson surface (builder, live session) can
// drop into its header/toolbar to open the panel for that lesson.
export function LessonNotesButton({ onOpen, hasNotes }) {
  return (
    <button onClick={onOpen} title="Lesson notes"
      className={`relative inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3.5 py-2 border transition-colors ${
        hasNotes ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-slate-200 hover:border-indigo-300 text-slate-700 bg-white"}`}>
      <NotebookText size={15} /> Notes
      {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/20" />
      <div onClick={(e) => e.stopPropagation()}
        className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-slate-200 shadow-xl flex flex-col animate-[fadeIn_.15s_ease]">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">Lesson notes</div>
            <h3 className="font-bold text-base tracking-tight">{lessonLabel}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X size={18} /></button>
        </div>
        <div className="flex-1 p-5 flex flex-col min-h-0">
          <textarea value={draft} onChange={(e) => save(e.target.value)} autoFocus
            className="flex-1 w-full resize-none border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            placeholder="Jot anything here while you build or teach this lesson — timing, what worked, what to change next time…" />
          <p className="text-[11px] text-slate-400 mt-2">Saved automatically. Private to you — not shown to students.</p>
        </div>
      </div>
    </div>
  );
}
