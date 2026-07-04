import {
  BookOpen, Layers, Video, Headphones, Shapes, PenTool, ClipboardList,
  MousePointerClick, Briefcase, FileQuestion,
} from "lucide-react";

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

// Lesson part types — a lesson is assembled from these blocks.
export const PART_TYPES = {
  passage:   { label: "Reading passage", icon: BookOpen,          tone: "text-sky-600 bg-sky-50" },
  words:     { label: "Vocabulary",      icon: Layers,            tone: "text-indigo-600 bg-indigo-50" },
  cards:     { label: "Drag & drop",     icon: MousePointerClick, tone: "text-fuchsia-600 bg-fuchsia-50" },
  grammar:   { label: "Grammar (visual)",icon: Shapes,            tone: "text-emerald-600 bg-emerald-50" },
  video:     { label: "Video",           icon: Video,             tone: "text-rose-600 bg-rose-50" },
  listening: { label: "Listening",       icon: Headphones,        tone: "text-violet-600 bg-violet-50" },
  scenario:  { label: "Scenario task",   icon: Briefcase,         tone: "text-teal-600 bg-teal-50" },
  practice:  { label: "Practice",        icon: PenTool,           tone: "text-amber-600 bg-amber-50" },
  test:      { label: "Test",            icon: FileQuestion,      tone: "text-orange-600 bg-orange-50" },
  homework:  { label: "Homework",        icon: ClipboardList,     tone: "text-slate-600 bg-slate-100" },
};
export const PART_ORDER = ["passage", "words", "cards", "grammar", "video", "listening", "scenario", "practice", "test", "homework"];

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
  weak:   { label: "weak",   dot: "bg-rose-500",    pill: "bg-rose-50 text-rose-700" },
  medium: { label: "medium", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700" },
  strong: { label: "strong", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
};
// Reading word status — colours the word ON the page as the learner reads.
export const READ_STATUS = {
  new:      "bg-sky-100 text-sky-900 rounded px-0.5",
  learning: "underline decoration-2 decoration-amber-400 underline-offset-2",
  known:    "",
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
export function statusPill(status) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "in progress") return "bg-indigo-50 text-indigo-700";
  return "bg-slate-100 text-slate-400";
}

/* ------------------------------- teacher ------------------------------- */

export const TEACHER = { name: "Leyla Qasimova", initials: "LQ", role: "Vetted teacher", since: "2024" };

/* ------------------------------- courses / lessons / parts ------------------------------- */

let pid = 0;
const P = (type, title, meta, extra = {}) => ({ id: `p${++pid}`, type, title, meta, ...extra });

// Full authored content for the flagship "Tense forms" lesson (IT English · L4)
const TENSE_PARTS = [
  P("passage",   "How we talk about time at work", "240 words · B1 · tap-to-translate on", { textId: "t_standup" }),
  P("words",     "12 tense & time words",          "deploy · ship · release · by then …"),
  P("grammar",   "Tenses on a timeline",           "Interactive visual block", { grammar: "timeline" }),
  P("video",     "Past simple vs present perfect", "3:10 · subtitled"),
  P("listening", "A real standup recording",       "1:45 · with transcript"),
  P("scenario",  "Give your status in standup",    "Work situation · 4 turns"),
  P("practice",  "Fill the gaps · 10 items",       "Auto-graded · instant feedback in AZ"),
  P("test",      "Quick check · 6 items",          "Encourage-don't-punish · retry allowed"),
  P("homework",  "Write 5 sentences about your week", "You review before it's marked done"),
];

export const SEED_COURSES = [
  { id: "every", title: "Everyday English", level: "A2 → B1", hue: "amber",   students: 21, completion: 78 },
  { id: "it",    title: "IT English",       level: "B1 → B2", hue: "indigo",  students: 14, completion: 62 },
  { id: "ielts", title: "IELTS Speaking",   level: "B2 → C1", hue: "emerald", students: 9,  completion: 41 },
];

// lessons keyed by course
export const SEED_LESSONS = {
  it: [
    { id: "it1", n: 1, title: "Introducing yourself on a team",      parts: ["passage", "words", "listening", "grammar", "practice"],                    active: 14, progress: 100 },
    { id: "it2", n: 2, title: "Describing what you work on",         parts: ["passage", "words", "video", "grammar", "homework"],                        active: 14, progress: 88 },
    { id: "it3", n: 3, title: "Talking about a bug in standup",      parts: ["passage", "words", "listening", "grammar", "scenario", "homework"],        active: 13, progress: 64 },
    { id: "it4", n: 4, title: "Tense forms", built: TENSE_PARTS,     parts: ["passage", "words", "grammar", "video", "listening", "scenario", "practice", "test", "homework"], active: 11, progress: 29, current: true },
    { id: "it5", n: 5, title: "Writing clear code-review comments",  parts: ["passage", "words", "grammar", "practice"],                                  active: 4,  progress: 6,  locked: true },
    { id: "it6", n: 6, title: "Explaining a technical decision",     parts: ["passage", "words", "video", "grammar", "homework"],                        active: 0,  progress: 0,  locked: true },
  ],
  every: [
    { id: "ev1", n: 1, title: "Greetings & small talk",     parts: ["passage", "words", "cards", "grammar", "practice"], active: 21, progress: 96 },
    { id: "ev2", n: 2, title: "Ordering food & drinks",     parts: ["passage", "words", "cards", "listening", "test"],   active: 20, progress: 84 },
    { id: "ev3", n: 3, title: "Getting around the city",    parts: ["passage", "words", "grammar", "scenario", "test"],  active: 18, progress: 71, current: true },
    { id: "ev4", n: 4, title: "Shopping & prices",          parts: ["passage", "words", "cards", "practice"],            active: 9,  progress: 22, locked: true },
  ],
  ielts: [
    { id: "ie1", n: 1, title: "Part 1 — familiar topics",   parts: ["passage", "words", "video", "practice"],            active: 9,  progress: 55 },
    { id: "ie2", n: 2, title: "Part 2 — the long turn",     parts: ["passage", "words", "scenario", "homework"],         active: 7,  progress: 38, current: true },
  ],
};

/* ------------------------------- reading library ------------------------------- */

// A tappable token carries the AZ translation + definition + example.
const w = (term, az, def, example, status = "known") => ({ term, az, def, example, status });
const s = (text) => ({ text }); // plain glue text (punctuation / known words)

export const SEED_TEXTS = [
  {
    id: "t_standup", title: "A morning standup", topic: "IT", level: "B1", wordCount: 58, hasTranslation: true,
    body: [
      s("Every morning the team has a short "), w("standup", "gündəlik toplantı", "a short daily meeting where each person shares progress", "We keep the standup under ten minutes.", "new"),
      s(". Yesterday I "), w("shipped", "təhvil verdim", "released code to users", "We shipped the new login screen last night.", "learning"),
      s(" the login screen. Today I will "), w("deploy", "yerləşdirmək", "put software onto a server so people can use it", "We deploy every Friday afternoon.", "new"),
      s(" the fix, and by then the "), w("release", "buraxılış", "a new version made available to users", "The release is planned for Monday.", "learning"),
      s(" should be stable. I have already "), w("resolved", "həll etdim", "solved or fixed a problem", "I resolved the bug before lunch.", "known"),
      s(" the payment bug, so nothing is "), w("blocking", "maneə törədən", "stopping progress", "Nothing is blocking me today.", "new"), s(" me today."),
    ],
  },
  {
    id: "t_cafe", title: "At the café", topic: "Everyday", level: "A2", wordCount: 44, hasTranslation: true,
    body: [
      s("I usually "), w("order", "sifariş vermək", "to ask for food or drink in a place", "I order a coffee every morning.", "learning"),
      s(" a coffee before work. The café near my flat is "), w("cozy", "rahat", "warm and comfortable", "The room was small but cozy.", "new"),
      s(" and the staff are "), w("friendly", "mehriban", "kind and pleasant", "The waiter was very friendly.", "known"),
      s(". Sometimes I "), w("grab", "tez almaq", "to take something quickly", "Let me grab a sandwich on the way.", "new"), s(" a sandwich too."),
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
];

/* ------------------------------- word sets ------------------------------- */

export const SEED_WORDSETS = [
  { id: "ws_it", title: "IT essentials", category: "IT", level: "B1", words: [
    { term: "deploy", az: "yerləşdirmək" }, { term: "ship", az: "təhvil vermək" }, { term: "release", az: "buraxılış" },
    { term: "bug", az: "səhv" }, { term: "merge", az: "birləşdirmək" }, { term: "rollback", az: "geri qaytarma" },
  ] },
  { id: "ws_biz", title: "Client email phrases", category: "Business", level: "B2", words: [
    { term: "follow up", az: "əlaqə saxlamaq" }, { term: "reach out", az: "əlaqə saxla" }, { term: "on track", az: "planda" },
    { term: "let me know", az: "mənə bildir" }, { term: "at your earliest convenience", az: "ilk imkanda" },
  ] },
  { id: "ws_every", title: "Everyday basics", category: "Everyday", level: "A2", words: [
    { term: "order", az: "sifariş vermək" }, { term: "grab", az: "tez almaq" }, { term: "cozy", az: "rahat" },
    { term: "friendly", az: "mehriban" }, { term: "nearby", az: "yaxınlıqda" },
  ] },
  { id: "ws_travel", title: "Travel & directions", category: "Travel", level: "A2", words: [
    { term: "boarding pass", az: "minik talonu" }, { term: "gate", az: "çıxış qapısı" }, { term: "delay", az: "gecikmə" },
    { term: "aisle", az: "keçid" }, { term: "layover", az: "aralıq dayanacaq" },
  ] },
  { id: "ws_ielts", title: "IELTS band-7 linkers", category: "IELTS", level: "B2", words: [
    { term: "furthermore", az: "üstəlik" }, { term: "nevertheless", az: "buna baxmayaraq" }, { term: "consequently", az: "nəticədə" },
    { term: "in contrast", az: "əksinə" },
  ] },
];

// commonly-confused pairs (➕ feature, previewable)
export const CONFUSED = [
  { a: "affect", b: "effect", note: "affect = verb (to change); effect = noun (the result)" },
  { a: "its", b: "it's", note: "its = possessive; it's = it is" },
  { a: "since", b: "for", note: "since + a point in time; for + a length of time" },
];

/* ------------------------------- students ------------------------------- */

const act = (type, detail, when) => ({ type, detail, when });

export const SEED_STUDENTS = [
  {
    id: "s_rashad", name: "Rashad Aliyev", courseId: "it", level: "B1+", goal: "Speak confidently in standups", streak: 12, streakFreeze: 1,
    dailyGoal: 20, dailyDone: 14, xp: 3820, status: "in progress", last: "2h ago", step: 4, progress: 57, atRisk: false,
    placement: { level: "B1", when: "3 months ago", score: 62 },
    cefr: [{ m: "Apr", v: 1 }, { m: "May", v: 1.4 }, { m: "Jun", v: 1.7 }, { m: "Jul", v: 2.0 }],
    skills: { vocab: 72, grammar: 48, reading: 66, listening: 40 },
    wordFlow: { new: 24, learning: 18, known: 15 },
    concepts: { "Articles": 42, "Present perfect": 44, "Past simple": 71, "Prepositions": 63, "Phrasal verbs": 55, "Word order": 80, "Conditionals": 58 },
    l1: [{ issue: "Drops articles (a / the)", why: "Azerbaijani has no articles, so learners under-use them.", count: 11 }, { issue: "Mixes past simple / present perfect", why: "Azerbaijani maps both to one past tense.", count: 7 }],
    words: [
      { term: "deploy", az: "yerləşdirmək", def: "put software on a server", example: "We deploy every Friday.", status: "medium", source: "A morning standup", daysAgo: 2, dueInDays: 1 },
      { term: "overcome", az: "öhdəsindən gəlmək", def: "to succeed in dealing with a problem", example: "She overcame her fear of meetings.", status: "weak", source: "Explaining a decision", daysAgo: 6, dueInDays: 0 },
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
    hesitation: "high on present-perfect items (avg 9s, changed answer 3×)",
  },
  {
    id: "s_nigar", name: "Nigar Mammadova", courseId: "it", level: "B2", goal: "IELTS 7.0", streak: 30, streakFreeze: 2,
    dailyGoal: 30, dailyDone: 30, xp: 9120, status: "in progress", last: "20m ago", step: 6, progress: 92, atRisk: false,
    placement: { level: "B2", when: "6 months ago", score: 78 },
    cefr: [{ m: "Apr", v: 2.4 }, { m: "May", v: 2.7 }, { m: "Jun", v: 3.0 }, { m: "Jul", v: 3.3 }],
    skills: { vocab: 88, grammar: 79, reading: 84, listening: 72 },
    wordFlow: { new: 31, learning: 12, known: 27 },
    concepts: { "Articles": 70, "Present perfect": 82, "Past simple": 90, "Prepositions": 74, "Phrasal verbs": 68, "Word order": 92, "Conditionals": 77 },
    l1: [{ issue: "Occasional article slip", why: "Residual L1 interference under time pressure.", count: 3 }],
    words: [
      { term: "furthermore", az: "üstəlik", def: "in addition", example: "Furthermore, the data shows growth.", status: "strong", source: "IELTS linkers", daysAgo: 4, dueInDays: 6 },
      { term: "nevertheless", az: "buna baxmayaraq", def: "in spite of that", example: "It rained; nevertheless, we walked.", status: "medium", source: "IELTS linkers", daysAgo: 2, dueInDays: 2 },
    ],
    notes: [],
    activity: [act("word", "Moved 3 words to “known”", "20m ago"), act("test", "Test · Word order — 10/10", "20m ago")],
    hesitation: "low — fast, confident answers",
  },
  {
    id: "s_elvin", name: "Elvin Huseynov", courseId: "it", level: "B1", goal: "Understand English docs at work", streak: 3, streakFreeze: 0,
    dailyGoal: 15, dailyDone: 3, xp: 1240, status: "in progress", last: "1d ago", step: 1, progress: 24, atRisk: false,
    placement: { level: "B1", when: "1 month ago", score: 54 },
    cefr: [{ m: "May", v: 1.0 }, { m: "Jun", v: 1.2 }, { m: "Jul", v: 1.3 }],
    skills: { vocab: 55, grammar: 40, reading: 60, listening: 34 },
    wordFlow: { new: 12, learning: 9, known: 5 },
    concepts: { "Articles": 38, "Present perfect": 41, "Past simple": 52, "Prepositions": 47, "Phrasal verbs": 44, "Word order": 66, "Conditionals": 39 },
    l1: [{ issue: "Word order in questions", why: "L1 word order differs from English auxiliary inversion.", count: 6 }],
    words: [
      { term: "resolve", az: "həll etmək", def: "to solve a problem", example: "I resolved the issue.", status: "weak", source: "A morning standup", daysAgo: 5, dueInDays: 0 },
    ],
    notes: [],
    activity: [act("reading", "Tapped 9 words in “At the café”", "1d ago")],
    hesitation: "medium — many hints used on grammar",
  },
  {
    id: "s_leyla", name: "Leyla Qasimova (demo)", courseId: "it", level: "B2", goal: "Teacher demo account", streak: 21, streakFreeze: 1,
    dailyGoal: 20, dailyDone: 20, xp: 6400, status: "completed", last: "3h ago", step: 7, progress: 100, atRisk: false,
    placement: { level: "B2", when: "5 months ago", score: 81 },
    cefr: [{ m: "Apr", v: 2.6 }, { m: "May", v: 2.9 }, { m: "Jun", v: 3.2 }, { m: "Jul", v: 3.4 }],
    skills: { vocab: 90, grammar: 85, reading: 88, listening: 80 },
    wordFlow: { new: 18, learning: 6, known: 30 },
    concepts: { "Articles": 88, "Present perfect": 90, "Past simple": 92, "Prepositions": 84, "Phrasal verbs": 80, "Word order": 95, "Conditionals": 86 },
    l1: [],
    words: [], notes: [],
    activity: [act("lesson", "Completed Lesson 4 — Tense forms", "3h ago")],
    hesitation: "low",
  },
  {
    id: "s_kamran", name: "Kamran Safarov", courseId: "it", level: "A2+", goal: "Start from the basics", streak: 0, streakFreeze: 0,
    dailyGoal: 10, dailyDone: 0, xp: 120, status: "not started", last: "6d ago", step: -1, progress: 0, atRisk: true,
    riskReason: "No activity for 6 days · streak dropped to 0 · never finished placement follow-up",
    placement: { level: "A2", when: "1 week ago", score: 41 },
    cefr: [{ m: "Jul", v: 0.8 }],
    skills: { vocab: 30, grammar: 22, reading: 28, listening: 20 },
    wordFlow: { new: 4, learning: 2, known: 0 },
    concepts: { "Articles": 20, "Present perfect": 18, "Past simple": 30, "Prepositions": 25, "Phrasal verbs": 15, "Word order": 34, "Conditionals": 12 },
    l1: [{ issue: "Articles", why: "No articles in Azerbaijani.", count: 4 }],
    words: [], notes: [],
    activity: [act("lesson", "Signed up, took placement test", "6d ago")],
    hesitation: "n/a — hasn't started lessons",
  },
  {
    id: "s_aysel", name: "Aysel Rahimli", courseId: "ielts", level: "B2", goal: "IELTS 6.5 for a master's", streak: 8, streakFreeze: 0,
    dailyGoal: 25, dailyDone: 11, xp: 4550, status: "in progress", last: "5h ago", step: 5, progress: 71, atRisk: true,
    riskReason: "Effort high (11 sessions/wk) but grammar score flat 3 weeks — a human should look",
    placement: { level: "B2", when: "2 months ago", score: 69 },
    cefr: [{ m: "May", v: 2.5 }, { m: "Jun", v: 2.6 }, { m: "Jul", v: 2.6 }],
    skills: { vocab: 74, grammar: 52, reading: 70, listening: 58 },
    wordFlow: { new: 22, learning: 20, known: 9 },
    concepts: { "Articles": 55, "Present perfect": 60, "Past simple": 68, "Prepositions": 50, "Phrasal verbs": 62, "Word order": 78, "Conditionals": 48 },
    l1: [{ issue: "Conditionals", why: "Maps if-clauses differently from English.", count: 8 }],
    words: [
      { term: "consequently", az: "nəticədə", def: "as a result", example: "It rained; consequently, we stayed in.", status: "medium", source: "IELTS linkers", daysAgo: 3, dueInDays: 1 },
    ],
    notes: [],
    activity: [act("test", "Conditionals practice — 4/10 twice", "5h ago"), act("word", "Saved 2 linkers", "5h ago")],
    hesitation: "high on conditionals — repeated retries, no improvement",
  },
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
