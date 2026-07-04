import React, { useState } from "react";
import { Check } from "lucide-react";
import { Modal, Field, inputCls, Btn, Avatar } from "../ui.jsx";
import { useStore } from "../store.jsx";
import { PART_TYPES, PART_ORDER } from "../data.jsx";

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
    dispatch({ type: "ADD_COURSE", title: title.trim(), level, hue });
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
            {["Everyday", "IT", "Business", "Travel", "IELTS", "Academic"].map((t) => <option key={t}>{t}</option>)}
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

/* Add a part to a lesson (lesson builder) */
export function AddPartModal({ open, onClose, onPick }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a part" sub="A lesson is built from these blocks">
      <div className="grid grid-cols-2 gap-2">
        {PART_ORDER.map((type) => {
          const P = PART_TYPES[type]; const I = P.icon;
          return (
            <button key={type} onClick={() => { onPick(type); onClose(); }}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-3 text-left transition-colors">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${P.tone}`}><I size={17} /></span>
              <span className="text-sm font-medium">{P.label}</span>
            </button>
          );
        })}
      </div>
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
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {state.students.map((s) => {
          const on = sel.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{s.level} · {s.status}</div>
              </div>
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                {on && <Check size={13} className="text-white" />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
