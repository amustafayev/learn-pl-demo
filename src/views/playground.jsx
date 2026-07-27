import React, { useMemo, useState } from "react";
import { Sparkles, Star, Check, RotateCcw } from "lucide-react";
import { Card, Btn, Pill, AiNote, SectionLabel } from "../ui.jsx";
import { useStore } from "../store.jsx";

/* =========================================================================
   Playground — free-form vocabulary games outside the lesson pathway,
   straight from the product doc's "Playground section":
     · Word Tower — the doc's signature "building with windows" idea: each
       floor is a categorized word set for a level; windows light up as the
       learner moves words to "known"; open a window and the word appears
       like a little star.
     · Crossword — find-the-word exercise, also reusable as a lesson
       component inside Vocabulary / Practice blocks.
   ========================================================================= */

/* ------------------------------- Word Tower ------------------------------- */

// demo status per word — deterministic stand-in for the learner's real SRS
// status (known / learning / new), so the tower reads the same every visit.
const towerStatus = (i) => (i % 3 === 0 ? "known" : i % 3 === 1 ? "learning" : "new");

const WINDOW_STYLE = {
  known:    "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.8)] border-amber-200",
  learning: "bg-indigo-300/70 border-indigo-200",
  new:      "bg-slate-600 border-slate-500",
};

export function WordTower() {
  const { state } = useStore();
  const [openWin, setOpenWin] = useState(null); // { setId, i }

  // floors sorted easy → hard, rendered top-down so the tower "grows" upward
  const floors = useMemo(() => {
    const order = { A2: 0, B1: 1, B2: 2, C1: 3 };
    return [...state.wordSets].sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
  }, [state.wordSets]);

  const totals = useMemo(() => {
    let lit = 0, all = 0;
    floors.forEach((f) => f.words.forEach((_, i) => { all += 1; if (towerStatus(i) === "known") lit += 1; }));
    return { lit, all };
  }, [floors]);

  const sel = openWin ? floors.find((f) => f.id === openWin.setId)?.words[openWin.i] : null;
  const selStatus = openWin ? towerStatus(openWin.i) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400">Word tower · learner-facing</div>
          <Pill className="bg-amber-50 text-amber-700"><Star size={11} /> {totals.lit}/{totals.all} windows lit</Pill>
        </div>

        <div className="mx-auto" style={{ maxWidth: 380 }}>
          {/* roof */}
          <div className="mx-auto w-0 h-0 border-l-[60px] border-r-[60px] border-b-[34px] border-l-transparent border-r-transparent border-b-slate-700" />
          <div className="bg-slate-800 rounded-b-xl border border-slate-700 overflow-hidden">
            {[...floors].reverse().map((f, fi) => {
              const lit = f.words.filter((_, i) => towerStatus(i) === "known").length;
              const isGround = fi === floors.length - 1;
              return (
                <div key={f.id} className="px-4 py-3 border-b border-slate-700 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-slate-400">{f.title}</span>
                    <span className="text-[10px] font-mono text-slate-500">{f.level} · {lit}/{f.words.length} lit</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    {f.words.map((wd, i) => {
                      const status = towerStatus(i);
                      const isOpen = openWin?.setId === f.id && openWin?.i === i;
                      return (
                        <button key={i} title={wd.term}
                          onClick={() => setOpenWin(isOpen ? null : { setId: f.id, i })}
                          className={`w-8 h-10 rounded-t-md border transition-all ${WINDOW_STYLE[status]} ${isOpen ? "ring-2 ring-amber-300 scale-110 -translate-y-0.5" : "hover:scale-105"}`}>
                          {isOpen && <span className="text-xs">✨</span>}
                        </button>
                      );
                    })}
                    {isGround && <div className="w-10 h-12 rounded-t-lg bg-slate-900 border border-slate-700 ml-auto" title="entrance" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,.8)]" /> known</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-300/70" /> learning</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-600" /> new</span>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {sel ? (
          <Card className="p-5 text-center">
            <div className="text-3xl mb-1">✨</div>
            <div className="text-xl font-bold">{sel.term}</div>
            <div className="text-indigo-600 font-medium mt-0.5">{sel.az}</div>
            <Pill className={`mt-3 ${selStatus === "known" ? "bg-amber-50 text-amber-700" : selStatus === "learning" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
              {selStatus === "known" ? "window lit — known" : selStatus === "learning" ? "flickering — learning" : "dark — not learned yet"}
            </Pill>
          </Card>
        ) : (
          <Card className="p-5 text-sm text-slate-400">Tap a window to open it — the word inside appears like a little star.</Card>
        )}
        <AiNote icon={Sparkles} tone="amber" title="How the tower works">
          Every floor is a word category for a level. As a learner moves words to <b>known</b>, windows light up — the building slowly turns its lights on. A full tower is a finished vocabulary level.
        </AiNote>
      </div>
    </div>
  );
}

/* ------------------------------- Crossword ------------------------------- */

// Naive crossword layout: longest word first, laid horizontally; every next
// word tries to cross an already-placed one at a shared letter; words that
// can't cross go on their own row below. Prototype-grade, deterministic.
function layoutCrossword(items) {
  const entries = (items || [])
    .map((it) => ({ clue: it.clue || "", word: (it.word || "").toUpperCase().replace(/[^A-Z]/g, "") }))
    .filter((e) => e.word.length >= 2)
    .sort((a, b) => b.word.length - a.word.length);
  if (!entries.length) return { cells: [], placed: [], rows: 0, cols: 0 };

  const cells = new Map();
  const placed = [];
  const key = (r, c) => `${r},${c}`;
  const canPlace = (word, r, c, dir) => {
    for (let k = 0; k < word.length; k++) {
      const rr = dir === "h" ? r : r + k, cc = dir === "h" ? c + k : c;
      const existing = cells.get(key(rr, cc));
      if (existing && existing !== word[k]) return false;
    }
    return true;
  };
  const put = (entry, r, c, dir) => {
    for (let k = 0; k < entry.word.length; k++) {
      const rr = dir === "h" ? r : r + k, cc = dir === "h" ? c + k : c;
      cells.set(key(rr, cc), entry.word[k]);
    }
    placed.push({ ...entry, r, c, dir });
  };

  entries.forEach((entry, idx) => {
    if (idx === 0) { put(entry, 0, 0, "h"); return; }
    for (const p of placed) {
      for (let pk = 0; pk < p.word.length; pk++) {
        for (let k = 0; k < entry.word.length; k++) {
          if (p.word[pk] !== entry.word[k]) continue;
          const dir = p.dir === "h" ? "v" : "h";
          const r = p.dir === "h" ? p.r - k : p.r + pk;
          const c = p.dir === "h" ? p.c + pk : p.c - k;
          if (canPlace(entry.word, r, c, dir)) { put(entry, r, c, dir); return; }
        }
      }
    }
    const bottom = Math.max(...placed.map((p) => (p.dir === "v" ? p.r + p.word.length - 1 : p.r)));
    put(entry, bottom + 2, 0, "h");
  });

  // shift everything into positive coordinates
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k of cells.keys()) {
    const [r, c] = k.split(",").map(Number);
    minR = Math.min(minR, r); minC = Math.min(minC, c);
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  }
  const shifted = new Map();
  for (const [k, v] of cells) {
    const [r, c] = k.split(",").map(Number);
    shifted.set(key(r - minR, c - minC), v);
  }
  const placedShifted = placed.map((p) => ({ ...p, r: p.r - minR, c: p.c - minC }));
  // number the word starts in reading order; shared starts share a number
  const startNums = new Map();
  let n = 0;
  [...placedShifted].sort((a, b) => a.r - b.r || a.c - b.c).forEach((p) => {
    const k = key(p.r, p.c);
    if (!startNums.has(k)) startNums.set(k, ++n);
    p.num = startNums.get(k);
  });
  return { cells: shifted, placed: placedShifted, rows: maxR - minR + 1, cols: maxC - minC + 1, startNums };
}

export function Crossword({ items }) {
  const layout = useMemo(() => layoutCrossword(items), [items]);
  const [values, setValues] = useState({});
  const [checked, setChecked] = useState(false);
  if (!layout.placed.length) return <p className="text-sm text-slate-400">Add at least two words (letters only) to build the crossword.</p>;

  const key = (r, c) => `${r},${c}`;
  const total = layout.cells.size;
  const correct = [...layout.cells.entries()].filter(([k, letter]) => (values[k] || "").toUpperCase() === letter).length;
  const allRight = checked && correct === total;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <div className="overflow-x-auto pb-1">
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${layout.cols}, 30px)` }}>
            {Array.from({ length: layout.rows }).map((_, r) =>
              Array.from({ length: layout.cols }).map((_, c) => {
                const letter = layout.cells.get(key(r, c));
                if (!letter) return <div key={key(r, c)} className="w-[30px] h-[30px]" />;
                const val = values[key(r, c)] || "";
                const ok = val.toUpperCase() === letter;
                const num = layout.startNums.get(key(r, c));
                return (
                  <div key={key(r, c)} className="relative">
                    {num && <span className="absolute top-0 left-0.5 text-[7px] font-mono text-slate-400 leading-none z-10">{num}</span>}
                    <input maxLength={1} value={val} aria-label={`cell ${r},${c}`}
                      onChange={(e) => { setValues((v) => ({ ...v, [key(r, c)]: e.target.value })); setChecked(false); }}
                      className={`w-[30px] h-[30px] text-center text-sm font-bold uppercase border rounded focus:outline-none focus:ring-1 focus:ring-lime-400 ${
                        checked ? (ok ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-600") : "border-slate-300 bg-white"}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Btn size="sm" onClick={() => setChecked(true)}>Check</Btn>
          <Btn size="sm" variant="outline" onClick={() => { setValues({}); setChecked(false); }}><RotateCcw size={12} /> Clear</Btn>
          {checked && <span className="text-xs font-mono text-slate-400">{correct}/{total} letters</span>}
        </div>
        {allRight && <div className="mt-3"><AiNote icon={Check} tone="emerald">Bütün sözləri tapdın! Crossword complete 🎉</AiNote></div>}
      </div>
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-2">Clues</div>
        <ol className="space-y-1.5 text-sm text-slate-600 list-none p-0 m-0">
          {layout.placed.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-slate-400 shrink-0">{p.num}{p.dir === "h" ? "→" : "↓"}</span>
              <span>{p.clue || p.word.toLowerCase()} <span className="text-slate-300 font-mono">({p.word.length})</span></span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------- Playground tab ------------------------------- */

const PLAYGROUND_CROSSWORD = [
  { word: "deploy", clue: "Put software onto a server" },
  { word: "release", clue: "A new version made available to users" },
  { word: "merge", clue: "Combine two branches of code" },
  { word: "ship", clue: "Send finished work to users" },
  { word: "bug", clue: "A mistake in the code" },
];

export default function Playground() {
  return (
    <div className="space-y-10">
      <WordTower />
      <div>
        <SectionLabel>Crossword · find the words</SectionLabel>
        <Card className="p-5"><Crossword items={PLAYGROUND_CROSSWORD} /></Card>
        <p className="text-xs text-slate-400 mt-2">Also available as a component inside Vocabulary and Practice blocks — teachers enter words + clues, the grid builds itself.</p>
      </div>
    </div>
  );
}
