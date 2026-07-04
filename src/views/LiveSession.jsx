import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Monitor, ShieldCheck, Users, Copy, Check, Clock,
  Hand, ArrowRight, PhoneOff, CircleDot, Activity, GraduationCap, Sparkles, Radio, Bell,
} from "lucide-react";
import { Card, Btn, Pill, AiNote, Field, inputCls } from "../ui.jsx";
import { useStore } from "../store.jsx";
import { initials, PART_TYPES } from "../data.jsx";

/* =========================================================================
   Live lesson (Google-Meet style, but self-paced). The teacher picks the
   material (course → lesson), invites/notifies students, and they join. The
   material lives in the platform, so each student works through the lesson's
   parts individually while the teacher watches per-student progress and can
   point the whole class at a specific part ("everyone read the passage now").
   Voice/screen recording is opt-in behind explicit consent.
   ========================================================================= */

const first = (p) => p.name.split(" ")[0];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const PRESENCE = {
  active:  { dot: "bg-emerald-500", text: "text-emerald-600" },
  idle:    { dot: "bg-amber-500",   text: "text-amber-600" },
  done:    { dot: "bg-indigo-500",  text: "text-indigo-600" },
  offline: { dot: "bg-slate-300",   text: "text-slate-400" },
};

function lessonParts(lesson) {
  if (!lesson) return [];
  const built = lesson.built && lesson.built.length
    ? lesson.built
    : (lesson.parts || []).map((t, i) => ({ id: `t${i}`, type: t, title: PART_TYPES[t]?.label }));
  return built.map((p) => ({ id: p.id || p.type, type: p.type, title: p.title || PART_TYPES[p.type]?.label || p.type }));
}

export default function LiveSession({ context, onEnd }) {
  const { state } = useStore();
  const [phase, setPhase] = useState("setup");
  const [courseId, setCourseId] = useState(context?.courseId || state.courses[0]?.id);
  const [lessonId, setLessonId] = useState(context?.lessonId || null);
  const [invited, setInvited] = useState([]); // student ids

  const course = state.courses.find((c) => c.id === courseId);
  const lessons = state.lessons[courseId] || [];
  const lesson = lessons.find((l) => l.id === lessonId);

  if (phase === "setup") {
    return (
      <Setup
        state={state} courseId={courseId} setCourseId={(id) => { setCourseId(id); setLessonId(null); }}
        lessons={lessons} lessonId={lessonId} setLessonId={setLessonId} lesson={lesson}
        invited={invited} setInvited={setInvited} onCancel={onEnd}
        onStart={() => setPhase("live")}
      />
    );
  }
  return <LiveRoom course={course} lesson={lesson} parts={lessonParts(lesson)} invitedIds={invited} onEnd={onEnd} />;
}

/* ------------------------------- setup ------------------------------- */

function Setup({ state, courseId, setCourseId, lessons, lessonId, setLessonId, lesson, invited, setInvited, onStart, onCancel }) {
  const { toast } = useStore();
  // students in this course (fall back to everyone if none enrolled)
  const enrolled = state.students.filter((s) => s.courseId === courseId);
  const roster = enrolled.length ? enrolled : state.students;

  // default-select the whole roster whenever the course changes
  useEffect(() => { setInvited(roster.map((s) => s.id)); /* eslint-disable-next-line */ }, [courseId]);
  useEffect(() => { if (!lessonId && lessons[0]) setLessonId(lessons[0].id); /* eslint-disable-next-line */ }, [courseId]);

  const toggle = (id) => setInvited((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const ready = lesson && invited.length;

  function start() {
    if (!ready) return toast("Pick a lesson and at least one student", "err");
    toast(`Session started · notified ${invited.length} student${invited.length > 1 ? "s" : ""}`);
    onStart();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-5 shrink-0">
        <span className="inline-flex items-center gap-2 font-semibold"><Radio size={18} /> Start a live lesson</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-slate-500">Pick the material, invite your students, and start. The lesson lives in the platform — everyone joins and works through it individually while you guide and watch.</p>

          {/* 1. material */}
          <Card className="p-5">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">1 · Material</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Course">
                <select className={inputCls} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
              <Field label="Lesson">
                <select className={inputCls} value={lessonId || ""} onChange={(e) => setLessonId(e.target.value)}>
                  <option value="" disabled>Choose a lesson…</option>
                  {lessons.map((l) => <option key={l.id} value={l.id}>Lesson {l.n}: {l.title}</option>)}
                </select>
              </Field>
            </div>
            {lesson && (
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {lessonParts(lesson).map((p) => { const P = PART_TYPES[p.type]; const I = P?.icon || GraduationCap; return (
                  <span key={p.id} title={p.title} className={`w-7 h-7 rounded-md flex items-center justify-center ${P?.tone || "bg-slate-100"}`}><I size={14} /></span>
                ); })}
                <span className="text-xs text-slate-400 ml-1">{lessonParts(lesson).length} parts students will work through</span>
              </div>
            )}
          </Card>

          {/* 2. invite */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-400">2 · Invite &amp; notify</div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setInvited(roster.map((s) => s.id))} className="text-indigo-600 hover:text-indigo-700">All</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => setInvited([])} className="text-slate-400 hover:text-slate-600">None</button>
              </div>
            </div>
            {!enrolled.length && <p className="text-xs text-amber-600 mb-2">No students enrolled in this course yet — showing everyone.</p>}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {roster.map((s) => {
                const on = invited.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggle(s.id)} className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">{initials(s.name)}</div>
                    <div className="min-w-0 flex-1"><div className="font-medium text-sm truncate">{s.name}</div><div className="text-xs text-slate-400">{s.level} · {s.status}</div></div>
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>{on && <Check size={13} className="text-white" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Bell size={13} /> Invited students get a platform notification with the join link.</div>
          </Card>

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-100 rounded-lg px-2.5 py-1.5 text-slate-500">lucid.app/live/LUCID-8842 <Copy size={12} /></div>
            <Btn onClick={start} className={!ready ? "opacity-50" : ""}><Radio size={15} /> Start session &amp; notify {invited.length ? `(${invited.length})` : ""}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- live room ------------------------------- */

function LiveRoom({ course, lesson, parts, invitedIds, onEnd }) {
  const { state, toast } = useStore();
  const roster = useMemo(() => state.students.filter((s) => invitedIds.includes(s.id)), [state.students, invitedIds]);
  const seed = useMemo(() => roster.map((s, i) => ({
    id: s.id, name: s.name, joined: i === 0, presence: i === 0 ? "active" : "offline", idx: 0,
  })), [roster]);

  const [people, setPeople] = useState(seed);
  const [elapsed, setElapsed] = useState(0);
  const [rec, setRec] = useState({ voice: false, screen: false });
  const [consent, setConsent] = useState(false);
  const [focus, setFocus] = useState(null); // part index the class is asked to be on
  const [feed, setFeed] = useState([{ t: 0, text: "Session started — students are joining" }]);
  const [phase, setPhase] = useState("live");

  const peopleRef = useRef(seed);
  const elapsedRef = useRef(0);
  const focusRef = useRef(null);
  const nParts = parts.length || 1;

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // simulation: students join, then progress through the real lesson parts
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const next = peopleRef.current.map((p) => ({ ...p }));
      let msg = null;
      const un = next.filter((p) => !p.joined);
      if (un.length && Math.random() < 0.5) {
        const p = pick(un); p.joined = true; p.presence = "active"; p.idx = 0;
        msg = `${first(p)} joined`;
      } else {
        const jn = next.filter((p) => p.joined && p.presence !== "done");
        if (jn.length) {
          const p = pick(jn); const r = Math.random();
          if (p.presence === "idle" && r < 0.6) { p.presence = "active"; msg = `${first(p)} is active again`; }
          else if (p.presence === "active" && r < 0.2) { p.presence = "idle"; msg = `${first(p)} went idle`; }
          else {
            // advance — biased toward the part the class was asked to be on
            const target = focusRef.current != null ? focusRef.current : nParts;
            if (p.idx < target || focusRef.current == null) {
              p.idx = Math.min(p.idx + 1, nParts);
              if (p.idx >= nParts) { p.presence = "done"; msg = `${first(p)} finished the lesson`; }
              else msg = `${first(p)} → ${parts[p.idx]?.title}`;
            }
          }
        }
      }
      peopleRef.current = next; setPeople(next);
      if (msg) setFeed((f) => [{ t: elapsedRef.current, text: msg }, ...f].slice(0, 40));
    }, 3000);
    return () => clearInterval(id);
  }, [phase, nParts, parts]);

  const joined = people.filter((p) => p.joined);
  const active = joined.filter((p) => p.presence === "active");
  const idle = joined.filter((p) => p.presence === "idle");
  const done = joined.filter((p) => p.presence === "done");
  const notJoined = people.filter((p) => !p.joined);
  const countOnPart = (i) => joined.filter((p) => p.presence !== "done" && p.idx === i).length;

  function toggleRec(kind) {
    if (!consent) return toast("Get learners' consent before recording", "err");
    setRec((r) => ({ ...r, [kind]: !r[kind] }));
    setFeed((f) => [{ t: elapsedRef.current, text: `${rec[kind] ? "Stopped" : "Started"} ${kind} recording` }, ...f].slice(0, 40));
  }
  function askFocus(i) {
    setFocus(i); focusRef.current = i;
    const label = i == null ? "free / self-paced" : parts[i]?.title;
    setFeed((f) => [{ t: elapsedRef.current, text: i == null ? "Class set to self-paced" : `You asked the class to open: ${label}` }, ...f].slice(0, 40));
    if (i != null) toast(`Asked everyone to open “${label}”`);
  }
  function nudge(p) {
    setFeed((f) => [{ t: elapsedRef.current, text: `Nudged ${first(p)} — “still with us?”` }, ...f].slice(0, 40));
    toast(`Nudged ${first(p)}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <span className="inline-flex items-center gap-2 font-semibold shrink-0">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" /></span>LIVE
          </span>
          <span className="font-mono text-sm text-slate-300 inline-flex items-center gap-1.5 shrink-0"><Clock size={14} /> {clock(elapsed)}</span>
          <span className="hidden md:block text-sm text-slate-400 truncate">{course?.title} · L{lesson?.n} {lesson?.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {rec.voice && <Pill className="bg-rose-500/20 text-rose-300"><Mic size={11} /> {clock(elapsed)}</Pill>}
          {rec.screen && <Pill className="bg-rose-500/20 text-rose-300"><Monitor size={11} /> screen</Pill>}
          <Btn onClick={() => setPhase("ended")} className="!bg-rose-600 !text-white hover:!bg-rose-700"><PhoneOff size={15} /> End lesson</Btn>
        </div>
      </div>

      {phase === "ended"
        ? <Ended elapsed={elapsed} rec={rec} joined={joined} total={people.length} parts={parts} onEnd={onEnd} />
        : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 overflow-y-auto p-5 sm:p-8 space-y-6">
              {/* class focus — point everyone at a part */}
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">Guide the class · ask everyone to do a part</div>
                <Card className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => askFocus(null)} className={`text-sm rounded-lg px-3 py-1.5 border ${focus == null ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>Self-paced</button>
                    {parts.map((p, i) => { const P = PART_TYPES[p.type]; const I = P?.icon || GraduationCap; return (
                      <button key={p.id} onClick={() => askFocus(i)} className={`text-sm rounded-lg pl-2 pr-3 py-1.5 border inline-flex items-center gap-1.5 ${focus === i ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        <span className={`w-5 h-5 rounded flex items-center justify-center ${P?.tone || "bg-slate-100"}`}><I size={12} /></span>{p.title}
                        <span className="text-[10px] font-mono text-slate-400">{countOnPart(i)}</span>
                      </button>
                    ); })}
                  </div>
                  {focus != null && <div className="mt-3 text-sm text-indigo-700 inline-flex items-center gap-1.5"><ArrowRight size={14} /> Class asked to open <b>{parts[focus]?.title}</b> — students still move at their own pace.</div>}
                </Card>
              </div>

              {/* recording */}
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">Session tracking</div>
                <Card className="p-5">
                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 mb-4 cursor-pointer ${consent ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-indigo-600" />
                    <span className="text-sm"><span className="font-semibold inline-flex items-center gap-1.5"><ShieldCheck size={15} className={consent ? "text-emerald-600" : "text-amber-600"} /> Learners consented to recording</span>
                      <span className="block text-slate-500 text-xs mt-0.5">Required before any recording. Some learners may be minors — consent is built in, not retrofitted.</span></span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RecToggle on={rec.voice} disabled={!consent} onClick={() => toggleRec("voice")} iconOn={Mic} iconOff={MicOff} label="Voice recording" hint="For AI lesson notes" />
                    <RecToggle on={rec.screen} disabled={!consent} onClick={() => toggleRec("screen")} iconOn={Video} iconOff={VideoOff} label="Screen / video" hint="Captures the shared screen" />
                  </div>
                  {rec.voice && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-rose-600 text-sm font-medium"><CircleDot size={14} /> Recording</span>
                      <div className="flex items-end gap-0.5 h-6 flex-1">
                        {Array.from({ length: 40 }).map((_, i) => <span key={i} className="flex-1 bg-rose-300 rounded-full" style={{ height: `${20 + Math.abs(Math.sin(i * 1.3 + elapsed)) * 80}%` }} />)}
                      </div>
                      <span className="font-mono text-xs text-slate-400">{clock(elapsed)}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-3">Also logged automatically: attendance, who's active, and each learner's progress through the lesson.</p>
                </Card>
              </div>

              {/* feed */}
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><Activity size={13} /> Live activity</div>
                <Card className="p-2 max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {feed.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="font-mono text-[11px] text-slate-300 w-10 shrink-0">{clock(e.t)}</span>
                      <span className="text-slate-600">{e.text}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>

            {/* participants */}
            <div className="border-l border-slate-200 bg-white overflow-y-auto flex flex-col">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold flex items-center gap-2"><Users size={16} /> Participants</div>
                  <RoomCode />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Pill className="bg-emerald-50 text-emerald-700">{active.length} active</Pill>
                  <Pill className="bg-amber-50 text-amber-700">{idle.length} idle</Pill>
                  <Pill className="bg-indigo-50 text-indigo-700">{done.length} finished</Pill>
                  <Pill className="bg-slate-100 text-slate-400">{notJoined.length} not joined</Pill>
                </div>
              </div>
              <div className="flex-1 divide-y divide-slate-50">
                {[...joined, ...notJoined].map((p) => {
                  const pr = PRESENCE[p.presence];
                  const label = !p.joined ? "not joined" : p.presence === "done" ? "finished all parts" : p.presence === "idle" ? "idle" : `on ${parts[p.idx]?.title || "…"}`;
                  return (
                    <div key={p.id} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">{initials(p.name)}</div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${pr.dot}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{p.name}</div>
                          <div className={`text-xs ${pr.text}`}>{label}</div>
                        </div>
                        {p.presence === "idle" && <button onClick={() => nudge(p)} title="Nudge" className="text-amber-500 hover:text-amber-600 p-1"><Hand size={16} /></button>}
                        {!p.joined && <button onClick={() => toast(`Reminder sent to ${first(p)}`)} title="Resend invite" className="text-slate-300 hover:text-indigo-500 p-1"><Bell size={15} /></button>}
                      </div>
                      {p.joined && (
                        <div className="flex items-center gap-2 mt-2 pl-12">
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden flex-1"><div className="h-full bg-indigo-500" style={{ width: `${Math.round((Math.min(p.idx, nParts) / nParts) * 100)}%` }} /></div>
                          <span className="font-mono text-[10px] text-slate-400 w-8 text-right">{Math.min(p.idx, nParts)}/{nParts}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function RecToggle({ on, disabled, onClick, iconOn: On, iconOff: Off, label, hint }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${disabled ? "opacity-50 cursor-not-allowed border-slate-200" : on ? "border-rose-300 bg-rose-50" : "border-slate-200 hover:border-indigo-300"}`}>
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"}`}>{on ? <On size={18} /> : <Off size={18} />}</span>
      <span className="min-w-0"><span className="font-medium text-sm block">{label}</span><span className="text-xs text-slate-400">{on ? "Recording…" : hint}</span></span>
    </button>
  );
}

function RoomCode() {
  const { toast } = useStore();
  return (
    <button onClick={() => toast("Join link copied")} className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">LUCID-8842 <Copy size={12} /></button>
  );
}

function Ended({ elapsed, rec, joined, total, parts, onEnd }) {
  const { toast } = useStore();
  const [drafted, setDrafted] = useState(false);
  const nParts = parts.length || 1;
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-emerald-600 mb-1"><Check size={18} /> <span className="font-semibold">Lesson ended</span></div>
        <h1 className="text-2xl font-bold tracking-tight mb-6">Session summary</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[[clock(elapsed), "duration"], [`${joined.length}/${total}`, "attended"], [rec.voice ? clock(elapsed) : "—", "voice recorded"], [`${joined.filter((p) => p.presence === "done").length}`, "finished lesson"]].map(([v, l]) => (
            <Card key={l} className="p-4"><div className="font-mono text-2xl font-bold">{v}</div><div className="text-xs text-slate-400 mt-1">{l}</div></Card>
          ))}
        </div>
        <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Attended · how far each got</div>
        <Card className="p-2 mb-6 divide-y divide-slate-50">
          {joined.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-semibold">{initials(p.name)}</div>
              <span className="flex-1">{p.name}</span>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden w-24"><div className="h-full bg-indigo-500" style={{ width: `${Math.round((Math.min(p.idx, nParts) / nParts) * 100)}%` }} /></div>
              <span className="text-xs text-slate-400 font-mono w-16 text-right">{p.presence === "done" ? "done" : `${Math.min(p.idx, nParts)}/${nParts}`}</span>
            </div>
          ))}
          {!joined.length && <div className="px-3 py-4 text-sm text-slate-400">No students joined this session.</div>}
        </Card>
        {rec.voice ? (
          <AiNote icon={Sparkles} tone="violet" title="AI lesson notes ready to review">From the recording, the app drafted notes (covered topics, new words, mistakes, next steps) for each attendee. You review and edit before they save — new words drop into each learner's vocab list.</AiNote>
        ) : (
          <AiNote icon={GraduationCap} tone="sky" title="No recording this session">Attendance and progress were still logged. Turn on voice recording next time to auto-draft lesson notes.</AiNote>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="outline" onClick={onEnd}>Close</Btn>
          {rec.voice && <Btn onClick={() => { setDrafted(true); toast(`Draft notes created for ${joined.length} students`); }} disabled={drafted}>{drafted ? <><Check size={15} /> Notes drafted</> : <><ArrowRight size={15} /> Draft lesson notes ({joined.length})</>}</Btn>}
        </div>
      </div>
    </div>
  );
}
