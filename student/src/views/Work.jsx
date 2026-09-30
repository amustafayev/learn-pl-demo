import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconArrowLeft, IconBook, IconCircleCheck, IconChevronRight, IconClipboardList, IconStack2 } from "@tabler/icons-react";
import { Alert, Breadcrumbs, Button, Card, HeaderCard, HeaderCardSection, Page, PageHeader, SectionLabel, Tag } from "@app/design-system.jsx";
import { useStore } from "@app/store.jsx";
import { ASSIGNMENT_KIND_LABEL, blockMeta } from "@app/data.jsx";
import { BlockStudentView, ComponentStudent, COMPONENT_META } from "@app/views/parts.jsx";
import { timeAgo, shortDate } from "@app/format.js";
import { teacherName, toneText } from "../lib.js";

/* Work a teacher assigned to this student (the `assignments` rows): a saved
   block or a one-off task, played from the snapshot the teacher sent
   (`content` — editing the original later never changes it), or a word
   set / reading, which points at the library item. Finishing one sends
   COMPLETE_ASSIGNMENT. Withdrawn work never reaches the student. */

// What the work looks like on its tile: the block type's or component's
// own icon and tone, else a word-set / reading icon.
function lookOf(a) {
  if (a.kind === "block") { const BT = blockMeta(a.blockType); return { icon: BT.icon, tone: BT.tone }; }
  if (a.kind === "task") { const M = COMPONENT_META[a.componentKind]; return { icon: M?.icon || IconClipboardList, tone: M?.tone || "bg-neutral-100 text-neutral-600" }; }
  if (a.kind === "wordSet") return { icon: IconStack2, tone: "bg-primary-50 text-primary-600" };
  return { icon: IconBook, tone: "bg-info-50 text-info-600" };
}

const byNewest = (list) => [...list].sort((x, y) => (x.assignedAt < y.assignedAt ? 1 : -1));
export const openWork = (state) => byNewest((state.assignments || []).filter((a) => a.status === "assigned"));

// One piece of work as a row: its tile, title, kind and when it came.
export function WorkRow({ a }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const { icon: Icon, tone } = lookOf(a);
  const done = a.status === "done";
  return (
    <button type="button" onClick={() => navigate(`/work/${a.id}`)}
      className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors duration-(--dur-fast) hover:bg-neutral-50">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold break-words ${done ? "text-neutral-600" : "text-neutral-950"}`}>{a.title}</span>
        <span className="block text-xs text-neutral-600 mt-0.5">
          {ASSIGNMENT_KIND_LABEL[a.kind]} · from {teacherName(state, a.teacherId)} · {done ? `done ${timeAgo(a.completedAt)}` : `assigned ${timeAgo(a.assignedAt)}`}
        </span>
      </span>
      {done
        ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-success-600"><IconCircleCheck size={15} stroke={1.75} /> Done</span>
        : <IconChevronRight size={16} stroke={1.75} className="shrink-0 text-neutral-500" />}
    </button>
  );
}

export function WorkList() {
  const { state } = useStore();
  const open = openWork(state);
  const done = byNewest(state.assignments.filter((a) => a.status === "done"));
  return (
    <Page>
      <PageHeader title="My work" sub="What your teacher gave you to do on your own — blocks, tasks, word sets and readings." />
      <SectionLabel>To do</SectionLabel>
      <Card className="overflow-hidden mb-8">
        {open.length
          ? <div className="divide-y divide-neutral-400">{open.map((a) => <WorkRow key={a.id} a={a} />)}</div>
          : <p className="p-6 text-center text-sm text-neutral-600">Nothing to do right now. When your teacher assigns something, it shows up here.</p>}
      </Card>
      {done.length > 0 && (
        <>
          <SectionLabel>Done</SectionLabel>
          <Card className="overflow-hidden">
            <div className="divide-y divide-neutral-400">{done.map((a) => <WorkRow key={a.id} a={a} />)}</div>
          </Card>
        </>
      )}
    </Page>
  );
}

// One piece of work, played in the same card as a lesson step.
export function WorkPage() {
  const { assignmentId } = useParams();
  const { state, dispatch, toast } = useStore();
  const navigate = useNavigate();
  const a = state.assignments.find((x) => x.id === assignmentId);
  const crumbs = [{ label: "My work", onClick: () => navigate("/work") }, { label: a?.title || "Work" }];
  if (!a) {
    return (
      <Page>
        <Breadcrumbs items={crumbs} />
        <Alert tone="info" title="This work isn't here any more">Your teacher may have taken it back.</Alert>
      </Page>
    );
  }
  const { icon, tone } = lookOf(a);
  const done = a.status === "done";
  const finish = () => {
    dispatch({ type: "COMPLETE_ASSIGNMENT", assignmentId: a.id, studentId: state.me.id });
    toast(`“${a.title}” done — nice work!`);
  };
  return (
    <Page>
      <Breadcrumbs items={crumbs} />
      <HeaderCard sectioned icon={icon} iconClassName={toneText(tone)} title={a.title}
        kicker={`${ASSIGNMENT_KIND_LABEL[a.kind]} · from ${teacherName(state, a.teacherId)} · assigned ${timeAgo(a.assignedAt)}`}
        right={done && <Tag color="success"><IconCircleCheck size={13} stroke={1.75} /> Done {shortDate(a.completedAt)}</Tag>}>
        <HeaderCardSection well>
          <WorkContent a={a} />
        </HeaderCardSection>
      </HeaderCard>
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate("/work")}><IconArrowLeft size={16} stroke={1.75} /> My work</Button>
        {!done && <Button variant="dark" onClick={finish}><IconCircleCheck size={16} stroke={1.75} /> Mark as done</Button>}
      </div>
    </Page>
  );
}

// The work itself, through the same renderers a lesson uses.
function WorkContent({ a }) {
  const { state } = useStore();
  if (a.kind === "block") return <BlockStudentView block={{ id: a.id, type: a.blockType, content: a.content || { components: [] } }} />;
  if (a.kind === "task") return a.content ? <ComponentStudent component={a.content} /> : <Missing />;
  if (a.kind === "wordSet") {
    const ws = state.wordSets.find((w) => w.id === a.source?.wordSetId);
    return ws ? <ComponentStudent component={{ id: a.id, kind: "wordlist", items: ws.words }} /> : <Missing />;
  }
  const text = state.texts.find((t) => t.id === a.source?.textId);
  return text ? <ComponentStudent component={{ id: a.id, kind: "passage", textId: text.id }} /> : <Missing />;
}

function Missing() {
  return <Card className="p-8 text-center text-sm text-neutral-600">This item isn't in the library any more — ask your teacher.</Card>;
}
