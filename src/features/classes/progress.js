/* Reading a class's courses and progress — plain functions over the Class
   the hooks return, so screens ask the same questions the same way. */

// The course the class is studying right now (at most one is in progress).
export const activeCourseOf = (cls) => (cls?.courses || []).find((c) => c.status === "in-progress") || null;

// Where the class is on one course: its ClassCourseProgress, or null when
// it doesn't take that course. `released` is a Set of the lesson ids its
// students can open.
export function progressFor(cls, courseId) {
  const entry = (cls?.courses || []).find((c) => c.courseId === courseId);
  if (!entry?.progress) return null;
  return { ...entry.progress, released: new Set(entry.releasedLessonIds || []) };
}

// A course has no progress of its own: this averages every class taking it,
// or is null (not 0%) when no class does.
export function courseAvgProgress(classes, courseId) {
  const pcts = classes.flatMap((cls) => cls.courses.filter((c) => c.courseId === courseId && c.progress).map((c) => c.progress.pct));
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
}
