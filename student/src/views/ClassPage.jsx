import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconNotes, IconClock, IconDoorExit, IconChevronRight } from "@tabler/icons-react";
import { Alert, Badge, Breadcrumbs, Button, Card, CountBadge, Page, PageHeader, SegmentedBar } from "@app/design-system.jsx";
import { CLASS_COURSE_STATUS } from "@app/data.jsx";
import { scheduleLabel } from "@app/schedule.js";
import { timeAgo } from "@app/format.js";
import { useSeen } from "../session.jsx";
import { inProgressFirst, teacherName } from "../lib.js";
import LessonRow from "../components/LessonRow.jsx";
import { useMyNotes } from "@app/features/notes/index.js";
import { useMyClassPage } from "@app/features/learning/index.js";
import NoteItem from "../components/NoteItem.jsx";

// One of the student's classes: each course it's taking with its lessons
// (open once the teacher shares them), and every note the teacher sent the
// class, newest first. A class they only asked to join, or left, says so.
export default function ClassPage() {
  const { classId } = useParams();
  const { seen } = useSeen();
  const { notes: myNotes } = useMyNotes();
  const { page, loading } = useMyClassPage(classId);
  const navigate = useNavigate();
  const cls = page?.class;
  const membership = cls?.membership;
  const crumbs = [{ label: "Home", onClick: () => navigate("/") }, { label: cls?.name || "Class" }];

  if (loading) return null;
  if (!cls || !membership) {
    return (
      <Page>
        <Breadcrumbs items={crumbs} />
        <Alert tone="info" title="This class isn't one of yours">Join it with the code from your teacher.</Alert>
      </Page>
    );
  }
  const teacher = teacherName(cls.teacher);
  if (membership.status !== "active") {
    const waiting = membership.status === "requested";
    return (
      <Page>
        <Breadcrumbs items={crumbs} />
        <PageHeader title={cls.name} sub={`with ${teacher}`} />
        <Alert tone={waiting ? "pending" : "info"} icon={waiting ? IconClock : IconDoorExit}
          title={waiting ? `Waiting for ${teacher} to accept you` : "You're no longer in this class"}>
          {waiting
            ? `You asked ${timeAgo(membership.requestedAt)}. Its lessons and notes open here once you're in.`
            : "Its lessons and notes aren't available any more. Ask your teacher if you'd like to come back."}
        </Alert>
      </Page>
    );
  }

  const notes = myNotes.filter((n) => n.classId === cls.id);

  return (
    <Page>
      <Breadcrumbs items={crumbs} />
      <PageHeader title={cls.name} sub={`with ${teacher} · ${scheduleLabel(cls.schedule)}`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {inProgressFirst(page.courses).map((c) => <ClassCourse key={c.course.id} classId={cls.id} course={c} notes={notes} />)}
          {!page.courses.length && <Card className="p-8 text-center text-sm text-neutral-600">{teacher} hasn't started a course with this class yet.</Card>}
        </div>
        <div>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1 text-base font-semibold text-neutral-950">
              <IconNotes size={18} stroke={1.75} /> Notes from {teacher.split(" ")[0]} <CountBadge>{notes.length}</CountBadge>
            </div>
            {notes.length ? (
              <div className="divide-y divide-neutral-400">
                {notes.map((n) => <NoteItem key={n.id} note={n} showClass={false} isNew={!seen.has(n.id)} />)}
              </div>
            ) : (
              <p className="py-4 text-sm text-neutral-600">No notes yet. When {teacher.split(" ")[0]} sends one, it shows up here and inside its lesson.</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

// A course the class is taking (one of MyClassPage's courses): how far the
// class is, and its lessons.
function ClassCourse({ classId, course: p, notes }) {
  const navigate = useNavigate();
  const { course } = p;
  const st = CLASS_COURSE_STATUS[p.status] || CLASS_COURSE_STATUS["in-progress"];
  const open = (lesson) => navigate(`/classes/${classId}/lessons/${lesson.id}`);
  const nextOpen = p.next && p.lessons.some((row) => row.lesson.id === p.next.id && row.open);
  const notesOn = (lessonId) => notes.filter((n) => n.lessonId === lessonId).length;
  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-neutral-400">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="font-bold text-neutral-950 truncate">{course.title}</div>
            <div className="text-sm text-neutral-600 mt-0.5">{course.level} · {p.taughtCount} of {p.total} lessons taught</div>
          </div>
          <Badge color={st.color}>{st.label}</Badge>
        </div>
        <SegmentedBar pct={p.pct} cells={Math.max(p.total, 1)} />
        {p.next && p.status !== "done" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-neutral-700">Next up: <b className="text-neutral-950">Lesson {p.next.n} · {p.next.title}</b></span>
            {nextOpen && (
              <Button size="sm" className="ml-auto" onClick={() => open(p.next)}>Open Lesson {p.next.n} <IconChevronRight size={15} stroke={1.75} /></Button>
            )}
          </div>
        )}
      </div>
      <div className="divide-y divide-neutral-400">
        {p.lessons.map(({ lesson: l, open: isOpen, taughtAt, isNext, finished }) => {
          const status = isNext ? "next" : taughtAt ? "taught" : "later";
          const n = notesOn(l.id);
          const meta = [taughtAt ? `Taught ${timeAgo(taughtAt)}` : status === "next" ? "Your class is here" : null, n ? `${n} note${n === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
          return (
            <LessonRow key={l.id} lesson={l} status={status} open={isOpen} meta={meta}
              finished={finished} onOpen={() => open(l)} />
          );
        })}
      </div>
    </Card>
  );
}
