import React from "react";
import { IconLock, IconChevronRight, IconCircleCheck } from "@tabler/icons-react";
import { Button, Tag } from "@app/design-system.jsx";

// One lesson in a list, the way the student sees it: its number tile, the
// title, where it stands, and Open — or a lock while it isn't shared yet.
// `status` is "taught" | "next" | "later" (a class lesson) or "self" (a
// bought course, every lesson open).
const TILE = {
  taught: "bg-success-500 text-white",
  next: "bg-primary-500 text-white",
  later: "bg-neutral-200 text-neutral-700",
  self: "bg-neutral-200 text-neutral-700",
};

export default function LessonRow({ lesson, status, open, meta, finished, onOpen }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 ${status === "next" && open ? "bg-primary-50/40" : ""}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${TILE[status] || TILE.later}`}>
        L{lesson.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-950 break-words">{lesson.title}</span>
          {status === "next" && <Tag color="primary">Next up</Tag>}
        </div>
        {meta && <div className="mt-0.5 text-xs text-neutral-600">{meta}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {finished && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-success-600">
            <IconCircleCheck size={15} stroke={1.75} /> Finished
          </span>
        )}
        {open ? (
          <Button size="sm" variant={status === "next" ? "primary" : "light"} onClick={onOpen}>
            Open <IconChevronRight size={15} stroke={1.75} />
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600" title="Your teacher hasn't shared this lesson yet">
            <IconLock size={15} stroke={1.75} /> Not shared yet
          </span>
        )}
      </div>
    </div>
  );
}
