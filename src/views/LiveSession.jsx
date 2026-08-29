import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IconMicrophone, IconMicrophoneOff, IconVideo, IconVideoOff, IconDeviceDesktop, IconShieldCheck, IconUsers, IconCopy, IconCheck, IconClock,
  IconHandStop, IconArrowRight, IconPhoneOff, IconCircleDot, IconActivity, IconSchool, IconSparkles, IconBroadcast, IconBell,
  IconChevronLeft, IconChevronRight, IconUsersGroup, IconUser, IconNotebook,
} from "@tabler/icons-react";
import { Card, Button, Tag, Alert, Field, Select, StudentCheckList, Avatar } from "../design-system.jsx";
import { useStore, lessonBlocks } from "../store.jsx";
import { initials, blockMeta } from "../data.jsx";
import { BlockStudentView } from "./parts.jsx";
import { LessonNotesPanel } from "../components/LessonNotesPanel.jsx";

// Block types the class does together (teacher leads, everyone on the same
// page) vs. individually (each learner at their own pace) — the gamifications.
const TOGETHER = new Set(["reading", "listening", "grammar", "ieltsListening", "ieltsReading"]);

/* =========================================================================
   Live lesson (Google-Meet style, but self-paced). The teacher picks the
   material (course → lesson), invites/notifies students, and they join. The
   material lives in the platform, so each student works through the lesson's
   Blocks individually while the teacher watches per-student progress and can
   point the whole class at a specific Block ("everyone read the passage now").
   Voice/screen recording is opt-in behind explicit consent.
   ========================================================================= */

const first = (p) => p.name.split(" ")[0];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const PRESENCE = {
  active:  { dot: "bg-success-500", text: "text-success-600" },
  idle:    { dot: "bg-pending-500", text: "text-pending-600" },
  done:    { dot: "bg-primary-500", text: "text-primary-600" },
  offline: { dot: "bg-neutral-300", text: "text-neutral-500" },
};

export default function LiveSession({ context, onEnd }) {
  const { state } = useStore();
  const [phase, setPhase] = useState("setup");
  const firstClass = () => state.classes.find((c) => c.courseId === context?.courseId) || state.classes[0];
  const [classId, setClassId] = useState(context?.classId || firstClass()?.id || null);
  const [lessonId, setLessonId] = useState(context?.lessonId || null);
  const [invited, setInvited] = useState([]); // student ids

  const cls = state.classes.find((c) => c.id === classId);
  const course = state.courses.find((c) => c.id === cls?.courseId);
  const lessons = state.lessons[cls?.courseId] || [];
  const lesson = lessons.find((l) => l.id === lessonId);

  if (phase === "setup") {
    return (
      <Setup
        state={state} classId={classId} setClassId={(id) => { setClassId(id); setLessonId(null); }}
        cls={cls} course={course} lessons={lessons} lessonId={lessonId} setLessonId={setLessonId} lesson={lesson}
        invited={invited} setInvited={setInvited} onCancel={onEnd}
        onStart={() => setPhase("live")}
      />
    );
  }
  return <LiveRoom course={course} lesson={lesson} blocks={lessonBlocks(lesson)} invitedIds={invited} onEnd={onEnd} />;
}

/* ------------------------------- setup ------------------------------- */

// Picking a Class pins both the course (its lesson list) and the roster —
// a teacher runs a live session for a specific scheduled group, not an
// ad-hoc pick of course + hand-picked students.
function Setup({ state, classId, setClassId, cls, course, lessons, lessonId, setLessonId, lesson, invited, setInvited, onStart, onCancel }) {
  const { toast } = useStore();
  const roster = state.students.filter((s) => s.classId === classId);

  // default-select the whole roster whenever the class changes
  useEffect(() => { setInvited(roster.map((s) => s.id)); /* eslint-disable-next-line */ }, [classId]);
  useEffect(() => { if (!lessonId && lessons[0]) setLessonId(lessons[0].id); /* eslint-disable-next-line */ }, [classId]);

  const toggle = (id) => setInvited((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const ready = cls && lesson && invited.length;

  function start() {
    if (!ready) return toast("Pick a class, a lesson, and at least one student", "err");
    toast(`Session started · notified ${invited.length} student${invited.length > 1 ? "s" : ""}`);
    onStart();
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-50 flex flex-col">
      <div className="h-16 bg-neutral-950 text-white flex items-center justify-between px-5 shrink-0">
        <span className="inline-flex items-center gap-2 font-semibold"><IconBroadcast size={18} stroke={1.75} /> Start a live lesson</span>
        <button onClick={onCancel} className="text-neutral-400 hover:text-white text-sm">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-neutral-600">Pick a class, then the material — the roster comes with the class. Everyone joins and works through the lesson individually while you guide and watch.</p>

          {!state.classes.length ? (
            <Card className="p-5 text-sm text-neutral-500">No classes yet — create one from a course page first.</Card>
          ) : (
            <>
              {/* 1. class & material */}
              <Card className="p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">1 · Class &amp; material</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Class">
                    <Select value={classId || ""} onChange={(e) => setClassId(e.target.value)}>
                      {state.classes.map((c) => {
                        const courseTitle = state.courses.find((co) => co.id === c.courseId)?.title || "—";
                        return <option key={c.id} value={c.id}>{c.name} · {courseTitle}</option>;
                      })}
                    </Select>
                  </Field>
                  <Field label="Lesson">
                    <Select value={lessonId || ""} onChange={(e) => setLessonId(e.target.value)}>
                      <option value="" disabled>Choose a lesson…</option>
                      {lessons.map((l) => <option key={l.id} value={l.id}>Lesson {l.n}: {l.title}</option>)}
                    </Select>
                  </Field>
                </div>
                {course && <p className="text-xs text-neutral-500 mt-2">{course.title} · {course.level}</p>}
                {lesson && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {lessonBlocks(lesson).map((b) => { const BT = blockMeta(b.type); const I = BT.icon || IconSchool; return (
                      <span key={b.id} title={b.title} className={`w-7 h-7 rounded-md flex items-center justify-center ${BT.tone}`}><I size={14} /></span>
                    ); })}
                    <span className="text-xs text-neutral-500 ml-1">{lessonBlocks(lesson).length} blocks students will work through</span>
                  </div>
                )}
              </Card>

              {/* 2. invite */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">2 · Invite &amp; notify</div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setInvited(roster.map((s) => s.id))} className="text-primary-600 hover:text-primary-700">All</button>
                    <span className="text-neutral-300">·</span>
                    <button onClick={() => setInvited([])} className="text-neutral-500 hover:text-neutral-700">None</button>
                  </div>
                </div>
                {!roster.length && <p className="text-xs text-pending-600 mb-2">No students enrolled in {cls?.name || "this class"} yet.</p>}
                <StudentCheckList students={roster} isSelected={(s) => invited.includes(s.id)} onToggle={(s) => toggle(s.id)}
                  metaFor={(s) => `${s.level} · ${s.status}`} />
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><IconBell size={13} stroke={1.75} /> Invited students get a platform notification with the join link.</div>
              </Card>
            </>
          )}

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono bg-neutral-100 rounded-lg px-2.5 py-1.5 text-neutral-600">lucid.app/live/LUCID-8842 <IconCopy size={12} stroke={1.75} /></div>
            <Button variant="primary" onClick={start} className={!ready ? "opacity-50" : ""}><IconBroadcast size={15} stroke={1.75} /> Start session &amp; notify {invited.length ? `(${invited.length})` : ""}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- live room ------------------------------- */

function LiveRoom({ course, lesson, blocks, invitedIds, onEnd }) {
  const { state, toast } = useStore();
  const roster = useMemo(() => state.students.filter((s) => invitedIds.includes(s.id)), [state.students, invitedIds]);
  const seed = useMemo(() => roster.map((s, i) => ({
    id: s.id, name: s.name, joined: i === 0, presence: i === 0 ? "active" : "offline", idx: 0,
  })), [roster]);
  const nBlocks = blocks.length || 1;

  const [people, setPeople] = useState(seed);
  const [elapsed, setElapsed] = useState(0);
  const [rec, setRec] = useState({ voice: false, screen: false });
  const [consent, setConsent] = useState(false);
  const [focus, setFocus] = useState(0); // the block the teacher is teaching (the stage)
  const [feed, setFeed] = useState([{ t: 0, text: "Session started — students are joining" }]);
  const [phase, setPhase] = useState("live");
  const [notesOpen, setNotesOpen] = useState(false);

  const peopleRef = useRef(seed);
  const elapsedRef = useRef(0);
  const focusRef = useRef(0);
  const togetherRef = useRef(TOGETHER.has(blocks[0]?.type));

  const current = blocks[focus];
  const together = TOGETHER.has(current?.type);
  const freshLesson = (state.lessons[course?.id] || []).find((l) => l.id === lesson?.id) || lesson;

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // simulation: students join; on "together" blocks they follow the teacher's
  // page, on individual blocks they progress through the pathway at their pace.
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const tog = togetherRef.current; const f = focusRef.current;
      const next = peopleRef.current.map((p) => ({ ...p }));
      let msg = null;
      const un = next.filter((p) => !p.joined);
      if (un.length && Math.random() < 0.5) {
        const p = pick(un); p.joined = true; p.presence = "active"; p.idx = f; msg = `${first(p)} joined`;
      } else {
        const jn = next.filter((p) => p.joined && p.presence !== "done");
        if (jn.length) {
          const p = pick(jn); const r = Math.random();
          if (tog) {
            if (p.idx !== f) { p.idx = f; p.presence = "active"; msg = `${first(p)} is following along`; }
            else if (p.presence === "idle" && r < 0.6) { p.presence = "active"; msg = `${first(p)} is active again`; }
            else if (p.presence === "active" && r < 0.15) { p.presence = "idle"; msg = `${first(p)} went idle`; }
          } else {
            if (p.presence === "idle" && r < 0.6) { p.presence = "active"; msg = `${first(p)} is active again`; }
            else if (p.presence === "active" && r < 0.15) { p.presence = "idle"; msg = `${first(p)} went idle`; }
            else {
              p.idx = Math.min(p.idx + 1, nBlocks);
              if (p.idx >= nBlocks) { p.presence = "done"; msg = `${first(p)} finished the lesson`; }
              else msg = `${first(p)} → ${blocks[p.idx]?.title}`;
            }
          }
        }
      }
      peopleRef.current = next; setPeople(next);
      if (msg) setFeed((fd) => [{ t: elapsedRef.current, text: msg }, ...fd].slice(0, 40));
    }, 3000);
    return () => clearInterval(id);
  }, [phase, nBlocks, blocks]);

  const joined = people.filter((p) => p.joined);
  const active = joined.filter((p) => p.presence === "active");
  const idle = joined.filter((p) => p.presence === "idle");
  const done = joined.filter((p) => p.presence === "done");
  const notJoined = people.filter((p) => !p.joined);
  const here = joined.filter((p) => p.idx === focus && p.presence !== "done");

  function toggleRec(kind) {
    if (!consent) return toast("Get learners' consent before recording", "err");
    setRec((r) => ({ ...r, [kind]: !r[kind] }));
    setFeed((f) => [{ t: elapsedRef.current, text: `${rec[kind] ? "Stopped" : "Started"} ${kind} recording` }, ...f].slice(0, 40));
  }
  function goBlock(i) {
    if (i < 0 || i >= nBlocks) return;
    const b = blocks[i]; const tog = TOGETHER.has(b.type);
    setFocus(i); focusRef.current = i; togetherRef.current = tog;
    setPeople((prev) => {
      const next = prev.map((x) => ({ ...x }));
      next.forEach((x) => { if (x.joined && x.presence !== "done") { x.idx = i; if (x.presence !== "idle") x.presence = "active"; } });
      peopleRef.current = next; return next;
    });
    setFeed((fd) => [{ t: elapsedRef.current, text: tog ? `Now doing “${b.title}” together` : `Everyone: work on “${b.title}” at your own pace` }, ...fd].slice(0, 40));
    toast(tog ? `Doing “${b.title}” together` : `Class working on “${b.title}”`);
  }
  function nudge(p) {
    setFeed((f) => [{ t: elapsedRef.current, text: `Nudged ${first(p)} — “still with us?”` }, ...f].slice(0, 40));
    toast(`Nudged ${first(p)}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-50 flex flex-col">
      <div className="h-16 bg-neutral-950 text-white flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <span className="inline-flex items-center gap-2 font-semibold shrink-0">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning-500" /></span>LIVE
          </span>
          <span className="font-mono text-sm text-neutral-300 inline-flex items-center gap-1.5 shrink-0"><IconClock size={14} stroke={1.75} /> {clock(elapsed)}</span>
          <span className="hidden md:block text-sm text-neutral-400 truncate">{course?.title} · L{lesson?.n} {lesson?.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Tag color="primary" title="Passive behavioural signals (dwell, hesitation, retries) log automatically — separate from voice/screen recording">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-300 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-400" /></span>
            <IconActivity size={11} stroke={1.75} /> AI tracking active
          </Tag>
          {rec.voice && <Tag color="warning"><IconMicrophone size={11} stroke={1.75} /> {clock(elapsed)}</Tag>}
          {rec.screen && <Tag color="warning"><IconDeviceDesktop size={11} stroke={1.75} /> screen</Tag>}
          {lesson && (
            <button onClick={() => setNotesOpen(true)} title="Lesson notes" className="relative text-neutral-300 hover:text-white p-1.5">
              <IconNotebook size={17} stroke={1.75} />
              {freshLesson?.teacherNotes?.trim() && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-pending-400" />}
            </button>
          )}
          <Button variant="primary" onClick={() => setPhase("ended")} className="!bg-warning-600 hover:!bg-warning-700"><IconPhoneOff size={15} stroke={1.75} /> End lesson</Button>
        </div>
      </div>

      {phase === "ended"
        ? <Ended elapsed={elapsed} rec={rec} joined={joined} total={people.length} blocks={blocks} lesson={lesson} onEnd={onEnd} />
        : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
            {/* STAGE — the lesson content the teacher teaches from (what students see) */}
            <div className="lg:col-span-2 overflow-y-auto">
              {/* pathway strip */}
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-neutral-200 px-5 sm:px-8 py-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button onClick={() => goBlock(focus - 1)} disabled={focus === 0} className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 shrink-0"><IconChevronLeft size={16} stroke={1.75} /></button>
                  {blocks.map((b, i) => { const BT = blockMeta(b.type); const I = BT.icon || IconSchool; return (
                    <button key={b.id} onClick={() => goBlock(i)} title={b.title}
                      className={`shrink-0 inline-flex items-center gap-1.5 text-sm rounded-lg pl-1.5 pr-2.5 py-1 border transition-colors ${focus === i ? "border-primary-400 bg-primary-50 text-primary-700 font-semibold" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}>
                      <span className={`w-5 h-5 rounded flex items-center justify-center ${BT.tone}`}><I size={12} /></span>
                      {i + 1}
                    </button>
                  ); })}
                  <button onClick={() => goBlock(focus + 1)} disabled={focus >= nBlocks - 1} className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 shrink-0"><IconChevronRight size={16} stroke={1.75} /></button>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                {/* stage header: what we're on, together/individual, who's here */}
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Block {focus + 1} of {nBlocks} · you're teaching</div>
                    <h2 className="text-xl font-bold tracking-tight text-neutral-950">{current?.title}</h2>
                  </div>
                  {together
                    ? <Tag color="success"><IconUsersGroup size={12} stroke={1.75} /> Together · the class is on this page</Tag>
                    : <Tag color="primary"><IconUser size={12} stroke={1.75} /> Individual · each learner at their own pace</Tag>}
                </div>

                {/* shared presence — you + who's viewing this with you */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">You</div>
                    {here.slice(0, 6).map((p) => <div key={p.id} className="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-[10px] font-semibold ring-2 ring-white">{initials(p.name)}</div>)}
                  </div>
                  <span className="text-xs text-neutral-500">{together ? `You + ${here.length} here — everyone sees this same page` : `${here.length} learner${here.length === 1 ? "" : "s"} working on this now`}</span>
                </div>

                {/* the actual content, exactly as a learner sees it */}
                {current ? <BlockStudentView block={current} /> : <Card className="p-8 text-center text-neutral-500 text-sm">This lesson has no blocks yet.</Card>}
              </div>
            </div>

            {/* right rail — tracking, participants, feed */}
            <div className="border-l border-neutral-200 bg-white overflow-y-auto flex flex-col">
              {/* tracking */}
              <div className="p-4 border-b border-neutral-200">
                <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Session tracking</div>
                <label className={`flex items-start gap-2.5 rounded-xl border p-3 mb-3 cursor-pointer ${consent ? "border-success-200 bg-success-50" : "border-pending-200 bg-pending-50"}`}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-primary-600" />
                  <span className="text-xs"><span className="font-semibold inline-flex items-center gap-1.5"><IconShieldCheck size={14} stroke={1.75} className={consent ? "text-success-600" : "text-pending-600"} /> Consented to recording</span>
                    <span className="block text-neutral-600 mt-0.5">Required first — some learners may be minors.</span></span>
                </label>
                <div className="space-y-2">
                  <RecToggle on={rec.voice} disabled={!consent} onClick={() => toggleRec("voice")} iconOn={IconMicrophone} iconOff={IconMicrophoneOff} label="Voice recording" hint="For AI lesson notes" />
                  <RecToggle on={rec.screen} disabled={!consent} onClick={() => toggleRec("screen")} iconOn={IconVideo} iconOff={IconVideoOff} label="Screen / video" hint="Captures the shared stage" />
                </div>
                {rec.voice && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-warning-600 text-xs font-medium"><IconCircleDot size={12} stroke={1.75} /> rec</span>
                    <div className="flex items-end gap-0.5 h-5 flex-1">
                      {Array.from({ length: 28 }).map((_, i) => <span key={i} className="flex-1 bg-warning-300 rounded-full" style={{ height: `${20 + Math.abs(Math.sin(i * 1.3 + elapsed)) * 80}%` }} />)}
                    </div>
                    <span className="font-mono text-[11px] text-neutral-500">{clock(elapsed)}</span>
                  </div>
                )}
              </div>

              {/* participants */}
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="font-semibold flex items-center gap-2 text-sm text-neutral-950"><IconUsers size={15} stroke={1.75} /> Participants</div>
                  <RoomCode />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Tag color="success">{active.length} active</Tag>
                  <Tag color="pending">{idle.length} idle</Tag>
                  <Tag color="primary">{done.length} finished</Tag>
                  <Tag color="neutral">{notJoined.length} not joined</Tag>
                </div>
              </div>
              <div className="divide-y divide-neutral-100">
                {[...joined, ...notJoined].map((p) => {
                  const pr = PRESENCE[p.presence];
                  const onFocus = p.joined && p.idx === focus && p.presence !== "done";
                  const label = !p.joined ? "not joined" : p.presence === "done" ? "finished all blocks" : p.presence === "idle" ? "idle" : `on ${blocks[p.idx]?.title || "…"}`;
                  return (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={p.name} color="dark" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${pr.dot}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate flex items-center gap-1.5 text-neutral-950">{p.name}{onFocus && <span title="on your page" className="text-success-500"><IconCircleDot size={11} stroke={1.75} /></span>}</div>
                          <div className={`text-xs ${pr.text}`}>{label}</div>
                        </div>
                        {p.presence === "idle" && <button onClick={() => nudge(p)} title="Nudge" className="text-pending-500 hover:text-pending-600 p-1"><IconHandStop size={16} stroke={1.75} /></button>}
                        {!p.joined && <button onClick={() => toast(`Reminder sent to ${first(p)}`)} title="Resend invite" className="text-neutral-300 hover:text-primary-500 p-1"><IconBell size={15} stroke={1.75} /></button>}
                      </div>
                      {p.joined && (
                        <div className="flex items-center gap-2 mt-2 pl-12">
                          <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden flex-1"><div className="h-full bg-primary-500" style={{ width: `${Math.round((Math.min(p.idx, nBlocks) / nBlocks) * 100)}%` }} /></div>
                          <span className="font-mono text-[10px] text-neutral-500 w-8 text-right">{Math.min(p.idx, nBlocks)}/{nBlocks}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* feed */}
              <div className="p-4 border-t border-neutral-200">
                <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2 flex items-center gap-1.5"><IconActivity size={13} stroke={1.75} /> Live activity</div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {feed.map((e, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1 text-sm">
                      <span className="font-mono text-[11px] text-neutral-400 w-9 shrink-0">{clock(e.t)}</span>
                      <span className="text-neutral-700">{e.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      {lesson && (
        <LessonNotesPanel open={notesOpen} onClose={() => setNotesOpen(false)} courseId={course.id} lessonId={lesson.id}
          lessonLabel={`Lesson ${lesson.n}: ${lesson.title}`} notes={freshLesson?.teacherNotes} />
      )}
    </div>
  );
}

function RecToggle({ on, disabled, onClick, iconOn: On, iconOff: Off, label, hint }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${disabled ? "opacity-50 cursor-not-allowed border-neutral-200" : on ? "border-warning-300 bg-warning-50" : "border-neutral-200 hover:border-primary-300"}`}>
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-warning-600 text-white" : "bg-neutral-100 text-neutral-500"}`}>{on ? <On size={18} stroke={1.75} /> : <Off size={18} stroke={1.75} />}</span>
      <span className="min-w-0"><span className="font-medium text-sm block text-neutral-950">{label}</span><span className="text-xs text-neutral-500">{on ? "Recording…" : hint}</span></span>
    </button>
  );
}

function RoomCode() {
  const { toast } = useStore();
  return (
    <button onClick={() => toast("Join link copied")} className="inline-flex items-center gap-1.5 text-xs font-mono bg-neutral-100 hover:bg-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700">LUCID-8842 <IconCopy size={12} stroke={1.75} /></button>
  );
}

function Ended({ elapsed, rec, joined, total, blocks, lesson, onEnd }) {
  const { dispatch, toast } = useStore();
  const [drafted, setDrafted] = useState(false);
  const nBlocks = blocks.length || 1;

  function draftNotes() {
    setDrafted(true);
    joined.forEach((p) => {
      const reached = blocks[Math.min(p.idx, blocks.length - 1)];
      const summary = `${clock(elapsed)} session${lesson ? ` on ${lesson.title}` : ""}. Reached “${reached?.title || "the start"}” by the end — audio captured for AI notes.`;
      dispatch({ type: "SET_RECORDING_SUMMARY", studentId: p.id, recording: { date: "today", durationMin: Math.round(elapsed / 60), summary } });
      // The whole point of recording: notes land in the student's own Notes
      // tab automatically, drafted from what actually happened in the room —
      // not a separate Word doc the teacher has to keep in sync by hand.
      dispatch({ type: "SAVE_NOTE", studentId: p.id, note: {
        date: "Today", covered: `${lesson?.title || "Live lesson"} — reached “${reached?.title || "the start"}”`,
        newWords: [], mistakes: [], next: `Review “${lesson?.title || "today's material"}” before the next session`,
      } });
    });
    toast(`Draft notes created for ${joined.length} students — check their Notes tab`);
  }
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-success-600 mb-1"><IconCheck size={18} stroke={1.75} /> <span className="font-semibold">Lesson ended</span></div>
        <h1 className="text-2xl font-bold tracking-tight mb-6 text-neutral-950">Session summary</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[[clock(elapsed), "duration"], [`${joined.length}/${total}`, "attended"], [rec.voice ? clock(elapsed) : "—", "voice recorded"], [`${joined.filter((p) => p.presence === "done").length}`, "finished lesson"]].map(([v, l]) => (
            <Card key={l} className="p-4"><div className="font-mono text-2xl font-bold text-neutral-950">{v}</div><div className="text-xs text-neutral-500 mt-1">{l}</div></Card>
          ))}
        </div>
        <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">Attended · how far each got</div>
        <Card className="p-2 mb-6 divide-y divide-neutral-100">
          {joined.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <Avatar name={p.name} color="dark" size="sm" />
              <span className="flex-1 text-neutral-900">{p.name}</span>
              <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden w-24"><div className="h-full bg-primary-500" style={{ width: `${Math.round((Math.min(p.idx, nBlocks) / nBlocks) * 100)}%` }} /></div>
              <span className="text-xs text-neutral-500 font-mono w-16 text-right">{p.presence === "done" ? "done" : `${Math.min(p.idx, nBlocks)}/${nBlocks}`}</span>
            </div>
          ))}
          {!joined.length && <div className="px-3 py-4 text-sm text-neutral-500">No students joined this session.</div>}
        </Card>
        {rec.voice ? (
          <Alert icon={IconSparkles} tone="primary" title="AI lesson notes ready to review">From the recording, the app drafted notes (covered topics, new words, mistakes, next steps) for each attendee. You review and edit before they save — new words drop into each learner's vocab list.</Alert>
        ) : (
          <Alert icon={IconSchool} tone="info" title="No recording this session">Attendance and progress were still logged. Turn on voice recording next time to auto-draft lesson notes.</Alert>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onEnd}>Close</Button>
          {rec.voice && <Button variant="primary" onClick={draftNotes} disabled={drafted}>{drafted ? <><IconCheck size={15} stroke={1.75} /> Notes drafted</> : <><IconArrowRight size={15} stroke={1.75} /> Draft lesson notes ({joined.length})</>}</Button>}
        </div>
      </div>
    </div>
  );
}
