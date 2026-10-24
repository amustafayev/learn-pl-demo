import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconCheck, IconAlertTriangle, IconSend, IconClock, IconCalendarTime, IconUsers, IconBook2 } from "@tabler/icons-react";
import { Alert, Button, Card, Field, Page, PageHeader, TextArea } from "@app/design-system.jsx";
import { timeAgo } from "@app/format.js";
import { scheduleLabel } from "@app/schedule.js";
import { useJoinPreview } from "@app/features/joining/index.js";
import { useMyClasses } from "@app/features/learning/index.js";
import { teacherName } from "../lib.js";

// The page behind a class link (/join/:token) — what a teacher shares in a
// group chat or on social media. It previews the class (teacher, schedule,
// what it covers, lesson titles — never the lessons themselves), then the
// student asks to join. It only ever sends a request; the teacher accepts it
// and the class shows up on Home.
export default function JoinClass() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const { preview, loading, requestToJoin } = useJoinPreview(token);
  const { classes, loading: classesLoading } = useMyClasses();

  const status = preview ? classes.find((c) => c.id === preview.classId)?.membership?.status : null;
  const waiting = classes.filter((c) => c.membership?.status === "requested" && c.id !== preview?.classId);

  const waitingList = waiting.map((c) => (
    <Alert key={c.membership.id} tone="pending" icon={IconClock} title={`Waiting for ${teacherName(c.teacher)} to accept you`}>
      {c.name} · asked {timeAgo(c.membership.requestedAt)}.
    </Alert>
  ));

  if (loading || classesLoading) return null;
  if (!preview) {
    return (
      <Page>
        <PageHeader title="Join a class" sub="Open the link your teacher shared — you'll see the class first, then you can ask to join." />
        <div className="max-w-xl space-y-3">
          {token && (
            <Alert tone="warning" icon={IconAlertTriangle} title="This link doesn't work">
              It may have been replaced by a new one, or the class isn't taking requests right now. Ask your teacher for a fresh link.
            </Alert>
          )}
          {waitingList}
        </div>
      </Page>
    );
  }

  const teacher = teacherName(preview.teacher);
  const send = (e) => {
    e.preventDefault();
    requestToJoin(message);
  };

  return (
    <Page>
      <PageHeader title={preview.name} sub={`with ${teacher}`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <Card className="p-5">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
              <span className="inline-flex items-center gap-2"><IconCalendarTime size={16} stroke={1.75} className="text-neutral-500" /> {scheduleLabel(preview.schedule)}</span>
              <span className="inline-flex items-center gap-2"><IconUsers size={16} stroke={1.75} className="text-neutral-500" /> {preview.studentCount} student{preview.studentCount === 1 ? "" : "s"}</span>
            </div>
          </Card>
          {preview.courses.length > 0 ? preview.courses.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center gap-2 text-base font-semibold text-neutral-950"><IconBook2 size={16} stroke={1.75} className="text-neutral-500" /> {c.title}
                <span className="text-xs font-normal text-neutral-600">· {c.level}</span></div>
              {c.lessons.length > 0 && (
                <ol className="mt-3 space-y-1.5 text-sm text-neutral-800">
                  {c.lessons.map((l) => <li key={l.n} className="flex gap-2"><span className="w-12 shrink-0 text-neutral-500">Lesson {l.n}</span><span className="min-w-0 truncate">{l.title}</span></li>)}
                </ol>
              )}
            </Card>
          )) : <Card className="p-5 text-sm text-neutral-600">{teacher} hasn't started a course with this class yet.</Card>}
        </div>

        <div className="space-y-3">
          {status === "active" ? (
            <Alert tone="info" icon={IconCheck} title={`You're already in ${preview.name}`} actionLabel="Open the class" onAction={() => navigate(`/classes/${preview.classId}`)} />
          ) : status === "requested" ? (
            <Alert tone="success" icon={IconCheck} title="Request sent">
              {teacher} will accept you — the class shows up on your Home as soon as they do.
            </Alert>
          ) : (
            <Card className="p-5">
              <form onSubmit={send}>
                <Field label="Message to your teacher (optional)">
                  <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! I saw your class and would like to join." className="!min-h-[84px]" />
                </Field>
                <Button type="submit" className="w-full"><IconSend size={16} stroke={1.75} /> Request to join</Button>
                <p className="mt-2 text-xs text-neutral-600">{teacher} reviews each request before you're in.</p>
              </form>
            </Card>
          )}
          {waitingList}
        </div>
      </div>
    </Page>
  );
}
