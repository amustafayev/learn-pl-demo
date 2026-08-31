import React, { useState, useMemo } from "react";
import {
  IconBookUpload, IconSend, IconAlertTriangle, IconBrain, IconArrowRight, IconBookmark,
} from "@tabler/icons-react";
import { Page, PageHeader, SectionLabel, Card, Button, Avatar, StatCard, Badge, Modal, StudentCheckList } from "../design-system.jsx";
import { useStore, useNav } from "../store.jsx";
import { WORD_OF_DAY, BLOCK_TYPES } from "../data.jsx";
import { COMPONENT_META } from "./parts.jsx";
import { AddTextModal } from "../components/modals.jsx";
import { StudentAssignModal } from "../components/StudentAssignModal.jsx";

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
  const { state, toast } = useStore();
  const { go } = useNav();
  const [modal, setModal] = useState(null);

  const students = state.students;
  const active = students.filter((s) => s.status !== "not started").length;
  const atRisk = students.filter((s) => s.atRisk);
  const avg = Math.round(state.courses.reduce((a, c) => a + c.completion, 0) / state.courses.length);
  // three students to brief before their next session (most recently active, not-at-risk first)
  const briefs = students.filter((s) => s.status === "in progress").slice(0, 3);
  // most recently saved Blocks/Components, interleaved — both banks are
  // unshifted-to on save, so index 0 of each is that bank's latest item.
  const recentSaves = useMemo(() => {
    const blocks = (state.blockBank || []).slice(0, 3).map((b) => ({ ...b, saveKind: "block" }));
    const components = (state.componentBank || []).slice(0, 3).map((c) => ({ ...c, saveKind: "component" }));
    const merged = [];
    for (let i = 0; i < 3; i++) {
      if (blocks[i]) merged.push(blocks[i]);
      if (components[i]) merged.push(components[i]);
    }
    return merged.slice(0, 4);
  }, [state.blockBank, state.componentBank]);

  return (
    <Page>
      <PageHeader
        kicker={`${state.teacher.role} · signed in`}
        title={`Good morning, ${state.teacher.name.split(" ")[0]}`}
        sub="Your teaching cockpit — who to help today, and where they're stuck."
        right={
          <div className="hidden sm:flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModal("text")}><IconBookUpload size={15} stroke={1.75} /> Add reading</Button>
            <Button variant="primary" size="sm" onClick={() => setModal("assign")}><IconSend size={15} stroke={1.75} /> Assign</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="active students" value={active} onClick={() => go({ tab: "students" })} />
        <StatCard label="avg completion" value={`${avg}%`} delta="on track" />
        <StatCard label="need attention" value={atRisk.length} onClick={() => go({ tab: "students", filter: "atRisk" })} />
        <StatCard label="words → known / learner·wk" value="9.1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* pre-lesson briefs — the teacher-visibility loop */}
        <div className="lg:col-span-2">
          <SectionLabel right={<button onClick={() => go({ tab: "students" })} className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">All students <IconArrowRight size={12} stroke={1.75} /></button>}>
            Before your next sessions · AI pre-lesson briefs
          </SectionLabel>
          <div className="space-y-3">
            {briefs.map((s) => (
              <Card key={s.id} className="p-4 hover:border-primary-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-neutral-950">{s.name}</div>
                    <div className="text-xs text-neutral-500">{s.goal}</div>
                  </div>
                  <Button variant="light" size="sm" onClick={() => go({ tab: "students", studentId: s.id })}>Open<IconArrowRight size={13} stroke={1.75} /></Button>
                </div>
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 p-3.5">
                  <IconBrain size={16} stroke={1.75} className="text-primary-600 shrink-0 mt-0.5" />
                  <div className="text-sm leading-relaxed text-neutral-800"><b>{s.name.split(" ")[0]}</b> is {brief(s)}.</div>
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
                  <div className="flex items-start gap-2.5 rounded-xl border border-warning-200 bg-warning-50 p-3.5">
                    <IconAlertTriangle size={16} stroke={1.75} className="text-warning-600 shrink-0 mt-0.5" />
                    <div className="text-sm leading-relaxed text-neutral-800">
                      <div className="font-semibold mb-0.5 text-neutral-950">{s.name}</div>
                      {s.riskReason}
                    </div>
                  </div>
                </button>
              ))}
              {!atRisk.length && <Card className="p-4 text-sm text-neutral-500">Nobody's slipping right now. 🎉</Card>}
            </div>
          </div>

          <div>
            <SectionLabel>Word of the day</SectionLabel>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{WORD_OF_DAY.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-neutral-950">{WORD_OF_DAY.term} <span className="text-primary-600 font-medium text-sm">· {WORD_OF_DAY.az}</span></div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">UK {WORD_OF_DAY.ipaUk} · US {WORD_OF_DAY.ipaUs}</div>
                  <p className="text-sm text-neutral-600 mt-1">{WORD_OF_DAY.def}</p>
                  <p className="text-xs text-neutral-500 italic mt-1">“{WORD_OF_DAY.example}”</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => toast(`“${WORD_OF_DAY.term}” pushed to all students`)}>
                <IconSend size={12} stroke={1.75} /> Push to all students
              </Button>
            </Card>
          </div>

          <div>
            <SectionLabel right={<button onClick={() => go({ tab: "library" })} className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">Library <IconArrowRight size={12} stroke={1.75} /></button>}>
              Recently saved
            </SectionLabel>
            <Card className="p-2 divide-y divide-neutral-200">
              {recentSaves.length ? recentSaves.map((item) => {
                const isBlock = item.saveKind === "block";
                const meta = isBlock ? BLOCK_TYPES[item.type] : COMPONENT_META[item.kind];
                const I = meta?.icon || IconBookmark;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-neutral-100 text-neutral-700"><I size={15} stroke={1.75} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-neutral-950">{item.title}</div>
                      <div className="text-xs text-neutral-500 truncate">{item.from}</div>
                    </div>
                    <Badge color={isBlock ? "neutral" : "info"}>{isBlock ? "Block" : "Component"}</Badge>
                  </div>
                );
              }) : (
                <p className="text-sm text-neutral-500 p-3">Nothing saved yet — bookmark a block or component from any lesson to see it here.</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      <AddTextModal open={modal === "text"} onClose={() => setModal(null)} />
      <AssignFromDashboardModal open={modal === "assign"} onClose={() => setModal(null)} />
    </Page>
  );
}

// The dashboard's quick "Assign" doesn't start from a student's own page, so
// it needs one extra step first: pick who, then reuse the exact same real
// assign flow (lessons/blocks/kits/words/new task) as the student page does.
function AssignFromDashboardModal({ open, onClose }) {
  const { state } = useStore();
  const [student, setStudent] = useState(null);
  const close = () => { setStudent(null); onClose(); };
  if (!open) return null;
  if (!student) {
    return (
      <Modal open onClose={close} title="Assign to a student" sub="Pick who you're assigning first">
        <StudentCheckList students={state.students} isSelected={() => false} onToggle={(s) => setStudent(s)}
          metaFor={(s) => `${s.level} · ${s.status}`} />
      </Modal>
    );
  }
  return <StudentAssignModal open onClose={close} student={student} />;
}
