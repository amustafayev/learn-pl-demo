import React, { useEffect, useState } from "react";
import {
  ArrowLeft, Eye, Pencil, Plus, Trash2, Check, RefreshCw, Play, Volume2, Send,
  GraduationCap, Sparkles, RotateCcw, ChevronRight, ArrowUp, ArrowDown,
  BookOpen, Layers, MousePointerClick, FileQuestion, PenTool, Shapes, Video,
  Headphones, Briefcase, ClipboardList, Copy,
} from "lucide-react";
import { Card, Btn, Pill, AiNote, Field, inputCls } from "../ui.jsx";
import { useStore, useNav } from "../store.jsx";
import { PART_TYPES, ROLE } from "../data.jsx";
import { Reader, RoleLegend, ColorSentence, TenseTimeline } from "./grammar.jsx";

/* =========================================================================
   Part Studio — a part is a CONTAINER of activity blocks. Each part type
   offers a palette of block kinds the teacher can add, reorder and edit;
   e.g. a Practice part mixes gap-fill + drag-&-drop + quiz + scenario, a
   Vocabulary part stacks a word list + flashcards + match + quiz, a Reading
   part can hold several passages. Every block has a student renderer and an
   editor. Content shape:  part.content = { blocks: [ {id, kind, ...data} ] }
   ========================================================================= */

let blockSeq = 0;
const bid = () => `b${Date.now()}_${++blockSeq}`;

/* ---- block-kind registry: label, icon, tone, default data ---- */
export const BLOCK_META = {
  passage:    { label: "Reading passage",       icon: BookOpen,          tone: "text-sky-600 bg-sky-50" },
  wordlist:   { label: "Word list",             icon: Layers,            tone: "text-indigo-600 bg-indigo-50" },
  flashcards: { label: "Flashcards",            icon: Copy,              tone: "text-indigo-600 bg-indigo-50" },
  match:      { label: "Drag & drop match",     icon: MousePointerClick, tone: "text-fuchsia-600 bg-fuchsia-50" },
  quiz:       { label: "Quiz (multiple choice)",icon: FileQuestion,      tone: "text-orange-600 bg-orange-50" },
  gapfill:    { label: "Fill the gaps",         icon: PenTool,           tone: "text-amber-600 bg-amber-50" },
  timeline:   { label: "Tense timeline",        icon: Shapes,            tone: "text-emerald-600 bg-emerald-50" },
  sentence:   { label: "Colour-coded sentence", icon: Shapes,            tone: "text-emerald-600 bg-emerald-50" },
  video:      { label: "Video",                 icon: Video,             tone: "text-rose-600 bg-rose-50" },
  listening:  { label: "Listening",             icon: Headphones,        tone: "text-violet-600 bg-violet-50" },
  scenario:   { label: "Scenario task",         icon: Briefcase,         tone: "text-teal-600 bg-teal-50" },
  homework:   { label: "Homework",              icon: ClipboardList,     tone: "text-slate-600 bg-slate-100" },
};

// which block kinds each part type can hold (the "Add activity" palette)
const PALETTE = {
  passage:   ["passage"],
  words:     ["wordlist", "flashcards", "match", "quiz"],
  cards:     ["match"],
  grammar:   ["timeline", "sentence"],
  practice:  ["gapfill", "match", "quiz", "flashcards", "scenario", "listening"],
  test:      ["quiz", "gapfill"],
  video:     ["video"],
  listening: ["listening"],
  scenario:  ["scenario"],
  homework:  ["homework"],
};

const SAMPLE_WORDS = [
  { term: "introduce", az: "təqdim etmək", def: "to present someone or yourself", example: "Let me introduce myself." },
  { term: "colleague", az: "həmkar", def: "a person you work with", example: "She is my colleague." },
  { term: "available", az: "əlçatan", def: "free to be used or seen", example: "I'm available after lunch." },
];

function defaultBlock(kind, texts = []) {
  const base = { id: bid(), kind };
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
    case "timeline":   return { ...base };
    case "sentence":   return { ...base, sentence: [
      { w: "The team", role: "subject" }, { w: "shipped", role: "verb" }, { w: "the login screen", role: "object" },
      { w: "yesterday", role: "time" }, { w: "." },
    ] };
    case "video":      return { ...base, title: "Small talk basics", duration: "2:45", transcript: "Hi, how are you? — I'm good, thanks. How was your weekend? — Really nice, I visited my family." };
    case "listening":  return { ...base, title: "At the reception", duration: "1:30", transcript: "Good morning, do you have an appointment? — Yes, at ten, with Ms. Aliyeva." };
    case "scenario":   return { ...base, situation: "You greet a colleague at the coffee machine.", turns: [
      { prompt: "Colleague: Good morning! How was your weekend?", sample: "It was great, thanks — I visited my family." },
      { prompt: "Colleague: Ready for the standup?", sample: "Almost — let me grab a coffee first." },
    ] };
    case "homework":   return { ...base, prompt: "Write 5 sentences introducing yourself to a new team.", minSentences: 5 };
    default:           return base;
  }
}

export function defaultContent(partType, texts = []) {
  const kinds = {
    passage:   ["passage"],
    words:     ["wordlist", "flashcards", "match", "quiz"],
    cards:     ["match"],
    grammar:   ["timeline"],
    practice:  ["gapfill", "match"],
    test:      ["quiz"],
    video:     ["video"],
    listening: ["listening"],
    scenario:  ["scenario"],
    homework:  ["homework"],
  }[partType] || [];
  return { blocks: kinds.map((k) => defaultBlock(k, texts)) };
}

// migrate any pre-nesting content into the blocks model
function toBlocks(part, texts) {
  const c = part.content;
  if (c?.blocks) return c;
  if (!c) return defaultContent(part.type, texts);
  if (c.textId) return { blocks: [{ id: bid(), kind: "passage", textId: c.textId }] };
  if (c.pairs) return { blocks: [{ id: bid(), kind: "match", mode: c.mode || "az", pairs: c.pairs }] };
  if (c.sentence || c.kind) return { blocks: [c.kind === "sentence" ? { id: bid(), kind: "sentence", sentence: c.sentence || [] } : { id: bid(), kind: "timeline" }] };
  if (c.items) return { blocks: [{ id: bid(), kind: part.type === "test" ? "quiz" : part.type === "words" ? "wordlist" : "gapfill", items: c.items }] };
  return defaultContent(part.type, texts);
}

/* ============================== studio shell ============================== */

export default function PartStudio() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [mode, setMode] = useState("student");
  const [adding, setAdding] = useState(false);
  const course = state.courses.find((c) => c.id === route.courseId);
  const lesson = (state.lessons[route.courseId] || []).find((l) => l.id === route.lessonId);
  const part = (lesson?.built || []).find((p) => p.id === route.partId);

  useEffect(() => {
    if (part && !part.content?.blocks) {
      dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: part.id,
        patch: { content: toBlocks(part, state.texts) } });
    }
  }, [part, route.courseId, route.lessonId, dispatch, state.texts]);

  if (!part) return null;
  const content = part.content?.blocks ? part.content : toBlocks(part, state.texts);
  const blocks = content.blocks;
  const P = PART_TYPES[part.type]; const I = P.icon;
  const palette = PALETTE[part.type] || [];

  const setBlocks = (next) =>
    dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: part.id, patch: { content: { ...content, blocks: next } } });
  const updateBlock = (i, patch) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const removeBlock = (i) => setBlocks(blocks.filter((_, j) => j !== i));
  const moveBlock = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= blocks.length) return;
    const next = [...blocks]; [next[i], next[j]] = [next[j], next[i]]; setBlocks(next);
  };
  const addBlock = (kind) => { setBlocks([...blocks, defaultBlock(kind, state.texts)]); setAdding(false); toast(`Added ${BLOCK_META[kind].label}`); };

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <button onClick={() => go({ partId: null })} className="text-sm text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> {course.title} · Lesson {lesson.n}
      </button>

      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${P.tone}`}><I size={20} /></span>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400">{P.label} · {blocks.length} {blocks.length === 1 ? "activity" : "activities"}</div>
            <h1 className="text-xl font-bold tracking-tight">{part.title || P.label}</h1>
          </div>
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setMode("student")} className={`text-sm font-semibold rounded-lg px-3.5 py-1.5 inline-flex items-center gap-1.5 ${mode === "student" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}`}><Eye size={14} /> As student</button>
          <button onClick={() => setMode("edit")} className={`text-sm font-semibold rounded-lg px-3.5 py-1.5 inline-flex items-center gap-1.5 ${mode === "edit" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}`}><Pencil size={14} /> Edit content</button>
        </div>
      </div>

      {mode === "student" ? (
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-400"><GraduationCap size={14} /> This is exactly what the learner sees — {blocks.length} {blocks.length === 1 ? "activity" : "activities"} in order.</div>
          <div className="space-y-8">
            {blocks.map((b, i) => {
              const M = BLOCK_META[b.kind]; const BI = M.icon;
              return (
                <div key={b.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${M.tone}`}><BI size={15} /></span>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Activity {i + 1} · {M.label}</span>
                  </div>
                  <BlockStudent block={b} />
                </div>
              );
            })}
            {!blocks.length && <Card className="p-8 text-center text-slate-400 text-sm">No activities yet — switch to Edit to add some.</Card>}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400">Activities · add, reorder, edit</div>
            <Btn size="sm" variant="soft" onClick={() => { toast("Part saved"); go({ partId: null }); }}><Check size={14} /> Save & close</Btn>
          </div>
          <div className="space-y-4">
            {blocks.map((b, i) => {
              const M = BLOCK_META[b.kind]; const BI = M.icon;
              return (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-100">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${M.tone}`}><BI size={16} /></span>
                    <div className="flex-1"><span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Activity {i + 1}</span><div className="font-semibold text-sm">{M.label}</div></div>
                    <div className="flex items-center gap-0.5 text-slate-300">
                      <button title="Move up" disabled={i === 0} onClick={() => moveBlock(i, -1)} className="hover:text-slate-500 p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button title="Move down" disabled={i === blocks.length - 1} onClick={() => moveBlock(i, 1)} className="hover:text-slate-500 p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                      <button title="Remove" onClick={() => { removeBlock(i); toast("Activity removed"); }} className="hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <BlockEditor block={b} onChange={(patch) => updateBlock(i, patch)} />
                </Card>
              );
            })}

            {/* add-activity palette */}
            {adding ? (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3"><span className="text-xs font-mono uppercase tracking-wide text-slate-400">Pick an activity</span><button onClick={() => setAdding(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {palette.map((k) => {
                    const M = BLOCK_META[k]; const KI = M.icon;
                    return (
                      <button key={k} onClick={() => addBlock(k)} className="flex items-center gap-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-3 text-left transition-colors">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${M.tone}`}><KI size={16} /></span>
                        <span className="text-sm font-medium">{M.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <button onClick={() => setAdding(true)} className="w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 text-sm font-medium">
                <Plus size={16} className="inline mr-1" /> Add activity
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== block: student ============================== */

function BlockStudent({ block }) {
  switch (block.kind) {
    case "passage":    return <PassageBlock block={block} />;
    case "wordlist":   return <WordListBlock block={block} />;
    case "flashcards": return <FlashcardsBlock block={block} />;
    case "match":      return <MatchBlock block={block} />;
    case "quiz":       return <QuizBlock block={block} />;
    case "gapfill":    return <GapFillBlock block={block} />;
    case "timeline":   return <Card className="p-6"><TenseTimeline /></Card>;
    case "sentence":   return <SentenceBlock block={block} />;
    case "video":      return <MediaBlock block={block} kind="video" />;
    case "listening":  return <MediaBlock block={block} kind="listening" />;
    case "scenario":   return <ScenarioBlock block={block} />;
    case "homework":   return <HomeworkBlock block={block} />;
    default:           return null;
  }
}

function PassageBlock({ block }) {
  const { state, toast } = useStore();
  const text = state.texts.find((t) => t.id === block.textId) || state.texts[0];
  if (!text) return <Card className="p-6 text-slate-400 text-sm">No reading text linked. Edit to choose one.</Card>;
  return (
    <Card className="p-6">
      <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-3">{text.title} · {text.topic} · {text.level} · {text.wordCount} words</div>
      <Reader text={text} onSaveWord={() => toast("Word saved to the personal list")} />
    </Card>
  );
}

function WordListBlock({ block }) {
  const items = block.items || [];
  return (
    <Card className="divide-y divide-slate-100">
      {items.map((w, i) => (
        <div key={i} className="p-3.5">
          <div className="flex items-center gap-2"><b>{w.term}</b><span className="text-indigo-600 text-sm">{w.az}</span></div>
          <div className="text-sm text-slate-500">{w.def}</div>
          {w.example && <div className="text-xs text-slate-400 italic mt-0.5">“{w.example}”</div>}
        </div>
      ))}
      {!items.length && <div className="p-4 text-slate-400 text-sm">No words.</div>}
    </Card>
  );
}

function FlashcardsBlock({ block }) {
  const items = block.items || [];
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!items.length) return <Card className="p-6 text-slate-400 text-sm">No words.</Card>;
  const wd = items[i % items.length];
  return (
    <div className="max-w-md">
      <button onClick={() => setFlip((f) => !f)} className="w-full h-40 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center hover:border-indigo-300 transition-colors">
        {flip ? <><span className="text-2xl font-bold text-indigo-600">{wd.az}</span>{wd.example && <span className="text-sm text-slate-400 mt-2 italic">“{wd.example}”</span>}</> : <span className="text-2xl font-bold">{wd.term}</span>}
      </button>
      <div className="flex items-center justify-between mt-3">
        <Btn variant="outline" size="sm" onClick={() => { setI((i - 1 + items.length) % items.length); setFlip(false); }}>Prev</Btn>
        <span className="text-sm text-slate-400 font-mono">{(i % items.length) + 1} / {items.length}</span>
        <Btn variant="outline" size="sm" onClick={() => { setI((i + 1) % items.length); setFlip(false); }}>Next</Btn>
      </div>
      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><RefreshCw size={12} /> Tap to flip.</p>
    </div>
  );
}

function MatchBlock({ block }) {
  const { toast } = useStore();
  const mode = block.mode || "az";
  const pairs = (block.pairs || []).slice(0, 5);
  if (mode === "theme") return <ThemeGroup pairs={pairs} />;
  return <MatchBoard pairs={pairs} showEmoji={mode === "picture"} onDone={() => toast("Matched — great work! 🎉")} />;
}

function MatchBoard({ pairs, showEmoji, onDone }) {
  const [right] = useState(() => [...pairs].reverse());
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState({});
  const key = (p) => (showEmoji ? p.emoji : p.az);
  function tryMatch(term, val) {
    const p = pairs.find((x) => x.term === term);
    if (key(p) === val) {
      const next = { ...done, [term]: true };
      setDone(next); setPicked(null);
      if (Object.keys(next).length === pairs.length && onDone) onDone();
    } else setPicked(null);
  }
  return (
    <div className="grid grid-cols-2 gap-8 max-w-lg">
      <div className="space-y-2">
        {pairs.map((p) => (
          <button key={p.term} disabled={done[p.term]} onClick={() => setPicked(p.term)}
            className={`w-full rounded-lg border p-3 text-sm font-medium text-left transition-colors ${done[p.term] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : picked === p.term ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}>
            {p.term} {done[p.term] && <Check size={13} className="inline text-emerald-600" />}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {right.map((p) => {
          const matched = Object.keys(done).some((t) => key(pairs.find((x) => x.term === t)) === key(p));
          return (
            <button key={p.term} disabled={matched || !picked} onClick={() => tryMatch(picked, key(p))}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${matched ? "border-emerald-200 bg-emerald-50" : !picked ? "border-slate-100 text-slate-400" : "border-slate-200 hover:border-indigo-300"} ${showEmoji ? "text-2xl text-center" : "text-sm font-medium"}`}>
              {showEmoji ? p.emoji : p.az}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeGroup({ pairs }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg">
      {["Greetings", "Objects"].map((theme, ti) => (
        <Card key={theme} className="p-4">
          <div className="text-sm font-semibold mb-2">{theme}</div>
          <div className="flex flex-wrap gap-1.5">
            {pairs.filter((_, i) => i % 2 === ti).map((p) => <Pill key={p.term} className="bg-slate-100 text-slate-600">{p.term}</Pill>)}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SentenceBlock({ block }) {
  return (
    <Card className="p-6">
      <div className="mb-3"><RoleLegend /></div>
      <ColorSentence tokens={block.sentence || []} />
      <p className="text-xs text-slate-400 mt-3">Same colour, same grammar role — everywhere in the app.</p>
    </Card>
  );
}

function QuizBlock({ block }) {
  const items = block.items || [];
  return <div className="space-y-4 max-w-xl">{items.map((it, i) => <QuizQ key={i} item={it} n={i + 1} total={items.length} />)}</div>;
}
function QuizQ({ item, n, total }) {
  const [pick, setPick] = useState(null);
  const correct = pick === item.answer;
  return (
    <Card className="p-5">
      <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-2">Question {n} of {total}</div>
      <div className="text-lg font-semibold mb-3">{item.q}</div>
      <div className="space-y-2">
        {item.options.map((o, oi) => (
          <button key={oi} onClick={() => setPick(oi)}
            className={`w-full rounded-lg border p-3 text-sm text-left transition-colors ${
              pick == null ? "border-slate-200 hover:border-indigo-300" :
              oi === item.answer ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
              oi === pick ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 opacity-60"}`}>
            {o} {pick != null && oi === item.answer && <Check size={14} className="inline" />}
          </button>
        ))}
      </div>
      {pick != null && <div className="mt-3"><AiNote icon={correct ? Check : RotateCcw} tone={correct ? "emerald" : "amber"}>{correct ? "Düzdür!" : "No lost life — just retry."} {item.why}</AiNote></div>}
    </Card>
  );
}

function GapFillBlock({ block }) {
  const items = block.items || [];
  return <div className="space-y-4 max-w-xl">{items.map((it, i) => <GapFill key={i} item={it} n={i + 1} total={items.length} />)}</div>;
}
function GapFill({ item, n, total }) {
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const ok = val.trim().toLowerCase() === item.answer.toLowerCase();
  return (
    <Card className="p-5">
      <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-2">Fill the gap · {n} of {total}</div>
      <div className="text-lg mb-3">{item.text.split("___").map((seg, i, arr) => (
        <React.Fragment key={i}>{seg}{i < arr.length - 1 && (
          <input value={val} onChange={(e) => { setVal(e.target.value); setChecked(false); }} placeholder="…"
            className={`inline-block w-28 mx-1 border-b-2 text-center focus:outline-none ${checked ? (ok ? "border-emerald-400 text-emerald-700" : "border-rose-400 text-rose-700") : "border-indigo-300"}`} />
        )}</React.Fragment>
      ))}</div>
      {!checked ? <Btn size="sm" onClick={() => setChecked(true)} disabled={!val.trim()}>Check</Btn>
        : <AiNote icon={ok ? Check : RotateCcw} tone={ok ? "emerald" : "amber"}>{ok ? "Düzdür! (Correct!)" : <>Az qaldı — düzgün cavab: <b>{item.answer}</b>. {item.why} <button onClick={() => { setChecked(false); setVal(""); }} className="underline ml-1">Yenidən cəhd et</button></>}</AiNote>}
    </Card>
  );
}

function MediaBlock({ block, kind }) {
  const [replays, setReplays] = useState(0);
  const [showT, setShowT] = useState(false);
  return (
    <div className="max-w-2xl">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
          <button onClick={() => setReplays((r) => r + 1)} className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-900">
            {kind === "video" ? <Play size={26} className="ml-1" /> : <Volume2 size={26} />}
          </button>
          <span className="absolute bottom-3 right-3 text-xs text-white/80 font-mono">{block.duration}</span>
        </div>
        <div className="p-4">
          <div className="font-semibold">{block.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{kind === "video" ? "Subtitled" : `Audio · replays: ${replays}`}</div>
          <button onClick={() => setShowT((s) => !s)} className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-flex items-center gap-1">{showT ? "Hide" : "Show"} transcript <ChevronRight size={13} className={showT ? "rotate-90 transition-transform" : "transition-transform"} /></button>
          {showT && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{block.transcript}</p>}
        </div>
      </Card>
    </div>
  );
}

function ScenarioBlock({ block }) {
  const [revealed, setRevealed] = useState({});
  return (
    <div className="max-w-xl">
      <AiNote icon={Sparkles} tone="teal" title="Real situation">{block.situation}</AiNote>
      <div className="space-y-3 mt-4">
        {(block.turns || []).map((t, i) => (
          <div key={i}>
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-3 text-sm text-slate-700 max-w-[85%]">{t.prompt}</div>
            <div className="flex justify-end mt-1.5">
              {revealed[i] ? <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 text-sm max-w-[85%]">{t.sample}</div>
                : <button onClick={() => setRevealed((r) => ({ ...r, [i]: true }))} className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-full px-3 py-1.5">Your turn — show a sample reply</button>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">Speaking is practised with your teacher — the app never grades speech.</p>
    </div>
  );
}

function HomeworkBlock({ block }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const count = text.trim() ? text.trim().split(/[.!?]+/).filter((x) => x.trim()).length : 0;
  return (
    <div className="max-w-xl">
      <Card className="p-5">
        <p className="text-slate-600 text-sm mb-3">{block.prompt}</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={sent} className={`${inputCls} h-28 resize-none`} placeholder="Write here…" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400 font-mono">{count}/{block.minSentences} sentences</span>
          {sent ? <Pill className="bg-amber-50 text-amber-700">Sent — waiting for review</Pill>
            : <Btn size="sm" disabled={count < block.minSentences} onClick={() => setSent(true)}><Send size={13} /> Submit</Btn>}
        </div>
      </Card>
    </div>
  );
}

/* ============================== block: editors ============================== */

const ROLE_KEYS = ["", ...Object.keys(ROLE)];

function BlockEditor({ block, onChange }) {
  switch (block.kind) {
    case "passage":    return <PassageEditor block={block} onChange={onChange} />;
    case "wordlist":   return <RowsEditor block={block} onChange={onChange} fields={[["term", "Word"], ["az", "Azerbaijani"], ["def", "Definition"], ["example", "Example"]]} blank={{ term: "", az: "", def: "", example: "" }} label="word" wide={["def", "example"]} />;
    case "flashcards": return <RowsEditor block={block} onChange={onChange} fields={[["term", "Front (word)"], ["az", "Back (Azerbaijani)"], ["example", "Example"]]} blank={{ term: "", az: "", example: "" }} label="card" wide={["example"]} />;
    case "match":      return <MatchEditor block={block} onChange={onChange} />;
    case "quiz":       return <QuizEditor block={block} onChange={onChange} />;
    case "gapfill":    return <RowsEditor block={block} onChange={onChange} fields={[["text", "Sentence (use ___ for the gap)"], ["answer", "Answer"], ["why", "Why (Azerbaijani)"]]} blank={{ text: "", answer: "", why: "" }} label="item" wide={["text", "why"]} />;
    case "timeline":   return <AiNote icon={Sparkles} tone="emerald">The tense timeline is a ready interactive block — no setup. Switch to “As student” to try it.</AiNote>;
    case "sentence":   return <SentenceEditor block={block} onChange={onChange} />;
    case "video":      return <MediaEditor block={block} onChange={onChange} />;
    case "listening":  return <MediaEditor block={block} onChange={onChange} />;
    case "scenario":   return <ScenarioEditor block={block} onChange={onChange} />;
    case "homework":   return <HomeworkEditor block={block} onChange={onChange} />;
    default:           return null;
  }
}

function PassageEditor({ block, onChange }) {
  const { state } = useStore();
  return (
    <Field label="Reading text (from Library)">
      <select className={inputCls} value={block.textId || ""} onChange={(e) => onChange({ textId: e.target.value })}>
        {state.texts.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.topic} · {t.level}</option>)}
      </select>
    </Field>
  );
}

// generic rows-of-fields editor
function RowsEditor({ block, onChange, fields, blank, label, wide = [] }) {
  const items = block.items || [];
  const setItem = (i, k, v) => onChange({ items: items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-400">#{i + 1}</span>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(([k, lbl]) => (
              <label key={k} className={`block ${wide.includes(k) ? "sm:col-span-2" : ""}`}>
                <span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">{lbl}</span>
                <input className={`${inputCls} mt-1`} value={it[k] || ""} onChange={(e) => setItem(i, k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <Btn variant="outline" size="sm" onClick={() => onChange({ items: [...items, { ...blank }] })}><Plus size={14} /> Add {label}</Btn>
    </div>
  );
}

function MatchEditor({ block, onChange }) {
  const pairs = block.pairs || [];
  const setPair = (i, k, v) => onChange({ pairs: pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {[["az", "Word → Azerbaijani"], ["picture", "Word → picture"], ["theme", "Group by theme"]].map(([id, lbl]) => (
          <button key={id} onClick={() => onChange({ mode: id })} className={`text-sm rounded-lg px-3 py-1.5 border ${block.mode === id ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-500"}`}>{lbl}</button>
        ))}
      </div>
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_3.5rem_auto] items-center gap-3">
            <input className={inputCls} value={p.term} onChange={(e) => setPair(i, "term", e.target.value)} placeholder="word" />
            <input className={inputCls} value={p.az} onChange={(e) => setPair(i, "az", e.target.value)} placeholder="azerbaijani" />
            <input className={`${inputCls} text-center px-1`} value={p.emoji} onChange={(e) => setPair(i, "emoji", e.target.value)} placeholder="🙂" />
            <button onClick={() => onChange({ pairs: pairs.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <Btn variant="outline" size="sm" onClick={() => onChange({ pairs: [...pairs, { term: "", az: "", emoji: "🙂" }] })}><Plus size={14} /> Add pair</Btn>
      </div>
    </div>
  );
}

function SentenceEditor({ block, onChange }) {
  const tokens = block.sentence || [];
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
            <button onClick={() => onChange({ sentence: tokens.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <Btn variant="outline" size="sm" onClick={() => onChange({ sentence: [...tokens, { w: "", role: "" }] })}><Plus size={14} /> Add word</Btn>
      </div>
      <div><div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-1.5">Live preview</div><div className="rounded-xl border border-slate-100 p-3"><ColorSentence tokens={tokens} /></div></div>
    </div>
  );
}

function QuizEditor({ block, onChange }) {
  const items = block.items || [];
  const setItem = (i, patch) => onChange({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-400">Q{i + 1}</span>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
          <input className={`${inputCls} mb-2`} value={it.q} onChange={(e) => setItem(i, { q: e.target.value })} placeholder="Question" />
          <div className="space-y-1.5 mb-2">
            {it.options.map((o, oi) => (
              <div key={oi} className="grid grid-cols-[auto_1fr] items-center gap-2">
                <button onClick={() => setItem(i, { answer: oi })} className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${it.answer === oi ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}>{it.answer === oi && <Check size={12} />}</button>
                <input className={inputCls} value={o} onChange={(e) => setItem(i, { options: it.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
              </div>
            ))}
            <button onClick={() => setItem(i, { options: [...it.options, ""] })} className="text-xs text-indigo-600 hover:text-indigo-700 ml-7"><Plus size={12} className="inline" /> option</button>
          </div>
          <input className={inputCls} value={it.why} onChange={(e) => setItem(i, { why: e.target.value })} placeholder="Why (Azerbaijani) — feedback" />
        </div>
      ))}
      <Btn variant="outline" size="sm" onClick={() => onChange({ items: [...items, { q: "", options: ["", "", ""], answer: 0, why: "" }] })}><Plus size={14} /> Add question</Btn>
      <p className="text-xs text-slate-400">Tap the circle to mark the correct answer. Feedback shows immediately, in Azerbaijani.</p>
    </div>
  );
}

function MediaEditor({ block, onChange }) {
  return (
    <div>
      <Field label="Title"><input className={inputCls} value={block.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Duration"><input className={inputCls} value={block.duration} onChange={(e) => onChange({ duration: e.target.value })} /></Field>
      <Field label="Transcript"><textarea className={`${inputCls} h-24 resize-none`} value={block.transcript} onChange={(e) => onChange({ transcript: e.target.value })} /></Field>
    </div>
  );
}

function ScenarioEditor({ block, onChange }) {
  const turns = block.turns || [];
  const setTurn = (i, k, v) => onChange({ turns: turns.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  return (
    <div className="space-y-3">
      <Field label="Situation"><input className={inputCls} value={block.situation} onChange={(e) => onChange({ situation: e.target.value })} /></Field>
      {turns.map((t, i) => (
        <div key={i} className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-400">Turn {i + 1}</span>
            <button onClick={() => onChange({ turns: turns.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
          <label className="block mb-2"><span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Prompt (the other person)</span><input className={`${inputCls} mt-1`} value={t.prompt} onChange={(e) => setTurn(i, "prompt", e.target.value)} /></label>
          <label className="block"><span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Sample reply</span><input className={`${inputCls} mt-1`} value={t.sample} onChange={(e) => setTurn(i, "sample", e.target.value)} /></label>
        </div>
      ))}
      <Btn variant="outline" size="sm" onClick={() => onChange({ turns: [...turns, { prompt: "", sample: "" }] })}><Plus size={14} /> Add turn</Btn>
    </div>
  );
}

function HomeworkEditor({ block, onChange }) {
  return (
    <div>
      <Field label="Prompt"><textarea className={`${inputCls} h-24 resize-none`} value={block.prompt} onChange={(e) => onChange({ prompt: e.target.value })} /></Field>
      <Field label="Minimum sentences"><input type="number" className={`${inputCls} w-24`} value={block.minSentences} onChange={(e) => onChange({ minSentences: Number(e.target.value) || 1 })} /></Field>
    </div>
  );
}
