import React, { useState } from "react";
import {
  Plus, BookPlus, Send, AlertTriangle, Brain, ArrowRight, Flame, TrendingUp,
} from "lucide-react";
import { Page, PageHead, Card, Btn, Avatar, StatCard, AiNote, SectionLabel, Pill } from "../ui.jsx";
import { useStore, useNav } from "../store.jsx";
import { TEACHER } from "../data.jsx";
import { NewCourseModal, AddTextModal, AssignModal } from "../components/modals.jsx";

function weakest(concepts) {
  return Object.entries(concepts).sort((a, b) => a[1] - b[1])[0];
}
// derive a one-line pre-lesson brief from the tracked data
function brief(s) {
  const [concept, score] = weakest(s.concepts);
  const bits = [`stuck on ${concept.toLowerCase()} (${score}%)`];
  if (s.last.includes("d ago")) bits.push(`hasn't practised in ${s.last.replace(" ago", "")}`);
  if (s.skills.vocab >= 80) bits.push("ready to move past current vocab");
  return bits.join(" · ");
}

export default function Dashboard() {
  const { state } = useStore();
  const { go } = useNav();
  const [modal, setModal] = useState(null);

  const students = state.students;
  const active = students.filter((s) => s.status !== "not started").length;
  const atRisk = students.filter((s) => s.atRisk);
  const avg = Math.round(state.courses.reduce((a, c) => a + c.completion, 0) / state.courses.length);
  // three students to brief before their next session (most recently active, not-at-risk first)
  const briefs = students.filter((s) => s.status === "in progress").slice(0, 3);

  return (
    <Page>
      <PageHead
        kicker={`${TEACHER.role} · signed in`}
        title={`Good morning, ${TEACHER.name.split(" ")[0]}`}
        sub="Your teaching cockpit — who to help today, and where they're stuck."
        right={
          <div className="hidden sm:flex gap-2">
            <Btn variant="outline" size="sm" onClick={() => setModal("text")}><BookPlus size={15} /> Add reading</Btn>
            <Btn size="sm" onClick={() => setModal("assign")}><Send size={15} /> Assign</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard value={active} label="active students" tone="text-indigo-600" />
        <StatCard value={`${avg}%`} label="avg completion" tone="text-emerald-600" />
        <StatCard value={atRisk.length} label="need attention" tone="text-rose-500" />
        <StatCard value="9.1" label="words → known / learner·wk" tone="text-slate-900" hint="your north-star metric" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* pre-lesson briefs — the teacher-visibility loop */}
        <div className="lg:col-span-2">
          <SectionLabel right={<button onClick={() => go({ tab: "students" })} className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">All students <ArrowRight size={12} /></button>}>
            Before your next sessions · AI pre-lesson briefs
          </SectionLabel>
          <div className="space-y-3">
            {briefs.map((s) => (
              <Card key={s.id} className="p-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} size={10} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.goal}</div>
                  </div>
                  <Btn variant="soft" size="sm" onClick={() => go({ tab: "students", studentId: s.id })}>Open<ArrowRight size={13} /></Btn>
                </div>
                <div className="mt-3">
                  <AiNote icon={Brain} tone="violet">
                    <b>{s.name.split(" ")[0]}</b> is {brief(s)}.
                  </AiNote>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* needs attention + quick actions */}
        <div className="space-y-6">
          <div>
            <SectionLabel>Needs attention</SectionLabel>
            <div className="space-y-2.5">
              {atRisk.map((s) => (
                <button key={s.id} onClick={() => go({ tab: "students", studentId: s.id })} className="w-full text-left">
                  <AiNote icon={AlertTriangle} tone="rose" title={s.name}>{s.riskReason}</AiNote>
                </button>
              ))}
              {!atRisk.length && <Card className="p-4 text-sm text-slate-400">Nobody's slipping right now. 🎉</Card>}
            </div>
          </div>

          <div>
            <SectionLabel>Quick actions</SectionLabel>
            <Card className="p-2 divide-y divide-slate-100">
              {[
                { label: "New course", icon: Plus, fn: () => setModal("course") },
                { label: "Add reading text", icon: BookPlus, fn: () => setModal("text") },
                { label: "Assign to a student", icon: Send, fn: () => setModal("assign") },
                { label: "See class analytics", icon: TrendingUp, fn: () => go({ tab: "stats" }) },
              ].map((a) => (
                <button key={a.label} onClick={a.fn} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 rounded-lg transition-colors">
                  <a.icon size={16} className="text-indigo-500" /> {a.label}
                </button>
              ))}
            </Card>
          </div>

          <div>
            <SectionLabel>Streaks today</SectionLabel>
            <Card className="p-4 space-y-2.5">
              {students.filter((s) => s.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <Avatar name={s.name} />
                  <span className="flex-1 truncate">{s.name}</span>
                  <Pill className="bg-amber-50 text-amber-700"><Flame size={12} /> {s.streak}d</Pill>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 pt-1">Encourage-don't-punish: streak freezes protect a missed day.</p>
            </Card>
          </div>
        </div>
      </div>

      <NewCourseModal open={modal === "course"} onClose={() => setModal(null)} />
      <AddTextModal open={modal === "text"} onClose={() => setModal(null)} />
      <AssignModal open={modal === "assign"} onClose={() => setModal(null)} what="Lesson 4 — Tense forms" kind="lesson" />
    </Page>
  );
}
