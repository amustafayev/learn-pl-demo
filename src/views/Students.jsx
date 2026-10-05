import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  IconSend, IconDownload, IconFlame, IconBrain, IconAlertTriangle, IconCheck,
  IconCircleCheck, IconCircle, IconLock, IconNotebook, IconSparkles, IconArrowRight, IconClock, IconTrendingUp,
  IconRefresh, IconSearch, IconUserMinus, IconBan, IconMail, IconPlus, IconSchool, IconShoppingBag,
  IconChalkboard, IconDeviceLaptop, IconDoorEnter, IconDoorExit, IconCalendarX, IconBook, IconFilter, IconClipboardList,
} from "@tabler/icons-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  Page, Breadcrumbs, PageHeader, SectionLabel, ProgressBar, Card, Button, Tag, Avatar, Alert, StatCard,
  Field, TextField, TextArea, Modal, PillTabs, Select, MenuButton,
} from "../design-system.jsx";
import { useStore, useNav, studentCourseId, studentClasses, teacherRoster, studentHistory } from "../store.jsx";
import { StudentAssignModal, assignmentLook } from "../components/StudentAssignModal.jsx";
import { RequestRow } from "../components/StudentRequests.jsx";
import { timeAgo, shortDate } from "../format.js";
import { WordStatusPill } from "./grammar.jsx";
import StudentInsights from "./StudentInsights.jsx";

const weakest = (c) => Object.entries(c).sort((a, b) => a[1] - b[1])[0];

// The per-student analytics (Overview brief, Words, Activity, AI Insights,
// Learning path) are seed data until the student app produces real
// activity — parked, not deleted. Flip this once the student side exists.
const SHOW_STUDENT_ANALYTICS = false;

const monthYear = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");
const SOURCE_LABEL = { code: "class link", invite: "email invite", teacher: "added by you" };

/* ------------------------------- roster ------------------------------- */

// Only students this teacher has a relationship with ever reach this page
// (the store is already scoped — see teacherView in db/mockDb.jsx), split
// by what that relationship is. See "Students, classes & access" in CLAUDE.md.
const TABS = ["active", "requests", "former", "customers"];

export function StudentsView() {
  const { state, dispatch, toast } = useStore();
  const { route, go } = useNav();
  const [q, setQ] = useState("");
  const roster = teacherRoster(state);
  const tab = TABS.includes(route.filter) ? route.filter : "active";
  const setTab = (t) => go({ filter: t === "active" ? undefined : t });
  const needle = q.trim().toLowerCase();
  const hit = (s) => !needle || s.name.toLowerCase().includes(needle) || (s.email || "").toLowerCase().includes(needle);

  const lists = {
    active: roster.active.filter(hit),
    requests: roster.requests.filter((r) => hit(r.student)),
    former: roster.former.filter((f) => hit(f.student)),
    customers: roster.customers.filter((c) => hit(c.student)),
  };
  const blockedOnly = roster.blocked.filter(hit);
  const empty = {
    active: needle ? "No students match." : "No students yet — share a class link from a class page to invite them.",
    requests: "No requests right now. Students who use a class link, or ask to buy a course, show up here.",
    former: "No former students.",
    customers: "Nobody has bought a course yet. Put a course on sale from its page.",
  }[tab];
  const openStudent = (s) => go({ studentId: s.id });

  return (
    <Page>
      <PageHeader kicker="Everyone you teach" title="Students"
        right={
          <div className="relative hidden sm:block">
            <IconSearch size={15} stroke={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
            <TextField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="pl-9 w-56 !h-10" />
          </div>
        } />
      <div className="mb-4">
        <PillTabs value={tab} onChange={setTab} tabs={[
          { id: "active", label: "Active", count: roster.active.length },
          { id: "requests", label: "Requests", count: roster.requests.length },
          { id: "former", label: "Former", count: roster.former.length + roster.blocked.length },
          { id: "customers", label: "Customers", count: roster.customers.length },
        ]} />
      </div>

      <Card className="px-4">
        <div className="divide-y divide-neutral-400">
          {tab === "active" && lists.active.map((s) => (
            <button key={s.id} type="button" onClick={() => openStudent(s)} className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-neutral-100 -mx-4 px-4">
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 font-medium text-neutral-950">
                  <span className="truncate">{s.name}</span>
                  {studentClasses(state, s.id).map((c) => <Tag key={c.id} color="neutral">{c.name}</Tag>)}
                </div>
                <div className="text-sm text-neutral-600 truncate">{s.email}</div>
              </div>
              {s.level && <span className="text-sm text-neutral-600 shrink-0">{s.level}</span>}
            </button>
          ))}

          {tab === "requests" && lists.requests.map((r) => <RequestRow key={r.id} request={r} />)}

          {tab === "former" && lists.former.map(({ student: s, ended, blocked }) => {
            const last = [...ended].sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1))[0];
            const lastClass = state.classes.find((c) => c.id === last?.classId);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <button type="button" onClick={() => openStudent(s)} className="flex min-w-[12rem] flex-1 items-center gap-3 text-left">
                  <Avatar name={s.name} color="neutral" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-neutral-950">{s.name}{blocked && <Tag color="warning">Blocked</Tag>}</div>
                    <div className="text-sm text-neutral-600">
                      {lastClass?.name} · {monthYear(last?.decidedAt)}–{monthYear(last?.endedAt)} · {last?.status === "left" ? "left" : "removed"}
                    </div>
                  </div>
                </button>
                {lastClass && !blocked && (
                  <Button size="sm" variant="outline" onClick={() => { dispatch({ type: "ADD_CLASS_MEMBER", classId: lastClass.id, studentId: s.id }); toast(`${s.name.split(" ")[0]} is back in ${lastClass.name}`); }}>
                    <IconPlus size={15} stroke={1.75} /> Add back to {lastClass.name}
                  </Button>
                )}
                <BlockToggle student={s} blocked={blocked} />
              </div>
            );
          })}
          {tab === "former" && blockedOnly.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 py-3.5">
              <div className="flex min-w-[12rem] flex-1 items-center gap-3">
                <Avatar name={s.name} color="neutral" />
                <div><div className="flex items-center gap-1.5 font-medium text-neutral-950">{s.name}<Tag color="warning">Blocked</Tag></div>
                  <div className="text-sm text-neutral-600">Blocked from sending you requests</div></div>
              </div>
              <BlockToggle student={s} blocked />
            </div>
          ))}

          {tab === "customers" && lists.customers.map(({ purchase: p, student: s, course }) => (
            <button key={p.id} type="button" onClick={() => openStudent(s)} className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-neutral-100 -mx-4 px-4">
              <Avatar name={s.name} color="info" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-neutral-950 truncate">{s.name}</div>
                <div className="text-sm text-neutral-600 truncate">Bought <b className="text-neutral-900">{course?.title}</b> · {p.amount} {p.currency} · <span title={shortDate(p.paidAt)}>{timeAgo(p.paidAt)}</span></div>
              </div>
              <Tag color="success">Self-paced</Tag>
            </button>
          ))}

          {!(lists[tab].length || (tab === "former" && blockedOnly.length)) && <p className="py-10 text-center text-sm text-neutral-600">{empty}</p>}
        </div>
      </Card>
    </Page>
  );
}

function BlockToggle({ student, blocked }) {
  const { dispatch, toast } = useStore();
  const first = student.name.split(" ")[0];
  return blocked ? (
    <Button size="sm" variant="light" onClick={() => { dispatch({ type: "UNBLOCK_STUDENT", studentId: student.id }); toast(`${first} can send you requests again`); }}>Unblock</Button>
  ) : (
    <button type="button" onClick={() => { dispatch({ type: "BLOCK_STUDENT", studentId: student.id }); toast(`${first} is blocked — they can't send you requests`); }}
      className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-warning-50 hover:text-warning-600">
      <IconBan size={15} stroke={1.75} /> Block
    </button>
  );
}

/* ------------------------------- detail ------------------------------- */

// The tab strip is real page-internal navigation (/students/:id/:section),
// managed with router hooks directly rather than the shared useNav() shim —
// same "decoupled sub-navigation" pattern as Library's own routes.
export function StudentDetail() {
  const { state } = useStore();
  const { route, go } = useNav();
  const { section = "profile" } = useParams();
  const navigate = useNavigate();
  const [assign, setAssign] = useState(false);
  const s = state.students.find((x) => x.id === route.studentId);
  if (!s) return null;

  const active = studentClasses(state, s.id);
  const tabs = [["profile", "Profile"], ["history", "Lesson history"], ["notes", "Lesson notes"],
    ...(SHOW_STUDENT_ANALYTICS ? [["overview", "Overview"], ["words", "Words"], ["activity", "Activity"], ["insights", "AI Insights"], ["path", "Learning path"]] : [])];
  const current = tabs.some(([id]) => id === section) ? section : "profile";

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Students", onClick: () => go({ studentId: null }) }, { label: s.name }]} />
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          <Avatar name={s.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 flex flex-wrap items-center gap-2">
              {s.name}
              {active.map((c) => <Tag key={c.id} color="neutral">{c.name}</Tag>)}
            </h1>
            <div className="text-neutral-600 text-sm mt-0.5">{[s.email, s.level && `Level ${s.level}`].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        {active.length > 0 && <Button variant="primary" onClick={() => setAssign(true)}><IconSend size={15} stroke={1.75} /> Assign</Button>}
      </div>

      <div className="flex gap-1 mb-6 border-b border-neutral-200 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => navigate(`/students/${s.id}/${id}`)}
            className={`text-sm font-semibold px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors ${current === id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-600 hover:text-neutral-800"}`}>{label}</button>
        ))}
      </div>

      {current === "profile" && <Profile s={s} onSeeHistory={() => navigate(`/students/${s.id}/history`)} onAssign={active.length ? () => setAssign(true) : null} />}
      {current === "history" && <History s={s} />}
      {current === "notes" && <Notes s={s} />}
      {current === "overview" && <Overview s={s} />}
      {current === "words" && <Words s={s} />}
      {current === "activity" && <Activity s={s} />}
      {current === "insights" && <StudentInsights s={s} />}
      {current === "path" && <PathView s={s} />}

      <StudentAssignModal open={assign} onClose={() => setAssign(false)} student={s} />
    </Page>
  );
}

// What this teacher actually has for a student, all from studentHistory
// (GET /students/:id/history): their classes — every stint, what the class
// is on now, the lessons they had in it — the lessons themselves, what they
// bought and how far they are in it, and how to reach them. Nothing here is
// a made-up metric.
function Profile({ s, onSeeHistory, onAssign }) {
  const { state, dispatch, toast } = useStore();
  const { go } = useNav();
  const [removing, setRemoving] = useState(null); // class pending removal
  const lastRemoving = useRef(null);
  if (removing) lastRemoving.current = removing;
  const shownRemoving = removing || lastRemoving.current;
  const [addTo, setAddTo] = useState("");
  const first = s.name.split(" ")[0];
  const h = studentHistory(state, s.id);
  const requests = teacherRoster(state).requests.filter((r) => r.student.id === s.id);
  const addable = state.classes.filter((c) => !h.classes.some((x) => x.active && x.cls.id === c.id));
  const blocked = state.blocks.some((b) => b.studentId === s.id);
  const recent = h.lessons.slice(0, 5);
  // Open work first, then what's done; withdrawn work lives in the history.
  const work = [...h.assignments.filter((a) => a.status === "assigned"), ...h.assignments.filter((a) => a.status === "done")];
  const withdraw = (a) => {
    dispatch({ type: "WITHDRAW_ASSIGNMENT", assignmentId: a.id });
    toast(`Took back “${a.title}” from ${first}`);
  };

  const remove = () => {
    dispatch({ type: "REMOVE_CLASS_MEMBER", classId: removing.id, studentId: s.id });
    toast(`${first} removed from ${removing.name}`);
    setRemoving(null);
  };
  const add = () => {
    const cls = state.classes.find((c) => c.id === addTo);
    if (!cls) return;
    dispatch({ type: "ADD_CLASS_MEMBER", classId: cls.id, studentId: s.id });
    toast(`${first} added to ${cls.name}`);
    setAddTo("");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={IconSchool} label="Classes now" value={h.classes.filter((c) => c.active).length} />
        <StatCard icon={IconBook} label="Lessons taken" value={h.totals.taken} />
        <StatCard icon={IconCalendarX} label="Lessons missed" value={h.totals.missed} />
        <StatCard icon={IconClipboardList} label="Work to do" value={h.totals.toDo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {requests.length > 0 && (
            <Card className="px-4">
              <div className="pt-4 text-base font-semibold text-neutral-950">Waiting for you</div>
              <div className="divide-y divide-neutral-400">{requests.map((r) => <RequestRow key={r.id} request={r} />)}</div>
            </Card>
          )}

          <Card className="p-4">
            <div className="text-base font-semibold text-neutral-950 mb-2 flex items-center gap-2"><IconSchool size={18} stroke={1.75} /> Classes</div>
            <div className="divide-y divide-neutral-400">
              {h.classes.map((c) => (
                <div key={c.membership.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => go({ tab: "classes", classId: c.cls.id })}
                      className={`font-medium hover:text-primary-600 ${c.active ? "text-neutral-950" : "text-neutral-700"}`}>{c.cls.name}</button>
                    <div className="text-sm text-neutral-600">
                      {stints(c.periods)}{c.active && c.membership.source ? ` · via ${SOURCE_LABEL[c.membership.source] || c.membership.source}` : ""}
                    </div>
                    {c.now && (
                      <div className="mt-1 text-sm text-neutral-700">
                        Now on <b className="text-neutral-950">{c.now.course?.title}</b>
                        {c.now.progress.next ? ` · Lesson ${c.now.progress.next.n} next` : ""} · {c.now.progress.taughtCount} of {c.now.progress.total} taught
                      </div>
                    )}
                    <div className="mt-1 text-sm text-neutral-600">
                      {c.lessons.length
                        ? <>{plural(c.attended, "lesson")} with you{c.missed ? <> · <span className="text-warning-600">{c.missed} missed</span></> : ""}</>
                        : c.active ? "No lessons taught since they joined." : "No lessons taught while they were in it."}
                    </div>
                  </div>
                  <Tag color={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Former"}</Tag>
                  {c.active && (
                    <button type="button" onClick={() => setRemoving(c.cls)} title={`Remove from ${c.cls.name}`} aria-label={`Remove ${s.name} from ${c.cls.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-warning-50 hover:text-warning-600"><IconUserMinus size={17} stroke={1.75} /></button>
                  )}
                </div>
              ))}
              {!h.classes.length && <p className="py-3 text-sm text-neutral-600">Not in any of your classes.</p>}
            </div>
            {addable.length > 0 && !blocked && (
              <div className="mt-3 flex items-center gap-2 border-t border-neutral-400 pt-3">
                <Select value={addTo} onChange={(e) => setAddTo(e.target.value)} className="!h-9" aria-label="Add to a class">
                  <option value="">Add to a class…</option>
                  {addable.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Button size="sm" onClick={add} disabled={!addTo}><IconPlus size={15} stroke={1.75} /> Add</Button>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-base font-semibold text-neutral-950 flex items-center gap-2"><IconClipboardList size={18} stroke={1.75} /> Assigned work</div>
              {onAssign && <Button size="sm" variant="outline" onClick={onAssign}><IconSend size={15} stroke={1.75} /> Assign</Button>}
            </div>
            {work.length ? (
              <div className="divide-y divide-neutral-400">
                {work.slice(0, 6).map((a) => <AssignmentRow key={a.id} a={a} onWithdraw={() => withdraw(a)} />)}
              </div>
            ) : (
              <p className="py-2 text-sm text-neutral-600">
                {onAssign ? `Nothing assigned yet. Give ${first} a saved block, a word set or a quick task.` : `Add ${first} to a class to assign work.`}
              </p>
            )}
            {work.length > 6 && (
              <button type="button" onClick={onSeeHistory} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                {work.length - 6} more in the full history <IconArrowRight size={14} stroke={1.75} />
              </button>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-base font-semibold text-neutral-950 flex items-center gap-2"><IconBook size={18} stroke={1.75} /> Recent lessons</div>
              {h.timeline.length > 0 && (
                <button type="button" onClick={onSeeHistory} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                  Full history <IconArrowRight size={14} stroke={1.75} />
                </button>
              )}
            </div>
            {recent.length ? (
              <div className="divide-y divide-neutral-400">
                {recent.map((l) => <LessonRow key={l.id} item={l} when="ago" />)}
              </div>
            ) : (
              <p className="py-2 text-sm text-neutral-600">
                No lessons yet. {h.classes.some((c) => c.active) ? "Lessons you mark as taught in their class show up here." : ""}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-base font-semibold text-neutral-950 mb-2 flex items-center gap-2"><IconShoppingBag size={18} stroke={1.75} /> Courses bought</div>
            {h.purchases.length ? (
              <div className="divide-y divide-neutral-400">
                {h.purchases.map(({ purchase: p, course, completed, total, lastAt }) => (
                  <div key={p.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-950">{course?.title}</div>
                        <div className="text-sm text-neutral-600">{p.amount} {p.currency} · {p.status === "paid" ? `paid ${timeAgo(p.paidAt)}` : p.status}{p.method === "external" ? " · outside the app" : ""}</div>
                      </div>
                      <Tag color={p.status === "paid" ? "success" : "neutral"}>{p.status === "paid" ? "Self-paced" : p.status}</Tag>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1"><ProgressBar pct={total ? (completed / total) * 100 : 0} tone="success" /></div>
                      <span className="shrink-0 text-sm text-neutral-600">
                        {completed} of {total} lessons done{lastAt ? <> · last <span title={shortDate(lastAt)}>{timeAgo(lastAt)}</span></> : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-neutral-600">No courses bought.</p>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-2 text-sm">
            <div className="text-base font-semibold text-neutral-950">Contact</div>
            {s.email && <div className="flex items-center gap-2 text-neutral-800"><IconMail size={16} stroke={1.75} className="text-neutral-600" /> {s.email}</div>}
            {s.level && <div className="text-neutral-700">Level <b className="text-neutral-950">{s.level}</b></div>}
            {s.goal && <div className="text-neutral-700">Goal: {s.goal}</div>}
            {h.totals.lastAt && <div className="text-neutral-700">Last lesson: <span title={shortDate(h.totals.lastAt)}>{timeAgo(h.totals.lastAt)}</span></div>}
          </Card>
          <Card className="p-4 text-sm text-neutral-700 space-y-3">
            <div>{blocked ? "Blocked — they can't send you requests." : "Block to stop this student sending you requests. They keep anything they've bought."}</div>
            <BlockToggle student={s} blocked={blocked} />
          </Card>
        </div>
      </div>

      <Modal open={!!removing} onClose={() => setRemoving(null)} icon={IconUserMinus} iconTone="warning"
        title={`Remove ${first} from this class?`} sub={shownRemoving?.name}
        footer={<>
          <Button variant="outline" autoFocus onClick={() => setRemoving(null)}>Cancel</Button>
          <Button variant="danger" onClick={remove}><IconUserMinus size={16} stroke={1.75} /> Remove from class</Button>
        </>}>
        <p className="text-sm text-neutral-700">They lose this class's lessons and move to your Former students. Anything they bought stays theirs, their lesson history stays here, and you can add them back any time.</p>
      </Modal>
    </div>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const monthLong = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

// "Since Apr 2026", "Apr 2026–Jul 2026 (left) · back since Aug 2026".
function stints(periods) {
  const text = periods.map((p, i) => (p.endedAt
    ? `${monthYear(p.startedAt)}–${monthYear(p.endedAt)}${p.endReason ? ` (${p.endReason})` : ""}`
    : `${i > 0 ? "back since" : "since"} ${monthYear(p.startedAt)}`)).join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// One lesson in a student's history: taught to their class, or finished on
// their own. Opens the lesson — through the class when it came from one, so
// the page shows where that class stands. `when`: "ago" or "date".
function LessonRow({ item, when = "date", action }) {
  const { go } = useNav();
  const self = item.kind === "self-paced";
  const Icon = self ? IconDeviceLaptop : IconChalkboard;
  const open = () => item.course && item.lesson && go({ tab: "courses", courseId: item.course.id, lessonId: item.lesson.id, classId: self ? undefined : item.cls.id });
  return (
    // wraps: on a phone the tag/date/action drop under the title instead of
    // squeezing it
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.absent ? "bg-warning-50 text-warning-600" : "bg-neutral-200 text-neutral-700"}`}>
        <Icon size={17} stroke={1.75} />
      </span>
      <div className="min-w-[10rem] flex-1">
        <button type="button" onClick={open} className={`text-left font-medium break-words hover:text-primary-600 ${item.absent ? "text-neutral-600" : "text-neutral-950"}`}>
          {item.lesson ? `Lesson ${item.lesson.n} · ${item.lesson.title}` : "A lesson that was since deleted"}
        </button>
        <div className="text-sm text-neutral-600 truncate">
          {item.course?.title} · {self ? "on their own" : item.cls.name}
          {when === "ago" && <> · <span title={shortDate(item.at)}>{timeAgo(item.at)}</span></>}
        </div>
      </div>
      {(item.absent || when === "date" || action) && (
        <div className="ml-12 flex flex-wrap items-center gap-x-2 gap-y-1 sm:ml-0">
          {item.absent && <Tag color="warning">Missed</Tag>}
          {when === "date" && <span className="shrink-0 text-sm text-neutral-600 sm:w-24 sm:text-right">{shortDate(item.at)}</span>}
          {action}
        </div>
      )}
    </div>
  );
}

// One piece of assigned work: what it is, where it came from, and whether
// the student has done it. Open work can be taken back.
function AssignmentRow({ a, onWithdraw }) {
  const look = assignmentLook(a);
  const Icon = look.icon;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
      {/* block-type icons are lucide, component icons tabler — size only */}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${look.tone}`}><Icon size={17} /></span>
      <div className="min-w-[10rem] flex-1">
        <div className="font-medium text-neutral-950 break-words">{a.title}</div>
        <div className="text-sm text-neutral-600">
          {look.label}{a.source?.from ? ` · from ${a.source.from}` : ""} · assigned <span title={shortDate(a.assignedAt)}>{timeAgo(a.assignedAt)}</span>
        </div>
      </div>
      <div className="ml-12 flex flex-wrap items-center gap-x-2 gap-y-1 sm:ml-0">
        {a.status === "done"
          ? <Tag color="success"><IconCheck size={11} stroke={2} /> Done {timeAgo(a.completedAt)}</Tag>
          : <Tag color="pending">To do</Tag>}
        {a.status === "assigned" && onWithdraw && (
          <button type="button" onClick={onWithdraw} aria-label={`Withdraw ${a.title}`}
            className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-500 hover:bg-warning-50 hover:text-warning-600">Withdraw</button>
        )}
      </div>
    </div>
  );
}

// A joined / left / bought / assigned moment between the lessons, so the
// history reads as one story: when they came, what they had, when they went.
function MilestoneRow({ item }) {
  const a = item.assignment;
  const text = item.kind === "bought" ? <>Bought <b className="text-neutral-800">{item.course?.title}</b> · {item.purchase.amount} {item.purchase.currency}</>
    : item.kind === "joined" ? <>{item.again ? "Back in" : "Joined"} <b className="text-neutral-800">{item.cls.name}</b></>
    : item.kind === "assigned" ? <>Assigned <b className="text-neutral-800">{a.title}</b> · {assignmentLook(a).label}{a.status === "withdrawn" ? " · taken back" : ""}</>
    : item.kind === "finished" ? <>Finished <b className="text-neutral-800">{a.title}</b></>
    : <>{item.reason === "left" ? "Left" : "Removed from"} <b className="text-neutral-800">{item.cls.name}</b></>;
  const Icon = { bought: IconShoppingBag, joined: IconDoorEnter, assigned: IconSend, finished: IconCircleCheck }[item.kind] || IconDoorExit;
  return (
    <div className="flex items-center gap-3 py-2.5 text-sm text-neutral-600">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center"><Icon size={16} stroke={1.75} /></span>
      <div className="min-w-0 flex-1">{text}</div>
      <span className="hidden sm:block shrink-0 w-24 text-right">{shortDate(item.at)}</span>
    </div>
  );
}

// Everything a student has had with this teacher, newest first, by month:
// lessons taught to their class (mark one missed here), lessons finished on
// their own, and the joined/left/bought moments between them.
function History({ s }) {
  const { state, dispatch, toast } = useStore();
  const [show, setShow] = useState("all");
  const h = studentHistory(state, s.id);
  const first = s.name.split(" ")[0];
  const options = [
    { id: "all", label: "Everything" },
    ...h.classes.map((c) => ({ id: `class:${c.cls.id}`, label: c.cls.name, count: c.lessons.length })),
    ...h.purchases.map((p) => ({ id: `course:${p.course?.id}`, label: `${p.course?.title} · self-paced`, count: p.lessons.length })),
    { id: "missed", label: "Missed lessons", count: h.totals.missed },
    ...(h.assignments.length ? [{ id: "work", label: "Assigned work", count: h.assignments.length }] : []),
  ];
  const picked = options.find((o) => o.id === show) || options[0];
  const [kind, id] = picked.id.split(":");
  const items = h.timeline.filter((x) => kind === "all"
    || (kind === "missed" && x.absent)
    || (kind === "work" && (x.kind === "assigned" || x.kind === "finished"))
    || (kind === "class" && x.cls?.id === id && x.kind !== "self-paced")
    || (kind === "course" && (x.kind === "self-paced" || x.kind === "bought") && x.course?.id === id));
  const months = [];
  for (const x of items) {
    const m = monthLong(x.at);
    if (months.at(-1)?.month !== m) months.push({ month: m, items: [] });
    months.at(-1).items.push(x);
  }
  const mark = (item, status) => {
    dispatch({ type: "SET_ATTENDANCE", taughtLessonId: item.taughtLesson.id, studentId: s.id, status });
    toast(status === "absent" ? `Marked ${first} as missing Lesson ${item.lesson?.n}` : `Marked ${first} as at Lesson ${item.lesson?.n}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-neutral-600">
            {plural(h.totals.taken, "lesson")} taken{h.totals.inClass && h.totals.selfPaced ? ` — ${h.totals.inClass} in class, ${h.totals.selfPaced} on their own` : ""}
            {h.totals.missed ? ` · ${h.totals.missed} missed` : ""}
          </div>
          {options.length > 2 && (
            <MenuButton icon={IconFilter} size="sm" label={picked.label} value={picked.id} options={options} onChange={setShow} active={picked.id !== "all"} />
          )}
        </div>

        {months.map((g) => (
          <Card key={g.month} className="px-4 pt-3 pb-1">
            <div className="text-sm font-semibold text-neutral-950">{g.month}</div>
            <div className="divide-y divide-neutral-400">
              {g.items.map((x) => (x.kind === "class" || x.kind === "self-paced"
                ? <LessonRow key={x.id} item={x} action={x.kind === "class" && (
                    <button type="button" onClick={() => mark(x, x.absent ? "present" : "absent")} aria-pressed={x.absent}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900">
                      {x.absent ? "Mark attended" : "Mark missed"}
                    </button>
                  )} />
                : <MilestoneRow key={x.id} item={x} />))}
            </div>
          </Card>
        ))}
        {!months.length && (
          <Card className="p-8 text-center text-sm text-neutral-600">
            {kind === "missed" ? `${first} hasn't missed a lesson.`
              : kind === "work" ? `Nothing assigned to ${first} yet.`
              : h.classes.length || h.purchases.length ? "No lessons yet. Lessons you mark as taught in their class, and lessons they finish on a course they bought, show up here."
              : `${first} isn't in a class or on a course of yours.`}
          </Card>
        )}
      </div>

      <div>
        <Alert icon={IconBook} tone="info" title="What counts as their lesson">
          A lesson you teach a class counts for everyone in it at the time — not for someone who joined later, was away between stints, or had left. Mark anyone who wasn't there as missed. Lessons on a course they bought are the ones they finished themselves.
        </Alert>
      </div>
    </div>
  );
}

function Overview({ s }) {
  const { state } = useStore();
  const [concept, score] = weakest(s.concepts);
  const radar = Object.entries(s.concepts).map(([k, v]) => ({ concept: k.length > 10 ? k.split(" ")[0] : k, mastery: v }));
  const courseId = studentCourseId(state, s);
  const lessons = state.lessons[courseId] || [];
  const recapLessons = (s.extraLessons || []).map((lid) => lessons.find((l) => l.id === lid)).filter(Boolean);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Alert icon={IconBrain} tone="primary" title="Pre-lesson brief">
          <b>{s.name.split(" ")[0]}</b> is stuck on <b>{concept.toLowerCase()}</b> ({score}%), last active {s.last}. Vocab is {s.skills.vocab >= 75 ? "strong" : "developing"} ({s.skills.vocab}%); listening is the weakest skill ({s.skills.listening}%). Spend the hour on {concept.toLowerCase()} with the visual timeline, then a short listening task.
        </Alert>

        {s.atRisk && <Alert icon={IconAlertTriangle} tone="warning" title="Why this student is flagged">{s.riskReason}</Alert>}

        <div>
          <SectionLabel>Focus next · 2–3 concrete actions</SectionLabel>
          <Card className="p-4 space-y-2.5">
            {[`Review ${concept.toLowerCase()} with the visual timeline`, `Resurface ${s.words.filter((w) => w.status === "weak").length || 3} weak words in spaced repetition`, "Add one scenario task (work email) to build listening"].map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-neutral-800"><span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</span>{a}</div>
            ))}
          </Card>
          {recapLessons.length > 0 && (
            <p className="text-xs text-neutral-500 mt-2">
              Recap lessons built for {s.name.split(" ")[0]}: {recapLessons.map((l) => l.title).join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3 text-neutral-950">Skill breakdown</div>
            {Object.entries(s.skills).map(([k, v]) => (
              <div key={k} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1"><span className="capitalize text-neutral-600">{k}</span><span className="font-mono text-neutral-500">{v}%</span></div>
                <ProgressBar pct={v} />
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <div className="text-sm font-semibold mb-1 text-neutral-950">Grammar mastery</div>
            <div className="text-xs text-neutral-500 mb-1">per concept (%)</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="var(--color-neutral-400)" />
                  <PolarAngleAxis dataKey="concept" tick={{ fontSize: 9, fill: "var(--color-neutral-600)" }} />
                  <Radar dataKey="mastery" stroke="#ff5c20" fill="#ff5c20" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {s.l1.length > 0 && (
          <div>
            <SectionLabel>L1 interference · Azerbaijani → English ⭐</SectionLabel>
            <Card className="p-4 space-y-3">
              {s.l1.map((x, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Tag color="warning">×{x.count}</Tag>
                  <div><div className="text-sm font-medium text-neutral-900">{x.issue}</div><div className="text-xs text-neutral-500">{x.why}</div></div>
                </div>
              ))}
              <p className="text-[11px] text-neutral-500 pt-1">Mistakes specific to this learner's native language — the kind global apps can't model.</p>
            </Card>
          </div>
        )}
      </div>

      {/* right rail */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={IconFlame} value={s.streak} label="day streak" />
          <StatCard value={s.xp.toLocaleString()} label="XP" />
        </div>
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-neutral-950"><IconClock size={15} stroke={1.75} className="text-primary-600" /> Time spent</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-primary-600">{Math.round(s.tracking.rhythm.avgSessionMin * s.tracking.rhythm.sessionsPerWeek)}</span>
            <span className="text-xs text-neutral-500">min this week · {s.tracking.rhythm.sessionsPerWeek} session{s.tracking.rhythm.sessionsPerWeek === 1 ? "" : "s"}</span>
          </div>
          <div className="text-xs text-neutral-500 mt-2">{s.streakFreeze} streak freeze{s.streakFreeze !== 1 ? "s" : ""} available</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold mb-1 text-neutral-950">Words this week</div>
          <div className="flex items-end gap-2 text-center mt-3">
            {[["new", s.wordFlow.new, "text-info-600"], ["learning", s.wordFlow.learning, "text-pending-600"], ["known", s.wordFlow.known, "text-success-600"]].map(([l, v, t]) => (
              <div key={l} className="flex-1"><div className={`font-mono text-2xl font-bold ${t}`}>{v}</div><div className="text-[11px] text-neutral-500">{l}</div></div>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500 mt-3">Moved to <b>known</b> per week is the north-star signal.</p>
        </Card>
      </div>
    </div>
  );
}

function Words({ s }) {
  const { dispatch, toast } = useStore();
  const cycle = { weak: "medium", medium: "strong", strong: "weak" };
  const weak = s.words.filter((w) => w.status === "weak");
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-600">{s.words.length} saved words · click a status to cycle it · weak words resurface more often.</p>
        <Button variant="outline" size="sm" onClick={() => toast("Vocabulary exported with definitions (.csv)")}><IconDownload size={14} stroke={1.75} /> Export</Button>
      </div>

      {weak.length > 0 && (
        <div className="mb-5">
          <Alert icon={IconRefresh} tone="pending" title={`${weak.length} weak word${weak.length > 1 ? "s" : ""} due for review`}>
            Sticky words saved a while ago but still weak: {weak.map((w) => <b key={w.term}>{w.term} </b>)}— spaced repetition is bringing them back.
          </Alert>
        </div>
      )}

      {s.words.length === 0 ? (
        <Card className="p-8 text-center text-neutral-500 text-sm">No saved words yet.</Card>
      ) : (
        <Card className="divide-y divide-neutral-200">
          {s.words.map((w) => (
            <div key={w.term} className="p-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><b className="text-neutral-950">{w.term}</b><span className="text-primary-600 text-sm">{w.az}</span></div>
                <div className="text-sm text-neutral-600">{w.def}</div>
                <div className="text-xs text-neutral-500 mt-0.5">from “{w.source}” · saved {w.daysAgo}d ago</div>
              </div>
              <div className="text-right shrink-0">
                <button onClick={() => { dispatch({ type: "SET_WORD_STATUS", studentId: s.id, term: w.term, status: cycle[w.status] }); }} title="Cycle status">
                  <WordStatusPill status={w.status} />
                </button>
                <div className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1 justify-end"><IconClock size={11} stroke={1.75} />{w.dueInDays === 0 ? "due now" : `in ${w.dueInDays}d`}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Activity({ s }) {
  const icon = { word: "📗", test: "✍️", reading: "📖", lesson: "🎯" };
  return (
    <div className="max-w-2xl">
      <SectionLabel>Recent activity</SectionLabel>
      <div className="relative">
        {s.activity.map((a, i) => (
          <div key={i} className="relative pl-8 pb-4">
            {i < s.activity.length - 1 && <div className="absolute left-2.5 top-6 bottom-0 w-px bg-neutral-200" />}
            <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-surface border border-neutral-200 flex items-center justify-center text-[10px]">{icon[a.type] || "•"}</div>
            <div className="text-sm text-neutral-700">{a.detail}</div>
            <div className="text-xs text-neutral-500">{a.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notes({ s }) {
  const { dispatch, toast } = useStore();
  const [form, setForm] = useState(null);
  const blank = { date: "Today", covered: "", newWords: "", mistakes: "", next: "" };
  const [summary, setSummary] = useState("");

  function generate() {
    setSummary(`Bu dərsdə ${form.covered || "yeni mövzu"} üzərində işlədik. Yeni sözlər: ${form.newWords || "—"}. Növbəti dəfə: ${form.next || "təkrar"}. (Draft — edit before saving.)`);
  }
  function save() {
    dispatch({ type: "SAVE_NOTE", studentId: s.id, note: {
      date: form.date, covered: form.covered,
      newWords: form.newWords.split(",").map((x) => x.trim()).filter(Boolean),
      mistakes: form.mistakes.split(",").map((x) => x.trim()).filter(Boolean),
      next: form.next,
    } });
    toast("Note saved — new words dropped into the student's vocab");
    setForm(null); setSummary("");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <SectionLabel right={!form && <Button variant="primary" size="sm" onClick={() => setForm(blank)}><IconNotebook size={14} stroke={1.75} /> New note</Button>}>AI lesson notes · you review before saving</SectionLabel>

        {form && (
          <Card className="p-5 border-primary-200">
            <div className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-neutral-950"><IconSparkles size={15} stroke={1.75} className="text-primary-600" /> Capture the live lesson</div>
            <Field label="What was covered"><TextField value={form.covered} onChange={(e) => setForm({ ...form, covered: e.target.value })} placeholder="present perfect vs past simple" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="New words (comma-sep)"><TextField value={form.newWords} onChange={(e) => setForm({ ...form, newWords: e.target.value })} placeholder="ship, by then" /></Field>
              <Field label="Mistakes"><TextField value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: e.target.value })} placeholder="said 'I finish yesterday'" /></Field>
            </div>
            <Field label="Agreed next steps"><TextField value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} placeholder="10 gap-fill items on tenses" /></Field>
            {summary && (
              <div className="mb-3"><div className="text-xs font-semibold text-neutral-600 mb-1.5">Student summary (AZ) · editable</div>
                <TextArea className="!min-h-[80px]" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <Button variant="outline" size="sm" onClick={() => { setForm(null); setSummary(""); }}>Cancel</Button>
              <Button variant="light" size="sm" onClick={generate}><IconSparkles size={13} stroke={1.75} /> Generate summary</Button>
              <Button variant="primary" size="sm" onClick={save}><IconCheck size={13} stroke={1.75} /> Review & save</Button>
            </div>
          </Card>
        )}

        {!(s.notes || []).length && !form && <Card className="p-8 text-center text-neutral-500 text-sm">No lesson notes yet. Capture one after your next live lesson.</Card>}
        {(s.notes || []).map((n) => (
          <Card key={n.id} className="p-5">
            <div className="flex items-center justify-between mb-2"><div className="font-semibold text-sm text-neutral-950">{n.date}</div><Tag color="success"><IconCheck size={11} stroke={1.75} /> saved</Tag></div>
            <div className="text-sm text-neutral-700 mb-2">{n.covered}</div>
            {n.newWords?.length > 0 && <div className="text-xs text-neutral-600 mb-1"><b>New words:</b> {n.newWords.join(", ")}</div>}
            {n.mistakes?.length > 0 && <div className="text-xs text-neutral-600 mb-1"><b>Mistakes:</b> {n.mistakes.join(", ")}</div>}
            {n.next && <div className="text-xs text-neutral-600"><b>Next:</b> {n.next}</div>}
          </Card>
        ))}
      </div>
      <div>
        <Alert icon={IconNotebook} tone="info" title="How notes work">
          The app drafts notes from the live lesson; you edit and approve. New words auto-connect to the learner's vocab list, errors to their practice queue. A clean summary goes to the student — in Azerbaijani.
        </Alert>
        <p className="text-[11px] text-neutral-500 mt-3">Speaking stays human-graded — the app never grades speech. Recording needs the learner's consent.</p>
      </div>
    </div>
  );
}

function PathView({ s }) {
  const { state } = useStore();
  const lessons = state.lessons[studentCourseId(state, s)] || [];
  const reached = s.step;
  const checkpoints = lessons.map((l, i) => ({
    n: l.n, title: l.title,
    status: i < reached || s.progress === 100 ? "done" : i === reached ? "current" : "locked",
  }));
  return (
    <div className="max-w-2xl">
      <Alert icon={IconTrendingUp} tone="success" title="Visible learning path">A progress map with checkpoints — the learner always sees where they are and what's next.</Alert>
      <div className="relative mt-6">
        {checkpoints.map((c, i) => (
          <div key={c.n} className="relative pl-11 pb-5">
            {i < checkpoints.length - 1 && <div className={`absolute left-4 top-9 bottom-0 w-0.5 ${c.status === "done" ? "bg-success-300" : "bg-neutral-200"}`} />}
            <div className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center ${
              c.status === "done" ? "bg-success-100 text-success-600" : c.status === "current" ? "bg-primary-500 text-white ring-4 ring-primary-100" : "bg-neutral-100 text-neutral-400"}`}>
              {c.status === "done" ? <IconCircleCheck size={18} stroke={1.75} /> : c.status === "current" ? <IconCircle size={16} stroke={1.75} /> : <IconLock size={14} stroke={1.75} />}
            </div>
            <div className={`rounded-xl border p-4 ${c.status === "current" ? "border-primary-300 bg-primary-50" : "border-neutral-200"}`}>
              <div className="text-xs font-mono text-neutral-500">Checkpoint {c.n}</div>
              <div className="font-medium text-neutral-900">{c.title}</div>
              {c.status === "current" && <div className="text-xs text-primary-600 mt-1 flex items-center gap-1"><IconArrowRight size={12} stroke={1.75} /> {s.progress}% through this lesson</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
