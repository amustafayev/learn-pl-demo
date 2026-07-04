import React, { useEffect, useState } from "react";
import {
  ArrowLeft, Eye, Pencil, Plus, Trash2, Check, RefreshCw, Play, Volume2, Send,
  GraduationCap, Sparkles, RotateCcw, ChevronRight,
} from "lucide-react";
import { Card, Btn, Pill, SectionLabel, AiNote, Field, inputCls } from "../ui.jsx";
import { useStore, useNav } from "../store.jsx";
import { PART_TYPES, ROLE } from "../data.jsx";
import { Reader, RoleLegend, ColorSentence, TenseTimeline } from "./grammar.jsx";

/* =========================================================================
   Part Studio — open a lesson part to see it exactly as a learner does,
   then flip to Edit to construct the blocks inside it. Each part type has
   both a student renderer and an editor. Content persists to the store.
   ========================================================================= */

const ROLE_KEYS = ["", ...Object.keys(ROLE)];

// default block content when a part is first opened
export function defaultContent(type, texts = []) {
  switch (type) {
    case "passage":
      return { textId: texts[0]?.id || null };
    case "words":
      return { items: [
        { term: "introduce", az: "təqdim etmək", def: "to present someone or yourself", example: "Let me introduce myself." },
        { term: "colleague", az: "həmkar", def: "a person you work with", example: "She is my colleague." },
        { term: "available", az: "əlçatan", def: "free to be used or seen", example: "I'm available after lunch." },
      ] };
    case "cards":
      return { mode: "az", pairs: [
        { term: "hello", az: "salam", emoji: "👋" },
        { term: "thanks", az: "təşəkkür", emoji: "🙏" },
        { term: "coffee", az: "qəhvə", emoji: "☕" },
        { term: "friend", az: "dost", emoji: "🧑" },
      ] };
    case "grammar":
      return { kind: "timeline", sentence: [
        { w: "The team", role: "subject" }, { w: "shipped", role: "verb" }, { w: "the login screen", role: "object" },
        { w: "yesterday", role: "time" }, { w: "." },
      ] };
    case "practice":
      return { items: [
        { text: "I ___ the report yesterday.", answer: "finished", why: "“yesterday” bitmiş vaxtdır → Past simple." },
        { text: "She ___ here since 2020.", answer: "has lived", why: "İndi də davam edir → Present perfect." },
      ] };
    case "test":
      return { items: [
        { q: "I ___ to work every morning.", options: ["go", "goes", "going"], answer: 0, why: "“I” ilə sadə indiki zaman → go." },
        { q: "They ___ the bug last week.", options: ["fix", "fixed", "have fixed"], answer: 1, why: "“last week” bitmiş vaxt → Past simple." },
      ] };
    case "video":
      return { title: "Small talk basics", duration: "2:45", transcript: "Hi, how are you? — I'm good, thanks. How was your weekend? — Really nice, I visited my family." };
    case "listening":
      return { title: "At the reception", duration: "1:30", replays: 0, transcript: "Good morning, do you have an appointment? — Yes, at ten, with Ms. Aliyeva." };
    case "scenario":
      return { situation: "You arrive at the office and greet a colleague at the coffee machine.", turns: [
        { prompt: "Colleague: Good morning! How was your weekend?", sample: "It was great, thanks — I visited my family." },
        { prompt: "Colleague: Nice! Ready for the standup?", sample: "Almost — let me grab a coffee first." },
      ] };
    case "homework":
      return { prompt: "Write 5 sentences introducing yourself to a new team.", minSentences: 5 };
    default:
      return {};
  }
}

export default function PartStudio() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [mode, setMode] = useState("student"); // student | edit
  const course = state.courses.find((c) => c.id === route.courseId);
  const lesson = (state.lessons[route.courseId] || []).find((l) => l.id === route.lessonId);
  const part = (lesson?.built || []).find((p) => p.id === route.partId);

  useEffect(() => {
    if (part && !part.content) {
      dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: part.id,
        patch: { content: defaultContent(part.type, state.texts) } });
    }
  }, [part, route.courseId, route.lessonId, dispatch, state.texts]);

  if (!part) return null;
  const content = part.content || defaultContent(part.type, state.texts);
  const P = PART_TYPES[part.type]; const I = P.icon;

  const update = (patch) =>
    dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: part.id,
      patch: { content: { ...content, ...patch } } });

  const back = () => go({ partId: null });

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <button onClick={back} className="text-sm text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> {course.title} · Lesson {lesson.n}
      </button>

      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${P.tone}`}><I size={20} /></span>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400">{P.label}</div>
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
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-400"><GraduationCap size={14} /> This is exactly what the learner sees.</div>
          <StudentPart type={part.type} content={content} />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400">Construct the block</div>
            <Btn size="sm" variant="soft" onClick={() => { toast("Part saved"); back(); }}><Check size={14} /> Save & close</Btn>
          </div>
          <PartEditor type={part.type} content={content} update={update} />
        </div>
      )}
    </div>
  );
}

/* ============================== student renderers ============================== */

function StudentPart({ type, content }) {
  switch (type) {
    case "passage":   return <PassageStudent content={content} />;
    case "words":     return <VocabStudent content={content} />;
    case "cards":     return <CardsStudent content={content} />;
    case "grammar":   return <GrammarStudent content={content} />;
    case "practice":  return <PracticeStudent content={content} />;
    case "test":      return <TestStudent content={content} />;
    case "video":     return <MediaStudent content={content} kind="video" />;
    case "listening": return <MediaStudent content={content} kind="listening" />;
    case "scenario":  return <ScenarioStudent content={content} />;
    case "homework":  return <HomeworkStudent content={content} />;
    default:          return null;
  }
}

function PassageStudent({ content }) {
  const { state, toast } = useStore();
  const text = state.texts.find((t) => t.id === content.textId) || state.texts[0];
  if (!text) return <Card className="p-6 text-slate-400 text-sm">No reading text linked. Switch to Edit to choose one.</Card>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6">
        <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-3">{text.topic} · {text.level} · {text.wordCount} words</div>
        <Reader text={text} onSaveWord={() => toast("Word saved to the personal list")} />
      </Card>
      <AiNote icon={Sparkles} tone="sky" title="Reading">Tap any word for its Azerbaijani translation, definition and example — save it and it keeps the sentence it came from.</AiNote>
    </div>
  );
}

function VocabStudent({ content }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const items = content.items || [];
  if (!items.length) return <Card className="p-6 text-slate-400 text-sm">No words yet.</Card>;
  const wd = items[i % items.length];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <SectionLabel>Flashcards · auto-made from these words</SectionLabel>
        <button onClick={() => setFlip((f) => !f)} className="w-full h-44 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center hover:border-indigo-300 transition-colors">
          {flip ? <><span className="text-2xl font-bold text-indigo-600">{wd.az}</span><span className="text-sm text-slate-400 mt-2 italic">“{wd.example}”</span></> : <span className="text-2xl font-bold">{wd.term}</span>}
        </button>
        <div className="flex items-center justify-between mt-3">
          <Btn variant="outline" size="sm" onClick={() => { setI((i - 1 + items.length) % items.length); setFlip(false); }}>Prev</Btn>
          <span className="text-sm text-slate-400 font-mono">{(i % items.length) + 1} / {items.length}</span>
          <Btn variant="outline" size="sm" onClick={() => { setI((i + 1) % items.length); setFlip(false); }}>Next</Btn>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><RefreshCw size={12} /> Tap to flip. A quiz is generated from the same list.</p>
      </div>
      <div>
        <SectionLabel>Word list</SectionLabel>
        <Card className="divide-y divide-slate-100">
          {items.map((w) => (
            <div key={w.term} className="p-3.5">
              <div className="flex items-center gap-2"><b>{w.term}</b><span className="text-indigo-600 text-sm">{w.az}</span></div>
              <div className="text-sm text-slate-500">{w.def}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function CardsStudent({ content }) {
  const { toast } = useStore();
  const mode = content.mode || "az";
  const pairs = (content.pairs || []).slice(0, 5);
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
    <div>
      <SectionLabel>Match {showEmoji ? "word → picture" : "word → Azerbaijani"}</SectionLabel>
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
    </div>
  );
}

function ThemeGroup({ pairs }) {
  return (
    <div>
      <SectionLabel>Group the words by theme (drag in the real app)</SectionLabel>
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
    </div>
  );
}

function GrammarStudent({ content }) {
  return (
    <Card className="p-6">
      {content.kind === "timeline" ? <TenseTimeline /> : (
        <div>
          <div className="mb-3"><RoleLegend /></div>
          <ColorSentence tokens={content.sentence || []} />
          <p className="text-xs text-slate-400 mt-3">Same colour, same grammar role — everywhere in the app.</p>
        </div>
      )}
    </Card>
  );
}

function PracticeStudent({ content }) {
  const items = content.items || [];
  return (
    <div className="space-y-4 max-w-xl">
      {items.map((it, i) => <GapFill key={i} item={it} n={i + 1} total={items.length} />)}
    </div>
  );
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
      {!checked ? (
        <Btn size="sm" onClick={() => setChecked(true)} disabled={!val.trim()}>Check</Btn>
      ) : (
        <AiNote icon={ok ? Check : RotateCcw} tone={ok ? "emerald" : "amber"}>
          {ok ? "Düzdür! (Correct!)" : <>Az qaldı — düzgün cavab: <b>{item.answer}</b>. {item.why} <button onClick={() => { setChecked(false); setVal(""); }} className="underline ml-1">Yenidən cəhd et</button></>}
        </AiNote>
      )}
    </Card>
  );
}

function TestStudent({ content }) {
  const items = content.items || [];
  return (
    <div className="space-y-4 max-w-xl">
      {items.map((it, i) => <TestQ key={i} item={it} n={i + 1} total={items.length} />)}
    </div>
  );
}

function TestQ({ item, n, total }) {
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
      {pick != null && (
        <div className="mt-3"><AiNote icon={correct ? Check : RotateCcw} tone={correct ? "emerald" : "amber"}>
          {correct ? "Düzdür!" : "No lost life — just retry."} {item.why}
        </AiNote></div>
      )}
    </Card>
  );
}

function MediaStudent({ content, kind }) {
  const [replays, setReplays] = useState(0);
  const [showT, setShowT] = useState(false);
  return (
    <div className="max-w-2xl">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
          <button onClick={() => setReplays((r) => r + 1)} className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-900">
            {kind === "video" ? <Play size={26} className="ml-1" /> : <Volume2 size={26} />}
          </button>
          <span className="absolute bottom-3 right-3 text-xs text-white/80 font-mono">{content.duration}</span>
        </div>
        <div className="p-4">
          <div className="font-semibold">{content.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{kind === "video" ? "Subtitled" : `Audio · replays: ${replays}`}</div>
          <button onClick={() => setShowT((s) => !s)} className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-flex items-center gap-1">{showT ? "Hide" : "Show"} transcript <ChevronRight size={13} className={showT ? "rotate-90 transition-transform" : "transition-transform"} /></button>
          {showT && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{content.transcript}</p>}
        </div>
      </Card>
    </div>
  );
}

function ScenarioStudent({ content }) {
  const [revealed, setRevealed] = useState({});
  return (
    <div className="max-w-xl">
      <AiNote icon={Sparkles} tone="teal" title="Real situation">{content.situation}</AiNote>
      <div className="space-y-3 mt-4">
        {(content.turns || []).map((t, i) => (
          <div key={i}>
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-3 text-sm text-slate-700 max-w-[85%]">{t.prompt}</div>
            <div className="flex justify-end mt-1.5">
              {revealed[i] ? (
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 text-sm max-w-[85%]">{t.sample}</div>
              ) : (
                <button onClick={() => setRevealed((r) => ({ ...r, [i]: true }))} className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-full px-3 py-1.5">Your turn — show a sample reply</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">Speaking is practised with your teacher — the app never grades speech.</p>
    </div>
  );
}

function HomeworkStudent({ content }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const count = text.trim() ? text.trim().split(/[.!?]+/).filter((x) => x.trim()).length : 0;
  return (
    <div className="max-w-xl">
      <Card className="p-5">
        <div className="font-semibold mb-1">Homework</div>
        <p className="text-slate-600 text-sm mb-3">{content.prompt}</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={sent} className={`${inputCls} h-28 resize-none`} placeholder="Write here…" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400 font-mono">{count}/{content.minSentences} sentences</span>
          {sent ? <Pill className="bg-amber-50 text-amber-700">Sent — waiting for teacher review</Pill>
            : <Btn size="sm" disabled={count < content.minSentences} onClick={() => setSent(true)}><Send size={13} /> Submit</Btn>}
        </div>
      </Card>
      <p className="text-xs text-slate-400 mt-2">You review it before it's marked done.</p>
    </div>
  );
}

/* ============================== editors ============================== */

function PartEditor({ type, content, update }) {
  switch (type) {
    case "passage":   return <PassageEditor content={content} update={update} />;
    case "words":     return <ListEditor content={content} update={update} fields={[["term", "Word"], ["az", "Azerbaijani"], ["def", "Definition"], ["example", "Example"]]} blank={{ term: "", az: "", def: "", example: "" }} label="word" />;
    case "cards":     return <CardsEditor content={content} update={update} />;
    case "grammar":   return <GrammarEditor content={content} update={update} />;
    case "practice":  return <ListEditor content={content} update={update} fields={[["text", "Sentence (use ___ for the gap)"], ["answer", "Answer"], ["why", "Why (Azerbaijani)"]]} blank={{ text: "", answer: "", why: "" }} label="item" />;
    case "test":      return <TestEditor content={content} update={update} />;
    case "video":     return <MediaEditor content={content} update={update} />;
    case "listening": return <MediaEditor content={content} update={update} />;
    case "scenario":  return <ScenarioEditor content={content} update={update} />;
    case "homework":  return <HomeworkEditor content={content} update={update} />;
    default:          return null;
  }
}

function PassageEditor({ content, update }) {
  const { state } = useStore();
  return (
    <Card className="p-5 max-w-xl">
      <Field label="Reading text (from Library)">
        <select className={inputCls} value={content.textId || ""} onChange={(e) => update({ textId: e.target.value })}>
          {state.texts.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.topic} · {t.level}</option>)}
        </select>
      </Field>
      <p className="text-sm text-slate-400">Add more texts in the Library. Each word becomes tappable automatically.</p>
    </Card>
  );
}

// generic add/edit/remove list editor for row-of-fields content
function ListEditor({ content, update, fields, blank, label }) {
  const items = content.items || [];
  const setItem = (i, k, v) => update({ items: items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) });
  const add = () => update({ items: [...items, { ...blank }] });
  const remove = (i) => update({ items: items.filter((_, j) => j !== i) });
  return (
    <div className="space-y-3 max-w-2xl">
      {items.map((it, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-400">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(([k, lbl]) => (
              <label key={k} className={`block ${k === "text" || k === "def" || k === "example" || k === "why" ? "sm:col-span-2" : ""}`}>
                <span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">{lbl}</span>
                <input className={`${inputCls} mt-1`} value={it[k] || ""} onChange={(e) => setItem(i, k, e.target.value)} />
              </label>
            ))}
          </div>
        </Card>
      ))}
      <Btn variant="outline" size="sm" onClick={add}><Plus size={14} /> Add {label}</Btn>
    </div>
  );
}

function CardsEditor({ content, update }) {
  const pairs = content.pairs || [];
  const setPair = (i, k, v) => update({ pairs: pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Match mode">
        <div className="flex gap-2">
          {[["az", "Word → Azerbaijani"], ["picture", "Word → picture"], ["theme", "Group by theme"]].map(([id, lbl]) => (
            <button key={id} onClick={() => update({ mode: id })} className={`text-sm rounded-lg px-3 py-1.5 border ${content.mode === id ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-500"}`}>{lbl}</button>
          ))}
        </div>
      </Field>
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <Card key={i} className="p-3 flex items-center gap-3">
            <input className={`${inputCls} flex-1`} value={p.term} onChange={(e) => setPair(i, "term", e.target.value)} placeholder="word" />
            <input className={`${inputCls} flex-1`} value={p.az} onChange={(e) => setPair(i, "az", e.target.value)} placeholder="azerbaijani" />
            <input className={`${inputCls} w-16 text-center`} value={p.emoji} onChange={(e) => setPair(i, "emoji", e.target.value)} placeholder="🙂" />
            <button onClick={() => update({ pairs: pairs.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
          </Card>
        ))}
        <Btn variant="outline" size="sm" onClick={() => update({ pairs: [...pairs, { term: "", az: "", emoji: "🙂" }] })}><Plus size={14} /> Add pair</Btn>
      </div>
    </div>
  );
}

function GrammarEditor({ content, update }) {
  const tokens = content.sentence || [];
  const setTok = (i, k, v) => update({ sentence: tokens.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Block type">
        <div className="flex gap-2">
          {[["timeline", "Tense timeline"], ["sentence", "Colour-coded sentence"]].map(([id, lbl]) => (
            <button key={id} onClick={() => update({ kind: id })} className={`text-sm rounded-lg px-3 py-1.5 border ${content.kind === id ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-500"}`}>{lbl}</button>
          ))}
        </div>
      </Field>
      {content.kind === "timeline" ? (
        <AiNote icon={Sparkles} tone="emerald">The tense timeline is a ready interactive block — no setup needed. Switch to “As student” to try it.</AiNote>
      ) : (
        <div>
          <div className="mb-2"><RoleLegend /></div>
          <div className="space-y-2">
            {tokens.map((t, i) => (
              <Card key={i} className="p-3 flex items-center gap-3">
                <input className={`${inputCls} flex-1`} value={t.w} onChange={(e) => setTok(i, "w", e.target.value)} placeholder="word / phrase" />
                <select className={`${inputCls} w-40`} value={t.role || ""} onChange={(e) => setTok(i, "role", e.target.value)}>
                  {ROLE_KEYS.map((r) => <option key={r} value={r}>{r ? ROLE[r].label : "— no colour —"}</option>)}
                </select>
                <button onClick={() => update({ sentence: tokens.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
              </Card>
            ))}
            <Btn variant="outline" size="sm" onClick={() => update({ sentence: [...tokens, { w: "", role: "" }] })}><Plus size={14} /> Add word</Btn>
          </div>
          <div className="mt-4"><SectionLabel>Live preview</SectionLabel><Card className="p-4"><ColorSentence tokens={tokens} /></Card></div>
        </div>
      )}
    </div>
  );
}

function TestEditor({ content, update }) {
  const items = content.items || [];
  const setItem = (i, patch) => update({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3 max-w-2xl">
      {items.map((it, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-400">Q{i + 1}</span>
            <button onClick={() => update({ items: items.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
          <input className={`${inputCls} mb-2`} value={it.q} onChange={(e) => setItem(i, { q: e.target.value })} placeholder="Question" />
          <div className="space-y-1.5 mb-2">
            {it.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button onClick={() => setItem(i, { answer: oi })} className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${it.answer === oi ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}>{it.answer === oi && <Check size={12} />}</button>
                <input className={inputCls} value={o} onChange={(e) => setItem(i, { options: it.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
              </div>
            ))}
          </div>
          <input className={inputCls} value={it.why} onChange={(e) => setItem(i, { why: e.target.value })} placeholder="Why (Azerbaijani) — shown as feedback" />
        </Card>
      ))}
      <Btn variant="outline" size="sm" onClick={() => update({ items: [...items, { q: "", options: ["", "", ""], answer: 0, why: "" }] })}><Plus size={14} /> Add question</Btn>
      <p className="text-xs text-slate-400">Tap the circle to mark the correct answer. Feedback shows immediately, in Azerbaijani.</p>
    </div>
  );
}

function MediaEditor({ content, update }) {
  return (
    <Card className="p-5 max-w-xl">
      <Field label="Title"><input className={inputCls} value={content.title} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Duration"><input className={inputCls} value={content.duration} onChange={(e) => update({ duration: e.target.value })} /></Field>
      <Field label="Transcript"><textarea className={`${inputCls} h-28 resize-none`} value={content.transcript} onChange={(e) => update({ transcript: e.target.value })} /></Field>
    </Card>
  );
}

function ScenarioEditor({ content, update }) {
  const turns = content.turns || [];
  const setTurn = (i, k, v) => update({ turns: turns.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-4"><Field label="Situation"><input className={inputCls} value={content.situation} onChange={(e) => update({ situation: e.target.value })} /></Field></Card>
      {turns.map((t, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-slate-400">Turn {i + 1}</span>
            <button onClick={() => update({ turns: turns.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
          <label className="block mb-2"><span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Prompt (the other person)</span><input className={`${inputCls} mt-1`} value={t.prompt} onChange={(e) => setTurn(i, "prompt", e.target.value)} /></label>
          <label className="block"><span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Sample reply</span><input className={`${inputCls} mt-1`} value={t.sample} onChange={(e) => setTurn(i, "sample", e.target.value)} /></label>
        </Card>
      ))}
      <Btn variant="outline" size="sm" onClick={() => update({ turns: [...turns, { prompt: "", sample: "" }] })}><Plus size={14} /> Add turn</Btn>
    </div>
  );
}

function HomeworkEditor({ content, update }) {
  return (
    <Card className="p-5 max-w-xl">
      <Field label="Prompt"><textarea className={`${inputCls} h-24 resize-none`} value={content.prompt} onChange={(e) => update({ prompt: e.target.value })} /></Field>
      <Field label="Minimum sentences"><input type="number" className={`${inputCls} w-24`} value={content.minSentences} onChange={(e) => update({ minSentences: Number(e.target.value) || 1 })} /></Field>
    </Card>
  );
}
