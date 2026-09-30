import {
  BookOpen, Layers, Headphones, Shapes, PenTool, Mic, NotebookPen, Mail, ClipboardCheck, Gamepad2,
  Handshake, FileText, Puzzle,
} from "lucide-react";
import { EVERYDAY_BUILT, TENSE_CONTENT, withContent } from "./seedLessons.js";

/* =========================================================================
   Lucid — teacher console. Mock data + design constants.
   Domain: an Azerbaijani-first English-learning platform (see docs/).
   This file is the seed; the store (store.jsx) clones it into live state.
   ========================================================================= */

/* ------------------------------- design tokens ------------------------------- */

// Course accent hues
export const HUE = { indigo: "bg-indigo-600", emerald: "bg-emerald-600", amber: "bg-amber-500", rose: "bg-rose-600", sky: "bg-sky-600" };
export const HUE_SOFT = {
  indigo: "bg-indigo-50 text-indigo-700", emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", sky: "bg-sky-50 text-sky-700",
};

/* =========================================================================
   Blocks & templates — two-level content model.
     Block      = a skill-level container in the lesson pathway
                  (Reading, Listening, Grammar, IELTS Writing Task 2 …)
     Component  = an activity inside a Block (passage, quiz, timeline,
                  scramble, memory match … see parts.jsx COMPONENT_META)
   Which Block types a teacher can add is NOT fixed — it's read off the
   course's lesson TEMPLATE, so different course types (General English,
   IELTS, Business English …) offer different Block catalogs. `components`
   is the full palette a Block type accepts; `starter` is what a freshly
   added Block opens with.
   ========================================================================= */
export const BLOCK_TYPES = {
  reading:    { label: "Reading",    icon: BookOpen,    tone: "text-sky-600 bg-sky-50 dark:bg-sky-950 dark:text-sky-400",      components: ["passage", "comprehension", "gapfill", "scramble", "wordweb", "youtube", "slidedeck"], starter: ["passage"] },
  listening:  { label: "Listening",  icon: Headphones,  tone: "text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400", components: ["listening", "video", "youtube", "slidedeck", "quiz", "gapfill"], starter: ["listening"] },
  speaking:   { label: "Speaking",   icon: Mic,          tone: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",     components: ["scenario", "video", "youtube", "speakingRecord", "shadowing", "slidedeck"], starter: ["scenario"] },
  writing:    { label: "Writing",    icon: NotebookPen, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400",     components: ["homework", "upload", "gapfill", "scramble"], starter: ["homework"] },
  grammar:    { label: "Grammar",    icon: Shapes,       tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400", components: ["timeline", "sentence", "preposition", "conjugation", "conditional", "comparison", "wordweb", "quiz", "gapfill", "arrowcorrection", "correctincorrect", "dialoguecompletion", "slidedeck"], starter: ["timeline"] },
  vocabulary: { label: "Vocabulary", icon: Layers,       tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400", components: ["wordlist", "flashcards", "match", "wordformation", "quiz", "memory", "wordweb", "gapfill", "crossword", "wheel", "wordsearch", "imagetoword", "slidedeck"], starter: ["wordlist", "flashcards"] },
  practice:   { label: "Practice",   icon: PenTool,      tone: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",   components: ["gapfill", "match", "wordformation", "quiz", "flashcards", "memory", "scramble", "arrowcorrection", "correctincorrect", "dialoguecompletion", "speedround", "crossword", "wheel", "wordsearch", "imagetoword"], starter: ["gapfill", "match"] },
  playground: { label: "Playground", icon: Gamepad2,     tone: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400", components: ["crossword", "memory", "speedround", "match", "wordweb", "wheel", "wordsearch", "imagetoword"], starter: ["crossword"], description: "Gamified vocabulary challenges, Word Tower & interactive puzzles." },
  homework:   { label: "Homework",   icon: ClipboardCheck, tone: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400", components: ["homework", "upload", "gapfill"], starter: ["homework"], description: "Revision the student completes at home after the lesson." },
  // Third-party material embedded by link — not authored in Block Studio
  // itself, unlike every other block type here.
  resources:  { label: "Resources",  icon: FileText,     tone: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",  components: ["document", "youtube", "slidedeck"], starter: ["document"], description: "Embed outside material — a PDF, Word doc, image, slide deck, or YouTube video." },
  // One generic block for H5P's entire content-type catalog (60+ types —
  // Crossword, Branching Scenario, Course Presentation, Drag the Words,
  // Interactive Video …). The block never lists or knows about individual
  // H5P types — a teacher picks one in H5P's own editor/gallery, and this
  // block only ever holds a reference to what she built there. See
  // components: ["h5pActivity"] — deliberately one component kind, not one
  // per H5P type, so this block's schema never grows when H5P adds a type.
  h5p:        { label: "Interactive (H5P)", icon: Puzzle, tone: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950 dark:text-cyan-400",  components: ["h5pActivity"], starter: ["h5pActivity"], description: "Any H5P activity — crosswords, branching scenarios, drag-the-words, interactive video and more — built in H5P's own editor, played back here." },
  // IELTS-specific: writing and speaking split by task/part, since each
  // has its own timing, rubric and structure — unlike General English.
  ieltsListening: { label: "Listening",          icon: Headphones,  tone: "text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400", components: ["listening", "youtube", "quiz", "gapfill"], starter: ["listening"] },
  ieltsReading:   { label: "Reading",            icon: BookOpen,    tone: "text-sky-600 bg-sky-50 dark:bg-sky-950 dark:text-sky-400",      components: ["passage", "comprehension", "gapfill", "youtube"], starter: ["passage"] },
  ieltsWriting1:  { label: "Writing Task 1",     icon: NotebookPen, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400",    components: ["homework", "upload"], starter: ["homework"], description: "Describe visual data (graph, chart, process) in 150+ words." },
  ieltsWriting2:  { label: "Writing Task 2",     icon: NotebookPen, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400",    components: ["homework", "upload"], starter: ["homework"], description: "Essay responding to a prompt, 250+ words." },
  ieltsSpeaking1: { label: "Speaking Part 1",    icon: Mic,          tone: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",    components: ["scenario", "speakingRecord"], starter: ["scenario"], description: "Short interview questions about familiar topics." },
  ieltsSpeaking2: { label: "Speaking Part 2",    icon: Mic,          tone: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",    components: ["scenario", "speakingRecord", "shadowing"], starter: ["scenario"], description: "The long turn — speak for 2 minutes on a cue-card topic." },
  ieltsSpeaking3: { label: "Speaking Part 3",    icon: Mic,          tone: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",    components: ["scenario", "speakingRecord"], starter: ["scenario"], description: "Two-way discussion on abstract, related themes." },
  // Business English: swaps generic Writing for correspondence practice.
  businessWriting: { label: "Business Writing", icon: Mail,        tone: "text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400",    components: ["homework", "upload", "gapfill"], starter: ["homework"], description: "Emails, reports, and professional correspondence." },
  // Deliberately narrow — one signature Component, not a grab-bag — so what
  // this Block is FOR stays legible at a glance. Low priority: offered last
  // in every template and its own category, rather than removed.
  peerwork:      { label: "Peer work", icon: Handshake,        tone: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",       components: ["peertask"], starter: ["peertask"], description: "Group work, not solo or whole-class — an info-gap for any group size, or a Kahoot-style team quiz race." },
};

// A single, safe-fallback lookup for a Block type's display metadata — every
// view that renders a block's icon/label/tone should call this instead of
// reaching into BLOCK_TYPES directly, so an unknown/removed type never
// crashes a render and every fallback style matches everywhere.
export function blockMeta(type) {
  return BLOCK_TYPES[type] || { label: type, icon: Shapes, tone: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" };
}

// Groups Block *types* into the categories a teacher actually thinks in when
// adding a step — mirrors how COMPONENT_CATEGORIES (parts.jsx) groups
// Component *kinds* — so "Add a block" shows Reading options under Reading
// instead of throwing every block type from every template at once.
export const BLOCK_CATEGORIES = [
  { id: "reading", label: "Reading & listening", types: ["reading", "ieltsReading", "listening", "ieltsListening"] },
  { id: "vocabulary", label: "Vocabulary", types: ["vocabulary"] },
  { id: "grammar", label: "Grammar & practice", types: ["grammar", "practice"] },
  { id: "speaking", label: "Speaking", types: ["speaking", "ieltsSpeaking1", "ieltsSpeaking2", "ieltsSpeaking3"] },
  { id: "writing", label: "Writing", types: ["writing", "ieltsWriting1", "ieltsWriting2", "businessWriting"] },
  { id: "playground", label: "Playground & homework", types: ["playground", "homework"] },
  { id: "resources", label: "Resources", types: ["resources"] },
  { id: "h5p", label: "Interactive (H5P)", types: ["h5p"] },
  // Low priority — kept as its own group, last, rather than mixed in above.
  { id: "peer", label: "Peer work", types: ["peerwork"] },
];

export const LESSON_TEMPLATES = {
  // "peerwork" is appended last in every template — low priority, so it
  // doesn't compete for attention in the Add-a-block/component pickers.
  general:  { id: "general",  label: "General English", blockTypes: ["reading", "listening", "speaking", "writing", "grammar", "vocabulary", "practice", "playground", "homework", "resources", "h5p", "peerwork"] },
  ielts:    { id: "ielts",    label: "IELTS Prep",       blockTypes: ["ieltsListening", "ieltsReading", "ieltsWriting1", "ieltsWriting2", "ieltsSpeaking1", "ieltsSpeaking2", "ieltsSpeaking3", "grammar", "vocabulary", "playground", "homework", "resources", "h5p", "peerwork"] },
  business: { id: "business", label: "Business English", blockTypes: ["reading", "listening", "speaking", "businessWriting", "grammar", "vocabulary", "playground", "homework", "resources", "h5p", "peerwork"] },
};

// "Color = a fixed meaning" — the signature rule. A grammar role is ALWAYS the
// same colour, everywhere in the app, so learners build visual intuition.
export const ROLE = {
  subject:   { label: "Subject",     chip: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  verb:      { label: "Verb",        chip: "bg-rose-100 text-rose-800 border-rose-300" },
  object:    { label: "Object",      chip: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  time:      { label: "Time marker", chip: "bg-amber-100 text-amber-900 border-amber-300" },
  place:     { label: "Place",       chip: "bg-sky-100 text-sky-800 border-sky-300" },
  connector: { label: "Connector",   chip: "bg-violet-100 text-violet-800 border-violet-300" },
};

// Saved-word mastery (spaced repetition status)
export const WORD_STATUS = {
  weak:   { label: "weak",   tone: "warning" },
  medium: { label: "medium", tone: "pending" },
  strong: { label: "strong", tone: "success" },
};
// Reading word status — colours the word ON the page as the learner reads.
export const READ_STATUS = {
  new:      "bg-info-100 text-info-900",
  learning: "underline decoration-2 decoration-pending-500 underline-offset-2",
  known:    "",
};
// Manual highlight colours a teacher can apply to any selected run of a
// reading passage (independent of word status, and combinable with a
// definition tag on the same run).
export const HIGHLIGHT_COLORS = {
  yellow: { swatch: "bg-yellow-300", bg: "bg-yellow-100" },
  green:  { swatch: "bg-emerald-300", bg: "bg-emerald-100" },
  pink:   { swatch: "bg-pink-300", bg: "bg-pink-100" },
  blue:   { swatch: "bg-sky-300", bg: "bg-sky-100" },
};

export const CONCEPTS = ["Articles", "Present perfect", "Past simple", "Prepositions", "Phrasal verbs", "Word order", "Conditionals"];

/* ------------------------------- helpers ------------------------------- */

export function initials(name) { return name.split(" ").map((s) => s[0]).slice(0, 2).join(""); }
export function heat(v) {
  if (v >= 80) return "bg-emerald-500 text-white";
  if (v >= 65) return "bg-emerald-300 text-emerald-900";
  if (v >= 50) return "bg-amber-300 text-amber-900";
  return "bg-rose-300 text-rose-900";
}
// Returns a design-system Tag `color` token for a student's status.
export function statusPill(status) {
  if (status === "completed") return "success";
  if (status === "in progress") return "primary";
  return "neutral";
}

// A class's meeting days (indices into DAY_LABELS), rendered as "Mon, Wed" —
// the compact form used everywhere a class card or row needs to show when it meets.
export function scheduleLabel(days) {
  return (days || []).map((d) => DAY_LABELS[d]).filter(Boolean).join(", ") || "No schedule set";
}

/* ------------------------------- teacher ------------------------------- */

// Seed for `state.teacher` (see db/mockDb.jsx) — the mutable copy Settings
// edits. `TEACHER` itself stays a static export for anything that only ever
// needs the seed values, not the live edited ones.
export const TEACHER = {
  // The logged-in teacher. Courses and classes carry a teacherId; the store
  // shows this teacher only their own (see teacherView in db/mockDb.jsx).
  id: "t_maria",
  name: "Maria Carey", initials: "LQ", role: "Vetted teacher", since: "2024",
  email: "maria.carey@lucid.app", phone: "+1 415 555 0142",
  twoFactorEnabled: true,
  linkedAccounts: [
    { id: "instagram", label: "Instagram", handle: "@maria.teaches.english" },
    { id: "linkedin", label: "LinkedIn", handle: "maria-carey-elt" },
    { id: "discord", label: "Discord", handle: "@mariac" },
  ],
};

// Every teacher's public profile — what a student sees next to a class or
// a course (the student app shows classes and courses from any teacher).
// The logged-in teacher's own name comes from `state.teacher`, so a rename in
// Settings reaches students too.
export const TEACHER_PROFILES = [
  { id: "t_maria", name: TEACHER.name },
  { id: "t_kamal", name: "Kamal Mammadov" },
];

/* ------------------------------- courses / lessons / parts ------------------------------- */

let pid = 0;
const P = (type, title, meta, extra = {}) => ({ id: `p${++pid}`, type, title, meta, ...extra });

// Full authored content for the flagship "Tense forms" lesson (IT English · L4)
// — block list here, each block's components in seedLessons.js.
const TENSE_PARTS = [
  P("reading",    "Passage — How we talk about time at work", "240 words · B1 · tap-to-translate on", { textId: "t_standup" }),
  P("vocabulary", "Words — 12 target tense & time words",      "deploy · ship · release · by then …"),
  P("listening",  "Videos — Video explanation of tense forms", "Video lesson · 4:15 · subtitled"),
  P("listening",  "Listenings — Real standup audio recording", "Audio recording · 0:16 · 4 questions"),
  P("grammar",    "Grammar — Tenses on a timeline",           "Interactive visual grammar block"),
  P("practice",   "Practice Grammar — Fill the gaps & tense rules", "Auto-graded · instant feedback in AZ"),
  P("playground", "Playground — Crossword & Word Tower Challenge", "Gamified vocabulary challenge & puzzles"),
  P("homework",   "Homework — Write 5 sentences using target tenses", "Student submits at home for teacher review"),
].map((part, i) => withContent(part, "B1", TENSE_CONTENT[i]));

// A lesson whose blocks are fully authored carries them as `built`; `parts`
// (the block-type shorthand every other lesson uses) must stay in step with
// it, the same way db/mockDb.jsx keeps the two in sync on every edit.
// Titled like an unbuilt block (db/mockDb.jsx's lessonBlocks): the plain
// block-type name, no subtitle.
const authored = (built) => ({
  built: built.map((b) => ({ ...b, title: BLOCK_TYPES[b.type]?.label || b.type, meta: "—" })),
  parts: built.map((b) => b.type),
});

// Every course belongs to the teacher who made it (teacherId). `sale` is
// the course sold on its own (self-paced) in the public catalog — separate
// from teaching it to a class. See "Students, classes & access" in CLAUDE.md.
export const SEED_COURSES = [
  { id: "every", teacherId: "t_maria", title: "Everyday English", level: "A2 → B1", hue: "amber",   students: 21, templateId: "general",
    sale: { forSale: true, price: 29, currency: "AZN", description: "Five practical lessons for daily life — greetings, food, getting around, shopping.", paymentNote: "Pay by card transfer to 4169 **** **** 2210 (Maria C.) and send the receipt in the request." } },
  { id: "it",    teacherId: "t_maria", title: "IT English",       level: "B1 → B2", hue: "indigo",  students: 14, templateId: "general",
    sale: { forSale: false, price: 0, currency: "AZN", description: "", paymentNote: "" } },
  { id: "ielts", teacherId: "t_maria", title: "IELTS Speaking",   level: "B2 → C1", hue: "emerald", students: 9,  templateId: "ielts",
    sale: { forSale: true, price: 49, currency: "AZN", description: "All three IELTS speaking parts, with model answers.", paymentNote: "Bank transfer or cash at the next lesson — I confirm by hand." } },
  // Another teacher's course — the teacher-scoped view never shows it.
  { id: "biz",   teacherId: "t_kamal", title: "Business English", level: "B1 → B2", hue: "sky",     students: 4,  templateId: "general",
    sale: { forSale: true, price: 39, currency: "AZN", description: "Meetings, emails and presentations.", paymentNote: "" } },
];

// Lessons keyed by course — pure authored content. No `progress`/`locked`/
// `current` here: a lesson has none of those on its own, only per class
// (see db/mockDb.jsx's classCourseProgress / classesOnCourse).
// `active` is a separate, real metric (how many students engaged with this
// lesson), kept as-is.
export const SEED_LESSONS = {
  it: [
    { id: "it1", n: 1, title: "Introducing yourself on a team",      parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"],                    active: 14 },
    { id: "it2", n: 2, title: "Describing what you work on",         parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"],                    active: 14 },
    { id: "it3", n: 3, title: "Talking about a bug in standup",      parts: ["reading", "vocabulary", "listening", "listening", "grammar", "practice", "homework"],        active: 13 },
    { id: "it4", n: 4, title: "Tense forms", built: TENSE_PARTS,     parts: ["reading", "vocabulary", "listening", "listening", "grammar", "practice", "homework"], active: 11 },
    { id: "it5", n: 5, title: "Writing clear code-review comments",  parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"],                                  active: 4 },
    { id: "it6", n: 6, title: "Explaining a technical decision",     parts: ["reading", "vocabulary", "listening", "listening", "grammar", "practice", "homework"],                     active: 0 },
  ],
  every: [
    { id: "ev1", n: 1, title: "Greetings & small talk", ...authored(EVERYDAY_BUILT.ev1), active: 21 },
    { id: "ev2", n: 2, title: "Ordering food & drinks", ...authored(EVERYDAY_BUILT.ev2), active: 20 },
    { id: "ev3", n: 3, title: "Getting around the city", ...authored(EVERYDAY_BUILT.ev3), active: 18 },
    { id: "ev4", n: 4, title: "Shopping & prices", ...authored(EVERYDAY_BUILT.ev4), active: 9 },
    { id: "ev5", n: 5, title: "My first week in a new city", ...authored(EVERYDAY_BUILT.ev5), active: 6 },
  ],
  biz: [
    { id: "bz1", n: 1, title: "Running a meeting", parts: ["reading", "vocabulary", "practice"], active: 3 },
  ],
  ielts: [
    { id: "ie1", n: 1, title: "Part 1 — familiar topics",   parts: ["ieltsSpeaking1", "vocabulary", "grammar", "practice", "homework"],  active: 9 },
    { id: "ie2", n: 2, title: "Part 2 — the long turn",     parts: ["ieltsSpeaking2", "ieltsSpeaking3", "vocabulary", "practice", "homework"], active: 7 },
  ],
};

/* ------------------------------- classes ------------------------------- */

// Class is the top-level, durable thing: a group of students on a schedule,
// owned by one teacher (teacherId). Who's in it lives in SEED_MEMBERSHIPS
// (a backend's `class_members`) — never on the class or the student — so a
// student can be in several classes, even other teachers', and keep their
// history. joinToken is the class link/code; joinOpen turns it off.
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A class's `courses` is its assignment history (a backend's `class_courses`
// rows) — every course it has studied, each with:
//   status          "in-progress" | "paused" | "done" — at most ONE
//                   in-progress per class (the reducer enforces it: making
//                   one active pauses the other)
//   currentLessonId the lesson the class is on next ("next up") — the one
//                   place lesson sequencing lives; students aren't assigned
//                   lessons individually, they follow their class
// What was actually taught, and when, is SEED_TAUGHT_LESSONS below — the
// "last taught" line and the "N of M lessons taught" count are derived
// from that log, never stored here.
export const SEED_CLASSES = [
  {
    id: "cls_it_morning", teacherId: "t_maria", name: "ITler — Morning", scheduleDays: [1, 3],
    joinToken: "M4R9QX", joinOpen: true,
    courses: [
      { courseId: "every", currentLessonId: "ev5", status: "done", releasedLessonIds: ["ev1", "ev2", "ev3", "ev4", "ev5"] },
      { courseId: "it", currentLessonId: "it4", status: "in-progress", releasedLessonIds: ["it1", "it2", "it3", "it4"] },
    ],
  },
  {
    id: "cls_it_evening", teacherId: "t_maria", name: "ITler — Evening", scheduleDays: [2, 4],
    joinToken: "E7K2PB", joinOpen: true,
    courses: [{ courseId: "it", currentLessonId: "it1", status: "in-progress", releasedLessonIds: ["it1"] }],
  },
  {
    id: "cls_ielts_main", teacherId: "t_maria", name: "IELTS Speaking — Main", scheduleDays: [1, 3, 5],
    joinToken: "IE5T8W", joinOpen: true,
    courses: [{ courseId: "ielts", currentLessonId: "ie2", status: "in-progress", releasedLessonIds: ["ie1", "ie2"] }],
  },
  // Another teacher's class — never visible to this teacher.
  {
    id: "cls_kamal_biz", teacherId: "t_kamal", name: "Business English — Tuesdays", scheduleDays: [1],
    joinToken: "KB3N6Y", joinOpen: true,
    courses: [{ courseId: "biz", currentLessonId: "bz1", status: "in-progress", releasedLessonIds: ["bz1"] }],
  },
];

// The class link a teacher shares: it opens the student app's join page
// (student/, served at /student/ on the same site) with the code filled in,
// and a visit there turns into a join request.
export const joinLink = (token) => `${typeof window === "undefined" ? "https://lucid.app" : window.location.origin}/student/join/${token}`;

// A class's status on one of its courses, as a badge.
export const CLASS_COURSE_STATUS = {
  "in-progress": { color: "pending", label: "In Progress" },
  paused: { color: "neutral", label: "Paused" },
  done: { color: "success", label: "Completed" },
};

// Append-only log of lessons a class was taught (a backend's
// `taught_lessons` table): one row per teaching session, written by
// MARK_LESSON_TAUGHT (ending a live lesson, or "Mark as taught" on a lesson
// opened from a class). ISO timestamps only — "5 days ago" is formatting.
export const SEED_TAUGHT_LESSONS = [
  { id: "tl_seed_1", classId: "cls_it_morning", courseId: "every", lessonId: "ev1", taughtAt: "2026-07-06T09:00:00.000Z" },
  { id: "tl_seed_2", classId: "cls_it_morning", courseId: "every", lessonId: "ev2", taughtAt: "2026-07-13T09:00:00.000Z" },
  { id: "tl_seed_3", classId: "cls_it_morning", courseId: "every", lessonId: "ev3", taughtAt: "2026-07-20T09:00:00.000Z" },
  { id: "tl_seed_4", classId: "cls_it_morning", courseId: "every", lessonId: "ev4", taughtAt: "2026-07-27T09:00:00.000Z" },
  { id: "tl_seed_4b", classId: "cls_it_morning", courseId: "every", lessonId: "ev5", taughtAt: "2026-08-03T09:00:00.000Z" },
  { id: "tl_seed_5", classId: "cls_it_morning", courseId: "it", lessonId: "it1", taughtAt: "2026-09-07T09:00:00.000Z" },
  { id: "tl_seed_6", classId: "cls_it_morning", courseId: "it", lessonId: "it2", taughtAt: "2026-09-14T09:00:00.000Z" },
  { id: "tl_seed_7", classId: "cls_it_morning", courseId: "it", lessonId: "it3", taughtAt: "2026-09-24T09:00:00.000Z" },
  { id: "tl_seed_8", classId: "cls_ielts_main", courseId: "ielts", lessonId: "ie1", taughtAt: "2026-09-26T16:00:00.000Z" },
];

// A class's own notes on its lessons (see "Class notes" in CLAUDE.md):
// what to review, homework, who needs help. Private to the teacher until
// sent (`sharedAt`); `done` is the teacher's own tick.
export const SEED_CLASS_NOTES = [
  { id: "cn_seed_1", classId: "cls_it_morning", courseId: "it", lessonId: "it2", text: "The role-play worked really well — reuse the same format in Lesson 5.",
    done: true, sharedAt: null, createdAt: "2026-09-14T10:10:00.000Z", updatedAt: "2026-09-14T10:10:00.000Z" },
  { id: "cn_seed_2", classId: "cls_it_morning", courseId: "it", lessonId: "it3", text: "Rashad still says “I have fixed it yesterday” — go over past simple vs present perfect again.",
    done: false, sharedAt: null, createdAt: "2026-09-24T10:05:00.000Z", updatedAt: "2026-09-24T10:05:00.000Z" },
  { id: "cn_seed_3", classId: "cls_it_morning", courseId: "it", lessonId: "it3", text: "Homework: write three standup updates using “so far” and “by Friday”.",
    done: false, sharedAt: "2026-09-24T10:08:00.000Z", createdAt: "2026-09-24T10:07:00.000Z", updatedAt: "2026-09-24T10:07:00.000Z" },
  { id: "cn_seed_4", classId: "cls_it_morning", courseId: "it", lessonId: "it3", text: "Print the bug-report template for everyone.",
    done: true, sharedAt: null, createdAt: "2026-09-24T10:09:00.000Z", updatedAt: "2026-09-24T10:09:00.000Z" },
  { id: "cn_seed_5", classId: "cls_it_morning", courseId: "it", lessonId: "it4", text: "Open with a 5-minute recap of last lesson's time markers (already, so far, yet).",
    done: false, sharedAt: null, createdAt: "2026-09-25T08:30:00.000Z", updatedAt: "2026-09-25T08:30:00.000Z" },
  { id: "cn_seed_6", classId: "cls_it_morning", courseId: "it", lessonId: "it4", text: "Pair Nigar with Leyla for the info-gap task.",
    done: false, sharedAt: null, createdAt: "2026-09-25T08:32:00.000Z", updatedAt: "2026-09-25T08:32:00.000Z" },
  { id: "cn_seed_7", classId: "cls_ielts_main", courseId: "ielts", lessonId: "ie1", text: "Part 2 answers ran short — practise speaking for the full two minutes.",
    done: false, sharedAt: "2026-09-26T17:05:00.000Z", createdAt: "2026-09-26T17:00:00.000Z", updatedAt: "2026-09-26T17:00:00.000Z" },
];

// Who missed a taught lesson (a backend's `attendance`): one row per
// (taught lesson, student), written by SET_ATTENDANCE. A student who was in
// the class when the lesson was taught counts as having had it unless a row
// says "absent" — teachers mark the exceptions, not the whole roster.
export const SEED_ATTENDANCE = [
  { taughtLessonId: "tl_seed_3", studentId: "s_nigar",  status: "absent", markedAt: "2026-07-20T11:00:00.000Z" },
  { taughtLessonId: "tl_seed_6", studentId: "s_rashad", status: "absent", markedAt: "2026-09-14T11:00:00.000Z" },
];

// Lessons a student finished on their own in the student app (a backend's
// `lesson_completions`), written by COMPLETE_LESSON. The teacher sees these
// only for a course the student bought from them — the self-paced product.
export const SEED_LESSON_COMPLETIONS = [
  { id: "lc_seed_1", studentId: "s_zeynab", courseId: "every", lessonId: "ev1", completedAt: "2026-09-13T19:20:00.000Z" },
  { id: "lc_seed_2", studentId: "s_zeynab", courseId: "every", lessonId: "ev2", completedAt: "2026-09-17T20:05:00.000Z" },
  { id: "lc_seed_3", studentId: "s_zeynab", courseId: "every", lessonId: "ev3", completedAt: "2026-09-26T18:40:00.000Z" },
];

/* ------------------------- memberships, sales, invites ------------------------- */
// How students relate to a teacher — the only way a teacher ever sees a
// student. No relationship, no visibility (see teacherView in db/mockDb.jsx).

// A student in a class (a backend's `class_members`). status:
//   requested  asked to join with the class link/code — waits for the teacher
//   active     in the class (accepted, invited, or added by the teacher)
//   declined   request turned down
//   removed    the teacher took them out  ┐ both read as "former" to the
//   left       they left                  ┘ teacher (history only)
// source: code (class link/code) | invite (email invite) | teacher (added directly)
// periods: every stint the student was actually in the class (a backend's
//   `class_member_periods`) — { startedAt, endedAt, endReason: removed | left }.
//   Re-adding someone opens a new period on the same row instead of
//   overwriting the old dates, so what they took in an earlier stint stays
//   theirs. decidedAt/endedAt are the latest stint's, kept for display.
export const SEED_MEMBERSHIPS = [
  { id: "mb_1", classId: "cls_it_morning", studentId: "s_rashad", status: "active", source: "teacher", requestedAt: null, decidedAt: "2026-04-02T10:00:00.000Z", endedAt: null,
    periods: [{ startedAt: "2026-04-02T10:00:00.000Z", endedAt: null, endReason: null }] },
  { id: "mb_2", classId: "cls_it_morning", studentId: "s_nigar",  status: "active", source: "code",    requestedAt: "2026-04-03T08:20:00.000Z", decidedAt: "2026-04-03T09:00:00.000Z", endedAt: null,
    periods: [{ startedAt: "2026-04-03T09:00:00.000Z", endedAt: null, endReason: null }] },
  // Leyla took a break over the summer and was added back: two periods, so
  // the lessons taught while she was away (ev3–ev5) aren't counted as hers.
  { id: "mb_3", classId: "cls_it_morning", studentId: "s_leyla",  status: "active", source: "teacher", requestedAt: null, decidedAt: "2026-08-25T10:00:00.000Z", endedAt: null,
    periods: [
      { startedAt: "2026-04-02T10:00:00.000Z", endedAt: "2026-07-15T12:00:00.000Z", endReason: "left" },
      { startedAt: "2026-08-25T10:00:00.000Z", endedAt: null, endReason: null },
    ] },
  { id: "mb_4", classId: "cls_it_evening", studentId: "s_elvin",  status: "active", source: "invite",  requestedAt: null, decidedAt: "2026-08-30T17:00:00.000Z", endedAt: null,
    periods: [{ startedAt: "2026-08-30T17:00:00.000Z", endedAt: null, endReason: null }] },
  { id: "mb_5", classId: "cls_it_evening", studentId: "s_kamran", status: "active", source: "code",    requestedAt: "2026-09-01T16:10:00.000Z", decidedAt: "2026-09-01T18:00:00.000Z", endedAt: null,
    periods: [{ startedAt: "2026-09-01T18:00:00.000Z", endedAt: null, endReason: null }] },
  { id: "mb_6", classId: "cls_ielts_main", studentId: "s_aysel",  status: "active", source: "teacher", requestedAt: null, decidedAt: "2026-07-20T12:00:00.000Z", endedAt: null,
    periods: [{ startedAt: "2026-07-20T12:00:00.000Z", endedAt: null, endReason: null }] },
  // requests waiting for the teacher (came in with the class link/code)
  { id: "mb_7", classId: "cls_it_evening", studentId: "s_farid", status: "requested", source: "code", requestedAt: "2026-09-29T18:40:00.000Z", decidedAt: null, endedAt: null,
    message: "Hi! Elvin gave me the link — I work in QA and want to speak better in meetings." },
  { id: "mb_8", classId: "cls_ielts_main", studentId: "s_lala", status: "requested", source: "code", requestedAt: "2026-09-30T07:15:00.000Z", decidedAt: null, endedAt: null,
    message: "I'd like to prepare for IELTS in December." },
  // former students — history only
  { id: "mb_9", classId: "cls_it_morning", studentId: "s_lala",   status: "removed", source: "code", requestedAt: "2026-04-05T09:00:00.000Z", decidedAt: "2026-04-05T12:00:00.000Z", endedAt: "2026-06-28T12:00:00.000Z",
    periods: [{ startedAt: "2026-04-05T12:00:00.000Z", endedAt: "2026-06-28T12:00:00.000Z", endReason: "removed" }] },
  { id: "mb_10", classId: "cls_it_morning", studentId: "s_orkhan", status: "left",   source: "code", requestedAt: "2026-04-04T09:00:00.000Z", decidedAt: "2026-04-04T11:00:00.000Z", endedAt: "2026-08-15T12:00:00.000Z",
    periods: [{ startedAt: "2026-04-04T11:00:00.000Z", endedAt: "2026-08-15T12:00:00.000Z", endReason: "left" }] },
  // another teacher's student
  { id: "mb_11", classId: "cls_kamal_biz", studentId: "s_tural", status: "active", source: "code", requestedAt: "2026-09-10T09:00:00.000Z", decidedAt: "2026-09-10T10:00:00.000Z", endedAt: null,
    periods: [{ startedAt: "2026-09-10T10:00:00.000Z", endedAt: null, endReason: null }] },
];

// A course bought on its own, self-paced (a backend's `purchases`).
// status: requested (asked to buy, paid outside the app — the teacher
// confirms) | paid | declined | refunded. method: external | in_app.
export const SEED_PURCHASES = [
  { id: "pu_1", courseId: "every", studentId: "s_zeynab", status: "paid", amount: 29, currency: "AZN", method: "external",
    requestedAt: "2026-09-11T15:00:00.000Z", paidAt: "2026-09-12T09:30:00.000Z", confirmedBy: "t_maria" },
  { id: "pu_2", courseId: "ielts", studentId: "s_murad", status: "requested", amount: 49, currency: "AZN", method: "external",
    requestedAt: "2026-09-29T20:05:00.000Z", paidAt: null, confirmedBy: null, message: "Sent 49 AZN by bank transfer tonight — receipt attached." },
  { id: "pu_3", courseId: "biz", studentId: "s_tural", status: "paid", amount: 39, currency: "AZN", method: "external",
    requestedAt: "2026-09-09T12:00:00.000Z", paidAt: "2026-09-09T13:00:00.000Z", confirmedBy: "t_kamal" },
];

// Email invites the teacher sent for a class (a backend's `invitations`).
// Accepting one puts the student straight in the class — the teacher
// already chose them, so there's no request to approve.
export const SEED_INVITATIONS = [
  { id: "inv_1", classId: "cls_it_evening", email: "nurlan.a@example.com", name: "Nurlan", status: "pending",
    createdAt: "2026-09-28T10:00:00.000Z", expiresAt: "2026-10-12T10:00:00.000Z" },
];

/* ------------------------------- reading library ------------------------------- */

// A tappable token carries the AZ translation + definition + example.
const w = (term, az, def, example, status = "known", extra = {}) => ({ term, az, def, example, status, ...extra });
const s = (text) => ({ text }); // plain glue text (punctuation / known words)

export const SEED_TEXTS = [
  {
    id: "t_standup", title: "A morning standup", topic: "IT", level: "B1", wordCount: 58, hasTranslation: true,
    body: [
      s("Every morning the team has a short "), w("standup", "gündəlik toplantı", "a short daily meeting where each person shares progress", "We keep the standup under ten minutes.", "new"),
      s(". Yesterday I "), w("shipped", "təhvil verdim", "released code to users", "We shipped the new login screen last night.", "learning", { emoji: "📦", ipaUk: "/ʃɪpt/", ipaUs: "/ʃɪpt/" }),
      s(" the login screen. Today I will "), w("deploy", "yerləşdirmək", "put software onto a server so people can use it", "We deploy every Friday afternoon.", "new", { emoji: "🚀", ipaUk: "/dɪˈplɔɪ/", ipaUs: "/dɪˈplɔɪ/" }),
      s(" the fix, and by then the "), w("release", "buraxılış", "a new version made available to users", "The release is planned for Monday.", "learning", { emoji: "🎉", ipaUk: "/rɪˈliːs/", ipaUs: "/rɪˈliːs/" }),
      s(" should be stable. I have already "), w("resolved", "həll etdim", "solved or fixed a problem", "I resolved the bug before lunch.", "known"),
      s(" the payment bug, so nothing is "), w("blocking", "maneə törədən", "stopping progress", "Nothing is blocking me today.", "new"), s(" me today."),
    ],
  },
  {
    id: "t_cafe", title: "At the café", topic: "Everyday", level: "A2", wordCount: 44, hasTranslation: true,
    body: [
      s("I usually "), w("order", "sifariş vermək", "to ask for food or drink in a place", "I order a coffee every morning.", "learning"),
      s(" a coffee before work. The café near my flat is "), w("cozy", "rahat", "warm and comfortable", "The room was small but cozy.", "new", { emoji: "🛋️", ipaUk: "/ˈkəʊ.zi/", ipaUs: "/ˈkoʊ.zi/" }),
      s(" and the staff are "), w("friendly", "mehriban", "kind and pleasant", "The waiter was very friendly.", "known"),
      s(". Sometimes I "), w("grab", "tez almaq", "to take something quickly", "Let me grab a sandwich on the way.", "new", { emoji: "🥪", ipaUk: "/ɡræb/", ipaUs: "/ɡræb/" }), s(" a sandwich too."),
    ],
  },
  {
    id: "t_email", title: "A polite client email", topic: "Business", level: "B2", wordCount: 51, hasTranslation: true,
    body: [
      s("Thank you for your "), w("patience", "səbir", "the ability to wait calmly", "Thank you for your patience during the delay.", "new"),
      s(" while we looked into this. We have "), w("identified", "müəyyən etdik", "found or recognised something", "We identified the root cause.", "learning"),
      s(" the cause and will "), w("follow up", "əlaqə saxlamaq", "to check back or continue contact", "I'll follow up with you tomorrow.", "new"),
      s(" by tomorrow. Please "), w("reach out", "əlaqə saxla", "to contact someone", "Reach out if you have questions.", "learning"), s(" if anything is unclear."),
    ],
  },
  {
    id: "t_neighbour", title: "Meeting a new neighbour", topic: "Everyday", level: "A2", wordCount: 62, hasTranslation: true,
    body: [
      s("On Saturday a new family moved in next door. I went over to say "), w("hello", "salam", "a friendly word you say when you meet someone", "Hello! I'm Nigar from number 12.", "known", { emoji: "👋", ipaUk: "/həˈləʊ/", ipaUs: "/həˈloʊ/" }),
      s(" and "), w("introduce", "təqdim etmək", "to tell someone your name when you meet", "Let me introduce myself.", "learning"),
      s(" myself. Their names are Tom and Sara. Tom works at the hospital and Sara is a teacher. We talked about the "), w("weather", "hava", "rain, sun, wind and temperature outside", "The weather is lovely today, isn't it?", "new", { emoji: "🌤️", ipaUk: "/ˈweð.ə/", ipaUs: "/ˈweð.ɚ/" }),
      s(" and the park nearby. Before I left, I said, “Nice to "), w("meet", "tanış olmaq", "to see and talk to someone for the first time", "Nice to meet you!", "known"),
      s(" you. See you "), w("around", "ətrafda", "somewhere nearby, from time to time", "See you around!", "new"), s("!”"),
    ],
  },
  {
    id: "t_city", title: "Finding the museum", topic: "Travel", level: "A2", wordCount: 70, hasTranslation: true,
    body: [
      s("Last summer I visited Tbilisi for the first time. On my second day I wanted to see the national museum, but I got "), w("lost", "azmaq", "not knowing where you are or how to get somewhere", "I got lost in the old town.", "new", { emoji: "🧭", ipaUk: "/lɒst/", ipaUs: "/lɑːst/" }),
      s(". I asked a woman at a bus "), w("stop", "dayanacaq", "a place where a bus stops for passengers", "The bus stop is across the road.", "known"),
      s(" for "), w("directions", "istiqamət", "instructions for how to get to a place", "Can you give me directions to the station?", "learning"),
      s(". She said, “Go straight on, then turn left at the "), w("traffic lights", "svetofor", "red, yellow and green lights that control traffic", "Turn right at the traffic lights.", "new", { emoji: "🚦", ipaUk: "/ˈtræf.ɪk laɪts/", ipaUs: "/ˈtræf.ɪk laɪts/" }),
      s(". The museum is "), w("opposite", "qarşısında", "on the other side, facing something", "The bank is opposite the post office.", "learning"), s(" the park.” It took ten minutes."),
    ],
  },
  {
    id: "t_market", title: "A Saturday at the market", topic: "Everyday", level: "B1", wordCount: 66, hasTranslation: true,
    body: [
      s("Every Saturday I go to the market with a shopping list. Fruit is usually "), w("cheaper", "daha ucuz", "costing less money", "Apples are cheaper at the market.", "learning"),
      s(" there than in the supermarket. Today strawberries were on "), w("sale", "endirim", "when things are sold at a lower price", "These shoes are on sale this week.", "new", { emoji: "🏷️", ipaUk: "/seɪl/", ipaUs: "/seɪl/" }),
      s(", so I bought two boxes. I asked, “How much are the tomatoes?” and the seller gave me a small "), w("discount", "endirim", "money taken off the normal price", "Can I get a discount if I buy three?", "new"),
      s(". I paid in cash and kept the "), w("receipt", "qəbz", "a paper that shows what you paid", "Keep the receipt in case you need to return it.", "learning", { emoji: "🧾", ipaUk: "/rɪˈsiːt/", ipaUs: "/rɪˈsiːt/" }),
      s(". I spent less than I "), w("expected", "gözləmək", "thought something would happen", "The trip was easier than I expected.", "known"), s("."),
    ],
  },
  // Deliberately long (~450 words, many tappable words) — the text a
  // layout has to survive, not just the 50-word ones above.
  {
    id: "t_newcity", title: "My first week in a new city", topic: "Travel", level: "B1", wordCount: 456, hasTranslation: true,
    body: [
      s("Last month I "), w("moved", "köçdüm", "went to live in a different place", "We moved to Baku in 2020.", "known"),
      s(" to Istanbul for a new job. I had visited the city twice as a tourist, but living there turned out to be "), w("completely", "tamamilə", "in every way; totally", "The new office is completely different.", "learning"),
      s(" different. On my first morning I woke up at six because I was so "), w("nervous", "həyəcanlı", "worried and a little afraid", "I always feel nervous before an interview.", "new", { emoji: "😬", ipaUk: "/ˈnɜː.vəs/", ipaUs: "/ˈnɝː.vəs/" }),
      s(". I made a strong coffee, stood by the window and tried to remember the way to the office, which I had only ever seen on a map. The first real "), w("challenge", "çətinlik", "something difficult that tests you", "Finding a flat was a real challenge.", "learning"),
      s(" was transport. I bought a travel card at the metro station, but nobody had told me that I needed to "), w("top up", "balansı artırmaq", "add money to a card so you can use it", "I need to top up my travel card.", "new", { emoji: "💳" }),
      s(" the card before every journey. The machine only spoke Turkish, so a kind student showed me which buttons to press. My daily "), w("commute", "işə gedib-gəlmə", "the journey to and from work", "My commute takes forty minutes.", "new", { emoji: "🚇", ipaUk: "/kəˈmjuːt/", ipaUs: "/kəˈmjuːt/" }),
      s(" takes about forty minutes: a short walk, two stops on the metro and then a bus up the hill. The trains are very "), w("crowded", "adamla dolu", "full of people", "The metro is crowded in the morning.", "learning"),
      s(" during "), w("rush hour", "pik saat", "the busy time when people travel to and from work", "Avoid the city centre in rush hour.", "new"),
      s(", so now I leave home fifteen minutes earlier and I usually get a seat. At work, my new "), w("colleagues", "həmkarlar", "people you work with", "My colleagues took me out for lunch.", "known"),
      s(" were friendly and "), w("welcoming", "qonaqpərvər", "friendly to people who are new", "The team was very welcoming.", "new"),
      s(". On the first day they took me to a small restaurant near the office, where we ate lentil soup and fresh bread. Everyone asked me questions about Baku, and I asked them where to find a good flat. Finding one was the hardest part of the week. I visited four places in three days. The first was too dark, the second was far from the metro, and the third was far too expensive. In the end I chose a small, bright flat on the fourth floor. My "), w("landlord", "ev sahibi", "a person who rents a home to you", "My landlord lives downstairs.", "new", { emoji: "🔑", ipaUk: "/ˈlænd.lɔːd/", ipaUs: "/ˈlænd.lɔːrd/" }),
      s(", an older man called Mehmet, asked for a "), w("deposit", "depozit", "money you pay before renting, which you get back later", "The deposit is two months' rent.", "learning"),
      s(" of two months' rent, which was more than I had planned for. On Saturday I decided to "), w("explore", "kəşf etmək", "travel around a place to learn about it", "Let's explore the old town.", "learning"),
      s(" my new "), w("neighbourhood", "məhəllə", "the area around your home", "It's a quiet neighbourhood with lots of cafés.", "new"),
      s(". I found a bakery, a pharmacy and a small grocery shop where the owner already knows my name. At the Sunday market I bought a warm jacket for half price — a real "), w("bargain", "sərfəli alış", "something bought for much less than usual", "This jacket was a real bargain.", "learning", { emoji: "🏷️" }),
      s(". In the afternoon I took the "), w("ferry", "bərə", "a boat that carries people across water", "We took the ferry to the island.", "new", { emoji: "⛴️", ipaUk: "/ˈfer.i/", ipaUs: "/ˈfer.i/" }),
      s(" across the Bosphorus. The "), w("view", "mənzərə", "what you can see from a place", "The view from the hill is amazing.", "known"),
      s(" of the old city from the water was beautiful, and for the first time that week I forgot about my worries. Of course, not everything was easy. Some evenings I felt a little "), w("homesick", "vətən həsrəti çəkən", "sad because you are away from home", "I felt homesick on my birthday.", "new", { emoji: "🏠" }),
      s(" and called my parents for a long chat. I am still trying to "), w("get used to", "öyrəşmək", "become familiar with something new", "I'm getting used to the noise.", "learning"),
      s(" the noise of the city and the "), w("steep", "dik", "rising or falling sharply", "The streets here are very steep.", "new"),
      s(" streets that make every walk feel like exercise. But every day I understand a little more, I get lost a little less, and I feel more "), w("confident", "özünə inamlı", "sure of yourself and your abilities", "She feels confident when she speaks English.", "learning"),
      s(" when I speak to people in shops and cafés. My colleagues say it takes about three months to "), w("settle in", "uyğunlaşmaq", "become comfortable in a new place", "It took me a month to settle in.", "new"),
      s(" properly. I believe them, and I am sure that "), w("eventually", "nəhayət", "in the end, after some time", "Eventually we found the station.", "known"),
      s(" this busy, noisy, beautiful city will feel like home."),
    ],
  },
];

/* ------------------------------- word sets ------------------------------- */

export const SEED_WORDSETS = [
  { id: "ws_it", title: "IT essentials", category: "IT", level: "B1", words: [
    { term: "deploy", az: "yerləşdirmək", def: "to put software onto a server so people can use it" },
    { term: "ship", az: "təhvil vermək", def: "to release finished work to users" },
    { term: "release", az: "buraxılış", def: "a new version of software made available to users" },
    { term: "bug", az: "səhv", def: "a mistake or fault in the code" },
    { term: "merge", az: "birləşdirmək", def: "to combine two branches of code into one" },
    { term: "rollback", az: "geri qaytarma", def: "reverting to an earlier, working version after a bad release" },
  ] },
  { id: "ws_biz", title: "Client email phrases", category: "Business", level: "B2", words: [
    { term: "follow up", az: "əlaqə saxlamaq", def: "to contact someone again to check on progress" },
    { term: "reach out", az: "əlaqə saxla", def: "to get in touch with someone" },
    { term: "on track", az: "planda", def: "progressing as planned, without delay" },
    { term: "let me know", az: "mənə bildir", def: "please tell me — a request to be informed" },
    { term: "at your earliest convenience", az: "ilk imkanda", def: "as soon as it's reasonably possible for you" },
  ] },
  { id: "ws_every", title: "Everyday basics", category: "Everyday", level: "A2", words: [
    { term: "order", az: "sifariş vermək", def: "to ask for food or drink in a place" },
    { term: "grab", az: "tez almaq", def: "to take or get something quickly" },
    { term: "cozy", az: "rahat", def: "warm and comfortable" },
    { term: "friendly", az: "mehriban", def: "kind and pleasant" },
    { term: "nearby", az: "yaxınlıqda", def: "a short distance away" },
  ] },
  { id: "ws_travel", title: "Travel & directions", category: "Travel", level: "A2", words: [
    { term: "boarding pass", az: "minik talonu", def: "the document you need to get on a flight" },
    { term: "gate", az: "çıxış qapısı", def: "the airport entrance where passengers board a specific flight" },
    { term: "delay", az: "gecikmə", def: "a period of time when something happens later than planned" },
    { term: "aisle", az: "keçid", def: "the walkway between rows of seats" },
    { term: "layover", az: "aralıq dayanacaq", def: "a stop between flights before reaching the final destination" },
  ] },
  { id: "ws_ielts", title: "IELTS band-7 linkers", category: "IELTS", level: "B2", words: [
    { term: "furthermore", az: "üstəlik", def: "in addition to what has just been said" },
    { term: "nevertheless", az: "buna baxmayaraq", def: "in spite of what was just mentioned" },
    { term: "consequently", az: "nəticədə", def: "as a result of something" },
    { term: "in contrast", az: "əksinə", def: "showing a clear difference when compared with something else" },
  ] },
  // Deliberately long (30 words) — goes with Everyday English L5.
  { id: "ws_newcity", title: "Moving to a new city", category: "Travel", level: "B1", words: [
    { term: "move", az: "köçmək", def: "to go to live in a different place" },
    { term: "commute", az: "işə gedib-gəlmək", def: "to travel to and from work" },
    { term: "crowded", az: "adamla dolu", def: "full of people" },
    { term: "rush hour", az: "pik saat", def: "the busy time when people travel to and from work" },
    { term: "top up", az: "balansı artırmaq", def: "to add money to a card" },
    { term: "travel card", az: "yol kartı", def: "a card you use to pay for buses and trains" },
    { term: "landlord", az: "ev sahibi", def: "a person who rents a home to you" },
    { term: "tenant", az: "kirayəçi", def: "a person who rents a home from someone" },
    { term: "deposit", az: "depozit", def: "money you pay before renting, returned later" },
    { term: "rent", az: "kirayə haqqı", def: "money you pay every month to live in a place" },
    { term: "bills", az: "kommunal xərclər", def: "money you pay for electricity, water and internet" },
    { term: "contract", az: "müqavilə", def: "a written agreement you sign" },
    { term: "flat", az: "mənzil", def: "a set of rooms to live in, inside a building" },
    { term: "furnished", az: "mebelli", def: "with furniture already in it" },
    { term: "neighbourhood", az: "məhəllə", def: "the area around your home" },
    { term: "grocery shop", az: "ərzaq mağazası", def: "a shop that sells food and everyday things" },
    { term: "pharmacy", az: "aptek", def: "a shop that sells medicine" },
    { term: "bargain", az: "sərfəli alış", def: "something bought for much less than usual" },
    { term: "ferry", az: "bərə", def: "a boat that carries people across water" },
    { term: "view", az: "mənzərə", def: "what you can see from a place" },
    { term: "explore", az: "kəşf etmək", def: "to travel around a place to learn about it" },
    { term: "get lost", az: "azmaq", def: "to not know where you are" },
    { term: "homesick", az: "vətən həsrəti çəkən", def: "sad because you are away from home" },
    { term: "get used to", az: "öyrəşmək", def: "to become familiar with something new" },
    { term: "settle in", az: "uyğunlaşmaq", def: "to become comfortable in a new place" },
    { term: "confident", az: "özünə inamlı", def: "sure of yourself" },
    { term: "welcoming", az: "qonaqpərvər", def: "friendly to people who are new" },
    { term: "challenge", az: "çətinlik", def: "something difficult that tests you" },
    { term: "steep", az: "dik", def: "rising or falling sharply" },
    { term: "eventually", az: "nəhayət", def: "in the end, after some time" },
  ] },
];

/* ------------------------------- students ------------------------------- */

const act = (type, detail, when) => ({ type, detail, when });

export const SEED_STUDENTS = [
  {
    id: "s_rashad", name: "Rashad Aliyev", email: "rashad.aliyev@example.com", level: "B1+", goal: "Speak confidently in standups", streak: 12, streakFreeze: 1,
    xp: 3820, status: "in progress", last: "2h ago", step: 4, progress: 57, atRisk: false,
    placement: { level: "B1", when: "3 months ago", score: 62 },
    cefr: [{ m: "Apr", v: 1 }, { m: "May", v: 1.4 }, { m: "Jun", v: 1.7 }, { m: "Jul", v: 2.0 }],
    skills: { vocab: 72, grammar: 48, reading: 66, listening: 40 },
    wordFlow: { new: 24, learning: 18, known: 15 },
    concepts: { "Articles": 42, "Present perfect": 44, "Past simple": 71, "Prepositions": 63, "Phrasal verbs": 55, "Word order": 80, "Conditionals": 58 },
    l1: [{ issue: "Drops articles (a / the)", why: "Azerbaijani has no articles, so learners under-use them.", count: 11 }, { issue: "Mixes past simple / present perfect", why: "Azerbaijani maps both to one past tense.", count: 7 }],
    confusionPairs: [{ a: "past simple", b: "present perfect", count: 7 }],
    adjustLog: [{ when: "2d ago", dir: "easier", concept: "Present perfect", reason: "3 misses in a row — added a re-explanation step" }],
    words: [
      { term: "deploy", az: "yerləşdirmək", def: "put software on a server", example: "We deploy every Friday.", status: "medium", source: "A morning standup", daysAgo: 2, dueInDays: 1 },
      { term: "overcome", az: "öhdəsindən gəlmək", def: "to succeed in dealing with a problem", example: "She overcame her fear of meetings.", status: "weak", source: "Explaining a decision", daysAgo: 6, dueInDays: 0, loopStage: 1 },
      { term: "release", az: "buraxılış", def: "a new version for users", example: "The release ships Monday.", status: "strong", source: "A morning standup", daysAgo: 9, dueInDays: 4 },
      { term: "blocking", az: "maneə törədən", def: "stopping progress", example: "Nothing is blocking me.", status: "weak", source: "A morning standup", daysAgo: 1, dueInDays: 0 },
    ],
    notes: [
      { id: "n1", date: "Jun 28", covered: "Present perfect vs past simple; standup vocabulary.", newWords: ["by then", "so far"], mistakes: ["said 'I finish it yesterday'"], next: "Review present perfect timeline; 10 gap-fill items.", saved: true },
    ],
    activity: [
      act("word", "Saved “blocking” from A morning standup", "2h ago"),
      act("test", "Practice · Tenses — 6/10, retried to 9/10", "2h ago"),
      act("reading", "Finished “A morning standup” (re-read 2 sentences)", "1d ago"),
      act("lesson", "Reached checkpoint 2 of Lesson 4", "1d ago"),
    ],
    tracking: {
      dwellByType: { grammar: 42, vocabulary: 18, reading: 25, listening: 15, speaking: 8, writing: 6 },
      stuckPoints: [
        { concept: "Present perfect", activity: "Fill the gaps", retries: 4, avgDwellSec: 38, revisits: 3, when: "2d ago" },
        { concept: "Articles", activity: "Quiz", retries: 3, avgDwellSec: 22, revisits: 2, when: "5d ago" },
      ],
      responseSpeed: [
        { concept: "Present perfect", avgSecToCorrect: 14, firstTryAccuracy: 42 },
        { concept: "Past simple", avgSecToCorrect: 6, firstTryAccuracy: 81 },
        { concept: "Word order", avgSecToCorrect: 5, firstTryAccuracy: 88 },
      ],
      rhythm: { avgSessionMin: 18, sessionsPerWeek: 5, commonTimeOfDay: "evenings (7–9pm)", avgGapHours: 30 },
      reading: { paceWpm: 95, rereads: 2, wordsTappedPerText: 6 },
      listening: { avgReplays: 2.4, struggle: "standup recording replayed 3× around “already resolved”" },
      hints: { used: 5, mostUsedOn: "Present perfect" },
      abandonment: [{ lesson: "Lesson 5 — Code-review comments", part: "Grammar", when: "4d ago" }],
      hesitationStats: { avgFirstAnswerSec: 9, answersChanged: 3, retriesAvg: 1.8, worstOn: "Present perfect" },
      confidence: [
        { concept: "Present perfect", predicted: 75, actual: 42 },
        { concept: "Word order", predicted: 85, actual: 88 },
      ],
    },
    lastRecording: { date: "Jun 28", durationMin: 22, summary: "Covered present perfect vs past simple with standup vocabulary. High hesitation on present-perfect items (avg 9s, changed answer 3×). Replayed the standup audio twice around “already resolved.” Ended on a strong note — 9/10 on the retried gap-fill." },
  },
  {
    id: "s_nigar", name: "Nigar Mammadova", email: "nigar.m@example.com", level: "B2", goal: "IELTS 7.0", streak: 30, streakFreeze: 2,
    xp: 9120, status: "in progress", last: "20m ago", step: 6, progress: 92, atRisk: false,
    placement: { level: "B2", when: "6 months ago", score: 78 },
    cefr: [{ m: "Apr", v: 2.4 }, { m: "May", v: 2.7 }, { m: "Jun", v: 3.0 }, { m: "Jul", v: 3.3 }],
    skills: { vocab: 88, grammar: 79, reading: 84, listening: 72 },
    wordFlow: { new: 31, learning: 12, known: 27 },
    concepts: { "Articles": 70, "Present perfect": 82, "Past simple": 90, "Prepositions": 74, "Phrasal verbs": 68, "Word order": 92, "Conditionals": 77 },
    l1: [{ issue: "Occasional article slip", why: "Residual L1 interference under time pressure.", count: 3 }],
    confusionPairs: [],
    adjustLog: [{ when: "1d ago", dir: "harder", concept: "Word order", reason: "5 correct in a row — skipped ahead to harder items" }],
    words: [
      { term: "furthermore", az: "üstəlik", def: "in addition", example: "Furthermore, the data shows growth.", status: "strong", source: "IELTS linkers", daysAgo: 4, dueInDays: 6 },
      { term: "nevertheless", az: "buna baxmayaraq", def: "in spite of that", example: "It rained; nevertheless, we walked.", status: "medium", source: "IELTS linkers", daysAgo: 2, dueInDays: 2 },
    ],
    notes: [],
    activity: [act("word", "Moved 3 words to “known”", "20m ago"), act("test", "Test · Word order — 10/10", "20m ago")],
    tracking: {
      dwellByType: { grammar: 20, vocabulary: 15, reading: 22, listening: 18, speaking: 10, writing: 5 },
      stuckPoints: [],
      responseSpeed: [
        { concept: "Word order", avgSecToCorrect: 3, firstTryAccuracy: 95 },
        { concept: "Present perfect", avgSecToCorrect: 4, firstTryAccuracy: 90 },
      ],
      rhythm: { avgSessionMin: 25, sessionsPerWeek: 6, commonTimeOfDay: "mornings (7–8am)", avgGapHours: 18 },
      reading: { paceWpm: 140, rereads: 0, wordsTappedPerText: 2 },
      listening: { avgReplays: 0.8, struggle: null },
      hints: { used: 0, mostUsedOn: null },
      abandonment: [],
      hesitationStats: { avgFirstAnswerSec: 3, answersChanged: 0, retriesAvg: 1.1, worstOn: null },
    },
    lastRecording: { date: null, durationMin: 0, summary: null },
  },
  {
    id: "s_elvin", name: "Elvin Huseynov", email: "elvin.h@example.com", level: "B1", goal: "Understand English docs at work", streak: 3, streakFreeze: 0,
    xp: 1240, status: "in progress", last: "1d ago", step: 1, progress: 24, atRisk: false,
    placement: { level: "B1", when: "1 month ago", score: 54 },
    cefr: [{ m: "May", v: 1.0 }, { m: "Jun", v: 1.2 }, { m: "Jul", v: 1.3 }],
    skills: { vocab: 55, grammar: 40, reading: 60, listening: 34 },
    wordFlow: { new: 12, learning: 9, known: 5 },
    concepts: { "Articles": 38, "Present perfect": 41, "Past simple": 52, "Prepositions": 47, "Phrasal verbs": 44, "Word order": 66, "Conditionals": 39 },
    l1: [{ issue: "Word order in questions", why: "L1 word order differs from English auxiliary inversion.", count: 6 }],
    confusionPairs: [{ a: "make", b: "do", count: 4 }],
    adjustLog: [{ when: "3d ago", dir: "easier", concept: "Word order", reason: "high hesitation + 2 misses — simplified the next set" }],
    words: [
      { term: "resolve", az: "həll etmək", def: "to solve a problem", example: "I resolved the issue.", status: "weak", source: "A morning standup", daysAgo: 5, dueInDays: 0 },
    ],
    notes: [],
    activity: [act("reading", "Tapped 9 words in “At the café”", "1d ago")],
    tracking: {
      dwellByType: { grammar: 10, vocabulary: 6, reading: 12, listening: 4, speaking: 0, writing: 0 },
      stuckPoints: [{ concept: "Word order", activity: "Practice", retries: 5, avgDwellSec: 50, revisits: 4, when: "1d ago" }],
      responseSpeed: [{ concept: "Word order", avgSecToCorrect: 21, firstTryAccuracy: 30 }],
      rhythm: { avgSessionMin: 9, sessionsPerWeek: 2, commonTimeOfDay: "late nights (11pm+)", avgGapHours: 60 },
      reading: { paceWpm: 60, rereads: 4, wordsTappedPerText: 9 },
      listening: { avgReplays: 3.1, struggle: "café audio replayed 4× on “grab a sandwich”" },
      hints: { used: 8, mostUsedOn: "Word order" },
      abandonment: [{ lesson: "Lesson 1 — Introducing yourself", part: "Grammar", when: "2d ago" }],
      hesitationStats: { avgFirstAnswerSec: 14, answersChanged: 5, retriesAvg: 2.6, worstOn: "Word order" },
    },
    lastRecording: { date: null, durationMin: 0, summary: null },
  },
  {
    id: "s_leyla", name: "Leyla Qasimova (demo)", email: "leyla.demo@lucid.app", level: "B2", goal: "Teacher demo account", streak: 21, streakFreeze: 1,
    xp: 6400, status: "completed", last: "3h ago", step: 7, progress: 100, atRisk: false,
    placement: { level: "B2", when: "5 months ago", score: 81 },
    cefr: [{ m: "Apr", v: 2.6 }, { m: "May", v: 2.9 }, { m: "Jun", v: 3.2 }, { m: "Jul", v: 3.4 }],
    skills: { vocab: 90, grammar: 85, reading: 88, listening: 80 },
    wordFlow: { new: 18, learning: 6, known: 30 },
    concepts: { "Articles": 88, "Present perfect": 90, "Past simple": 92, "Prepositions": 84, "Phrasal verbs": 80, "Word order": 95, "Conditionals": 86 },
    l1: [],
    words: [], notes: [],
    activity: [act("lesson", "Completed Lesson 4 — Tense forms", "3h ago")],
    tracking: {
      dwellByType: { grammar: 30, vocabulary: 20, reading: 28, listening: 20, speaking: 12, writing: 8 },
      stuckPoints: [],
      responseSpeed: [{ concept: "Word order", avgSecToCorrect: 3, firstTryAccuracy: 97 }],
      rhythm: { avgSessionMin: 22, sessionsPerWeek: 6, commonTimeOfDay: "evenings", avgGapHours: 20 },
      reading: { paceWpm: 150, rereads: 0, wordsTappedPerText: 1 },
      listening: { avgReplays: 0.5, struggle: null },
      hints: { used: 0, mostUsedOn: null },
      abandonment: [],
      hesitationStats: { avgFirstAnswerSec: 4, answersChanged: 1, retriesAvg: 1.2, worstOn: null },
    },
    lastRecording: { date: "Jun 25", durationMin: 20, summary: "Completed the lesson confidently — no hesitation flags, no replays needed." },
  },
  {
    id: "s_kamran", name: "Kamran Safarov", email: "kamran.s@example.com", level: "A2+", goal: "Start from the basics", streak: 0, streakFreeze: 0,
    xp: 120, status: "not started", last: "6d ago", step: -1, progress: 0, atRisk: true,
    riskReason: "No activity for 6 days · streak dropped to 0 · never finished placement follow-up",
    placement: { level: "A2", when: "1 week ago", score: 41 },
    cefr: [{ m: "Jul", v: 0.8 }],
    skills: { vocab: 30, grammar: 22, reading: 28, listening: 20 },
    wordFlow: { new: 4, learning: 2, known: 0 },
    concepts: { "Articles": 20, "Present perfect": 18, "Past simple": 30, "Prepositions": 25, "Phrasal verbs": 15, "Word order": 34, "Conditionals": 12 },
    l1: [{ issue: "Articles", why: "No articles in Azerbaijani.", count: 4 }],
    words: [], notes: [],
    activity: [act("lesson", "Signed up, took placement test", "6d ago")],
    tracking: {
      dwellByType: { grammar: 0, vocabulary: 0, reading: 2, listening: 0, speaking: 0, writing: 0 },
      stuckPoints: [],
      responseSpeed: [],
      rhythm: { avgSessionMin: 4, sessionsPerWeek: 0, commonTimeOfDay: "—", avgGapHours: 144 },
      reading: { paceWpm: 0, rereads: 0, wordsTappedPerText: 0 },
      listening: { avgReplays: 0, struggle: null },
      hints: { used: 0, mostUsedOn: null },
      abandonment: [{ lesson: "Placement follow-up", part: "Reading", when: "6d ago" }],
      hesitationStats: { avgFirstAnswerSec: 0, answersChanged: 0, retriesAvg: 0, worstOn: null },
    },
    lastRecording: { date: null, durationMin: 0, summary: null },
  },
  {
    id: "s_aysel", name: "Aysel Rahimli", email: "aysel.r@example.com", level: "B2", goal: "IELTS 6.5 for a master's", streak: 8, streakFreeze: 0,
    xp: 4550, status: "in progress", last: "5h ago", step: 5, progress: 71, atRisk: true,
    riskReason: "Effort high (11 sessions/wk) but grammar score flat 3 weeks — a human should look",
    placement: { level: "B2", when: "2 months ago", score: 69 },
    cefr: [{ m: "May", v: 2.5 }, { m: "Jun", v: 2.6 }, { m: "Jul", v: 2.6 }],
    skills: { vocab: 74, grammar: 52, reading: 70, listening: 58 },
    wordFlow: { new: 22, learning: 20, known: 9 },
    concepts: { "Articles": 55, "Present perfect": 60, "Past simple": 68, "Prepositions": 50, "Phrasal verbs": 62, "Word order": 78, "Conditionals": 48 },
    l1: [{ issue: "Conditionals", why: "Maps if-clauses differently from English.", count: 8 }],
    confusionPairs: [{ a: "second conditional", b: "third conditional", count: 5 }],
    adjustLog: [],
    words: [
      { term: "consequently", az: "nəticədə", def: "as a result", example: "It rained; consequently, we stayed in.", status: "medium", source: "IELTS linkers", daysAgo: 3, dueInDays: 1 },
    ],
    notes: [],
    activity: [act("test", "Conditionals practice — 4/10 twice", "5h ago"), act("word", "Saved 2 linkers", "5h ago")],
    tracking: {
      dwellByType: { grammar: 55, vocabulary: 20, reading: 15, listening: 20, speaking: 5, writing: 10 },
      stuckPoints: [
        { concept: "Conditionals", activity: "Practice", retries: 6, avgDwellSec: 62, revisits: 5, when: "5h ago" },
        { concept: "Conditionals", activity: "Quiz", retries: 4, avgDwellSec: 48, revisits: 2, when: "1d ago" },
      ],
      responseSpeed: [
        { concept: "Conditionals", avgSecToCorrect: 28, firstTryAccuracy: 25 },
        { concept: "Word order", avgSecToCorrect: 7, firstTryAccuracy: 80 },
      ],
      rhythm: { avgSessionMin: 30, sessionsPerWeek: 7, commonTimeOfDay: "evenings (8–10pm)", avgGapHours: 16 },
      reading: { paceWpm: 105, rereads: 3, wordsTappedPerText: 5 },
      listening: { avgReplays: 1.5, struggle: null },
      hints: { used: 12, mostUsedOn: "Conditionals" },
      abandonment: [{ lesson: "Part 2 — the long turn", part: "Grammar", when: "3d ago" }],
      hesitationStats: { avgFirstAnswerSec: 18, answersChanged: 6, retriesAvg: 3.2, worstOn: "Conditionals" },
      confidence: [{ concept: "Conditionals", predicted: 40, actual: 25 }],
    },
    lastRecording: { date: null, durationMin: 0, summary: null },
  },
  // Students who reached this teacher through a class link, a purchase, or
  // who used to be in a class — no analytics, just what the teacher has.
  { id: "s_farid", name: "Farid Mammadli", email: "farid.m@example.com", level: "B1", goal: "Speak up in QA meetings", notes: [] },
  { id: "s_lala", name: "Lala Hasanova", email: "lala.h@example.com", level: "B2", goal: "IELTS 7.0 in December",
    notes: [{ id: "n_lala_1", date: "Jun 20", covered: "Conditionals and polite requests; she wants more speaking time.", newWords: ["would you mind", "unless"], mistakes: [], next: "Speaking-heavy lessons", saved: true }] },
  { id: "s_orkhan", name: "Orkhan Aliyev", email: "orkhan.a@example.com", level: "B1", goal: "", notes: [] },
  { id: "s_zeynab", name: "Zeynab Guliyeva", email: "zeynab.g@example.com", level: "A2", goal: "Travel English", notes: [] },
  { id: "s_murad", name: "Murad Karimov", email: "murad.k@example.com", level: "B2", goal: "IELTS 6.5", notes: [] },
  // Another teacher's student — this teacher never sees them.
  { id: "s_tural", name: "Tural Rzayev", email: "tural.r@example.com", level: "B1", goal: "Business meetings", notes: [] },
];

/* class-level analytics (statistics tab) */
export const CLASS_HEATMAP = [
  { name: "Rashad", cells: [42, 44, 71, 63, 80] },
  { name: "Nigar",  cells: [70, 82, 90, 74, 92] },
  { name: "Elvin",  cells: [38, 41, 52, 47, 66] },
  { name: "Leyla",  cells: [88, 90, 92, 84, 95] },
  { name: "Aysel",  cells: [55, 60, 68, 50, 78] },
];
export const HEATMAP_CONCEPTS = ["Articles", "Perfect", "Past", "Prepos.", "Order"];

// north-star: words moved to "known" per active learner, per week
export const NORTHSTAR = [
  { wk: "W-5", v: 6.1 }, { wk: "W-4", v: 5.4 }, { wk: "W-3", v: 7.2 }, { wk: "W-2", v: 6.8 }, { wk: "W-1", v: 8.3 }, { wk: "now", v: 9.1 },
];

/* ------------------------------- block bank ------------------------------- */

// The teacher's saved, reusable blocks. Saving snapshots a block (with all
// its components); inserting into a lesson deep-copies it, so edits after
// insertion never touch the saved original.
export const SEED_BLOCK_BANK = [
  {
    id: "bb1", type: "grammar", title: "Tense timeline pack", from: "IT English · Lesson 4",
    content: { components: [
      { id: "bb1c1", kind: "timeline" },
      { id: "bb1c2", kind: "gapfill", items: [
        { text: "I ___ the report yesterday.", answer: "finished", why: "“yesterday” bitmiş vaxtdır → Past simple." },
        { text: "She ___ here since 2020.", answer: "has lived", why: "İndi də davam edir → Present perfect." },
      ] },
    ] },
  },
  {
    id: "bb2", type: "vocabulary", title: "IT starter words", from: "IT English · Lesson 1",
    content: { components: [
      { id: "bb2c1", kind: "wordlist", items: [
        { term: "deploy", az: "yerləşdirmək", def: "put software onto a server", example: "We deploy every Friday." },
        { term: "bug", az: "səhv", def: "a mistake in the code", example: "I found a bug in the login flow." },
        { term: "merge", az: "birləşdirmək", def: "combine two branches of code", example: "Merge your branch before Friday." },
      ] },
      { id: "bb2c2", kind: "flashcards", items: [
        { term: "deploy", az: "yerləşdirmək", example: "We deploy every Friday." },
        { term: "bug", az: "səhv", example: "I found a bug in the login flow." },
      ] },
    ] },
  },
  {
    id: "bb4", type: "practice", title: "Café role-play pack", from: "Everyday English · Lesson 2",
    content: { components: [
      { id: "bb4c1", kind: "dialoguecompletion", level: "A2", title: "At the counter", turns: [
        { speaker: "A", text: "Hi, what can I get you?" },
        { speaker: "B", text: "___", blank: true, answer: "Could I have a large latte, please?" },
        { speaker: "A", text: "Anything to eat?" },
        { speaker: "B", text: "___", blank: true, answer: "No, thanks. Can I pay by card?" },
      ] },
      { id: "bb4c2", kind: "scenario", level: "A2", situation: "Your order is wrong — you asked for tea, not coffee.", turns: [
        { prompt: "Waiter: Here's your coffee.", sample: "Sorry, I think I ordered a tea." },
        { prompt: "Waiter: Oh, I'm so sorry! I'll change it.", sample: "No problem, thank you." },
      ] },
    ] },
  },
  {
    id: "bb5", type: "vocabulary", title: "Directions starter pack", from: "Everyday English · Lesson 3",
    content: { components: [
      { id: "bb5c1", kind: "wordlist", level: "A2", items: [
        { term: "turn left", az: "sola dön", def: "go to the left", example: "Turn left at the bank." },
        { term: "opposite", az: "qarşısında", def: "on the other side, facing something", example: "The café is opposite the station." },
        { term: "next to", az: "yanında", def: "very close, at the side of", example: "The pharmacy is next to the bakery." },
        { term: "crossroads", az: "yol ayrıcı", def: "a place where two roads cross", example: "Turn right at the crossroads." },
      ] },
      { id: "bb5c2", kind: "crossword", items: [
        { word: "map", clue: "A picture of streets that shows you the way" },
        { word: "bridge", clue: "You walk over it to cross a river" },
        { word: "corner", clue: "Where two streets meet" },
        { word: "station", clue: "Where you catch a train" },
      ] },
    ] },
  },
  {
    id: "bb3", type: "practice", title: "Dev-words crossword", from: "Playground",
    content: { components: [
      { id: "bb3c1", kind: "crossword", items: [
        { word: "deploy", clue: "Put software onto a server" },
        { word: "release", clue: "A new version made available to users" },
        { word: "merge", clue: "Combine two branches of code" },
        { word: "bug", clue: "A mistake in the code" },
      ] },
    ] },
  },
];

// Work a teacher handed to one student (a backend's `assignments`): one row
// per student, written by ASSIGN_WORK. kind: block (a saved block) | task (a
// one-off component built in the Assign dialog) | wordSet | reading. A block
// or task carries a snapshot of its content — the student keeps exactly what
// they were given even if the saved original is edited or deleted later — a
// word set or reading points at the library item (`source`).
// status: assigned → done (the student app, COMPLETE_ASSIGNMENT) | withdrawn.
const bankContent = (id) => JSON.parse(JSON.stringify(SEED_BLOCK_BANK.find((b) => b.id === id).content));
export const SEED_ASSIGNMENTS = [
  { id: "as_seed_1", teacherId: "t_maria", studentId: "s_rashad", kind: "block", title: "Tense timeline pack", blockType: "grammar", componentKind: null,
    source: { bankItemId: "bb1", from: "IT English · Lesson 4" }, content: bankContent("bb1"),
    assignedAt: "2026-09-25T10:20:00.000Z", status: "assigned", completedAt: null, withdrawnAt: null },
  { id: "as_seed_2", teacherId: "t_maria", studentId: "s_rashad", kind: "wordSet", title: "IT essentials", blockType: null, componentKind: null,
    source: { wordSetId: "ws_it" }, content: null,
    assignedAt: "2026-09-15T09:30:00.000Z", status: "done", completedAt: "2026-09-17T19:05:00.000Z", withdrawnAt: null },
  { id: "as_seed_3", teacherId: "t_maria", studentId: "s_nigar", kind: "block", title: "IT starter words", blockType: "vocabulary", componentKind: null,
    source: { bankItemId: "bb2", from: "IT English · Lesson 1" }, content: bankContent("bb2"),
    assignedAt: "2026-09-08T11:00:00.000Z", status: "done", completedAt: "2026-09-10T18:30:00.000Z", withdrawnAt: null },
];

// How each kind of assignment is named in the UI.
export const ASSIGNMENT_KIND_LABEL = { block: "Block", task: "Task", wordSet: "Word set", reading: "Reading" };

// Reusable individual component bank (saved by teachers for cross-lesson reuse)
export const SEED_COMPONENT_BANK = [
  {
    id: "cb1", title: "Wheel of Fortune — IT Standup Vocab", kind: "wheel", from: "Playground",
    data: { id: "cb1d", kind: "wheel", title: "IT Standup Vocab Wheel", items: [
      { term: "deploy", az: "yerləşdirmək", q: "What does 'deploy' mean in software?" },
      { term: "ship", az: "təhvil vermək", q: "Give an example with 'ship'." },
      { term: "blocking", az: "maneə törədən", q: "What is blocking your progress?" },
      { term: "resolved", az: "həll edildi", q: "Have you resolved the bug?" },
    ] }
  },
  {
    id: "cb2", title: "Word Search — Tense & Time Words", kind: "wordsearch", from: "Playground",
    data: { id: "cb2d", kind: "wordsearch", title: "Find the Tense & Time Words", words: ["DEPLOY", "SHIP", "RELEASE", "SOLVED", "MERGE"] }
  },
  {
    id: "cb3", title: "Image & Word Match — Everyday Objects", kind: "imagetoword", from: "Playground",
    data: { id: "cb3d", kind: "imagetoword", title: "Match Picture to Word", items: [
      { emoji: "☕", term: "coffee", az: "qəhvə" },
      { emoji: "🛋️", term: "cozy", az: "rahat" },
      { emoji: "🥪", term: "sandwich", az: "sendviç" },
      { emoji: "📦", term: "package", az: "bağlama" },
    ] }
  },
  {
    id: "cb4", title: "Polite requests quiz", kind: "quiz", from: "Everyday English · Lesson 2",
    data: { id: "cb4d", kind: "quiz", level: "A2", items: [
      { q: "The most polite way to order is:", options: ["Give me a tea.", "I want tea.", "Could I have a tea, please?"], answer: 2, why: "“Could I have…, please?” ən nəzakətli formadır." },
      { q: "___ you like some dessert?", options: ["Would", "Do", "Are"], answer: 0, why: "Təklif: “Would you like…?”" },
      { q: "Can we have the ___, please? We'd like to pay.", options: ["menu", "bill", "tip"], answer: 1, why: "Ödəmək üçün “the bill” istənilir." },
    ] }
  },
  {
    id: "cb5", title: "Food & drink flashcards", kind: "flashcards", from: "Everyday English · Lesson 2",
    data: { id: "cb5d", kind: "flashcards", level: "A2", items: [
      { term: "menu", az: "menyu", example: "Could I see the menu, please?" },
      { term: "bill", az: "hesab", example: "Can we have the bill, please?" },
      { term: "takeaway", az: "özü ilə aparmaq", example: "Is that for here or takeaway?" },
      { term: "dessert", az: "desert", example: "Would you like a dessert?" },
    ] }
  },
  {
    id: "cb6", title: "Asking for directions — dialogue", kind: "dialoguecompletion", from: "Everyday English · Lesson 3",
    data: { id: "cb6d", kind: "dialoguecompletion", level: "A2", title: "Excuse me, where's the station?", turns: [
      { speaker: "A", text: "Excuse me, how do I get to the station?" },
      { speaker: "B", text: "___", blank: true, answer: "Go straight on and take the second left." },
      { speaker: "A", text: "Is it far?" },
      { speaker: "B", text: "___", blank: true, answer: "No, about five minutes on foot." },
    ] }
  },
  {
    id: "cb7", title: "Irregular verb “go” — conjugation", kind: "conjugation", from: "IT English · Lesson 4",
    data: { id: "cb7d", kind: "conjugation", level: "A2", verb: "go", tenses: {
      "Present simple": { I: "go", You: "go", "He/She/It": "goes", We: "go", They: "go" },
      "Past simple": { I: "went", You: "went", "He/She/It": "went", We: "went", They: "went" },
      "Present perfect": { I: "have gone", You: "have gone", "He/She/It": "has gone", We: "have gone", They: "have gone" },
    } }
  },
  {
    id: "cb8", title: "Returning an item — role-play", kind: "scenario", from: "Everyday English · Lesson 4",
    data: { id: "cb8d", kind: "scenario", level: "B1", situation: "You bought trainers yesterday, but they're too small.", turns: [
      { prompt: "Shop assistant: Hi, how can I help you?", sample: "Hi, I bought these trainers yesterday, but they're too small." },
      { prompt: "Shop assistant: Do you have the receipt?", sample: "Yes, here it is." },
      { prompt: "Shop assistant: Would you like a bigger size or a refund?", sample: "Could I try on a size 42, please?" },
    ] }
  },
  {
    id: "cb9", title: "Standup phrases — shadowing", kind: "shadowing", from: "IT English · Lesson 4",
    data: { id: "cb9d", kind: "shadowing", level: "B1", items: [
      { sentence: "I've fixed two of the three bugs so far.", note: "Contraction: “I've” — say it as one sound." },
      { sentence: "I'll have them ready by Wednesday.", note: "Stress: READY, WEDNESDAY." },
      { sentence: "Nothing is blocking me today.", note: "Fall on “today”." },
    ] }
  },
];

// Word of the day — one shared word pushed to every learner (from the docs'
// "gizmos" list). Rotates daily in the real product; fixed in the demo.
export const WORD_OF_DAY = {
  term: "figure out", az: "başa düşmək, tapmaq", emoji: "🧩",
  ipaUk: "/ˈfɪɡ.ər aʊt/", ipaUs: "/ˈfɪɡ.jɚ aʊt/",
  def: "to finally understand something or find a solution after thinking",
  example: "It took me an hour to figure out the bug.",
};

/* AI Insights — class-wide mastery trend per concept, last 6 weeks.
   Feeds the trajectory (improving / plateauing / regressing) computation. */
export const CONCEPT_WEEKS = ["W-5", "W-4", "W-3", "W-2", "W-1", "now"];
export const CONCEPT_TRENDS = [
  { concept: "Articles",         values: [30, 33, 35, 38, 40, 43] },
  { concept: "Present perfect",  values: [50, 52, 51, 53, 52, 54] },
  { concept: "Word order",       values: [60, 66, 71, 75, 79, 83] },
  { concept: "Conditionals",     values: [45, 44, 46, 43, 42, 41] },
];
