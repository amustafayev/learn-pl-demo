import React, { useState } from "react";
import {
  Home, BookOpen, Layers, Shapes, Activity, Users, Flame, Zap,
  Volume2, Check, Plus, ChevronRight, Brain, Target, AlertTriangle,
  TrendingUp, Sparkles, GraduationCap, Bookmark, Clock, RotateCcw
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, Tooltip
} from "recharts";

/* ----------------------------- mock data ----------------------------- */

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "read", label: "Read", icon: BookOpen },
  { id: "vocab", label: "Vocabulary", icon: Layers },
  { id: "grammar", label: "Visual grammar", icon: Shapes },
  { id: "insights", label: "AI insights", icon: Activity },
  { id: "teacher", label: "Teacher", icon: Users },
];

// reading passage tokens. status: new | learning | known | plain
const PASSAGE = [
  ["In", "plain"], ["this", "plain"], ["morning's", "plain"], ["standup", "new", true],
  [",", "punct"], ["I", "plain"], ["explained", "known"], ["that", "plain"],
  ["I", "plain"], ["had", "plain"], ["deployed", "new", true], ["the", "plain"],
  ["patch", "learning", true], ["to", "plain"], ["staging", "learning", true],
  [",", "punct"], ["but", "plain"], ["the", "plain"], ["service", "plain"],
  ["kept", "plain"], ["crashing", "new", true], [".", "punct"],
  ["We", "plain"], ["still", "plain"], ["need", "plain"], ["to", "plain"],
  ["reproduce", "new", true], ["the", "plain"], ["root", "plain"], ["cause", "known"],
  ["before", "plain"], ["the", "plain"], ["next", "plain"], ["rollback", "new", true], [".", "punct"],
];

const DICT = {
  standup: { tr: "gündəlik komanda görüşü", def: "A short daily team meeting where members share progress.", ex: "Every standup starts at 9 a.m." },
  deployed: { tr: "yerləşdirmək / işə salmaq", def: "Released code to a server so it runs live.", ex: "We deployed the fix last night." },
  patch: { tr: "yamaq / düzəliş", def: "A small update that fixes a problem in software.", ex: "The patch closed the security hole." },
  staging: { tr: "sınaq mühiti", def: "A test environment that mirrors production.", ex: "Test it on staging first." },
  crashing: { tr: "çökmək", def: "Stopping working suddenly and unexpectedly.", ex: "The app keeps crashing on launch." },
  reproduce: { tr: "təkrar yaratmaq", def: "To make a bug happen again on purpose.", ex: "I can't reproduce the error." },
  rollback: { tr: "geri qaytarma", def: "Returning software to a previous working version.", ex: "We did a rollback after the outage." },
};

const SAVED_WORDS = [
  { w: "deploy", tr: "yerləşdirmək", status: "learning" },
  { w: "reproduce", tr: "təkrar yaratmaq", status: "weak" },
  { w: "rollback", tr: "geri qaytarma", status: "learning" },
  { w: "crash", tr: "çökmək", status: "strong" },
  { w: "patch", tr: "yamaq", status: "learning" },
  { w: "root cause", tr: "əsas səbəb", status: "strong" },
];

const TENSES = {
  past:   { label: "Past simple",        left: 16, width: 16, dot: true,  sent: ["I ", ["fixed", "v"], " the bug."],        why: "A finished action at one point in the past." },
  pres:   { label: "Present simple",     left: 50, width: 150, dot: false, sent: ["I ", ["fix", "v"], " bugs every day."],     why: "A habit or general truth, repeated over time." },
  cont:   { label: "Present continuous", left: 50, width: 44, dot: false, sent: ["I ", ["am fixing", "v"], " the bug."],       why: "Happening right now, still going on." },
  perf:   { label: "Present perfect",    left: 33, width: 46, dot: false, sent: ["I ", ["have fixed", "v"], " the bug."],      why: "Started in the past, still connected to now." },
  fut:    { label: "Future simple",      left: 84, width: 16, dot: true,  sent: ["I ", ["will fix", "v"], " the bug."],        why: "A decision or action still to come." },
};

const SENTENCE = [
  ["The", "fn"], ["developer", "subject"], ["quickly", "modifier"],
  ["fixed", "verb"], ["the", "fn"], ["critical", "modifier"], ["bug", "object"],
];
const ROLE_INFO = {
  subject: { name: "subject", desc: "who does the action", cls: "bg-sky-100 text-sky-700" },
  verb: { name: "verb", desc: "the action itself", cls: "bg-emerald-100 text-emerald-700" },
  object: { name: "object", desc: "what the action is done to", cls: "bg-amber-100 text-amber-700" },
  modifier: { name: "modifier", desc: "describes how, or which kind", cls: "bg-violet-100 text-violet-700" },
  fn: { name: "function word", desc: "glue that points to a noun", cls: "bg-slate-100 text-slate-500" },
};

const RADAR = [
  { concept: "Articles", mastery: 42 },
  { concept: "Present perfect", mastery: 58 },
  { concept: "Prepositions", mastery: 74 },
  { concept: "Phrasal verbs", mastery: 55 },
  { concept: "Word order", mastery: 83 },
  { concept: "Tenses", mastery: 68 },
];

const ACTIVITY = [
  { d: "Mon", words: 8 }, { d: "Tue", words: 14 }, { d: "Wed", words: 6 },
  { d: "Thu", words: 19 }, { d: "Fri", words: 11 }, { d: "Sat", words: 22 }, { d: "Sun", words: 15 },
];

const STUCK = [
  { concept: "Present perfect vs past simple", detail: "5 of 7 recent mistakes", icon: RotateCcw },
  { concept: "Dropping articles (a / the)", detail: "Native-language interference", icon: AlertTriangle },
  { concept: "Grammar page: conditionals", detail: "Re-opened 4 times, 6 min average", icon: Clock },
];

const CLASS = [
  { name: "Rashad", cells: [80, 55, 40, 70, 85] },
  { name: "Nigar", cells: [60, 75, 65, 50, 90] },
  { name: "Elvin", cells: [45, 40, 55, 60, 70] },
  { name: "Leyla", cells: [90, 85, 80, 75, 95] },
];
const CLASS_CONCEPTS = ["Articles", "Perfect", "Prepos.", "Phrasal", "Order"];

/* ----------------------------- helpers ----------------------------- */

function statusDot(status) {
  const map = { strong: "bg-emerald-500", learning: "bg-amber-500", weak: "bg-rose-500" };
  return map[status] || "bg-slate-300";
}
function heat(v) {
  if (v >= 80) return "bg-emerald-500 text-white";
  if (v >= 65) return "bg-emerald-300 text-emerald-900";
  if (v >= 50) return "bg-amber-300 text-amber-900";
  return "bg-rose-300 text-rose-900";
}

/* ----------------------------- shell ----------------------------- */

export default function App() {
  const [view, setView] = useState("home");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* sidebar */}
      <aside className="w-16 sm:w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <span className="hidden sm:block font-bold tracking-tight text-lg">Lucid</span>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => {
            const A = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <A size={18} className="shrink-0" />
                <span className="hidden sm:block">{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="hidden sm:block p-4 border-t border-slate-100 text-xs text-slate-400">Prototype · mock data</div>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5 sm:p-8">
          {view === "home" && <HomeView go={setView} />}
          {view === "read" && <ReadView />}
          {view === "vocab" && <VocabView />}
          {view === "grammar" && <GrammarView />}
          {view === "insights" && <InsightsView />}
          {view === "teacher" && <TeacherView />}
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-end gap-4 px-5 sm:px-8">
      <Pill icon={Flame} color="text-amber-500" value="12" label="day streak" />
      <Pill icon={Zap} color="text-indigo-600" value="2,450" label="XP" />
      <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">R</div>
    </header>
  );
}
function Pill({ icon: I, color, value, label }) {
  return (
    <div className="flex items-center gap-2">
      <I size={18} className={color} />
      <div className="leading-none">
        <div className="font-mono font-semibold text-sm">{value}</div>
        <div className="text-[11px] text-slate-400 hidden sm:block">{label}</div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, sub }) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">{eyebrow}</div>}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 ${className}`}>{children}</div>;
}

/* ----------------------------- HOME ----------------------------- */

function HomeView({ go }) {
  return (
    <div className="max-w-5xl">
      <SectionTitle eyebrow="Good to see you" title="Welcome back, Rashad" sub="IT English · Level B1 → B2" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Continue your path</div>
            <div className="text-xl font-bold mb-1">Talking about a bug in standup</div>
            <div className="text-slate-500 text-sm mb-4">Lesson 3 of 8 · Reading + vocabulary + grammar</div>
            <button onClick={() => go("read")} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5">
              Continue lesson <ChevronRight size={16} />
            </button>
          </div>
          <Ring pct={70} />
        </Card>

        <Card className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">This week's focus</div>
          <div className="flex items-start gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><Brain size={16} /></div>
            <p className="text-sm text-slate-600">Your AI coach noticed you mix up <b>present perfect</b> and <b>past simple</b>.</p>
          </div>
          <ul className="space-y-2 text-sm">
            {["Review 6 weak words", "Try the present-perfect timeline", "Read one IT article"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-slate-700"><Target size={14} className="text-indigo-500" /> {t}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value="312" label="words known" tone="text-emerald-600" />
        <Stat value="48" label="words learning" tone="text-amber-600" />
        <Stat value="12" label="day streak" tone="text-indigo-600" />
        <Stat value="B1+" label="current level" tone="text-slate-900" />
      </div>
    </div>
  );
}
function Stat({ value, label, tone }) {
  return (
    <Card className="p-5">
      <div className={`font-mono text-3xl font-bold ${tone}`}>{value}</div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </Card>
  );
}
function Ring({ pct }) {
  const r = 44, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#4f46e5" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold">{pct}%</span>
        <span className="text-[11px] text-slate-400">today</span>
      </div>
    </div>
  );
}

/* ----------------------------- READ ----------------------------- */

function ReadView() {
  const [active, setActive] = useState(null);
  const [saved, setSaved] = useState([]);
  const entry = active && DICT[active.toLowerCase()];

  return (
    <div className="max-w-5xl">
      <SectionTitle eyebrow="Reading" title="Talking about a bug in standup" sub="Tap any word to understand it. Saved words turn up later for review." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-7">
          <p className="text-lg leading-loose">
            {PASSAGE.map((t, i) => {
              const [text, status, hasEntry] = t;
              if (status === "punct") return <span key={i}>{text} </span>;
              const base = "cursor-pointer rounded px-1 -mx-0.5 transition-colors hover:bg-indigo-50";
              const tone =
                status === "new" ? "bg-indigo-100 text-indigo-800" :
                status === "learning" ? "border-b-2 border-amber-400" :
                "";
              return (
                <span key={i} onClick={() => setActive(text)} className={`${base} ${tone}`}>{text}</span>
              );
            }).reduce((a, el) => [a, " ", el])}
          </p>
          <div className="flex gap-4 mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400">
            <Legend cls="bg-indigo-100" label="new" />
            <Legend cls="border-b-2 border-amber-400" label="learning" />
            <Legend cls="" label="known" />
          </div>
        </Card>

        <Card className="p-6 h-fit">
          {!active && <div className="text-slate-400 text-sm text-center py-10">Tap a highlighted word to open it.</div>}
          {active && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{active}</h3>
                <button className="text-slate-400 hover:text-indigo-600"><Volume2 size={18} /></button>
              </div>
              {entry ? (
                <>
                  <div className="mt-3 mb-4 inline-flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">AZ</span>
                    <span className="font-medium">{entry.tr}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{entry.def}</p>
                  <p className="text-sm text-slate-400 italic mb-5">"{entry.ex}"</p>
                  <button
                    onClick={() => !saved.includes(active) && setSaved([...saved, active])}
                    disabled={saved.includes(active)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2.5 ${
                      saved.includes(active) ? "bg-emerald-50 text-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {saved.includes(active) ? <><Check size={16} /> Saved</> : <><Plus size={16} /> Save word</>}
                  </button>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No dictionary entry in this demo — try <b>standup</b>, <b>deployed</b>, <b>patch</b>, or <b>rollback</b>.</p>
              )}
            </div>
          )}
          {saved.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Saved this session · {saved.length}</div>
              <div className="flex flex-wrap gap-1.5">
                {saved.map((s) => <span key={s} className="text-xs bg-slate-100 rounded-md px-2 py-1">{s}</span>)}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
function Legend({ cls, label }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`inline-block w-4 h-3 rounded ${cls || "bg-white border border-slate-200"}`} /> {label}</span>;
}

/* ----------------------------- VOCAB ----------------------------- */

function VocabView() {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const card = SAVED_WORDS[i];
  const next = () => { setFlip(false); setI((i + 1) % SAVED_WORDS.length); };

  return (
    <div className="max-w-5xl">
      <SectionTitle eyebrow="Vocabulary" title="Your words" sub="Saved words become flashcards and tests, and come back on a schedule." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* flashcard */}
        <Card className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">Flashcard · {i + 1}/{SAVED_WORDS.length}</div>
          <button
            onClick={() => setFlip(!flip)}
            className="w-full h-48 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 flex flex-col items-center justify-center transition-colors"
          >
            {!flip ? (
              <>
                <div className="text-3xl font-bold">{card.w}</div>
                <div className="text-xs text-slate-400 mt-3">tap to flip</div>
              </>
            ) : (
              <>
                <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1">AZ</div>
                <div className="text-2xl font-semibold text-indigo-600">{card.tr}</div>
              </>
            )}
          </button>
          <div className="flex gap-2 mt-4">
            <button onClick={next} className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-lg py-2.5 text-sm font-semibold">Still learning</button>
            <button onClick={next} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-semibold">I know it</button>
          </div>
        </Card>

        {/* list */}
        <Card className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">All saved · strength</div>
          <ul className="divide-y divide-slate-100">
            {SAVED_WORDS.map((s) => (
              <li key={s.w} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold">{s.w}</div>
                  <div className="text-sm text-slate-400">{s.tr}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusDot(s.status)}`} />
                  <span className="text-xs text-slate-400 w-16 text-right capitalize">{s.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ----------------------------- GRAMMAR ----------------------------- */

function GrammarView() {
  const [tk, setTk] = useState("past");
  const [word, setWord] = useState(null);
  const t = TENSES[tk];

  return (
    <div className="max-w-5xl">
      <SectionTitle eyebrow="Visual grammar · your signature" title="See grammar, don't memorize it" sub="Two interactive blocks. Same color always means the same role." />

      {/* tense timeline */}
      <Card className="p-7 mb-5">
        <div className="text-sm font-semibold mb-4">Verb tenses on a timeline</div>
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(TENSES).map(([k, v]) => (
            <button key={k} onClick={() => setTk(k)}
              className={`text-sm rounded-lg px-3 py-1.5 border ${tk === k ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="relative h-20 mx-2 mb-4">
          <div className="absolute left-0 right-0 bg-slate-200" style={{ top: 38, height: 2 }} />
          {[["past", 16], ["now", 50], ["future", 84]].map(([lbl, x]) => (
            <React.Fragment key={lbl}>
              <div className="absolute rounded-full bg-slate-300" style={{ top: 34, left: `${x}%`, width: 10, height: 10, transform: "translate(-50%,0)" }} />
              <div className="absolute text-xs text-slate-400" style={{ top: 50, left: `${x}%`, transform: "translateX(-50%)" }}>{lbl}</div>
            </React.Fragment>
          ))}
          <div className="absolute bg-indigo-500 transition-all duration-300" style={{ top: 33, left: `${t.left}%`, width: t.width, height: 14, borderRadius: 8, transform: "translate(-50%,0)" }} />
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xl">
            {t.sent.map((s, i) => Array.isArray(s)
              ? <b key={i} className="text-emerald-600">{s[0]}</b>
              : <span key={i}>{s}</span>)}
          </p>
          <p className="text-sm text-slate-500 mt-1">{t.why}</p>
        </div>
      </Card>

      {/* sentence anatomy */}
      <Card className="p-7">
        <div className="text-sm font-semibold mb-4">Sentence anatomy — tap a word for its job</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {SENTENCE.map((s, i) => {
            const info = ROLE_INFO[s[1]];
            return (
              <button key={i} onClick={() => setWord({ w: s[0], ...info })} className={`text-lg rounded-lg px-3 py-1.5 ${info.cls}`}>{s[0]}</button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.values(ROLE_INFO).map((r) => (
            <span key={r.name} className={`text-xs rounded-md px-2 py-1 ${r.cls}`}>{r.name}</span>
          ))}
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-sm min-h-[3rem] flex items-center">
          {word ? <span><b>{word.w}</b> — {word.name} ({word.desc})</span> : <span className="text-slate-400">Tap a word above.</span>}
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------- INSIGHTS ----------------------------- */

function InsightsView() {
  return (
    <div className="max-w-5xl">
      <SectionTitle eyebrow="AI insights · your standout" title="Where you're stuck, and where you're winning" sub="Built from how you actually learn — not just right/wrong answers." />

      {/* weekly summary */}
      <Card className="p-6 mb-5 border-indigo-200 bg-indigo-50">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0"><Sparkles size={18} /></div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">Weekly summary</div>
            <p className="text-slate-700">
              This week you learned <b>24 new words</b> and mastered <b>15</b> — strong progress on IT vocabulary.
              <b> Present perfect vs past simple</b> is still tripping you up (5 of 7 mistakes). Focus next:
              review 6 weak words and try the present-perfect timeline.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* confusion radar */}
        <Card className="p-6">
          <div className="text-sm font-semibold mb-1">Confusion radar</div>
          <div className="text-xs text-slate-400 mb-2">Mastery by grammar concept (%)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR} outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="concept" tick={{ fontSize: 11, fill: "#64748b" }} />
                <Radar dataKey="mastery" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* activity */}
        <Card className="p-6">
          <div className="text-sm font-semibold mb-1">Words learned</div>
          <div className="text-xs text-slate-400 mb-2">Last 7 days</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ACTIVITY} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="words" stroke="#4f46e5" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* stuck points */}
        <Card className="p-6">
          <div className="text-sm font-semibold mb-4">Stuck points</div>
          <ul className="space-y-3">
            {STUCK.map((s) => {
              const I = s.icon;
              return (
                <li key={s.concept} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><I size={16} /></div>
                  <div>
                    <div className="text-sm font-medium">{s.concept}</div>
                    <div className="text-xs text-slate-400">{s.detail}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* L1 interference — the differentiator */}
        <Card className="p-6 border-violet-200 bg-violet-50">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={18} className="text-violet-600" />
            <div className="text-sm font-semibold text-violet-900">Native-language insight</div>
          </div>
          <p className="text-sm text-violet-900/80 mb-3">
            You often drop <b>a / an / the</b>. That's expected — Azerbaijani has no articles, so your first language
            gives you no habit to lean on here.
          </p>
          <div className="bg-white rounded-lg p-3 text-sm">
            <span className="line-through text-slate-400">I deployed patch to server.</span><br />
            <span className="text-emerald-700 font-medium">I deployed <b>the</b> patch to <b>the</b> server.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ----------------------------- TEACHER ----------------------------- */

function TeacherView() {
  return (
    <div className="max-w-5xl">
      <SectionTitle eyebrow="Teacher · the loop" title="Walk in knowing exactly where they're stuck" sub="The AI drafts; you decide. Speaking stays with you." />

      {/* pre-lesson brief */}
      <Card className="p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold">R</div>
            <div>
              <div className="font-bold">Rashad · pre-lesson brief</div>
              <div className="text-xs text-slate-400">IT English · B1 → B2 · next session in 2h</div>
            </div>
          </div>
          <GraduationCap className="text-indigo-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Brief icon={AlertTriangle} tone="rose" title="Stuck on" body="Present perfect vs past simple" />
          <Brief icon={TrendingUp} tone="emerald" title="Ready to advance" body="IT vocabulary (deploy, rollback)" />
          <Brief icon={Clock} tone="amber" title="Watch" body="No practice in 4 days" />
        </div>
        <div className="mt-4 bg-indigo-50 rounded-lg p-3 text-sm text-indigo-900">
          <b>Suggested focus:</b> spend the session on present-perfect in real sentences; skip vocabulary he already knows.
        </div>
      </Card>

      {/* class heatmap */}
      <Card className="p-6">
        <div className="text-sm font-semibold mb-4">Class heatmap — who struggles with what</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs">
                <th className="text-left font-medium pb-2 pr-3">Student</th>
                {CLASS_CONCEPTS.map((c) => <th key={c} className="font-medium pb-2 px-1 text-center">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {CLASS.map((s) => (
                <tr key={s.name}>
                  <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                  {s.cells.map((v, i) => (
                    <td key={i} className="px-1 py-1.5">
                      <div className={`h-9 rounded-md flex items-center justify-center font-mono text-xs ${heat(v)}`}>{v}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-slate-400 mt-3">Tip: two students are weak on <b>Articles</b> — worth a group mini-lesson.</div>
      </Card>
    </div>
  );
}
function Brief({ icon: I, tone, title, body }) {
  const tones = {
    rose: "bg-rose-50 text-rose-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tones[tone]}`}><I size={16} /></div>
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-sm font-medium mt-0.5">{body}</div>
    </div>
  );
}
