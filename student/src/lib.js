// Small read helpers over the student's scoped state (studentView in
// src/db/mockDb.jsx) — the same data a real student API would return.

// A course's hue, onto the design system's tones — same map the teacher
// app uses for course and class cards.
const HUE_TONE = { indigo: "primary", emerald: "success", amber: "pending", rose: "warning", sky: "info" };
export const toneOf = (course) => HUE_TONE[course?.hue] || "primary";

// The text half of a block type's tone ("text-sky-600 bg-sky-50"), for its
// icon on a white tile — same as Block Studio's.
export const toneText = (tone = "") => tone.split(" ").find((c) => c.startsWith("text-")) || "";

export const firstName = (name = "") => name.split(" ")[0];
export const teacherName = (state, teacherId) => state.teachers?.find((t) => t.id === teacherId)?.name || "Your teacher";

export const courseOf = (state, courseId) => state.courses.find((c) => c.id === courseId) || null;
export const lessonsOf = (state, courseId) => state.lessons[courseId] || [];
export const lessonOf = (state, courseId, lessonId) => lessonsOf(state, courseId).find((l) => l.id === lessonId) || null;
export const classOf = (state, classId) => state.classes.find((c) => c.id === classId) || null;
export const membershipIn = (state, classId) => state.memberships.find((m) => m.classId === classId) || null;

// Classes the student is in right now (active membership).
export const myClasses = (state) => state.classes.filter((c) => membershipIn(state, c.id)?.status === "active");
// The class's courses, the one in progress first.
export const classCourses = (cls) => [...(cls?.courses || [])].sort((a, b) => (a.status === "in-progress" ? -1 : b.status === "in-progress" ? 1 : 0));
// Courses bought and paid for (self-paced, every lesson open).
export const boughtCourses = (state) =>
  state.purchases.filter((p) => p.status === "paid").map((p) => courseOf(state, p.courseId)).filter(Boolean);
export const finishedLesson = (state, courseId, lessonId) =>
  state.lessonCompletions.some((c) => c.courseId === courseId && c.lessonId === lessonId);

// "today" → "Today": a relative time used as a group heading.
export const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
