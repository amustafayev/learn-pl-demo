import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  IconBookUpload, IconSend, IconDownload, IconArrowLeft, IconStack2, IconWand,
  IconSparkles, IconArrowRight, IconTrash, IconPlus, IconBookmark, IconBuildingStore, IconFileText, IconLanguage,
} from "@tabler/icons-react";
import {
  Page, PageHeader, Card, CourseCard, Button, Tag, SectionLabel, Alert, Modal, Field, TextArea, ComingSoon,
} from "../design-system.jsx";
import { useToast } from "../toasts.jsx";
import { useReadingFolders, useReadingTexts, useReadingText } from "../features/readings/index.js";
import { useWordSets } from "../features/wordSets/index.js";
import { useSavedComponents } from "../features/savedComponents/index.js";
import { AddTextModal, AssignModal } from "../components/modals.jsx";
import { Reader, RoleLegend, ColorSentence } from "./grammar.jsx";
import { COMPONENT_META, ComponentStudent, COMPONENT_BANK_CATEGORIES, componentCategoryOf } from "./parts.jsx";
import LibraryTree from "../components/LibraryTree.jsx";
import { kidsOf, descendantsOf, pathOf, pathLabel, subtreeWords } from "../libraryTree.js";
import { BankBrowser, SavedComponentCard, parentOf } from "../components/SavedComponents.jsx";

// Library owns its own nested routing (reading/words/bank/
// marketplace, plus a reader/word-set drill-down) directly with react-router
// hooks — this is page-internal navigation, not a cross-page resource, so it
// doesn't need to go through the shared useNav() shim the other pages use.
const LIBRARY_TABS = [["reading", "Reading"], ["words", "Word sets"], ["bank", "Saved"], ["marketplace", "Marketplace"]];

// Whether the folder panel is folded away — shared by Reading and Word sets,
// remembered per browser (a convenience only; falls back to open).
const FOLD_KEY = "lucid.library-tree-folded";
function useTreeFold() {
  const [folded, setFolded] = useState(() => { try { return localStorage.getItem(FOLD_KEY) === "1"; } catch { return false; } });
  const set = (v) => { setFolded(v); try { localStorage.setItem(FOLD_KEY, v ? "1" : "0"); } catch { /* ignore */ } };
  return [folded, set];
}
// Static class strings so Tailwind can see them.
const treeGrid = (folded) => `grid grid-cols-1 gap-6 items-start lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out ${folded ? "lg:grid-cols-[11rem_minmax(0,1fr)]" : "lg:grid-cols-[18rem_minmax(0,1fr)]"}`;

export default function Library() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route index element={<Navigate to="reading" replace />} />
      <Route path="reading" element={<LibraryHome tab="reading"><ReadingList open={(id, folder) => navigate(`/library/reading/${id}${folder ? `?folder=${folder}` : ""}`)} /></LibraryHome>} />
      <Route path="reading/:textId" element={<ReaderPanelRoute />} />
      <Route path="words" element={<LibraryHome tab="words"><WordSetsList /></LibraryHome>} />
      <Route path="playground" element={<Navigate to="/library/reading" replace />} />
      <Route path="bank" element={<LibraryHome tab="bank"><MyComponents /></LibraryHome>} />
      <Route path="marketplace" element={
        <LibraryHome tab="marketplace">
          <ComingSoon icon={IconBuildingStore} title="Teacher marketplace — coming soon"
            sub="Publish your own ready-to-use reading and other lesson blocks for other teachers to buy and drop straight into their lessons." />
        </LibraryHome>
      } />
    </Routes>
  );
}

// The tab bar + page header only show at the list level — drilling into one
// reading text or word set replaces the whole page (its own back-link),
// exactly like before this was routed.
function LibraryHome({ tab, children }) {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader kicker="Content library" title="Library" sub="Reading texts and vocabulary sets for your lessons." />
      <div className="flex gap-1.5 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
        {LIBRARY_TABS.map(([id, label]) => (
          <button key={id} onClick={() => navigate(`/library/${id}`)}
            className={`text-sm font-semibold rounded-lg px-4 py-1.5 transition-colors ${tab === id ? "bg-surface shadow-sm text-primary-700" : "text-neutral-500"}`}>{label}</button>
        ))}
      </div>
      {children}
    </Page>
  );
}

function ReaderPanelRoute() {
  const { textId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return <ReaderPanel textId={textId} back={() => navigate(`/library/reading${params.get("folder") ? `?folder=${params.get("folder")}` : ""}`)} />;
}

/* ------------------------------- shared bits ------------------------------- */

// "Delete X and everything in it?" — folders take their contents with them.
function ConfirmDelete({ target, detail, onCancel, onConfirm }) {
  const last = React.useRef(target);
  if (target) last.current = target;
  const t = target || last.current;
  return (
    <Modal open={!!target} onClose={onCancel} icon={IconTrash} iconTone="warning" title={`Delete “${t?.label || ""}”?`}
      footer={<><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={onConfirm}>Delete</Button></>}>
      <p className="text-sm text-neutral-700">{detail}</p>
    </Modal>
  );
}

/* ------------------------------- reading ------------------------------- */

// A folder's top-level ancestor picks its card tint, so a shelf of texts
// scans by where they live. Same five tones courses are colored with.
const TONES = ["primary", "pending", "success", "info", "warning"];

function ReadingList({ open }) {
  const toast = useToast();
  const { folders, createFolder, renameFolder, deleteFolder } = useReadingFolders();
  const { texts } = useReadingTexts();
  const [folded, setFolded] = useTreeFold();
  const [params, setParams] = useSearchParams();
  const [add, setAdd] = useState(false);
  const [own, setOwn] = useState(false);
  const [removing, setRemoving] = useState(null);
  const selected = folders.some((f) => f.id === params.get("folder")) ? params.get("folder") : null;
  const select = (id) => setParams(id ? { folder: id } : {}, { replace: true });

  // Texts in a folder and in every folder below it.
  const within = (id) => new Set([id, ...descendantsOf(folders, id).map((f) => f.id)]);
  const textsIn = (id) => texts.filter((t) => within(id).has(t.folderId));
  const shown = selected ? textsIn(selected) : texts;
  const rootIndex = (id) => Math.max(0, kidsOf(folders, null).findIndex((r) => r.id === pathOf(folders, id)[0]?.id));

  return (
    <>
      <div className="rounded-2xl border border-info-200 bg-info-50 p-4 mb-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-info-100 text-info-600 flex items-center justify-center shrink-0"><IconWand size={18} stroke={1.75} /></span>
        <div className="flex-1">
          <div className="font-semibold text-sm text-neutral-950">Learn from your own text <Tag color="info">differentiator</Tag></div>
          <p className="text-sm text-neutral-700">Turn a learner's real Slack message or email into a lesson — corrections, the rule behind each fix, and new words.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOwn(true)}>Try it <IconArrowRight size={14} stroke={1.75} /></Button>
      </div>

      <div className={treeGrid(folded)}>
        <LibraryTree folded={folded} onFoldChange={setFolded} nodes={folders} labelKey="name" selectedId={selected} onSelect={select} rootLabel="All readings"
          countOf={(f) => textsIn(f.id).length} addLabel="New folder"
          onAdd={createFolder} onRename={renameFolder}
          onDelete={(f) => setRemoving({ id: f.id, label: f.name })} />
        <div className="min-w-0">
          <SectionLabel right={<Button variant="primary" size="sm" onClick={() => setAdd(true)}><IconBookUpload size={14} stroke={1.75} /> Add text</Button>}>
            {selected ? pathLabel(folders, selected, "name") : "All readings"}
          </SectionLabel>
          {shown.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {shown.map((t) => (
                <CourseCard key={t.id} tone={TONES[rootIndex(t.folderId) % TONES.length]} title={t.title}
                  category={`${pathLabel(folders, t.folderId, "name") || "No folder"} · Level ${t.level}`}
                  stats={[
                    { icon: IconFileText, value: `${t.wordCount} words` },
                    ...(t.hasTranslation ? [{ icon: IconLanguage, value: "Tap to translate" }] : []),
                  ]}
                  onViewDetail={() => open(t.id, selected)} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-sm text-neutral-600">No readings here yet — add one, or make a folder inside this one to organize them.</Card>
          )}
        </div>
      </div>

      <AddTextModal open={add} onClose={() => setAdd(false)} folderId={selected} />
      <OwnTextModal open={own} onClose={() => setOwn(false)} />
      <ConfirmDelete target={removing} onCancel={() => setRemoving(null)}
        detail={removing ? `This also deletes the folders inside it and the ${textsIn(removing.id).length} reading(s) in them.` : ""}
        onConfirm={() => { deleteFolder(removing.id); if (selected === removing.id) select(null); toast(`“${removing.label}” deleted`); setRemoving(null); }} />
    </>
  );
}

function ReaderPanel({ textId, back }) {
  const toast = useToast();
  const [assign, setAssign] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { text } = useReadingText(textId);
  const { folders } = useReadingFolders();
  if (!text) return null;
  return (
    <Page>
      <button onClick={back} className="text-sm text-neutral-500 hover:text-primary-600 inline-flex items-center gap-1 mb-4"><IconArrowLeft size={14} stroke={1.75} /> Library</button>
      <PageHeader title={text.title} sub={`${pathLabel(folders, text.folderId, "name") || "No folder"} · ${text.level} · ${text.wordCount} words`}
        right={<div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast("Vocabulary list exported (.csv)")}><IconDownload size={14} stroke={1.75} /> Export vocab</Button>
          <Button variant="primary" size="sm" onClick={() => setAssign(true)}><IconSend size={14} stroke={1.75} /> Assign</Button>
        </div>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <Reader text={text} onSaveWord={() => { setSavedCount((c) => c + 1); toast("Word saved to the personal list"); }} />
        </Card>
        <div className="space-y-4">
          <Alert icon={IconSparkles} tone="info" title="How reading works">
            Tap any word → Azerbaijani translation, definition and an example. Save it (one tap) and it keeps the sentence it came from.
          </Alert>
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2 text-neutral-950">This session</div>
            <div className="flex items-center justify-between text-sm text-neutral-600"><span>Words saved</span><span className="font-mono text-primary-600 font-bold">{savedCount}</span></div>
            <p className="text-[11px] text-neutral-500 mt-2">Words on the page are coloured by the learner's status — new, learning, or known.</p>
          </Card>
        </div>
      </div>
      <AssignModal open={assign} onClose={() => setAssign(false)} item={{ kind: "reading", title: text.title, source: { textId: text.id } }} />
    </Page>
  );
}

/* ------------------------------- word sets ------------------------------- */

const WORD_LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"];

// A word set is a folder: its own words, plus word sets inside it, nested to
// any depth — IELTS → Linkers → Contrast → the words.
function WordSetsList() {
  const toast = useToast();
  const wordSets = useWordSets();
  const { sets, createSet, updateSet, deleteSet } = wordSets;
  const [folded, setFolded] = useTreeFold();
  const [params, setParams] = useSearchParams();
  const [removing, setRemoving] = useState(null);
  const [assign, setAssign] = useState(false);
  const selectedId = sets.some((w) => w.id === params.get("set")) ? params.get("set") : null;
  const select = (id) => setParams(id ? { set: id } : {}, { replace: true });
  const node = sets.find((w) => w.id === selectedId) || null;
  const total = (id) => subtreeWords(sets, id).length;

  return (
    <>
      <div className={treeGrid(folded)}>
        <LibraryTree folded={folded} onFoldChange={setFolded} nodes={sets} labelKey="title" selectedId={selectedId} onSelect={select} rootLabel="All word sets"
          countOf={(n) => total(n.id)} addLabel="New word set"
          onAdd={(parentId, title) => createSet(parentId, title)}
          onRename={(id, title) => updateSet(id, { title })}
          onDelete={(n) => setRemoving({ id: n.id, label: n.title })} />
        <div className="min-w-0">
          {node ? (
            <WordSetPane key={node.id} node={node} path={pathLabel(sets, node.id)} below={total(node.id) - node.words.length} onAssign={() => setAssign(true)} wordSets={wordSets} />
          ) : (
            <Card className="p-8 text-center text-sm text-neutral-600">
              <IconStack2 size={22} stroke={1.5} className="mx-auto mb-2 text-neutral-500" />
              Pick a word set on the left to see its words — or press <b>New word set</b> to start one. Use the folder icon on a set to add a category inside it.
            </Card>
          )}
        </div>
      </div>
      {node && <AssignModal open={assign} onClose={() => setAssign(false)} item={{ kind: "wordSet", title: node.title, source: { wordSetId: node.id } }} />}
      <ConfirmDelete target={removing} onCancel={() => setRemoving(null)}
        detail={removing ? `This also deletes the word sets inside it — ${total(removing.id)} word(s) in all.` : ""}
        onConfirm={() => { deleteSet(removing.id); if (selectedId === removing.id) select(null); toast(`“${removing.label}” deleted`); setRemoving(null); }} />
    </>
  );
}

// One word set: its path, level, and its own words — edited in place.
function WordSetPane({ node, path, below, onAssign, wordSets }) {
  const [draft, setDraft] = useState({ term: "", az: "", def: "" });
  const add = () => {
    if (!draft.term.trim()) return;
    wordSets.addWord(node.id, draft);
    setDraft({ term: "", az: "", def: "" });
  };
  const edit = (word, field, value) => {
    if (value.trim() === (word[field] || "")) return;
    if (field === "term" && !value.trim()) return;
    wordSets.updateWord(node.id, word.id, { [field]: value.trim() });
  };
  const cell = "h-9 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-neutral-900 outline-none hover:border-neutral-400 focus:border-primary-500 focus:bg-surface";
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-400 px-5 py-4">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-neutral-950">{node.title}</div>
          <div className="truncate text-xs text-neutral-600">{path} · {node.words.length} word{node.words.length === 1 ? "" : "s"}{below > 0 ? ` here, ${below} in word sets inside` : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <select value={node.level || ""} aria-label="Level" onChange={(e) => wordSets.updateSet(node.id, { level: e.target.value })}
            className="h-9 rounded-lg border border-neutral-400 bg-surface px-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-500">
            {WORD_LEVELS.map((l) => <option key={l} value={l}>{l ? `Level ${l}` : "No level"}</option>)}
          </select>
          <Button size="sm" onClick={onAssign}><IconSend size={14} stroke={1.75} /> Assign</Button>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_2fr_2rem] gap-2 px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span>Word</span><span>Azerbaijani</span><span>Meaning</span><span />
        </div>
        {node.words.map((w) => (
          <div key={`${node.id}-${w.id}-${w.term}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_2rem] items-center gap-2">
            <input className={`${cell} font-semibold`} defaultValue={w.term} aria-label="Word" onBlur={(e) => edit(w, "term", e.target.value)} />
            <input className={cell} defaultValue={w.az} aria-label="Azerbaijani" onBlur={(e) => edit(w, "az", e.target.value)} />
            <input className={cell} defaultValue={w.def} aria-label="Meaning" onBlur={(e) => edit(w, "def", e.target.value)} />
            <button type="button" title="Delete word" aria-label="Delete word" onClick={() => wordSets.deleteWord(node.id, w.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-warning-50 hover:text-warning-600"><IconTrash size={15} stroke={1.75} /></button>
          </div>
        ))}
        {!node.words.length && <p className="px-2 py-4 text-sm text-neutral-600">No words in this one yet{below > 0 ? " — its words are in the word sets inside it" : ""}. Add the first below.</p>}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] items-center gap-2 border-t border-neutral-400 pt-3">
          {[["term", "New word"], ["az", "Azerbaijani"], ["def", "Meaning"]].map(([k, ph]) => (
            <input key={k} className="h-9 rounded-lg border border-neutral-400 bg-surface px-3 text-sm text-neutral-900 outline-none focus:border-primary-500" placeholder={ph} aria-label={ph}
              value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          ))}
          <Button size="sm" variant={draft.term.trim() ? "primary" : "disabled"} onClick={add}><IconPlus size={14} stroke={1.75} /> Add</Button>
        </div>
      </div>
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
      footer={<><Button variant="outline" onClick={() => { setRun(false); onClose(); }}>Close</Button><Button variant="primary" onClick={() => setRun(true)}><IconWand size={14} stroke={1.75} /> Generate lesson</Button></>}>
      <Field label="The learner's real text"><TextArea className="!min-h-[96px]" value={text} onChange={(e) => setText(e.target.value)} /></Field>
      {run && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">Corrected</div>
            <p className="text-sm bg-success-50 rounded-lg p-3 text-success-900">“We <b>were</b> <b>discussing</b> the bug yesterday and I <b>fixed</b> it already.”</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">The rule behind each fix</div>
            <ul className="text-sm text-neutral-600 space-y-1 list-disc pl-5">
              <li><b>we were</b> — plural subject takes “were”, not “was”.</li>
              <li><b>were discussing</b> — past continuous for an action in progress.</li>
              <li><b>fixed</b> (not “have fixed”) — “yesterday” is a finished time → past simple.</li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">Colour-coded</div>
            <div className="mb-2"><RoleLegend roles={["subject", "verb", "object", "time"]} /></div>
            <ColorSentence tokens={[{ w: "We", role: "subject" }, { w: "were discussing", role: "verb" }, { w: "the bug", role: "object" }, { w: "yesterday", role: "time" }, { w: "." }]} />
          </div>
          <Alert icon={IconArrowRight} tone="primary">New words <b>discuss</b>, <b>already</b> dropped into the learner's vocab list; the past-simple error goes to their practice queue.</Alert>
        </div>
      )}
    </Modal>
  );
}

/* --------------------------- component library (bank) --------------------------- */

function MyComponents() {
  const saved = useSavedComponents();
  const [open, setOpen] = useState(null); // the saved component being previewed
  const components = saved.items;

  const componentCard = (item) => (
    <SavedComponentCard key={item.id} item={item} onOpen={() => setOpen(item)} onDelete={() => saved.remove(item)} />
  );

  return (
    <>
      <BankBrowser
        items={components} categories={COMPONENT_BANK_CATEGORIES} categoryOf={componentCategoryOf}
        courseOf={parentOf} noun="saved items" renderCard={componentCard}
        searchText={(i) => `${i.title} ${i.from || ""} ${COMPONENT_META[i.kind]?.label || i.kind}`}
        empty={(
          <Card className="p-8 text-center text-sm text-neutral-500">
            Nothing saved yet — while editing a block's content, hit the <IconBookmark size={13} stroke={1.75} className="inline mx-0.5" /> bookmark on any component to keep it here for reuse.
          </Card>
        )}
      />
      <Modal open={!!open} onClose={() => setOpen(null)} size="lg" title={open?.title || ""}
        sub={open ? `${COMPONENT_META[open.kind]?.label || open.kind}${open.from ? ` · ${open.from}` : ""} — as a student sees it` : ""}>
        {open && <ComponentStudent component={open.data} />}
      </Modal>

      <p className="text-xs text-neutral-500 mt-6">
        Insert a saved component while editing a block: <b>Add component → Saved</b>. It drops in as a copy, so editing it never touches the saved original.
      </p>
    </>
  );
}
