import React, { useState, useEffect } from "react";
import {
  IconPlus, IconChevronRight, IconChevronDown, IconArrowUp, IconArrowDown, IconTrash, IconPencil,
  IconEye, IconFilter, IconArrowsMaximize, IconArrowsMinimize,
  IconBookmarkPlus, IconSitemap, IconBook2, IconUsers, IconSchool, IconBroadcast, IconCircleCheck, IconFlag, IconPlayerPlay, IconEyeOff, IconShoppingBag,
} from "@tabler/icons-react";
import { Page, Breadcrumbs, PageHeader, SectionLabel, SegmentedBar, Card, Button, Badge, Tag, CourseCard, SearchField, MenuButton, CountBadge, Modal, Switch, Field, TextField, TextArea, Select } from "../design-system.jsx";
import { RequestRow } from "../components/StudentRequests.jsx";
import {
  useStore, useNav, lessonBlocks, saveBlockToBank, saveComponentToBank, activeClassCourse, classCourseProgress, courseAvgProgress,
  uid, copyWithOwnH5P, discardH5PContent, teacherRoster,
} from "../store.jsx";
import { timeAgo, shortDate } from "../format.js";
import ClassLessonBar from "../components/ClassLessonBar.jsx";
import { BLOCK_TYPES, LESSON_TEMPLATES, CLASS_COURSE_STATUS, blockMeta } from "../data.jsx";
import { NewCourseModal, NewLessonModal, AddBlockModal } from "../components/modals.jsx";
import { LessonNotesButton, LessonNotesPanel } from "../components/LessonNotesPanel.jsx";
import { COMPONENT_META, blockComponents, componentLabel, componentPreview, linkedSource } from "./parts.jsx";

// Deep-copy a saved bank block into a fresh lesson part — new ids all the way
// down, and its own copy of any H5P content. Null if that copy failed.
async function partFromBank(toast, item) {
  const content = await copyWithOwnH5P(toast, item.content || { components: [] });
  if (!content) return null;
  content.components = (content.components || []).map((c) => ({ ...c, id: uid("c") }));
  return { id: uid("p"), type: item.type, title: item.title, meta: "from My Blocks", content };
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
  const [statusFilter, setStatusFilter] = useState("all");

  const course = state.courses.find((c) => c.id === route.courseId);
  const lessons = state.lessons[route.courseId] || [];

  // Viewed "as" a specific class (?classId=) — its progress replaces the
  // course's own authored lock/current/progress fields below. Absent this,
  // the tree shows the course's generic template state (no class taken it).
  const cls = route.classId ? state.classes.find((c) => c.id === route.classId) : null;
  const progress = cls && course ? classCourseProgress(state, cls, course.id) : null;
  const classCourse = progress?.entry || null;

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

  // A lesson has no progress of its own — a course is pure authored content
  // until a class is assigned to it. Viewed through a class (?classId=), each
  // lesson reads as that class's fact: taught (and when), next up, or not
  // taught yet. Lesson-level only — nothing is tracked inside a lesson, so
  // there's no percentage per lesson. Viewed plainly, `state` is null and
  // no status shows at all.
  function classLessonView(l) {
    if (!progress) return { state: null };
    const taughtAt = progress.taughtAt[l.id] || null;
    if (progress.next?.id === l.id) return { state: "next", taughtAt };
    if (taughtAt) return { state: "taught", taughtAt };
    return { state: classCourse.status === "done" ? "taught" : "later", taughtAt };
  }

  // The whole tree (Lesson → Block → Component), built once per render so
  // the header row, the block rail and the expanded body all read off the
  // same numbers. Search matches roll up: a matching component reveals its
  // block, a matching block reveals its lesson.
  const tree = lessons.map((l) => {
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

    return { lesson: l, view: classLessonView(l), blocks, totalComponents, lessonMatch, blockMatch };
  });
  // Status filter only means anything viewed through a class — see
  // classLessonView above.
  const taughtCount = tree.filter((t) => t.view.state === "taught").length;
  const notTaughtCount = tree.filter((t) => t.view.state === "next" || t.view.state === "later").length;
  const visibleTree = tree
    .filter((t) => !q || t.lessonMatch)
    .filter((t) => {
      if (statusFilter === "taught") return t.view.state === "taught";
      if (statusFilter === "not-taught") return t.view.state === "next" || t.view.state === "later";
      return true;
    });

  function expandAll() {
    const nextL = {}; const nextB = {};
    tree.forEach((t) => { nextL[t.lesson.id] = true; t.blocks.forEach((b) => { nextB[`${t.lesson.id}:${b.id}`] = true; }); });
    setExpandedLessons(nextL); setExpandedBlocks(nextB);
  }
  const collapseAll = () => { setExpandedLessons({}); setExpandedBlocks({}); };
  const anyExpanded = Object.values(expandedLessons).some(Boolean);


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
              const next = classCourse.status === "in-progress" ? "done" : "in-progress";
              dispatch({ type: "SET_CLASS_COURSE_STATUS", classId: cls.id, courseId: course.id, status: next });
              toast(next === "done" ? `${course.title} marked completed for ${cls.name}`
                : classCourse.status === "paused" ? `${course.title} resumed for ${cls.name}` : `${course.title} reopened for ${cls.name}`);
            }}>
              {classCourse.status === "in-progress" ? <><IconCircleCheck size={14} stroke={1.75} /> Mark as completed</>
                : classCourse.status === "paused" ? <><IconPlayerPlay size={14} stroke={1.75} /> Resume course</> : "Reopen course"}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setModal(true)}><IconPlus size={16} stroke={1.75} /> New lesson</Button>
        </div>} />

      {/* The plain course page (no class) is the course as a product you
          can also sell on its own. */}
      {!cls && <CourseSalesCard course={course} />}

      {/* Only viewed through a class (?classId=) — a course has no progress
          of its own, so the plain course page shows none at all. */}
      {classCourse && (
        // Where this class left off: how much of the course it has been
        // taught, the lesson it's on next, and the last one it was taught.
        <Card className="p-5 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="text-3xl font-bold text-neutral-950">{progress.taughtCount}<span className="text-neutral-600 text-xl font-semibold"> / {progress.total}</span></span>
              <span className="text-sm font-semibold text-neutral-600">lessons taught</span>
            </div>
            <div className="flex-1 min-w-[160px]"><SegmentedBar pct={progress.pct} cells={Math.max(progress.total, 1)} /></div>
            <Badge color={CLASS_COURSE_STATUS[classCourse.status].color} className="shrink-0">{CLASS_COURSE_STATUS[classCourse.status].label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-400 pt-4 text-sm">
            {progress.next ? (
              <span className="text-neutral-700">Next up: <b className="text-neutral-950">Lesson {progress.next.n} · {progress.next.title}</b></span>
            ) : (
              <span className="text-neutral-700">{classCourse.status === "done" ? "Course completed" : "Every lesson has been taught"}</span>
            )}
            <span className="text-neutral-600" title={progress.last ? shortDate(progress.last.taughtAt) : undefined}>
              {progress.last?.lesson ? `Last taught: Lesson ${progress.last.lesson.n} · ${timeAgo(progress.last.taughtAt)}` : "Nothing taught yet"}
            </span>
            {progress.next && (
              <Button size="sm" className="sm:ml-auto" onClick={() => go({ lessonId: progress.next.id })}>
                Continue Lesson {progress.next.n} <IconChevronRight size={15} stroke={1.75} />
              </Button>
            )}
            {progress.allTaught && classCourse.status !== "done" && (
              <Button size="sm" variant="outline" className="sm:ml-auto" onClick={() => { dispatch({ type: "SET_CLASS_COURSE_STATUS", classId: cls.id, courseId: course.id, status: "done" }); toast(`${course.title} marked completed for ${cls.name}`); }}>
                <IconCircleCheck size={15} stroke={1.75} /> Mark course completed
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Course tree: Lesson → Block → Component — one table-like card,
          rows divided by a hairline (not a stack of separate cards). Its
          toolbar is one bar at one control height: the title on the left;
          search, the status filter (only viewed through a class — that's
          what gives lessons a taught / not-taught state) and a single
          expand/collapse toggle on the right. */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-950">
          <IconSitemap size={16} stroke={1.75} className="text-neutral-600" /> Course tree <CountBadge>{lessons.length}</CountBadge>
        </h2>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a block or component…"
            aria-label="Find a block or component" className="w-full sm:w-72" />
          {classCourse && (
            <MenuButton icon={IconFilter} value={statusFilter} onChange={setStatusFilter} active={statusFilter !== "all"}
              label={{ all: "Filter", taught: "Taught", "not-taught": "Not taught yet" }[statusFilter]}
              options={[
                { id: "all", label: "All lessons", count: tree.length },
                { id: "taught", label: "Taught", count: taughtCount },
                { id: "not-taught", label: "Not taught yet", count: notTaughtCount },
              ]} />
          )}
          <Button variant="outline" onClick={anyExpanded ? collapseAll : expandAll}>
            {anyExpanded
              ? <><IconArrowsMinimize size={16} stroke={1.75} /> Collapse all</>
              : <><IconArrowsMaximize size={16} stroke={1.75} /> Expand all</>}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden mb-8">
        {/* Column header, like the kit's own "Session" list — the single
            biggest thing separating a real data table from a plain stack of
            rows. Progress/Status headers only appear when the rows below
            actually carry those columns (viewed through a class). */}
        <div className="flex items-center gap-4 bg-neutral-50 px-5 py-2.5 border-b border-neutral-200">
          <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Session</span>
          {classCourse && <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">For {cls.name}</span>}
        </div>
        <div className="divide-y divide-neutral-200">
        {visibleTree.map(({ lesson: l, view, blocks, totalComponents, blockMatch }) => {
          const isOpen = q ? true : !!expandedLessons[l.id];

          return (
            <div key={l.id} className={`transition-colors ${view.state === "next" ? "bg-primary-50/40" : "hover:bg-neutral-50"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleLesson(l.id)} className="text-neutral-400 hover:text-primary-600 shrink-0 p-1 -ml-1">
                    {isOpen ? <IconChevronDown size={16} stroke={1.75} /> : <IconChevronRight size={16} stroke={1.75} />}
                  </button>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm tabular-nums font-bold shrink-0 ${
                    view.state === "taught" ? "bg-success-500 text-white" : view.state === "next" ? "bg-primary-500 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                    {`L${l.n}`}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-900 truncate">{l.title}</h3>
                      {view.state === "next" && <Tag color="primary">Next up</Tag>}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {blocks.length} blocks · {totalComponents} components
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {view.state && (
                    <span className="w-40 shrink-0 text-sm" title={view.taughtAt ? shortDate(view.taughtAt) : undefined}>
                      {view.state === "taught"
                        ? <span className="inline-flex items-center gap-1.5 font-medium text-success-600"><IconCircleCheck size={16} stroke={1.75} /> Taught{view.taughtAt ? ` ${timeAgo(view.taughtAt)}` : ""}</span>
                        : view.state === "next"
                          ? <span className="font-semibold text-primary-600">Next up{view.taughtAt ? ` · also taught ${timeAgo(view.taughtAt)}` : ""}</span>
                          : <span className="text-neutral-600">Not taught yet</span>}
                    </span>
                  )}
                  {classCourse && (
                    // Whether the class's students can open this lesson.
                    <button type="button" onClick={() => {
                      const shared = !progress.released.has(l.id);
                      dispatch({ type: "SET_LESSON_RELEASED", classId: cls.id, courseId: course.id, lessonId: l.id, released: shared });
                      toast(shared ? `Lesson ${l.n} shared with ${cls.name}` : `Lesson ${l.n} hidden from ${cls.name}'s students`);
                    }} aria-pressed={progress.released.has(l.id)}
                      title={progress.released.has(l.id) ? "The class's students can open this lesson — click to hide it" : "Hidden from the class's students — click to share it"}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold shrink-0 ${progress.released.has(l.id) ? "text-success-600 hover:bg-success-50" : "text-neutral-600 hover:bg-neutral-200"}`}>
                      {progress.released.has(l.id) ? <><IconEye size={14} stroke={1.75} /> Shared</> : <><IconEyeOff size={14} stroke={1.75} /> Share</>}
                    </button>
                  )}
                  {classCourse && classCourse.status !== "done" && view.state !== "next" && (
                    <button onClick={() => { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId: cls.id, courseId: course.id, lessonId: l.id }); toast(`${cls.name} is now on Lesson ${l.n}`); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 shrink-0"><IconFlag size={13} stroke={1.75} /> Set as next up</button>
                  )}
                  {classCourse && (
                    <Button variant="outline" size="sm" onClick={() => startLive({ courseId: course.id, classId: cls.id, lessonId: l.id })} className="!text-warning-600 !border-warning-200 shrink-0">
                      <IconBroadcast size={12} stroke={1.75} /> Go live
                    </Button>
                  )}
                  <Button variant="light" size="sm" onClick={() => go({ lessonId: l.id })} className="shrink-0">
                    Open Lesson Pathway <IconChevronRight size={14} stroke={1.75} />
                  </Button>
                </div>
              </div>

              {/* Blocks → Components — the two levels beneath the lesson */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-neutral-200 pt-4">
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
                              const linkedPassage = Boolean(linkedSource(c, b.components));
                              return (
                                <div key={c.id} className={`group flex items-center gap-2 py-1 pr-1 rounded-lg hover:bg-neutral-50 ${linkedPassage ? "ml-4 border-l border-primary-100 pl-2" : ""}`}>
                                  <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${M.tone}`}><CI size={11} /></span>
                                  <button onClick={() => go({ lessonId: l.id, partId: b.id })} className="min-w-0 flex-1 text-left">
                                    <span className="text-xs text-neutral-600">{linkedPassage ? "↳ " : ""}{componentLabel(c, b.components)}</span>
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
            </div>
          );
        })}

        {!visibleTree.length && (
          <p className="text-sm text-neutral-500 p-4">
            {q ? `No blocks or components match “${query}”.` : statusFilter !== "all" ? "No lessons match this filter." : "No lessons in this course yet."}
          </p>
        )}
        </div>
      </Card>

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
  const cls = route.classId ? state.classes.find((c) => c.id === route.classId) : null;

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
      part: { id: uid("p"), type, title: BT.label, meta: "—" } });
    toast(`Added ${BT.label} step`);
  }
  async function addFromBank(item) {
    const part = await partFromBank(toast, item);
    if (!part) return;
    dispatch({ type: "ADD_PART", courseId: route.courseId, lessonId: route.lessonId, part });
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
      <Breadcrumbs items={cls ? [
        { label: "Classes", onClick: () => go({ tab: "classes", classId: null }) },
        { label: cls.name, onClick: () => go({ tab: "classes", classId: cls.id }) },
        { label: course.title, onClick: () => go({ lessonId: null }) },
        { label: `Lesson ${lesson.n}: ${lesson.title}` },
      ] : [
        { label: "Courses", onClick: () => go({ courseId: null, lessonId: null }) },
        { label: course.title, onClick: () => go({ lessonId: null }) },
        { label: `Lesson ${lesson.n}: ${lesson.title}` },
      ]} />
      {/* Opened from a class: where that class stands on this lesson. */}
      {cls && <ClassLessonBar cls={cls} course={course} lesson={lesson} className="mb-6" />}

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
              <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-surface border-2 border-primary-500 flex items-center justify-center text-xs tabular-nums font-bold text-primary-600 shadow-sm">
                {i + 1}
              </div>

              <div className="group bg-surface rounded-xl border border-neutral-400 hover:border-primary-300 p-4 transition duration-(--dur-fast) shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                    <button title="Remove" onClick={() => { discardH5PContent(toast, b); dispatch({ type: "REMOVE_PART", courseId: route.courseId, lessonId: route.lessonId, partId: b.id }); toast("Step removed"); }} className="hover:text-warning-600 p-1.5 rounded hover:bg-neutral-100"><IconTrash size={14} stroke={1.75} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!blocks.length && (
          <button onClick={() => setAddOpen(true)} className="w-full border-2 border-dashed border-neutral-400 rounded-xl p-8 text-neutral-500 hover:border-primary-400 hover:text-primary-600 text-sm font-medium">
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

/* ----------------------------- selling a course ----------------------------- */

// The course sold on its own, self-paced (see "Students, classes & access"
// in CLAUDE.md): whether it's for sale, what it costs, and who bought it.
// Separate from teaching it to a class — buyers get every lesson and go at
// their own pace; nobody has to accept them.
function CourseSalesCard({ course }) {
  const { state } = useStore();
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const sale = course.sale || {};
  const roster = teacherRoster(state);
  const customers = roster.customers.filter((c) => c.course?.id === course.id);
  const requests = roster.requests.filter((r) => r.kind === "purchase" && r.course?.id === course.id);
  return (
    <Card className="p-5 mb-6 flex flex-wrap items-center gap-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${sale.forSale ? "bg-success-50 text-success-600" : "bg-neutral-200 text-neutral-700"}`}><IconShoppingBag size={20} stroke={1.75} /></span>
      <div className="min-w-[14rem] flex-1">
        {sale.forSale ? (
          <>
            <div className="font-semibold text-neutral-950">For sale · {sale.price} {sale.currency}</div>
            <div className="text-sm text-neutral-600">
              {customers.length} customer{customers.length === 1 ? "" : "s"}
              {requests.length ? <> · <b className="text-pending-600">{requests.length} to confirm</b></> : null}
              {" "}· self-paced, every lesson
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold text-neutral-950">Not for sale</div>
            <div className="text-sm text-neutral-600">Sell it on its own — students buy it and take every lesson at their own pace.</div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {(sale.forSale || customers.length > 0) && <Button size="sm" variant={requests.length ? "primary" : "outline"} onClick={() => setViewing(true)}>Customers{requests.length ? ` · ${requests.length}` : ""}</Button>}
        <Button size="sm" variant={sale.forSale ? "light" : "primary"} onClick={() => setEditing(true)}>{sale.forSale ? "Sale settings" : "Put on sale"}</Button>
      </div>
      <SaleSettingsModal key={editing ? "open" : "closed"} open={editing} onClose={() => setEditing(false)} course={course} />
      <Modal open={viewing} onClose={() => setViewing(false)} wide icon={IconShoppingBag} title="Customers" sub={course.title}>
        {requests.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold text-neutral-950">Waiting for your confirmation</div>
            <div className="divide-y divide-neutral-400">{requests.map((r) => <RequestRow key={r.id} request={r} />)}</div>
          </div>
        )}
        <div className="text-sm font-semibold text-neutral-950 mb-1">Bought it</div>
        {customers.length ? (
          <div className="divide-y divide-neutral-400">
            {customers.map(({ purchase: p, student: s }) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-neutral-950">{s.name}</span>
                <span className="text-neutral-600">{p.amount} {p.currency}</span>
                <span className="w-28 text-right text-neutral-600" title={shortDate(p.paidAt)}>{timeAgo(p.paidAt)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-neutral-600">Nobody has bought it yet.</p>}
      </Modal>
    </Card>
  );
}

const CURRENCIES = ["AZN", "USD", "EUR"];

function SaleSettingsModal({ open, onClose, course }) {
  const { dispatch, toast } = useStore();
  const [draft, setDraft] = useState(() => ({ forSale: false, price: 0, currency: "AZN", description: "", paymentNote: "", ...(course.sale || {}) }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const priceOk = !draft.forSale || Number(draft.price) > 0;
  const save = () => {
    dispatch({ type: "UPDATE_COURSE_SALE", courseId: course.id, sale: { ...draft, price: Number(draft.price) || 0 } });
    toast(draft.forSale ? `${course.title} is for sale — ${Number(draft.price)} ${draft.currency}` : `${course.title} is no longer for sale — buyers keep their access`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} icon={IconShoppingBag} title="Sell this course" sub={course.title}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!priceOk}>Save</Button></>}>
      <label className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-400 p-3">
        <span>
          <span className="block text-sm font-semibold text-neutral-950">For sale in the catalog</span>
          <span className="block text-sm text-neutral-600">Students can find it and buy it for themselves.</span>
        </span>
        <Switch checked={draft.forSale} onChange={(v) => set({ forSale: v })} />
      </label>
      <div className={draft.forSale ? "" : "opacity-50 pointer-events-none"}>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Price"><TextField type="number" min="0" step="1" value={draft.price} onChange={(e) => set({ price: e.target.value })} state={priceOk ? "default" : "error"} /></Field>
          <Field label="Currency"><Select value={draft.currency} onChange={(e) => set({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Description (shown in the catalog)"><TextArea value={draft.description} onChange={(e) => set({ description: e.target.value })} className="!min-h-[72px]" placeholder="What students will learn" /></Field>
        <Field label="How to pay (shown when a student asks to buy)"><TextArea value={draft.paymentNote} onChange={(e) => set({ paymentNote: e.target.value })} className="!min-h-[72px]" placeholder="e.g. card transfer to … — you'll confirm each purchase" /></Field>
        <p className="text-sm text-neutral-600">No payments in the app yet: students pay you directly, and you confirm each purchase from Customers.</p>
      </div>
    </Modal>
  );
}
