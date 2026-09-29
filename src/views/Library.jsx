import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  IconBookUpload, IconSend, IconDownload, IconChevronRight, IconChevronDown, IconArrowLeft, IconStack2, IconWand,
  IconSparkles, IconArrowRight, IconTrash, IconBookmark, IconBoxMultiple, IconBuildingStore,
  IconCode, IconCoffee, IconBriefcase, IconPlane, IconCertificate, IconStethoscope, IconBook, IconFileText, IconLanguage,
} from "@tabler/icons-react";
import {
  Page, PageHeader, Card, CourseCard, Button, Tag, SectionLabel, Alert, Modal, Field, TextArea, ComingSoon,
} from "../design-system.jsx";
import { useStore, groupBankByParent, bankChildLabel, discardH5PContent } from "../store.jsx";
import { BLOCK_TYPES } from "../data.jsx";
import { AddTextModal, AssignModal } from "../components/modals.jsx";
import { Reader, RoleLegend, ColorSentence } from "./grammar.jsx";
import Playground from "./playground.jsx";
import { COMPONENT_META, ComponentStudent } from "./parts.jsx";

// A course's hue is authored as a Tailwind indigo/emerald/etc. hue key —
// map it onto the design-system's own tone vocabulary, same as Courses.jsx.
const HUE_TO_TONE = { indigo: "primary", emerald: "success", amber: "pending", rose: "warning", sky: "info" };
const TONE_DOT = { primary: "bg-primary-500", success: "bg-success-500", pending: "bg-pending-500", warning: "bg-warning-500", info: "bg-info-500" };

// Library owns its own nested routing (reading/words/playground/bank/
// marketplace, plus a reader/word-set drill-down) directly with react-router
// hooks — this is page-internal navigation, not a cross-page resource, so it
// doesn't need to go through the shared useNav() shim the other pages use.
const LIBRARY_TABS = [["reading", "Reading"], ["words", "Word sets"], ["playground", "Playground"], ["bank", "My Blocks"], ["marketplace", "Marketplace"]];

export default function Library() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route index element={<Navigate to="reading" replace />} />
      <Route path="reading" element={<LibraryHome tab="reading"><ReadingList open={(id) => navigate(`/library/reading/${id}`)} /></LibraryHome>} />
      <Route path="reading/:textId" element={<ReaderPanelRoute />} />
      <Route path="words" element={<LibraryHome tab="words"><WordSetsList open={(id) => navigate(`/library/words/${id}`)} /></LibraryHome>} />
      <Route path="words/:setId" element={<WordSetPanelRoute />} />
      <Route path="playground" element={<LibraryHome tab="playground"><Playground /></LibraryHome>} />
      <Route path="bank" element={<LibraryHome tab="bank"><MyBlocks /></LibraryHome>} />
      <Route path="marketplace" element={
        <LibraryHome tab="marketplace">
          <ComingSoon icon={IconBuildingStore} title="Teacher marketplace — coming soon"
            sub="Publish your own ready-to-use reading, playground, and other lesson blocks for other teachers to buy and drop straight into their lessons." />
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
      <PageHeader kicker="Content library" title="Library" sub="Reading texts, vocabulary sets, and the playground learners explore between lessons." />
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
  const navigate = useNavigate();
  return <ReaderPanel textId={textId} back={() => navigate("/library/reading")} />;
}
function WordSetPanelRoute() {
  const { setId } = useParams();
  const navigate = useNavigate();
  return <WordSetPanel setId={setId} back={() => navigate("/library/words")} />;
}

/* ------------------------------- reading ------------------------------- */

// Each topic gets its own card tint and icon, so a shelf of texts scans at a
// glance instead of reading as identical gray tiles. Tints reuse the five
// tones courses are colored with (IT and Everyday match their courses);
// topics that share a tone are told apart by icon.
const TOPIC_LOOK = {
  IT: { tone: "primary", icon: IconCode },
  Everyday: { tone: "pending", icon: IconCoffee },
  Business: { tone: "success", icon: IconBriefcase },
  Travel: { tone: "info", icon: IconPlane },
  IELTS: { tone: "success", icon: IconCertificate },
  Medical: { tone: "warning", icon: IconStethoscope },
  Academic: { tone: "info", icon: IconBook },
};
const topicLook = (topic) => TOPIC_LOOK[topic] || { tone: "primary", icon: IconFileText };

function ReadingList({ open }) {
  const { state } = useStore();
  const [add, setAdd] = useState(false);
  const [own, setOwn] = useState(false);
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

      <SectionLabel right={<Button variant="primary" size="sm" onClick={() => setAdd(true)}><IconBookUpload size={14} stroke={1.75} /> Add text</Button>}>Reading texts · grouped by topic & level</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.texts.map((t) => {
          const look = topicLook(t.topic);
          return (
            <CourseCard key={t.id} icon={look.icon} tone={look.tone} title={t.title}
              category={`${t.topic} · Level ${t.level}`}
              stats={[
                { icon: IconFileText, value: `${t.wordCount} words` },
                ...(t.hasTranslation ? [{ icon: IconLanguage, value: "Tap to translate" }] : []),
              ]}
              onViewDetail={() => open(t.id)} />
          );
        })}
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
      <button onClick={back} className="text-sm text-neutral-500 hover:text-primary-600 inline-flex items-center gap-1 mb-4"><IconArrowLeft size={14} stroke={1.75} /> Library</button>
      <PageHeader title={text.title} sub={`${text.topic} · ${text.level} · ${text.wordCount} words`}
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
      {/* One list card with a column header, the same shape as the course
          tree — a set is just a named list of words, nothing to preview. */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-neutral-50 px-5 py-2.5 border-b border-neutral-200">
          <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Word set</span>
          <span className="hidden sm:block w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">Category</span>
          <span className="hidden sm:block w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">Level</span>
          <span className="hidden sm:block w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">Words</span>
          <span className="w-4 shrink-0" />
        </div>
        <div className="divide-y divide-neutral-200">
          {state.wordSets.map((ws) => (
            <button key={ws.id} onClick={() => open(ws.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-(--dur-fast) hover:bg-neutral-50">
              <span className="flex-1 min-w-0 flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><IconStack2 size={16} stroke={1.75} /></span>
                <span className="min-w-0">
                  <span className="block font-semibold text-neutral-950 truncate">{ws.title}</span>
                  <span className="block sm:hidden text-xs text-neutral-500 mt-0.5">{ws.category} · {ws.level} · {ws.words.length} words</span>
                </span>
              </span>
              <span className="hidden sm:block w-28 shrink-0"><Tag color="neutral">{ws.category}</Tag></span>
              <span className="hidden sm:block w-16 shrink-0 text-sm text-neutral-700">{ws.level}</span>
              <span className="hidden sm:block w-16 shrink-0 text-sm tabular-nums text-neutral-700">{ws.words.length}</span>
              <IconChevronRight size={16} stroke={1.75} className="shrink-0 text-neutral-400" />
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

// A set's words as a plain list — the same Word list students get in a
// lesson, so the two never drift apart.
function WordSetPanel({ setId, back }) {
  const { state } = useStore();
  const [assign, setAssign] = useState(false);
  const ws = state.wordSets.find((w) => w.id === setId);
  return (
    <Page>
      <button onClick={back} className="text-sm text-neutral-500 hover:text-primary-600 inline-flex items-center gap-1 mb-4"><IconArrowLeft size={14} stroke={1.75} /> Library</button>
      <PageHeader title={ws.title} sub={`${ws.category} · ${ws.level} · ${ws.words.length} words`}
        right={<Button variant="primary" size="sm" onClick={() => setAssign(true)}><IconSend size={14} stroke={1.75} /> Assign set</Button>} />
      <ComponentStudent component={{ id: ws.id, kind: "wordlist", items: ws.words }} />
      <AssignModal open={assign} onClose={() => setAssign(false)} what={`Word set: ${ws.title}`} kind="vocabulary" />
    </Page>
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

/* ------------------------------- my blocks (bank) ------------------------------- */

// The teacher's saved, reusable blocks. Save from any lesson (bookmark icon in
// the builder / tree / studio); insert from "Add block → From My Blocks".
// A collapsible "folder" for one parent (course, or "Playground") in the
// bank — used for both saved Blocks and saved Components so both read as
// organized groups instead of one flat pile that only grows over time.
function BankGroup({ parent, count, hue, children }) {
  const [open, setOpen] = useState(true);
  const tone = HUE_TO_TONE[hue];
  return (
    <div className="mb-6 last:mb-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 mb-3 group">
        {open ? <IconChevronDown size={14} stroke={1.75} className="text-neutral-300 shrink-0" /> : <IconChevronRight size={14} stroke={1.75} className="text-neutral-300 shrink-0" />}
        {tone ? <span className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[tone]}`} /> : <IconBoxMultiple size={12} stroke={1.75} className="text-neutral-400 shrink-0" />}
        <h3 className="text-sm font-bold text-neutral-700 group-hover:text-primary-600 transition-colors">{parent}</h3>
        <Tag color="neutral">{count}</Tag>
        <div className="flex-1 h-px bg-neutral-200" />
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
              const BT = BLOCK_TYPES[item.type] || {}; const I = BT.icon || IconBookmark;
              const comps = item.content?.components || [];
              const child = bankChildLabel(item);
              return (
                <Card key={item.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${BT.tone || "bg-neutral-100 text-neutral-500"}`}><I size={16} /></span>
                    <button title="Delete from My Blocks"
                      onClick={() => { discardH5PContent(toast, item); dispatch({ type: "REMOVE_FROM_BANK", bankId: item.id }); toast(`“${item.title}” removed from My Blocks`); }}
                      className="text-neutral-400 hover:text-warning-500 p-1"><IconTrash size={14} stroke={1.75} /></button>
                  </div>
                  <div className="font-bold mb-0.5 text-neutral-950">{item.title}</div>
                  <div className="text-xs text-neutral-500 mb-3">{BT.label || item.type} block{child ? ` · ${child}` : ""}</div>
                  <div className="flex flex-wrap gap-1">
                    {comps.map((c, i) => (
                      <Tag key={i} color="neutral">{COMPONENT_META[c.kind]?.label || c.kind}</Tag>
                    ))}
                    {!comps.length && <span className="text-xs text-neutral-500">empty block</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </BankGroup>
      )) : (
        <Card className="p-8 text-center text-sm text-neutral-500 mb-8">
          Nothing saved yet — in any lesson, hit the <IconBookmark size={13} stroke={1.75} className="inline mx-0.5" /> bookmark on a block to keep it here for reuse.
        </Card>
      )}

      <div className="mt-8">
        <SectionLabel>Saved components · grouped by the course they came from</SectionLabel>
        {componentGroups.length ? componentGroups.map(({ parent, items }) => (
          <BankGroup key={parent} parent={parent} count={items.length} hue={hueFor(parent)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const M = COMPONENT_META[item.kind] || { label: item.kind, icon: IconStack2, tone: "bg-neutral-100 text-neutral-600" };
                const I = M.icon;
                const child = bankChildLabel(item);
                return (
                  <Card key={item.id} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${M.tone}`}><I size={16} /></span>
                      <div className="flex items-center gap-1.5">
                        {item.data?.level && <Tag color="neutral">{item.data.level}</Tag>}
                        <button title="Delete from Component Library"
                          onClick={() => { discardH5PContent(toast, item); dispatch({ type: "REMOVE_COMPONENT_FROM_BANK", bankId: item.id }); toast(`“${item.title}” removed from Component Library`); }}
                          className="text-neutral-400 hover:text-warning-500 p-1"><IconTrash size={14} stroke={1.75} /></button>
                      </div>
                    </div>
                    <div className="font-bold mb-0.5 text-neutral-950">{item.title}</div>
                    <div className="text-xs text-neutral-500">{M.label}{child ? ` · ${child}` : ""}</div>
                  </Card>
                );
              })}
            </div>
          </BankGroup>
        )) : (
          <Card className="p-8 text-center text-sm text-neutral-500">
            Nothing saved yet — while editing a block's content, hit the bookmark on any component to keep it here for reuse.
          </Card>
        )}
      </div>


      <p className="text-xs text-neutral-500 mt-6">
        Insert a saved block from any lesson: <b>Add block → From My Blocks</b>. Insert a saved component while editing a block: <b>Add component → My Component Library</b>. Both drop in as a copy, so editing them never touches the saved original.
      </p>
    </>
  );
}
