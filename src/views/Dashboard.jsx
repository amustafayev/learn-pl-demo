import React from "react";
import {
  IconAlertTriangle, IconArrowRight,
  IconUsers, IconChartBar, IconVocabulary, IconUserPlus, IconCheck, IconX,
} from "@tabler/icons-react";
import { Page, SectionLabel, Card, Button, Avatar, Tag, StatCard } from "../design-system.jsx";
import { useStore, useNav, activeStudents, teacherRoster } from "../store.jsx";
import { timeAgo } from "../format.js";
import UpcomingCalendar from "../components/UpcomingCalendar.jsx";

export default function Dashboard() {
  const { state } = useStore();
  const { go } = useNav();

  const students = activeStudents(state);
  const active = students.filter((s) => s.status !== "not started").length;
  const atRisk = students.filter((s) => s.atRisk);
  // students asking to join one of this teacher's classes (purchase requests live on the Students page)
  const joinRequests = teacherRoster(state).requests.filter((r) => r.kind === "class");
  // A course has no completion of its own (see Courses.jsx) — this is a
  // teacher-facing "how's my roster doing" number, so it averages students'
  // own progress, not a static per-course field.
  const avg = students.length ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length) : 0;

  return (
    <Page>
      <p className="text-neutral-600 mb-6">Your teaching cockpit — who to help today, and where they're stuck.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IconUsers} label="active students" value={active} onClick={() => go({ tab: "students" })} />
        <StatCard icon={IconChartBar} label="avg completion" value={`${avg}%`} delta="on track" />
        <StatCard icon={IconAlertTriangle} label="need attention" value={atRisk.length} onClick={() => go({ tab: "students", filter: "atRisk" })} />
        <StatCard icon={IconVocabulary} label="words → known / learner·wk" value="9.1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* upcoming sessions — week calendar of the teacher's classes */}
        <div className="lg:col-span-2">
          <SectionLabel right={<button onClick={() => go({ tab: "classes" })} className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">All classes <IconArrowRight size={12} stroke={1.75} /></button>}>
            Upcoming sessions
          </SectionLabel>
          <UpcomingCalendar />
        </div>

        {/* who's waiting to join */}
        <div className="space-y-6">
          <div>
            <SectionLabel right={joinRequests.length ? <button onClick={() => go({ tab: "students", filter: "requests" })} className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">All requests <IconArrowRight size={12} stroke={1.75} /></button> : null}>
              Join requests{joinRequests.length ? ` · ${joinRequests.length}` : ""}
            </SectionLabel>
            <Card className="divide-y divide-neutral-200 overflow-hidden">
              {joinRequests.map((r) => <JoinRequestRow key={r.id} request={r} />)}
              {!joinRequests.length && <div className="p-4 text-sm text-neutral-500">No students are waiting to join.</div>}
            </Card>
          </div>
        </div>
      </div>

    </Page>
  );
}

// One student asking to join a class: who, which class, when — Accept or Decline
// right here. Same two reducer actions as the Students page's request rows.
function JoinRequestRow({ request }) {
  const { dispatch, toast } = useStore();
  const { student, cls, membership } = request;
  const first = student.name.split(" ")[0];
  const decide = (status) => {
    dispatch({ type: "DECIDE_MEMBERSHIP", membershipId: membership.id, status });
    toast(status === "active" ? `${first} joined ${cls.name}` : `Declined ${first}'s request`);
  };
  return (
    <div className="p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={student.name} size="sm" color="primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-neutral-950 truncate">{student.name}</div>
          <div className="text-xs text-neutral-500">wants to join · {timeAgo(request.at)}</div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs text-neutral-600">
        <IconUserPlus size={14} stroke={1.75} className="shrink-0" /> Class: <span className="whitespace-nowrap"><Tag color="primary">{cls.name}</Tag></span>
        {request.previously && <span className="whitespace-nowrap"><Tag color="info">Former student</Tag></span>}
      </div>
      {membership.message && <p className="mt-2 rounded-lg bg-neutral-200 px-2.5 py-1.5 text-xs text-neutral-800">“{membership.message}”</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => decide("active")}><IconCheck size={14} stroke={1.75} /> Accept</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => decide("declined")}><IconX size={14} stroke={1.75} /> Decline</Button>
      </div>
    </div>
  );
}
