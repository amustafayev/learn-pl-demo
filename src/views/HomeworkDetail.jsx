import React, { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { IconPencil, IconTrash, IconClipboardText } from "@tabler/icons-react";
import { Page, Breadcrumbs, Card, Button, Tag, Avatar, PillTabs, Modal } from "../design-system.jsx";
import { useHomeworkPost, useHomeworkActions } from "../homework.jsx";
import { classDetailPath, classHomeworkPath, classHomeworkEditPath } from "../router.jsx";
import { assignmentLook } from "../components/StudentAssignModal.jsx";
import { describeAttachment } from "../components/HomeworkAttachment.jsx";
import { shortDate, timeAgo } from "../format.js";
import { useCourse } from "../features/courses/index.js";
import { useClass } from "../features/classes/index.js";
import { useStudentNames } from "../features/students/index.js";

/* =========================================================================
   One assignment, the way Google Classroom shows it: the title and when it
   was posted / is due, then two tabs — Instructions (what students were
   given) and Student work (Turned in / Assigned / Missing, and each
   student's status). Edit changes title, instructions and due date; Delete
   takes back what students haven't done (done work stays as history).
   ========================================================================= */

const clock = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const STATUS = {
  turnedIn: { label: "Turned in", tag: "success", order: 1 },
  assigned: { label: "Assigned", tag: "neutral", order: 2 },
  missing: { label: "Missing", tag: "warning", order: 0 },
};

function Tile({ n, label, tone }) {
  return (
    <Card className="p-4 text-center">
      <div className={`text-3xl font-semibold tabular-nums ${tone}`}>{n}</div>
      <div className="mt-1 text-sm text-neutral-600">{label}</div>
    </Card>
  );
}

export default function HomeworkDetail() {
  const { classId, homeworkId } = useParams();
  const navigate = useNavigate();
  const { remove } = useHomeworkActions();
  const [tab, setTab] = useState("work");
  const [confirm, setConfirm] = useState(false);
  const { cls } = useClass(classId);
  const { nameOf: nameFor } = useStudentNames();
  const { post, loading } = useHomeworkPost(classId, homeworkId);
  const { lessons } = useCourse(post?.courseId);
  if (!cls || loading) return null;
  if (!post) return <Navigate to={classHomeworkPath(classId)} replace />;

  const topic = post.lessonId && lessons.find((l) => l.id === post.lessonId);
  const nameOf = (id) => nameFor(id) || "Student";
  const rows = [...post.students].sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || nameOf(a.studentId).localeCompare(nameOf(b.studentId)));
  const del = async () => { await remove(cls.id, post); navigate(classHomeworkPath(cls.id)); };

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Classes", onClick: () => navigate("/classes") }, { label: cls.name, onClick: () => navigate(classDetailPath(cls.id)) },
        { label: "Classwork", onClick: () => navigate(classHomeworkPath(cls.id)) }, { label: post.title }]} />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white"><IconClipboardText size={20} stroke={1.75} /></span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{post.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
              <span>{cls.name}</span>
              {topic && <Tag color="neutral">Lesson {topic.n} · {topic.title}</Tag>}
              <span>· Posted {shortDate(post.postedAt)} ({timeAgo(post.postedAt)})</span>
              <span>· {post.dueAt ? `Due ${shortDate(post.dueAt)}, ${clock(post.dueAt)}` : "No due date"}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(classHomeworkEditPath(cls.id, post.id))}><IconPencil size={14} stroke={1.75} /> Edit</Button>
          <Button variant="outline" size="sm" onClick={() => setConfirm(true)}><IconTrash size={14} stroke={1.75} /> Delete</Button>
        </div>
      </div>

      <div className="mb-5">
        <PillTabs value={tab} onChange={setTab} tabs={[{ id: "work", label: "Student work", count: rows.length }, { id: "instructions", label: "Instructions" }]} />
      </div>

      {tab === "work" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Tile n={post.turnedIn} label="Turned in" tone="text-success-600" />
            <Tile n={post.assigned} label="Assigned" tone="text-neutral-950" />
            <Tile n={post.missing} label="Missing" tone={post.missing ? "text-warning-600" : "text-neutral-950"} />
          </div>
          <Card className="divide-y divide-neutral-200 overflow-hidden">
            {rows.map((r) => (
              <div key={r.studentId} className="flex items-center gap-3 p-3.5">
                <Avatar name={nameOf(r.studentId)} size="sm" color={r.status === "turnedIn" ? "success" : r.status === "missing" ? "warning" : "neutral"} />
                <div className="min-w-0 flex-1 text-sm font-medium text-neutral-950 truncate">{nameOf(r.studentId)}</div>
                {r.doneAt && <span className="text-xs text-neutral-600">{timeAgo(r.doneAt)}</span>}
                <Tag color={STATUS[r.status].tag}>{STATUS[r.status].label}</Tag>
              </div>
            ))}
            {!rows.length && <p className="p-4 text-sm text-neutral-600">No students had this assigned.</p>}
          </Card>
        </div>
      ) : (
        <Card className="p-5 space-y-5 max-w-3xl">
          <p className="whitespace-pre-wrap text-sm text-neutral-900">{post.instructions || <span className="text-neutral-600">No instructions.</span>}</p>
          {post.attachments.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-neutral-950">Attachments</div>
              <ul className="space-y-2">
                {post.attachments.map((a) => {
                  const look = assignmentLook(a); const Icon = look.icon; const dsc = describeAttachment(a);
                  return (
                    <li key={a.id} className="flex items-start gap-3 rounded-lg border border-neutral-300 p-3">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${look.tone}`}><Icon size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-neutral-950 truncate">{dsc.title}</div>
                        <div className="text-xs text-neutral-600 truncate">{dsc.sub}</div>
                        {dsc.chips?.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{dsc.chips.map((c, i) => <span key={i} className="rounded-md bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700">{c}</span>)}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} icon={IconTrash} iconTone="warning" title="Delete this assignment?" sub={post.title}
        footer={<><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={del}>Delete</Button></>}>
        <p className="text-sm text-neutral-700">Work students haven't turned in is taken back. Work already turned in stays in their history.</p>
      </Modal>
    </Page>
  );
}
