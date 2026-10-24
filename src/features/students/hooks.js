import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockStudentsClient } from "./client.js";

/* The UI's one door to the teacher's students: the Students page and a
   student's page, request rows (Students, Dashboard, a class), a class's
   members and invites, the sidebar's waiting count, and the student
   pickers (enrolling, assigning, group work). */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpStudentsClient(api) here, and have a write
// bump this feature's revision so every hook asks again.
function useStudentsSource() {
  const { source, revision } = useMockSource((s) => [
    s.students, s.memberships, s.purchases, s.blocks, s.invitations, s.classes, s.courses,
    s.lessons, s.taughtLessons, s.attendance, s.lessonCompletions, s.assignments,
  ]);
  const client = useMemo(() => createMockStudentsClient(source), [source]);
  return { client, revision };
}

const EMPTY_ROSTER = { active: [], requests: [], former: [], customers: [], blocked: [] };

// What can be done about students. Loads nothing.
export function useStudentActions() {
  const { client } = useStudentsSource();
  return useMemo(() => ({
    addToClass: (classId, studentId) => client.addToClass(classId, studentId),
    removeMember: (membershipId) => client.removeMember(membershipId),
    decideRequest: (membershipId, status) => client.decideRequest(membershipId, status),
    block: (studentId) => client.block(studentId),
    unblock: (studentId) => client.unblock(studentId),
  }), [client]);
}

// Everyone the teacher teaches, grouped by relationship.
export function useRoster() {
  const { client, revision } = useStudentsSource();
  const { data, loading } = useLoad(() => client.roster(), "roster", revision);
  return { roster: data || EMPTY_ROSTER, loading };
}

// One student and their history with the teacher.
export function useStudent(studentId) {
  const { client, revision } = useStudentsSource();
  const student = useLoad(() => (studentId ? client.getStudent(studentId) : Promise.resolve(null)), studentId || "none", revision);
  const history = useLoad(() => (studentId ? client.history(studentId) : Promise.resolve(null)), studentId || "none", revision);
  return { student: student.data || null, history: history.data || null, loading: student.loading || history.loading };
}

// A class's students right now (each membership with its student).
export function useClassMembers(classId) {
  const { client, revision } = useStudentsSource();
  const { data, loading } = useLoad(() => (classId ? client.classMembers(classId) : Promise.resolve([])), classId || "none", revision);
  const members = useMemo(() => data || [], [data]);
  return { members, loading };
}

// Names of the students this user may know (`nameOf(id)`, null for anyone
// else) — for group work and homework stats, in either app.
export function useStudentNames() {
  const { client, revision } = useStudentsSource();
  const { data } = useLoad(() => client.names(), "names", revision);
  return useMemo(() => {
    const byId = new Map((data || []).map((s) => [s.id, s.name]));
    return { nameOf: (id) => byId.get(id) || null };
  }, [data]);
}

// A class's pending email invites, sending one and taking one back.
export function useInvitations(classId) {
  const { client, revision } = useStudentsSource();
  const { data } = useLoad(() => (classId ? client.invitations(classId) : Promise.resolve([])), classId || "none", revision);
  const invitations = useMemo(() => data || [], [data]);
  return useMemo(() => ({
    invitations,
    invite: (email) => client.invite(classId, email),
    revoke: (invitationId) => client.revokeInvitation(invitationId),
  }), [invitations, client, classId]);
}
