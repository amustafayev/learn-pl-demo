import React, { useState } from "react";
import { IconSchool, IconCircleCheck, IconArrowRight, IconFlag, IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button, Tag, Modal } from "../design-system.jsx";
import { useNav } from "../store.jsx";
import { useToast } from "../toasts.jsx";
import { useClassActions, progressFor } from "../features/classes/index.js";
import { timeAgo, shortDate } from "../format.js";
import { nextAutoShareLabel } from "../schedule.js";

// Shown on a lesson (and in Block Studio) opened from a class — the lesson
// content is the same for every class, so this bar is what says where THIS
// class stands on it: next up, taught (and when), or not taught yet — plus
// the teacher's actions for it. Lesson-level only; nothing per component.
const STATE_STYLE = {
  next: { tile: "bg-primary-50 text-primary-600", tag: "primary", label: "Next up" },
  taught: { tile: "bg-success-50 text-success-600", tag: "success", label: "Taught" },
  later: { tile: "bg-neutral-200 text-neutral-700", tag: "neutral", label: "Not taught yet" },
  done: { tile: "bg-success-50 text-success-600", tag: "success", label: "Course completed" },
};

// Finishing a lesson taught to a class: logged as taught (which also shares
// it and moves "next up" on), then a toast saying what comes next.
function useFinishLesson(cls, course, lesson, lessons) {
  const toast = useToast();
  const { markTaught } = useClassActions(cls.id);
  return () => markTaught(course.id, lesson.id).then(() => {
    const next = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1] || null;
    toast(next
      ? `Lesson ${lesson.n} marked as taught for ${cls.name} — next up: Lesson ${next.n}`
      : `Lesson ${lesson.n} marked as taught for ${cls.name} — that was the last lesson`);
  }, (err) => toast(err.description || "Couldn't mark the lesson as taught", "err"));
}

// Share / hide one lesson for one class — asks first, since sharing opens the
// lesson to every active student in the class and hiding takes it away.
export function ShareLessonButton({ cls, course, lesson, shared }) {
  const toast = useToast();
  const { setShared } = useClassActions(cls.id);
  const [asking, setAsking] = useState(false);
  const confirm = () => {
    setShared(course.id, lesson.id, !shared).then(
      () => toast(!shared ? `Lesson ${lesson.n} shared with ${cls.name}` : `Lesson ${lesson.n} hidden from ${cls.name}'s students`),
      (err) => toast(err.description || "Couldn't change who can see the lesson", "err"),
    );
    setAsking(false);
  };
  return (
    <>
      <Button variant={shared ? "light" : "primary"} onClick={() => setAsking(true)} className="shrink-0">
        {shared ? <><IconEyeOff size={16} stroke={1.75} /> Hide from students</> : <><IconEye size={16} stroke={1.75} /> Share with students</>}
      </Button>
      <Modal open={asking} onClose={() => setAsking(false)} icon={shared ? IconEyeOff : IconEye}
        title={shared ? `Hide Lesson ${lesson.n} from ${cls.name}?` : `Share Lesson ${lesson.n} with ${cls.name}?`}
        sub={lesson.title}
        footer={<>
          <Button variant="outline" onClick={() => setAsking(false)}>Cancel</Button>
          <Button onClick={confirm}>{shared ? "Hide lesson" : "Share lesson"}</Button>
        </>}>
        <p className="text-sm text-neutral-700">
          {shared
            ? "Students in this class won't be able to open this lesson until you share it again. Nothing they've finished is removed."
            : "Every active student in this class will be able to open this lesson, and an open student tab is told right away."}
        </p>
      </Modal>
    </>
  );
}

export default function ClassLessonBar({ cls, course, lesson, className = "" }) {
  const toast = useToast();
  const { go } = useNav();
  const { setNextLesson } = useClassActions(cls.id);
  const p = progressFor(cls, course.id);
  const markTaught = useFinishLesson(cls, course, lesson, p?.lessons || []);

  if (!p) {
    return (
      <div className={`rounded-[14px] border border-neutral-400 bg-surface px-4 py-3 text-sm text-neutral-700 ${className}`}>
        <b className="text-neutral-950">{cls.name}</b> isn't taking {course.title}, so there's no progress to show here.
      </div>
    );
  }

  const taughtOn = p.taughtAt[lesson.id];
  const kind = p.entry.status === "done" ? "done" : p.next?.id === lesson.id ? "next" : taughtOn ? "taught" : "later";
  const style = STATE_STYLE[kind];
  const lastLine = p.last?.lesson
    ? `Last taught: Lesson ${p.last.lesson.n} · ${timeAgo(p.last.taughtAt)}`
    : "Nothing taught from this course yet";
  const nextLine = p.next ? `They're on Lesson ${p.next.n}: ${p.next.title}` : p.allTaught ? "Every lesson has been taught" : "";

  const line = {
    next: `They left off here. ${lastLine}.`,
    taught: `Taught ${timeAgo(taughtOn)} (${shortDate(taughtOn)}). ${nextLine}.`,
    later: `${nextLine}.`,
    done: `${p.taughtCount} of ${p.total} lessons taught.${taughtOn ? ` This one ${timeAgo(taughtOn)}.` : ""}`,
  }[kind];

  // Can the class's students open this lesson? (Marking it taught shares it.)
  const shared = p.released.has(lesson.id);
  // The class's next lesson opens on its own before a session — say when, or
  // that the teacher's hiding it keeps it closed.
  const held = (p.entry.heldLessonIds || []).includes(lesson.id);
  const opensAt = !shared && kind === "next" && !held ? nextAutoShareLabel(cls.schedule) : "";
  const autoLine = kind !== "next" || shared ? "" : held ? " It stays hidden until you share it." : opensAt ? ` Opens for students automatically ${opensAt}.` : "";
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-[14px] border border-neutral-400 bg-surface p-4 ${className}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.tile}`}>
        {kind === "taught" || kind === "done" ? <IconCircleCheck size={20} stroke={1.75} /> : <IconSchool size={20} stroke={1.75} />}
      </span>
      <div className="min-w-[14rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-950">{cls.name}</span>
          <Tag color={style.tag}>{style.label}</Tag>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${shared ? "text-success-600" : "text-neutral-600"}`}>
            {shared ? <><IconEye size={14} stroke={1.75} /> Students can see it</> : <><IconEyeOff size={14} stroke={1.75} /> Hidden from students</>}
          </span>
        </div>
        <div className="mt-0.5 text-sm text-neutral-600">{line}{autoLine}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ShareLessonButton cls={cls} course={course} lesson={lesson} shared={shared} />
        {kind === "done" ? null : (
          <>
            {kind !== "next" && p.next && (
              <Button size="sm" variant="outline" onClick={() => go({ lessonId: p.next.id, partId: null })}>
                Go to Lesson {p.next.n} <IconArrowRight size={15} stroke={1.75} />
              </Button>
            )}
            {kind === "later" && (
              <Button size="sm" variant="light" onClick={() => setNextLesson(course.id, lesson.id).then(() => toast(`${cls.name} is now on Lesson ${lesson.n}`), (err) => toast(err.description || "Couldn't change next up", "err"))}>
                <IconFlag size={15} stroke={1.75} /> Set as next up
              </Button>
            )}
            <Button size="sm" variant={kind === "next" ? "primary" : "light"} onClick={markTaught}>
              <IconCircleCheck size={15} stroke={1.75} /> {kind === "taught" ? "Finish again" : "Finish lesson"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// The end of a lesson taught from a class: sits under the last block, so the
// teacher who has just walked the class through it (on Meet, sharing this
// page) closes it with one click — logged as taught, shared with the class,
// "next up" moved on. Nothing fires by itself: opening a lesson to prepare
// it must not count as teaching it.
export function FinishLessonCard({ cls, course, lesson, className = "" }) {
  const p = progressFor(cls, course.id);
  const finish = useFinishLesson(cls, course, lesson, p?.lessons || []);
  if (!p || p.entry.status === "done") return null;
  const taughtOn = p.taughtAt[lesson.id];
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-[14px] border border-neutral-400 bg-surface p-4 ${className}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${taughtOn ? "bg-success-50 text-success-600" : "bg-primary-50 text-primary-600"}`}>
        <IconCircleCheck size={20} stroke={1.75} />
      </span>
      <div className="min-w-[14rem] flex-1">
        <div className="font-semibold text-neutral-950">{taughtOn ? `Lesson ${lesson.n} was taught to ${cls.name}` : `Done teaching Lesson ${lesson.n}?`}</div>
        <div className="mt-0.5 text-sm text-neutral-600">
          {taughtOn ? `${timeAgo(taughtOn)} (${shortDate(taughtOn)}).` : `Finishing logs it for ${cls.name}, shares it with the class and moves them on to the next lesson.`}
        </div>
      </div>
      <Button size="sm" variant={taughtOn ? "light" : "primary"} onClick={finish}>
        <IconCircleCheck size={15} stroke={1.75} /> {taughtOn ? "Finish again" : "Finish lesson"}
      </Button>
    </div>
  );
}
