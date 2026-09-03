import React, { useState, useEffect } from "react";
import {
  IconPlus, IconChevronRight, IconChevronDown, IconLock, IconArrowUp, IconArrowDown, IconTrash, IconPencil,
  IconEye, IconSearch, IconMaximize, IconMinimize,
  IconBookmarkPlus, IconSitemap, IconBook2, IconUsers, IconSchool, IconBroadcast, IconCircleCheck,
} from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, SectionLabel, SegmentedBar, Card, Button, Badge, Tag, CourseCard } from "../design-system.jsx";
import { useStore, useNav, lessonBlocks, saveBlockToBank, saveComponentToBank, activeClassCourse, classesOnCourse, courseAvgProgress } from "../store.jsx";
import { BLOCK_TYPES, LESSON_TEMPLATES, blockMeta } from "../data.jsx";
import { NewCourseModal, NewLessonModal, AddBlockModal } from "../components/modals.jsx";
import { LessonNotesButton, LessonNotesPanel } from "../components/LessonNotesPanel.jsx";
import { COMPONENT_META, blockComponents, componentPreview } from "./parts.jsx";

// Deep-copy a saved bank block into a fresh lesson part — new ids all the way down
export function partFromBank(item) {
  const content = JSON.parse(JSON.stringify(item.content || { components: [] }));
  content.components = (content.components || []).map((c, i) => ({ ...c, id: `c${Date.now()}_${i}` }));
  return { id: `p${Date.now()}`, type: item.type, title: item.title, meta: "from My Blocks", content };
}

// A course's hue is authored as a Tailwind indigo/emerald/etc. hue key —
// map it onto the design-system's own tone vocabulary for the card band.
const HUE_TO_TONE = { indigo: "primary", emerald: "success", amber: "pending", rose: "warning", sky: "info" };

/* ----------------------------- courses list ----------------------------- */

export function CoursesView() {
  const { state } = useStore();
  const { go } = useNav();
  const [modal, setModal] = useState(false);
  return (
    <Page>
      <PageHeader kicker="Teacher Console · Maryam Bayramova" title="Courses"
        sub="Build the lesson pathway — rosters and progress live in Classes"
        right={<Button variant="primary" onClick={() => setModal(true)}><IconPlus size={16} stroke={1.75} /> New course</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.courses.map((c) => {
          const count = (state.lessons[c.id] || []).length;
          const classCount = state.classes.filter((cls) => activeClassCourse(cls)?.courseId === c.id).length;
          const tone = HUE_TO_TONE[c.hue] || "primary";
          return (
            <CourseCard key={c.id} icon={IconBook2} tone={tone} title={c.title}
              creatorLabel="Designed by" creatorName={state.teacher.name} creatorColor="dark"
              category={`${LESSON_TEMPLATES[c.templateId]?.label || "General English"} template`}
              stats={[{ icon: IconUsers, value: `${classCount} class${classCount === 1 ? "" : "es"}` }, { icon: IconSchool, value: `${count} lesson${count === 1 ? "" : "s"}` }]}
              progressPct={courseAvgProgress(state, c.id)} onViewDetail={() => go({ courseId: c.id })} />
          );
        })}
      </div>
      <NewCourseModal open={modal} onClose={() => setModal(false)} />
    </Page>
  );
}

/* ----------------------------- course → lessons -----------------------------
   Pure content authoring: Course -> Lessons -> Blocks -> Components. No
   roster, no assignment — rosters, enrollment, and lesson-progress live in
   the Classes tab (see views/Classes.jsx). A class assigned to this course
   is just working through whatever's built here.

   This is also the SAME page a Class's course card opens — clicking a
   course from a Class (Classes.jsx) sends you here with ?classId= set, so
   the identical page shows that class's own progress (current lesson,
   locked/done state) instead of the course's generic authored state. Two
   different pieces of metadata layered onto one page, not two pages. */

export function CourseView() {
  const { state, dispatch, toast } = useStore();
  const { route, go, startLive } = useNav();
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedLessons, setExpandedLessons] = useState({});
  const [expandedBlocks, setExpandedBlocks] = useState({});

  const course = state.courses.find((c) => c.id === route.courseId);
  const lessons = state.lessons[route.courseId] || [];

  // Viewed "as" a specific class (?classId=) — its progress replaces the
  // course's own authored lock/current/progress fields below. Absent this,
  // the tree shows the course's generic template state (no class taken it).
  const cls = route.classId ? state.classes.find((c) => c.id === route.classId) : null;
  const classCourse = cls?.courses.find((c) => c.courseId === course?.id) || null;
  const classCurrentIndex = classCourse ? lessons.findIndex((l) => l.id === classCourse.currentLessonId) : -1;

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

  // A lesson has no progress/lock/current state of its own — a course is
  // pure authored content until a class is actually assigned to it. Viewed
  // through a class (?classId=), the tree shows THAT class's real position;
  // viewed plainly from Courses, `progress` comes back `null` so the badge
  // and lock icon disappear entirely rather than showing a made-up state.
  function classLessonView(l, i) {
    if (!classCourse) return { locked: false, progress: null, current: false };
    if (classCourse.status === "done") return { locked: false, progress: 100, current: false };
    if (classCurrentIndex < 0) return { locked: false, progress: 0, current: false };
    if (i < classCurrentIndex) return { locked: false, progress: 100, current: false };
    if (i === classCurrentIndex) return { locked: false, progress: 50, current: true };
    return { locked: true, progress: 0, current: false };
  }

  // The whole tree (Lesson → Block → Component), built once per render so
  // the header row, the block rail and the expanded body all read off the
  // same numbers. Search matches roll up: a matching component reveals its
  // block, a matching block reveals its lesson.
  const tree = lessons.map((l, i) => {
    const blocks = lessonBlocks(l).map((b) => ({ ...b, components: blockComponents(b, state.texts) }));
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

    return { lesson: l, view: classLessonView(l, i), blocks, totalComponents, lessonMatch, blockMatch };
  });
  const visibleTree = q ? tree.filter((t) => t.lessonMatch) : tree;

  function expandAll() {
    const nextL = {}; const nextB = {};
    tree.forEach((t) => { nextL[t.lesson.id] = true; t.blocks.forEach((b) => { nextB[`${t.lesson.id}:${b.id}`] = true; }); });
    setExpandedLessons(nextL); setExpandedBlocks(nextB);
  }
  const collapseAll = () => { setExpandedLessons({}); setExpandedBlocks({}); };

  const overallPct = classCourse
    ? (classCourse.status === "done" ? 100 : lessons.length ? Math.round(((classCurrentIndex + 1) / lessons.length) * 100) : 0)
    : null;
  // Plain course view (no ?classId=) — there's no single "progress" to show
  // for the course itself, only for each class actually assigned to it.
  const onCourse = !cls ? classesOnCourse(state, course.id) : [];

  return (
    <Page>
      <Breadcrumbs items={cls ? [
        { label: "Classes", onClick: () => go({ tab: "classes", classId: null }) },
        { label: cls.name, onClick: () => go({ tab: "classes", classId: cls.id }) },
        { label: course.title },
      ] : [{ label: "Courses", onClick: () => go({ courseId: null }) }, { label: course.title }]} />
      <PageHeader title={course.title}
        sub={cls ? `${cls.name} · ${course.level} · ${lessons.length} lessons` : `${course.level} · ${LESSON_TEMPLATES[course.templateId]?.label || "General English"} · ${lessons.length} lessons`}
        right={<div className="flex items-center gap-2">
          {classCourse && (
            <Button variant="light" size="sm" onClick={() => {
              const next = classCourse.status === "done" ? "in-progress" : "done";
              dispatch({ type: "SET_CLASS_COURSE_STATUS", classId: cls.id, courseId: course.id, status: next });
              toast(next === "done" ? `${course.title} marked completed for ${cls.name}` : `${course.title} reopened for ${cls.name}`);
            }}>
              {classCourse.status === "done" ? "Reopen course" : <><IconCircleCheck size={14} stroke={1.75} /> Mark as completed</>}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setModal(true)}><IconPlus size={16} stroke={1.75} /> New lesson</Button>
        </div>} />

      {classCourse ? (
        <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-3xl font-bold text-neutral-950">{overallPct}%</span>
            <span className="text-sm font-semibold text-neutral-600">Total Progress</span>
          </div>
          <div className="flex-1 min-w-[160px]"><SegmentedBar pct={overallPct} /></div>
          <Badge color={classCourse.status === "done" ? "success" : "pending"} className="shrink-0">{classCourse.status === "done" ? "Completed" : "In Progress"}</Badge>
        </Card>
      ) : (
        // No class context — a course has no progress of its own, only as
        // many progress numbers as classes actually assigned to it.
        <Card className="p-5 mb-6">
          <div className="text-sm font-semibold text-neutral-600 mb-3">
            {onCourse.length ? `Taught in ${onCourse.length} class${onCourse.length === 1 ? "" : "es"}` : "Not assigned to any class yet"}
          </div>
          {onCourse.length ? (
            <div className="space-y-3">
              {onCourse.map(({ cls: c, entry, pct }) => (
                <button key={c.id} onClick={() => go({ tab: "classes", classId: c.id, courseId: course.id })}
                  className="w-full flex items-center gap-3 text-left hover:opacity-80">
                  <span className="text-sm font-medium text-neutral-900 w-40 truncate shrink-0">{c.name}</span>
                  <div className="flex-1 min-w-[120px]"><SegmentedBar pct={pct} /></div>
                  <span className="text-xs font-mono text-neutral-500 w-10 text-right shrink-0">{pct}%</span>
                  <Badge color={entry.status === "done" ? "success" : "pending"} className="shrink-0">{entry.status === "done" ? "Completed" : "In Progress"}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Assign this course to a class in Classes to start tracking progress.</p>
          )}
        </Card>
      )}

      {/* Course tree: Lesson → Block → Component */}
      <SectionLabel right={
        <div className="flex items-center gap-3">
          <div className="relative">
            <IconSearch size={13} stroke={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a block or component…"
              className="text-xs border border-neutral-300 rounded-lg pl-7 pr-2.5 py-1.5 w-56 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100" />
          </div>
          <button onClick={expandAll} className="text-xs text-neutral-500 hover:text-primary-600 inline-flex items-center gap-1"><IconMaximize size={12} stroke={1.75} /> Expand all</button>
          <button onClick={collapseAll} className="text-xs text-neutral-500 hover:text-primary-600 inline-flex items-center gap-1"><IconMinimize size={12} stroke={1.75} /> Collapse all</button>
        </div>
      }>
        <span className="inline-flex items-center gap-1.5">
          <IconSitemap size={14} stroke={1.75} /> Course tree ({lessons.length} lessons) — lessons → blocks → components
        </span>
      </SectionLabel>

      <div className="space-y-3 mb-8">
        {visibleTree.map(({ lesson: l, view, blocks, totalComponents, blockMatch }) => {
          const isOpen = q ? true : !!expandedLessons[l.id];

          return (
            <Card key={l.id} className={`!p-0 overflow-hidden transition-all ${view.current ? "border-primary-300 ring-2 ring-primary-100" : "hover:border-primary-200 hover:shadow-md"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 pb-4 border-b border-neutral-200">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleLesson(l.id)} className="text-neutral-400 hover:text-primary-600 shrink-0 p-1 -ml-1">
                    {isOpen ? <IconChevronDown size={16} stroke={1.75} /> : <IconChevronRight size={16} stroke={1.75} />}
                  </button>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-mono font-bold shrink-0 ${
                    view.locked ? "bg-neutral-100 text-neutral-400" : view.progress === 100 ? "bg-success-500 text-white" : view.progress == null ? "bg-neutral-100 text-neutral-700" : "bg-primary-500 text-white"}`}>
                    {view.locked ? <IconLock size={14} stroke={1.75} /> : `L${l.n}`}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-900 truncate">{l.title}</h3>
                      {view.current && <Tag color="primary">Current Lesson</Tag>}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {blocks.length} blocks · {totalComponents} components
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {classCourse && classCourse.status !== "done" && !view.current && (
                    <button onClick={() => { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId: cls.id, courseId: course.id, lessonId: l.id }); toast(`${cls.name} is now on Lesson ${l.n}`); }}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700">Set as current</button>
                  )}
                  {classCourse && (
                    <Button variant="outline" size="sm" onClick={() => startLive({ courseId: course.id, classId: cls.id, lessonId: l.id })} className="!text-warning-600 !border-warning-200">
                      <IconBroadcast size={12} stroke={1.75} /> Go live
                    </Button>
                  )}
                  {view.progress != null && (
                    <Badge color={view.locked ? "neutral" : view.progress === 100 ? "success" : view.progress > 0 ? "pending" : "primary"}>
                      {view.locked ? "Locked" : view.progress === 100 ? "Completed" : view.progress > 0 ? "In Progress" : "Not started yet"}
                    </Badge>
                  )}
                  <Button variant="light" size="sm" onClick={() => go({ lessonId: l.id })}>
                    Open Lesson Pathway <IconChevronRight size={14} stroke={1.75} />
                  </Button>
                </div>
              </div>

              {/* Blocks → Components — the two levels beneath the lesson */}
              {isOpen && (
                <div className="px-5 py-4">
                  {blocks.map((b) => {
                    const BT = blockMeta(b.type); const I = BT.icon;
                    const key = `${l.id}:${b.id}`;
                    const bOpen = q ? !!blockMatch[b.id] : !!expandedBlocks[key];
                    return (
                      <div key={b.id} className="mb-1.5 last:mb-0">
                        <div className="group flex items-center gap-2 py-1.5 rounded-lg hover:bg-neutral-50">
                          <button onClick={() => toggleBlock(key)} className="text-neutral-400 hover:text-primary-600 p-0.5 shrink-0">
                            {bOpen ? <IconChevronDown size={13} stroke={1.75} /> : <IconChevronRight size={13} stroke={1.75} />}
                          </button>
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${BT.tone}`}><I size={13} /></span>
                          <button onClick={() => go({ lessonId: l.id, partId: b.id })} className="min-w-0 flex-1 text-left">
                            <span className="text-sm font-medium text-neutral-700 truncate">{b.title || BT.label}</span>
                            <span className="text-[11px] text-neutral-500 ml-1.5">
                              {b.components.length} component{b.components.length === 1 ? "" : "s"}
                            </span>
                          </button>
                          <button title="Save block to My Blocks"
                            onClick={() => saveBlockToBank(dispatch, toast, b, `${course.title} · Lesson ${l.n}`)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-primary-600 p-1 transition-opacity shrink-0">
                            <IconBookmarkPlus size={13} stroke={1.75} />
                          </button>
                        </div>

                        {bOpen && (
                          <div className="ml-[38px] border-l border-neutral-200 pl-3">
                            {b.components.map((c) => {
                              const M = COMPONENT_META[c.kind] || { label: c.kind, icon: IconBookmarkPlus, tone: "bg-neutral-100 text-neutral-500" };
                              const CI = M.icon;
                              const linkedPassage = c.kind === "comprehension" && c.passageRefId && b.components.some((x) => x.id === c.passageRefId);
                              return (
                                <div key={c.id} className={`group flex items-center gap-2 py-1 pr-1 rounded-lg hover:bg-neutral-50 ${linkedPassage ? "ml-4 border-l border-primary-100 pl-2" : ""}`}>
                                  <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${M.tone}`}><CI size={11} /></span>
                                  <button onClick={() => go({ lessonId: l.id, partId: b.id })} className="min-w-0 flex-1 text-left">
                                    <span className="text-xs text-neutral-600">{linkedPassage ? "↳ " : ""}{M.label}</span>
                                    <span className="text-[11px] text-neutral-500 ml-1.5">{componentPreview(c, state.texts)}</span>
                                  </button>
                                  {c.level && <Tag color="neutral">{c.level}</Tag>}
                                  <button title="Save component to library"
                                    onClick={() => saveComponentToBank(dispatch, toast, c, `${b.title || BT.label} — ${M.label}`, `${course.title} · Lesson ${l.n}`)}
                                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-primary-600 p-1 transition-opacity shrink-0">
                                    <IconBookmarkPlus size={11} stroke={1.75} />
                                  </button>
                                </div>
                              );
                            })}
                            {!b.components.length && <p className="text-xs text-neutral-400 py-1">No components yet — open the block to add one.</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!blocks.length && <p className="text-xs text-neutral-500">No blocks in this lesson yet — open it to add the first one.</p>}
                </div>
              )}
            </Card>
          );
        })}

        {!visibleTree.length && (
          <p className="text-sm text-neutral-500 p-4">
            {q ? `No blocks or components match “${query}”.` : "No lessons in this course yet."}
          </p>
        )}
      </div>

      <NewLessonModal open={modal} onClose={() => setModal(false)} courseId={route.courseId} onCreated={(lessonId) => go({ lessonId })} />
    </Page>
  );
}

/* ----------------------------- lesson pathway builder -----------------------------
   Structured Lesson Pathway View: Passage -> Words -> Videos -> Listenings -> Grammar -> Practice Grammar -> Homework */

export function LessonBuilderView() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [addOpen, setAddOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");

  const course = state.courses.find((c) => c.id === route.courseId);
  const lesson = (state.lessons[route.courseId] || []).find((l) => l.id === route.lessonId);

  useEffect(() => {
    dispatch({ type: "ENSURE_BUILT", courseId: route.courseId, lessonId: route.lessonId });
  }, [route.courseId, route.lessonId, dispatch]);

  if (!lesson || !course) return null;
  const blocks = lesson.built || [];

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
      <Breadcrumbs items={[
        { label: "Courses", onClick: () => go({ courseId: null, lessonId: null }) },
        { label: course.title, onClick: () => go({ lessonId: null }) },
        { label: `Lesson ${lesson.n}: ${lesson.title}` },
      ]} />

      <PageHeader title={`Lesson ${lesson.n}: ${lesson.title}`} sub={`${course.title} (${course.level}) · Structured Pathway Flow (${blocks.length} steps)`}
        right={<div className="flex gap-2">
          <LessonNotesButton onOpen={() => setNotesOpen(true)} hasNotes={!!lesson.teacherNotes?.trim()} />
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}><IconPlus size={14} stroke={1.75} /> Add Step</Button>
        </div>} />

      {/* Pathway Flow Layout */}
      <SectionLabel>Structured Pathway Flow (Passage → Words → Videos → Listenings → Grammar → Practice Grammar → Playground → Homework)</SectionLabel>

      <div className="relative space-y-3 mb-8">
        {blocks.map((b, i) => {
          const BT = blockMeta(b.type);
          const I = BT.icon;
          return (
            <div key={b.id} className="relative pl-10">
              {i < blocks.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-primary-100" />}
              <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center text-xs font-mono font-bold text-primary-600 shadow-sm">
                {i + 1}
              </div>

              <div className="group bg-white rounded-2xl border border-neutral-200 hover:border-primary-300 p-4 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button onClick={() => go({ partId: b.id })} className="flex items-center gap-3.5 min-w-0 flex-1 text-left">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${BT.tone}`}><I size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{BT.label}</div>
                    {editing === b.id ? (
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => saveTitle(b)} onKeyDown={(e) => e.key === "Enter" && saveTitle(b)}
                        className="w-full text-base font-semibold border-b-2 border-primary-500 focus:outline-none" />
                    ) : (
                      <div className="font-bold text-base text-neutral-900 truncate">{b.title || BT.label}</div>
                    )}
                    {b.meta && b.meta !== "—" && <div className="text-xs text-neutral-500 truncate mt-0.5">{b.meta}</div>}
                  </div>
                </button>

                {/* Step controls */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-200">
                  <Button variant="light" size="sm" onClick={() => go({ partId: b.id })} className="!text-primary-600 font-semibold">
                    <IconEye size={14} stroke={1.75} /> Open Step
                  </Button>
                  <div className="flex items-center gap-1 text-neutral-400">
                    <button title="Save to My Blocks" onClick={() => saveToBank(b)} className="hover:text-primary-600 p-1.5 rounded hover:bg-neutral-100"><IconBookmarkPlus size={14} stroke={1.75} /></button>
                    <button title="Rename" onClick={() => { setEditing(b.id); setDraft(b.title || BT.label); }} className="hover:text-neutral-700 p-1.5 rounded hover:bg-neutral-100"><IconPencil size={14} stroke={1.75} /></button>
                    <button title="Move up" disabled={i === 0} onClick={() => dispatch({ type: "MOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, dir: -1 })} className="hover:text-neutral-700 p-1.5 rounded hover:bg-neutral-100 disabled:opacity-30"><IconArrowUp size={14} stroke={1.75} /></button>
                    <button title="Move down" disabled={i === blocks.length - 1} onClick={() => dispatch({ type: "MOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id, dir: 1 })} className="hover:text-neutral-700 p-1.5 rounded hover:bg-neutral-100 disabled:opacity-30"><IconArrowDown size={14} stroke={1.75} /></button>
                    <button title="Remove" onClick={() => { dispatch({ type: "REMOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id }); toast("Step removed"); }} className="hover:text-warning-600 p-1.5 rounded hover:bg-neutral-100"><IconTrash size={14} stroke={1.75} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!blocks.length && (
          <button onClick={() => setAddOpen(true)} className="w-full border-2 border-dashed border-neutral-300 rounded-2xl p-8 text-neutral-500 hover:border-primary-400 hover:text-primary-600 text-sm font-medium">
            <IconPlus size={18} stroke={1.75} className="inline mr-1" /> Add the first step to the pathway
          </button>
        )}
      </div>

      <AddBlockModal open={addOpen} onClose={() => setAddOpen(false)} onPick={addBlock} types={availableTypes}
        usedCounts={usedCounts} bank={compatibleBank} onPickBank={addFromBank} />
      <LessonNotesPanel open={notesOpen} onClose={() => setNotesOpen(false)} courseId={route.courseId} lessonId={lesson.id}
        lessonLabel={`Lesson ${lesson.n}: ${lesson.title}`} notes={lesson.teacherNotes} />
    </Page>
  );
}
