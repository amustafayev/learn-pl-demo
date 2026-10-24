// Small display helpers for the student app's screens — no data of their
// own; what's shown comes through the features' hooks (@app/features/…).

// A course's hue, onto the design system's tones — same map the teacher
// app uses for course and class cards.
const HUE_TONE = { indigo: "primary", emerald: "success", amber: "pending", rose: "warning", sky: "info" };
export const toneOf = (course) => HUE_TONE[course?.hue] || "primary";

// The text half of a block type's tone ("text-sky-600 bg-sky-50"), for its
// icon on a white tile — same as Block Studio's.
export const toneText = (tone = "") => tone.split(" ").find((c) => c.startsWith("text-")) || "";

export const firstName = (name = "") => name.split(" ")[0];
// A teacher reference ({ id, name }) as a name, for when it's missing too.
export const teacherName = (teacher) => teacher?.name || "Your teacher";

// A class's courses, the one in progress first.
export const inProgressFirst = (courses = []) => [...courses].sort((a, b) => (a.status === "in-progress" ? -1 : b.status === "in-progress" ? 1 : 0));

// A course's progress for a self-paced course: share of lessons finished.
export const finishedPct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

// "today" → "Today": a relative time used as a group heading.
export const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
