import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Check, Play, Volume2,
  Sparkles, RotateCcw, ChevronRight, ArrowRight,
  BookOpen, Layers, MousePointerClick, FileQuestion, PenTool, Shapes, Video,
  Headphones, Briefcase, ClipboardList, Copy,
  MapPin, RotateCw, GitBranch, TrendingUp, Share2, Grid2x2, Shuffle, Timer,
  Trophy, ListChecks, PlayCircle, AudioLines, Repeat2, FileUp, Mic2, Grid3x3,
  Dices, Image, MonitorPlay, Handshake, CornerDownRight, CheckCheck, MessageSquare, FileText,
} from "lucide-react";
import {
  IconEye, IconPencil, IconBookmarkPlus, IconCheck,
  IconCopy, IconArrowUp, IconArrowDown, IconTrash, IconStack2, IconX,
  IconMaximize, IconMinimize, IconRefresh, IconArrowLeft, IconArrowRight, IconInfoCircle,
  IconMessageCircle, IconSend, IconUsers, IconFilePlus, IconBulb, IconVolume, IconMicrophone, IconCornerDownRight, IconSparkles, IconTrophy,
  IconPlus, IconBookmarks, IconBook2, IconAbc, IconTimeline, IconPlayerPlay, IconPresentation, IconPuzzle, IconUsersGroup, IconClipboardText, IconSearch,
} from "@tabler/icons-react";
import { LEVELS } from "../ui.jsx";
import { Alert, Badge, Button, SegmentedToggle, CategoryPicker, CategoryPickerGrid, LibraryPickList, RailItem, NavItem, Card, CountBadge, Field, HeaderCard, HeaderCardSection, Modal, SearchField, Select, StepNav, SpeakButton, Tag, TextField, TextArea, QuestionList, QuestionItem, ChoiceOption, QuestionFooter, MessageBubble, ChatPanel, SegmentedBar, PRESS, inputCls } from "../design-system.jsx";
import {
  useStore, useNav, saveComponentToBank, groupBankByParent, bankChildLabel,
  lessonBlocks, uid, copyWithOwnH5P, discardH5PContent,
} from "../store.jsx";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";
import { BLOCK_TYPES, ROLE, blockMeta } from "../data.jsx";
import {
  Reader, RoleLegend, ColorSentence, TenseTimeline,
  PrepositionScene, ConjugationWheel, ConditionalFlow, ComparisonLadder, WordWeb,
} from "./grammar.jsx";
import { Crossword } from "./playground.jsx";
import { H5P_ACTIVITY_META, H5PActivityComponent, H5PActivityEditor, defaultH5PActivity } from "./h5pActivity.jsx";

/* =========================================================================
   Block Studio — a Block (Reading, Grammar, IELTS Writing Task 2 …) is a
   CONTAINER of Components: visualizations, gamifications, simulations. A
   Vocabulary Block might stack a word list + flashcards + a drag-&-drop
   match + a quiz; a Reading Block can hold several passages. Which
   Components a Block accepts comes from its BLOCK_TYPES entry (data.jsx),
   which itself is only reachable if the course's lesson TEMPLATE includes
   that Block type — nothing here is hardcoded to one curriculum shape.
   Every Component has a student renderer and a teacher editor.
   Content shape:  block.content = { components: [ {id, kind, ...data} ] }
   ========================================================================= */

const cid = () => uid("c");

// The app shell's own topbar height (english-platform-prototype.jsx's
// TopBar is h-16) — BlockStudio's sticky header stacks its own offset on
// top of this, so it's needed here too rather than repeating "64" or "16"
// (Tailwind's spacing unit) at every call site.
const TOPBAR_H = 64;

/* ---- component-kind registry: label, icon, tone, default data ---- */
export const COMPONENT_META = {
  passage:    { label: "Reading passage",       icon: BookOpen,          tone: "text-sky-600 bg-sky-50",      hint: "A tappable text with translations and saved words" },
  comprehension: { label: "Reading comprehension", icon: ListChecks,     tone: "text-orange-600 bg-orange-50", hint: "Multiple-choice questions checked against a passage" },
  wordlist:   { label: "Word list",             icon: Layers,            tone: "text-indigo-600 bg-indigo-50", hint: "Term, translation, definition and example, in a list" },
  flashcards: { label: "Flashcards",            icon: Copy,              tone: "text-indigo-600 bg-indigo-50", hint: "Flip cards, one word at a time, for quick recall" },
  match:      { label: "Drag & drop match",     icon: MousePointerClick, tone: "text-fuchsia-600 bg-fuchsia-50", hint: "Pair each word with its translation or picture" },
  memory:     { label: "Memory match",          icon: Grid2x2,           tone: "text-pink-600 bg-pink-50",    hint: "Flip-and-match pairs game for vocabulary" },
  crossword:  { label: "Crossword",             icon: Grid3x3,           tone: "text-lime-600 bg-lime-50",    hint: "Classic crossword built from a word + clue list" },
  wheel:      { label: "Wheel of Fortune",       icon: Dices,             tone: "text-purple-600 bg-purple-50", hint: "Spin for a random word prompt — low-stakes speaking warm-up" },
  wordsearch: { label: "Word Search Grid",       icon: Grid3x3,           tone: "text-emerald-600 bg-emerald-50", hint: "Find hidden words in a letter grid" },
  imagetoword:{ label: "Picture to Word Match",  icon: Image,             tone: "text-indigo-600 bg-indigo-50", hint: "Match an emoji/picture to the English word" },
  timeline:   { label: "Tense timeline",        icon: Shapes,            tone: "text-emerald-600 bg-emerald-50", hint: "Visual timeline showing when a tense is used" },
  sentence:   { label: "Colour-coded sentence", icon: Shapes,            tone: "text-emerald-600 bg-emerald-50", hint: "One colour per grammar role, applied to a real sentence" },
  preposition:{ label: "Preposition scene",     icon: MapPin,            tone: "text-sky-600 bg-sky-50",      hint: "Pick the right preposition for a pictured scene" },
  conjugation:{ label: "Conjugation wheel",     icon: RotateCw,          tone: "text-blue-600 bg-blue-50",    hint: "One verb conjugated across every tense, on a wheel" },
  conditional:{ label: "Conditional flow",      icon: GitBranch,         tone: "text-amber-600 bg-amber-50",  hint: "If/then branches for conditional sentence types" },
  comparison: { label: "Comparison ladder",     icon: TrendingUp,        tone: "text-lime-600 bg-lime-50",    hint: "Positive → comparative → superlative, side by side" },
  wordweb:    { label: "Word web",              icon: Share2,            tone: "text-fuchsia-600 bg-fuchsia-50", hint: "A central word branching into related phrases" },
  quiz:       { label: "Quiz (multiple choice)",icon: FileQuestion,      tone: "text-orange-600 bg-orange-50", hint: "Classic multiple-choice question set" },
  gapfill:    { label: "Fill the gaps",         icon: PenTool,           tone: "text-amber-600 bg-amber-50",  hint: "Type the missing word into a sentence" },
  wordformation: { label: "Word formation",     icon: Shapes,            tone: "text-indigo-600 bg-indigo-50", hint: "Transform a root word into the form a sentence needs (decide → decision)" },
  scramble:   { label: "Sentence scramble",     icon: Shuffle,           tone: "text-cyan-600 bg-cyan-50",    hint: "Unscramble jumbled sentences in the right order" },
  arrowcorrection: { label: "Arrow correction", icon: CornerDownRight,   tone: "text-rose-600 bg-rose-50",    hint: "Find the mistake in a sentence and correct it" },
  correctincorrect: { label: "Correct or incorrect", icon: CheckCheck,   tone: "text-emerald-600 bg-emerald-50", hint: "Judge whether a sentence is grammatically correct" },
  dialoguecompletion: { label: "Dialogue completion", icon: MessageSquare, tone: "text-blue-600 bg-blue-50",  hint: "Fill in the missing turns of a short dialogue" },
  speedround: { label: "Speed round",           icon: Timer,             tone: "text-red-600 bg-red-50",      hint: "Timed multiple-choice round for quick recall practice" },
  video:      { label: "Video",                 icon: Video,             tone: "text-rose-600 bg-rose-50",    hint: "A short clip with a transcript to reveal" },
  listening:  { label: "Listening",             icon: Headphones,        tone: "text-violet-600 bg-violet-50", hint: "An audio clip with a transcript to reveal" },
  youtube:    { label: "YouTube video",         icon: PlayCircle,        tone: "text-red-600 bg-red-50",      hint: "Embed a real YouTube video with your own notes" },
  scenario:   { label: "Scenario task",         icon: Briefcase,         tone: "text-teal-600 bg-teal-50",    hint: "A real-life conversation to role-play, turn by turn" },
  speakingRecord: { label: "Record & AI feedback", icon: AudioLines,     tone: "text-teal-600 bg-teal-50",    hint: "Student records an answer, gets simulated AI feedback" },
  shadowing:  { label: "Shadowing (repeat after)", icon: Repeat2,        tone: "text-cyan-600 bg-cyan-50",    hint: "Listen to a model sentence, then repeat it aloud" },
  homework:   { label: "Homework",              icon: ClipboardList,     tone: "text-slate-600 bg-slate-100", hint: "A writing prompt with a minimum sentence count" },
  upload:     { label: "File upload",           icon: FileUp,            tone: "text-slate-600 bg-slate-100", hint: "Student uploads a file (PDF/Word/etc.) for review" },
  slidedeck:  { label: "Slide deck",            icon: MonitorPlay,       tone: "text-violet-600 bg-violet-50", hint: "Embed a Google Slides, Canva or PowerPoint deck by link" },
  document:   { label: "Document (PDF/Word/Image)", icon: FileText,      tone: "text-slate-600 bg-slate-100", hint: "Embed a hosted PDF, Word doc, or image by link" },
  h5pActivity: H5P_ACTIVITY_META,
  peertask:     { label: "Group work",                icon: Handshake,     tone: "text-blue-600 bg-blue-50",     hint: "Info-gap/jigsaw for any group size, or a Kahoot-style team quiz race" },
};

// Groups COMPONENT_META into the categories a teacher actually thinks in —
// used everywhere a component kind needs to be picked, so similar-sounding
// kinds (Quiz vs. Comprehension vs. Speed round) are told apart by where
// they sit, not just by name.
export const COMPONENT_CATEGORIES = [
  { id: "text", label: "Reading & text", kinds: ["passage", "comprehension"] },
  { id: "vocab", label: "Vocabulary & games", kinds: ["wordlist", "flashcards", "match", "wordformation", "memory", "crossword", "wheel", "wordsearch", "imagetoword"] },
  { id: "grammar", label: "Grammar visuals", kinds: ["timeline", "sentence", "preposition", "conjugation", "conditional", "comparison", "wordweb"] },
  { id: "practice", label: "Practice", kinds: ["quiz", "gapfill", "scramble", "arrowcorrection", "correctincorrect", "dialoguecompletion", "speedround"] },
  { id: "speaking", label: "Speaking & pronunciation", kinds: ["scenario", "speakingRecord", "shadowing"] },
  { id: "media", label: "Media", kinds: ["video", "listening", "youtube"] },
  { id: "present", label: "Presentations & documents", kinds: ["slidedeck", "document"] },
  { id: "h5p", label: "Interactive (H5P)", kinds: ["h5pActivity"] },
  { id: "peer", label: "Peer & group work", kinds: ["peertask"] },
  { id: "homework", label: "Homework & files", kinds: ["homework", "upload"] },
];

const SAMPLE_WORDS = [
  { term: "introduce", az: "təqdim etmək", def: "to present someone or yourself", example: "Let me introduce myself." },
  { term: "colleague", az: "həmkar", def: "a person you work with", example: "She is my colleague." },
  { term: "available", az: "əlçatan", def: "free to be used or seen", example: "I'm available after lunch." },
];

// Exported so any "pick a component kind" surface — Block Studio's own
// palette, or a quick per-student task — can produce real starter content
// for that kind instead of an empty shell.
// A categorized "pick a component kind" grid — every used-count badge and
// hover style lives here once, so Block Studio's own palette and any other
// "assign a quick task" surface look and behave identically.
export function ComponentKindPicker({ kinds, usedCounts = {}, onPick }) {
  const groups = COMPONENT_CATEGORIES
    .map((cat) => ({
      id: cat.id, label: cat.label,
      items: cat.kinds.filter((k) => kinds.includes(k)).map((k) => {
        const M = COMPONENT_META[k];
        return { id: k, icon: M.icon, tone: M.tone, label: M.label, description: M.hint, used: usedCounts[k] || 0 };
      }),
    }))
    .filter((cat) => cat.items.length);
  return <CategoryPicker groups={groups} onPick={onPick} />;
}

// Playground's purely gamified kinds draw from the shared, cross-level Word
// Tower pool rather than being level-specific themselves — every other
// component kind gets a CEFR level so the picker, course tree, and My
// Blocks can all show what level a piece of content targets.
export const NO_LEVEL_KINDS = new Set(["crossword", "memory", "wheel", "wordsearch", "imagetoword", "speedround"]);

// Exported so any "pick a component kind" surface — Block Studio's own
// palette, or a quick per-student task — can produce real starter content
// for that kind instead of an empty shell.
export function defaultComponent(kind, texts = []) {
  const base = { id: cid(), kind, ...(NO_LEVEL_KINDS.has(kind) ? {} : { level: "B1" }) };
  switch (kind) {
    case "passage":    return { ...base, textId: texts[0]?.id || null };
    case "wordlist":   return { ...base, items: SAMPLE_WORDS.map((w) => ({ ...w })) };
    case "flashcards": return { ...base, items: SAMPLE_WORDS.map((w) => ({ ...w })) };
    case "match":      return { ...base, mode: "az", pairs: [
      { term: "hello", az: "salam", emoji: "👋" }, { term: "thanks", az: "təşəkkür", emoji: "🙏" },
      { term: "coffee", az: "qəhvə", emoji: "☕" }, { term: "friend", az: "dost", emoji: "🧑" },
    ] };
    case "quiz":       return { ...base, items: [
      { q: "I ___ to work every morning.", options: ["go", "goes", "going"], answer: 0, why: "“I” ilə sadə indiki zaman → go." },
    ] };
    case "gapfill":    return { ...base, items: [
      { text: "I ___ the report yesterday.", answer: "finished", why: "“yesterday” bitmiş vaxtdır → Past simple." },
      { text: "She ___ here since 2020.", answer: "has lived", why: "İndi də davam edir → Present perfect." },
    ] };
    case "wordformation": return { ...base, items: [
      { root: "decide", sentence: "The manager made a difficult ___ yesterday.", answer: "decision", pos: "noun", why: "“a difficult ___” bir isim (noun) tələb edir." },
      { root: "create", sentence: "The team is very ___ when solving problems.", answer: "creative", pos: "adjective", why: "“very ___” bir sifət (adjective) tələb edir." },
    ] };
    case "timeline":   return { ...base };
    case "sentence":   return { ...base, sentence: [
      { w: "The team", role: "subject" }, { w: "shipped", role: "verb" }, { w: "the login screen", role: "object" },
      { w: "yesterday", role: "time" }, { w: "." },
    ] };
    case "preposition": return { ...base, object: "🐈", anchor: "🗄️", subject: "the cat", place: "the cupboard",
      options: ["in", "on", "under", "next to", "behind"], answer: "on" };
    case "conjugation": return { ...base, verb: "go", tenses: {
      "Present simple": { I: "go", You: "go", "He/She/It": "goes", We: "go", They: "go" },
      "Past simple": { I: "went", You: "went", "He/She/It": "went", We: "went", They: "went" },
    } };
    case "conditional": return { ...base, type: "first", branches: [
      { condition: "It rains", result: "we will stay home" },
      { condition: "It doesn't rain", result: "we will go to the beach" },
    ] };
    case "comparison": return { ...base,
      forms: { positive: "big", comparative: "bigger", superlative: "biggest" },
      examples: { positive: "A cat is big.", comparative: "A dog is bigger.", superlative: "An elephant is the biggest." } };
    case "wordweb":    return { ...base, center: "meeting", branches: [
      { label: "schedule a meeting" }, { label: "team meeting" }, { label: "cancel a meeting" },
      { label: "attend a meeting" }, { label: "virtual meeting" }, { label: "kick-off meeting" },
    ] };
    case "memory":     return { ...base, pairs: [
      { term: "hello", az: "salam" }, { term: "thanks", az: "təşəkkür" },
      { term: "coffee", az: "qəhvə" }, { term: "friend", az: "dost" },
    ] };
    case "scramble":   return { ...base, items: [
      { sentence: "She has already finished the report.", why: "Present perfect: subject + has/have + past participle." },
      { sentence: "We are meeting the client tomorrow.", why: "Present continuous for a fixed future plan." },
    ] };
    case "arrowcorrection": return { ...base, items: [
      { wrong: "She don't like coffee.", correct: "She doesn't like coffee.", why: "Third-person singular takes “doesn't”, not “don't”." },
      { wrong: "I have saw that movie.", correct: "I have seen that movie.", why: "Present perfect uses the past participle: “seen”, not “saw”." },
    ] };
    case "correctincorrect": return { ...base, items: [
      { sentence: "He goes to work every day.", correct: true, why: "Third-person singular “goes” — correctly formed." },
      { sentence: "She have three cats.", correct: false, why: "Should be “has”, not “have”, with “she”." },
    ] };
    case "dialoguecompletion": return { ...base, title: "At the coffee machine", turns: [
      { speaker: "A", text: "Good morning! How was your weekend?" },
      { speaker: "B", text: "___", blank: true, answer: "It was great, thanks — I visited my family." },
      { speaker: "A", text: "Nice! Ready for the standup?" },
      { speaker: "B", text: "___", blank: true, answer: "Almost — let me grab a coffee first." },
    ] };
    case "speedround": return { ...base, seconds: 30, items: [
      { q: "I ___ to work every morning.", options: ["go", "goes", "going"], answer: 0, why: "" },
      { q: "She ___ here since 2020.", options: ["lives", "has lived", "lived"], answer: 1, why: "" },
      { q: "They ___ the bug yesterday.", options: ["fix", "fixed", "have fixed"], answer: 1, why: "" },
    ] };
    case "video":      return { ...base, title: "Small talk basics", duration: "2:45", transcript: "Hi, how are you? — I'm good, thanks. How was your weekend? — Really nice, I visited my family." };
    case "listening":  return { ...base, title: "At the reception", duration: "1:30", transcript: "Good morning, do you have an appointment? — Yes, at ten, with Ms. Aliyeva." };
    case "scenario":   return { ...base, situation: "You greet a colleague at the coffee machine.", turns: [
      { prompt: "Colleague: Good morning! How was your weekend?", sample: "It was great, thanks — I visited my family." },
      { prompt: "Colleague: Ready for the standup?", sample: "Almost — let me grab a coffee first." },
    ] };
    case "homework":   return { ...base, type: "essay", prompt: "Write 5 sentences introducing yourself to a new team.", minSentences: 5 };
    case "comprehension": return { ...base, mode: "multiple", passageRefId: null, items: [
      { q: "What did the speaker do yesterday?", options: ["Shipped the login screen", "Deployed the fix", "Wrote a report"], answer: 0, why: "Bax mətnə: “Yesterday I shipped the login screen.”" },
    ] };
    case "youtube":    return { ...base, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Model conversation", notes: "Watch once for gist, once for detail." };
    case "speakingRecord": return { ...base, question: "Tell me about a project you're proud of. You have one minute.", tipAz: "Aydın danış, tələsmə — fikrini tamamla." };
    case "shadowing": return { ...base, items: [
      { sentence: "I'll get back to you by the end of the day.", note: "Stress: GET back, END of day." },
      { sentence: "Could you walk me through the process?", note: "Linking: “walk-me-through”." },
    ] };
    case "upload":     return { ...base, instructions: "Upload your written report as a PDF or Word file.", accept: ".pdf,.doc,.docx" };
    case "slidedeck":  return { ...base, provider: "slides", url: "", title: "Untitled deck", notes: "" };
    case "document":   return { ...base, docKind: "pdf", url: "", title: "Untitled document", notes: "" };
    case "h5pActivity": return { ...base, ...defaultH5PActivity() };
    case "peertask": return { ...base,
      mode: "infogap", // "infogap" (any group size) | "quizrace" (Kahoot/Quizlet-Live-style team game)
      situation: "Two colleagues are planning who covers the on-call shift this weekend.",
      roles: [
        { studentId: null, prompt: "You are free Saturday but not Sunday. Convince your partner to swap." },
        { studentId: null, prompt: "You are free Sunday but not Saturday. You'd prefer not to change your plans." },
      ],
      teams: [
        { id: "team1", name: "Team Falcon", studentIds: [] },
        { id: "team2", name: "Team Comet", studentIds: [] },
        { id: "team3", name: "Team Nova", studentIds: [] },
      ],
      items: [
        { q: "Choose the correct form: She ___ here since 2020.", options: ["live", "lives", "has lived"], answer: 2 },
        { q: "Pick the polite request.", options: ["Give me the report.", "Could you send me the report?", "Report — now."], answer: 1 },
        { q: "Which sentence uses the past simple correctly?", options: ["I have finished it yesterday.", "I finished it yesterday.", "I finish it yesterday."], answer: 1 },
      ],
    };
    case "crossword":  return { ...base, items: [
      { word: "deploy", clue: "Put software onto a server" },
      { word: "release", clue: "A new version made available to users" },
      { word: "merge", clue: "Combine two branches of code" },
      { word: "ship", clue: "Send finished work to users" },
      { word: "bug", clue: "A mistake in the code" },
    ] };
    case "wheel":      return { ...base, title: "Vocabulary Wheel", items: [
      { term: "deploy", az: "yerləşdirmək", q: "What does 'deploy' mean in software?" },
      { term: "ship", az: "təhvil vermək", q: "Give an example with 'ship'." },
      { term: "blocking", az: "maneə törədən", q: "What is blocking your progress?" },
      { term: "resolved", az: "həll edildi", q: "Have you resolved the bug?" },
    ] };
    case "wordsearch": return { ...base, title: "Word Search Grid", words: ["DEPLOY", "SHIP", "RELEASE", "SOLVED", "MERGE"] };
    case "imagetoword": return { ...base, title: "Match Picture to Word", items: [
      { emoji: "☕", term: "coffee", az: "qəhvə" },
      { emoji: "🛋️", term: "cozy", az: "rahat" },
      { emoji: "🥪", term: "sandwich", az: "sendviç" },
      { emoji: "📦", term: "package", az: "bağlama" },
    ] };
    default:           return base;
  }
}

// A freshly added Block opens with its BLOCK_TYPES entry's `starter` components.
export function defaultContent(blockTypeId, texts = []) {
  const starter = BLOCK_TYPES[blockTypeId]?.starter || [];
  return { components: starter.map((k) => defaultComponent(k, texts)) };
}

// Components for a Block (content if present, else migrated / default) —
// used by the studio and by the live-lesson stage so both show the same thing.
export function blockComponents(block, texts = []) { return toComponents(block, texts).components; }

// A one-line, honest summary of one Component's actual content — no counts
// or states that aren't really tracked. Used anywhere a component needs to
// be scanned at a glance without opening it (the course tree's leaf rows).
export function componentPreview(component, texts = []) {
  const items = component.items;
  switch (component.kind) {
    case "passage": {
      const text = texts.find((t) => t.id === component.textId);
      return text ? `${text.title} · ${text.wordCount} words` : "No text linked yet";
    }
    case "wordlist": case "flashcards": case "memory":
      return `${(items || component.pairs || []).length} words`;
    case "match": return `${(component.pairs || []).length} pairs`;
    case "comprehension": {
      const modeLabel = { multiple: "multiple choice", truefalse: "true/false", matching: "matching" }[component.mode || "multiple"];
      return `${(items || []).length} item${(items || []).length === 1 ? "" : "s"} · ${modeLabel}`;
    }
    case "quiz": case "gapfill": case "wordformation": case "scramble": case "arrowcorrection": case "correctincorrect": case "speedround": case "shadowing":
      return `${(items || []).length} item${(items || []).length === 1 ? "" : "s"}`;
    case "dialoguecompletion": return `${(component.turns || []).length} turns · ${component.title || ""}`;
    case "crossword": case "wheel": case "wordsearch": case "imagetoword":
      return `${(items || component.words || []).length} words`;
    case "video": case "listening": return `${component.duration || "—"} · ${component.title || "untitled"}`;
    case "youtube": return component.title || "Untitled video";
    case "scenario": return `${(component.turns || []).length} turns · ${component.situation || ""}`;
    case "homework": {
      const type = component.type || "essay";
      if (type === "video") return "Video link submission";
      if (type === "link") return "Document/link submission";
      return `Min. ${component.minSentences || 0} sentences`;
    }
    case "upload": return component.instructions || "File upload";
    case "slidedeck": return component.url ? `${component.title || "Untitled deck"} · ${component.provider || "slides"}` : "No deck linked yet";
    case "peertask": return component.mode === "quizrace"
      ? `Team quiz race · ${(component.teams || []).length} teams · ${(component.items || []).length} questions`
      : `${(component.roles || []).length}-way info-gap${component.situation ? ` · ${component.situation}` : ""}`;
    case "speakingRecord": return component.question || "Recording prompt";
    case "timeline": case "sentence": case "preposition": case "conjugation": case "conditional": case "comparison": case "wordweb":
      return "Interactive visual";
    default: return "";
  }
}

// migrate any pre-nesting / pre-rename content shape into the components model
function toComponents(block, texts) {
  const c = block.content;
  if (c?.components) return c;
  if (!c) return defaultContent(block.type, texts);
  if (c.textId) return { components: [{ id: cid(), kind: "passage", textId: c.textId }] };
  if (c.pairs) return { components: [{ id: cid(), kind: "match", mode: c.mode || "az", pairs: c.pairs }] };
  if (c.sentence || c.kind) return { components: [c.kind === "sentence" ? { id: cid(), kind: "sentence", sentence: c.sentence || [] } : { id: cid(), kind: "timeline" }] };
  if (c.items) return { components: [{ id: cid(), kind: block.type === "vocabulary" ? "wordlist" : "gapfill", items: c.items }] };
  return defaultContent(block.type, texts);
}

/* ============================== studio shell ============================== */

export default function BlockStudio() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [mode, setMode] = useState("student");
  // Where the next component goes: null = picker closed, otherwise the
  // index it will be spliced in at. Every "+ Add component" slot in the
  // preview sets this to its own position, so a component lands exactly
  // where the teacher clicked, not always at the end.
  const [insertAt, setInsertAt] = useState(null);
  // Edit mode is a site-builder layout: the left column is always the
  // plain list of components (drag to reorder, click to select) — it never
  // turns into a settings form, so "what are the steps" has one constant
  // place to look. Editing happens on the right, in place: the selected
  // component's own frame in the live preview swaps from its rendered
  // student view to its editor, right where it sits, the way a page
  // builder's canvas block becomes editable when you click it. Selection
  // is tracked by id, not index, so it survives reordering/inserting/
  // removing without pointing at the wrong item.
  const [selectedId, setSelectedId] = useState(null);
  // Id of the component whose editor is currently expanded to fill the
  // whole viewport — a "focus mode" for content that genuinely needs the
  // room (H5P's own editor, long passages, ...). Separate from selectedId
  // so leaving fullscreen always lands back on the normal in-place frame,
  // never fully closes the editor.
  const [fullscreenId, setFullscreenId] = useState(null);
  const [dragId, setDragId] = useState(null);
  // The open H5P editor's "save what's pending" hook, registered by
  // H5PActivityEditor — at most one, since only the selected component shows
  // its editor. See flushOpenEditor below.
  const pendingSave = useRef(null);
  const registerFlush = useCallback((componentId, save) => {
    if (save) pendingSave.current = { componentId, save };
    else if (pendingSave.current?.componentId === componentId) pendingSave.current = null;
  }, []);
  // Latest "close the editor" handler, for the Escape listener below (it's
  // only re-subscribed when the selection changes, so it can't close over it).
  const closeEditorRef = useRef(null);
  const pickerOpen = insertAt !== null;
  // Bumped on every open, as the dialog's key, so each open starts fresh.
  const [pickerKey, setPickerKey] = useState(0);
  const openPicker = (at) => { setPickerKey((k) => k + 1); setInsertAt(at); };
  // The rail's own scrollable list, kept as a ref rather than relying on
  // rail-item.scrollIntoView(): that call walks every scrollable ancestor,
  // including the page itself, so scrolling the (usually already-fitting)
  // rail would also drag the page's scroll position back to wherever the
  // short rail list sits — cancelling the frame's own scrollIntoView below.
  // Scrolling this container's scrollTop directly keeps the two independent.
  const railListRef = useRef(null);
  // The sticky header's real height, measured rather than guessed: it
  // changes with the mode toggle (student vs. edit render different
  // second rows) and with viewport width (the title/toolbar row wraps on
  // narrow screens), so a fixed `top-*`/`max-h-*` on the rail below it
  // would either leave a gap or, worse, sit partly hidden behind the
  // header — which is exactly what happened when the header grew taller
  // and the rail's old fixed offset no longer matched it.
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(96);
  // headerH is just this bar's own (measured) height — it doesn't know about
  // the app shell's topbar sitting above it. Anything computing "how far
  // down is it safe to start" needs the combined offset.
  const stuckOffset = headerH + TOPBAR_H;
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // The border box, padding included — the same measurement the selection
    // effect below re-reads live. ResizeObserver's contentRect leaves the
    // padding out (~49px short), which left everything pinned under the
    // header too high, and the two measurements kept overwriting each other.
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // The step the learner is on in the student view: the last one whose top
  // has scrolled up to just under the sticky header (or the last step once
  // the page can't scroll further). Drives the outline rail's highlight.
  // The app shell's <main> is the scroll container, not the window.
  const [activeStepId, setActiveStepId] = useState(null);
  // Focus mode (student view): one activity full screen, the rest of the
  // app hidden — for projecting a single exercise to the class.
  const [focusId, setFocusId] = useState(null);
  useEffect(() => {
    if (mode !== "student") return undefined;
    const scroller = document.querySelector("main");
    if (!scroller) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const steps = [...document.querySelectorAll("[data-student-step]")];
      if (!steps.length) return;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      let current = steps[0].dataset.studentStep;
      for (const el of steps) {
        if (el.getBoundingClientRect().top - stuckOffset <= 80) current = el.dataset.studentStep;
      }
      setActiveStepId(atBottom ? steps[steps.length - 1].dataset.studentStep : current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { scroller.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [mode, stuckOffset]);
  const course = state.courses.find((c) => c.id === route.courseId);
  const lesson = (state.lessons[route.courseId] || []).find((l) => l.id === route.lessonId);
  const block = lessonBlocks(lesson).find((p) => p.id === route.partId);
  const enrolled = state.students.filter((s) => s.courseId === course?.id);
  // Group work picks from students actually assigned to THIS lesson, not
  // the whole course roster — group members should be the people doing
  // this lesson, which "enrolled but not assigned" students aren't (yet).
  const assignedToLesson = enrolled.filter((s) => (s.assignedLessons || []).includes(route.lessonId));

  useEffect(() => {
    if (block && !block.content?.components) {
      dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: block.id,
        patch: { content: toComponents(block, state.texts) } });
    }
  }, [block, route.courseId, route.lessonId, dispatch, state.texts]);

  // Selection made in one place shows up in the other: pick a row in the
  // list and the preview glides to that component; click a component in
  // the preview and the list scrolls its row into view.
  //
  // The frame uses `block: "start"`, not "nearest": a component's own
  // editor (with its level select, save/duplicate/move/delete toolbar) is
  // often taller than the viewport, and "nearest" only scrolls the minimum
  // needed — if the frame already overlapped the visible area at all, it
  // could leave that top toolbar scrolled past, out of view. "start"
  // always brings the frame's own top edge to rest just below the sticky
  // header (scrollMarginTop on the frame accounts for that header, so this
  // never lands underneath it), so selecting a component always shows it
  // from the top, not some arbitrary middle point.
  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const frameEl = document.getElementById(`frame-${selectedId}`);
    if (frameEl) {
      // Re-measure live rather than trust `headerH` state: ResizeObserver
      // fires asynchronously (next frame), so right after a render that
      // both changes the header's height AND selects a component in the
      // same tick (e.g. picking a component from "Add a component" right
      // after the kicker's "N components" count grows enough to wrap the
      // header onto an extra line), this effect can run a frame before
      // that callback catches up — scrolling against a stale, too-small
      // offset and landing the frame partly behind the header. Reading the
      // header's real height here, synchronously, can't be stale.
      const liveHeaderH = headerRef.current?.getBoundingClientRect().height ?? headerH;
      if (liveHeaderH !== headerH) setHeaderH(liveHeaderH);
      frameEl.style.scrollMarginTop = `${liveHeaderH + TOPBAR_H + 16}px`;
      frameEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const railEl = document.getElementById(`rail-${selectedId}`);
    const railList = railListRef.current;
    if (railEl && railList) {
      const top = railEl.offsetTop, bottom = top + railEl.offsetHeight;
      const viewTop = railList.scrollTop, viewBottom = viewTop + railList.clientHeight;
      if (top < viewTop) railList.scrollTo({ top, behavior: "smooth" });
      else if (bottom > viewBottom) railList.scrollTo({ top: bottom - railList.clientHeight, behavior: "smooth" });
    }
    // headerH deliberately left out: it's only read here to decide whether
    // to correct stale state, not for the scroll math itself (liveHeaderH
    // covers that) — adding it would re-run this whole effect, including
    // the scroll, every time the header resizes while a component is
    // already open, yanking the view for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mode]);

  // Escape walks back out one layer at a time: picker first, then editing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (insertAt !== null) setInsertAt(null);
      else if (selectedId !== null) closeEditorRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [insertAt, selectedId]);

  if (!block) {
    // Blocks added during a session only live in memory, so their URLs stop
    // resolving after a reload — say so instead of rendering a blank page.
    return (
      <div className="p-5 sm:p-8 max-w-3xl">
        <Alert tone="info" title="This block isn't here anymore"
          actionLabel={lesson ? "Back to the lesson" : "Back to the course"}
          onAction={() => go(lesson ? { partId: null } : { lessonId: null, partId: null })}>
          It may have been removed, or it was added before the page was reloaded — lessons aren't saved between reloads yet.
        </Alert>
      </div>
    );
  }
  const content = block.content?.components ? block.content : toComponents(block, state.texts);
  const components = content.components;
  const BT = BLOCK_TYPES[block.type]; const I = BT.icon;

  const setComponents = (next) =>
    dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: block.id, patch: { content: { ...content, components: next } } });
  const updateComponent = (i, patch) => setComponents(components.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  // Saves the open H5P editor's pending work before anything closes or
  // copies it. Resolves to the components list with that save applied — use
  // it instead of `components`, which predates the save — or null if saving
  // failed, in which case the editor stays open showing why.
  const flushOpenEditor = async () => {
    const pending = pendingSave.current;
    if (!pending) return components;
    let patch;
    try {
      patch = await pending.save();
    } catch (err) {
      toast(`Couldn't save the H5P activity: ${err.message}`, "err");
      return null;
    }
    if (!patch) return components;
    const next = components.map((c) => (c.id === pending.componentId ? { ...c, ...patch } : c));
    setComponents(next);
    return next;
  };
  const selectComponent = async (id) => {
    if (id === selectedId) return;
    if (!(await flushOpenEditor())) return;
    setSelectedId(id);
    if (id === null) setFullscreenId(null);
  };
  closeEditorRef.current = () => selectComponent(null);

  const removeComponent = (i) => {
    const removedId = components[i].id;
    discardH5PContent(toast, components[i]);
    const next = components.filter((_, j) => j !== i);
    setComponents(next);
    // Selection follows the neighbor that slides into the removed spot,
    // same as closing a tab — never left pointing at something gone.
    if (removedId === selectedId) setSelectedId(next[Math.min(i, next.length - 1)]?.id ?? null);
  };
  const moveComponent = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= components.length) return;
    const next = [...components]; [next[i], next[j]] = [next[j], next[i]]; setComponents(next);
  };
  // Drag-to-reorder for the rail — pick up one component, drop it on
  // another to swap it into that spot, the draw.io/PowerPoint way rather
  // than one-at-a-time move-up/down buttons.
  const reorderComponent = (fromId, toId) => {
    if (!fromId || fromId === toId) return;
    const from = components.findIndex((c) => c.id === fromId);
    const to = components.findIndex((c) => c.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...components];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setComponents(next);
  };
  // Splice at the slot that opened the picker (or append if it was the
  // list's own button), then select the new component — selecting it is
  // what makes its frame in the preview show its editor, so a fresh
  // component opens ready to fill in, not just added at the end unseen.
  const insertNew = async (component, label) => {
    const list = await flushOpenEditor();
    if (!list) return;
    const at = insertAt === null ? list.length : Math.min(insertAt, list.length);
    const next = [...list]; next.splice(at, 0, component);
    setComponents(next); setInsertAt(null); setSelectedId(component.id);
    toast(label);
  };
  const addComponent = (kind) => insertNew(defaultComponent(kind, state.texts), `Added ${COMPONENT_META[kind].label}`);

  const duplicateComponent = async (i) => {
    const list = await flushOpenEditor();
    if (!list) return;
    const copy = await copyWithOwnH5P(toast, list[i]);
    if (!copy) return;
    copy.id = cid();
    const next = [...list]; next.splice(i + 1, 0, copy); setComponents(next);
    setSelectedId(copy.id);
    toast("Component duplicated");
  };
  const handleSaveComponent = async (c) => {
    const list = await flushOpenEditor();
    if (!list) return;
    saveComponentToBank(dispatch, toast, list.find((x) => x.id === c.id) || c,
      `${block.title || BT.label} — ${COMPONENT_META[c.kind]?.label || c.kind}`, `${course.title} · Lesson ${lesson.n}`);
  };
  const insertSavedComponent = async (item) => {
    const copy = await copyWithOwnH5P(toast, item.data);
    if (!copy) return;
    copy.id = cid();
    insertNew(copy, `Inserted “${item.title}” from Component Library`);
  };
  const changeMode = async (next) => {
    if (next === mode) return;
    if (next === "student" && !(await flushOpenEditor())) return;
    setFocusId(null);
    setMode(next);
  };
  const saveAndClose = async () => {
    if (!(await flushOpenEditor())) return;
    toast("Block saved");
    go({ partId: null });
  };
  const jumpToStep = (id) => {
    setActiveStepId(id);
    document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const blocks = lessonBlocks(lesson);
  const blockIndex = blocks.findIndex((b) => b.id === block.id);
  // One level for every activity? Then say it once in the header instead
  // of repeating the same chip on each step (student view only — the
  // editor keeps per-step levels, since that's where they're changed).
  // Games without a level (NO_LEVEL_KINDS) never show a chip, so they
  // don't count against a shared one.
  const levels = [...new Set(components.filter((c) => c.level !== undefined).map((c) => c.level || ""))];
  const sharedLevel = levels.length === 1 && levels[0] ? levels[0] : null;
  const showOutline = components.length > 3;
  // Where a picked component will land, in words, for the picker's header.
  const kindLabel = (c) => (COMPONENT_META[c.kind] || FALLBACK_META).label;
  const pickerPosition = insertAt === null ? ""
    : !components.length ? `The first component in ${blockName(block)}`
      : insertAt >= components.length ? `Goes at the end of ${blockName(block)}, after “${kindLabel(components[components.length - 1])}”`
        : insertAt === 0 ? `Goes at the start of ${blockName(block)}, before “${kindLabel(components[0])}”`
          : `Goes between “${kindLabel(components[insertAt - 1])}” and “${kindLabel(components[insertAt])}”`;
  const focusedIndex = mode === "student" ? components.findIndex((c) => c.id === focusId) : -1;
  const closeFocus = () => {
    const id = focusId;
    setFocusId(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Back on the page at the activity that was focused.
    requestAnimationFrame(() => document.getElementById(`step-${id}`)?.scrollIntoView({ block: "start" }));
  };
  // Moving to another block of the lesson (the step flow, Previous/Next):
  // the open H5P editor saves first, and the next block opens from its top.
  const goToBlock = async (id) => {
    if (id === block.id) return;
    if (!(await flushOpenEditor())) return;
    setSelectedId(null);
    setFullscreenId(null);
    setInsertAt(null);
    setFocusId(null);
    go({ partId: id });
    document.querySelector("main")?.scrollTo({ top: 0 });
  };

  return (
    // One page width for both modes, so switching between editing and the
    // student view never shifts the page's left/right edges. The activities
    // fill that same width as the header card above them — capped at
    // max-w-7xl so nothing stretches edge to edge on a big monitor.
    <div className="p-5 sm:p-8 max-w-7xl mx-auto"
      // Extra bottom scroll room, at least one sticky-header's worth: a
      // block with only a couple of short components otherwise doesn't
      // have enough scrollable height for a component near the end to
      // ever clear the header when its own scrollMarginTop kicks in —
      // the browser just clamps the scroll at the page's real max and the
      // frame's top stays partly behind the header. Padding the bottom
      // guarantees that scroll room always exists.
      style={{ paddingBottom: stuckOffset }}>
      {/* Pinned below the app shell's own topbar, never under it — this is
          the block's identity plus the "which mode am I in" toggle and
          Save & close, all of which a teacher wants visible no matter how
          far the components list/preview below has scrolled. `-mx`/`px`
          bleeds the sticky bar's background to the same width it already
          occupies (this container is itself the horizontal-inset column,
          so no edge-to-edge trick is needed).

          Stuck at top-0 (not top-16, the topbar's own height) on purpose,
          with a plain TOPBAR_H spacer standing in for the topbar's own
          content: the topbar is translucent (bg-white/80 backdrop-blur —
          intentional everywhere else, an iOS-style frosted toolbar), and
          this page's own content is tall and strongly colored (the orange-
          bordered preview card). A sticky element only ever blocks what's
          BEHIND it for as long as its own box actually spans that space —
          if this bar started at top-16, its box would stop at y:64 and
          never cover y:0-64 at all, so once scrolled far enough the
          preview card (an ordinary, non-sticky, ever-scrolling element)
          would eventually slide its own top edge up through that gap,
          becoming the thing the topbar's blur samples — a visible orange
          "shadow" ghosting through the topbar. Extending this bar's own
          sticky box up to y:0 means it — not the scrolling card — is
          always what's directly behind the topbar.

          `-mt-16` pulls that spacer up over the space the topbar already
          takes, so before the bar sticks the title sits one page-padding
          below the topbar instead of an extra 64px lower. */}
      <div className="sticky top-0 z-20 -mt-16 -mx-5 sm:-mx-8 px-5 sm:px-8 bg-neutral-50">
        <div className="h-16" aria-hidden="true" />
        {/* Slim on purpose — only what should stay in reach while scrolling:
            moving through the lesson's blocks, and what you can do with this
            one. The block's own identity and its place in the lesson live in
            the header card below, which scrolls away. */}
        <div ref={headerRef} className="py-3 border-b border-neutral-400 flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
          <BlockFlowNav prev={blocks[blockIndex - 1]} next={blocks[blockIndex + 1]}
            onGo={goToBlock} onFinish={() => go({ partId: null })} />
          <div className="flex items-center gap-2 shrink-0">
            {mode === "edit" && (
              <Button size="sm" variant="light" className="whitespace-nowrap" onClick={saveAndClose}><IconCheck size={14} stroke={1.75} /> Save & close</Button>
            )}
            <SegmentedToggle value={mode} onChange={changeMode} options={[
              { id: "student", label: "As student", icon: IconEye },
              { id: "edit", label: "Edit content", icon: IconPencil },
            ]} />
          </div>
        </div>
      </div>

      {/* The whole block as one tinted-band card, like the rest of the
          app's subject headers (course and class cards): identity on the
          band; what the block is for and the lesson's blocks as one flow
          (this one marked, any other a click away) in the first row; the
          block's activities (or the editor) in a gray well under that. */}
      <HeaderCard sectioned className="mt-6" icon={I} iconClassName={toneText(BT.tone)} title={blockName(block)}
        kicker={`Lesson ${lesson.n} · Block ${blockIndex + 1} of ${blocks.length} · ${components.length} ${components.length === 1 ? "activity" : "activities"}${sharedLevel ? ` · Level ${sharedLevel}` : ""}`}>
        <HeaderCardSection>
          {BT.description && <Alert tone="info" icon={IconInfoCircle} title="About this block">{BT.description}</Alert>}
          <StepNav current={block.id} onSelect={goToBlock}
            steps={blocks.map((b) => ({ id: b.id, label: blockName(b) }))} />
          {mode === "edit" && (
            <div className="flex items-center gap-2 text-sm text-neutral-700">
              <IconPencil size={16} stroke={1.75} className="shrink-0" /> Click a component below to edit it in place, drag in the list to reorder, and switch to "As student" to see the result.
            </div>
          )}
        </HeaderCardSection>

        {/* The block's activities live inside the same card as its header —
            a gray well under the steps — so header and content read as one
            unit rather than a banner floating above separate cards. */}
        <HeaderCardSection well>
          {mode === "student" ? (
            // Default (stretch) row alignment on purpose: the outline's sticky
            // card needs its grid cell to span the whole row to stay pinned
            // (same reason as the edit rail below).
            <div className={`grid grid-cols-1 gap-6 ${showOutline ? "lg:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
              <div className="min-w-0">
                {components.length ? (
                  // A hairline between activities, so each reads as its own section.
                  <div className="divide-y divide-neutral-400">
                    {components.map((c) => (
                      <StudentStep key={c.id} component={c} components={components} showLevel={!sharedLevel}
                        className="py-10 first:pt-0 last:pb-0" style={{ scrollMarginTop: stuckOffset + 16 }}
                        focused={focusedIndex >= 0 && components[focusedIndex].id === c.id} onFocus={() => setFocusId(c.id)} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-neutral-600 text-sm">No components yet — switch to Edit to add some.</Card>
                )}
              </div>
              {/* A short block is visible almost in one screen — the outline
                  only earns its column once there's something to jump between. */}
              {showOutline && (
                <div className="hidden lg:block">
                  <StudentOutline components={components} activeId={activeStepId} onPick={jumpToStep}
                    style={{ top: stuckOffset + 16, maxHeight: `calc(100vh - ${stuckOffset}px - 32px)` }} />
                </div>
              )}
              {focusedIndex >= 0 && (
                <FocusBars block={block} components={components} index={focusedIndex}
                  onGo={(i) => setFocusId(components[i].id)} onClose={closeFocus} />
              )}
            </div>
          ) : (
            <div>
              {/* Site-builder layout: the left column is always the plain
                  components list — it never turns into a form, so "what are
                  the steps" has one constant answer. The right is the block's
                  live preview; click any component there and that one frame
                  (only that one) swaps to its own editor, in place. */}
              {/* `items-start` (the old setting here) sizes each grid cell to
                  its own content — fine for the preview column, but it leaves
                  the rail's cell exactly as tall as the rail itself. A sticky
                  element can only stay stuck within its own containing block
                  (its parent's box); once you scroll past a SHORT rail's short
                  cell, it runs out of room to stick and drops back into normal
                  flow, sliding back up and out from under its own sticky
                  position — visible as the rail climbing back up and getting
                  clipped by the header once you're scrolled deep into a long
                  preview column (more/taller components than the rail is
                  tall). Default (stretch) grid alignment makes the rail's OWN
                  grid cell span the full row height instead — i.e. at least as
                  tall as the preview column — giving its sticky child room to
                  stay stuck for the entire scroll. The Card itself stays a
                  plain child of that tall cell (not stretched) so it still
                  only ever looks as tall as its own content. */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
                <div>
                  {/* Pinned right under the sticky header above (top:
                      stuckOffset — headerH plus the app topbar's own height,
                      not a guessed fixed value; see headerH's and stuckOffset's
                      own comments) so the list is always fully visible, never
                      sliced by scrolling part of it behind that header. */}
                  <Card className="p-0 overflow-hidden lg:sticky flex flex-col"
                    style={{ top: stuckOffset, maxHeight: `calc(100vh - ${stuckOffset}px - 16px)` }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
                      <span className="flex items-center gap-2"><span className="text-base font-semibold text-neutral-950">Components</span><CountBadge>{components.length}</CountBadge></span>
                    </div>
                    <div ref={railListRef} className="p-3 space-y-1.5 overflow-y-auto overscroll-contain min-h-0">
                      {components.map((c, i) => {
                        const M = COMPONENT_META[c.kind] || { label: c.kind, icon: Shapes, tone: "bg-neutral-100 text-neutral-600" };
                        const linkedPassage = c.kind === "comprehension" && c.passageRefId && components.find((x) => x.id === c.passageRefId);
                        return (
                          <RailItem key={c.id} id={`rail-${c.id}`}
                            icon={M.icon} tone={M.tone} label={M.label}
                            meta={linkedPassage ? `${i + 1} · ↳ linked passage` : `Component ${i + 1}${c.level ? ` · ${c.level}` : ""}`}
                            selected={c.id === selectedId}
                            onClick={() => selectComponent(c.id)}
                            draggable
                            onDragStart={() => setDragId(c.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => { reorderComponent(dragId, c.id); setDragId(null); }}
                            onDragEnd={() => setDragId(null)}
                            className={dragId === c.id ? "opacity-40" : ""}
                          />
                        );
                      })}
                      {/* No "Add component" button here — the preview on the
                          right already has a "+" slot after every component
                          (and one at the very start/end), so a component
                          always gets added exactly where it visually lands. */}
                      {!components.length && <p className="text-xs text-neutral-500 px-1 py-2">No components yet.</p>}
                    </div>
                  </Card>
                </div>

                {/* The same gray canvas and step structure as the student view
                    (numbered heading, level, the activity's own card), so editing
                    and previewing read as one page — here each step is also a
                    click target, and the selected one shows its editor in place.
                    "+ Add component" slots sit between steps like a site
                    builder's "Add block" pills, each remembering its own
                    position, so a pick lands exactly where you clicked. */}
                <div className="min-w-0">
                  <AddSlot active={insertAt === 0} onClick={() => openPicker(0)} />
                  {components.map((c, i) => {
                    const isSel = c.id === selectedId;
                    const isFullscreen = c.id === fullscreenId;
                    const linked = isLinkedComprehension(c, components);
                    return (
                      <React.Fragment key={c.id}>
                        {/* scrollMarginTop tells scrollIntoView (below) that the
                            sticky header (plus the app topbar above it —
                            stuckOffset covers both) blocks off that much of
                            what it'd otherwise think was open viewport —
                            without it, "nearest" scrolls a step right up to
                            y:0 of the scroll container, which is actually
                            hidden behind that header, not visible at all. */}
                        <section id={`frame-${c.id}`} className="relative" style={{ scrollMarginTop: stuckOffset + 16 }}>
                          {isSel ? (
                            // Editing, in place: same heading, same position in
                            // the stack — the toolbar joins the heading row and
                            // the editor replaces the rendered activity, in a
                            // white card with the brand border so the step being
                            // edited is unmistakable. `key` remounts on selection
                            // change so the entrance plays per step.
                            //
                            // Fullscreen just swaps this SAME div's own classes
                            // to a fixed, viewport-covering overlay rather than
                            // rendering a second copy elsewhere — ComponentEditor
                            // (and anything stateful inside it, like H5P's own
                            // editor iframe) stays mounted exactly once the
                            // whole time, so toggling never resets it.
                            <div key={c.id} className={isFullscreen
                              ? "fixed inset-0 z-50 bg-neutral-200 p-5 sm:p-8 overflow-y-auto animate-fade-rise"
                              : "animate-fade-rise"}>
                              <div className={isFullscreen ? "max-w-5xl mx-auto" : ""}>
                                <StepHeading component={c} linked={linked} showLevel={false} right={
                                  <>
                                    {c.level !== undefined && (
                                      <select value={c.level || ""} onChange={(e) => updateComponent(i, { level: e.target.value })}
                                        title="Level" className="mr-1 h-8 rounded-lg border border-neutral-400 bg-white px-2 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500">
                                        {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
                                      </select>
                                    )}
                                    <StepTool title="Save component to library" onClick={() => handleSaveComponent(c)}><IconBookmarkPlus size={16} stroke={1.75} /></StepTool>
                                    <StepTool title="Duplicate" onClick={() => duplicateComponent(i)}><IconCopy size={16} stroke={1.75} /></StepTool>
                                    <StepTool title="Move up" disabled={i === 0} onClick={() => moveComponent(i, -1)}><IconArrowUp size={16} stroke={1.75} /></StepTool>
                                    <StepTool title="Move down" disabled={i === components.length - 1} onClick={() => moveComponent(i, 1)}><IconArrowDown size={16} stroke={1.75} /></StepTool>
                                    <StepTool title="Remove" danger onClick={() => { removeComponent(i); toast("Component removed"); }}><IconTrash size={16} stroke={1.75} /></StepTool>
                                    <StepTool title={isFullscreen ? "Exit fullscreen" : "Fullscreen — more room to work"} onClick={() => setFullscreenId(isFullscreen ? null : c.id)}>
                                      {isFullscreen ? <IconMinimize size={16} stroke={1.75} /> : <IconMaximize size={16} stroke={1.75} />}
                                    </StepTool>
                                    <Button size="sm" className="ml-1" onClick={() => selectComponent(null)}><IconCheck size={14} stroke={1.75} /> Done</Button>
                                  </>
                                } />
                                <div className="rounded-[14px] border-2 border-primary-500 bg-white p-4 sm:p-5 shadow-md">
                                  <ErrorBoundary resetKey={c}>
                                    <ComponentEditor component={c} onChange={(patch) => updateComponent(i, patch)} roster={assignedToLesson}
                                      passages={components.filter((x) => x.kind === "passage")} registerFlush={registerFlush} />
                                  </ErrorBoundary>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Not selected: exactly the student view's step,
                            // plus a hover ring and an "Edit" cue — click
                            // anywhere on it to edit in place.
                            <div onClick={() => selectComponent(c.id)}
                              className="group -m-3 cursor-pointer rounded-[14px] p-3 ring-2 ring-transparent transition duration-(--dur-fast) hover:bg-primary-50/60 hover:ring-primary-300">
                              <div className={linked ? "ml-6 pl-4 border-l-2 border-primary-200" : ""}>
                                <StepHeading component={c} linked={linked} right={
                                  <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100">
                                    <IconPencil size={14} stroke={1.75} /> Edit
                                  </span>
                                } />
                                <ComponentStudent component={c} />
                              </div>
                            </div>
                          )}
                        </section>
                        <AddSlot active={insertAt === i + 1} onClick={() => openPicker(i + 1)} />
                      </React.Fragment>
                    );
                  })}
                  {!components.length && (
                    <button onClick={() => openPicker(0)}
                      className="w-full rounded-[14px] border-2 border-dashed border-neutral-400 bg-white p-12 text-center text-neutral-600 hover:border-primary-300 hover:text-primary-600 transition duration-(--dur-fast)">
                      <IconStack2 size={28} stroke={1.5} className="mx-auto mb-3 text-neutral-500" />
                      <div className="text-sm font-medium">This block is empty — add your first component</div>
                    </button>
                  )}

                </div>
              </div>
            </div>
          )}
        </HeaderCardSection>
      </HeaderCard>

      {/* Remounted on each open (key) so it starts on a fresh search and on
          this block's suggestions. */}
      <ComponentPicker key={pickerKey} open={pickerOpen} onClose={() => setInsertAt(null)}
        blockLabel={BT.label} suggested={(BT.components || []).filter((k) => COMPONENT_META[k])}
        components={components} bank={state.componentBank || []} position={pickerPosition}
        onPickKind={addComponent} onPickSaved={(id) => insertSavedComponent(state.componentBank.find((b) => b.id === id))} />
    </div>
  );
}

// The "Add a component" dialog. A centered Modal (not a panel pinned inside
// the canvas) so it never half-covers the component above the slot it was
// opened from. Search runs across every kind at once; otherwise the nav
// narrows the grid to one category, starting with what this block type
// suggests.
const CATEGORY_ICON = {
  suggested: IconSparkles, library: IconBookmarks,
  text: IconBook2, vocab: IconAbc, grammar: IconTimeline, practice: IconPencil, speaking: IconMicrophone,
  media: IconPlayerPlay, present: IconPresentation, h5p: IconPuzzle, peer: IconUsersGroup, homework: IconClipboardText,
};
const TOTAL_KINDS = COMPONENT_CATEGORIES.reduce((n, cat) => n + cat.kinds.length, 0);

function ComponentPicker({ open, onClose, blockLabel, suggested, components, bank, position, onPickKind, onPickSaved }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(suggested.length ? "suggested" : COMPONENT_CATEGORIES[0].id);
  const kindItem = (k) => {
    const M = COMPONENT_META[k];
    return { id: k, icon: M.icon, tone: M.tone, label: M.label, description: M.hint, used: components.filter((c) => c.kind === k).length };
  };
  const savedItem = (item) => {
    const M = COMPONENT_META[item.kind] || { label: item.kind, tone: "bg-neutral-100 text-neutral-600", icon: Layers };
    const child = bankChildLabel(item);
    return { id: item.id, icon: M.icon, tone: M.tone, label: item.title, description: `${M.label}${child ? ` · ${child}` : ""}` };
  };
  const nav = [
    ...(suggested.length ? [{ id: "suggested", label: `Suggested for ${blockLabel}`, count: suggested.length }] : []),
    ...(bank.length ? [{ id: "library", label: "My Component Library", count: bank.length }] : []),
    ...COMPONENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, count: cat.kinds.length })),
  ];

  // Search: every kind whose name or description matches, grouped by
  // category, plus matching saved components.
  const q = query.trim().toLowerCase();
  const hits = (text) => text.toLowerCase().includes(q);
  const results = q ? [
    ...(bank.some((b) => hits(b.title || "")) ? [{ id: "library", label: "My Component Library", saved: true, items: bank.filter((b) => hits(b.title || "")).map(savedItem) }] : []),
    ...COMPONENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, items: cat.kinds.filter((k) => hits(COMPONENT_META[k].label) || hits(COMPONENT_META[k].hint || "")).map(kindItem) }))
      .filter((g) => g.items.length),
  ] : [];
  const pickFirst = () => {
    const g = results[0];
    if (!g) return;
    if (g.saved) onPickSaved(g.items[0].id); else onPickKind(g.items[0].id);
  };
  const current = nav.find((n) => n.id === category);
  const grid = "grid-cols-1 md:grid-cols-2";

  return (
    <Modal open={open} onClose={onClose} size="xl" fill bodyClassName="grid grid-cols-1 grid-rows-1 sm:grid-cols-[280px_1fr]"
      icon={IconPlus} title="Add a component" sub={position}
      headerExtra={
        <SearchField autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pickFirst()}
          placeholder={`Search all ${TOTAL_KINDS} components…`} />
      }>
      <nav className="hidden sm:block border-r border-neutral-400 p-3 space-y-0.5 overflow-y-auto overscroll-contain min-h-0" aria-label="Component categories">
        {nav.map((n) => (
          <NavItem key={n.id} icon={CATEGORY_ICON[n.id]} label={n.label} count={n.count}
            active={!q && category === n.id} onClick={() => { setQuery(""); setCategory(n.id); }} />
        ))}
      </nav>
      <div className="p-5 overflow-y-auto overscroll-contain min-h-0">
        {q ? (
          results.length ? (
            <div className="space-y-6">
              {results.map((g) => (
                <section key={g.id}>
                  <h4 className="mb-2.5 text-sm font-semibold text-neutral-950">{g.label}</h4>
                  <CategoryPickerGrid gridCols={grid} items={g.items} onPick={g.saved ? onPickSaved : onPickKind} />
                </section>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <IconSearch size={28} stroke={1.5} className="mx-auto mb-3 text-neutral-500" />
              <div className="text-sm font-semibold text-neutral-950">No components match “{query.trim()}”</div>
              <div className="text-sm text-neutral-600 mt-1">Try a broader word, or pick a category on the left.</div>
            </div>
          )
        ) : (
          <>
            {/* Phones have no room for the category list — same choice as a dropdown. */}
            <Select className="sm:hidden mb-4" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {nav.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.count})</option>)}
            </Select>
            <div className="mb-4">
              <h4 className="text-base font-semibold text-neutral-950">{current?.label}</h4>
              <p className="text-sm text-neutral-600">
                {category === "suggested" ? `The components a ${blockLabel} block is built for.`
                  : category === "library" ? "Components you saved from other lessons — inserted as independent copies."
                    : `${current?.count} ${current?.count === 1 ? "component" : "components"}`}
              </p>
            </div>
            {category === "library" ? (
              // grouped by the course/parent it was saved from, so the
              // library reads as folders instead of one flat pile
              <LibraryPickList
                groups={groupBankByParent(bank).map(({ parent, items }) => ({ id: parent, label: parent, items: items.map(savedItem) }))}
                onPick={onPickSaved} />
            ) : (
              <CategoryPickerGrid gridCols={grid} onPick={onPickKind}
                items={(category === "suggested" ? suggested : COMPONENT_CATEGORIES.find((cat) => cat.id === category)?.kinds || []).map(kindItem)} />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}


// The "+ Add component" pill between two components in the live preview —
// a site builder's "Add block" affordance. Quiet until hovered, lit when it
// is the slot the picker is currently inserting into.
function AddSlot({ active, onClick }) {
  return (
    <div className="relative flex items-center justify-center py-5 group">
      {/* Doubles as the separator between steps: a hairline, with the add
          button sitting on it. */}
      <div className={`absolute inset-x-0 top-1/2 border-t transition-colors duration-(--dur-fast) ${active ? "border-primary-300" : "border-neutral-400 group-hover:border-primary-300"}`} />
      <button onClick={onClick}
        className={`relative z-10 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-(--dur-fast) active:scale-[0.97] ${
          active ? "border-primary-400 bg-primary-50 text-primary-700" : "border-neutral-400 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-600"}`}>
        <Plus size={14} /> Add component
      </button>
    </div>
  );
}

/* ============================== component: student ============================== */

// Renders a whole Block exactly as a learner sees it (all its components).
// Shared by Block Studio's "As student" view and the live-lesson stage.
export function BlockStudentView({ block }) {
  const { state } = useStore();
  const components = blockComponents(block, state.texts);
  if (!components.length) return <Card className="p-8 text-center text-neutral-500 text-sm">No components in this block yet.</Card>;
  return (
    <div className="divide-y divide-neutral-400">
      {components.map((c) => <StudentStep key={c.id} component={c} components={components} className="py-8 first:pt-2" />)}
    </div>
  );
}

const FALLBACK_META = { label: "Activity", icon: Shapes, tone: "bg-neutral-100 text-neutral-600" };
const blockName = (b) => b.title || blockMeta(b.type).label;

// One activity as the learner meets it, laid out like the kit's assessment
// page: a numbered heading and the activity under it. Spacing between steps
// is the container's call (a gray canvas in Block Studio, hairline dividers
// on the live-lesson stage). A comprehension set tied to a passage indents
// under that passage.
// Focus mode swaps this SAME section's classes to a fixed layer between the
// focus bars (see FocusBars) instead of rendering a second copy, so whatever
// the student has already typed or picked stays put going in and out.
function StudentStep({ component, components, showLevel = true, style, className = "", focused = false, onFocus }) {
  const linked = isLinkedComprehension(component, components);
  return (
    <section id={`step-${component.id}`} data-student-step={component.id} style={style}
      className={focused ? "fixed inset-x-0 top-16 bottom-16 z-50 flex flex-col overflow-y-auto overscroll-contain bg-neutral-50 animate-fade-rise" : className}>
      {/* In focus, `my-auto` centers a short activity on screen, and a tall
          one simply scrolls from its top; the heading is dropped because the
          focus bar above already names the activity. */}
      <div className={focused ? "my-auto w-full mx-auto max-w-5xl px-5 sm:px-8 py-8 sm:py-12 xl:[zoom:1.15]" : ""}>
        <div className={linked && !focused ? "ml-6 pl-4 border-l-2 border-primary-200" : ""}>
          {!focused && (
            <StepHeading component={component} linked={linked} showLevel={showLevel}
              right={onFocus ? <FocusButton onClick={onFocus} /> : undefined} />
          )}
          <ComponentStudent component={component} />
        </div>
      </div>
    </section>
  );
}

function FocusButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} title="Focus mode — show this activity full screen"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-neutral-700 transition-colors duration-(--dur-fast) hover:bg-white hover:text-neutral-950">
      <IconMaximize size={16} stroke={1.75} /> Focus
    </button>
  );
}

// Focus mode's chrome — what the activity is and where it sits (the kit's
// dashed progress bar, one cell per activity) on top; moving between
// activities at the bottom. "Full screen" also hides the browser's own UI,
// for a projector.
function FocusBars({ block, components, index, onGo, onClose }) {
  const c = components[index];
  const M = COMPONENT_META[c.kind] || FALLBACK_META;
  const Icon = M.icon;
  const last = index === components.length - 1;
  const [isFull, setIsFull] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFull = () => {
    const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    req?.catch?.(() => {});
  };
  // Esc leaves; ← / → (also what most presentation clickers send) move
  // between activities — unless the key is going into a field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "ArrowRight" && index < components.length - 1) onGo(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onGo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, components.length, onGo, onClose]);
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[60] h-16 border-b border-neutral-400 bg-white px-5 sm:px-8 flex items-center gap-4 animate-fade-rise">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${M.tone}`}><Icon size={18} /></span>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-neutral-950">{M.label}</div>
          <div className="truncate text-xs text-neutral-600">{blockName(block)} · Activity {index + 1} of {components.length}</div>
        </div>
        <div className="hidden md:block flex-1 max-w-md mx-auto" aria-hidden="true">
          <SegmentedBar pct={((index + 1) / components.length) * 100} cells={components.length} />
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={toggleFull}>
            {isFull ? <IconMinimize size={15} stroke={1.75} /> : <IconMaximize size={15} stroke={1.75} />} {isFull ? "Exit full screen" : "Full screen"}
          </Button>
          <Button size="sm" variant="light" className="whitespace-nowrap" onClick={onClose}><IconX size={15} stroke={1.75} /> Exit focus</Button>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-[60] h-16 border-t border-neutral-400 bg-white px-5 sm:px-8 flex items-center justify-between gap-4">
        <Button size="sm" variant={index === 0 ? "disabled" : "outline"} disabled={index === 0} onClick={() => onGo(index - 1)}>
          <IconArrowLeft size={15} stroke={1.75} /> Previous
        </Button>
        <span className="hidden sm:block text-sm text-neutral-600 tabular-nums">{index + 1} / {components.length} · ← → to move · Esc to exit</span>
        {last
          ? <Button size="sm" variant="dark" onClick={onClose}><IconCheck size={15} stroke={1.75} /> Done</Button>
          : <Button size="sm" onClick={() => onGo(index + 1)}>Next <IconArrowRight size={15} stroke={1.75} /></Button>}
      </div>
    </>
  );
}

const isLinkedComprehension = (component, components) =>
  component.kind === "comprehension" && Boolean(component.passageRefId)
    && components.some((x) => x.id === component.passageRefId);

// A step's heading — the activity's type icon, name, level — shared by the
// student view and Block Studio's editor so the two always read as the same
// structure. The icon (not a number) leads, so it never competes with the
// activity's own numbered questions ("1.", "2." inside the card). `right`
// carries per-context actions (the editor's toolbar, an "Edit" cue);
// `showLevel={false}` when the level is edited in place, or shown once in
// the block header because every activity shares it.
function StepHeading({ component, linked, right, showLevel = true }) {
  const M = COMPONENT_META[component.kind] || FALLBACK_META;
  const Icon = M.icon;
  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${M.tone}`}><Icon size={18} /></span>
      <h2 className="text-xl font-semibold tracking-tight text-neutral-950">{M.label}</h2>
      {showLevel && component.level && <Badge color="outline">Level {component.level}</Badge>}
      {linked && <span className="text-xs font-medium text-primary-600">↳ for the passage above</span>}
      {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
    </div>
  );
}

// An icon-only action on a step's heading row (the editor's toolbar).
function StepTool({ title, onClick, disabled, danger, children }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-(--dur-fast) hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent ${danger ? "hover:text-warning-600" : "hover:text-neutral-950"}`}>
      {children}
    </button>
  );
}

// Previous / Next through the lesson's blocks, pinned in Block Studio's top
// bar so the lesson reads as one flow rather than separate pages. The last
// block leads back to the lesson overview.
function BlockFlowNav({ prev, next, onGo, onFinish }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {prev && (
        <Button variant="outline" size="sm" className="whitespace-nowrap" title="Previous block" onClick={() => onGo(prev.id)}>
          <IconArrowLeft size={14} stroke={1.75} /> {blockName(prev)}
        </Button>
      )}
      {next
        ? <Button size="sm" className="whitespace-nowrap" onClick={() => onGo(next.id)}>Next: {blockName(next)} <IconArrowRight size={14} stroke={1.75} /></Button>
        : <Button variant="dark" size="sm" className="whitespace-nowrap" onClick={onFinish}><IconCheck size={14} stroke={1.75} /> Back to lesson overview</Button>}
    </div>
  );
}

// The text half of a BLOCK_TYPES `tone` ("text-sky-600 bg-sky-50") — for an
// icon drawn on a white tile. Both halves already exist as literal strings in
// data.jsx, so Tailwind has generated them.
const toneText = (tone = "") => tone.split(" ").find((c) => c.startsWith("text-")) || "";

// The student view's right rail — every step at a glance, the one on screen
// highlighted, click to jump (the kit's side card: title + count badge + a
// list of rows).
function StudentOutline({ components, activeId, onPick, style }) {
  return (
    <Card className="p-4 lg:sticky flex flex-col" style={style}>
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-base font-semibold text-neutral-950">Activities</h3>
        <CountBadge>{components.length}</CountBadge>
      </div>
      <div className="space-y-1.5 overflow-y-auto overscroll-contain min-h-0">
        {components.map((c, i) => {
          const M = COMPONENT_META[c.kind] || FALLBACK_META;
          return (
            <RailItem key={c.id} grip={false} icon={M.icon} tone={M.tone}
              label={`${i + 1}. ${M.label}`} meta={c.level ? `Level ${c.level}` : undefined}
              selected={c.id === activeId} aria-current={c.id === activeId ? "step" : undefined}
              onClick={() => onPick(c.id)} />
          );
        })}
      </div>
    </Card>
  );
}

// One standard shell for every component kind's student view — every kind
// fills its column (the same width as Block Studio's header card), so a
// lesson reads as a uniform list instead of a pile of different widths.
// Individual XxxComponent functions below don't set their own max-w-*;
// Card framing itself stays per-component (most already return a Card as
// their own root) — this wrapper only owns width.
export function ComponentStudent({ component }) {
  return (
    <div className="w-full">
      <ErrorBoundary resetKey={component}>{renderComponentStudent(component)}</ErrorBoundary>
    </div>
  );
}

function renderComponentStudent(component) {
  switch (component.kind) {
    case "passage":    return <PassageComponent component={component} />;
    case "wordlist":   return <WordListComponent component={component} />;
    case "flashcards": return <FlashcardsComponent component={component} />;
    case "match":      return <MatchComponent component={component} />;
    case "quiz":       return <QuizComponent component={component} />;
    case "gapfill":    return <GapFillComponent component={component} />;
    case "wordformation": return <WordFormationComponent component={component} />;
    case "timeline":   return <Card className="p-6"><TenseTimeline /></Card>;
    case "sentence":   return <SentenceComponent component={component} />;
    case "preposition":return <Card className="p-6"><PrepositionScene {...component} /></Card>;
    case "conjugation":return <Card className="p-6 overflow-x-auto"><ConjugationWheel verb={component.verb} tenses={component.tenses} /></Card>;
    case "conditional":return <Card className="p-6"><ConditionalFlow type={component.type} branches={component.branches} /></Card>;
    case "comparison": return <Card className="p-6"><ComparisonLadder forms={component.forms} examples={component.examples} /></Card>;
    case "wordweb":    return <Card className="p-6 overflow-x-auto"><WordWeb center={component.center} branches={component.branches} /></Card>;
    case "memory":     return <MemoryComponent component={component} />;
    case "scramble":   return <ScrambleComponent component={component} />;
    case "arrowcorrection": return <ArrowCorrectionComponent component={component} />;
    case "correctincorrect": return <CorrectIncorrectComponent component={component} />;
    case "dialoguecompletion": return <DialogueCompletionComponent component={component} />;
    case "speedround": return <SpeedRoundComponent component={component} />;
    case "video":      return <MediaComponent component={component} kind="video" />;
    case "listening":  return <MediaComponent component={component} kind="listening" />;
    case "scenario":   return <ScenarioComponent component={component} />;
    case "homework":   return <HomeworkComponent component={component} />;
    case "comprehension": return <ComprehensionComponent component={component} />;
    case "youtube":    return <YoutubeComponent component={component} />;
    case "speakingRecord": return <SpeakingRecordComponent component={component} />;
    case "shadowing":  return <ShadowingComponent component={component} />;
    case "upload":     return <UploadComponent component={component} />;
    case "slidedeck":  return <SlideDeckComponent component={component} />;
    case "document":   return <DocumentComponent component={component} />;
    case "h5pActivity": return <H5PActivityComponent component={component} />;
    case "peertask":   return <PeerTaskComponent component={component} />;
    case "crossword":  return <Card className="p-5"><Crossword items={component.items} /></Card>;
    case "wheel":      return <WheelComponent component={component} />;
    case "wordsearch": return <WordSearchComponent component={component} />;
    case "imagetoword":return <ImageToWordComponent component={component} />;
    default:           return null;
  }
}

function PassageComponent({ component }) {
  const { state, toast } = useStore();
  const text = state.texts.find((t) => t.id === component.textId) || state.texts[0];
  if (!text) return <Card className="p-6 text-neutral-600 text-sm">No reading text linked. Edit to choose one.</Card>;
  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="text-lg font-semibold text-neutral-950">{text.title}</div>
        <div className="text-sm text-neutral-600">{text.topic} · {text.level} · {text.wordCount} words</div>
      </div>
      <Reader text={text} onSaveWord={() => toast("Word saved to the personal list")} />
    </Card>
  );
}

function WordListComponent({ component }) {
  const items = component.items || [];
  return (
    <Card className="divide-y divide-neutral-400">
      {items.map((w, i) => (
        <div key={i} className="p-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <b>{w.term}</b>
            <SpeakButton text={w.term} />
            {w.def && <span className="text-sm text-neutral-600">— {w.def}</span>}
          </div>
          {w.az && <div className="text-primary-600 text-sm mt-0.5">({w.az})</div>}
          {w.example && <div className="text-xs text-neutral-600 italic mt-0.5">“{w.example}”</div>}
        </div>
      ))}
      {!items.length && <div className="p-4 text-neutral-600 text-sm">No words.</div>}
    </Card>
  );
}

function FlashcardsComponent({ component }) {
  const items = component.items || [];
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!items.length) return <Card className="p-6 text-neutral-600 text-sm">No words.</Card>;
  const wd = items[i % items.length];
  return (
    <div className="">
      <div role="button" tabIndex={0} onClick={() => setFlip((f) => !f)} onKeyDown={(e) => e.key === "Enter" && setFlip((f) => !f)}
        className="w-full h-44 rounded-[14px] border border-neutral-400 bg-white flex flex-col items-center justify-center hover:border-primary-300 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 focus-visible:border-primary-500">
        {flip ? (
          <>
            {wd.def && <span className="text-base text-neutral-600 text-center px-4">{wd.def}</span>}
            <span className="text-lg font-semibold text-primary-600 mt-1">({wd.az})</span>
            {wd.example && <span className="text-sm text-neutral-600 mt-2 italic">“{wd.example}”</span>}
          </>
        ) : (
          <>
            <span className="text-2xl font-bold">{wd.term}</span>
            <SpeakButton text={wd.term} className="mt-1" />
          </>
        )}
      </div>
      <div className="flex items-center justify-between mt-3">
        <Button variant="outline" size="sm" onClick={() => { setI((i - 1 + items.length) % items.length); setFlip(false); }}>Prev</Button>
        <span className="text-sm text-neutral-600 tabular-nums">{(i % items.length) + 1} / {items.length}</span>
        <Button variant="outline" size="sm" onClick={() => { setI((i + 1) % items.length); setFlip(false); }}>Next</Button>
      </div>
      <p className="text-sm text-neutral-600 mt-2 flex items-center gap-1.5"><IconRefresh size={15} stroke={1.75} /> Tap the card to flip it.</p>
    </div>
  );
}

function MatchComponent({ component }) {
  const { toast } = useStore();
  const mode = component.mode || "az";
  const pairs = (component.pairs || []).slice(0, 5);
  if (mode === "theme") return <ThemeGroup pairs={pairs} />;
  return <MatchBoard pairs={pairs} showEmoji={mode === "picture"} pairType={component.pairType || "az"} onDone={() => toast("Matched — great work! 🎉")} />;
}

// `pairType` picks which field on the right side the term is matched
// against — plain translation, or (per the vocab exercise request)
// definition, synonym, or antonym — each stored on its own key so switching
// types in the editor never overwrites the others.
function MatchBoard({ pairs, showEmoji, pairType = "az", onDone }) {
  const rows = pairs.map((p, i) => ({ id: i, left: p.term, right: showEmoji ? p.emoji : (p[pairType] ?? p.az) }));
  const rightLabel = showEmoji ? "Picture" : (MATCH_PAIR_TYPES.find(([id]) => id === pairType) || MATCH_PAIR_TYPES[0])[1];
  return <MatchGrid rows={rows} leftLabel="Word" rightLabel={rightLabel} big={showEmoji} onDone={onDone} />;
}

// Click-to-match between two columns, shared by vocabulary Match, reading
// comprehension's "match texts" and Image → word. Either side can be picked
// first; picking the other side then checks the pair. Both columns stay
// fully legible the whole time — the left as the kit's hairline tiles, the
// right as its gray filled "answer" fields — so nothing reads as disabled.
function MatchGrid({ rows, leftLabel, rightLabel, big = false, instructions = "Pick an item in one column, then its match in the other.", onDone }) {
  const [rightOrder] = useState(() => [...rows].reverse());
  const [sel, setSel] = useState(null); // { side, id }
  const [doneL, setDoneL] = useState({});
  const [doneR, setDoneR] = useState({});
  const [miss, setMiss] = useState(null); // { left, right }
  if (!rows.length) return <EmptyActivity>No pairs added yet.</EmptyActivity>;
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const matched = Object.keys(doneL).length;

  function choose(side, id) {
    setMiss(null);
    if (!sel || sel.side === side) { setSel(sel && sel.side === side && sel.id === id ? null : { side, id }); return; }
    const left = side === "left" ? id : sel.id;
    const right = side === "right" ? id : sel.id;
    setSel(null);
    if (byId[left].right !== byId[right].right) { setMiss({ left, right }); return; }
    const nextL = { ...doneL, [left]: true };
    setDoneL(nextL); setDoneR((d) => ({ ...d, [right]: true }));
    if (Object.keys(nextL).length === rows.length && onDone) onDone();
  }
  const tileCls = (side, id) => {
    const done = side === "left" ? doneL[id] : doneR[id];
    if (done) return "border-success-500 bg-success-50 text-success-700";
    if (miss && miss[side] === id) return "border-warning-500 bg-warning-50 text-warning-700";
    if (sel && sel.side === side && sel.id === id) return "border-primary-500 bg-primary-50 text-neutral-950 ring-2 ring-primary-100";
    const inviting = sel && sel.side !== side ? "border-primary-300" : "";
    return side === "left"
      ? `${inviting || "border-neutral-400"} bg-white text-neutral-900 hover:border-primary-300`
      : `${inviting || "border-transparent"} bg-neutral-200 text-neutral-900 hover:border-primary-300`;
  };
  const tile = (side, r, label) => {
    const done = side === "left" ? doneL[r.id] : doneR[r.id];
    return (
      <button key={r.id} type="button" disabled={done} onClick={() => choose(side, r.id)} aria-pressed={!!(sel && sel.side === side && sel.id === r.id)}
        className={`w-full min-h-12 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${big && side === "right" ? "justify-center text-2xl leading-none" : "text-base font-medium"} ${tileCls(side, r.id)}`}>
        <span className="min-w-0">{label}</span>
        {done && <IconCheck size={16} stroke={2} className="shrink-0 ml-auto" />}
      </button>
    );
  };
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm text-neutral-600">{instructions}</p>
        <span className="shrink-0"><Tag color={matched === rows.length ? "success" : "neutral"}>{matched}/{rows.length} matched</Tag></span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-2">
          <div className="text-sm text-neutral-600">{leftLabel}</div>
          {rows.map((r) => tile("left", r, r.left))}
        </div>
        <div className="space-y-2">
          <div className="text-sm text-neutral-600">{rightLabel}</div>
          {rightOrder.map((r) => tile("right", r, r.right))}
        </div>
      </div>
      {miss && <div className="mt-4"><Alert tone="pending" icon={IconRefresh} title="Not a pair">Try another match — no points lost.</Alert></div>}
    </Card>
  );
}

/* ---- Wheel of Fortune — a low-stakes speaking / recall prompt ---- */
function WheelComponent({ component }) {
  const items = (component.items || []).filter((item) => item.term);
  const [selected, setSelected] = useState(null);
  const [turn, setTurn] = useState(0);
  const colors = ["#8b5cf6", "#ec4899", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1"];
  const slices = items.length ? items.map((_, i) => `${colors[i % colors.length]} ${(i * 100) / items.length}% ${((i + 1) * 100) / items.length}%`).join(", ") : "#e2e8f0 0 100%";
  const spin = () => {
    if (!items.length) return;
    const choice = Math.floor(Math.random() * items.length);
    setTurn((v) => v + 1);
    setSelected(items[choice]);
  };
  return (
    <Card className="p-6 text-center">
      <div className="text-sm text-neutral-600 mb-1">Vocabulary wheel</div>
      <h3 className="font-semibold mb-5">{component.title || "Spin for a prompt"}</h3>
      <div className="relative mx-auto w-52 h-52">
        <div className="absolute -top-1 left-1/2 -tranneutral-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-neutral-800" />
        <button onClick={spin} aria-label="Spin the vocabulary wheel" className="w-full h-full rounded-full border-8 border-white shadow-lg transition-transform duration-(--dur-deliberate) ease-soft-out" style={{ background: `conic-gradient(${slices})`, transform: `rotate(${turn * 720}deg)` }}>
          <span className="absolute inset-[35%] rounded-full bg-white shadow flex items-center justify-center text-xs font-bold text-info-700">SPIN</span>
        </button>
      </div>
      <Button className="mt-5" onClick={spin} disabled={!items.length}><Dices size={14} /> Spin the wheel</Button>
      {selected && <div className="mt-5 text-left"><Alert tone="info" icon={IconSparkles} title={selected.term}>
        <span className="font-medium">{selected.az}</span>{selected.q ? <> · {selected.q}</> : null}
      </Alert></div>}
      {!items.length && <p className="text-sm text-neutral-600 mt-4">Add at least one prompt in Edit content.</p>}
    </Card>
  );
}

function wordSearchGrid(words) {
  const clean = words.map((word) => String(word).toUpperCase().replace(/[^A-Z]/g, "")).filter(Boolean);
  const cols = Math.max(8, ...clean.map((word) => word.length));
  const rows = Math.max(8, clean.length + 2);
  const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => String.fromCharCode(65 + ((r * 7 + c * 11) % 26))));
  const targets = [];
  clean.slice(0, rows).forEach((word, r) => {
    const offset = (r * 3) % Math.max(1, cols - word.length + 1);
    [...word].forEach((letter, i) => { grid[r][offset + i] = letter; targets.push(`${r}-${offset + i}`); });
  });
  return { grid, targets: new Set(targets), words: clean };
}

/* ---- Word search — classic visual scanning and spelling practice ---- */
function WordSearchComponent({ component }) {
  const puzzle = useMemo(() => wordSearchGrid(component.words || []), [component.words]);
  const [picked, setPicked] = useState(new Set());
  const toggle = (key) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const solved = puzzle.targets.size > 0 && [...puzzle.targets].every((key) => picked.has(key));
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4"><div><div className="text-sm text-neutral-600">Word search</div><h3 className="font-semibold">{component.title || "Find the hidden words"}</h3></div><Tag color={solved ? "success" : "neutral"}>{picked.size}/{puzzle.targets.size} letters</Tag></div>
      {puzzle.words.length ? <>
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${puzzle.grid[0].length}, minmax(0, 1fr))` }}>
          {puzzle.grid.flatMap((row, r) => row.map((letter, c) => {
            const key = `${r}-${c}`; const active = picked.has(key);
            return <button key={key} onClick={() => toggle(key)} className={`w-8 h-8 rounded text-xs font-bold transition-colors ${active ? "bg-success-500 text-white" : "bg-neutral-100 hover:bg-success-100 text-neutral-700"}`}>{letter}</button>;
          }))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">{puzzle.words.map((word) => <Tag key={word}>{word}</Tag>)}</div>
        {solved && <div className="mt-4"><Alert tone="success" icon={IconCheck} title="All found">Every target letter is found — great spelling practice.</Alert></div>}
      </> : <p className="text-sm text-neutral-600">Add words in Edit content to build the grid.</p>}
    </Card>
  );
}

function ImageToWordComponent({ component }) {
  const rows = (component.items || []).map((p, i) => ({ id: i, left: p.term, right: p.emoji }));
  return <MatchGrid rows={rows} leftLabel="Word" rightLabel="Picture" big instructions="Match every picture to its English word." />;
}

function ThemeGroup({ pairs }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {["Greetings", "Objects"].map((theme, ti) => (
        <Card key={theme} className="p-5">
          <div className="text-sm text-neutral-600 mb-2">{theme}</div>
          <div className="flex flex-wrap gap-1.5">
            {pairs.filter((_, i) => i % 2 === ti).map((p) => <Tag key={p.term}>{p.term}</Tag>)}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SentenceComponent({ component }) {
  return (
    <Card className="p-6">
      <div className="mb-3"><RoleLegend /></div>
      <ColorSentence tokens={component.sentence || []} />
      <p className="text-sm text-neutral-600 mt-3">Same colour, same grammar role — everywhere in the app.</p>
    </Card>
  );
}

function QuizComponent({ component }) {
  const items = component.items || [];
  if (!items.length) return <EmptyActivity>No questions added yet.</EmptyActivity>;
  return <QuestionList>{items.map((it, i) => <QuizQ key={i} item={it} n={i + 1} />)}</QuestionList>;
}
const CHOICE_LETTERS = "ABCDEFGHIJ";
// Review colors for a picked answer: the right one turns green, a wrong
// pick red, the rest step back.
const choiceState = (value, pick, answer) => (pick == null ? "idle" : value === answer ? "correct" : value === pick ? "wrong" : "dimmed");

// Feedback under an answered question — a miss is "pending" (amber, retry
// icon), never red: the app encourages rather than punishes.
function AnswerFeedback({ ok, okTitle = "Düzdür! Correct.", missTitle = "Not quite", actionLabel, onAction, className = "mt-4", children }) {
  return (
    <div className={className}>
      <Alert tone={ok ? "success" : "pending"} icon={ok ? IconCheck : IconRefresh} title={ok ? okTitle : missTitle} actionLabel={actionLabel} onAction={onAction}>{children}</Alert>
    </div>
  );
}

function EmptyActivity({ children }) {
  return <Card className="p-6 text-sm text-neutral-600">{children}</Card>;
}

function QuizQ({ item, n }) {
  const [pick, setPick] = useState(null);
  return (
    <QuestionItem n={n} prompt={item.q} answerLabel="Choose one answer">
      <div className="grid gap-2 md:grid-cols-2">
        {item.options.map((o, oi) => (
          <ChoiceOption key={oi} marker={CHOICE_LETTERS[oi]} state={choiceState(oi, pick, item.answer)} onClick={() => setPick(oi)}>{o}</ChoiceOption>
        ))}
      </div>
      {pick != null && <AnswerFeedback ok={pick === item.answer} missTitle="Not quite — pick again">{item.why}</AnswerFeedback>}
    </QuestionItem>
  );
}

/* ---- Reading comprehension — checked against a linked passage, in
   whichever question format the teacher picks. "multiple" reuses the plain
   Quiz UI; "truefalse"/"matching" get their own renderer below. ---- */
function ComprehensionComponent({ component }) {
  const mode = component.mode || "multiple";
  const items = component.items || [];
  if (mode === "truefalse") {
    if (!items.length) return <EmptyActivity>No statements added yet.</EmptyActivity>;
    return <QuestionList>{items.map((it, i) => <TrueFalseQ key={i} item={it} n={i + 1} />)}</QuestionList>;
  }
  if (mode === "matching") return <ComprehensionMatch pairs={items} />;
  return <QuizComponent component={component} />;
}
// A two-answer question (True/False, Correct/Incorrect) — same review
// colors as a multiple-choice option, laid out side by side.
function BinaryChoice({ value, answer, labels, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[true, false].map((v) => (
        <ChoiceOption key={String(v)} state={choiceState(v, value, answer)} onClick={() => onPick(v)}>{v ? labels[0] : labels[1]}</ChoiceOption>
      ))}
    </div>
  );
}
function TrueFalseQ({ item, n }) {
  const [pick, setPick] = useState(null); // true | false | null
  return (
    <QuestionItem n={n} prompt={item.statement} answerLabel="True or false?">
      <BinaryChoice value={pick} answer={item.answer} labels={["True", "False"]} onPick={setPick} />
      {pick != null && <AnswerFeedback ok={pick === item.answer}>{item.why}</AnswerFeedback>}
    </QuestionItem>
  );
}
// "Match texts" — pair a statement/question with the excerpt from the
// passage that answers it, over the same MatchGrid as vocabulary Match.
function ComprehensionMatch({ pairs }) {
  const { toast } = useStore();
  const rows = (pairs || []).filter((p) => p.left && p.right).slice(0, 6).map((p, i) => ({ id: i, left: p.left, right: p.right }));
  return <MatchGrid rows={rows} leftLabel="Statement" rightLabel="From the text" instructions="Pick a statement, then the line from the text that answers it." onDone={() => toast("Matched — great reading! 🎉")} />;
}

// An inline blank inside a sentence — the kit's gray filled field, shrunk
// to word size, taking the field error/success colors once checked (and the
// info color when "Show answers" filled it in).
const GAP_STATE = {
  idle: "bg-neutral-200 border-transparent focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
  ok: "bg-success-50 border-success-500 text-success-700",
  miss: "bg-warning-50 border-warning-500 text-warning-700",
  shown: "bg-info-50 border-info-500 text-info-700",
};
function GapSentence({ text, value, onChange, state = "idle", disabled = false, width = "w-32" }) {
  return (text || "").split("___").map((seg, i, arr) => (
    <React.Fragment key={i}>{seg}{i < arr.length - 1 && (
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…" aria-label="Your answer" disabled={disabled}
        className={`inline-block ${width} mx-1 h-9 rounded-lg border px-2 text-base font-medium text-center align-middle outline-none transition-colors disabled:opacity-100 ${GAP_STATE[state]}`} />
    )}</React.Fragment>
  ));
}

// Answers checked all at once for a whole activity (Gap fill, Word
// formation, Scramble). Each item's answer lives here, so one footer can
// score them together, clear only the wrong ones for another try, or fill in
// the right answers — instead of a Check button under every question.
function useActivityCheck(items, isRight, answerOf) {
  const [values, setValues] = useState({});
  const [checked, setChecked] = useState(false);
  const [shown, setShown] = useState(null); // indices "Show answers" filled in
  const results = items.map((it, i) => isRight(it, values[i]));
  return {
    values, checked, results,
    correct: results.filter(Boolean).length,
    revealed: shown !== null,
    set: (i, v) => setValues((s) => ({ ...s, [i]: v })),
    check: () => setChecked(true),
    retry: () => { setValues((s) => Object.fromEntries(Object.entries(s).filter(([i]) => results[i]))); setChecked(false); },
    reveal: () => {
      setShown(new Set(results.flatMap((ok, i) => (ok ? [] : [i]))));
      setValues(Object.fromEntries(items.map((it, i) => [i, answerOf(it)])));
    },
    reset: () => { setValues({}); setChecked(false); setShown(null); },
    stateOf: (i) => (!checked ? "idle" : shown?.has(i) ? "shown" : results[i] ? "ok" : "miss"),
  };
}
const normAnswer = (x) => (x || "").trim().toLowerCase();

// The line under a checked item: a nudge when it's wrong (the item's own
// "why", never the answer — that would spoil "Try again"), or the answer
// once "Show answers" filled it in.
function itemNote(state, item, answer) {
  if (state === "miss") return <ItemNote icon={IconRefresh} iconCls="text-pending-600">{item.why || "Not quite — have another look."}</ItemNote>;
  if (state === "shown") return <ItemNote icon={IconEye} iconCls="text-info-600">Answer: <b>{answer}</b>{item.why ? <> · {item.why}</> : null}</ItemNote>;
  return null;
}
function ItemNote({ icon: Icon, iconCls, children }) {
  return <p className="flex items-start gap-2 text-sm text-neutral-700"><Icon size={16} stroke={1.75} className={`shrink-0 mt-0.5 ${iconCls}`} /><span>{children}</span></p>;
}
function CheckFooter({ a, total, canCheck, hint }) {
  return <QuestionFooter checked={a.checked} correct={a.correct} total={total} revealed={a.revealed} canCheck={canCheck} hint={hint}
    onCheck={a.check} onRetry={a.retry} onReveal={a.reveal} onReset={a.reset} />;
}

function GapFillComponent({ component }) {
  const items = component.items || [];
  const a = useActivityCheck(items, (it, v) => normAnswer(v) === normAnswer(it.answer), (it) => it.answer);
  if (!items.length) return <EmptyActivity>No sentences added yet.</EmptyActivity>;
  return (
    <QuestionList>
      {items.map((it, i) => (
        <QuestionItem key={i} n={i + 1} prompt={<GapSentence text={it.text} value={a.values[i] || ""} onChange={(v) => a.set(i, v)} state={a.stateOf(i)} disabled={a.checked} />}>
          {itemNote(a.stateOf(i), it, it.answer)}
        </QuestionItem>
      ))}
      <CheckFooter a={a} total={items.length} canCheck={Object.values(a.values).some((v) => v?.trim())} hint="Fill in the gaps, then check them all at once." />
    </QuestionList>
  );
}

/* ---- Word formation — transform a root word into the part of speech a
   sentence needs (decide → decision), distinct from Gap fill's plain recall:
   the root is given, so the check is specifically about word-building. ---- */
function WordFormationComponent({ component }) {
  const items = component.items || [];
  const a = useActivityCheck(items, (it, v) => normAnswer(v) === normAnswer(it.answer), (it) => it.answer);
  if (!items.length) return <EmptyActivity>No sentences added yet.</EmptyActivity>;
  return (
    <QuestionList>
      {items.map((it, i) => (
        <QuestionItem key={i} n={i + 1}
          prompt={<GapSentence text={it.sentence} value={a.values[i] || ""} onChange={(v) => a.set(i, v)} state={a.stateOf(i)} disabled={a.checked} width="w-36" />}
          answerLabel={<span className="inline-flex flex-wrap items-center gap-2">Form the right word from <Tag color="primary">{it.root}</Tag>{it.pos && <span>→ {it.pos}</span>}</span>}>
          {itemNote(a.stateOf(i), it, it.answer)}
        </QuestionItem>
      ))}
      <CheckFooter a={a} total={items.length} canCheck={Object.values(a.values).some((v) => v?.trim())} hint="Form each word, then check them all at once." />
    </QuestionList>
  );
}

function MediaComponent({ component, kind }) {
  const [replays, setReplays] = useState(0);
  const [showT, setShowT] = useState(false);
  return (
    <div className="">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-neutral-900 flex items-center justify-center relative">
          <button onClick={() => setReplays((r) => r + 1)} className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-neutral-900">
            {kind === "video" ? <Play size={26} className="ml-1" /> : <Volume2 size={26} />}
          </button>
          <span className="absolute bottom-3 right-3 text-xs font-medium text-white/80 tabular-nums">{component.duration}</span>
        </div>
        <div className="p-4">
          <div className="font-semibold">{component.title}</div>
          <div className="text-xs text-neutral-600 mt-0.5">{kind === "video" ? "Subtitled" : `Audio · replays: ${replays}`}</div>
          <button onClick={() => setShowT((s) => !s)} className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-flex items-center gap-1">{showT ? "Hide" : "Show"} transcript <ChevronRight size={13} className={showT ? "rotate-90 transition-transform" : "transition-transform"} /></button>
          {showT && <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{component.transcript}</p>}
        </div>
      </Card>
    </div>
  );
}

// A prompt authored as "Colleague: Good morning!" shows the speaker as the
// bubble's caption instead of inline text.
function splitSpeaker(line) {
  const m = /^([^:]{1,24}):\s*(.+)$/s.exec(line || "");
  return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: null, text: line || "" };
}

// Laid out as the kit's Chat screen: the situation on top, then the
// exchange on a gray panel — the other person's lines as white bubbles,
// the student's sample replies as orange ones, revealed turn by turn.
function ScenarioComponent({ component }) {
  const [revealed, setRevealed] = useState({});
  const turns = component.turns || [];
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      {component.situation && <Alert tone="info" icon={IconMessageCircle} title="Real situation">{component.situation}</Alert>}
      {turns.length ? (
        <ChatPanel>
          {turns.map((t, i) => {
            const { speaker, text } = splitSpeaker(t.prompt);
            return (
              <React.Fragment key={i}>
                <MessageBubble from="them" meta={speaker}>{text}</MessageBubble>
                {revealed[i] ? <MessageBubble from="me" meta="You · sample reply">{t.sample}</MessageBubble> : (
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}>
                      <IconMessageCircle size={15} stroke={1.75} /> Your turn — show a sample reply
                    </Button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </ChatPanel>
      ) : <p className="text-sm text-neutral-600">No turns added yet.</p>}
      <p className="flex items-center gap-1.5 text-sm text-neutral-600"><IconInfoCircle size={16} stroke={1.75} className="shrink-0" /> Say your reply out loud first — speaking is practised with your teacher, and the app never grades speech.</p>
    </Card>
  );
}

// Homework comes in three shapes — an essay written in-app, a video link
// (e.g. a recorded speaking task), or a link to an external resource (a
// completed Google Doc/Form). File uploads stay their own separate "upload"
// component kind rather than a fourth homework type, since that's a
// genuinely different submission mechanic (a file, not a URL/text).
function HomeworkComponent({ component }) {
  const type = component.type || "essay";
  if (type === "video") return <HomeworkLinkComponent component={component} icon={Video} placeholder="Paste your video link (YouTube, Drive, Loom…)" />;
  if (type === "link") return <HomeworkLinkComponent component={component} icon={FileUp} placeholder="Paste your document/form link" />;
  return <HomeworkEssayComponent component={component} />;
}
// Homework follows the kit's Assessment page: the task as the question, a
// muted "Answer" caption, the gray filled field, then the submit row.
function SubmittedTag({ children = "Sent — waiting for review" }) {
  return <Tag color="pending">{children}</Tag>;
}
function HomeworkEssayComponent({ component }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const count = text.trim() ? text.trim().split(/[.!?]+/).filter((x) => x.trim()).length : 0;
  const min = component.minSentences || 0;
  return (
    <Card>
      <QuestionItem prompt={component.prompt} answerLabel="Answer">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} disabled={sent} className="h-32" placeholder="Write here…" />
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className={`text-sm tabular-nums ${count >= min ? "text-success-600" : "text-neutral-600"}`}>{count}/{min} sentences</span>
          {sent ? <SubmittedTag /> : <Button size="sm" disabled={count < min} onClick={() => setSent(true)}><IconSend size={15} stroke={1.75} /> Submit</Button>}
        </div>
      </QuestionItem>
    </Card>
  );
}
function HomeworkLinkComponent({ component, icon: Icon, placeholder }) {
  const [url, setUrl] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <Card>
      <QuestionItem prompt={component.prompt} answerLabel="Your link">
        {component.resourceUrl && (
          <a href={component.resourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1.5 mb-3">
            <Icon size={14} /> Open the resource
          </a>
        )}
        <TextField value={url} onChange={(e) => setUrl(e.target.value)} disabled={sent} placeholder={placeholder} />
        <div className="flex justify-end mt-3">
          {sent ? <SubmittedTag /> : <Button size="sm" disabled={!url.trim()} onClick={() => setSent(true)}><IconSend size={15} stroke={1.75} /> Submit</Button>}
        </div>
      </QuestionItem>
    </Card>
  );
}

function extractYoutubeId(url) {
  if (!url) return null;
  for (const p of [/[?&]v=([^&]+)/, /youtu\.be\/([^?&]+)/, /embed\/([^?&]+)/]) {
    const m = url.match(p); if (m) return m[1];
  }
  return null;
}

/* ---- YouTube video — embeddable in Reading, Listening or Speaking blocks ---- */
function YoutubeComponent({ component }) {
  const id = extractYoutubeId(component.url);
  return (
    <div className="">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-neutral-900">
          {id ? (
            <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title={component.title || "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">Add a YouTube link to preview it here</div>
          )}
        </div>
        <div className="p-4">
          <div className="font-semibold">{component.title || "YouTube video"}</div>
          {component.notes && <div className="text-xs text-neutral-600 mt-0.5">{component.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

const SLIDE_PROVIDER_LABEL = { slides: "Google Slides", canva: "Canva", pptx: "PowerPoint", other: "Deck" };

/* ---- Slide deck — Google Slides / Canva / PowerPoint, embedded by link.
   Bring the visual explainer teachers already build elsewhere into the
   lesson itself, instead of sharing a separate file. ---- */
function SlideDeckComponent({ component }) {
  return (
    <div className="">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-neutral-100">
          {component.url ? (
            <iframe className="w-full h-full" src={component.url} title={component.title || "Slide deck"} allowFullScreen loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-600 text-sm">
              <MonitorPlay size={22} />
              No deck linked yet — add an embed link in Edit content.
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{component.title || "Untitled deck"}</span>
            <Tag color="info">{SLIDE_PROVIDER_LABEL[component.provider] || "Deck"}</Tag>
          </div>
          {component.notes && <div className="text-xs text-neutral-600 mt-0.5">{component.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

const DOC_KIND_LABEL = { image: "Image", pdf: "PDF", docx: "Word document" };

/* ---- Document — a hosted PDF, Word file or image, embedded by link. Docx
   goes through Office's online viewer since browsers can't render it
   natively and this app has no file storage of its own to convert it. ---- */
function DocumentComponent({ component }) {
  const kind = component.docKind || "pdf";
  const url = component.url;
  const officeSrc = url ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}` : "";
  return (
    <div className="">
      <Card className="p-0 overflow-hidden">
        <div className={kind === "image" ? "bg-neutral-100" : "aspect-video bg-neutral-100"}>
          {!url ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-600 text-sm py-10">
              <FileText size={22} />
              No file linked yet — add a link in Edit content.
            </div>
          ) : kind === "image" ? (
            <img src={url} alt={component.title || "Image"} className="w-full h-auto" />
          ) : kind === "pdf" ? (
            <iframe className="w-full h-full" src={url} title={component.title || "PDF"} loading="lazy" />
          ) : (
            <iframe className="w-full h-full" src={officeSrc} title={component.title || "Document"} loading="lazy" />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{component.title || "Untitled document"}</span>
            <Tag>{DOC_KIND_LABEL[kind] || "Document"}</Tag>
          </div>
          {component.notes && <div className="text-xs text-neutral-600 mt-0.5">{component.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

/* ---- Peer task — a role-play/info-gap built for two students, each seeing
   only their own side. Distinct from Scenario (solo, teacher-facing sample
   replies) and from whole-class content. ---- */
// Group work has two distinct mechanics under one Block — pick per component:
// an info-gap/jigsaw for any number of roles (classic ESL pair/group work,
// generalized beyond two), or a Kahoot/Quizlet-Live-style team quiz race.
function PeerTaskComponent({ component }) {
  return component.mode === "quizrace" ? <TeamQuizRace component={component} /> : <InfoGapTask component={component} />;
}

function InfoGapTask({ component }) {
  const { state } = useStore();
  const roles = component.roles?.length ? component.roles : [{ studentId: null, prompt: "" }, { studentId: null, prompt: "" }];
  const [view, setView] = useState(0);
  const role = roles[Math.min(view, roles.length - 1)];
  const nameFor = (r) => state.students.find((s) => s.id === r?.studentId)?.name || "Unassigned role";
  return (
    <div className="">
      <Alert tone="info" icon={IconUsers} title={`Info-gap — split across ${roles.length} student${roles.length === 1 ? "" : "s"}`}>{component.situation}</Alert>
      <div className="flex gap-2 mt-4 mb-3 flex-wrap">
        {roles.map((r, i) => (
          <button key={i} onClick={() => setView(i)} className={`text-sm font-semibold rounded-lg px-3 py-1.5 border ${view === i ? "border-primary-400 bg-primary-50 text-primary-700" : "border-neutral-400 text-neutral-600"}`}>{nameFor(r)}</button>
        ))}
      </div>
      <Card className="p-5">
        <div className="text-sm text-neutral-600 mb-2">{nameFor(role)} sees only this</div>
        <p className="text-sm text-neutral-700">{role?.prompt}</p>
      </Card>
      <p className="text-xs text-neutral-600 mt-3">When grouped for real, each student only ever sees their own role — this toggle is just for you to preview all {roles.length}.</p>
    </div>
  );
}

// A Kahoot / Quizlet Live-style team race — any number of teams, each with
// real assigned students, speed + accuracy both score points. There's no
// live multiplayer backend here, so each round is simulated (weighted-random
// per team) for preview — the point is the format, not a real connection.
function TeamQuizRace({ component }) {
  const { state } = useStore();
  const teams = component.teams?.length ? component.teams : [{ id: "a", name: "Team A", studentIds: [] }, { id: "b", name: "Team B", studentIds: [] }];
  const items = component.items || [];
  const [gameState, setGameState] = useState("idle"); // idle | playing | revealed | done
  const [qi, setQi] = useState(0);
  const [scores, setScores] = useState({});
  const [roundResult, setRoundResult] = useState(null);

  const memberNames = (t) => (t.studentIds || []).map((id) => state.students.find((s) => s.id === id)?.name.split(" ")[0]).filter(Boolean).join(", ");

  function start() { setScores(Object.fromEntries(teams.map((t) => [t.id, 0]))); setQi(0); setGameState("playing"); }
  function revealRound() {
    const result = {};
    teams.forEach((t) => {
      const correct = Math.random() < 0.72;
      const ms = Math.round(1500 + Math.random() * 5000);
      result[t.id] = { correct, ms, points: correct ? Math.max(100, Math.round(1000 - ms / 7)) : 0 };
    });
    setRoundResult(result);
    setScores((s) => { const next = { ...s }; teams.forEach((t) => { next[t.id] = (next[t.id] || 0) + result[t.id].points; }); return next; });
    setGameState("revealed");
  }
  function next() {
    if (qi + 1 >= items.length) { setGameState("done"); return; }
    setQi((i) => i + 1); setRoundResult(null); setGameState("playing");
  }

  if (!items.length || teams.length < 2) return <Card className="p-6 text-sm text-neutral-600">Add at least 2 teams and 1 question to enable the race.</Card>;

  if (gameState === "idle") {
    return (
      <Card className="p-6 text-center">
        <Trophy size={28} className="mx-auto text-pending-500 mb-2" />
        <div className="font-semibold mb-1">Team quiz race · {teams.length} teams</div>
        <p className="text-sm text-neutral-600 mb-4">Kahoot / Quizlet-Live style — teams race to answer, speed and accuracy both score points.</p>
        <div className="text-left space-y-1 mb-4">
          {teams.map((t) => (
            <div key={t.id} className="text-xs text-neutral-600"><b className="text-neutral-700">{t.name}</b>{memberNames(t) ? ` — ${memberNames(t)}` : " — no students assigned yet"}</div>
          ))}
        </div>
        <Button onClick={start}><Trophy size={14} /> Start race</Button>
      </Card>
    );
  }

  if (gameState === "done") {
    const ranked = teams.slice().sort((a, b) => scores[b.id] - scores[a.id]);
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4"><Trophy size={20} className="text-pending-500" /><span className="font-semibold">Final leaderboard</span></div>
        {ranked.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3 py-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-pending-400 text-white" : "bg-neutral-100 text-neutral-600"}`}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{t.name}</div>
              {memberNames(t) && <div className="text-xs text-neutral-600 truncate">{memberNames(t)}</div>}
            </div>
            <span className="text-sm font-semibold tabular-nums">{scores[t.id]} pts</span>
          </div>
        ))}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setGameState("idle")}><RotateCcw size={13} /> Play again</Button>
      </Card>
    );
  }

  const item = items[qi];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm tabular-nums text-neutral-600">
        <span>Question {qi + 1} of {items.length}</span>
        <span>{teams.length} teams racing</span>
      </div>
      <Card className="p-5">
        <div className="text-base font-medium mb-3">{item.q}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {item.options.map((o, oi) => (
            <div key={oi} className={`rounded-lg border p-3 text-sm ${gameState === "revealed" && oi === item.answer ? "border-success-300 bg-success-50 text-success-700" : "border-neutral-400"}`}>{o}</div>
          ))}
        </div>
      </Card>
      {gameState === "playing" && <Button onClick={revealRound}><Sparkles size={14} /> Reveal — simulate all teams answering</Button>}
      {gameState === "revealed" && (
        <>
          <Card className="p-4 divide-y divide-neutral-400">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  {memberNames(t) && <div className="text-xs text-neutral-600 truncate">{memberNames(t)}</div>}
                </div>
                <Tag color={roundResult[t.id].correct ? "success" : "warning"}>{roundResult[t.id].correct ? "Correct" : "Missed"}</Tag>
                <span className="text-sm tabular-nums text-neutral-600 w-14 text-right">{(roundResult[t.id].ms / 1000).toFixed(1)}s</span>
                <span className="text-sm font-semibold tabular-nums w-14 text-right">+{roundResult[t.id].points}</span>
              </div>
            ))}
          </Card>
          <div className="flex flex-wrap gap-2">
            {teams.slice().sort((a, b) => scores[b.id] - scores[a.id]).map((t, i) => (
              <Tag key={t.id} color={i === 0 ? "pending" : "neutral"}>{i === 0 && "👑 "}{t.name} · {scores[t.id]}</Tag>
            ))}
          </div>
          <Button onClick={next}>{qi + 1 >= items.length ? "See final leaderboard" : "Next question"} <ArrowRight size={14} /></Button>
        </>
      )}
    </div>
  );
}

/* ---- Speaking: record a real answer, get simulated AI feedback ---- */
function SpeakingRecordComponent({ component }) {
  const [state, setState] = useState("idle"); // idle | recording | analyzing | done
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state !== "recording") return;
    const id = setTimeout(() => setSeconds((s) => s + 1), 1000);
    return () => clearTimeout(id);
  }, [state, seconds]);

  function start() { setSeconds(0); setState("recording"); }
  function stop() { setState("analyzing"); setTimeout(() => setState("done"), 1400); }
  function again() { setSeconds(0); setState("idle"); }

  return (
    <Card className="p-5 sm:p-6">
      <div className="text-sm text-neutral-600 mb-1">Record your answer · AI feedback</div>
      <div className="text-lg font-semibold text-neutral-950 leading-snug mb-2">{component.question}</div>
      {component.tipAz && (
        <div className="flex items-start gap-2 mb-4 text-sm text-neutral-700">
          <IconBulb size={16} stroke={1.75} className="shrink-0 mt-0.5 text-pending-600" />
          <span>{component.tipAz}</span>
        </div>
      )}

      {state === "idle" && <Button onClick={start}><Mic2 size={14} /> Start recording</Button>}

      {state === "recording" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning-500" /></span>
            <span className="text-sm font-semibold tabular-nums text-warning-600">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
          </div>
          <div className="flex items-end gap-0.5 h-8 mb-3">
            {Array.from({ length: 40 }).map((_, i) => <span key={i} className="flex-1 bg-warning-300 rounded-full" style={{ height: `${20 + Math.abs(Math.sin(i * 1.3 + seconds)) * 80}%` }} />)}
          </div>
          <Button className="!bg-warning-600 !text-white hover:!bg-warning-700" onClick={stop}>Stop & analyze</Button>
        </div>
      )}

      {state === "analyzing" && <div className="flex items-center gap-2 text-sm text-neutral-700"><IconSparkles size={16} stroke={1.75} className="text-info-600" /> AI is analyzing your speech…</div>}

      {state === "done" && (
        <div>
          <Alert tone="info" icon={IconSparkles} title="AI feedback">
            Good pace and clear structure — you covered the situation, action and result. Watch: “the project which I lead” → say “which I led” (past tense, since it's finished). Fluency: 7.5/10. Try adding one more concrete detail next time.
          </Alert>
          <Button variant="outline" size="sm" className="mt-3" onClick={again}><RotateCcw size={13} /> Record again</Button>
        </div>
      )}
    </Card>
  );
}

/* ---- Shadowing — listen to a model sentence, repeat it immediately ---- */
function ShadowingComponent({ component }) {
  const items = component.items || [];
  if (!items.length) return <EmptyActivity>No sentences added yet.</EmptyActivity>;
  return <QuestionList>{items.map((it, i) => <ShadowItem key={i} item={it} n={i + 1} />)}</QuestionList>;
}
function ShadowItem({ item, n }) {
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  function playModel() { setPlaying(true); setTimeout(() => setPlaying(false), 1200); }
  function recordRepeat() { setRecording(true); setTimeout(() => { setRecording(false); setRecorded(true); }, 1400); }
  return (
    <QuestionItem n={n} prompt={<>“{item.sentence}”</>}>
      {item.note && (
        <div className="flex items-start gap-2 mb-3 text-sm text-neutral-700">
          <IconBulb size={16} stroke={1.75} className="shrink-0 mt-0.5 text-pending-600" />
          <span>{item.note}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={playModel} disabled={playing}><IconVolume size={15} stroke={1.75} /> {playing ? "Playing…" : "Play model"}</Button>
        <Button size="sm" onClick={recordRepeat} disabled={recording}><IconMicrophone size={15} stroke={1.75} /> {recording ? "Listening…" : "Repeat it"}</Button>
      </div>
      {recorded && <AnswerFeedback ok okTitle="Nice shadowing">Rhythm and stress matched closely.</AnswerFeedback>}
    </QuestionItem>
  );
}

/* ---- File upload — homework submitted as a file, not typed text ---- */
function UploadComponent({ component }) {
  const [file, setFile] = useState(null);
  const [sent, setSent] = useState(false);
  const accept = (component.accept || "").split(",").map((x) => x.trim().replace(/^\./, "").toUpperCase()).filter(Boolean).join(", ");
  return (
    <Card>
      <QuestionItem prompt={component.instructions} answerLabel="Answer">
        {!sent ? (
          <>
            {/* The kit's "Add File (ZIP, RAR)*" control: a full-width white
                button with the hairline border. */}
            <label className={`h-12 flex items-center justify-center gap-2 rounded-lg border border-neutral-400 bg-white px-4 text-sm font-medium text-neutral-900 hover:border-primary-300 hover:text-primary-700 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary-100 ${PRESS}`}>
              <IconFilePlus size={18} stroke={1.75} className="shrink-0" />
              <span className="truncate">{file ? file.name : `Add file${accept ? ` (${accept})` : ""}`}</span>
              <input type="file" accept={component.accept} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <div className="flex justify-end mt-3"><Button size="sm" disabled={!file} onClick={() => setSent(true)}><IconSend size={15} stroke={1.75} /> Submit</Button></div>
          </>
        ) : <SubmittedTag>“{file?.name}” sent — waiting for review</SubmittedTag>}
      </QuestionItem>
    </Card>
  );
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---- Memory match — flip-card concentration game ---- */
function MemoryComponent({ component }) {
  const pairs = component.pairs || [];
  const [cards] = useState(() => shuffled(pairs.flatMap((p, i) => [
    { id: `${i}t`, pairId: i, text: p.term }, { id: `${i}a`, pairId: i, text: p.az },
  ])));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState({});
  const [moves, setMoves] = useState(0);

  function flip(card) {
    if (flipped.length === 2 || flipped.some((c) => c.id === card.id) || matched[card.pairId]) return;
    const next = [...flipped, card];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      if (next[0].pairId === next[1].pairId) {
        setTimeout(() => { setMatched((m) => ({ ...m, [next[0].pairId]: true })); setFlipped([]); }, 350);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  }
  const done = Object.keys(matched).length === pairs.length && pairs.length > 0;

  return (
    <div className="">
      <div className="flex items-center justify-between mb-3 text-sm text-neutral-600">
        <span>{Object.keys(matched).length}/{pairs.length} pairs found</span>
        <span className="tabular-nums">{moves} moves</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {cards.map((c) => {
          const isFlipped = flipped.some((f) => f.id === c.id) || matched[c.pairId];
          return (
            <button key={c.id} onClick={() => flip(c)} disabled={isFlipped}
              className={`h-16 rounded-xl border text-xs font-semibold flex items-center justify-center text-center px-1.5 transition duration-(--dur-fast) ${
                matched[c.pairId] ? "border-success-300 bg-success-50 text-success-700" : isFlipped ? "border-pink-300 bg-pink-50 text-pink-700" : "border-neutral-400 bg-neutral-800 text-neutral-800 hover:border-pink-300"}`}>
              {isFlipped ? c.text : ""}
            </button>
          );
        })}
      </div>
      {done && <div className="mt-4"><Alert tone="success" icon={IconTrophy} title="All pairs matched">Done in {moves} moves — great memory! 🎉</Alert></div>}
    </div>
  );
}

/* ---- Sentence scramble — tap word chips into the right order ---- */
const scrambleWords = (item) => item.sentence.replace(/[.!?]$/, "").split(" ");
function ScrambleComponent({ component }) {
  const items = component.items || [];
  const a = useActivityCheck(items,
    (it, built) => (built || []).map((b) => b.w).join(" ") === scrambleWords(it).join(" "),
    (it) => scrambleWords(it).map((w, id) => ({ id, w })));
  if (!items.length) return <EmptyActivity>No sentences added yet.</EmptyActivity>;
  return (
    <QuestionList>
      {items.map((it, i) => <ScrambleItem key={i} item={it} n={i + 1} built={a.values[i] || []} onChange={(v) => a.set(i, v)} state={a.stateOf(i)} />)}
      <CheckFooter a={a} total={items.length} canCheck={Object.values(a.values).some((v) => v?.length)} hint="Build each sentence, then check them all at once." />
    </QuestionList>
  );
}
const SCRAMBLE_ROW = {
  idle: "border-transparent bg-neutral-200",
  ok: "border-success-500 bg-success-50",
  miss: "border-warning-500 bg-warning-50",
  shown: "border-info-500 bg-info-50",
};
function ScrambleItem({ item, n, built, onChange, state }) {
  const words = scrambleWords(item);
  const [pool] = useState(() => shuffled(words.map((w, i) => ({ id: i, w }))));
  const locked = state !== "idle";
  const remaining = pool.filter((p) => !built.some((b) => b.id === p.id));
  return (
    <QuestionItem n={n} prompt="Put the words in order" answerLabel="Your sentence">
      {/* The answer row reads as the kit's filled answer field; the word
          chips placed into it take the brand tint. */}
      <div className={`min-h-12 rounded-lg border p-2 flex flex-wrap gap-2 ${SCRAMBLE_ROW[state]}`}>
        {built.map((b) => (
          <button key={b.id} disabled={locked} onClick={() => onChange(built.filter((x) => x.id !== b.id))}
            className={`text-base font-medium rounded-lg px-3 py-1.5 border border-primary-200 bg-primary-50 text-primary-700 enabled:hover:bg-primary-100 ${PRESS}`}>{b.w}</button>
        ))}
        {!built.length && <span className="text-base text-neutral-600 px-1 py-1.5">Tap the words below to build the sentence…</span>}
      </div>
      {!locked && (remaining.length > 0 || built.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {remaining.map((p) => (
            <button key={p.id} onClick={() => onChange([...built, p])}
              className={`text-base font-medium rounded-lg px-3 py-1.5 border border-neutral-400 bg-white text-neutral-900 hover:border-primary-300 hover:text-primary-700 ${PRESS}`}>{p.w}</button>
          ))}
          {built.length > 0 && (
            <button onClick={() => onChange([])} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-950">
              <IconRefresh size={15} stroke={1.75} /> Clear
            </button>
          )}
        </div>
      )}
      {(state === "miss" || state === "shown") && <div className="mt-3">{itemNote(state, item, item.sentence)}</div>}
    </QuestionItem>
  );
}

/* ---- Arrow correction — a wrong sentence with the fixed form revealed on
   demand, one arrow from wrong to right. Distinct from Gap fill: the whole
   sentence is wrong, not one missing word. ---- */
function ArrowCorrectionComponent({ component }) {
  const items = component.items || [];
  if (!items.length) return <EmptyActivity>No sentences added yet.</EmptyActivity>;
  return <QuestionList>{items.map((it, i) => <ArrowCorrectionItem key={i} item={it} n={i + 1} />)}</QuestionList>;
}
function ArrowCorrectionItem({ item, n }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <QuestionItem n={n} prompt={item.wrong} aside={<Tag color="warning">Has a mistake</Tag>}
      answerLabel={revealed ? "Correction" : "Fix it in your head, then check"}>
      {!revealed ? (
        <Button size="sm" onClick={() => setRevealed(true)}><IconCornerDownRight size={15} stroke={1.75} /> Show correction</Button>
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-3.5 py-3 text-success-700">
            <IconCornerDownRight size={18} stroke={1.75} className="shrink-0 mt-0.5" />
            <span className="text-base font-medium">{item.correct}</span>
          </div>
          {item.why && <p className="text-sm text-neutral-600 mt-2">{item.why}</p>}
        </>
      )}
    </QuestionItem>
  );
}

/* ---- Correct or incorrect — a binary grammaticality judgment, distinct
   from Practice's multi-option quiz. ---- */
function CorrectIncorrectComponent({ component }) {
  const items = component.items || [];
  if (!items.length) return <EmptyActivity>No sentences added yet.</EmptyActivity>;
  return <QuestionList>{items.map((it, i) => <CorrectIncorrectItem key={i} item={it} n={i + 1} />)}</QuestionList>;
}
function CorrectIncorrectItem({ item, n }) {
  const [pick, setPick] = useState(null); // true | false | null
  return (
    <QuestionItem n={n} prompt={item.sentence} answerLabel="Is this sentence correct?">
      <BinaryChoice value={pick} answer={item.correct} labels={["Correct", "Incorrect"]} onPick={setPick} />
      {pick != null && <AnswerFeedback ok={pick === item.correct}>{item.why}</AnswerFeedback>}
    </QuestionItem>
  );
}

/* ---- Dialogue completion — fill in the missing turns of a short exchange,
   each blank checked against the authored answer. ---- */
function DialogueCompletionComponent({ component }) {
  const turns = component.turns || [];
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  // The speaker whose lines are blanked out is the student — their side of
  // the chat sits on the right, like the kit's outgoing messages.
  const me = (turns.find((t) => t.blank) || {}).speaker;
  const norm = (x) => (x || "").trim().toLowerCase();
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div>
        {component.title && <div className="text-lg font-semibold text-neutral-950">{component.title}</div>}
        <p className="text-sm text-neutral-600 mt-0.5">Type the missing lines{me ? ` for speaker ${me}` : ""}, then check each one against a model answer.</p>
      </div>
      {turns.length ? (
        <ChatPanel>
          {turns.map((t, i) => {
            const side = t.speaker === me ? "me" : "them";
            if (!t.blank) return <MessageBubble key={i} from={side} meta={`Speaker ${t.speaker}`}>{t.text}</MessageBubble>;
            if (checked[i]) {
              const exact = norm(answers[i]) === norm(t.answer);
              return (
                <div key={i} className="space-y-1.5">
                  <MessageBubble from="me" meta={exact ? "You · matches the model answer" : "You"}>{answers[i]}</MessageBubble>
                  <div className="flex justify-end items-center gap-3 text-xs text-neutral-700">
                    {!exact && <span>Model answer: “{t.answer}”</span>}
                    <button onClick={() => setChecked((c) => ({ ...c, [i]: false }))} className="font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex justify-end">
                <div className="w-full sm:max-w-[70%] flex gap-2">
                  <input value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && answers[i]?.trim() && setChecked((c) => ({ ...c, [i]: true }))}
                    placeholder={`Type ${t.speaker}'s line…`} aria-label={`Speaker ${t.speaker}'s line`}
                    className="flex-1 min-w-0 h-10 rounded-lg border border-primary-300 bg-white px-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  <Button size="sm" onClick={() => setChecked((c) => ({ ...c, [i]: true }))} disabled={!answers[i]?.trim()}>Check</Button>
                </div>
              </div>
            );
          })}
        </ChatPanel>
      ) : <p className="text-sm text-neutral-600">No dialogue added yet.</p>}
    </Card>
  );
}

/* ---- Speed round — timed quiz blitz, encourage-don't-punish scoring ---- */
function SpeedRoundComponent({ component }) {
  const seconds = component.seconds || 30;
  const items = component.items || [];
  const [state, setState] = useState("idle"); // idle | running | done
  const [time, setTime] = useState(seconds);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // 'ok' | 'no'

  useEffect(() => {
    if (state !== "running") return;
    if (time <= 0) { setState("done"); return; }
    const id = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [state, time]);

  function start() { setState("running"); setTime(seconds); setQi(0); setScore(0); }
  function answer(oi) {
    const correct = oi === items[qi % items.length].answer;
    setFlash(correct ? "ok" : "no");
    if (correct) setScore((s) => s + 10);
    setTimeout(() => { setFlash(null); setQi((i) => i + 1); }, 450);
  }

  if (!items.length) return <EmptyActivity>Add at least one question to enable the speed round.</EmptyActivity>;
  if (state === "idle") {
    return (
      <Card className="p-6 text-center">
        <Timer size={28} className="mx-auto text-warning-500 mb-2" />
        <div className="font-semibold mb-1">{seconds}-second speed round</div>
        <p className="text-sm text-neutral-600 mb-4">Answer as many as you can. No penalty for a miss — just keep going.</p>
        <Button onClick={start}>Start</Button>
      </Card>
    );
  }
  if (state === "done") {
    return (
      <Card className="p-6 text-center">
        <Trophy size={28} className="mx-auto text-pending-500 mb-2" />
        <div className="text-3xl font-bold tabular-nums mb-1">{score}</div>
        <p className="text-sm text-neutral-600 mb-4">points — nice pace! Try again to beat it.</p>
        <Button onClick={start}><RotateCcw size={14} /> Play again</Button>
      </Card>
    );
  }
  const q = items[qi % items.length];
  return (
    <Card className={`p-5 transition-colors ${flash === "ok" ? "border-success-300 bg-success-50/40" : flash === "no" ? "border-warning-300 bg-warning-50/40" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <Tag color="warning">{time}s left</Tag>
        <span className="text-sm font-semibold tabular-nums text-neutral-700">{score} pts</span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mb-4"><div className="h-full w-full origin-left bg-warning-400 transition-transform duration-(--dur-base) ease-soft-out" style={{ transform: `scaleX(${(time / seconds)})` }} /></div>
      <div className="text-lg font-semibold mb-3">{q.q}</div>
      <div className="space-y-2">
        {q.options.map((o, oi) => <ChoiceOption key={oi} marker={CHOICE_LETTERS[oi]} onClick={() => answer(oi)}>{o}</ChoiceOption>)}
      </div>
    </Card>
  );
}

/* ============================== component: editors ============================== */

const ROLE_KEYS = ["", ...Object.keys(ROLE)];

function ComponentEditor({ component, onChange, roster, passages = [], registerFlush }) {
  switch (component.kind) {
    case "passage":    return <PassageEditor component={component} onChange={onChange} />;
    case "wordlist":   return <RowsEditor component={component} onChange={onChange} fields={[["term", "Word"], ["az", "Azerbaijani"], ["def", "Definition"], ["example", "Example"]]} blank={{ term: "", az: "", def: "", example: "" }} label="word" wide={["def", "example"]} />;
    case "flashcards": return <RowsEditor component={component} onChange={onChange} fields={[["term", "Front (word)"], ["az", "Back (Azerbaijani)"], ["example", "Example"]]} blank={{ term: "", az: "", example: "" }} label="card" wide={["example"]} />;
    case "match":      return <MatchEditor component={component} onChange={onChange} />;
    case "quiz":       return <QuizEditor component={component} onChange={onChange} />;
    case "gapfill":    return <RowsEditor component={component} onChange={onChange} fields={[["text", "Sentence (use ___ for the gap)"], ["answer", "Answer"], ["why", "Why (Azerbaijani)"]]} blank={{ text: "", answer: "", why: "" }} label="item" wide={["text", "why"]} />;
    case "wordformation": return <RowsEditor component={component} onChange={onChange} fields={[["root", "Root word"], ["sentence", "Sentence (use ___ for the gap)"], ["answer", "Answer"], ["pos", "Target part of speech"], ["why", "Why (Azerbaijani)"]]} blank={{ root: "", sentence: "", answer: "", pos: "", why: "" }} label="item" wide={["sentence", "why"]} />;
    case "timeline":   return <Alert tone="info" icon={IconInfoCircle}>The tense timeline is a ready interactive component — no setup. Switch to “As student” to try it.</Alert>;
    case "sentence":   return <SentenceEditor component={component} onChange={onChange} />;
    case "preposition":return <PrepositionEditor component={component} onChange={onChange} />;
    case "conjugation":return <ConjugationEditor component={component} onChange={onChange} />;
    case "conditional":return <ConditionalEditor component={component} onChange={onChange} />;
    case "comparison": return <ComparisonEditor component={component} onChange={onChange} />;
    case "wordweb":    return <WordWebEditor component={component} onChange={onChange} />;
    case "memory":     return <MemoryEditor component={component} onChange={onChange} />;
    case "scramble":   return <RowsEditor component={component} onChange={onChange} fields={[["sentence", "Correct sentence"], ["why", "Why (Azerbaijani) — optional"]]} blank={{ sentence: "", why: "" }} label="sentence" wide={["sentence", "why"]} />;
    case "arrowcorrection": return <RowsEditor component={component} onChange={onChange} fields={[["wrong", "Wrong sentence"], ["correct", "Corrected sentence"], ["why", "Why (Azerbaijani) — optional"]]} blank={{ wrong: "", correct: "", why: "" }} label="sentence" wide={["wrong", "correct", "why"]} />;
    case "correctincorrect": return <CorrectIncorrectEditor component={component} onChange={onChange} />;
    case "dialoguecompletion": return <DialogueCompletionEditor component={component} onChange={onChange} />;
    case "speedround": return <SpeedRoundEditor component={component} onChange={onChange} />;
    case "video":      return <MediaEditor component={component} onChange={onChange} />;
    case "listening":  return <MediaEditor component={component} onChange={onChange} />;
    case "scenario":   return <ScenarioEditor component={component} onChange={onChange} />;
    case "homework":   return <HomeworkEditor component={component} onChange={onChange} />;
    case "comprehension": return <ComprehensionEditor component={component} onChange={onChange} passages={passages} />;
    case "youtube":    return <YoutubeEditor component={component} onChange={onChange} />;
    case "slidedeck":  return <SlideDeckEditor component={component} onChange={onChange} />;
    case "document":   return <DocumentEditor component={component} onChange={onChange} />;
    case "h5pActivity": return <H5PActivityEditor component={component} onChange={onChange} registerFlush={registerFlush} />;
    case "peertask":   return <PeerTaskEditor component={component} onChange={onChange} roster={roster} />;
    case "speakingRecord": return <SpeakingRecordEditor component={component} onChange={onChange} />;
    case "shadowing":  return <RowsEditor component={component} onChange={onChange} fields={[["sentence", "Sentence"], ["note", "Note (stress / linking) — optional"]]} blank={{ sentence: "", note: "" }} label="sentence" wide={["sentence", "note"]} />;
    case "upload":     return <UploadEditor component={component} onChange={onChange} />;
    case "crossword":  return <RowsEditor component={component} onChange={onChange} fields={[["word", "Word (letters only)"], ["clue", "Clue"]]} blank={{ word: "", clue: "" }} label="word" wide={["clue"]} />;
    case "wheel":      return <WheelEditor component={component} onChange={onChange} />;
    case "wordsearch": return <WordSearchEditor component={component} onChange={onChange} />;
    case "imagetoword":return <RowsEditor component={component} onChange={onChange} fields={[["emoji", "Emoji / picture"], ["term", "English word"], ["az", "Azerbaijani"]]} blank={{ emoji: "🧩", term: "", az: "" }} label="picture" />;
    default:           return null;
  }
}

function WheelEditor({ component, onChange }) {
  return <div className="space-y-3"><Field label="Activity title"><input className={inputCls} value={component.title || ""} onChange={(e) => onChange({ title: e.target.value })} /></Field><RowsEditor component={component} onChange={onChange} fields={[["term", "Word"], ["az", "Azerbaijani"], ["q", "Prompt / question"]]} blank={{ term: "", az: "", q: "" }} label="wheel prompt" wide={["q"]} /></div>;
}

function WordSearchEditor({ component, onChange }) {
  return <div className="space-y-3"><Field label="Activity title"><input className={inputCls} value={component.title || ""} onChange={(e) => onChange({ title: e.target.value })} /></Field><Field label="Words (one per line or comma separated)"><textarea className={`${inputCls} h-28 resize-none`} value={(component.words || []).join("\n")} onChange={(e) => onChange({ words: e.target.value.split(/[\n,]/).map((word) => word.trim()).filter(Boolean) })} /></Field><p className="text-xs text-neutral-400">Letters only work best; the grid rebuilds from these words.</p></div>;
}

function PassageEditor({ component, onChange }) {
  const { state } = useStore();
  return (
    <Field label="Reading text (from Library)">
      <select className={inputCls} value={component.textId || ""} onChange={(e) => onChange({ textId: e.target.value })}>
        {state.texts.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.topic} · {t.level}</option>)}
      </select>
    </Field>
  );
}

// generic rows-of-fields editor
function RowsEditor({ component, onChange, fields, blank, label, wide = [] }) {
  const items = component.items || [];
  const setItem = (i, k, v) => onChange({ items: items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-600">#{i + 1}</span>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(([k, lbl]) => (
              <label key={k} className={`block ${wide.includes(k) ? "sm:col-span-2" : ""}`}>
                <span className="text-xs font-semibold text-neutral-600">{lbl}</span>
                <input className={`${inputCls} mt-1`} value={it[k] || ""} onChange={(e) => setItem(i, k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ items: [...items, { ...blank }] })}><Plus size={14} /> Add {label}</Button>
    </div>
  );
}

const MATCH_PAIR_TYPES = [["az", "Translation"], ["def", "Definition"], ["synonym", "Synonym"], ["antonym", "Antonym"]];

function MatchEditor({ component, onChange }) {
  const pairs = component.pairs || [];
  const mode = component.mode || "az";
  const pairType = component.pairType || "az";
  const setPair = (i, k, v) => onChange({ pairs: pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {[["az", "Word → Azerbaijani"], ["picture", "Word → picture"], ["theme", "Group by theme"]].map(([id, lbl]) => (
          <button key={id} onClick={() => onChange({ mode: id })} className={`text-sm rounded-lg px-3 py-1.5 border ${mode === id ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{lbl}</button>
        ))}
      </div>
      {mode === "az" && (
        <div className="flex gap-2 flex-wrap">
          {MATCH_PAIR_TYPES.map(([id, lbl]) => (
            <button key={id} onClick={() => onChange({ pairType: id })} className={`text-xs rounded-lg px-2.5 py-1 border ${pairType === id ? "border-primary-300 bg-primary-50/60 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{lbl}</button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_3.5rem_auto] items-center gap-3">
            <input className={inputCls} value={p.term} onChange={(e) => setPair(i, "term", e.target.value)} placeholder="word" />
            <input className={inputCls} value={p[pairType] || ""} onChange={(e) => setPair(i, pairType, e.target.value)}
              placeholder={(MATCH_PAIR_TYPES.find(([id]) => id === pairType) || MATCH_PAIR_TYPES[0])[1].toLowerCase()} />
            <input className={`${inputCls} text-center px-1`} value={p.emoji} onChange={(e) => setPair(i, "emoji", e.target.value)} placeholder="🙂" />
            <button onClick={() => onChange({ pairs: pairs.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ pairs: [...pairs, { term: "", az: "", emoji: "🙂" }] })}><Plus size={14} /> Add pair</Button>
      </div>
    </div>
  );
}

function SentenceEditor({ component, onChange }) {
  const tokens = component.sentence || [];
  const setTok = (i, k, v) => onChange({ sentence: tokens.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  return (
    <div className="space-y-3">
      <RoleLegend />
      <div className="space-y-2">
        {tokens.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_10rem_auto] items-center gap-3">
            <input className={inputCls} value={t.w} onChange={(e) => setTok(i, "w", e.target.value)} placeholder="word / phrase" />
            <select className={inputCls} value={t.role || ""} onChange={(e) => setTok(i, "role", e.target.value)}>
              {ROLE_KEYS.map((r) => <option key={r} value={r}>{r ? ROLE[r].label : "— no colour —"}</option>)}
            </select>
            <button onClick={() => onChange({ sentence: tokens.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ sentence: [...tokens, { w: "", role: "" }] })}><Plus size={14} /> Add word</Button>
      </div>
      <div><div className="text-xs font-semibold text-neutral-600 mb-1.5">Live preview</div><div className="rounded-xl border border-neutral-100 p-3"><ColorSentence tokens={tokens} /></div></div>
    </div>
  );
}

function QuizEditor({ component, onChange }) {
  const items = component.items || [];
  const setItem = (i, patch) => onChange({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-600">Q{i + 1}</span>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button></div>
          <input className={`${inputCls} mb-2`} value={it.q} onChange={(e) => setItem(i, { q: e.target.value })} placeholder="Question" />
          <div className="space-y-1.5 mb-2">
            {it.options.map((o, oi) => (
              <div key={oi} className="grid grid-cols-[auto_1fr] items-center gap-2">
                <button onClick={() => setItem(i, { answer: oi })} className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${it.answer === oi ? "bg-success-500 border-success-500 text-white" : "border-neutral-300"}`}>{it.answer === oi && <Check size={12} />}</button>
                <input className={inputCls} value={o} onChange={(e) => setItem(i, { options: it.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
              </div>
            ))}
            <button onClick={() => setItem(i, { options: [...it.options, ""] })} className="text-xs text-primary-600 hover:text-primary-700 ml-7"><Plus size={12} className="inline" /> option</button>
          </div>
          <input className={inputCls} value={it.why} onChange={(e) => setItem(i, { why: e.target.value })} placeholder="Why (Azerbaijani) — feedback" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ items: [...items, { q: "", options: ["", "", ""], answer: 0, why: "" }] })}><Plus size={14} /> Add question</Button>
      <p className="text-xs text-neutral-400">Tap the circle to mark the correct answer. Feedback shows immediately, in Azerbaijani.</p>
    </div>
  );
}

const COMPREHENSION_MODES = [["multiple", "Multiple choice"], ["truefalse", "True / False"], ["matching", "Match texts"]];

function ComprehensionEditor({ component, onChange, passages = [] }) {
  const { state } = useStore();
  const mode = component.mode || "multiple";
  const passageTitle = (p) => state.texts.find((t) => t.id === p.textId)?.title || "Untitled passage";
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {COMPREHENSION_MODES.map(([id, lbl]) => (
          <button key={id} onClick={() => onChange({ mode: id })} className={`text-sm rounded-lg px-3 py-1.5 border ${mode === id ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{lbl}</button>
        ))}
      </div>
      <Field label="Linked passage (optional)">
        <select className={inputCls} value={component.passageRefId || ""} onChange={(e) => onChange({ passageRefId: e.target.value || null })}>
          <option value="">No specific passage</option>
          {passages.map((p) => <option key={p.id} value={p.id}>{passageTitle(p)}</option>)}
        </select>
        <p className="text-xs text-neutral-400 mt-1.5">Links this check to a passage already in this block — shown nested under it in the course tree.</p>
      </Field>
      {mode === "multiple" && <QuizEditor component={component} onChange={onChange} />}
      {mode === "truefalse" && <TrueFalseEditor component={component} onChange={onChange} />}
      {mode === "matching" && <RowsEditor component={component} onChange={onChange}
        fields={[["left", "Statement / question"], ["right", "Answer from the text"]]} blank={{ left: "", right: "" }} label="pair" wide={["left", "right"]} />}
    </div>
  );
}

function TrueFalseEditor({ component, onChange }) {
  const items = component.items || [];
  const setItem = (i, patch) => onChange({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-600">#{i + 1}</span>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button></div>
          <label className="block mb-2"><span className="text-xs font-semibold text-neutral-600">Statement</span>
            <input className={`${inputCls} mt-1`} value={it.statement || ""} onChange={(e) => setItem(i, { statement: e.target.value })} /></label>
          <div className="flex gap-2 mb-2">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setItem(i, { answer: v })}
                className={`flex-1 text-sm rounded-lg px-3 py-1.5 border ${it.answer === v ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{v ? "True" : "False"}</button>
            ))}
          </div>
          <label className="block"><span className="text-xs font-semibold text-neutral-600">Why (Azerbaijani) — optional</span>
            <input className={`${inputCls} mt-1`} value={it.why || ""} onChange={(e) => setItem(i, { why: e.target.value })} /></label>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ items: [...items, { statement: "", answer: true, why: "" }] })}><Plus size={14} /> Add statement</Button>
    </div>
  );
}

function CorrectIncorrectEditor({ component, onChange }) {
  const items = component.items || [];
  const setItem = (i, patch) => onChange({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-600">#{i + 1}</span>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button></div>
          <label className="block mb-2"><span className="text-xs font-semibold text-neutral-600">Sentence</span>
            <input className={`${inputCls} mt-1`} value={it.sentence || ""} onChange={(e) => setItem(i, { sentence: e.target.value })} /></label>
          <div className="flex gap-2 mb-2">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setItem(i, { correct: v })}
                className={`flex-1 text-sm rounded-lg px-3 py-1.5 border ${it.correct === v ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{v ? "Correct" : "Incorrect"}</button>
            ))}
          </div>
          <label className="block"><span className="text-xs font-semibold text-neutral-600">Why (Azerbaijani) — optional</span>
            <input className={`${inputCls} mt-1`} value={it.why || ""} onChange={(e) => setItem(i, { why: e.target.value })} /></label>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ items: [...items, { sentence: "", correct: true, why: "" }] })}><Plus size={14} /> Add sentence</Button>
    </div>
  );
}

function DialogueCompletionEditor({ component, onChange }) {
  const turns = component.turns || [];
  const setTurn = (i, patch) => onChange({ turns: turns.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  return (
    <div className="space-y-3">
      <Field label="Dialogue title"><input className={inputCls} value={component.title || ""} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      {turns.map((t, i) => (
        <div key={i} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-600">Turn {i + 1}</span>
            <button onClick={() => onChange({ turns: turns.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2 mb-2">
            <input className={inputCls} value={t.speaker || ""} onChange={(e) => setTurn(i, { speaker: e.target.value })} placeholder="A / B" />
            <label className="inline-flex items-center gap-2 text-xs text-neutral-500">
              <input type="checkbox" checked={!!t.blank} onChange={(e) => setTurn(i, { blank: e.target.checked })} /> Student fills this turn in
            </label>
          </div>
          {t.blank ? (
            <label className="block"><span className="text-xs font-semibold text-neutral-600">Sample answer</span>
              <input className={`${inputCls} mt-1`} value={t.answer || ""} onChange={(e) => setTurn(i, { answer: e.target.value })} /></label>
          ) : (
            <label className="block"><span className="text-xs font-semibold text-neutral-600">Line</span>
              <input className={`${inputCls} mt-1`} value={t.text || ""} onChange={(e) => setTurn(i, { text: e.target.value })} /></label>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ turns: [...turns, { speaker: turns.length % 2 ? "A" : "B", text: "", blank: false }] })}><Plus size={14} /> Add turn</Button>
    </div>
  );
}

function MediaEditor({ component, onChange }) {
  return (
    <div>
      <Field label="Title"><input className={inputCls} value={component.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Duration"><input className={inputCls} value={component.duration} onChange={(e) => onChange({ duration: e.target.value })} /></Field>
      <Field label="Transcript"><textarea className={`${inputCls} h-24 resize-none`} value={component.transcript} onChange={(e) => onChange({ transcript: e.target.value })} /></Field>
    </div>
  );
}

function ScenarioEditor({ component, onChange }) {
  const turns = component.turns || [];
  const setTurn = (i, k, v) => onChange({ turns: turns.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  return (
    <div className="space-y-3">
      <Field label="Situation"><input className={inputCls} value={component.situation} onChange={(e) => onChange({ situation: e.target.value })} /></Field>
      {turns.map((t, i) => (
        <div key={i} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-600">Turn {i + 1}</span>
            <button onClick={() => onChange({ turns: turns.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button></div>
          <label className="block mb-2"><span className="text-xs font-semibold text-neutral-600">Prompt (the other person)</span><input className={`${inputCls} mt-1`} value={t.prompt} onChange={(e) => setTurn(i, "prompt", e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-neutral-600">Sample reply</span><input className={`${inputCls} mt-1`} value={t.sample} onChange={(e) => setTurn(i, "sample", e.target.value)} /></label>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ turns: [...turns, { prompt: "", sample: "" }] })}><Plus size={14} /> Add turn</Button>
    </div>
  );
}

const HOMEWORK_TYPES = [["essay", "Essay"], ["video", "Video link"], ["link", "Document / link"]];

function HomeworkEditor({ component, onChange }) {
  const type = component.type || "essay";
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {HOMEWORK_TYPES.map(([id, lbl]) => (
          <button key={id} onClick={() => onChange({ type: id })} className={`text-sm rounded-lg px-3 py-1.5 border ${type === id ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{lbl}</button>
        ))}
      </div>
      <Field label="Prompt"><textarea className={`${inputCls} h-24 resize-none`} value={component.prompt} onChange={(e) => onChange({ prompt: e.target.value })} /></Field>
      {type === "essay" && (
        <Field label="Minimum sentences"><input type="number" className={`${inputCls} w-24`} value={component.minSentences} onChange={(e) => onChange({ minSentences: Number(e.target.value) || 1 })} /></Field>
      )}
      {(type === "video" || type === "link") && (
        <Field label={type === "video" ? "Reference video (optional)" : "Google Doc/Form URL (optional)"}>
          <input className={inputCls} value={component.resourceUrl || ""} onChange={(e) => onChange({ resourceUrl: e.target.value })} placeholder="https://…" />
        </Field>
      )}
    </div>
  );
}

function PrepositionEditor({ component, onChange }) {
  const options = component.options || [];
  const setOpt = (i, v) => onChange({ options: options.map((o, j) => (j === i ? v : o)) });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Object emoji"><input className={inputCls} value={component.object} onChange={(e) => onChange({ object: e.target.value })} /></Field>
        <Field label="Anchor emoji (the box/shelf)"><input className={inputCls} value={component.anchor} onChange={(e) => onChange({ anchor: e.target.value })} /></Field>
        <Field label="Subject (e.g. the cat)"><input className={inputCls} value={component.subject} onChange={(e) => onChange({ subject: e.target.value })} /></Field>
        <Field label="Place (e.g. the cupboard)"><input className={inputCls} value={component.place} onChange={(e) => onChange({ place: e.target.value })} /></Field>
      </div>
      <div>
        <div className="text-xs font-semibold text-neutral-600 mb-1.5">Prepositions to offer</div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
              <input className={inputCls} value={o} onChange={(e) => setOpt(i, e.target.value)} />
              <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ options: [...options, "near"] })}><Plus size={14} /> Add preposition</Button>
        </div>
      </div>
      <Field label="Correct answer (for the check button)">
        <select className={inputCls} value={component.answer || ""} onChange={(e) => onChange({ answer: e.target.value })}>
          <option value="">— no check, free explore —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    </div>
  );
}

const CONJ_PRONOUNS = ["I", "You", "He/She/It", "We", "They"];
function ConjugationEditor({ component, onChange }) {
  const tenses = component.tenses || {};
  const setForm = (tense, pronoun, v) => onChange({ tenses: { ...tenses, [tense]: { ...tenses[tense], [pronoun]: v } } });
  const renameTense = (oldName, newName) => {
    if (!newName || tenses[newName]) return;
    const next = {}; Object.entries(tenses).forEach(([k, v]) => { next[k === oldName ? newName : k] = v; }); onChange({ tenses: next });
  };
  const addTense = () => { const name = `Tense ${Object.keys(tenses).length + 1}`; onChange({ tenses: { ...tenses, [name]: Object.fromEntries(CONJ_PRONOUNS.map((p) => [p, ""])) } }); };
  const removeTense = (name) => { const next = { ...tenses }; delete next[name]; onChange({ tenses: next }); };
  return (
    <div className="space-y-4">
      <Field label="Verb (base form)"><input className={inputCls} value={component.verb} onChange={(e) => onChange({ verb: e.target.value })} /></Field>
      {Object.entries(tenses).map(([tense, forms], idx) => (
        // keyed by position, not name — the name is edited character-by-character
        // below, and keying by name would remount the input on every keystroke.
        <div key={idx} className="rounded-xl border border-neutral-100 p-3">
          <div className="flex items-center gap-2 mb-2">
            <input className={`${inputCls} flex-1 font-semibold`} value={tense} onChange={(e) => renameTense(tense, e.target.value)} />
            <button onClick={() => removeTense(tense)} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CONJ_PRONOUNS.map((p) => (
              <label key={p} className="block">
                <span className="text-xs font-semibold text-neutral-600">{p}</span>
                <input className={`${inputCls} mt-1`} value={forms[p] || ""} onChange={(e) => setForm(tense, p, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addTense}><Plus size={14} /> Add tense</Button>
    </div>
  );
}

const CONDITIONAL_TYPES = ["zero", "first", "second", "third"];
function ConditionalEditor({ component, onChange }) {
  const branches = component.branches || [];
  const setBranch = (i, k, v) => onChange({ branches: branches.map((b, j) => (j === i ? { ...b, [k]: v } : b)) });
  return (
    <div className="space-y-3">
      <Field label="Conditional type">
        <div className="flex flex-wrap gap-2">
          {CONDITIONAL_TYPES.map((t) => (
            <button key={t} onClick={() => onChange({ type: t })} className={`text-sm rounded-lg px-3 py-1.5 border capitalize ${component.type === t ? "border-pending-400 bg-pending-50 text-pending-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{t}</button>
          ))}
        </div>
      </Field>
      {branches.map((b, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <input className={inputCls} value={b.condition} onChange={(e) => setBranch(i, "condition", e.target.value)} placeholder="Condition (if…)" />
          <input className={inputCls} value={b.result} onChange={(e) => setBranch(i, "result", e.target.value)} placeholder="Result" />
          <button onClick={() => onChange({ branches: branches.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ branches: [...branches, { condition: "", result: "" }] })}><Plus size={14} /> Add branch</Button>
    </div>
  );
}

function ComparisonEditor({ component, onChange }) {
  const forms = component.forms || {}; const examples = component.examples || {};
  const steps = [["positive", "Positive"], ["comparative", "Comparative"], ["superlative", "Superlative"]];
  return (
    <div className="space-y-3">
      {steps.map(([key, label]) => (
        <div key={key} className="rounded-xl border border-neutral-100 p-3">
          <div className="text-xs font-semibold text-neutral-600 mb-2">{label}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputCls} value={forms[key] || ""} onChange={(e) => onChange({ forms: { ...forms, [key]: e.target.value } })} placeholder="word form" />
            <input className={inputCls} value={examples[key] || ""} onChange={(e) => onChange({ examples: { ...examples, [key]: e.target.value } })} placeholder="example sentence" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WordWebEditor({ component, onChange }) {
  const branches = component.branches || [];
  const setLabel = (i, v) => onChange({ branches: branches.map((b, j) => (j === i ? { ...b, label: v } : b)) });
  return (
    <div className="space-y-3">
      <Field label="Central word"><input className={inputCls} value={component.center} onChange={(e) => onChange({ center: e.target.value })} /></Field>
      <div className="space-y-2">
        {branches.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
            <input className={inputCls} value={b.label} onChange={(e) => setLabel(i, e.target.value)} placeholder="collocation / related word" />
            <button onClick={() => onChange({ branches: branches.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ branches: [...branches, { label: "" }] })}><Plus size={14} /> Add branch</Button>
      </div>
    </div>
  );
}

function MemoryEditor({ component, onChange }) {
  const pairs = component.pairs || [];
  const setPair = (i, k, v) => onChange({ pairs: pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  return (
    <div className="space-y-2">
      {pairs.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
          <input className={inputCls} value={p.term} onChange={(e) => setPair(i, "term", e.target.value)} placeholder="word" />
          <input className={inputCls} value={p.az} onChange={(e) => setPair(i, "az", e.target.value)} placeholder="azerbaijani" />
          <button onClick={() => onChange({ pairs: pairs.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ pairs: [...pairs, { term: "", az: "" }] })}><Plus size={14} /> Add pair</Button>
      <p className="text-xs text-neutral-400">4–6 pairs work best — more gets hard to hold in view.</p>
    </div>
  );
}

function SpeedRoundEditor({ component, onChange }) {
  return (
    <div className="space-y-3">
      <Field label="Round length (seconds)"><input type="number" className={`${inputCls} w-24`} value={component.seconds} onChange={(e) => onChange({ seconds: Number(e.target.value) || 10 })} /></Field>
      <QuizEditor component={component} onChange={onChange} />
    </div>
  );
}

function YoutubeEditor({ component, onChange }) {
  const id = extractYoutubeId(component.url);
  return (
    <div className="space-y-3">
      <Field label="YouTube URL"><input className={inputCls} value={component.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" /></Field>
      <p className={`text-xs ${id ? "text-success-600" : "text-pending-600"}`}>{id ? "Valid link — will embed." : "Paste a full YouTube link (watch, youtu.be, or embed format)."}</p>
      <Field label="Title"><input className={inputCls} value={component.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Notes for students"><input className={inputCls} value={component.notes} onChange={(e) => onChange({ notes: e.target.value })} /></Field>
    </div>
  );
}

function SlideDeckEditor({ component, onChange }) {
  const HINTS = {
    slides: "Google Slides → File → Share → Publish to web → Embed → paste that <iframe> src here.",
    canva: "Canva → Share → Embed → copy the src from the generated <iframe> code.",
    pptx: "PowerPoint (online) → Share → Embed → copy the src from the generated <iframe> code.",
    other: "Paste any embeddable slide URL.",
  };
  return (
    <div className="space-y-3">
      <Field label="Made with">
        <select className={inputCls} value={component.provider || "slides"} onChange={(e) => onChange({ provider: e.target.value })}>
          {Object.entries(SLIDE_PROVIDER_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </Field>
      <Field label="Embed link"><input className={inputCls} value={component.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://docs.google.com/presentation/d/…/embed" /></Field>
      <p className="text-xs text-neutral-400">{HINTS[component.provider || "slides"]}</p>
      <Field label="Title"><input className={inputCls} value={component.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Notes for students"><input className={inputCls} value={component.notes} onChange={(e) => onChange({ notes: e.target.value })} /></Field>
    </div>
  );
}

function DocumentEditor({ component, onChange }) {
  const kind = component.docKind || "pdf";
  const HINTS = {
    image: "Paste a direct image URL (.png/.jpg/.svg…).",
    pdf: "Paste a direct link to a hosted PDF file (must be publicly viewable).",
    docx: "Paste a public link to a Word file — it renders via Office's online viewer.",
  };
  return (
    <div className="space-y-3">
      <Field label="File type">
        <select className={inputCls} value={kind} onChange={(e) => onChange({ docKind: e.target.value })}>
          {Object.entries(DOC_KIND_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </Field>
      <Field label="File URL"><input className={inputCls} value={component.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://…" /></Field>
      <p className="text-xs text-neutral-400">{HINTS[kind]}</p>
      <Field label="Title"><input className={inputCls} value={component.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Notes for students"><input className={inputCls} value={component.notes} onChange={(e) => onChange({ notes: e.target.value })} /></Field>
    </div>
  );
}

function PeerTaskEditor({ component, onChange, roster }) {
  const mode = component.mode || "infogap";
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[["infogap", "Info-gap / jigsaw"], ["quizrace", "Team quiz race"]].map(([id, label]) => (
          <button key={id} onClick={() => onChange({ mode: id })}
            className={`text-sm font-semibold rounded-lg px-3 py-1.5 border ${mode === id ? "border-primary-400 bg-primary-50 text-primary-700" : "border-neutral-200 text-neutral-500"}`}>{label}</button>
        ))}
      </div>
      {mode === "infogap" ? <InfoGapEditor component={component} onChange={onChange} roster={roster} /> : <TeamQuizRaceEditor component={component} onChange={onChange} roster={roster} />}
    </div>
  );
}

function InfoGapEditor({ component, onChange, roster = [] }) {
  const roles = component.roles || [];
  const setRole = (i, patch) => onChange({ roles: roles.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const usedIds = new Set(roles.map((r) => r.studentId).filter(Boolean));
  return (
    <div className="space-y-3">
      <Field label="Situation"><textarea className={`${inputCls} h-20 resize-none`} value={component.situation} onChange={(e) => onChange({ situation: e.target.value })} /></Field>
      <div className="text-xs font-semibold text-neutral-600">Roles — assign a real student to each, any group size</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roles.map((r, i) => (
          <div key={i} className="rounded-xl border border-neutral-100 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-600">Role {i + 1}</span>
              <button onClick={() => onChange({ roles: roles.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500"><Trash2 size={14} /></button>
            </div>
            <Field label="Student">
              <select className={inputCls} value={r.studentId || ""} onChange={(e) => setRole(i, { studentId: e.target.value || null })}>
                <option value="">— pick a student —</option>
                {roster.map((s) => (
                  <option key={s.id} value={s.id} disabled={usedIds.has(s.id) && r.studentId !== s.id}>{s.name}</option>
                ))}
              </select>
              {!roster.length && <span className="text-xs text-pending-600 block mt-1">No students assigned to this lesson yet — use "Manage Students" on the course page first.</span>}
            </Field>
            <Field label="Only they see"><textarea className={`${inputCls} h-24 resize-none`} value={r.prompt || ""} onChange={(e) => setRole(i, { prompt: e.target.value })} /></Field>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange({ roles: [...roles, { studentId: null, prompt: "" }] })}><Plus size={14} /> Add role</Button>
    </div>
  );
}

function TeamQuizRaceEditor({ component, onChange, roster = [] }) {
  const teams = component.teams || [];
  const setTeam = (i, patch) => onChange({ teams: teams.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  function toggleMember(i, studentId) {
    const already = (teams[i].studentIds || []).includes(studentId);
    onChange({
      teams: teams.map((t, j) => {
        if (j === i) return { ...t, studentIds: already ? t.studentIds.filter((id) => id !== studentId) : [...(t.studentIds || []), studentId] };
        // a student can only be on one team at a time — drop them elsewhere when added here
        return already ? t : { ...t, studentIds: (t.studentIds || []).filter((id) => id !== studentId) };
      }),
    });
  }
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-neutral-600 mb-2">Teams — name each, then assign real students</div>
        <div className="space-y-3">
          {teams.map((t, i) => (
            <div key={t.id || i} className="rounded-xl border border-neutral-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <input className={inputCls} value={t.name || ""} onChange={(e) => setTeam(i, { name: e.target.value })} />
                <button onClick={() => onChange({ teams: teams.filter((_, j) => j !== i) })} className="text-neutral-300 hover:text-warning-500 shrink-0"><Trash2 size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roster.map((s) => {
                  const on = (t.studentIds || []).includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleMember(i, s.id)}
                      className={`text-xs rounded-full px-2.5 py-1 border ${on ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500"}`}>{s.name}</button>
                  );
                })}
                {!roster.length && <span className="text-xs text-pending-600">No students assigned to this lesson yet — use "Manage Students" on the course page first.</span>}
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => onChange({ teams: [...teams, { id: uid("team"), name: `Team ${teams.length + 1}`, studentIds: [] }] })}><Plus size={14} /> Add team</Button>
      </div>
      <div>
        <div className="text-xs font-semibold text-neutral-600 mb-2">Race questions</div>
        <QuizEditor component={component} onChange={onChange} />
      </div>
    </div>
  );
}

function SpeakingRecordEditor({ component, onChange }) {
  return (
    <div className="space-y-3">
      <Field label="Question / prompt"><textarea className={`${inputCls} h-20 resize-none`} value={component.question} onChange={(e) => onChange({ question: e.target.value })} /></Field>
      <Field label="Tip for the student (Azerbaijani) — optional"><input className={inputCls} value={component.tipAz} onChange={(e) => onChange({ tipAz: e.target.value })} /></Field>
      <p className="text-xs text-neutral-400">The student records an answer; AI gives simulated fluency + language feedback. Speaking is otherwise graded by you, the teacher — this adds a self-practice layer, not a replacement.</p>
    </div>
  );
}

function UploadEditor({ component, onChange }) {
  return (
    <div className="space-y-3">
      <Field label="Instructions"><textarea className={`${inputCls} h-20 resize-none`} value={component.instructions} onChange={(e) => onChange({ instructions: e.target.value })} /></Field>
      <Field label="Accepted file types"><input className={inputCls} value={component.accept} onChange={(e) => onChange({ accept: e.target.value })} placeholder=".pdf,.doc,.docx" /></Field>
    </div>
  );
}
