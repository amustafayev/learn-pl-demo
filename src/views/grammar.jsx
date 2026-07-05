import React, { useState } from "react";
import { Languages, Bookmark, Check, Volume2, ArrowRight } from "lucide-react";
import { ROLE, READ_STATUS, WORD_STATUS } from "../data.jsx";
import { Pill } from "../ui.jsx";

// Place N items evenly around a circle of the given radius (px), centered on
// a relative container — shared by the conjugation wheel and word web. `deg`
// is in CSS rotate()'s own convention (0 = east, clockwise), so a line drawn
// from the center with transform: rotate(deg) points exactly at the item.
function radial(i, total, radius) {
  const angle = (2 * Math.PI * i) / total - Math.PI / 2;
  return { left: `calc(50% + ${Math.cos(angle) * radius}px)`, top: `calc(50% + ${Math.sin(angle) * radius}px)`, deg: (angle * 180) / Math.PI };
}

/* =========================================================================
   The signature: "grammar is finally visual" + "one colour = one meaning".
   These blocks are what a teacher drops into a lesson as a grammar part.
   ========================================================================= */

/* Colour legend — the fixed grammar-role palette, shown wherever colour is used. */
export function RoleLegend({ roles = Object.keys(ROLE) }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => (
        <span key={r} className={`text-[11px] font-medium border rounded-md px-2 py-0.5 ${ROLE[r].chip}`}>{ROLE[r].label}</span>
      ))}
    </div>
  );
}

/* A sentence where every word is coloured by its grammar role. */
export function ColorSentence({ tokens }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5 text-lg leading-relaxed">
      {tokens.map((t, i) =>
        t.role ? (
          <span key={i} className={`border rounded-md px-1.5 py-0.5 ${ROLE[t.role].chip}`}>{t.w}</span>
        ) : (
          <span key={i} className="text-slate-700">{t.w}</span>
        )
      )}
    </div>
  );
}

/* The tense timeline — past · now · future, with two events placed on it. */
export function TenseTimeline() {
  const [active, setActive] = useState("perfect");
  const events = {
    past: { label: "Past simple", when: "yesterday", pos: 18, color: "bg-amber-500", ring: "ring-amber-200", text: "I shipped the login screen.", note: "Finished. A point in the past — we say when." },
    perfect: { label: "Present perfect", when: "before now", pos: 62, color: "bg-rose-500", ring: "ring-rose-200", text: "I have resolved the payment bug.", note: "Done, but it still matters now — we don't say exactly when." },
  };
  const e = events[active];
  return (
    <div>
      <div className="flex gap-2 mb-5">
        {Object.entries(events).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors ${
              active === k ? `${ROLE.verb.chip} border-current` : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* the line */}
      <div className="relative h-20">
        <div className="absolute top-9 left-0 right-0 h-0.5 bg-slate-200" />
        {/* NOW marker */}
        <div className="absolute top-6 left-[85%] flex flex-col items-center -translate-x-1/2">
          <div className="w-3 h-3 rounded-full bg-slate-900 ring-4 ring-slate-100" />
          <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mt-1">now</span>
        </div>
        <div className="absolute top-1 left-2 text-[10px] font-mono uppercase tracking-wide text-slate-300">past</div>
        <div className="absolute top-1 right-2 text-[10px] font-mono uppercase tracking-wide text-slate-300">future</div>
        {/* event marker */}
        <div className="absolute top-4 flex flex-col items-center -translate-x-1/2 transition-all duration-500" style={{ left: `${e.pos}%` }}>
          <span className={`text-[10px] font-semibold text-white rounded px-1.5 py-0.5 mb-1 ${e.color}`}>{e.when}</span>
          <div className={`w-4 h-4 rounded-full ${e.color} ring-4 ${e.ring}`} />
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-slate-200 p-4">
        <div className="text-slate-800 font-medium">{e.text}</div>
        <p className="text-sm text-slate-500 mt-1.5">{e.note}</p>
      </div>
    </div>
  );
}

/* =========================================================================
   Five more ways to make grammar visual, beyond tenses. Chosen from what
   works across language apps but is almost never done well for grammar:
   spatial prepositions (Murphy's classic box diagrams), a conjugation
   wheel, branching conditional logic, a comparison "ladder", and a
   vocabulary word-web for collocations. Each is a teacher-constructed
   block (see parts.jsx BLOCK_META) with its own editor.
   ========================================================================= */

/* ---- Preposition scene — spatial diagram, tap a preposition to move the object ---- */
export function PrepositionScene({ object = "🐈", anchor = "🗄️", subject = "the cat", place = "the shelf", options, answer }) {
  const opts = options && options.length ? options : ["in", "on", "under", "next to", "behind"];
  const [active, setActive] = useState(opts[0]);
  const [checked, setChecked] = useState(false);
  const POS = {
    in:        { obj: { top: "48%", left: "50%" }, scale: 0.55 },
    on:        { obj: { top: "18%", left: "50%" }, scale: 1 },
    under:     { obj: { top: "82%", left: "50%" }, scale: 1 },
    "next to": { obj: { top: "48%", left: "88%" }, scale: 1 },
    behind:    { obj: { top: "40%", left: "50%" }, scale: 0.7, behind: true },
  };
  const p = POS[active] || POS.on;
  const ok = active === answer;
  return (
    <div>
      <div className="relative h-48 rounded-2xl border border-slate-200 bg-slate-50 mb-4 overflow-hidden">
        {/* the object, moves with the chosen preposition */}
        <span className="absolute text-5xl transition-all duration-500 -translate-x-1/2 -translate-y-1/2"
          style={{ top: p.obj.top, left: p.obj.left, transform: `translate(-50%,-50%) scale(${p.scale})`, zIndex: p.behind ? 0 : 2 }}>{object}</span>
        {/* the anchor object (box / shelf) */}
        <span className="absolute text-6xl -translate-x-1/2 -translate-y-1/2" style={{ top: "50%", left: "50%", zIndex: 1 }}>{anchor}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {opts.map((o) => (
          <button key={o} onClick={() => { setActive(o); setChecked(false); }}
            className={`text-sm rounded-lg px-3 py-1.5 border transition-colors ${active === o ? "border-sky-400 bg-sky-50 text-sky-700 font-semibold" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>{o}</button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3">
        <span className="text-slate-700">{subject} is <b className="text-sky-700">{active}</b> {place}.</span>
        {answer && (checked
          ? <Pill className={ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{ok ? "Düzdür!" : "Try another"}</Pill>
          : <button onClick={() => setChecked(true)} className="text-xs font-semibold text-sky-700 hover:text-sky-800 shrink-0">Check</button>)}
      </div>
    </div>
  );
}

/* ---- Conjugation wheel — pronoun spokes around a verb hub ---- */
export function ConjugationWheel({ verb = "go", tenses }) {
  const T = tenses && Object.keys(tenses).length ? tenses : {
    "Present simple": { I: "go", You: "go", "He/She/It": "goes", We: "go", They: "go" },
    "Past simple": { I: "went", You: "went", "He/She/It": "went", We: "went", They: "went" },
  };
  const tenseNames = Object.keys(T);
  const [tense, setTense] = useState(tenseNames[0]);
  const pronouns = Object.keys(T[tense] || {});
  const [active, setActive] = useState(pronouns[0]);
  const form = T[tense]?.[active] || verb;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {tenseNames.map((t) => (
          <button key={t} onClick={() => setTense(t)} className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors ${tense === t ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>{t}</button>
        ))}
      </div>
      <div className="relative mx-auto" style={{ width: 260, height: 260 }}>
        {pronouns.map((p, i) => {
          const pos = radial(i, pronouns.length, 100);
          const isActive = p === active;
          return (
            <button key={p} onClick={() => setActive(p)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-xs font-semibold rounded-full px-3 py-2 border transition-all ${isActive ? "border-blue-400 bg-blue-600 text-white shadow-md scale-110" : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"}`}
              style={{ left: pos.left, top: pos.top }}>{p}</button>
          );
        })}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-50 border-2 border-blue-200 w-24 h-24 flex items-center justify-center" style={{ left: "50%", top: "50%" }}>
          <span className="font-bold text-blue-800 text-lg text-center px-1">{form}</span>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-3">{active} + <b>{verb}</b> → <b>{form}</b> in {tense.toLowerCase()}</p>
    </div>
  );
}

/* ---- Conditional flow — branching if/then diagram ---- */
const CONDITIONAL_RULE = {
  zero:   "Zero conditional — always true. If + present, present.",
  first:  "First conditional — real possibility. If + present, will + base form.",
  second: "Second conditional — unlikely / imaginary. If + past, would + base form.",
  third:  "Third conditional — impossible now, about the past. If + past perfect, would have + past participle.",
};
export function ConditionalFlow({ type = "first", branches }) {
  const list = branches && branches.length ? branches : [
    { condition: "It rains", result: "we will stay home" },
    { condition: "It doesn't rain", result: "we will go to the beach" },
  ];
  return (
    <div>
      <Pill className="bg-amber-50 text-amber-700 mb-3 capitalize">{type} conditional</Pill>
      <p className="text-xs text-slate-400 mb-4">{CONDITIONAL_RULE[type] || CONDITIONAL_RULE.first}</p>
      <div className="flex flex-col items-center">
        <div className="rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2 font-mono text-xs uppercase tracking-widest text-slate-500 mb-4">IF</div>
        <div className="w-px h-4 bg-slate-300" />
        <div className="w-full space-y-3">
          {list.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">{b.condition}</div>
              <ArrowRight size={16} className="text-slate-300 shrink-0" />
              <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">{b.result}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Comparison ladder — positive → comparative → superlative ---- */
export function ComparisonLadder({ forms, examples }) {
  const F = forms || { positive: "big", comparative: "bigger", superlative: "biggest" };
  const EX = examples || { positive: "A cat is big.", comparative: "A dog is bigger.", superlative: "An elephant is the biggest." };
  const steps = [["positive", "h-14", "bg-emerald-200 text-emerald-900"], ["comparative", "h-20", "bg-emerald-400 text-emerald-950"], ["superlative", "h-28", "bg-emerald-600 text-white"]];
  const [active, setActive] = useState("positive");
  return (
    <div>
      <div className="flex items-end justify-center gap-3 mb-5" style={{ height: 128 }}>
        {steps.map(([key, h, tone]) => (
          <button key={key} onClick={() => setActive(key)} className="flex flex-col items-center gap-1.5 group">
            <span className={`w-20 rounded-t-lg flex items-end justify-center pb-1.5 font-bold text-sm transition-all ${h} ${tone} ${active === key ? "ring-2 ring-offset-2 ring-emerald-400" : "opacity-80 group-hover:opacity-100"}`}>{F[key]}</span>
            <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 capitalize">{key}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 p-3.5 text-center text-slate-700">{EX[active]}</div>
    </div>
  );
}

/* ---- Word web — a central word with radiating collocations ---- */
export function WordWeb({ center = "meeting", branches }) {
  const list = branches && branches.length ? branches : [
    { label: "schedule a meeting" }, { label: "team meeting" }, { label: "cancel a meeting" },
    { label: "attend a meeting" }, { label: "virtual meeting" }, { label: "kick-off meeting" },
  ];
  const [hover, setHover] = useState(null);
  const radius = 110;
  return (
    <div className="relative mx-auto" style={{ width: 320, height: 320 }}>
      {list.map((b, i) => {
        const pos = radial(i, list.length, radius);
        return (
          <div key={i} className="absolute h-px bg-fuchsia-200"
            style={{ left: "50%", top: "50%", width: radius, transformOrigin: "0 50%", transform: `rotate(${pos.deg}deg)` }} />
        );
      })}
      {list.map((b, i) => {
        const pos = radial(i, list.length, radius);
        return (
          <button key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 text-xs font-medium rounded-lg px-2.5 py-1.5 border transition-all whitespace-nowrap ${hover === i ? "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 scale-105" : "border-slate-200 bg-white text-slate-600"}`}
            style={{ left: pos.left, top: pos.top }}>{b.label}</button>
        );
      })}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600 text-white font-bold px-5 py-3 shadow-md" style={{ left: "50%", top: "50%" }}>{center}</div>
    </div>
  );
}


/* =========================================================================
   Reader — tap any word for AZ translation + definition + example, save it.
   Words are coloured on the page by the learner's status (new/learning/known).
   ========================================================================= */

export function Reader({ text, onSaveWord, showStatusColors = true }) {
  const [translate, setTranslate] = useState(true);
  const [open, setOpen] = useState(null); // index of tapped word
  const [saved, setSaved] = useState({});

  return (
    <div>
      <div className="flex items-center flex-wrap gap-3 mb-4 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span className={`w-9 h-5 rounded-full relative transition-colors ${translate ? "bg-indigo-600" : "bg-slate-300"}`}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: translate ? 18 : 2 }} />
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600"><Languages size={14} /> Tap-to-translate</span>
          <input type="checkbox" className="sr-only" checked={translate} onChange={(e) => setTranslate(e.target.checked)} />
        </label>
        {showStatusColors && (
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-200" /> new</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 border-b-2 border-amber-400" /> learning</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100" /> known</span>
          </div>
        )}
      </div>

      <div className="text-[17px] leading-8 text-slate-800">
        {text.body.map((tok, i) => {
          if (!tok.term) return <span key={i}>{tok.text}</span>;
          const statusCls = showStatusColors ? READ_STATUS[tok.status] || "" : "";
          const isSaved = saved[tok.term];
          return (
            <span key={i} className="relative inline-block">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className={`cursor-pointer hover:bg-indigo-50 rounded px-0.5 ${statusCls} ${open === i ? "bg-indigo-100" : ""}`}
              >
                {tok.term}
              </button>
              {open === i && (
                <span className="absolute z-20 left-0 top-full mt-1 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 text-left block">
                  <span className="flex items-center justify-between">
                    <b className="text-slate-900">{tok.term}</b>
                    <button className="text-slate-300 hover:text-slate-500"><Volume2 size={14} /></button>
                  </span>
                  {translate && <span className="block text-indigo-600 font-medium text-sm mt-0.5">{tok.az}</span>}
                  <span className="block text-sm text-slate-600 mt-1.5">{tok.def}</span>
                  <span className="block text-xs text-slate-400 italic mt-1.5">“{tok.example}”</span>
                  <button
                    onClick={() => { setSaved((s) => ({ ...s, [tok.term]: true })); if (onSaveWord) onSaveWord(tok); }}
                    disabled={isSaved}
                    className={`mt-2.5 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 ${
                      isSaved ? "bg-emerald-50 text-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {isSaved ? <><Check size={13} /> Saved with its sentence</> : <><Bookmark size={13} /> Save word</>}
                  </button>
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* small helper reused by student word rows */
export function WordStatusPill({ status }) {
  const s = WORD_STATUS[status] || WORD_STATUS.medium;
  return <Pill className={s.pill}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}</Pill>;
}
