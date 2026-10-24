import React, { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IconArrowLeft, IconArrowRight, IconCircleCheck, IconLock, IconNotes } from "@tabler/icons-react";
import { Breadcrumbs, Button, Card, HeaderCard, HeaderCardSection, Page, StepNav, Tag } from "@app/design-system.jsx";
import { blockMeta } from "@app/data.jsx";
import { BlockStudentView, blockComponents } from "@app/views/parts.jsx";
import { useToast } from "@app/toasts.jsx";
import { useSeen } from "../session.jsx";
import { teacherName, toneText } from "../lib.js";
import { useMyNotes } from "@app/features/notes/index.js";
import { useReadingTexts } from "@app/features/readings/index.js";
import { useMyClassPage, useMyLesson } from "@app/features/learning/index.js";
import NoteItem from "../components/NoteItem.jsx";

// The lesson player. Opened from a class (/classes/:classId/lessons/:id) or
// a bought course (/courses/:courseId/lessons/:id) — either way it opens
// only what the access rule allows (features/learning's myLesson). The
// teacher's notes for this lesson sit on top; the lesson's blocks play one
// step at a time, in the same card as Block Studio's "As student" view; the
// last step finishes the lesson.
export default function LessonPage() {
  const { classId, courseId: routeCourseId, lessonId } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { seen, markSeen } = useSeen();
  const { notes: myNotes } = useMyNotes();
  const { texts, loading: textsLoading } = useReadingTexts();
  const navigate = useNavigate();
  // Starter activities for a block the teacher never opened in Block Studio
  // (so it has no saved content) are made up fresh with new ids each time —
  // kept here so a student's answers survive a re-render or a sync push.
  const starters = useRef({});

  const { page: classPage, loading: classLoading } = useMyClassPage(classId);
  const cls = classPage?.class || null;
  // A class lesson belongs to whichever of the class's courses has it.
  const inClass = classPage?.courses.find((c) => c.lessons.some((row) => row.lesson.id === lessonId));
  const courseId = routeCourseId || inClass?.course.id;
  const { result, loading: lessonLoading, complete } = useMyLesson(courseId, lessonId);
  const course = result?.course || inClass?.course || null;
  // Locked, the API may not say which lesson it is; the class page does.
  const lesson = result?.lesson || inClass?.lessons.find((row) => row.lesson.id === lessonId)?.lesson || null;
  const allowed = !!result?.open;
  const notes = cls && lesson ? myNotes.filter((n) => n.classId === cls.id && n.lessonId === lesson.id) : [];
  const noteIds = notes.map((n) => n.id).join(",");

  // Reading the lesson counts as seeing its notes — after this render, so
  // the "New" badges still show this once.
  useEffect(() => {
    if (noteIds) markSeen(noteIds.split(","));
  }, [noteIds, markSeen]);

  const back = cls ? { label: cls.name, to: `/classes/${cls.id}` } : { label: course?.title || "Courses", to: course ? `/courses/${course.id}` : "/courses" };
  const crumbs = [
    { label: cls ? "Home" : "Courses", onClick: () => navigate(cls ? "/" : "/courses") },
    { label: back.label, onClick: () => navigate(back.to) },
    { label: lesson ? `Lesson ${lesson.n}` : "Lesson" },
  ];

  if ((classId && classLoading) || lessonLoading) return null;
  if (!allowed) {
    return (
      <Page>
        <Breadcrumbs items={crumbs} />
        <Card className="p-10 text-center max-w-lg mx-auto">
          <span className="w-12 h-12 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center mx-auto mb-4"><IconLock size={22} stroke={1.75} /></span>
          <div className="font-bold text-lg mb-1.5 text-neutral-950">{lesson ? `Lesson ${lesson.n} isn't shared yet` : "This lesson isn't available"}</div>
          <p className="text-sm text-neutral-600 mb-5">
            {lesson ? `${teacherName(cls?.teacher || result?.teacher)} shares each lesson with the class when it's time — it opens here then.` : "It may have been removed, or it's not part of your classes or courses."}
          </p>
          <Button variant="outline" onClick={() => navigate(back.to)}><IconArrowLeft size={16} stroke={1.75} /> Back to {back.label}</Button>
        </Card>
      </Page>
    );
  }

  const blocks = lesson.blocks.map((b) => {
    if (b.content?.components) return b;
    const cached = starters.current[b.id];
    // Made again once the reading texts arrive, so a starter passage gets one.
    if (!cached || cached.type !== b.type || (!cached.ready && !textsLoading)) {
      starters.current[b.id] = { type: b.type, ready: !textsLoading, content: { components: blockComponents(b, texts) } };
    }
    return { ...b, content: starters.current[b.id].content };
  });
  const index = Math.max(0, blocks.findIndex((b) => b.id === params.get("step")));
  const block = blocks[index];
  const go = (i) => { setParams({ step: blocks[i].id }); document.querySelector("main")?.scrollTo({ top: 0 }); };
  const { finished } = result;
  const last = index === blocks.length - 1;
  const teacher = teacherName(cls?.teacher || result.teacher);

  const finish = async () => {
    await complete();
    toast(`Lesson ${lesson.n} finished — nice work!`);
  };

  return (
    <Page>
      <Breadcrumbs items={crumbs} />

      {notes.length > 0 && (
        <Card className="p-5 mb-6 border-primary-200">
          <div className="flex items-center gap-2 text-base font-semibold text-neutral-950">
            <IconNotes size={18} stroke={1.75} className="text-primary-600" /> From {teacher}
          </div>
          <div className="divide-y divide-neutral-400">
            {notes.map((n) => <NoteItem key={n.id} note={n} showClass={false} showLesson={false} isNew={!seen.has(n.id)} />)}
          </div>
        </Card>
      )}

      {block ? (
        <BlockCard lesson={lesson} blocks={blocks} index={index} onGo={go}
          kicker={`Lesson ${lesson.n}: ${lesson.title} · Step ${index + 1} of ${blocks.length}`}
          right={finished && <Tag color="success"><IconCircleCheck size={13} stroke={1.75} /> Finished</Tag>} />
      ) : (
        <Card className="p-8 text-center text-sm text-neutral-600">This lesson has no steps yet.</Card>
      )}

      {block && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant={index === 0 ? "disabled" : "outline"} disabled={index === 0} onClick={() => go(index - 1)}>
            <IconArrowLeft size={16} stroke={1.75} /> Previous
          </Button>
          {last
            ? (finished
              ? <Button variant="outline" onClick={() => navigate(back.to)}>Back to {back.label} <IconArrowRight size={16} stroke={1.75} /></Button>
              : <Button variant="dark" onClick={finish}><IconCircleCheck size={16} stroke={1.75} /> Finish lesson</Button>)
            : <Button onClick={() => go(index + 1)}>Next: {stepLabel(blocks[index + 1])} <IconArrowRight size={16} stroke={1.75} /></Button>}
        </div>
      )}
    </Page>
  );
}

const stepLabel = (b) => b.title || blockMeta(b.type).label;

// One step of the lesson: its identity on the tinted band, the lesson's
// steps as one flow, and the activities in a gray well — the same card
// Block Studio shows in "As student".
function BlockCard({ blocks, index, onGo, kicker, right }) {
  const block = blocks[index];
  const BT = blockMeta(block.type);
  return (
    <HeaderCard sectioned icon={BT.icon} iconClassName={toneText(BT.tone)} title={stepLabel(block)} kicker={kicker} right={right}>
      {blocks.length > 1 && (
        <HeaderCardSection>
          <StepNav current={block.id} onSelect={(id) => onGo(blocks.findIndex((b) => b.id === id))}
            steps={blocks.map((b) => ({ id: b.id, label: stepLabel(b) }))} />
        </HeaderCardSection>
      )}
      <HeaderCardSection well>
        <BlockStudentView key={block.id} block={block} />
      </HeaderCardSection>
    </HeaderCard>
  );
}
