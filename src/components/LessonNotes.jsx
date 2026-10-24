import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  IconNotes, IconSend, IconArrowBackUp, IconX, IconBold, IconItalic, IconUnderline, IconList, IconListNumbers,
  IconHeading, IconTextColor, IconHighlight, IconClearFormatting, IconExternalLink, IconCopy, IconFilePlus, IconTrash,
  IconMaximize, IconMinimize, IconBrandGoogle,
} from "@tabler/icons-react";
import { Button, Tag, TextField } from "../design-system.jsx";
import { useToast } from "../store.jsx";
import { useLessonNotes, googleDocsConfigured, docEmbedUrl } from "../features/notes/index.js";
import { isGoogleDocUrl } from "../richText.js";

/* =========================================================================
   Lesson notes — what the teacher writes about a lesson WHILE teaching it:
   what to review, homework, who needs help. They belong to the LESSON (one
   document per lesson, the same whichever class it's taught to), written in
   a small Google-Docs-style editor (bold, italic, underline, headings,
   lists, text colour, highlight) that saves as you type. The document can
   also point at a Google Doc the teacher keeps (`docUrl`). See "Lesson
   notes" in CLAUDE.md for the record and the endpoints.

   Notes are written in a docked side panel inside the lesson itself
   (LessonNotesPanel, opened by LessonNotesToggle in Block Studio). To let a
   class's students see them, press "Send to class" while the lesson is open
   from that class: one button, the whole document.
   ========================================================================= */

const TEXT_COLORS = [["Orange", "#ff5c20"], ["Red", "#fe4d4f"], ["Green", "#53c31b"], ["Blue", "#1990ff"], ["Amber", "#faad14"]];
// Translucent, so a highlight reads in both themes without hiding the text.
const HIGHLIGHTS = [["Orange", "rgba(255, 92, 32, 0.28)"], ["Red", "rgba(254, 77, 79, 0.28)"], ["Green", "rgba(83, 195, 27, 0.30)"], ["Blue", "rgba(25, 144, 255, 0.28)"], ["Amber", "rgba(250, 173, 20, 0.34)"]];

function ToolButton({ title, active, onClick, children }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active} onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection while clicking a tool
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-(--dur-fast) ${active ? "bg-neutral-300 text-neutral-950" : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-950"}`}>
      {children}
    </button>
  );
}

// The editor: a contenteditable document with a one-row toolbar. It is
// uncontrolled on purpose (the browser owns the caret); `html` seeds it once
// and every change is saved a moment after typing stops.
function RichEditor({ html, onSave }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const save = useRef(onSave);
  const [menu, setMenu] = useState(null); // "color" | "highlight" | null
  const [status, setStatus] = useState("Saved");
  save.current = onSave;

  useEffect(() => {
    const el = ref.current;
    el.innerHTML = html || "";
    try { document.execCommand("styleWithCSS", false, true); } catch { /* older browsers: tags instead of styles */ }
    // Leaving mid-edit must not lose the last keystrokes.
    return () => { if (timer.current) { clearTimeout(timer.current); save.current(el.innerHTML); } };
    // seeded once per mount — the panel remounts per lesson
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changed = () => {
    setStatus("Saving…");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; save.current(ref.current.innerHTML); setStatus("Saved"); }, 500);
  };
  const run = (command, value) => {
    ref.current.focus();
    document.execCommand(command, false, value);
    setMenu(null);
    changed();
  };
  const heading = () => run("formatBlock", document.queryCommandValue("formatBlock").toLowerCase() === "h3" ? "P" : "H3");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-400 px-4 py-2">
        <ToolButton title="Bold" onClick={() => run("bold")}><IconBold size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Italic" onClick={() => run("italic")}><IconItalic size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Underline" onClick={() => run("underline")}><IconUnderline size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Heading" onClick={heading}><IconHeading size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Bulleted list" onClick={() => run("insertUnorderedList")}><IconList size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Numbered list" onClick={() => run("insertOrderedList")}><IconListNumbers size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Text colour" active={menu === "color"} onClick={() => setMenu(menu === "color" ? null : "color")}><IconTextColor size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Highlight" active={menu === "highlight"} onClick={() => setMenu(menu === "highlight" ? null : "highlight")}><IconHighlight size={16} stroke={1.75} /></ToolButton>
        <ToolButton title="Clear formatting" onClick={() => run("removeFormat")}><IconClearFormatting size={16} stroke={1.75} /></ToolButton>
      </div>
      {menu && (
        <div className="flex items-center gap-2 border-b border-neutral-400 bg-neutral-200 px-4 py-2">
          <span className="text-xs font-semibold text-neutral-700">{menu === "color" ? "Text colour" : "Highlight"}</span>
          {(menu === "color" ? TEXT_COLORS : HIGHLIGHTS).map(([name, value]) => (
            <button key={name} type="button" title={name} aria-label={name} onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(menu === "color" ? "foreColor" : "hiliteColor", value)}
              className="h-6 w-6 rounded-full border border-neutral-400" style={{ background: value }} />
          ))}
        </div>
      )}
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Lesson notes"
        data-placeholder="Write notes for this lesson — homework, what to review, who needs help…"
        onInput={changed} onBlur={() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; save.current(ref.current.innerHTML); setStatus("Saved"); } }}
        onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
        className="note-body min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-neutral-900 outline-none empty:before:text-neutral-600 empty:before:content-[attr(data-placeholder)]" />
      <div className="border-t border-neutral-400 px-5 py-1.5 text-xs text-neutral-600" aria-live="polite">{status}</div>
    </div>
  );
}

// The lesson's Google Doc. One click signs the teacher in to Google and
// creates the doc in their Drive, then it opens right here in the panel.
// Where Google isn't set up (no client ID), they can paste a link instead.
function CreateDoc({ course, lesson, notes }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const connected = googleDocsConfigured();
  const create = async () => {
    setBusy(true);
    try {
      await notes.createGoogleDoc(`${course.title} · Lesson ${lesson.n} notes`);
    } catch (err) {
      toast(err.description || err.message || "Couldn't create the Google Doc", "err");
    } finally { setBusy(false); }
  };
  const paste = () => {
    if (!isGoogleDocUrl(draft.trim())) { toast("That doesn't look like a Google Docs link", "err"); return; }
    notes.linkDoc(draft.trim()).catch((err) => toast(err.description || "Couldn't link the Google Doc", "err"));
    setDraft("");
  };
  return (
    <div className="space-y-2 border-t border-neutral-400 px-5 py-4">
      {connected ? (
        <Button onClick={create} disabled={busy} className="w-full">
          <IconBrandGoogle size={16} stroke={1.75} /> {busy ? "Waiting for Google…" : "Create a Google Doc for this lesson"}
        </Button>
      ) : (
        <>
          <div className="text-sm font-semibold text-neutral-950">Google Doc</div>
          <div className="flex gap-2">
            <TextField value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste a Google Doc link" aria-label="Google Doc link"
              className="min-w-0 flex-1" onKeyDown={(e) => { if (e.key === "Enter") paste(); }} />
            <Button size="sm" variant={draft.trim() ? "primary" : "disabled"} onClick={paste}>Add</Button>
          </div>
          <Button size="sm" variant="light" onClick={() => window.open("https://docs.new", "_blank", "noopener")}>
            <IconFilePlus size={15} stroke={1.75} /> Start a new Google Doc
          </Button>
          <p className="text-xs text-neutral-600">One-click creation needs Google set up for this site (<code>VITE_GOOGLE_CLIENT_ID</code>, see <code>.env.example</code>).</p>
        </>
      )}
    </div>
  );
}

// The linked Google Doc, open in the panel (Google's own editor), with the
// few things to do with it.
function GoogleDocFrame({ note, notes, wide, onToggleWide }) {
  const toast = useToast();
  const src = docEmbedUrl(note.docUrl, { edit: true });
  const unlink = () => notes.unlinkDoc().catch((err) => toast(err.description || "Couldn't remove the link", "err"));
  const copy = async () => {
    try { await navigator.clipboard.writeText(note.docUrl); toast("Link copied"); } catch { toast("Couldn't copy — open the doc and copy its address", "err"); }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-400 px-4 py-2">
        <Button size="sm" variant="light" onClick={onToggleWide}>
          {wide ? <><IconMinimize size={15} stroke={1.75} /> Narrow</> : <><IconMaximize size={15} stroke={1.75} /> Expand</>}
        </Button>
        <a href={note.docUrl} target="_blank" rel="noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary-600 hover:bg-neutral-200">
          Open in Google Docs <IconExternalLink size={15} stroke={1.75} />
        </a>
        <Button size="sm" variant="light" onClick={copy} title="Copy the link"><IconCopy size={15} stroke={1.75} /></Button>
        <Button size="sm" variant="light" onClick={unlink} title="Remove the link from this lesson"><IconTrash size={15} stroke={1.75} /></Button>
      </div>
      {src ? (
        <iframe title="Lesson notes — Google Doc" src={src} className="min-h-0 w-full flex-1 border-0 bg-surface" allow="clipboard-write" />
      ) : (
        <p className="p-5 text-sm text-neutral-700">This link can't be shown here — use "Open in Google Docs".</p>
      )}
    </div>
  );
}

// The one sending control: this lesson's notes to the class it's open from.
// Sending also opens up the sharing of a Google Doc the app created, so
// students can open it (see useLessonNotes' `send`).
function SendNotes({ cls, note, notes }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!note) return null;
  const sent = note.sentTo.some((x) => x.classId === cls.id);
  const set = async (value) => {
    setBusy(true);
    try {
      await notes.send(cls.id, value);
      toast(value ? `Notes${note.docUrl ? " and Google Doc" : ""} sent to ${cls.name}` : `Notes taken back from ${cls.name}`);
    } catch (err) {
      toast(err.description || err.message || "Couldn't change the Google Doc's sharing", "err");
    } finally { setBusy(false); }
  };
  return sent ? (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Tag color="success">Sent to {cls.name}</Tag>
      <Button size="sm" variant="light" disabled={busy} onClick={() => set(false)}><IconArrowBackUp size={15} stroke={1.75} /> Unsend</Button>
    </span>
  ) : (
    <Button size="sm" variant="outline" disabled={busy} onClick={() => set(true)} title={`Students in ${cls.name} will see these notes`}>
      <IconSend size={15} stroke={1.75} /> {busy ? "Sending…" : `Send to ${cls.name}`}
    </Button>
  );
}

// The notes panel's state is shared by its toggle buttons (the lesson
// toolbar, the class bar) and the panel itself, without threading props
// through the lesson page. It also tells the page to make room (see
// `data-notes-open` in index.css), so the panel sits beside the lesson
// instead of on top of it.
let panel = { open: false, wide: false };
const panelListeners = new Set();
const setPanel = (patch) => {
  panel = { ...panel, ...patch };
  if (typeof document !== "undefined") {
    if (panel.open) document.body.setAttribute("data-notes-open", panel.wide ? "wide" : "");
    else document.body.removeAttribute("data-notes-open");
  }
  panelListeners.forEach((l) => l());
};
const setPanelOpen = (open) => setPanel({ open });
const usePanel = () => useSyncExternalStore(
  (cb) => { panelListeners.add(cb); return () => panelListeners.delete(cb); },
  () => panel,
  () => panel,
);
const usePanelOpen = () => usePanel().open;

// Toggle for the panel — sits in the lesson's own toolbar.
export function LessonNotesToggle({ lesson, size = "sm" }) {
  const open = usePanelOpen();
  return (
    <Button size={size} variant={open ? "primary" : "outline"} onClick={() => setPanelOpen(!open)} aria-pressed={open}
      title={`Notes for Lesson ${lesson.n}`}>
      <IconNotes size={15} stroke={1.75} /> Notes
    </Button>
  );
}

// Notes beside the lesson: a docked panel on the right (not over the
// content, not a modal — the lesson stays usable), opened from the toolbar.
// `cls` is the class the lesson was opened from, if any — it's who "Send"
// goes to.
export function LessonNotesPanel({ cls, course, lesson }) {
  const toast = useToast();
  const { open, wide } = usePanel();
  const notes = useLessonNotes(course.id, lesson.id);
  const { note } = notes;

  // Leaving the lesson page closes the panel and gives the room back.
  useEffect(() => () => setPanel({ open: false, wide: false }), []);

  const save = (html) => notes.save(html).catch((err) => toast(err.description || "Couldn't save the notes", "err"));
  if (!open || typeof document === "undefined") return null;
  const hasDoc = !!note?.docUrl;
  const sentTo = (note?.sentTo || []).map((x) => x.className).filter(Boolean);
  return createPortal(
    <aside aria-label="Lesson notes" className={`fixed bottom-0 right-0 top-16 z-30 flex w-full flex-col border-l border-neutral-400 bg-surface ${wide ? "sm:w-[44rem]" : "sm:w-[22rem]"}`}>
      <div className="flex items-start justify-between gap-3 border-b border-neutral-400 px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-neutral-950">Notes</div>
          <div className="truncate text-xs text-neutral-600">Lesson {lesson.n} · {lesson.title}</div>
        </div>
        <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close notes"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"><IconX size={18} stroke={1.75} /></button>
      </div>

      {/* The editor is seeded once when it mounts, so it waits for the notes. */}
      {notes.loading ? (
        <div className="min-h-0 flex-1" aria-busy="true" />
      ) : hasDoc ? (
        <GoogleDocFrame note={note} notes={notes} wide={wide} onToggleWide={() => setPanel({ wide: !wide })} />
      ) : (
        <>
          <RichEditor key={`${course.id}:${lesson.id}`} html={note?.html || ""} onSave={save} />
          <CreateDoc course={course} lesson={lesson} notes={notes} />
        </>
      )}

      <div className="space-y-2 border-t border-neutral-400 px-5 py-4">
        {cls ? <SendNotes cls={cls} note={note} notes={notes} /> : null}
        <p className="text-xs text-neutral-600">
          {cls
            ? `Only you see ${hasDoc ? "this document" : "these notes"} until you send ${hasDoc ? "it" : "them"} to ${cls.name}.`
            : "These notes are yours. Open this lesson from a class to send them to its students."}
          {hasDoc && !note.docManaged && " Make sure the Google Doc itself lets anyone with the link view it."}
          {sentTo.length > 0 && ` Sent to: ${sentTo.join(", ")}.`}
        </p>
      </div>
    </aside>,
    document.body,
  );
}
