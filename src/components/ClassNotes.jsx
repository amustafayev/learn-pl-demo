import React, { useState } from "react";
import {
  IconNotes, IconPlus, IconSend, IconArrowBackUp, IconLock, IconPencil, IconTrash, IconChevronRight, IconFilter,
} from "@tabler/icons-react";
import { Button, Card, Checkbox, CountBadge, Drawer, MenuButton, Select, TextField, inputCls } from "../design-system.jsx";
import { useStore, useNav, classNotesFor, classMembers, classCourseProgress } from "../store.jsx";
import { timeAgo, shortDate } from "../format.js";

/* =========================================================================
   Class notes — a class's own notes on its lessons: what to review next
   time, homework, who needs help. They belong to the CLASS (the course is
   the same for every class, so it can't hold them), on a course the class
   is taking. Each note is private to the teacher until sent to the class's
   students, and ticked off once it's been dealt with. See "Class notes" in
   CLAUDE.md for the record and the endpoints.

   Three ways in, one set of pieces: the lesson page opened from a class
   (ClassLessonBar's Notes button), and the
   class page's "Class notes" card, which lists them all by lesson.
   ========================================================================= */

// One note: tick it off, edit it in place, send it (or take it back),
// delete it. `lessonLabel` names the lesson when the list mixes lessons.
// Its buttons sit beside the text when the row is wide enough and drop
// under it when it isn't (a container query on the row itself, so it holds
// in a phone-width card and in the side drawer alike).
function NoteRow({ note, cls, lessonLabel }) {
  const { dispatch, toast } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const update = (patch) => dispatch({ type: "UPDATE_CLASS_NOTE", noteId: note.id, ...patch });
  const share = (shared) => {
    dispatch({ type: "SHARE_CLASS_NOTES", classId: cls.id, noteIds: [note.id], shared });
    toast(shared ? `Note sent to ${cls.name}` : "Note taken back — only you can see it now");
  };
  const saveEdit = () => {
    if (draft.trim() && draft.trim() !== note.text) update({ text: draft });
    setEditing(false);
  };
  const remove = () => {
    dispatch({ type: "REMOVE_CLASS_NOTE", noteId: note.id });
    toast(note.sharedAt ? "Note deleted — students no longer see it" : "Note deleted");
  };

  return (
    <div className="@container flex items-start gap-3 py-3">
      <Checkbox checked={note.done} onChange={(v) => update({ done: v })} className="mt-0.5 shrink-0"
        title={note.done ? "Done — tick again to reopen" : "Mark as done"} aria-label={note.done ? "Reopen note" : "Mark note as done"} />
      <div className="min-w-0 flex-1 flex flex-col gap-2 @md:flex-row @md:items-start @md:gap-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea autoFocus rows={2} value={draft} aria-label="Edit note"
            onChange={(e) => setDraft(e.target.value)} onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
              if (e.key === "Escape") { e.stopPropagation(); setDraft(note.text); setEditing(false); }
            }}
            className={`${inputCls} resize-none leading-relaxed`} />
        ) : (
          <p className={`text-sm leading-relaxed break-words ${note.done ? "text-neutral-500 line-through" : "text-neutral-900"}`}>{note.text}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {lessonLabel && <span className="font-medium text-neutral-700">{lessonLabel}</span>}
          {note.sharedAt ? (
            <span className="inline-flex items-center gap-1 font-semibold text-success-600" title={shortDate(note.sharedAt)}>
              <IconSend size={13} stroke={1.75} /> Sent to class · {timeAgo(note.sharedAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-neutral-600"><IconLock size={13} stroke={1.75} /> Only you</span>
          )}
          <span className="text-neutral-500" title={shortDate(note.createdAt)}>Added {timeAgo(note.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {note.sharedAt ? (
          <Button size="sm" variant="light" onClick={() => share(false)} title="Take it back from the students">
            <IconArrowBackUp size={15} stroke={1.75} /> Unsend
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => share(true)} title={`Send to ${cls.name}'s students`}>
            <IconSend size={15} stroke={1.75} /> Send
          </Button>
        )}
        <NoteTool title="Edit note" onClick={() => { setDraft(note.text); setEditing(true); }}><IconPencil size={16} stroke={1.75} /></NoteTool>
        <NoteTool title="Delete note" danger onClick={remove}><IconTrash size={16} stroke={1.75} /></NoteTool>
      </div>
      </div>
    </div>
  );
}

function NoteTool({ title, danger, onClick, children }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-(--dur-fast) ${danger ? "hover:bg-warning-50 hover:text-warning-600" : "hover:bg-neutral-200 hover:text-neutral-950"}`}>
      {children}
    </button>
  );
}

// Type, Enter, done. `before` slots a lesson picker in front of the field.
function NoteComposer({ onAdd, before = null, autoFocus = false }) {
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {before}
      <TextField value={text} autoFocus={autoFocus} aria-label="New note" className="flex-1 min-w-0"
        placeholder="Add a note — homework, what to review…"
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
      <Button variant={text.trim() ? "primary" : "disabled"} onClick={add} className="shrink-0"><IconPlus size={16} stroke={1.75} /> Add</Button>
    </div>
  );
}

// "3 to do · 2 done · 1 sent" plus one button to send everything not yet sent.
function NotesTally({ notes, cls }) {
  const { dispatch, toast } = useStore();
  const unsent = notes.filter((n) => !n.sharedAt);
  const open = notes.filter((n) => !n.done).length;
  const sendAll = () => {
    dispatch({ type: "SHARE_CLASS_NOTES", classId: cls.id, noteIds: unsent.map((n) => n.id), shared: true });
    toast(`${unsent.length} note${unsent.length === 1 ? "" : "s"} sent to ${cls.name}`);
  };
  if (!notes.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-neutral-700">
        {open} to do · {notes.length - open} done · {notes.length - unsent.length} sent
      </span>
      {unsent.length > 0 && (
        <Button size="sm" variant="light" onClick={sendAll}><IconSend size={15} stroke={1.75} /> Send all unsent ({unsent.length})</Button>
      )}
    </div>
  );
}

const privacyLine = (state, cls) => {
  const n = classMembers(state, cls.id).length;
  return `Notes are private until you send them. A sent note reaches ${n ? `the ${n} student${n === 1 ? "" : "s"} in` : "the students of"} ${cls.name}; tick one off once it's dealt with.`;
};

// The small trigger for a lesson opened from a class.
export function ClassNotesButton({ cls, lesson, onOpen }) {
  const { state } = useStore();
  const notes = classNotesFor(state, cls.id, lesson.id);
  const open = notes.filter((n) => !n.done).length;
  return (
    <Button size="sm" variant="outline" onClick={onOpen} title={`Class notes for Lesson ${lesson.n}`}>
      <IconNotes size={15} stroke={1.75} /> Notes {notes.length > 0 && <CountBadge active={open > 0}>{open || notes.length}</CountBadge>}
    </Button>
  );
}

// One lesson's notes for one class, in a side drawer — from the lesson page
// or while teaching it.
export function ClassNotesPanel({ open, onClose, cls, course, lesson }) {
  const { state, dispatch } = useStore();
  const notes = classNotesFor(state, cls.id, lesson.id);
  const add = (text) => dispatch({ type: "ADD_CLASS_NOTE", classId: cls.id, courseId: course.id, lessonId: lesson.id, text });
  return (
    <Drawer open={open} onClose={onClose} width="max-w-lg" title={`Lesson ${lesson.n}: ${lesson.title}`} sub={`Class notes · ${cls.name}`}>
      <div className="p-5 space-y-4">
        <NoteComposer onAdd={add} autoFocus />
        <NotesTally notes={notes} cls={cls} />
        {notes.length ? (
          <div className="divide-y divide-neutral-400 border-y border-neutral-400">
            {notes.map((n) => <NoteRow key={n.id} note={n} cls={cls} />)}
          </div>
        ) : (
          <EmptyNotes>No notes for this lesson yet — jot down what to review, homework, or who needs help.</EmptyNotes>
        )}
        <p className="text-xs text-neutral-600">{privacyLine(state, cls)}</p>
      </div>
    </Drawer>
  );
}

function EmptyNotes({ children }) {
  return (
    <div className="rounded-lg bg-neutral-200 px-4 py-6 text-center text-sm text-neutral-700">
      <IconNotes size={22} stroke={1.5} className="mx-auto mb-2 text-neutral-500" />
      {children}
    </div>
  );
}

const FILTERS = [
  { id: "open", label: "To do", test: (n) => !n.done },
  { id: "done", label: "Done", test: (n) => n.done },
  { id: "unsent", label: "Not sent yet", test: (n) => !n.sharedAt },
  { id: "all", label: "All notes", test: () => true },
];
const FILTER_EMPTY = {
  open: "Nothing to do — every note is ticked off.",
  done: "No notes ticked off yet.",
  unsent: "Every note has been sent to the class.",
  all: "No notes yet — after teaching a lesson, jot down what to review, homework, or who needs help.",
};

// Every note the class has, grouped by lesson — the class page's own card.
// New notes go on whichever lesson is picked (the class's next lesson by
// default); the list shows the latest lessons first.
export function ClassNotesCard({ cls }) {
  const { state, dispatch } = useStore();
  const { go } = useNav();
  const [filter, setFilter] = useState("open");

  // The class's courses, the one in progress first, each with its lessons.
  const courses = [...cls.courses]
    .sort((a, b) => (a.status === "in-progress" ? -1 : b.status === "in-progress" ? 1 : 0))
    .map((entry) => ({ entry, course: state.courses.find((c) => c.id === entry.courseId), lessons: state.lessons[entry.courseId] || [] }))
    .filter((x) => x.course && x.lessons.length);
  const first = courses[0];
  const firstProgress = first ? classCourseProgress(state, cls, first.course.id) : null;
  const defaultKey = first ? `${first.course.id}:${(firstProgress?.next || firstProgress?.last?.lesson || first.lessons[0]).id}` : "";
  // Follows the class's next lesson until the teacher picks one.
  const [picked, setPicked] = useState("");
  const target = picked || defaultKey;

  const all = classNotesFor(state, cls.id);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, all.filter(f.test).length]));
  const shown = all.filter(FILTERS.find((f) => f.id === filter).test);

  // Group by lesson: the course in progress first, latest lessons first.
  const groups = courses.flatMap(({ course, lessons }) =>
    [...lessons].reverse().map((lesson) => ({ course, lesson, notes: shown.filter((n) => n.courseId === course.id && n.lessonId === lesson.id) })))
    .filter((g) => g.notes.length);

  const add = (text) => {
    const [courseId, lessonId] = target.split(":");
    dispatch({ type: "ADD_CLASS_NOTE", classId: cls.id, courseId, lessonId, text });
    if (filter === "done") setFilter("open"); // so the new note is in view
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-950">
          <IconNotes size={18} stroke={1.75} /> Class notes {counts.open > 0 && <CountBadge active>{counts.open}</CountBadge>}
        </h2>
        {all.length > 0 && (
          <MenuButton icon={IconFilter} size="sm" value={filter} onChange={setFilter} active={filter !== "all"}
            label={FILTERS.find((f) => f.id === filter).label}
            options={FILTERS.map((f) => ({ id: f.id, label: f.label, count: counts[f.id] }))} />
        )}
      </div>

      {courses.length ? (
        <>
          <NoteComposer onAdd={add} before={
            <Select value={target} onChange={(e) => setPicked(e.target.value)} aria-label="Lesson" className="sm:w-64 shrink-0">
              {courses.map(({ course, lessons }) => (
                <optgroup key={course.id} label={course.title}>
                  {lessons.map((l) => <option key={l.id} value={`${course.id}:${l.id}`}>Lesson {l.n} · {l.title}</option>)}
                </optgroup>
              ))}
            </Select>
          } />
          <div className="mt-4 space-y-5">
            {groups.map(({ course, lesson, notes }) => (
              <div key={`${course.id}:${lesson.id}`}>
                <div className="flex items-center justify-between gap-2 border-b border-neutral-400 pb-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-neutral-950">Lesson {lesson.n} · {lesson.title}</div>
                    {courses.length > 1 && <div className="text-xs text-neutral-600">{course.title}</div>}
                  </div>
                  <button type="button" onClick={() => go({ tab: "courses", courseId: course.id, classId: cls.id, lessonId: lesson.id })}
                    className="shrink-0 inline-flex items-center gap-0.5 text-sm font-semibold text-primary-600 hover:text-primary-700">
                    Open lesson <IconChevronRight size={15} stroke={1.75} />
                  </button>
                </div>
                <div className="divide-y divide-neutral-400">
                  {notes.map((n) => <NoteRow key={n.id} note={n} cls={cls} />)}
                </div>
              </div>
            ))}
            {!groups.length && <EmptyNotes>{FILTER_EMPTY[filter]}</EmptyNotes>}
          </div>
          <p className="mt-4 text-xs text-neutral-600">{privacyLine(state, cls)}</p>
        </>
      ) : (
        <EmptyNotes>Assign a course to this class to start taking notes on its lessons.</EmptyNotes>
      )}
    </Card>
  );
}
