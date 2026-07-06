import React, { useState, useEffect } from "react";
import {
  Plus, ChevronRight, Lock, ArrowUp, ArrowDown, Trash2, Pencil, GripVertical,
  Send, Eye, Sparkles, Radio,
} from "lucide-react";
import { Page, PageHead, Crumbs, Card, Bar, Btn, Pill, SectionLabel, Avatar } from "../ui.jsx";
import { useStore, useNav } from "../store.jsx";
import { HUE_SOFT, BLOCK_TYPES, LESSON_TEMPLATES } from "../data.jsx";
import { NewCourseModal, NewLessonModal, AddBlockModal, AssignModal } from "../components/modals.jsx";
import { ComponentStudent, COMPONENT_META, blockComponents } from "./parts.jsx";

/* ----------------------------- courses list ----------------------------- */

export function CoursesView() {
  const { state } = useStore();
  const { go } = useNav();
  const [modal, setModal] = useState(false);
  return (
    <Page>
      <PageHead kicker="Your courses" title="Courses"
        right={<Btn onClick={() => setModal(true)}><Plus size={16} /> New course</Btn>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.courses.map((c) => {
          const count = (state.lessons[c.id] || []).length;
          return (
            <button key={c.id} onClick={() => go({ courseId: c.id })}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-mono px-2 py-1 rounded-md ${HUE_SOFT[c.hue]}`}>{c.level}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
              <div className="text-lg font-bold mb-1">{c.title}</div>
              <div className="text-sm text-slate-400 mb-1">{count} lessons · {c.students} students</div>
              <div className="text-[11px] text-slate-400 mb-3">{LESSON_TEMPLATES[c.templateId]?.label || "General English"} template</div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1"><span>Avg completion</span><span className="font-mono">{c.completion}%</span></div>
              <Bar pct={c.completion} hue={c.hue} />
            </button>
          );
        })}
      </div>
      <NewCourseModal open={modal} onClose={() => setModal(false)} />
    </Page>
  );
}

/* ----------------------------- course → pathway ----------------------------- */

export function CourseView() {
  const { state } = useStore();
  const { route, go } = useNav();
  const [modal, setModal] = useState(false);
  const course = state.courses.find((c) => c.id === route.courseId);
  const lessons = state.lessons[route.courseId] || [];

  return (
    <Page>
      <Crumbs items={[{ label: "Courses", onClick: () => go({ courseId: null }) }, { label: course.title }]} />
      <PageHead title={course.title} sub={`${course.level} · ${course.students} students · ${lessons.length} lessons · ${LESSON_TEMPLATES[course.templateId]?.label || "General English"}`}
        right={<Btn onClick={() => setModal(true)}><Plus size={16} /> New lesson</Btn>} />

      <SectionLabel>Lesson pathway · ordered</SectionLabel>
      <div className="relative">
        {lessons.map((l, i) => (
          <div key={l.id} className="relative pl-10 pb-3">
            {i < lessons.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-200" />}
            <div className={`absolute left-0 top-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-semibold ${
              l.locked ? "bg-slate-100 text-slate-400" : l.progress === 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white"}`}>
              {l.locked ? <Lock size={13} /> : l.n}
            </div>
            <button disabled={l.locked} onClick={() => !l.locked && go({ lessonId: l.id })}
              className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                l.locked ? "border-slate-100 opacity-60 cursor-default" : l.current ? "border-indigo-300 ring-1 ring-indigo-100 hover:shadow-sm" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  Lesson {l.n}: {l.title}
                  {l.current && <Pill className="bg-indigo-100 text-indigo-700 font-mono">in focus</Pill>}
                </div>
                {!l.locked && <ChevronRight size={16} className="text-slate-300" />}
              </div>
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {l.parts.map((p, k) => {
                  const BT = BLOCK_TYPES[p]; const I = BT.icon;
                  return <span key={k} title={BT.label} className={`w-7 h-7 rounded-md flex items-center justify-center ${BT.tone}`}><I size={14} /></span>;
                })}
                {!l.parts.length && <span className="text-xs text-slate-400">No blocks yet — open to build</span>}
              </div>
              {!l.locked && l.parts.length > 0 && (
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  <span>{l.active} students</span>
                  <span className="flex-1"><Bar pct={l.progress} hue={course.hue} /></span>
                  <span className="font-mono">{l.progress}%</span>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
      <NewLessonModal open={modal} onClose={() => setModal(false)} courseId={route.courseId} />
    </Page>
  );
}

/* ----------------------------- lesson builder ----------------------------- */

export function LessonBuilderView() {
  const { state, dispatch, toast } = useStore();
  const { route, go, startLive } = useNav();
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");

  const course = state.courses.find((c) => c.id === route.courseId);
  const lesson = (state.lessons[route.courseId] || []).find((l) => l.id === route.lessonId);

  useEffect(() => {
    dispatch({ type: "ENSURE_BUILT", courseId: route.courseId, lessonId: route.lessonId });
  }, [route.courseId, route.lessonId, dispatch]);

  if (!lesson) return null;
  const blocks = lesson.built || [];
  const grammarBlock = blocks.find((b) => b.type === "grammar");
  // which Block types this course's lesson template offers — not a fixed list
  const availableTypes = LESSON_TEMPLATES[course.templateId]?.blockTypes || LESSON_TEMPLATES.general.blockTypes;
  const usedCounts = blocks.reduce((acc, b) => ({ ...acc, [b.type]: (acc[b.type] || 0) + 1 }), {});

  function addBlock(type) {
    const BT = BLOCK_TYPES[type];
    dispatch({ type: "ADD_PART", courseId: route.courseId, lessonId: route.lessonId,
      part: { id: `p${Date.now()}`, type, title: BT.label, meta: "—" } });
    toast(`Added ${BT.label} block`);
  }
  function saveTitle(b) {
    dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, patch: { title: draft } });
    setEditing(null);
  }

  return (
    <Page>
      <Crumbs items={[
        { label: "Courses", onClick: () => go({ courseId: null, lessonId: null }) },
        { label: course.title, onClick: () => go({ lessonId: null }) },
        { label: `Lesson ${lesson.n}` },
      ]} />
      <PageHead title={lesson.title} sub={`${blocks.length} blocks · lesson builder · drag or use arrows to reorder`}
        right={<div className="flex gap-2">
          <Btn variant="outline" size="sm" onClick={() => startLive({ courseId: route.courseId, lessonId: route.lessonId })} className="!text-rose-600 !border-rose-200 hover:!border-rose-300"><Radio size={14} /> Go live</Btn>
          <Btn variant="outline" size="sm" onClick={() => setAssignOpen(true)}><Send size={14} /> Assign</Btn>
          <Btn size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add block</Btn>
        </div>} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* pathway builder */}
        <div className="lg:col-span-3">
          <SectionLabel>Lesson content · pathway</SectionLabel>
          <div className="relative">
            {blocks.map((b, i) => {
              const BT = BLOCK_TYPES[b.type]; const I = BT.icon;
              return (
                <div key={b.id} className="relative pl-10 pb-2.5">
                  {i < blocks.length - 1 && <div className="absolute left-4 top-9 bottom-0 w-px bg-slate-200" />}
                  <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-mono text-slate-400">{i + 1}</div>
                  <div className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 p-3.5 transition-colors flex items-center gap-3">
                    <button onClick={() => go({ partId: b.id })} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${BT.tone}`}><I size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400">{BT.label}</div>
                        {editing === b.id ? (
                          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => saveTitle(b)} onKeyDown={(e) => e.key === "Enter" && saveTitle(b)}
                            className="w-full text-sm font-medium border-b border-indigo-300 focus:outline-none" />
                        ) : (
                          <div className="font-medium truncate">{b.title || BT.label}</div>
                        )}
                        {b.meta && b.meta !== "—" && <div className="text-xs text-slate-400 truncate">{b.meta}</div>}
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 text-slate-300">
                      <button title="Open (view & edit)" onClick={() => go({ partId: b.id })} className="hover:text-indigo-600 p-1"><Eye size={15} /></button>
                      <button title="Rename" onClick={() => { setEditing(b.id); setDraft(b.title || BT.label); }} className="hover:text-slate-500 p-1"><Pencil size={14} /></button>
                      <button title="Move up" disabled={i === 0} onClick={() => dispatch({ type: "MOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, dir: -1 })} className="hover:text-slate-500 p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button title="Move down" disabled={i === blocks.length - 1} onClick={() => dispatch({ type: "MOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, dir: 1 })} className="hover:text-slate-500 p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                      <button title="Remove" onClick={() => { dispatch({ type: "REMOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id }); toast("Block removed"); }} className="hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                      <GripVertical size={14} className="cursor-grab" />
                    </div>
                  </div>
                </div>
              );
            })}
            {!blocks.length && (
              <button onClick={() => setAddOpen(true)} className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 text-sm">
                <Plus size={16} className="inline mr-1" /> Add the first block
              </button>
            )}
          </div>
        </div>

        {/* right rail */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <SectionLabel>Students on this lesson</SectionLabel>
            <Card className="divide-y divide-slate-100">
              {state.students.slice(0, 5).map((s) => {
                const on = s.step >= 0 && s.step < blocks.length;
                return (
                  <button key={s.id} onClick={() => go({ tab: "students", studentId: s.id })} className="w-full text-left p-3.5 hover:bg-slate-50 flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{s.name}</div>
                      <div className="text-xs text-slate-400">
                        {s.step === -1 ? "not started" : on ? `on ${BLOCK_TYPES[blocks[s.step].type].label}` : "finished"} · {s.last}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-400">{s.progress}%</span>
                  </button>
                );
              })}
            </Card>
            <p className="text-xs text-slate-400 mt-2">Detailed analytics live in <b>Statistics</b> — kept out of the content on purpose.</p>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-1"><Sparkles size={15} /> One lesson, three uses</div>
            <p className="text-sm text-indigo-900/70">This same lesson works as your <b>teaching aid</b>, a <b>self-study</b> product, and something a stranger can <b>buy</b> — built once.</p>
          </div>

          {grammarBlock && (() => {
            const comps = blockComponents(grammarBlock, state.texts);
            const first = comps[0];
            return (
              <div>
                <SectionLabel>Signature: visual grammar · {comps.length} {comps.length === 1 ? "visualization" : "visualizations"}</SectionLabel>
                {first ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2">{COMPONENT_META[first.kind]?.label}</div>
                    <Card className="p-4 overflow-x-auto"><ComponentStudent component={first} /></Card>
                  </>
                ) : <Card className="p-4 text-sm text-slate-400">No visualization added yet — open the block to add one.</Card>}
              </div>
            );
          })()}
        </div>
      </div>

      <AddBlockModal open={addOpen} onClose={() => setAddOpen(false)} onPick={addBlock} types={availableTypes} usedCounts={usedCounts} />
      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} what={`${course.title} — Lesson ${lesson.n}: ${lesson.title}`} kind="lesson" />
    </Page>
  );
}
