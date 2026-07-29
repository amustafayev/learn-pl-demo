import React, { useState, useEffect } from "react";
import {
  Plus, ChevronRight, ChevronDown, Lock, ArrowUp, ArrowDown, Trash2, Pencil,
  Send, Eye, Users, UserPlus, Search, Maximize2, Minimize2, Radio,
  BookmarkPlus, FolderTree,
} from "lucide-react";
import { Page, PageHead, Crumbs, Card, Bar, Btn, Pill, SectionLabel, Avatar, Modal, StudentCheckList } from "../ui.jsx";
import { useStore, useNav, lessonBlocks, saveBlockToBank, saveComponentToBank } from "../store.jsx";
import { HUE_SOFT, BLOCK_TYPES, LESSON_TEMPLATES, blockMeta, blockRail } from "../data.jsx";
import { NewCourseModal, NewLessonModal, AddBlockModal, AssignModal } from "../components/modals.jsx";
import { COMPONENT_META, blockComponents, componentPreview } from "./parts.jsx";

// Deep-copy a saved bank block into a fresh lesson part — new ids all the way down
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
      <PageHead kicker="Teacher Console · Maryam Bayramova" title="Courses"
        sub="Select a course to view its lessons, pathway content, and active student roster"
        right={<Btn onClick={() => setModal(true)}><Plus size={16} /> New course</Btn>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.courses.map((c) => {
          const count = (state.lessons[c.id] || []).length;
          const enrolled = state.students.filter((s) => s.courseId === c.id);
          return (
            <button key={c.id} onClick={() => go({ courseId: c.id })}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-mono px-2 py-1 rounded-md ${HUE_SOFT[c.hue]}`}>{c.level}</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <div className="text-lg font-bold mb-1">{c.title}</div>
                <div className="text-sm text-slate-500 mb-1">{count} lessons · {enrolled.length} enrolled students</div>
                <div className="text-[11px] text-slate-400 mb-4">{LESSON_TEMPLATES[c.templateId]?.label || "General English"} template</div>
              </div>

              <div>
                {/* Enrolled student avatars preview */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="flex -space-x-2 overflow-hidden">
                    {enrolled.slice(0, 4).map((s) => (
                      <Avatar key={s.id} name={s.name} size={6} />
                    ))}
                  </div>
                  {enrolled.length > 4 && (
                    <span className="text-xs text-slate-400 font-mono ml-1">+{enrolled.length - 4} more</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Avg completion</span>
                  <span className="font-mono">{c.completion}%</span>
                </div>
                <Bar pct={c.completion} hue={c.hue} />
              </div>
            </button>
          );
        })}
      </div>
      <NewCourseModal open={modal} onClose={() => setModal(false)} />
    </Page>
  );
}

/* ----------------------------- course → lessons & users -----------------------------
   Clean hierarchy: Course -> Lessons List. Each lesson card explicitly lists
   the students working on that lesson, its pathway steps sequence, and actions. */

export function CourseView() {
  const { state, dispatch, toast } = useStore();
  const { route, go, startLive } = useNav();
  const [modal, setModal] = useState(false);
  const [manageLesson, setManageLesson] = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedLessons, setExpandedLessons] = useState({});
  const [expandedBlocks, setExpandedBlocks] = useState({});

  const course = state.courses.find((c) => c.id === route.courseId);
  const lessons = state.lessons[route.courseId] || [];
  const enrolled = state.students.filter((s) => s.courseId === course?.id);
  const others = state.students.filter((s) => s.courseId !== course?.id);

  // Hydrate every lesson's shorthand `parts` into a real `built` array with
  // stable ids as soon as the tree needs to show them — without this, a
  // lesson never opened in the builder gets fresh synthetic block ids on
  // every render, which breaks the tree's own expand/collapse state.
  useEffect(() => {
    lessons.forEach((l) => {
      if (!l.built || !l.built.length) dispatch({ type: "ENSURE_BUILT", courseId: route.courseId, lessonId: l.id });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.courseId, lessons.length]);

  if (!course) return null;

  const q = query.trim().toLowerCase();
  const toggleLesson = (id) => setExpandedLessons((m) => ({ ...m, [id]: !m[id] }));
  const toggleBlock = (key) => setExpandedBlocks((m) => ({ ...m, [key]: !m[key] }));

  // The whole tree (Lesson → Block → Component), built once per render so
  // the header row, the block rail and the expanded body all read off the
  // same numbers. Search matches roll up: a matching component reveals its
  // block, a matching block reveals its lesson.
  const tree = lessons.map((l) => {
    const blocks = lessonBlocks(l).map((b) => ({ ...b, components: blockComponents(b, state.texts) }));
    const workingStudents = enrolled.filter((s) => (s.assignedLessons || []).includes(l.id));
    const totalComponents = blocks.reduce((n, b) => n + b.components.length, 0);

    let lessonMatch = !!q && l.title.toLowerCase().includes(q);
    const blockMatch = {};
    if (q) blocks.forEach((b) => {
      const BT = blockMeta(b.type);
      const blockHit = (b.title || BT.label).toLowerCase().includes(q) || BT.label.toLowerCase().includes(q);
      const compHit = b.components.some((c) => {
        const label = (COMPONENT_META[c.kind]?.label || c.kind).toLowerCase();
        return label.includes(q) || componentPreview(c, state.texts).toLowerCase().includes(q);
      });
      if (blockHit || compHit) { blockMatch[b.id] = true; lessonMatch = true; }
    });

    return { lesson: l, blocks, workingStudents, totalComponents, lessonMatch, blockMatch };
  });
  const visibleTree = q ? tree.filter((t) => t.lessonMatch) : tree;

  function expandAll() {
    const nextL = {}; const nextB = {};
    tree.forEach((t) => { nextL[t.lesson.id] = true; t.blocks.forEach((b) => { nextB[`${t.lesson.id}:${b.id}`] = true; }); });
    setExpandedLessons(nextL); setExpandedBlocks(nextB);
  }
  const collapseAll = () => { setExpandedLessons({}); setExpandedBlocks({}); };

  return (
    <Page>
      <Crumbs items={[{ label: "Courses", onClick: () => go({ courseId: null }) }, { label: course.title }]} />
      <PageHead title={course.title}
        sub={`${course.level} · ${LESSON_TEMPLATES[course.templateId]?.label || "General English"} · ${lessons.length} lessons · ${enrolled.length} enrolled students`}
        right={
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" onClick={() => setEnrollOpen((v) => !v)}>
              <UserPlus size={14} /> Enroll student
            </Btn>
            <Btn size="sm" onClick={() => setModal(true)}><Plus size={16} /> New lesson</Btn>
          </div>
        } />

      {/* Enroll student panel */}
      {enrollOpen && (
        <Card className="p-4 mb-6 border-indigo-200 bg-indigo-50/30">
          <div className="text-xs font-mono uppercase tracking-wide text-slate-500 mb-3 font-semibold">Pick a student to enroll in {course.title}</div>
          {others.length ? (
            <div className="flex flex-wrap gap-2">
              {others.map((s) => (
                <button key={s.id}
                  onClick={() => { dispatch({ type: "SET_STUDENT_COURSE", studentId: s.id, courseId: course.id }); toast(`${s.name.split(" ")[0]} enrolled in ${course.title}`); setEnrollOpen(false); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 p-2 text-sm shadow-sm transition-all">
                  <Avatar name={s.name} size={6} />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{s.level}</span>
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">All students are currently enrolled in this course.</p>}
        </Card>
      )}

      {/* Course tree: Lesson → Block → Component */}
      <SectionLabel right={
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a block or component…"
              className="text-xs border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 w-56 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
          </div>
          <button onClick={expandAll} className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"><Maximize2 size={12} /> Expand all</button>
          <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"><Minimize2 size={12} /> Collapse all</button>
        </div>
      }>
        <span className="inline-flex items-center gap-1.5">
          <FolderTree size={14} /> Course tree ({lessons.length} lessons) — lessons → blocks → components
        </span>
      </SectionLabel>

      <div className="space-y-3 mb-8">
        {visibleTree.map(({ lesson: l, blocks, workingStudents, totalComponents, blockMatch }) => {
          const isOpen = q ? true : !!expandedLessons[l.id];

          return (
            <Card key={l.id} className={`!p-0 overflow-hidden transition-all ${l.current ? "border-indigo-300 ring-2 ring-indigo-100" : "hover:border-slate-300"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleLesson(l.id)} className="text-slate-400 hover:text-indigo-600 shrink-0 p-1 -ml-1">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-mono font-bold shrink-0 ${
                    l.locked ? "bg-slate-100 text-slate-400" : l.progress === 100 ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"}`}>
                    {l.locked ? <Lock size={14} /> : `L${l.n}`}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-800 truncate">{l.title}</h3>
                      {l.current && <Pill className="bg-indigo-100 text-indigo-700 font-mono text-[10px] shrink-0">Current Lesson</Pill>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {blocks.length} blocks · {totalComponents} components · {workingStudents.length} student{workingStudents.length !== 1 ? "s" : ""} working
                    </div>
                  </div>
                </div>

                {/* Lesson Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Btn variant="outline" size="sm" onClick={() => startLive({ courseId: course.id, lessonId: l.id })} className="!text-rose-600 !border-rose-200">
                    <Radio size={13} /> Go live
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => setManageLesson(l)}>
                    <Users size={13} /> Manage Users ({workingStudents.length})
                  </Btn>
                  <Btn size="sm" onClick={() => go({ lessonId: l.id })}>
                    Open Lesson Pathway <ChevronRight size={14} />
                  </Btn>
                </div>
              </div>

              {/* Block rail — density at a glance, without expanding: one tick
                  per Block, taller/filled ticks hold more Components. */}
              <button onClick={() => toggleLesson(l.id)} title="Click to expand the blocks below"
                className="w-full flex items-end gap-1 px-5 py-3 border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                {blocks.map((b) => (
                  <span key={b.id} title={`${blockMeta(b.type).label} · ${b.components.length} component${b.components.length === 1 ? "" : "s"}`}
                    className={`flex-1 rounded-full ${blockRail(b.type)} ${blockMatch[b.id] ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                    style={{ height: `${Math.min(14, 5 + b.components.length * 2)}px`, opacity: b.components.length ? 1 : .3 }} />
                ))}
                {!blocks.length && <span className="text-xs text-slate-300">No blocks yet</span>}
              </button>

              {/* Users Working on this Lesson List */}
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1">
                    <Users size={12} /> Students working on this lesson ({workingStudents.length})
                  </span>
                  <button onClick={() => setManageLesson(l)} className="text-xs text-indigo-600 hover:underline font-medium">
                    + Assign / Remove Students
                  </button>
                </div>

                {workingStudents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {workingStudents.map((s) => {
                      const currentStep = s.step >= 0 && s.step < blocks.length ? blocks[s.step]?.title || blockMeta(blocks[s.step]?.type).label : "Finished";
                      return (
                        <div key={s.id} onClick={() => go({ tab: "students", studentId: s.id })}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition-colors">
                          <Avatar name={s.name} size={7} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-800 truncate">{s.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {s.progress === 100 ? "Completed ✓" : `On Step: ${currentStep}`}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {s.progress}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">No students assigned to this lesson yet. Click "+ Assign / Remove Students" to assign users.</p>
                )}
              </div>

              {/* Blocks → Components — the two levels beneath the lesson */}
              {isOpen && (
                <div className="px-5 py-4">
                  {blocks.map((b) => {
                    const BT = blockMeta(b.type); const I = BT.icon;
                    const key = `${l.id}:${b.id}`;
                    const bOpen = q ? !!blockMatch[b.id] : !!expandedBlocks[key];
                    const studentsOnBlock = workingStudents.filter((s) => blocks[s.step] === b);
                    return (
                      <div key={b.id} className="mb-1.5 last:mb-0">
                        <div className="group flex items-center gap-2 py-1.5 rounded-lg hover:bg-slate-50">
                          <button onClick={() => toggleBlock(key)} className="text-slate-400 hover:text-indigo-600 p-0.5 shrink-0">
                            {bOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${BT.tone}`}><I size={13} /></span>
                          <button onClick={() => go({ lessonId: l.id, partId: b.id })} className="min-w-0 flex-1 text-left">
                            <span className="text-sm font-medium text-slate-700 truncate">{b.title || BT.label}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">
                              {b.components.length} component{b.components.length === 1 ? "" : "s"}
                              {studentsOnBlock.length ? ` · ${studentsOnBlock.length} student${studentsOnBlock.length === 1 ? "" : "s"} here` : ""}
                            </span>
                          </button>
                          <button title="Save block to My Blocks"
                            onClick={() => saveBlockToBank(dispatch, toast, b, `${course.title} · Lesson ${l.n}`)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 p-1 transition-opacity shrink-0">
                            <BookmarkPlus size={13} />
                          </button>
                        </div>

                        {bOpen && (
                          <div className="ml-[38px] border-l border-slate-200 pl-3">
                            {b.components.map((c) => {
                              const M = COMPONENT_META[c.kind] || { label: c.kind, icon: BookmarkPlus, tone: "bg-slate-100 text-slate-500" };
                              const CI = M.icon;
                              return (
                                <div key={c.id} className="group flex items-center gap-2 py-1 pr-1 rounded-lg hover:bg-slate-50">
                                  <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${M.tone}`}><CI size={11} /></span>
                                  <button onClick={() => go({ lessonId: l.id, partId: b.id })} className="min-w-0 flex-1 text-left">
                                    <span className="text-xs text-slate-600">{M.label}</span>
                                    <span className="text-[11px] text-slate-400 ml-1.5">{componentPreview(c, state.texts)}</span>
                                  </button>
                                  <button title="Save component to library"
                                    onClick={() => saveComponentToBank(dispatch, toast, c, `${b.title || BT.label} — ${M.label}`, `${course.title} · Lesson ${l.n}`)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 p-1 transition-opacity shrink-0">
                                    <BookmarkPlus size={11} />
                                  </button>
                                </div>
                              );
                            })}
                            {!b.components.length && <p className="text-xs text-slate-300 py-1">No components yet — open the block to add one.</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!blocks.length && <p className="text-xs text-slate-400">No blocks in this lesson yet — open it to add the first one.</p>}
                </div>
              )}
            </Card>
          );
        })}

        {!visibleTree.length && (
          <p className="text-sm text-slate-400 p-4">
            {q ? `No blocks or components match “${query}”.` : "No lessons in this course yet."}
          </p>
        )}
      </div>

      <NewLessonModal open={modal} onClose={() => setModal(false)} courseId={route.courseId} />
      <ManageLessonStudentsModal lesson={manageLesson} course={course} enrolled={enrolled} onClose={() => setManageLesson(null)} />
    </Page>
  );
}

/* Assign / unassign a lesson per student modal */
function ManageLessonStudentsModal({ lesson, course, enrolled, onClose }) {
  const { dispatch, toast } = useStore();
  if (!lesson) return null;
  return (
    <Modal open onClose={onClose} title={`Assign Lesson ${lesson.n}: ${lesson.title}`} sub="Select students working on this lesson"
      footer={<Btn onClick={onClose}>Done</Btn>}>
      <StudentCheckList students={enrolled}
        isSelected={(s) => (s.assignedLessons || []).includes(lesson.id)}
        onToggle={(s) => {
          const on = (s.assignedLessons || []).includes(lesson.id);
          dispatch({ type: on ? "UNASSIGN_LESSON" : "ASSIGN_LESSON", studentId: s.id, lessonId: lesson.id });
          toast(`${on ? "Unassigned from" : "Assigned to"} ${s.name.split(" ")[0]}`);
        }}
        metaFor={(s) => `${s.level} · ${(s.assignedLessons || []).length} lessons assigned`}
        emptyText={`No students enrolled in ${course.title} yet.`} />
    </Modal>
  );
}

/* ----------------------------- lesson pathway builder -----------------------------
   Structured Lesson Pathway View: Passage -> Words -> Videos -> Listenings -> Grammar -> Practice Grammar -> Homework */

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

  if (!lesson || !course) return null;
  const blocks = lesson.built || [];
  const enrolled = state.students.filter((s) => s.courseId === course.id);
  const workingStudents = enrolled.filter((s) => (s.assignedLessons || []).includes(lesson.id));

  const availableTypes = LESSON_TEMPLATES[course.templateId]?.blockTypes || LESSON_TEMPLATES.general.blockTypes;
  const usedCounts = blocks.reduce((acc, b) => ({ ...acc, [b.type]: (acc[b.type] || 0) + 1 }), {});
  const compatibleBank = state.blockBank.filter((b) => availableTypes.includes(b.type));

  function addBlock(type) {
    const BT = BLOCK_TYPES[type];
    dispatch({ type: "ADD_PART", courseId: route.courseId, lessonId: route.lessonId,
      part: { id: `p${Date.now()}`, type, title: BT.label, meta: "—" } });
    toast(`Added ${BT.label} step`);
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
    saveBlockToBank(dispatch, toast, b, `${course.title} · Lesson ${lesson.n}`);
  }

  return (
    <Page>
      <Crumbs items={[
        { label: "Courses", onClick: () => go({ courseId: null, lessonId: null }) },
        { label: course.title, onClick: () => go({ lessonId: null }) },
        { label: `Lesson ${lesson.n}: ${lesson.title}` },
      ]} />

      <PageHead title={`Lesson ${lesson.n}: ${lesson.title}`} sub={`${course.title} (${course.level}) · Structured Pathway Flow (${blocks.length} steps)`}
        right={<div className="flex gap-2">
          <Btn variant="outline" size="sm" onClick={() => startLive({ courseId: route.courseId, lessonId: route.lessonId })} className="!text-rose-600 !border-rose-200 hover:!border-rose-300">
            <Radio size={14} /> Go live
          </Btn>
          <Btn variant="outline" size="sm" onClick={() => setAssignOpen(true)}><Send size={14} /> Assign Students</Btn>
          <Btn size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Step</Btn>
        </div>} />

      {/* Active Students Working on this Lesson Bar */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-indigo-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-800">Students working on this lesson ({workingStudents.length})</h4>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setAssignOpen(true)} className="text-indigo-600 text-xs">
            + Manage Students
          </Btn>
        </div>

        {workingStudents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {workingStudents.map((s) => {
              const stepName = s.step >= 0 && s.step < blocks.length ? blocks[s.step]?.title || BLOCK_TYPES[blocks[s.step]?.type]?.label : "Finished";
              return (
                <div key={s.id} onClick={() => go({ tab: "students", studentId: s.id })}
                  className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300">
                  <Avatar name={s.name} size={6} />
                  <span className="text-xs font-semibold text-slate-800">{s.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({stepName})</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{s.progress}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No students assigned to this lesson yet.</p>
        )}
      </Card>

      {/* Pathway Flow Layout */}
      <SectionLabel>Structured Pathway Flow (Passage → Words → Videos → Listenings → Grammar → Practice Grammar → Playground → Homework)</SectionLabel>

      <div className="relative space-y-3 mb-8">
        {blocks.map((b, i) => {
          const BT = blockMeta(b.type);
          const I = BT.icon;
          return (
            <div key={b.id} className="relative pl-10">
              {i < blocks.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-indigo-100" />}
              <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-xs font-mono font-bold text-indigo-600 shadow-sm">
                {i + 1}
              </div>

              <div className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button onClick={() => go({ partId: b.id })} className="flex items-center gap-3.5 min-w-0 flex-1 text-left">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${BT.tone}`}><I size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 font-semibold">{BT.label}</div>
                    {editing === b.id ? (
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => saveTitle(b)} onKeyDown={(e) => e.key === "Enter" && saveTitle(b)}
                        className="w-full text-base font-semibold border-b-2 border-indigo-500 focus:outline-none" />
                    ) : (
                      <div className="font-bold text-base text-slate-800 truncate">{b.title || BT.label}</div>
                    )}
                    {b.meta && b.meta !== "—" && <div className="text-xs text-slate-400 truncate mt-0.5">{b.meta}</div>}
                  </div>
                </button>

                {/* Step controls */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  <Btn variant="ghost" size="sm" onClick={() => go({ partId: b.id })} className="!text-indigo-600 font-semibold">
                    <Eye size={14} /> Open Step
                  </Btn>
                  <div className="flex items-center gap-1 text-slate-300">
                    <button title="Save to My Blocks" onClick={() => saveToBank(b)} className="hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100"><BookmarkPlus size={14} /></button>
                    <button title="Rename" onClick={() => { setEditing(b.id); setDraft(b.title || BT.label); }} className="hover:text-slate-600 p-1.5 rounded hover:bg-slate-100"><Pencil size={14} /></button>
                    <button title="Move up" disabled={i === 0} onClick={() => dispatch({ type: "MOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, dir: -1 })} className="hover:text-slate-600 p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button title="Move down" disabled={i === blocks.length - 1} onClick={() => dispatch({ type: "MOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, dir: 1 })} className="hover:text-slate-600 p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button title="Remove" onClick={() => { dispatch({ type: "REMOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id }); toast("Step removed"); }} className="hover:text-rose-500 p-1.5 rounded hover:bg-slate-100"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!blocks.length && (
          <button onClick={() => setAddOpen(true)} className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 text-sm font-medium">
            <Plus size={18} className="inline mr-1" /> Add the first step to the pathway
          </button>
        )}
      </div>

      <AddBlockModal open={addOpen} onClose={() => setAddOpen(false)} onPick={addBlock} types={availableTypes}
        usedCounts={usedCounts} bank={compatibleBank} onPickBank={addFromBank} />
      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} what={`${course.title} — Lesson ${lesson.n}: ${lesson.title}`} kind="lesson" />
    </Page>
  );
}

