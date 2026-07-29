import React, { useState, useEffect } from "react";
import {
  Plus, ChevronRight, Lock, ArrowUp, ArrowDown, Trash2, Pencil,
  Send, Eye, Radio, Users, UserPlus,
  BookmarkPlus, FolderTree,
} from "lucide-react";
import { Page, PageHead, Crumbs, Card, Bar, Btn, Pill, SectionLabel, Avatar, Modal, StudentCheckList } from "../ui.jsx";
import { useStore, useNav, lessonBlocks, saveBlockToBank } from "../store.jsx";
import { HUE_SOFT, BLOCK_TYPES, LESSON_TEMPLATES, blockMeta } from "../data.jsx";
import { NewCourseModal, NewLessonModal, AddBlockModal, AssignModal } from "../components/modals.jsx";

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

  const course = state.courses.find((c) => c.id === route.courseId);
  const lessons = state.lessons[route.courseId] || [];
  const enrolled = state.students.filter((s) => s.courseId === course.id);
  const others = state.students.filter((s) => s.courseId !== course.id);

  if (!course) return null;

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

      {/* Course Lessons Pathway List */}
      <SectionLabel>
        <span className="inline-flex items-center gap-1.5">
          <FolderTree size={14} /> Course Lessons ({lessons.length}) — Each lesson shows working students & pathway flow
        </span>
      </SectionLabel>

      <div className="space-y-4 mb-8">
        {lessons.map((l) => {
          const blocks = lessonBlocks(l);
          // Get list of students working on/assigned to this specific lesson
          const workingStudents = enrolled.filter((s) => (s.assignedLessons || []).includes(l.id));

          return (
            <Card key={l.id} className={`p-5 transition-all ${l.current ? "border-indigo-300 ring-2 ring-indigo-100" : "hover:border-slate-300"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-mono font-bold shrink-0 ${
                    l.locked ? "bg-slate-100 text-slate-400" : l.progress === 100 ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"}`}>
                    {l.locked ? <Lock size={14} /> : `L${l.n}`}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-800">{l.title}</h3>
                      {l.current && <Pill className="bg-indigo-100 text-indigo-700 font-mono text-[10px]">Current Lesson</Pill>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {blocks.length} pathway steps · {workingStudents.length} student{workingStudents.length !== 1 ? "s" : ""} working on this lesson
                    </div>
                  </div>
                </div>

                {/* Lesson Actions */}
                <div className="flex items-center gap-2">
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

              {/* Lesson Content Flow Summary (Pathway style) */}
              <div className="py-3 border-b border-slate-100">
                <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-2">Pathway Flow:</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {blocks.map((b, i) => {
                    const BT = blockMeta(b.type);
                    return (
                      <React.Fragment key={i}>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium ${BT.tone}`}>
                          {BT.label || b.title}
                        </span>
                        {i < blocks.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Users Working on this Lesson List */}
              <div className="pt-3">
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
                      const currentStep = s.step >= 0 && s.step < blocks.length ? blocks[s.step]?.title || BLOCK_TYPES[blocks[s.step]?.type]?.label : "Finished";
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
            </Card>
          );
        })}

        {!lessons.length && <p className="text-sm text-slate-400 p-4">No lessons in this course yet.</p>}
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

