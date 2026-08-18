import React, { useState } from "react";
import {
  BookPlus, Send, Download, ChevronRight, ChevronDown, ArrowLeft, Layers, RefreshCw, Wand2,
  Check, Sparkles, ArrowRight, Trash2, BookmarkCheck, Boxes, Store,
} from "lucide-react";
import { Page, PageHead, Card, Btn, Pill, SectionLabel, AiNote, Modal, Field, inputCls, ComingSoon, SpeakButton } from "../ui.jsx";
import { useStore, groupBankByParent, bankChildLabel, kitContents } from "../store.jsx";
import { HUE, HUE_SOFT, CONFUSED, BLOCK_TYPES } from "../data.jsx";
import { AddTextModal, AssignModal } from "../components/modals.jsx";
import { Reader, RoleLegend, ColorSentence } from "./grammar.jsx";
import Playground from "./playground.jsx";
import { COMPONENT_META } from "./parts.jsx";

export default function Library() {
  const [sub, setSub] = useState("reading");
  const [openText, setOpenText] = useState(null);
  const [openSet, setOpenSet] = useState(null);

  if (openText) return <ReaderPanel textId={openText} back={() => setOpenText(null)} />;
  if (openSet) return <WordSetPanel setId={openSet} back={() => setOpenSet(null)} />;

  return (
    <Page>
      <PageHead kicker="Content library" title="Library" sub="Reading texts, vocabulary sets, and the playground learners explore between lessons." />
      <div className="flex gap-1.5 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {[["reading", "Reading"], ["words", "Word sets"], ["playground", "Playground"], ["bank", "My Blocks"], ["marketplace", "Marketplace"]].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            className={`text-sm font-semibold rounded-lg px-4 py-1.5 transition-colors ${sub === id ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}`}>{label}</button>
        ))}
      </div>
      {sub === "reading" && <ReadingList open={setOpenText} />}
      {sub === "words" && <WordSetsList open={setOpenSet} />}
      {sub === "playground" && <Playground />}
      {sub === "bank" && <MyBlocks />}
      {sub === "marketplace" && (
        <ComingSoon icon={Store} title="Teacher marketplace — coming soon"
          sub="Publish your own ready-to-use reading, playground, and other lesson blocks for other teachers to buy and drop straight into their lessons." />
      )}
    </Page>
  );
}

/* ------------------------------- reading ------------------------------- */

function ReadingList({ open }) {
  const { state } = useStore();
  const [add, setAdd] = useState(false);
  const [own, setOwn] = useState(false);
  return (
    <>
      <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 mb-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0"><Wand2 size={18} /></span>
        <div className="flex-1">
          <div className="font-semibold text-sm text-teal-900">Learn from your own text <Pill className="bg-teal-100 text-teal-700 ml-1">differentiator</Pill></div>
          <p className="text-sm text-teal-900/70">Turn a learner's real Slack message or email into a lesson — corrections, the rule behind each fix, and new words.</p>
        </div>
        <Btn variant="outline" size="sm" onClick={() => setOwn(true)}>Try it <ArrowRight size={14} /></Btn>
      </div>

      <SectionLabel right={<Btn size="sm" onClick={() => setAdd(true)}><BookPlus size={14} /> Add text</Btn>}>Reading texts · grouped by topic & level</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.texts.map((t) => (
          <button key={t.id} onClick={() => open(t.id)} className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
            <div className="flex items-center justify-between mb-3">
              <Pill className="bg-slate-100 text-slate-500 font-mono">{t.topic}</Pill>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
            <div className="font-bold mb-1">{t.title}</div>
            <div className="text-sm text-slate-400">{t.level} · {t.wordCount} words{t.hasTranslation ? " · tappable" : ""}</div>
          </button>
        ))}
      </div>
      <AddTextModal open={add} onClose={() => setAdd(false)} />
      <OwnTextModal open={own} onClose={() => setOwn(false)} />
    </>
  );
}

function ReaderPanel({ textId, back }) {
  const { state, toast } = useStore();
  const [assign, setAssign] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const text = state.texts.find((t) => t.id === textId);
  return (
    <Page>
      <button onClick={back} className="text-sm text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Library</button>
      <PageHead title={text.title} sub={`${text.topic} · ${text.level} · ${text.wordCount} words`}
        right={<div className="flex gap-2">
          <Btn variant="outline" size="sm" onClick={() => toast("Vocabulary list exported (.csv)")}><Download size={14} /> Export vocab</Btn>
          <Btn size="sm" onClick={() => setAssign(true)}><Send size={14} /> Assign</Btn>
        </div>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <Reader text={text} onSaveWord={() => { setSavedCount((c) => c + 1); toast("Word saved to the personal list"); }} />
        </Card>
        <div className="space-y-4">
          <AiNote icon={Sparkles} tone="sky" title="How reading works">
            Tap any word → Azerbaijani translation, definition and an example. Save it (one tap) and it keeps the sentence it came from.
          </AiNote>
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">This session</div>
            <div className="flex items-center justify-between text-sm text-slate-500"><span>Words saved</span><span className="font-mono text-indigo-600 font-bold">{savedCount}</span></div>
            <p className="text-[11px] text-slate-400 mt-2">Words on the page are coloured by the learner's status — new, learning, or known.</p>
          </Card>
        </div>
      </div>
      <AssignModal open={assign} onClose={() => setAssign(false)} what={`Reading: ${text.title}`} kind="reading" />
    </Page>
  );
}

/* ------------------------------- word sets ------------------------------- */

function WordSetsList({ open }) {
  const { state } = useStore();
  return (
    <>
      <SectionLabel>Category word sets</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {state.wordSets.map((ws) => (
          <button key={ws.id} onClick={() => open(ws.id)} className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
            <div className="flex items-center justify-between mb-3">
              <Pill className={HUE_SOFT.indigo}>{ws.category}</Pill>
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Layers size={16} /></span>
            </div>
            <div className="font-bold mb-1">{ws.title}</div>
            <div className="text-sm text-slate-400">{ws.level} · {ws.words.length} words</div>
          </button>
        ))}
      </div>

      <SectionLabel>Commonly confused words</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CONFUSED.map((c) => (
          <Card key={c.a} className="p-4">
            <div className="font-mono text-sm mb-1"><span className="text-rose-600">{c.a}</span> <span className="text-slate-300">vs</span> <span className="text-indigo-600">{c.b}</span></div>
            <p className="text-xs text-slate-500">{c.note}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function WordSetPanel({ setId, back }) {
  const { state, toast } = useStore();
  const [assign, setAssign] = useState(false);
  const [mode, setMode] = useState("flash"); // flash | match | test
  const ws = state.wordSets.find((w) => w.id === setId);
  return (
    <Page>
      <button onClick={back} className="text-sm text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Library</button>
      <PageHead title={ws.title} sub={`${ws.category} · ${ws.level} · ${ws.words.length} words`}
        right={<Btn size="sm" onClick={() => setAssign(true)}><Send size={14} /> Assign set</Btn>} />

      <div className="flex gap-1.5 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[["flash", "Flashcards"], ["match", "Drag & drop"], ["test", "Auto-test"]].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} className={`text-sm font-semibold rounded-lg px-4 py-1.5 ${mode === id ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}`}>{label}</button>
        ))}
      </div>

      {mode === "flash" && <Flashcards words={ws.words} />}
      {mode === "match" && <MatchGame words={ws.words} onDone={() => toast("Matched — encourage, don't punish 🎉")} />}
      {mode === "test" && <AutoTest words={ws.words} />}

      <AssignModal open={assign} onClose={() => setAssign(false)} what={`Word set: ${ws.title}`} kind="vocabulary" />
    </Page>
  );
}

function Flashcards({ words }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const wd = words[i];
  return (
    <div className="max-w-md">
      <div role="button" tabIndex={0} onClick={() => setFlip((f) => !f)} onKeyDown={(e) => e.key === "Enter" && setFlip((f) => !f)}
        className="w-full h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-1.5 hover:border-indigo-300 transition-colors px-6 cursor-pointer">
        {flip ? (
          <>
            {wd.def && <span className="text-base font-medium text-slate-600 text-center">{wd.def}</span>}
            <span className="text-xl font-bold text-indigo-600">({wd.az})</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-bold">{wd.term}</span>
            <SpeakButton text={wd.term} />
          </>
        )}
      </div>
      <div className="flex items-center justify-between mt-4">
        <Btn variant="outline" size="sm" onClick={() => { setI((i - 1 + words.length) % words.length); setFlip(false); }}>Prev</Btn>
        <span className="text-sm text-slate-400 font-mono">{i + 1} / {words.length}</span>
        <Btn variant="outline" size="sm" onClick={() => { setI((i + 1) % words.length); setFlip(false); }}>Next</Btn>
      </div>
      <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><RefreshCw size={12} /> Tap the card to flip. Auto-generated from saved words.</p>
    </div>
  );
}

function MatchGame({ words, onDone }) {
  const pairs = words.slice(0, 4);
  const [azOrder] = useState(() => [...pairs].reverse());
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState({});
  function tryMatch(term, az) {
    const correct = pairs.find((p) => p.term === term).az === az;
    if (correct) {
      const next = { ...done, [term]: true };
      setDone(next); setPicked(null);
      if (Object.keys(next).length === pairs.length && onDone) onDone();
    } else {
      setPicked(null);
    }
  }
  return (
    <div className="grid grid-cols-2 gap-8 max-w-lg">
      <div className="space-y-2">
        <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1">English</div>
        {pairs.map((p) => (
          <button key={p.term} disabled={done[p.term]} onClick={() => setPicked(p.term)}
            className={`w-full rounded-lg border p-3 text-sm font-medium text-left transition-colors ${
              done[p.term] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : picked === p.term ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}>
            {p.term} {done[p.term] && <Check size={13} className="inline text-emerald-600" />}
            {p.def && <span className="block text-xs font-normal text-slate-400 mt-0.5">{p.def}</span>}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1">Azerbaijani</div>
        {azOrder.map((p) => {
          const matched = Object.keys(done).some((t) => pairs.find((x) => x.term === t).az === p.az);
          return (
            <button key={p.az} disabled={matched || !picked} onClick={() => tryMatch(picked, p.az)}
              className={`w-full rounded-lg border p-3 text-sm font-medium text-left transition-colors ${
                matched ? "border-emerald-200 bg-emerald-50 text-emerald-700" : !picked ? "border-slate-100 text-slate-400" : "border-slate-200 hover:border-indigo-300"}`}>
              {p.az}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AutoTest({ words }) {
  const q = words[0];
  const options = [words[0].az, words[1]?.az, words[2]?.az].filter(Boolean);
  const [pick, setPick] = useState(null);
  const correct = pick === q.az;
  return (
    <Card className="p-6 max-w-md">
      <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-2">Auto-generated · question 1 of {words.length}</div>
      <div className="text-lg font-semibold mb-1">What is “{q.term}” in Azerbaijani?</div>
      <p className="text-sm text-slate-400 mb-4 min-h-[1.25rem]">{q.def}</p>
      <div className="space-y-2">
        {options.map((o) => (
          <button key={o} onClick={() => setPick(o)}
            className={`w-full rounded-lg border p-3 text-sm text-left transition-colors ${
              pick == null ? "border-slate-200 hover:border-indigo-300" :
              o === q.az ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
              o === pick ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 opacity-60"}`}>
            {o} {pick != null && o === q.az && <Check size={14} className="inline" />}
          </button>
        ))}
      </div>
      {pick != null && (
        <div className="mt-4">
          <AiNote icon={correct ? Check : RefreshCw} tone={correct ? "emerald" : "amber"}>
            {correct ? "Düzdür! (Correct!) — instant feedback, in Azerbaijani." : "Az qaldı — try again. “" + q.term + "” = “" + q.az + "”. No lost life; just retry."}
          </AiNote>
        </div>
      )}
    </Card>
  );
}

/* the "learn from your own text" differentiator */
function OwnTextModal({ open, onClose }) {
  const [text, setText] = useState("we was discuss the bug yesterday and i have fixed it already");
  const [run, setRun] = useState(false);
  return (
    <Modal open={open} onClose={() => { setRun(false); onClose(); }} wide title="Learn from your own text"
      sub="Paste a real message — the platform turns it into a mini-lesson"
      footer={<><Btn variant="outline" onClick={() => { setRun(false); onClose(); }}>Close</Btn><Btn onClick={() => setRun(true)}><Wand2 size={14} /> Generate lesson</Btn></>}>
      <Field label="The learner's real text"><textarea className={`${inputCls} h-24 resize-none`} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      {run && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1.5">Corrected</div>
            <p className="text-sm bg-emerald-50 rounded-lg p-3 text-emerald-900">“We <b>were</b> <b>discussing</b> the bug yesterday and I <b>fixed</b> it already.”</p>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1.5">The rule behind each fix</div>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
              <li><b>we were</b> — plural subject takes “were”, not “was”.</li>
              <li><b>were discussing</b> — past continuous for an action in progress.</li>
              <li><b>fixed</b> (not “have fixed”) — “yesterday” is a finished time → past simple.</li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1.5">Colour-coded</div>
            <div className="mb-2"><RoleLegend roles={["subject", "verb", "object", "time"]} /></div>
            <ColorSentence tokens={[{ w: "We", role: "subject" }, { w: "were discussing", role: "verb" }, { w: "the bug", role: "object" }, { w: "yesterday", role: "time" }, { w: "." }]} />
          </div>
          <AiNote icon={ArrowRight} tone="violet">New words <b>discuss</b>, <b>already</b> dropped into the learner's vocab list; the past-simple error goes to their practice queue.</AiNote>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------- my blocks (bank) ------------------------------- */

// The teacher's saved, reusable blocks. Save from any lesson (bookmark icon in
// the builder / tree / studio); insert from "Add block → From My Blocks".
// A collapsible "folder" for one parent (course, or "Playground") in the
// bank — used for both saved Blocks and saved Components so both read as
// organized groups instead of one flat pile that only grows over time.
function BankGroup({ parent, count, hue, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-6 last:mb-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 mb-3 group">
        {open ? <ChevronDown size={14} className="text-slate-300 shrink-0" /> : <ChevronRight size={14} className="text-slate-300 shrink-0" />}
        {hue ? <span className={`w-2 h-2 rounded-full shrink-0 ${HUE[hue]}`} /> : <Boxes size={12} className="text-slate-400 shrink-0" />}
        <h3 className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{parent}</h3>
        <Pill className="bg-slate-100 text-slate-500 font-mono">{count}</Pill>
        <div className="flex-1 h-px bg-slate-100" />
      </button>
      {open && children}
    </div>
  );
}

function MyBlocks() {
  const { state, dispatch, toast } = useStore();
  const blockGroups = groupBankByParent(state.blockBank);
  const componentGroups = groupBankByParent(state.componentBank || []);
  const hueFor = (parent) => state.courses.find((c) => c.title === parent)?.hue;

  return (
    <>
      <SectionLabel>Saved blocks · grouped by the course they came from</SectionLabel>
      {blockGroups.length ? blockGroups.map(({ parent, items }) => (
        <BankGroup key={parent} parent={parent} count={items.length} hue={hueFor(parent)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const BT = BLOCK_TYPES[item.type] || {}; const I = BT.icon || BookmarkCheck;
              const comps = item.content?.components || [];
              const child = bankChildLabel(item);
              return (
                <Card key={item.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${BT.tone || "bg-slate-100 text-slate-500"}`}><I size={16} /></span>
                    <button title="Delete from My Blocks"
                      onClick={() => { dispatch({ type: "REMOVE_FROM_BANK", bankId: item.id }); toast(`“${item.title}” removed from My Blocks`); }}
                      className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                  </div>
                  <div className="font-bold mb-0.5">{item.title}</div>
                  <div className="text-xs text-slate-400 mb-3">{BT.label || item.type} block{child ? ` · ${child}` : ""}</div>
                  <div className="flex flex-wrap gap-1">
                    {comps.map((c, i) => (
                      <Pill key={i} className="bg-slate-100 text-slate-500">{COMPONENT_META[c.kind]?.label || c.kind}</Pill>
                    ))}
                    {!comps.length && <span className="text-xs text-slate-400">empty block</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </BankGroup>
      )) : (
        <Card className="p-8 text-center text-sm text-slate-400 mb-8">
          Nothing saved yet — in any lesson, hit the <BookmarkCheck size={13} className="inline mx-0.5" /> bookmark on a block to keep it here for reuse.
        </Card>
      )}

      <div className="mt-8">
        <SectionLabel>Saved components · grouped by the course they came from</SectionLabel>
        {componentGroups.length ? componentGroups.map(({ parent, items }) => (
          <BankGroup key={parent} parent={parent} count={items.length} hue={hueFor(parent)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const M = COMPONENT_META[item.kind] || { label: item.kind, icon: Layers, tone: "bg-slate-100 text-slate-600" };
                const I = M.icon;
                const child = bankChildLabel(item);
                return (
                  <Card key={item.id} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${M.tone}`}><I size={16} /></span>
                      <button title="Delete from Component Library"
                        onClick={() => { dispatch({ type: "REMOVE_COMPONENT_FROM_BANK", bankId: item.id }); toast(`“${item.title}” removed from Component Library`); }}
                        className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                    </div>
                    <div className="font-bold mb-0.5">{item.title}</div>
                    <div className="text-xs text-slate-400">{M.label}{child ? ` · ${child}` : ""}</div>
                  </Card>
                );
              })}
            </div>
          </BankGroup>
        )) : (
          <Card className="p-8 text-center text-sm text-slate-400">
            Nothing saved yet — while editing a block's content, hit the bookmark on any component to keep it here for reuse.
          </Card>
        )}
      </div>

      <div className="mt-8">
        <KitsSection />
      </div>

      <p className="text-xs text-slate-400 mt-6">
        Insert a saved block from any lesson: <b>Add block → From My Blocks</b>. Insert a saved component while editing a block: <b>Add component → My Component Library</b>. Both drop in as a copy, so editing them never touches the saved original.
      </p>
    </>
  );
}

/* ------------------------------- kits ------------------------------- */

// A Kit bundles saved Blocks + Components under one title so a teacher can
// hand a student a whole "meal" — e.g. a recap kit — in one assign action.
// Kits only store ids, so renaming/editing a bank item updates every kit.
function KitsSection() {
  const { state, dispatch, toast } = useStore();
  const [building, setBuilding] = useState(false);
  const [title, setTitle] = useState("");
  const [blockIds, setBlockIds] = useState(new Set());
  const [componentIds, setComponentIds] = useState(new Set());

  const toggle = (set, setSet, id) => setSet((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectedCount = blockIds.size + componentIds.size;

  function save() {
    if (!title.trim()) return toast("Give the kit a title", "err");
    if (!selectedCount) return toast("Pick at least one saved block or component", "err");
    dispatch({ type: "SAVE_KIT", title: title.trim(), blockIds: [...blockIds], componentIds: [...componentIds] });
    toast(`“${title.trim()}” saved as a kit`);
    setTitle(""); setBlockIds(new Set()); setComponentIds(new Set()); setBuilding(false);
  }

  return (
    <>
      <SectionLabel right={
        <button onClick={() => setBuilding((v) => !v)} className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-medium">
          <Boxes size={13} /> {building ? "Cancel" : "New kit"}
        </button>
      }>Kits · bundle several saved things into one assignable "meal"</SectionLabel>

      {building && (
        <Card className="p-4 mb-4 border-indigo-200">
          <Field label="Kit title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standup recap kit" autoFocus /></Field>
          <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-2 mt-3">Pick blocks &amp; components to include ({selectedCount} selected)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Blocks</div>
              <div className="space-y-1">
                {state.blockBank.map((item) => {
                  const BT = BLOCK_TYPES[item.type] || {}; const I = BT.icon || BookmarkCheck;
                  const on = blockIds.has(item.id);
                  return (
                    <button key={item.id} onClick={() => toggle(blockIds, setBlockIds, item.id)}
                      className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${BT.tone || "bg-slate-100"}`}><I size={12} /></span>
                      <span className="text-xs font-medium truncate flex-1">{item.title}</span>
                      {on && <Check size={13} className="text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
                {!state.blockBank.length && <p className="text-xs text-slate-400">Nothing saved yet.</p>}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Components</div>
              <div className="space-y-1">
                {(state.componentBank || []).map((item) => {
                  const M = COMPONENT_META[item.kind] || { icon: Layers, tone: "bg-slate-100" };
                  const I = M.icon;
                  const on = componentIds.has(item.id);
                  return (
                    <button key={item.id} onClick={() => toggle(componentIds, setComponentIds, item.id)}
                      className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${M.tone}`}><I size={12} /></span>
                      <span className="text-xs font-medium truncate flex-1">{item.title}</span>
                      {on && <Check size={13} className="text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
                {!(state.componentBank || []).length && <p className="text-xs text-slate-400">Nothing saved yet.</p>}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3"><Btn size="sm" onClick={save}><Boxes size={13} /> Save kit</Btn></div>
        </Card>
      )}

      {(state.kits || []).length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.kits.map((kit) => {
            const { blocks, components, count } = kitContents(kit, state.blockBank, state.componentBank);
            return (
              <Card key={kit.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600"><Boxes size={16} /></span>
                  <button title="Delete kit" onClick={() => { dispatch({ type: "REMOVE_KIT", kitId: kit.id }); toast(`“${kit.title}” kit deleted`); }}
                    className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                </div>
                <div className="font-bold mb-0.5">{kit.title}</div>
                <div className="text-xs text-slate-400 mb-3">{count} item{count === 1 ? "" : "s"}</div>
                <div className="flex flex-wrap gap-1">
                  {blocks.map((b) => <Pill key={b.id} className="bg-slate-100 text-slate-500">{b.title}</Pill>)}
                  {components.map((c) => <Pill key={c.id} className="bg-violet-50 text-violet-600">{c.title}</Pill>)}
                </div>
              </Card>
            );
          })}
        </div>
      ) : !building && (
        <Card className="p-8 text-center text-sm text-slate-400">No kits yet — bundle a few saved blocks/components into one, assignable in a click from any student's page.</Card>
      )}
    </>
  );
}

