import {
  BookOpen, Layers, Headphones, Shapes, PenTool, Mic, NotebookPen, Mail, ClipboardCheck, Gamepad2,
  Handshake,
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
  reading:    { label: "Reading",    icon: BookOpen,    tone: "text-sky-600 bg-sky-50",      components: ["passage", "comprehension", "gapfill", "scramble", "wordweb", "youtube", "slidedeck"], starter: ["passage"] },
  listening:  { label: "Listening",  icon: Headphones,  tone: "text-violet-600 bg-violet-50", components: ["listening", "video", "youtube", "slidedeck", "quiz", "gapfill"], starter: ["listening"] },
  speaking:   { label: "Speaking",   icon: Mic,          tone: "text-teal-600 bg-teal-50",     components: ["scenario", "video", "youtube", "speakingRecord", "shadowing", "slidedeck"], starter: ["scenario"] },
  writing:    { label: "Writing",    icon: NotebookPen, tone: "text-rose-600 bg-rose-50",     components: ["homework", "upload", "gapfill", "scramble"], starter: ["homework"] },
  grammar:    { label: "Grammar",    icon: Shapes,       tone: "text-emerald-600 bg-emerald-50", components: ["timeline", "sentence", "preposition", "conjugation", "conditional", "comparison", "wordweb", "quiz", "gapfill", "arrowcorrection", "correctincorrect", "dialoguecompletion", "slidedeck"], starter: ["timeline"] },
  vocabulary: { label: "Vocabulary", icon: Layers,       tone: "text-indigo-600 bg-indigo-50", components: ["wordlist", "flashcards", "match", "wordformation", "quiz", "memory", "wordweb", "gapfill", "crossword", "wheel", "wordsearch", "imagetoword", "slidedeck"], starter: ["wordlist", "flashcards"] },
  practice:   { label: "Practice",   icon: PenTool,      tone: "text-amber-600 bg-amber-50",   components: ["gapfill", "match", "wordformation", "quiz", "flashcards", "memory", "scramble", "arrowcorrection", "correctincorrect", "dialoguecompletion", "speedround", "crossword", "wheel", "wordsearch", "imagetoword"], starter: ["gapfill", "match"] },
  playground: { label: "Playground", icon: Gamepad2,     tone: "text-purple-600 bg-purple-50", components: ["crossword", "memory", "speedround", "match", "wordweb", "wheel", "wordsearch", "imagetoword"], starter: ["crossword"], description: "Gamified vocabulary challenges, Word Tower & interactive puzzles." },
  homework:   { label: "Homework",   icon: ClipboardCheck, tone: "text-orange-600 bg-orange-50", components: ["homework", "upload", "gapfill"], starter: ["homework"], description: "Revision the student completes at home after the lesson." },
  // IELTS-specific: writing and speaking split by task/part, since each
  // has its own timing, rubric and structure — unlike General English.
  ieltsListening: { label: "Listening",          icon: Headphones,  tone: "text-violet-600 bg-violet-50", components: ["listening", "youtube", "quiz", "gapfill"], starter: ["listening"] },
  ieltsReading:   { label: "Reading",            icon: BookOpen,    tone: "text-sky-600 bg-sky-50",      components: ["passage", "comprehension", "gapfill", "youtube"], starter: ["passage"] },
  ieltsWriting1:  { label: "Writing Task 1",     icon: NotebookPen, tone: "text-rose-600 bg-rose-50",    components: ["homework", "upload"], starter: ["homework"], description: "Describe visual data (graph, chart, process) in 150+ words." },
  ieltsWriting2:  { label: "Writing Task 2",     icon: NotebookPen, tone: "text-rose-600 bg-rose-50",    components: ["homework", "upload"], starter: ["homework"], description: "Essay responding to a prompt, 250+ words." },
  ieltsSpeaking1: { label: "Speaking Part 1",    icon: Mic,          tone: "text-teal-600 bg-teal-50",    components: ["scenario", "speakingRecord"], starter: ["scenario"], description: "Short interview questions about familiar topics." },
  ieltsSpeaking2: { label: "Speaking Part 2",    icon: Mic,          tone: "text-teal-600 bg-teal-50",    components: ["scenario", "speakingRecord", "shadowing"], starter: ["scenario"], description: "The long turn — speak for 2 minutes on a cue-card topic." },
  ieltsSpeaking3: { label: "Speaking Part 3",    icon: Mic,          tone: "text-teal-600 bg-teal-50",    components: ["scenario", "speakingRecord"], starter: ["scenario"], description: "Two-way discussion on abstract, related themes." },
  // Business English: swaps generic Writing for correspondence practice.
  businessWriting: { label: "Business Writing", icon: Mail,        tone: "text-rose-600 bg-rose-50",    components: ["homework", "upload", "gapfill"], starter: ["homework"], description: "Emails, reports, and professional correspondence." },
  // Deliberately narrow — one signature Component, not a grab-bag — so what
  // this Block is FOR stays legible at a glance. Low priority: offered last
  // in every template and its own category, rather than removed.
  peerwork:      { label: "Peer work", icon: Handshake,        tone: "text-blue-600 bg-blue-50",       components: ["peertask"], starter: ["peertask"], description: "Group work, not solo or whole-class — an info-gap for any group size, or a Kahoot-style team quiz race." },
};

// A single, safe-fallback lookup for a Block type's display metadata — every
// view that renders a block's icon/label/tone should call this instead of
// reaching into BLOCK_TYPES directly, so an unknown/removed type never
// crashes a render and every fallback style matches everywhere.
export function blockMeta(type) {
  return BLOCK_TYPES[type] || { label: type, icon: Shapes, tone: "text-slate-600 bg-slate-100" };
}

// Solid fill for the compact per-lesson "block rail" in the course tree —
// deliberately a stronger color than `tone`'s soft background, since a tick
// only a few pixels tall needs to read clearly at a glance.
const BLOCK_RAIL = {
  reading: "bg-sky-500", ieltsReading: "bg-sky-500",
  listening: "bg-violet-500", ieltsListening: "bg-violet-500",
  speaking: "bg-teal-500", ieltsSpeaking1: "bg-teal-500", ieltsSpeaking2: "bg-teal-500", ieltsSpeaking3: "bg-teal-500",
  writing: "bg-rose-500", ieltsWriting1: "bg-rose-500", ieltsWriting2: "bg-rose-500", businessWriting: "bg-rose-500",
  grammar: "bg-emerald-500",
  vocabulary: "bg-indigo-500",
  practice: "bg-amber-500",
  playground: "bg-purple-500",
  homework: "bg-orange-500",
  peerwork: "bg-blue-500",
};
export function blockRail(type) { return BLOCK_RAIL[type] || "bg-slate-400"; }

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
  // Low priority — kept as its own group, last, rather than mixed in above.
  { id: "peer", label: "Peer work", types: ["peerwork"] },
];

export const LESSON_TEMPLATES = {
  // "peerwork" is appended last in every template — low priority, so it
  // doesn't compete for attention in the Add-a-block/component pickers.
  general:  { id: "general",  label: "General English", blockTypes: ["reading", "listening", "speaking", "writing", "grammar", "vocabulary", "practice", "playground", "homework", "peerwork"] },
  ielts:    { id: "ielts",    label: "IELTS Prep",       blockTypes: ["ieltsListening", "ieltsReading", "ieltsWriting1", "ieltsWriting2", "ieltsSpeaking1", "ieltsSpeaking2", "ieltsSpeaking3", "grammar", "vocabulary", "playground", "homework", "peerwork"] },
  business: { id: "business", label: "Business English", blockTypes: ["reading", "listening", "speaking", "businessWriting", "grammar", "vocabulary", "playground", "homework", "peerwork"] },
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
  new:      "bg-sky-100 text-sky-900 rounded px-0.5",
  learning: "underline decoration-2 decoration-amber-400 underline-offset-2",
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

export const TEACHER = { name: "Maria Carey", initials: "LQ", role: "Vetted teacher", since: "2024", email: "maria.carey@lucid.app" };

/* ------------------------------- courses / lessons / parts ------------------------------- */

let pid = 0;
const P = (type, title, meta, extra = {}) => ({ id: `p${++pid}`, type, title, meta, ...extra });

// Full authored content for the flagship "Tense forms" lesson (IT English · L4)
const TENSE_PARTS = [
  P("reading",    "Passage — How we talk about time at work", "240 words · B1 · tap-to-translate on", { textId: "t_standup" }),
  P("vocabulary", "Words — 12 target tense & time words",      "deploy · ship · release · by then …"),
  P("listening",  "Videos — Video explanation of tense forms", "Video lesson · 4:15 · subtitled"),
  P("listening",  "Listenings — Real standup audio recording", "Audio recording · 1:45 · with transcript"),
  P("grammar",    "Grammar — Tenses on a timeline",           "Interactive visual grammar block"),
  P("practice",   "Practice Grammar — Fill the gaps & tense rules", "Auto-graded · instant feedback in AZ"),
  P("playground", "Playground — Crossword & Word Tower Challenge", "Gamified vocabulary challenge & puzzles"),
  P("homework",   "Homework — Write 5 sentences using target tenses", "Student submits at home for teacher review"),
];

export const SEED_COURSES = [
  { id: "every", title: "Everyday English", level: "A2 → B1", hue: "amber",   students: 21, completion: 78, templateId: "general" },
  { id: "it",    title: "IT English",       level: "B1 → B2", hue: "indigo",  students: 14, completion: 62, templateId: "general" },
  { id: "ielts", title: "IELTS Speaking",   level: "B2 → C1", hue: "emerald", students: 9,  completion: 41, templateId: "ielts" },
];

// lessons keyed by course
export const SEED_LESSONS = {
  it: [
    { id: "it1", n: 1, title: "Introducing yourself on a team",      parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"],                    active: 14, progress: 100 },
    { id: "it2", n: 2, title: "Describing what you work on",         parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"],                    active: 14, progress: 88 },
    { id: "it3", n: 3, title: "Talking about a bug in standup",      parts: ["reading", "vocabulary", "listening", "listening", "grammar", "practice", "homework"],        active: 13, progress: 64 },
    { id: "it4", n: 4, title: "Tense forms", built: TENSE_PARTS,     parts: ["reading", "vocabulary", "listening", "listening", "grammar", "practice", "homework"], active: 11, progress: 29, current: true },
    { id: "it5", n: 5, title: "Writing clear code-review comments",  parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"],                                  active: 4,  progress: 6,  locked: true },
    { id: "it6", n: 6, title: "Explaining a technical decision",     parts: ["reading", "vocabulary", "listening", "listening", "grammar", "practice", "homework"],                     active: 0,  progress: 0,  locked: true },
  ],
  every: [
    { id: "ev1", n: 1, title: "Greetings & small talk",     parts: ["reading", "vocabulary", "grammar", "practice", "homework"],        active: 21, progress: 96 },
    { id: "ev2", n: 2, title: "Ordering food & drinks",     parts: ["reading", "vocabulary", "listening", "practice", "homework"],      active: 20, progress: 84 },
    { id: "ev3", n: 3, title: "Getting around the city",    parts: ["reading", "vocabulary", "listening", "grammar", "practice", "homework"], active: 18, progress: 71, current: true },
    { id: "ev4", n: 4, title: "Shopping & prices",          parts: ["reading", "vocabulary", "practice", "homework"],                   active: 9,  progress: 22, locked: true },
  ],
  ielts: [
    { id: "ie1", n: 1, title: "Part 1 — familiar topics",   parts: ["ieltsSpeaking1", "vocabulary", "grammar", "practice", "homework"],  active: 9,  progress: 55 },
    { id: "ie2", n: 2, title: "Part 2 — the long turn",     parts: ["ieltsSpeaking2", "ieltsSpeaking3", "vocabulary", "practice", "homework"], active: 7,  progress: 38, current: true },
  ],
};

/* ------------------------------- classes ------------------------------- */

// Class is the top-level, durable thing: a roster of students on a
// schedule. A Course gets assigned to it (courseId) — a class can switch
// courses over time, or have none assigned yet. `currentLessonId` is which
// lesson of the assigned course the whole class is on right now; that's
// the one place lesson sequencing lives — students don't get individually
// assigned/unassigned to lessons, they're on whatever lesson their class is on.
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const SEED_CLASSES = [
  { id: "cls_it_morning", courseId: "it", name: "ITler — Morning", scheduleDays: [1, 3], studentIds: ["s_rashad", "s_nigar", "s_leyla"], currentLessonId: "it4" },
  { id: "cls_it_evening", courseId: "it", name: "ITler — Evening", scheduleDays: [2, 4], studentIds: ["s_elvin", "s_kamran"], currentLessonId: "it1" },
  { id: "cls_ielts_main", courseId: "ielts", name: "IELTS Speaking — Main", scheduleDays: [1, 3, 5], studentIds: ["s_aysel"], currentLessonId: "ie2" },
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
    id: "s_rashad", name: "Rashad Aliyev", courseId: "it", classId: "cls_it_morning", level: "B1+", goal: "Speak confidently in standups", streak: 12, streakFreeze: 1,
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
    id: "s_nigar", name: "Nigar Mammadova", courseId: "it", classId: "cls_it_morning", level: "B2", goal: "IELTS 7.0", streak: 30, streakFreeze: 2,
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
    id: "s_elvin", name: "Elvin Huseynov", courseId: "it", classId: "cls_it_evening", level: "B1", goal: "Understand English docs at work", streak: 3, streakFreeze: 0,
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
    id: "s_leyla", name: "Leyla Qasimova (demo)", courseId: "it", classId: "cls_it_morning", level: "B2", goal: "Teacher demo account", streak: 21, streakFreeze: 1,
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
    id: "s_kamran", name: "Kamran Safarov", courseId: "it", classId: "cls_it_evening", level: "A2+", goal: "Start from the basics", streak: 0, streakFreeze: 0,
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
    id: "s_aysel", name: "Aysel Rahimli", courseId: "ielts", classId: "cls_ielts_main", level: "B2", goal: "IELTS 6.5 for a master's", streak: 8, streakFreeze: 0,
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
];

// A Kit bundles saved Blocks and/or saved Components under one title, so a
// teacher can hand a student a whole "meal" of components in one assign
// action instead of one at a time. Kits reference bank items by id — they
// don't own content — so editing a saved block/component updates every kit
// that includes it.
export const SEED_KITS = [
  { id: "kit1", title: "Standup recap kit", blockIds: ["bb1"], componentIds: ["cb1"] },
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
