import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IconPlus, IconX, IconPaperclip, IconClipboardText, IconPencil, IconChevronUp } from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, Card, Button, Field, TextField, TextArea, Select } from "../design-system.jsx";
import { uid } from "../store.jsx";
import { useToast } from "../toasts.jsx";
import { useHomeworkActions, useHomeworkPost } from "../features/homework/index.js";
import { classDetailPath, classHomeworkPath, classHomeworkPostPath } from "../router.jsx";
import { assignmentLook } from "../components/StudentAssignModal.jsx";
import { defaultComponent, ComponentPicker, ComponentEditor } from "./parts.jsx";
import { describeAttachment, compLabel } from "../components/HomeworkAttachment.jsx";
import { useReadingTexts } from "../features/readings/index.js";
import { useSavedComponents } from "../features/savedComponents/index.js";
import { useCourse } from "../features/courses/index.js";
import { useClass, activeCourseOf } from "../features/classes/index.js";
import { useClassMembers } from "../features/students/index.js";

/* =========================================================================
   The assignment composer — Google Classroom's "Create assignment" page, for
   the whole class (assigning to individual students isn't in yet). Left: the
   title, instructions and attachments (this lesson's blocks / components, or
   a library word set). Right: the class, topic (the lesson), due date and
   time, and — until it's posted — when to send it. Save draft, Schedule or
   Assign. Opening a posted assignment here only edits title, instructions
   and due date (what students were given stays as it was).
   ========================================================================= */

const pad = (n) => String(n).padStart(2, "0");
const dateInput = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeInput = (iso) => { if (!iso) return "23:59"; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toIso = (date, time) => (date ? new Date(`${date}T${time || "23:59"}`).toISOString() : null);

const taskAttachment = (component, title, from) => ({ key: `new:${component.id}`, kind: "task", title, componentKind: component.kind, content: component, source: { from } });


function AttachmentRow({ a, editable, open, onToggle, onRemove, onContent }) {
  const look = assignmentLook(a); const Icon = look.icon;
  const d = describeAttachment(a);
  const canEdit = editable && a.kind === "task" && a.content;
  return (
    <li className="rounded-lg border border-neutral-300">
      <div className="flex items-start gap-3 p-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${look.tone}`}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-neutral-950 truncate">{d.title}</div>
          <div className="text-xs text-neutral-600 truncate">{d.sub}</div>
          {d.chips?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">{d.chips.map((c, i) => <span key={i} className="rounded-md bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700">{c}</span>)}</div>
          )}
        </div>
        {canEdit && <Button variant="light" size="sm" onClick={onToggle}>{open ? <><IconChevronUp size={14} stroke={1.75} /> Done</> : <><IconPencil size={14} stroke={1.75} /> Edit</>}</Button>}
        {editable && <button type="button" aria-label="Remove attachment" onClick={onRemove} className="p-1 text-neutral-500 hover:text-warning-600"><IconX size={16} stroke={1.75} /></button>}
      </div>
      {open && canEdit && (
        <div className="border-t border-neutral-200 p-4">
          <ComponentEditor component={a.content} onChange={onContent} />
        </div>
      )}
    </li>
  );
}

export default function HomeworkEdit() {
  const { classId, homeworkId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { texts } = useReadingTexts();
  const { items: savedComponents } = useSavedComponents();
  const { saveDraft, publish, update } = useHomeworkActions();
  const { cls } = useClass(classId);
  const { members } = useClassMembers(classId);
  const { post, loading } = useHomeworkPost(classId, homeworkId);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [lessonId, setLessonId] = useState(params.get("lessonId") || "");
  const [attachments, setAttachments] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [pickerKey, setPickerKey] = useState(null); // the component picker dialog is open while this is a number
  const [editingKey, setEditingKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!homeworkId);

  // Editing an existing post: fill the form once it arrives.
  useEffect(() => {
    if (!homeworkId || loading || loaded) return;
    if (post) {
      setTitle(post.title); setInstructions(post.instructions || ""); setLessonId(post.lessonId || "");
      setAttachments(post.attachments || []); setDueDate(dateInput(post.dueAt)); setDueTime(timeInput(post.dueAt));
    }
    setLoaded(true);
  }, [homeworkId, loading, loaded, post]);

  const active = cls ? activeCourseOf(cls) : null;
  const courseId = active?.courseId || null;
  const { lessons } = useCourse(courseId);
  const lesson = lessons.find((l) => l.id === lessonId) || null;
  const posted = post?.status === "assigned";
  const keyOf = (a) => a.key || a.id;
  const locked = new Set(posted ? (post.attachments || []).map(keyOf) : []); // already given to students

  if (!cls) return null;
  const patchContent = (a, patch) => setAttachments((list) => list.map((x) => (x !== a ? x : {
    ...x, content: { ...x.content, ...patch }, title: patch.title !== undefined ? patch.title || x.title : x.title,
  })));
  // From the component picker (same dialog as adding a part to a block): a new
  // component opens its editor inline; a saved one comes in as its own copy.
  function addKind(kind) {
    const c = defaultComponent(kind, texts);
    const att = taskAttachment(c, compLabel(c), "Created here");
    setAttachments((x) => [...x, att]);
    setEditingKey(att.key); setPickerKey(null);
  }
  function addSaved(id) {
    const item = savedComponents.find((b) => b.id === id);
    if (!item) return;
    const c = { ...JSON.parse(JSON.stringify(item.data)), id: uid("c") };
    const att = taskAttachment(c, item.title || compLabel(c), "Saved components");
    setAttachments((x) => [...x, att]);
    setEditingKey(att.key); setPickerKey(null);
  }

  const current = () => ({
    id: homeworkId || undefined, classId: cls.id, title, instructions, lessonId: lesson?.id || null, courseId: lesson ? courseId : null,
    attachments, dueAt: toIso(dueDate, dueTime),
  });
  const back = () => navigate(posted ? classHomeworkPostPath(cls.id, homeworkId) : classHomeworkPath(cls.id));
  const needTitle = () => { if (!title.trim()) { toast("Give the assignment a title", "err"); return true; } return false; };

  async function onDraft() {
    if (busy || needTitle()) return;
    setBusy(true);
    const ok = await saveDraft(cls.id, current());
    setBusy(false);
    if (ok) navigate(classHomeworkPath(cls.id));
  }
  async function onPublish() {
    if (busy || needTitle()) return;
    if (!attachments.length) return toast("Add a component first — students need something to complete", "err");
    if (!members.length) return toast("This class has no students to assign to yet", "err");
    setBusy(true);
    const ok = await publish(cls.id, current(), { scheduledAt: null });
    setBusy(false);
    if (ok) navigate(classHomeworkPath(cls.id));
  }
  async function onSave() {
    if (busy || needTitle()) return;
    setBusy(true);
    await update(cls.id, homeworkId, { title: title.trim(), instructions, dueAt: toIso(dueDate, dueTime), addAttachments: attachments.filter((a) => !locked.has(keyOf(a))) });
    setBusy(false);
    back();
  }

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Classes", onClick: () => navigate("/classes") }, { label: cls.name, onClick: () => navigate(classDetailPath(cls.id)) },
        { label: "Classwork", onClick: () => navigate(classHomeworkPath(cls.id)) }, { label: homeworkId ? "Edit assignment" : "New assignment" }]} />
      <PageHeader title={homeworkId ? "Edit assignment" : "Create assignment"} sub={`${cls.name} · ${members.length} student${members.length === 1 ? "" : "s"}`}
        right={<div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={back}>Cancel</Button>
          {posted ? <Button size="sm" onClick={onSave} disabled={busy}>Save</Button> : <>
            <Button variant="outline" size="sm" onClick={onDraft} disabled={busy}>Save draft</Button>
            <Button size="sm" onClick={onPublish} disabled={busy}>Assign</Button>
          </>}
        </div>} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        {/* title, instructions, attachments */}
        <div className="space-y-4 min-w-0">
          <Card className="p-5 space-y-4">
            <Field label="Title"><TextField autoFocus={!homeworkId} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Describe your job — 5 sentences" /></Field>
            <Field label="Instructions (optional)"><TextArea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="What should students do, and how will you check it?" /></Field>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-950"><IconPaperclip size={16} stroke={1.75} /> Attachments{attachments.length ? ` · ${attachments.length}` : ""}</h3>
            {attachments.length ? (
              <ul className="space-y-2">
                {attachments.map((a) => (
                  <AttachmentRow key={keyOf(a)} a={a} editable={!locked.has(keyOf(a))} open={editingKey === keyOf(a)}
                    onToggle={() => setEditingKey((k) => (k === keyOf(a) ? null : keyOf(a)))}
                    onRemove={() => setAttachments((x) => x.filter((y) => y !== a))}
                    onContent={(patch) => patchContent(a, patch)} />
                ))}
              </ul>
            ) : <p className="text-sm text-neutral-600">Nothing attached yet. Add a component to give students something to do.</p>}

            <div className="mt-4 border-t border-neutral-200 pt-4">
              <Button variant="outline" size="sm" onClick={() => setPickerKey((k) => (k || 0) + 1)}><IconPlus size={15} stroke={1.75} /> Add component</Button>
            </div>
          </Card>
        </div>

        {/* for, topic, due, send */}
        <Card className="p-4 space-y-4 lg:sticky lg:top-4">
          <Field label="For"><div className="flex items-center gap-2 text-sm text-neutral-900"><IconClipboardText size={15} stroke={1.75} className="text-neutral-500" /> {cls.name} · all students</div></Field>
          <Field label="Topic">
            <Select value={lessonId} disabled={posted} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">No topic</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>Lesson {l.n} · {l.title}</option>)}
            </Select>
          </Field>
          <div>
            <div className="mb-1.5 text-sm font-medium text-neutral-800">Due</div>
            <div className="grid grid-cols-[1fr_6.5rem] gap-2">
              <TextField type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <TextField type="time" value={dueTime} disabled={!dueDate} onChange={(e) => setDueTime(e.target.value)} />
            </div>
            {dueDate && <button type="button" onClick={() => setDueDate("")} className="mt-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">No due date</button>}
          </div>
          {posted && <p className="text-xs text-neutral-600">Already assigned. Title, instructions and due date can change, and new components go out to students right away; what they were given stays as it was.</p>}
        </Card>
      </div>
      <ComponentPicker key={pickerKey ?? "closed"} open={pickerKey !== null} onClose={() => setPickerKey(null)}
        blockLabel="an assignment" suggested={[]} components={attachments.map((a) => a.content).filter((c) => c && c.kind)}
        bank={savedComponents} position={title.trim() ? `Attach to “${title.trim()}”` : "Attach to this assignment"}
        onPickKind={addKind} onPickSaved={addSaved} />
    </Page>
  );
}
