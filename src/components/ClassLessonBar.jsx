import React from "react";
import { IconSchool, IconCircleCheck, IconBroadcast, IconArrowRight, IconFlag } from "@tabler/icons-react";
import { Button, Tag } from "../design-system.jsx";
import { useStore, useNav, classCourseProgress, markLessonTaught } from "../store.jsx";
import { timeAgo, shortDate } from "../format.js";

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

export default function ClassLessonBar({ cls, course, lesson, className = "" }) {
  const { state, dispatch, toast } = useStore();
  const { go, startLive } = useNav();
  const p = classCourseProgress(state, cls, course.id);

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

  const markTaught = () => markLessonTaught(dispatch, toast, { cls, courseId: course.id, lesson, lessons: p.lessons });

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-[14px] border border-neutral-400 bg-surface p-4 ${className}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.tile}`}>
        {kind === "taught" || kind === "done" ? <IconCircleCheck size={20} stroke={1.75} /> : <IconSchool size={20} stroke={1.75} />}
      </span>
      <div className="min-w-[14rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-950">{cls.name}</span>
          <Tag color={style.tag}>{style.label}</Tag>
        </div>
        <div className="mt-0.5 text-sm text-neutral-600">{line}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {kind === "done" ? null : (
          <>
            {kind !== "next" && p.next && (
              <Button size="sm" variant="outline" onClick={() => go({ lessonId: p.next.id, partId: null })}>
                Go to Lesson {p.next.n} <IconArrowRight size={15} stroke={1.75} />
              </Button>
            )}
            {kind === "later" && (
              <Button size="sm" variant="light" onClick={() => { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId: cls.id, courseId: course.id, lessonId: lesson.id }); toast(`${cls.name} is now on Lesson ${lesson.n}`); }}>
                <IconFlag size={15} stroke={1.75} /> Set as next up
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => startLive({ courseId: course.id, classId: cls.id, lessonId: lesson.id })}>
              <IconBroadcast size={15} stroke={1.75} /> Go live
            </Button>
            <Button size="sm" variant={kind === "next" ? "primary" : "light"} onClick={markTaught}>
              <IconCircleCheck size={15} stroke={1.75} /> {kind === "taught" ? "Mark taught again" : "Mark as taught"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
