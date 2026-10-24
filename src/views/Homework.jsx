import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconPlus, IconClipboardText, IconClipboardCheck } from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, Card, Button, Tag } from "../design-system.jsx";
import { useStore } from "../store.jsx";
import { useClassHomework } from "../homework.jsx";
import { classDetailPath, classHomeworkNewPath, classHomeworkPostPath, classHomeworkEditPath } from "../router.jsx";
import { shortDate } from "../format.js";
import { useCourse } from "../features/courses/index.js";

/* =========================================================================
   A class's Classwork (Google Classroom's tab of the same name): every
   assignment posted to this class, grouped by topic — the lesson it belongs
   to, "No topic" first — each showing when it was posted or is due, and, once
   assigned, how many students have Turned in / are still Assigned. Opening
   one goes to its page (assigned) or the composer (draft / scheduled).
   ========================================================================= */

const clock = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Stat({ n, label, tone = "text-neutral-950" }) {
  return (
    <div className="text-center min-w-[3.5rem]">
      <div className={`text-xl font-semibold leading-none tabular-nums ${tone}`}>{n}</div>
      <div className="mt-1 text-[11px] text-neutral-600">{label}</div>
    </div>
  );
}

function PostRow({ post, onOpen }) {
  const due = post.dueAt ? `Due ${shortDate(post.dueAt)}, ${clock(post.dueAt)}` : "No due date";
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-neutral-100 transition-colors">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${post.status === "assigned" ? "bg-primary-500 text-white" : "bg-neutral-300 text-neutral-700"}`}><IconClipboardText size={18} stroke={1.75} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-neutral-950 truncate">{post.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
          {post.status === "draft" && <Tag color="neutral">Draft</Tag>}
          {post.status === "scheduled" && <Tag color="info">Scheduled · {shortDate(post.scheduledAt)}, {clock(post.scheduledAt)}</Tag>}
          {post.status === "assigned" && <span>Posted {shortDate(post.postedAt)}</span>}
          <span>· {due}</span>
          <span>· {post.attachments.length} attachment{post.attachments.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      {post.status === "assigned" && (
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <Stat n={post.turnedIn} label="Turned in" />
          <Stat n={post.assigned} label="Assigned" />
          {post.missing > 0 && <Stat n={post.missing} label="Missing" tone="text-warning-600" />}
        </div>
      )}
    </button>
  );
}

export default function Homework() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { state } = useStore();
  const cls = state.classes.find((x) => x.id === classId);
  const { posts, loading } = useClassHomework(classId);
  // A class takes one course (see CLAUDE.md), so its posts' topics are that
  // course's lessons.
  const { lessons } = useCourse(posts.find((p) => p.courseId)?.courseId);
  if (!cls) return null;

  const topicOf = (p) => {
    const l = p.lessonId && lessons.find((x) => x.id === p.lessonId);
    return l ? { key: l.id, n: l.n, label: `Lesson ${l.n} · ${l.title}` } : { key: "none", n: 0, label: "No topic" };
  };
  const groups = [];
  for (const p of posts) {
    const t = topicOf(p);
    let g = groups.find((x) => x.key === t.key);
    if (!g) { g = { ...t, posts: [] }; groups.push(g); }
    g.posts.push(p);
  }
  groups.sort((a, b) => a.n - b.n);

  const open = (p) => navigate(p.status === "assigned" ? classHomeworkPostPath(cls.id, p.id) : classHomeworkEditPath(cls.id, p.id));
  return (
    <Page>
      <Breadcrumbs items={[{ label: "Classes", onClick: () => navigate("/classes") }, { label: cls.name, onClick: () => navigate(classDetailPath(cls.id)) }, { label: "Classwork" }]} />
      <PageHeader title="Classwork" sub={`${cls.name} · assignments for this class, by lesson`}
        right={<Button variant="primary" size="sm" onClick={() => navigate(classHomeworkNewPath(cls.id))}><IconPlus size={14} stroke={1.75} /> Create assignment</Button>} />
      {groups.length ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 border-b border-primary-300 pb-2 text-lg font-semibold text-neutral-950">{g.label}</h2>
              <Card className="divide-y divide-neutral-200 overflow-hidden">
                {g.posts.map((p) => <PostRow key={p.id} post={p} onOpen={() => open(p)} />)}
              </Card>
            </section>
          ))}
        </div>
      ) : !loading && (
        <Card className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
          <IconClipboardCheck size={20} stroke={1.75} className="text-neutral-400" />
          No assignments yet — create one, or open a lesson in this class and press Assign.
        </Card>
      )}
    </Page>
  );
}
