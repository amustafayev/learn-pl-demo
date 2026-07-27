import React, { useState, useEffect } from "react";
import {
  Plus, ChevronRight, ChevronDown, Lock, ArrowUp, ArrowDown, Trash2, Pencil,
  GripVertical, Send, Eye, Sparkles, Radio, Users, UserPlus, UserMinus,
  BookmarkPlus, FolderTree, Check,
} from "lucide-react";
import { Page, PageHead, Crumbs, Card, Bar, Btn, Pill, SectionLabel, Avatar, Modal } from "../ui.jsx";
import { useStore, useNav } from "../store.jsx";
import { HUE_SOFT, BLOCK_TYPES, LESSON_TEMPLATES } from "../data.jsx";
import { NewCourseModal, NewLessonModal, AddBlockModal, AssignModal } from "../components/modals.jsx";
import { ComponentStudent, COMPONENT_META, blockComponents } from "./parts.jsx";

// Deep-copy a saved bank block into a fresh lesson part — new ids all the way
// down so later edits never touch the saved original.
export function partFromBank(item) {
  const content = JSON.parse(JSON.stringify(item.content || { components: [] }));
  content.components = (content.components || []).map((c, i) => ({ ...c, id: `c${Date.now()}_${i}` }));
  return { id: `p${Date.now()}`, type: item.type, title: item.title, meta: "from My Blocks", content };
}

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
          const enrolled = state.students.filter((s) => s.courseId === c.id).length;
          return (
            <button key={c.id} onClick={() => go({ courseId: c.id })}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-mono px-2 py-1 rounded-md ${HUE_SOFT[c.hue]}`}>{c.level}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
              <div className="text-lg font-bold mb-1">{c.title}</div>
              <div className="text-sm text-slate-400 mb-1">{count} lessons · {enrolled} students enrolled</div>
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

/* ----------------------------- course → tree explorer -----------------------------
   One organized place per course: Lessons expand into their Blocks (each
   openable / savable to My Blocks); the Students branch handles enrollment
   and per-lesson assignment. Editing content stays in the builder & studio. */

export function CourseView() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [manageLesson, setManageLesson] = useState(null); // lesson being student-managed
  const [enrollOpen, setEnrollOpen] = useState(false);

  const course = state.courses.find((c) => c.id === route.courseId);
  const lessons = state.lessons[route.courseId] || [];
  const enrolled = state.students.filter((s) => s.courseId === course.id);
  const others = state.students.filter((s) => s.courseId !== course.id);

  function toggleLesson(l) {
    if (!expanded[l.id]) dispatch({ type: "ENSURE_BUILT", courseId: course.id, lessonId: l.id });
    setExpanded((e) => ({ ...e, [l.id]: !e[l.id] }));
  }
  function saveBlock(block, lesson) {
    dispatch({ type: "SAVE_BLOCK_TO_BANK", block, from: `${course.title} · Lesson ${lesson.n}` });
    toast(`“${block.title || BLOCK_TYPES[block.type].label}” saved to My Blocks`);
  }
  const assignedCount = (l) => enrolled.filter((s) => (s.assignedLessons || []).includes(l.id)).length;

  return (
    <Page>
      <Crumbs items={[{ label: "Courses", onClick: () => go({ courseId: null }) }, { label: course.title }]} />
      <PageHead title={course.title}
        sub={`${course.level} · ${LESSON_TEMPLATES[course.templateId]?.label || "General English"} · everything in this course, one tree`}
        right={<Btn onClick={() => setModal(true)}><Plus size={16} /> New lesson</Btn>} />

      <SectionLabel><span className="inline-flex items-center gap-1.5"><FolderTree size={13} /> Course tree · lessons → blocks → components</span></SectionLabel>

      {/* ---- Lessons branch ---- */}
      <Card className="p-2 mb-5">
        {lessons.map((l) => {
          const isOpen = expanded[l.id];
          const blocks = l.built || [];
          const nAssigned = assignedCount(l);
          return (
            <div key={l.id} className="border-b border-slate-50 last:border-b-0">
              <div className={`flex items-center gap-2 px-2 py-2.5 rounded-lg ${l.current ? "bg-indigo-50/40" : ""}`}>
                <button onClick={() => toggleLesson(l)} className="p-1 text-slate-400 hover:text-indigo-600 shrink-0">
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold shrink-0 ${
                  l.locked ? "bg-slate-100 text-slate-400" : l.progress === 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white"}`}>
                  {l.locked ? <Lock size={11} /> : l.n}
                </span>
                <button onClick={() => toggleLesson(l)} className="min-w-0 flex-1 text-left">
                  <span className="font-medium text-sm truncate block">{l.title}</span>
                </button>
                <span className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <Pill className="bg-slate-100 text-slate-500 font-mono">{(l.built || l.parts || []).length} blocks</Pill>
                  <button onClick={() => setManageLesson(l)} title="Assign / unassign students"
                    className={`inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5 transition-colors ${nAssigned ? "bg-teal-50 text-teal-700 hover:bg-teal-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                    <Users size={11} /> {nAssigned}
                  </button>
                </span>
                <Btn variant="ghost" size="sm" onClick={() => !l.locked && go({ lessonId: l.id })} className="shrink-0">Open <ChevronRight size={13} /></Btn>
              </div>

              {isOpen && (
                <div className="ml-[38px] border-l border-slate-200 pl-3 pb-2">
                  {blocks.map((b) => {
                    const BT = BLOCK_TYPES[b.type]; const I = BT.icon;
                    const nComps = blockComponents(b, state.texts).length;
                    return (
                      <div key={b.id} className="group flex items-center gap-2.5 py-1.5 pr-2 rounded-lg hover:bg-slate-50">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${BT.tone}`}><I size={13} /></span>
                        <button onClick={() => go({ lessonId: l.id, partId: b.id })} className="min-w-0 flex-1 text-left">
                          <span className="text-sm text-slate-700 truncate block">{b.title || BT.label}
                            <span className="text-[11px] text-slate-400 ml-1.5 font-mono">{BT.label.toLowerCase()} · {nComps} comp.</span>
                          </span>
                        </button>
                        <button title="Save to My Blocks" onClick={() => saveBlock(b, l)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 p-1 transition-opacity"><BookmarkPlus size={14} /></button>
                        <button title="Open in studio" onClick={() => go({ lessonId: l.id, partId: b.id })}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 p-1 transition-opacity"><Eye size={14} /></button>
                      </div>
                    );
                  })}
                  {!blocks.length && <p className="text-xs text-slate-400 py-1.5">Loading blocks…</p>}
                </div>
              )}
            </div>
          );
        })}
        {!lessons.length && <p className="text-sm text-slate-400 p-4">No lessons yet — add the first one.</p>}
      </Card>

      {/* ---- Students branch ---- */}
      <SectionLabel right={
        <button onClick={() => setEnrollOpen((v) => !v)} className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
          <UserPlus size={13} /> Enroll student
        </button>
      }>
        <span className="inline-flex items-center gap-1.5"><Users size={13} /> Students in this course · {enrolled.length}</span>
      </SectionLabel>

      {enrollOpen && (
        <Card className="p-3 mb-3">
          <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-2">Pick a student to enroll</div>
          {others.length ? (
            <div className="flex flex-wrap gap-2">
              {others.map((s) => (
                <button key={s.id}
                  onClick={() => { dispatch({ type: "SET_STUDENT_COURSE", studentId: s.id, courseId: course.id }); toast(`${s.name.split(" ")[0]} enrolled in ${course.title}`); setEnrollOpen(false); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 text-sm">
                  <Avatar name={s.name} size={6} /> {s.name} <span className="text-[10px] text-slate-400 font-mono">{s.level}</span>
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">Everyone is already enrolled here.</p>}
        </Card>
      )}

      <Card className="divide-y divide-slate-50 mb-6">
        {enrolled.map((s) => {
          const nLessons = (s.assignedLessons || []).length;
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => go({ tab: "students", studentId: s.id })} className="shrink-0"><Avatar name={s.name} /></button>
              <button onClick={() => go({ tab: "students", studentId: s.id })} className="min-w-0 flex-1 text-left">
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{s.level} · {nLessons} lesson{nLessons !== 1 ? "s" : ""} assigned</div>
              </button>
              <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end max-w-[40%]">
                {(s.assignedLessons || []).map((lid) => {
                  const l = lessons.find((x) => x.id === lid);
                  return l ? <Pill key={lid} className="bg-indigo-50 text-indigo-700 font-mono">L{l.n}</Pill> : null;
                })}
              </div>
              <button title={`Unenroll from ${course.title}`}
                onClick={() => { dispatch({ type: "SET_STUDENT_COURSE", studentId: s.id, courseId: null }); toast(`${s.name.split(" ")[0]} unenrolled`); }}
                className="text-slate-300 hover:text-rose-500 p-1 shrink-0"><UserMinus size={15} /></button>
            </div>
          );
        })}
        {!enrolled.length && <p className="text-sm text-slate-400 p-4">No students enrolled — use “Enroll student” above.</p>}
      </Card>

      <NewLessonModal open={modal} onClose={() => setModal(false)} courseId={route.courseId} />
      <ManageLessonStudentsModal lesson={manageLesson} course={course} enrolled={enrolled} onClose={() => setManageLesson(null)} />
    </Page>
  );
}

/* Assign / unassign a lesson per student — checkbox list of enrolled students. */
function ManageLessonStudentsModal({ lesson, course, enrolled, onClose }) {
  const { dispatch, toast } = useStore();
  if (!lesson) return null;
  return (
    <Modal open onClose={onClose} title={`Lesson ${lesson.n}: ${lesson.title}`} sub="Tick a student to assign this lesson; untick to unassign"
      footer={<Btn onClick={onClose}>Done</Btn>}>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {enrolled.map((s) => {
          const on = (s.assignedLessons || []).includes(lesson.id);
          return (
            <button key={s.id}
              onClick={() => {
                dispatch({ type: on ? "UNASSIGN_LESSON" : "ASSIGN_LESSON", studentId: s.id, lessonId: lesson.id });
                toast(`${on ? "Unassigned from" : "Assigned to"} ${s.name.split(" ")[0]}`);
              }}
              className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{s.level} · {(s.assignedLessons || []).length} lessons assigned</div>
              </div>
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                {on && <Check size={13} className="text-white" />}
              </span>
            </button>
          );
        })}
        {!enrolled.length && <p className="text-sm text-slate-400 p-2">No students enrolled in {course.title} yet.</p>}
      </div>
    </Modal>
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
  // saved blocks whose type this course's template accepts
  const compatibleBank = state.blockBank.filter((b) => availableTypes.includes(b.type));

  function addBlock(type) {
    const BT = BLOCK_TYPES[type];
    dispatch({ type: "ADD_PART", courseId: route.courseId, lessonId: route.lessonId,
      part: { id: `p${Date.now()}`, type, title: BT.label, meta: "—" } });
    toast(`Added ${BT.label} block`);
  }
  function addFromBank(item) {
    dispatch({ type: "ADD_PART", courseId: route.courseId, lessonId: route.lessonId, part: partFromBank(item) });
    toast(`“${item.title}” inserted from My Blocks`);
  }
  function saveTitle(b) {
    dispatch({ type: "UPDATE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, patch: { title: draft } });
    setEditing(null);
  }
  function saveToBank(b) {
    dispatch({ type: "SAVE_BLOCK_TO_BANK", block: b, from: `${course.title} · Lesson ${lesson.n}` });
    toast(`“${b.title || BLOCK_TYPES[b.type].label}” saved to My Blocks`);
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
                      <button title="Save to My Blocks" onClick={() => saveToBank(b)} className="hover:text-indigo-600 p-1"><BookmarkPlus size={14} /></button>
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

      <AddBlockModal open={addOpen} onClose={() => setAddOpen(false)} onPick={addBlock} types={availableTypes}
        usedCounts={usedCounts} bank={compatibleBank} onPickBank={addFromBank} />
      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} what={`${course.title} — Lesson ${lesson.n}: ${lesson.title}`} kind="lesson" />
    </Page>
  );
}
