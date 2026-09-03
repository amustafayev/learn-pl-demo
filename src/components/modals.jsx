import React, { useState, useRef } from "react";
import { IconCheck } from "@tabler/icons-react";
import { Modal, Field, TextField, Select, Button, StudentCheckList, CategoryPicker, LibraryPickList } from "../design-system.jsx";
import { useStore, groupBankByParent, bankChildLabel } from "../store.jsx";
import { BLOCK_TYPES, BLOCK_CATEGORIES, HIGHLIGHT_COLORS } from "../data.jsx";

// A course's "accent" is really just one of the five design tokens under a
// legacy hue name (kept so existing seed courses/CourseCard tone mapping —
// HUE_TO_TONE in Courses.jsx — don't need renaming); render it with the
// literal token classes, never a raw Tailwind color, per the design guide.
const HUES = ["indigo", "emerald", "amber", "rose", "sky"];
const HUE_SWATCH = { indigo: "bg-primary-500", emerald: "bg-success-500", amber: "bg-pending-500", rose: "bg-warning-500", sky: "bg-info-500" };

/* Create a new course */
export function NewCourseModal({ open, onClose }) {
  const { dispatch, toast } = useStore();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("A2 → B1");
  const [hue, setHue] = useState("indigo");
  function create() {
    if (!title.trim()) return toast("Give the course a title", "err");
    dispatch({ type: "ADD_COURSE", title: title.trim(), level, hue, templateId: "general" });
    toast("Course created");
    setTitle(""); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="New course" sub="Group lessons into a pathway"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={create}>Create course</Button></>}>
      <Field label="Title"><TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Emails" autoFocus /></Field>
      <Field label="Level range"><TextField value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
      <Field label="Accent">
        <div className="flex gap-2">
          {HUES.map((h) => (
            <button key={h} type="button" onClick={() => setHue(h)}
              className={`w-8 h-8 rounded-lg ${HUE_SWATCH[h]} flex items-center justify-center transition-all ${hue === h ? "ring-2 ring-offset-2 ring-neutral-400" : ""}`}>
              {hue === h && <IconCheck size={15} stroke={2.5} className="text-white" />}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

/* Create a new lesson inside a course — jumps straight into its pathway
   builder on create (via onCreated) instead of leaving the teacher to find
   the new lesson in the list and open it themselves. */
export function NewLessonModal({ open, onClose, courseId, onCreated }) {
  const { dispatch, toast, uid } = useStore();
  const [title, setTitle] = useState("");
  function create() {
    if (!title.trim()) return toast("Name the lesson", "err");
    const id = uid("l");
    dispatch({ type: "ADD_LESSON", courseId, title: title.trim(), id });
    toast("Lesson added");
    setTitle(""); onClose();
    onCreated?.(id);
  }
  return (
    <Modal open={open} onClose={onClose} title="New lesson" sub="You'll assemble its steps next"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={create}>Add lesson</Button></>}>
      <Field label="Lesson title"><TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Writing a status update" autoFocus /></Field>
    </Modal>
  );
}

/* Add a reading text to the library */
// The passage is authored directly in place: type/paste into the editable
// area below, then select any word or phrase at any time to highlight it
// with a colour and/or tag it with a translation + definition — both write
// onto the same selected run (combinable), matching the {term, az, def,
// example, color} shape the Reader (grammar.jsx) already renders as
// tap-to-translate — so a teacher-authored passage reads identically to the
// seed texts, instead of only ever being plain non-tappable text.
const HIGHLIGHT_LIST = Object.keys(HIGHLIGHT_COLORS).map((id) => ({ id, swatch: HIGHLIGHT_COLORS[id].swatch }));

function markClass({ color, hasDef }) {
  const colorCls = color ? HIGHLIGHT_COLORS[color]?.bg : "";
  return [
    "rp-mark rounded px-0.5 cursor-pointer",
    colorCls || (hasDef ? "bg-primary-100" : "bg-neutral-100"),
    hasDef ? "underline decoration-dotted decoration-primary-400 underline-offset-2" : "",
  ].filter(Boolean).join(" ");
}

function applyMarkStyle(el, { color, az, def, example }) {
  const hasDef = !!((az || "").trim() || (def || "").trim());
  el.dataset.color = color || "";
  el.dataset.az = (az || "").trim();
  el.dataset.def = (def || "").trim();
  el.dataset.example = (example || "").trim();
  el.className = markClass({ color, hasDef });
}

// Walks the contentEditable's DOM to turn it back into the plain body-token
// array the store expects — a `.rp-mark` span becomes a tappable/definition
// or plain-highlighted token, everything else stays plain text.
function extractTokens(root) {
  const tokens = [];
  const pushText = (str) => { if (str) tokens.push({ text: str }); };
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return pushText(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.classList?.contains("rp-mark")) {
      const az = node.dataset.az || "", def = node.dataset.def || "", example = node.dataset.example || "";
      const color = node.dataset.color || "", term = node.textContent;
      if (!term) return;
      if (az || def) tokens.push({ term, az: az || "—", def, example, status: "new", ...(color ? { color } : {}) });
      else tokens.push({ text: term, ...(color ? { color } : {}) });
      return;
    }
    if (node.tagName === "BR") return pushText("\n");
    node.childNodes.forEach(walk);
    if (node.tagName === "DIV") pushText("\n");
  }
  root.childNodes.forEach(walk);
  return tokens;
}

export function AddTextModal({ open, onClose }) {
  const { dispatch, toast } = useStore();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("IT");
  const [level, setLevel] = useState("B1");
  const [isEmpty, setIsEmpty] = useState(true);
  const [popover, setPopover] = useState(null); // { mode: "new"|"edit", top, left, text, color, az, def, example }
  const editorRef = useRef(null);
  const pendingRangeRef = useRef(null);
  const pendingMarkRef = useRef(null);

  function reset() { setTitle(""); setPopover(null); pendingRangeRef.current = null; pendingMarkRef.current = null; }
  function closePopover() { setPopover(null); pendingRangeRef.current = null; pendingMarkRef.current = null; }

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return;
    const text = range.toString();
    if (!text.trim()) return;
    const rect = range.getBoundingClientRect();
    pendingRangeRef.current = range.cloneRange();
    setPopover({ mode: "new", top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 300), text, color: null, az: "", def: "", example: "" });
  }
  function handleEditorClick(e) {
    const markEl = e.target.closest?.(".rp-mark");
    if (!markEl || !editorRef.current?.contains(markEl)) return;
    const rect = markEl.getBoundingClientRect();
    pendingMarkRef.current = markEl;
    setPopover({
      mode: "edit", top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 300), text: markEl.textContent,
      color: markEl.dataset.color || null, az: markEl.dataset.az || "", def: markEl.dataset.def || "", example: markEl.dataset.example || "",
    });
  }
  function saveMark() {
    const { mode, color, az, def, example } = popover;
    if (mode === "new") {
      const range = pendingRangeRef.current;
      if (!range) return closePopover();
      const span = document.createElement("span");
      applyMarkStyle(span, { color, az, def, example });
      try { range.surroundContents(span); }
      catch { toast("Can't tag across existing highlighted text — select a range that doesn't overlap.", "err"); return closePopover(); }
      window.getSelection()?.removeAllRanges();
    } else {
      const el = pendingMarkRef.current;
      if (!el) return closePopover();
      applyMarkStyle(el, { color, az, def, example });
    }
    editorRef.current?.normalize();
    closePopover();
  }
  function removeMark() {
    const el = pendingMarkRef.current;
    if (el) el.replaceWith(document.createTextNode(el.textContent));
    editorRef.current?.normalize();
    closePopover();
  }
  function create() {
    const root = editorRef.current;
    const plainText = root ? root.innerText : "";
    if (!title.trim() || !plainText.trim()) return toast("Title and text are required", "err");
    const bodyTokens = extractTokens(root);
    const hasTranslation = bodyTokens.some((t) => t.term);
    const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
    dispatch({ type: "ADD_TEXT", text: { title: title.trim(), topic, level, wordCount, hasTranslation, body: bodyTokens } });
    toast("Text added to the library");
    reset(); onClose();
  }
  const canSave = !!(popover?.color || popover?.az?.trim() || popover?.def?.trim());

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} wide title="Add reading text" sub="Type or paste the passage, then select any word or phrase to highlight it or add a definition"
      footer={<><Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button><Button onClick={create}>Add to library</Button></>}>
      <Field label="Title"><TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sprint retrospective" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Topic">
          <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {["Everyday", "IT", "Business", "Medical", "Travel", "IELTS", "Academic"].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Level">
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            {["A2", "B1", "B2", "C1"].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Text">
        <div className="relative">
          {isEmpty && <div className="absolute inset-0 p-3.5 text-sm text-neutral-500 pointer-events-none">Type or paste the passage here…</div>}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setIsEmpty(!e.currentTarget.textContent.trim())}
            onMouseUp={handleMouseUp}
            onClick={handleEditorClick}
            className="rounded-xl border border-neutral-300 bg-neutral-100 p-3.5 leading-relaxed text-sm min-h-[128px] max-h-64 overflow-y-auto outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
          />
        </div>
      </Field>
      <p className="text-xs text-neutral-500 -mt-2 mb-1">Select a word or phrase to highlight it with a colour and/or give it a translation + definition. Click a tagged/highlighted run to edit or remove it.</p>

      {popover && (
        <div style={{ position: "fixed", top: popover.top, left: popover.left, zIndex: 60 }}
          className="w-72 bg-white rounded-xl border border-primary-200 shadow-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-primary-900 truncate">“{popover.text}”</div>
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_LIST.map((c) => (
              <button key={c.id} type="button" onClick={() => setPopover((p) => ({ ...p, color: p.color === c.id ? null : c.id }))}
                className={`w-6 h-6 rounded-full ${c.swatch} transition-all ${popover.color === c.id ? "ring-2 ring-offset-1 ring-neutral-500" : ""}`} title={c.id} />
            ))}
            <span className="text-[10px] text-neutral-500 ml-1">highlight colour</span>
          </div>
          <TextField placeholder="Azerbaijani translation" value={popover.az} onChange={(e) => setPopover((p) => ({ ...p, az: e.target.value }))} className="!h-9" />
          <TextField placeholder="Definition (English)" value={popover.def} onChange={(e) => setPopover((p) => ({ ...p, def: e.target.value }))} className="!h-9" />
          <TextField placeholder="Example sentence (optional)" value={popover.example} onChange={(e) => setPopover((p) => ({ ...p, example: e.target.value }))} className="!h-9" />
          <div className="flex justify-end items-center gap-3 pt-1">
            {popover.mode === "edit" && <button type="button" onClick={removeMark} className="text-xs text-warning-600 hover:text-warning-700 mr-auto">Remove</button>}
            <button type="button" onClick={closePopover} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
            <button type="button" onClick={saveMark} disabled={!canSave}
              className={`text-xs font-semibold ${canSave ? "text-primary-600 hover:text-primary-700" : "text-neutral-300 cursor-not-allowed"}`}>Save</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* Add a block to a lesson (lesson builder) — the offered types come from the
   course's lesson template, not a fixed list, so IELTS/Business/etc. courses
   see a different catalog than General English ones. Block types already
   used in this lesson are highlighted with a count badge, but stay fully
   clickable — a lesson can have two Reading blocks, three Practice blocks, etc. */
export function AddBlockModal({ open, onClose, onPick, types, usedCounts = {}, bank = [], onPickBank }) {
  // Categorized so a teacher picks "Reading" and sees reading-shaped block
  // types, instead of every block type from every template thrown at once.
  const groups = BLOCK_CATEGORIES
    .map((cat) => ({
      id: cat.id, label: cat.label,
      items: cat.types.filter((t) => types.includes(t)).map((type) => {
        const BT = BLOCK_TYPES[type];
        return { id: type, icon: BT.icon, tone: BT.tone, label: BT.label, description: BT.description, used: usedCounts[type] || 0 };
      }),
    }))
    .filter((cat) => cat.items.length);

  const bankGroups = groupBankByParent(bank).map(({ parent, items }) => ({
    id: parent, label: parent,
    items: items.map((item) => {
      const BT = BLOCK_TYPES[item.type];
      const child = bankChildLabel(item);
      return { id: item.id, icon: BT.icon, tone: BT.tone, label: item.title, description: `${BT.label} · ${(item.content?.components || []).length} components${child ? ` · ${child}` : ""}` };
    }),
  }));

  return (
    <Modal open={open} onClose={onClose} title="Add a block" sub="A lesson is built from skill blocks — each can hold several components">
      <CategoryPicker groups={groups} onPick={(type) => { onPick(type); onClose(); }} />

      {/* reuse a saved block — deep-copied in, so edits stay local to this lesson. */}
      {bank.length > 0 && onPickBank && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="text-[11px] font-mono uppercase tracking-wide text-neutral-500 mb-2">From My Blocks · ready-made, drops in with all its content</div>
          <LibraryPickList groups={bankGroups} onPick={(id) => { onPickBank(bank.find((b) => b.id === id)); onClose(); }} />
        </div>
      )}
    </Modal>
  );
}

/* Assign content to one or more students */
export function AssignModal({ open, onClose, what, kind, presetStudentId }) {
  const { state, dispatch, toast } = useStore();
  const [sel, setSel] = useState(presetStudentId ? [presetStudentId] : []);
  React.useEffect(() => { if (open) setSel(presetStudentId ? [presetStudentId] : []); }, [open, presetStudentId]);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  function assign() {
    if (!sel.length) return toast("Pick at least one student", "err");
    dispatch({ type: "ASSIGN", studentIds: sel, what, kind });
    toast(`Assigned “${what}” to ${sel.length} student${sel.length > 1 ? "s" : ""}`);
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Assign to students" sub={what}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={assign}>Assign{sel.length ? ` (${sel.length})` : ""}</Button></>}>
      <StudentCheckList students={state.students} isSelected={(s) => sel.includes(s.id)} onToggle={(s) => toggle(s.id)}
        metaFor={(s) => `${s.level} · ${s.status}`} />
    </Modal>
  );
}
