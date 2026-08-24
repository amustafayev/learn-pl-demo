import React, { useState, useRef } from "react";
import { Check } from "lucide-react";
import { Modal, Field, inputCls, Btn, StudentCheckList } from "../ui.jsx";
import { useStore, groupBankByParent, bankChildLabel } from "../store.jsx";
import { BLOCK_TYPES, BLOCK_CATEGORIES, HIGHLIGHT_COLORS } from "../data.jsx";

const HUES = ["indigo", "emerald", "amber", "rose", "sky"];
const HUE_SWATCH = { indigo: "bg-indigo-500", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", sky: "bg-sky-500" };




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
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={create}>Create course</Btn></>}>
      <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Emails" autoFocus /></Field>
      <Field label="Level range"><input className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
      <Field label="Accent">
        <div className="flex gap-2">
          {HUES.map((h) => (
            <button key={h} onClick={() => setHue(h)} className={`w-8 h-8 rounded-lg ${HUE_SWATCH[h]} flex items-center justify-center ${hue === h ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}>
              {hue === h && <Check size={15} className="text-white" />}
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
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={create}>Add lesson</Btn></>}>
      <Field label="Lesson title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Writing a status update" autoFocus /></Field>
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
    colorCls || (hasDef ? "bg-indigo-100" : "bg-slate-100"),
    hasDef ? "underline decoration-dotted decoration-indigo-400 underline-offset-2" : "",
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
      footer={<><Btn variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Btn><Btn onClick={create}>Add to library</Btn></>}>
      <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sprint retrospective" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Topic">
          <select className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {["Everyday", "IT", "Business", "Medical", "Travel", "IELTS", "Academic"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Level">
          <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)}>
            {["A2", "B1", "B2", "C1"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Text">
        <div className="relative">
          {isEmpty && <div className="absolute inset-0 p-3 text-sm text-slate-400 pointer-events-none">Type or paste the passage here…</div>}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setIsEmpty(!e.currentTarget.textContent.trim())}
            onMouseUp={handleMouseUp}
            onClick={handleEditorClick}
            className="rounded-lg border border-slate-200 p-3 leading-relaxed text-sm bg-slate-50/50 min-h-[128px] max-h-64 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </Field>
      <p className="text-xs text-slate-400 -mt-2 mb-1">Select a word or phrase to highlight it with a colour and/or give it a translation + definition. Click a tagged/highlighted run to edit or remove it.</p>

      {popover && (
        <div style={{ position: "fixed", top: popover.top, left: popover.left, zIndex: 60 }}
          className="w-72 bg-white rounded-xl border border-indigo-200 shadow-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-indigo-900 truncate">“{popover.text}”</div>
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_LIST.map((c) => (
              <button key={c.id} type="button" onClick={() => setPopover((p) => ({ ...p, color: p.color === c.id ? null : c.id }))}
                className={`w-6 h-6 rounded-full ${c.swatch} transition-all ${popover.color === c.id ? "ring-2 ring-offset-1 ring-slate-500" : ""}`} title={c.id} />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">highlight colour</span>
          </div>
          <input className={inputCls} placeholder="Azerbaijani translation" value={popover.az} onChange={(e) => setPopover((p) => ({ ...p, az: e.target.value }))} />
          <input className={inputCls} placeholder="Definition (English)" value={popover.def} onChange={(e) => setPopover((p) => ({ ...p, def: e.target.value }))} />
          <input className={inputCls} placeholder="Example sentence (optional)" value={popover.example} onChange={(e) => setPopover((p) => ({ ...p, example: e.target.value }))} />
          <div className="flex justify-end items-center gap-3 pt-1">
            {popover.mode === "edit" && <button type="button" onClick={removeMark} className="text-xs text-rose-500 hover:text-rose-700 mr-auto">Remove</button>}
            <button type="button" onClick={closePopover} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
            <button type="button" onClick={saveMark} disabled={!canSave}
              className={`text-xs font-semibold ${canSave ? "text-indigo-600 hover:text-indigo-700" : "text-slate-300 cursor-not-allowed"}`}>Save</button>
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
    .map((cat) => ({ ...cat, types: cat.types.filter((t) => types.includes(t)) }))
    .filter((cat) => cat.types.length);
  return (
    <Modal open={open} onClose={onClose} title="Add a block" sub="A lesson is built from skill blocks — each can hold several components">
      <div className="space-y-4">
        {groups.map((cat) => (
          <div key={cat.id}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{cat.label}</div>
            <div className="grid grid-cols-2 gap-2">
              {cat.types.map((type) => {
                const BT = BLOCK_TYPES[type]; const I = BT.icon;
                const used = usedCounts[type] || 0;
                return (
                  <button key={type} onClick={() => { onPick(type); onClose(); }}
                    className={`relative flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${used ? "border-indigo-300 bg-indigo-50/60 hover:bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40"}`}>
                    {used > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{used}</span>}
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${BT.tone}`}><I size={17} /></span>
                    <span>
                      <span className="text-sm font-medium block">{BT.label}</span>
                      {BT.description && <span className="text-[11px] text-slate-400 block mt-0.5">{BT.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* reuse a saved block — deep-copied in, so edits stay local to this lesson.
          Grouped by the course/parent it was saved from, so a growing bank
          reads as folders instead of one flat list. */}
      {bank.length > 0 && onPickBank && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-2">From My Blocks · ready-made, drops in with all its content</div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-0.5">
            {groupBankByParent(bank).map(({ parent, items }) => (
              <div key={parent}>
                <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-500/80 mb-1.5 px-0.5">{parent}</div>
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const BT = BLOCK_TYPES[item.type]; const I = BT.icon;
                    const child = bankChildLabel(item);
                    return (
                      <button key={item.id} onClick={() => { onPickBank(item); onClose(); }}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-2.5 text-left transition-colors">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${BT.tone}`}><I size={15} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="text-sm font-medium block truncate">{item.title}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{BT.label} · {(item.content?.components || []).length} components{child ? ` · ${child}` : ""}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={assign}>Assign{sel.length ? ` (${sel.length})` : ""}</Btn></>}>
      <StudentCheckList students={state.students} isSelected={(s) => sel.includes(s.id)} onToggle={(s) => toggle(s.id)}
        metaFor={(s) => `${s.level} · ${s.status}`} />
    </Modal>
  );
}
