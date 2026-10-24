import React from "react";
import { useNavigate } from "react-router-dom";
import { IconUserPlus, IconSchool, IconMail, IconClock, IconChevronRight, IconBook2, IconCircleCheck, IconNotes } from "@tabler/icons-react";
import { Alert, Button, Card, ClassCard, CourseCard, PageHeader, Page, SectionLabel } from "@app/design-system.jsx";
import { scheduleLabel } from "@app/schedule.js";
import { timeAgo } from "@app/format.js";
import { useToast } from "@app/toasts.jsx";
import { useSeen } from "../session.jsx";
import { finishedPct, firstName, teacherName, toneOf } from "../lib.js";
import { useMyNotes } from "@app/features/notes/index.js";
import { useMe } from "@app/features/account/index.js";
import { useMyClasses, useMyCourses } from "@app/features/learning/index.js";
import { useMyInvitations } from "@app/features/joining/index.js";
import { useMyPurchases } from "@app/features/sales/index.js";
import NoteItem from "../components/NoteItem.jsx";
import { WorkRow } from "./Work.jsx";
import { useMyWork } from "@app/features/assignments/index.js";

// The student's start page: anything waiting on them (an invite) or on
// their teacher (a join request, a payment to confirm), their classes with
// where each one is, work to do, the latest notes, and courses they bought.
export default function Home() {
  const toast = useToast();
  const navigate = useNavigate();
  const { seen } = useSeen();
  const { notes } = useMyNotes();
  const { me } = useMe();
  const { active: classes, waiting } = useMyClasses();
  const { invitations: invites, accept: acceptInvitation } = useMyInvitations();
  const { purchases } = useMyPurchases();
  const { courses } = useMyCourses();
  const paying = purchases.filter((p) => p.status === "requested");
  const bought = courses.filter((c) => c.access !== "class");
  const latest = notes.slice(0, 3);
  const { open: work } = useMyWork();

  const accept = async (inv) => {
    await acceptInvitation(inv.id);
    toast(`You're in ${inv.class?.name || "the class"}`);
  };

  if (!me) return null;
  return (
    <Page>
      <PageHeader kicker="Student" title={`Welcome, ${firstName(me.name)}!`}
        sub="Your classes, the lessons your teacher has shared, and their notes."
        right={<Button variant="outline" onClick={() => navigate("/join")}><IconUserPlus size={16} stroke={1.75} /> Join a class</Button>} />

      {(invites.length > 0 || waiting.length > 0 || paying.length > 0) && (
        <div className="space-y-3 mb-8">
          {invites.map((inv) => (
            <Alert key={inv.id} tone="info" icon={IconMail} title={`${teacherName(inv.teacher)} invited you to ${inv.class?.name || "a class"}`}
              actionLabel="Accept invite" onAction={() => accept(inv)}>
              Accepting puts you straight into the class.
            </Alert>
          ))}
          {waiting.map((cls) => (
            <Alert key={cls.membership.id} tone="pending" icon={IconClock} title={`Waiting for ${teacherName(cls.teacher)} to accept you`}>
              {cls.name} · asked {timeAgo(cls.membership.requestedAt)}. The class shows up here once you're in.
            </Alert>
          ))}
          {paying.map((p) => (
            <Alert key={p.id} tone="pending" icon={IconClock} title={`Waiting for ${teacherName(p.teacher)} to confirm your payment`}
              actionLabel="View course" onAction={() => navigate(`/courses/${p.courseId}`)}>
              {p.course?.title} · requested {timeAgo(p.requestedAt)}. Every lesson opens once it's confirmed.
            </Alert>
          ))}
        </div>
      )}

      <SectionLabel>My classes</SectionLabel>
      {classes.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {classes.map((cls) => {
            const entry = cls.courses.find((x) => x.status === "in-progress");
            const course = entry?.course;
            const p = course ? entry.progress : null;
            const nextOpen = p?.next && (entry.releasedLessonIds || []).includes(p.next.id);
            return (
              <ClassCard key={cls.id} icon={IconSchool} tone={toneOf(course)} title={cls.name} scheduleLabel={scheduleLabel(cls.schedule)}
                courseTitle={course ? course.title : "No course in progress"}
                lessonLine={p?.next ? `${nextOpen ? "Next" : "Coming up"}: Lesson ${p.next.n} · ${p.next.title}` : p?.allTaught ? "Every lesson taught" : ""}
                studentCountLabel={`with ${teacherName(cls.teacher)}`}
                progressLabel={p ? `${p.taughtCount} of ${p.total} lessons taught` : undefined}
                progressPct={p ? p.pct : null} onViewDetail={() => navigate(`/classes/${cls.id}`)} />
            );
          })}
        </div>
      ) : (
        <Card className="p-8 mb-8 text-center">
          <IconSchool size={24} stroke={1.5} className="mx-auto mb-2 text-neutral-500" />
          <div className="font-semibold text-neutral-950">You're not in a class yet</div>
          <p className="text-sm text-neutral-600 mt-1 mb-4">Ask your teacher for the class code or link, then join here.</p>
          <Button onClick={() => navigate("/join")}><IconUserPlus size={16} stroke={1.75} /> Join a class</Button>
        </Card>
      )}

      {work.length > 0 && (
        <>
          <SectionLabel right={work.length > 3 && (
            <button type="button" onClick={() => navigate("/work")} className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary-600 hover:text-primary-700">
              All work <IconChevronRight size={15} stroke={1.75} />
            </button>
          )}>Work to do</SectionLabel>
          <Card className="overflow-hidden mb-8">
            <div className="divide-y divide-neutral-400">{work.slice(0, 3).map((a) => <WorkRow key={a.id} a={a} />)}</div>
          </Card>
        </>
      )}

      <SectionLabel right={notes.length > 3 && (
        <button type="button" onClick={() => navigate("/notes")} className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary-600 hover:text-primary-700">
          All notes <IconChevronRight size={15} stroke={1.75} />
        </button>
      )}>Latest notes from your teacher</SectionLabel>
      <Card className="px-5 mb-8">
        {latest.length ? (
          <div className="divide-y divide-neutral-400">
            {latest.map((n) => <NoteItem key={n.id} note={n} isNew={!seen.has(n.id)} />)}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-neutral-600">
            <IconNotes size={22} stroke={1.5} className="mx-auto mb-2 text-neutral-500" />
            No notes yet. When your teacher sends one, it shows up here and inside its lesson.
          </div>
        )}
      </Card>

      {bought.length > 0 && (
        <>
          <SectionLabel>My courses</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bought.map((course) => (
              <CourseCard key={course.id} icon={IconBook2} tone={toneOf(course)} title={course.title}
                creatorLabel="Teacher" creatorName={teacherName(course.teacher)}
                category={`${course.level} · self-paced`}
                stats={[{ icon: IconBook2, value: `${course.lessonCount} lessons` }, { icon: IconCircleCheck, value: `${course.completedLessons} finished` }]}
                progressPct={finishedPct(course.completedLessons, course.lessonCount)}
                onViewDetail={() => navigate(`/courses/${course.id}`)} />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
