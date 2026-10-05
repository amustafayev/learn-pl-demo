import React, { useState } from "react";
import { IconSend, IconArrowLeft } from "@tabler/icons-react";
import { Modal, Button, Card, PillTabs, LibraryPickList } from "../design-system.jsx";
import { useStore, assignWork } from "../store.jsx";
import { blockMeta } from "../data.jsx";
import { timeAgo } from "../format.js";
import { ComponentKindPicker, ComponentStudent, COMPONENT_META, defaultComponent } from "../views/parts.jsx";

/* =========================================================================
   Everything a teacher can hand to ONE student, in one place: a word set, or a quick one-off task built from any
   component kind — picked, previewed and assigned without leaving this
   dialog ("in-place creation"). Each becomes an `assignments` row
   (ASSIGN_WORK); the student page lists them.
   ========================================================================= */

const TABS = ["words", "new"];

// How an assignment reads in a list — its icon, tone and type label. Shared
// by this dialog and the student page.
export function assignmentLook(a) {
  if (a.kind === "task") {
    const m = COMPONENT_META[a.componentKind] || blockMeta("practice");
    return { icon: m.icon, tone: m.tone, label: "Custom task" };
  }
  if (a.kind === "wordSet") return { ...blockMeta("vocabulary"), label: "Word set" };
  if (a.kind === "reading") return { ...blockMeta("reading"), label: "Reading" };
  const b = blockMeta(a.blockType);
  return { icon: b.icon, tone: b.tone, label: `${b.label} block` };
}

export function StudentAssignModal({ open, onClose, student }) {
  const { state, dispatch, toast } = useStore();
  const [tab, setTab] = useState("words");
  const [preview, setPreview] = useState(null); // { kind, component }
  const [busy, setBusy] = useState(false);

  const close = () => { setPreview(null); setTab("words"); onClose(); };
  if (!student) return null;
  const first = student.name.split(" ")[0];

  // What this student already has, so the lists can say so (assigning twice
  // is allowed — a second go at the same word set is a normal thing to do).
  const given = state.assignments.filter((a) => a.studentId === student.id && a.status !== "withdrawn");
  const givenNote = (a) => (a ? ` · ${a.status === "done" ? "done" : "assigned"} ${timeAgo(a.status === "done" ? a.completedAt : a.assignedAt)}` : "");

  async function give(item) {
    if (busy) return;
    setBusy(true);
    const ok = await assignWork(dispatch, toast, [student.id], item, first);
    setBusy(false);
    if (ok) close();
  }
  const assignWordSet = (id) => {
    const ws = state.wordSets.find((x) => x.id === id);
    if (ws) give({ kind: "wordSet", title: ws.title, source: { wordSetId: ws.id } });
  };
  const assignNew = () => preview && give({ kind: "task", title: COMPONENT_META[preview.kind].label, componentKind: preview.kind, content: preview.component });

  const vocab = blockMeta("vocabulary");
  const wordGroups = [...new Set(state.wordSets.map((ws) => ws.category))].map((cat) => ({
    id: cat, label: cat,
    items: state.wordSets.filter((ws) => ws.category === cat).map((ws) => ({
      id: ws.id, icon: vocab.icon, tone: vocab.tone, label: ws.title,
      description: `${ws.level} · ${ws.words.length} words${givenNote(given.find((a) => a.source?.wordSetId === ws.id))}`,
    })),
  }));

  return (
    <Modal open={open} onClose={close} icon={IconSend} size="lg" title={`Assign to ${first}`}
      sub="A word set, or a quick task you build here"
      footer={tab === "new" && preview ? <>
        <Button variant="outline" onClick={() => setPreview(null)}><IconArrowLeft size={15} stroke={1.75} /> Pick a different kind</Button>
        <Button onClick={assignNew} disabled={busy}><IconSend size={15} stroke={1.75} /> Assign this task</Button>
      </> : undefined}>
      <div className="mb-4">
        <PillTabs value={tab} onChange={(t) => { if (TABS.includes(t)) { setTab(t); setPreview(null); } }} tabs={[
          { id: "words", label: "Word sets", count: state.wordSets.length },
          { id: "new", label: "New task" },
        ]} />
      </div>

      {tab === "words" && (state.wordSets.length
        ? <LibraryPickList groups={wordGroups} onPick={assignWordSet} />
        : <p className="p-2 text-sm text-neutral-600">No word sets in the library yet.</p>)}

      {tab === "new" && (preview ? (
        <div>
          <div className="mb-2 text-sm text-neutral-600">
            <b className="text-neutral-950">{COMPONENT_META[preview.kind].label}</b> — exactly what {first} will see
          </div>
          <Card className="p-4"><ComponentStudent component={preview.component} /></Card>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto pr-0.5">
          <p className="mb-3 text-sm text-neutral-600">Pick a kind — it fills with starter content you can assign as a one-off task.</p>
          <ComponentKindPicker kinds={Object.keys(COMPONENT_META)} onPick={(kind) => setPreview({ kind, component: defaultComponent(kind, state.texts) })} />
        </div>
      ))}
    </Modal>
  );
}
