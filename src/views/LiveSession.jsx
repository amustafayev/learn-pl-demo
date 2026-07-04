import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Monitor, ShieldCheck, Users, Copy, Check, Clock,
  Hand, ArrowRight, PhoneOff, CircleDot, Activity, UserPlus, GraduationCap, Sparkles,
} from "lucide-react";
import { Card, Btn, Pill, AiNote } from "../ui.jsx";
import { useStore } from "../store.jsx";
import { initials } from "../data.jsx";

/* =========================================================================
   Live lesson — the teacher starts a session (the "starting point"),
   students join, and the teacher sees who is active / idle / not joined.
   Voice & screen recording are opt-in and gated behind explicit consent
   (the doc's privacy note; some learners may be minors). Ending the lesson
   drafts AI lesson notes from what happened.
   ========================================================================= */

const PARTS = ["Reading passage", "Vocabulary", "Grammar", "Practice", "Test"];
const first = (p) => p.name.split(" ")[0];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const PRESENCE = {
  active:  { label: "active",     dot: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-600" },
  idle:    { label: "idle",       dot: "bg-amber-500",   ring: "ring-amber-200",   text: "text-amber-600" },
  offline: { label: "not joined", dot: "bg-slate-300",   ring: "ring-slate-100",   text: "text-slate-400" },
};

export default function LiveSession({ context, onEnd }) {
  const { state, toast } = useStore();
  const course = state.courses.find((c) => c.id === context?.courseId);
  const lesson = (state.lessons[context?.courseId] || []).find((l) => l.id === context?.lessonId);

  const seed = useMemo(() => state.students.map((s, i) => ({
    id: s.id, name: s.name,
    joined: i < 2,
    presence: i === 0 ? "active" : i === 1 ? "active" : "offline",
    onPart: PARTS[i % PARTS.length],
  })), [state.students]);

  const [people, setPeople] = useState(seed);
  const [elapsed, setElapsed] = useState(0);
  const [rec, setRec] = useState({ voice: false, screen: false });
  const [consent, setConsent] = useState(false);
  const [feed, setFeed] = useState([{ t: 0, text: "Lesson started — waiting for students to join" }]);
  const [phase, setPhase] = useState("live");

  const peopleRef = useRef(seed);
  const elapsedRef = useRef(0);

  // wall clock — stops when the lesson ends
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current); }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // presence simulation — students join and drift active/idle over time
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const next = peopleRef.current.map((p) => ({ ...p }));
      let msg = null;
      const un = next.filter((p) => !p.joined);
      if (un.length && Math.random() < 0.55) {
        const p = pick(un); p.joined = true; p.presence = "active";
        msg = `${first(p)} joined the lesson`;
      } else {
        const jn = next.filter((p) => p.joined);
        if (jn.length) {
          const p = pick(jn); const r = Math.random();
          if (p.presence === "active" && r < 0.35) { p.presence = "idle"; msg = `${first(p)} went idle`; }
          else if (p.presence === "idle") { p.presence = "active"; msg = `${first(p)} is active again`; }
          else { p.onPart = pick(PARTS); msg = `${first(p)} moved to ${p.onPart}`; }
        }
      }
      peopleRef.current = next;
      setPeople(next);
      if (msg) setFeed((f) => [{ t: elapsedRef.current, text: msg }, ...f].slice(0, 40));
    }, 3200);
    return () => clearInterval(id);
  }, [phase]);

  const joined = people.filter((p) => p.joined);
  const active = joined.filter((p) => p.presence === "active");
  const idle = joined.filter((p) => p.presence === "idle");
  const notJoined = people.filter((p) => !p.joined);

  function toggleRec(kind) {
    if (!consent) { toast("Get learners' consent before recording", "err"); return; }
    setRec((r) => ({ ...r, [kind]: !r[kind] }));
    setFeed((f) => [{ t: elapsedRef.current, text: `${rec[kind] ? "Stopped" : "Started"} ${kind} recording` }, ...f].slice(0, 40));
  }
  function nudge(p) {
    setFeed((f) => [{ t: elapsedRef.current, text: `Nudged ${first(p)} — “still with us?”` }, ...f].slice(0, 40));
    toast(`Nudged ${first(p)}`);
  }
  function end() { setPhase("ended"); }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* top bar */}
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 font-semibold">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" /></span>
            LIVE
          </span>
          <span className="font-mono text-sm text-slate-300 inline-flex items-center gap-1.5"><Clock size={14} /> {clock(elapsed)}</span>
          <span className="hidden sm:block text-sm text-slate-400">Now teaching: <span className="text-white">{lesson ? `${course.title} · L${lesson.n} ${lesson.title}` : "Free session"}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {rec.voice && <Pill className="bg-rose-500/20 text-rose-300"><Mic size={11} /> voice {clock(elapsed)}</Pill>}
            {rec.screen && <Pill className="bg-rose-500/20 text-rose-300"><Monitor size={11} /> screen</Pill>}
          </div>
          <Btn variant="danger" onClick={end} className="!bg-rose-600 !text-white hover:!bg-rose-700"><PhoneOff size={15} /> End lesson</Btn>
        </div>
      </div>

      {phase === "ended"
        ? <Ended elapsed={elapsed} rec={rec} joined={joined} total={people.length} onEnd={onEnd} />
        : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
            {/* controls + feed */}
            <div className="lg:col-span-2 overflow-y-auto p-5 sm:p-8 space-y-6">
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
                    <RecToggle on={rec.voice} disabled={!consent} onClick={() => toggleRec("voice")}
                      iconOn={Mic} iconOff={MicOff} label="Voice recording" hint="For AI lesson notes" />
                    <RecToggle on={rec.screen} disabled={!consent} onClick={() => toggleRec("screen")}
                      iconOn={Video} iconOff={VideoOff} label="Screen / video" hint="Captures the shared screen" />
                  </div>

                  {rec.voice && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-rose-600 text-sm font-medium"><CircleDot size={14} /> Recording</span>
                      <div className="flex items-end gap-0.5 h-6 flex-1">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <span key={i} className="flex-1 bg-rose-300 rounded-full animate-pulse" style={{ height: `${20 + Math.abs(Math.sin(i * 1.3 + elapsed)) * 80}%`, animationDelay: `${i * 40}ms` }} />
                        ))}
                      </div>
                      <span className="font-mono text-xs text-slate-400">{clock(elapsed)}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-3">Also logged automatically: attendance, who's active, and each learner's activity — the raw signals behind AI insights.</p>
                </Card>
              </div>

              {/* live feed */}
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><Activity size={13} /> Live activity</div>
                <Card className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-50">
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
                <div className="flex gap-2 text-xs">
                  <Pill className="bg-emerald-50 text-emerald-700">{active.length} active</Pill>
                  <Pill className="bg-amber-50 text-amber-700">{idle.length} idle</Pill>
                  <Pill className="bg-slate-100 text-slate-400">{notJoined.length} not joined</Pill>
                </div>
              </div>
              <div className="flex-1 divide-y divide-slate-50">
                {[...joined, ...notJoined].map((p) => {
                  const pr = PRESENCE[p.presence];
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">{initials(p.name)}</div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${pr.dot}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className={`text-xs ${pr.text}`}>{p.joined ? (p.presence === "active" ? `on ${p.onPart}` : "idle") : "not joined"}</div>
                      </div>
                      {p.presence === "idle" && <button onClick={() => nudge(p)} title="Nudge" className="text-amber-500 hover:text-amber-600 p-1"><Hand size={16} /></button>}
                      {!p.joined && <span className="text-slate-300"><UserPlus size={16} /></span>}
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
  const code = "LUCID-8842";
  return (
    <button onClick={() => toast("Join link copied")} className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">
      {code} <Copy size={12} />
    </button>
  );
}

function Ended({ elapsed, rec, joined, total, onEnd }) {
  const { toast } = useStore();
  const [drafted, setDrafted] = useState(false);
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-emerald-600 mb-1"><Check size={18} /> <span className="font-semibold">Lesson ended</span></div>
        <h1 className="text-2xl font-bold tracking-tight mb-6">Session summary</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[[clock(elapsed), "duration"], [`${joined.length}/${total}`, "attended"], [rec.voice ? clock(elapsed) : "—", "voice recorded"], [rec.screen ? "yes" : "—", "screen recorded"]].map(([v, l]) => (
            <Card key={l} className="p-4"><div className="font-mono text-2xl font-bold">{v}</div><div className="text-xs text-slate-400 mt-1">{l}</div></Card>
          ))}
        </div>

        <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Attended</div>
        <Card className="p-2 mb-6 divide-y divide-slate-50">
          {joined.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-semibold">{initials(p.name)}</div>
              <span className="flex-1">{p.name}</span>
              <span className="text-xs text-slate-400">last on {p.onPart}</span>
            </div>
          ))}
          {!joined.length && <div className="px-3 py-4 text-sm text-slate-400">No students joined this session.</div>}
        </Card>

        {rec.voice ? (
          <AiNote icon={Sparkles} tone="violet" title="AI lesson notes ready to review">
            From the recording, the app drafted notes (covered topics, new words, mistakes, next steps) for each attendee. You review and edit before they save — new words drop into each learner's vocab list.
          </AiNote>
        ) : (
          <AiNote icon={GraduationCap} tone="sky" title="No recording this session">
            Attendance and activity were still logged. Turn on voice recording next time to auto-draft lesson notes.
          </AiNote>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="outline" onClick={onEnd}>Close</Btn>
          {rec.voice && (
            <Btn onClick={() => { setDrafted(true); toast(`Draft notes created for ${joined.length} students`); }} disabled={drafted}>
              {drafted ? <><Check size={15} /> Notes drafted</> : <><ArrowRight size={15} /> Draft lesson notes ({joined.length})</>}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
