import React, { useState } from "react";
import { Check } from "lucide-react";
import { Modal, Field, inputCls, Btn, StudentCheckList } from "../ui.jsx";
import { useStore, groupBankByParent, bankChildLabel } from "../store.jsx";
import { BLOCK_TYPES, LESSON_TEMPLATES } from "../data.jsx";

const HUES = ["indigo", "emerald", "amber", "rose", "sky"];
const HUE_SWATCH = { indigo: "bg-indigo-500", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", sky: "bg-sky-500" };




/* Create a new course */
export function NewCourseModal({ open, onClose }) {
  const { dispatch, toast } = useStore();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("A2 → B1");
  const [hue, setHue] = useState("indigo");
  const [templateId, setTemplateId] = useState("general");
  function create() {
    if (!title.trim()) return toast("Give the course a title", "err");
    dispatch({ type: "ADD_COURSE", title: title.trim(), level, hue, templateId });
    toast("Course created");
    setTitle(""); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="New course" sub="Group lessons into a pathway"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={create}>Create course</Btn></>}>
      <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Emails" autoFocus /></Field>
      <Field label="Level range"><input className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
      <Field label="Lesson template">
        <select className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {Object.values(LESSON_TEMPLATES).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <p className="text-xs text-slate-400 mt-1.5">Sets which block types this course's lessons can use — e.g. IELTS Prep offers Writing Task 1/2 and Speaking Part 1/2/3 instead of generic Writing/Speaking.</p>
      </Field>
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

/* Create a new lesson inside a course */
export function NewLessonModal({ open, onClose, courseId }) {
  const { dispatch, toast } = useStore();
  const [title, setTitle] = useState("");
  function create() {
    if (!title.trim()) return toast("Name the lesson", "err");
    dispatch({ type: "ADD_LESSON", courseId, title: title.trim() });
    toast("Lesson added — open it to build the pathway");
    setTitle(""); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="New lesson" sub="You'll assemble its parts next"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={create}>Add lesson</Btn></>}>
      <Field label="Lesson title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Writing a status update" autoFocus /></Field>
    </Modal>
  );
}

/* Add a reading text to the library */
export function AddTextModal({ open, onClose }) {
  const { dispatch, toast } = useStore();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("IT");
  const [level, setLevel] = useState("B1");
  const [body, setBody] = useState("");
  function create() {
    if (!title.trim() || !body.trim()) return toast("Title and text are required", "err");
    const tokens = body.trim().split(/(\s+)/).map((chunk) => (/\S/.test(chunk) ? { text: chunk } : { text: chunk }));
    dispatch({ type: "ADD_TEXT", text: { title: title.trim(), topic, level, wordCount: body.trim().split(/\s+/).length, hasTranslation: false, body: tokens } });
    toast("Text added to the library");
    setTitle(""); setBody(""); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} wide title="Add reading text" sub="Paste any text — the platform makes each word tappable"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={create}>Add to library</Btn></>}>
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
      <Field label="Text"><textarea className={`${inputCls} h-32 resize-none`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste the passage here…" /></Field>
      <p className="text-xs text-slate-400 -mt-2">In v1, translations + definitions are generated per word. This preview keeps words tappable.</p>
    </Modal>
  );
}

/* Add a block to a lesson (lesson builder) — the offered types come from the
   course's lesson template, not a fixed list, so IELTS/Business/etc. courses
   see a different catalog than General English ones. Block types already
   used in this lesson are highlighted with a count badge, but stay fully
   clickable — a lesson can have two Reading blocks, three Practice blocks, etc. */
export function AddBlockModal({ open, onClose, onPick, types, usedCounts = {}, bank = [], onPickBank }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a block" sub="A lesson is built from skill blocks — each can hold several components">
      <div className="grid grid-cols-2 gap-2">
        {types.map((type) => {
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
