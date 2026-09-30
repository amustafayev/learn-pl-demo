import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconNotes, IconClock, IconDoorExit, IconChevronRight } from "@tabler/icons-react";
import { Alert, Badge, Breadcrumbs, Button, Card, CountBadge, Page, PageHeader, SegmentedBar } from "@app/design-system.jsx";
import { useStore, classCourseProgress } from "@app/store.jsx";
import { CLASS_COURSE_STATUS, scheduleLabel } from "@app/data.jsx";
import { timeAgo } from "@app/format.js";
import { useSeen } from "../session.jsx";
import { classCourses, courseOf, finishedLesson, membershipIn, teacherName } from "../lib.js";
import LessonRow from "../components/LessonRow.jsx";
import NoteItem from "../components/NoteItem.jsx";

// One of the student's classes: each course it's taking with its lessons
// (open once the teacher shares them), and every note the teacher sent the
// class, newest first. A class they only asked to join, or left, says so.
export default function ClassPage() {
  const { classId } = useParams();
  const { state } = useStore();
  const { seen } = useSeen();
  const navigate = useNavigate();
  const cls = state.classes.find((c) => c.id === classId);
  const membership = membershipIn(state, classId);
  const crumbs = [{ label: "Home", onClick: () => navigate("/") }, { label: cls?.name || "Class" }];

  if (!cls || !membership) {
    return (
      <Page>
        <Breadcrumbs items={crumbs} />
        <Alert tone="info" title="This class isn't one of yours">Join it with the code from your teacher.</Alert>
      </Page>
    );
  }
  const teacher = teacherName(state, cls.teacherId);
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

  const notes = state.classNotes.filter((n) => n.classId === cls.id);

  return (
    <Page>
      <Breadcrumbs items={crumbs} />
      <PageHeader title={cls.name} sub={`with ${teacher} · ${scheduleLabel(cls.scheduleDays)}`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {classCourses(cls).map((entry) => <ClassCourse key={entry.courseId} cls={cls} entry={entry} />)}
          {!cls.courses.length && <Card className="p-8 text-center text-sm text-neutral-600">{teacher} hasn't started a course with this class yet.</Card>}
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

// A course the class is taking: how far the class is, and its lessons.
function ClassCourse({ cls, entry }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const course = courseOf(state, entry.courseId);
  const p = course && classCourseProgress(state, cls, course.id);
  if (!p) return null;
  const st = CLASS_COURSE_STATUS[entry.status] || CLASS_COURSE_STATUS["in-progress"];
  const open = (lesson) => navigate(`/classes/${cls.id}/lessons/${lesson.id}`);
  const nextOpen = p.next && p.released.has(p.next.id);
  const notesOn = (lessonId) => state.classNotes.filter((n) => n.classId === cls.id && n.lessonId === lessonId).length;
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
        {p.next && entry.status !== "done" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-neutral-700">Next up: <b className="text-neutral-950">Lesson {p.next.n} · {p.next.title}</b></span>
            {nextOpen && (
              <Button size="sm" className="ml-auto" onClick={() => open(p.next)}>Open Lesson {p.next.n} <IconChevronRight size={15} stroke={1.75} /></Button>
            )}
          </div>
        )}
      </div>
      <div className="divide-y divide-neutral-400">
        {p.lessons.map((l) => {
          const taughtAt = p.taughtAt[l.id];
          const status = p.next?.id === l.id ? "next" : taughtAt ? "taught" : "later";
          const n = notesOn(l.id);
          const meta = [taughtAt ? `Taught ${timeAgo(taughtAt)}` : status === "next" ? "Your class is here" : null, n ? `${n} note${n === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
          return (
            <LessonRow key={l.id} lesson={l} status={status} open={p.released.has(l.id)} meta={meta}
              finished={finishedLesson(state, course.id, l.id)} onOpen={() => open(l)} />
          );
        })}
      </div>
    </Card>
  );
}
