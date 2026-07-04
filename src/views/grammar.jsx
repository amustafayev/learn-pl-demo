import React, { useState } from "react";
import { Languages, Bookmark, Check, Volume2 } from "lucide-react";
import { ROLE, READ_STATUS, WORD_STATUS } from "../data.jsx";
import { Pill } from "../ui.jsx";

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

/* Router for the grammar part types a teacher can preview. */
export function GrammarBlock({ kind }) {
  if (kind === "timeline") return <TenseTimeline />;
  return (
    <div>
      <div className="mb-3"><RoleLegend /></div>
      <ColorSentence
        tokens={[
          { w: "The team", role: "subject" }, { w: "shipped", role: "verb" }, { w: "the login screen", role: "object" },
          { w: "yesterday", role: "time" }, { w: "in the office", role: "place" }, { w: "." },
        ]}
      />
      <p className="text-xs text-slate-400 mt-3">Same colour, same role — everywhere in the app. Learners build intuition without translating.</p>
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
