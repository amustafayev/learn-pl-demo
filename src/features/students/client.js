import { nullIfMissing } from "../../db/apiClient.js";
import { classMembers, studentClasses, studentHistory, teacherRoster, activeClassCourse } from "../../db/mockDb.jsx";
import { rosterStudents } from "./roster.js";

/* Students API — the teacher's side of who they teach: the roster grouped
   by relationship (in a class now, asking to join or buy, former, bought a
   course, blocked), one student and everything they had with the teacher,
   a class's members and email invites, and blocking. A class's own data is
   the classes feature's; purchases are the sales feature's. The UI only
   talks to a client below, through ./hooks.js — never to `state.students`,
   `state.memberships`, `state.invitations`, `state.blocks` or reducer actions.

   Contract (every method resolves; failures reject with an ApiError):
     roster()                              -> Roster   { active, requests, former, customers, blocked }
     getStudent(studentId)                 -> Student | null   with `blocked` (by this teacher)
     history(studentId)                    -> StudentHistory
     classMembers(classId)                 -> Member[]   active, each { ...Membership, student }
     addToClass(classId, studentId)        -> void   one of the teacher's own students
     removeMember(membershipId)            -> void   history stays; they read as former
     decideRequest(membershipId, status)   -> void   active | declined
     block(studentId) / unblock(studentId) -> void
     invitations(classId)                  -> Invitation[]   pending ones
     invite(classId, email)                -> void
     revokeInvitation(invitationId)        -> void
     names()                               -> [{ id, name }]   the students this user may know
                                              by name: the teacher's, or a student just themselves
   Roster.active students also carry `classes: [{ id, name, courseId }]`
   (their classes now, with the course each is on); every class in a
   request, former membership or history item is `class: { id, name }`, a
   course `{ id, title }`, a lesson `{ id, n, title }` (docs/openapi.yaml:
   Joining, Students).

   Two implementations of that contract:
     createMockStudentsClient — on the in-browser mock db; what the app uses today
     createHttpStudentsClient — the REST calls in docs/openapi.yaml, on
                                db/apiClient.js; not wired in yet */

const classRef = (c) => (c ? { id: c.id, name: c.name } : null);
const courseRef = (c) => (c ? { id: c.id, title: c.title } : null);
const lessonRef = (l) => (l ? { id: l.id, n: l.n, title: l.title } : null);
// The mock's `cls` / full course / full lesson, as the API's references.
function refs(item) {
  const { cls, course, lesson, ...rest } = item;
  return {
    ...rest,
    ...("cls" in item ? { class: classRef(cls) } : {}),
    ...("course" in item ? { course: courseRef(course) } : {}),
    ...("lesson" in item ? { lesson: lessonRef(lesson) } : {}),
  };
}

function rosterJson(state) {
  const r = teacherRoster(state);
  const classesOf = (studentId) => studentClasses(state, studentId).map((c) => ({ ...classRef(c), courseId: activeClassCourse(c)?.courseId || null }));
  const classById = (id) => state.classes.find((c) => c.id === id);
  return {
    active: r.active.map((s) => ({ ...s, classes: classesOf(s.id) })),
    requests: r.requests.map(refs),
    former: r.former.map((f) => ({ ...f, ended: f.ended.map((m) => ({ ...m, class: classRef(classById(m.classId)) })) })),
    customers: r.customers.map(refs),
    blocked: r.blocked,
  };
}

function historyJson(h) {
  return {
    classes: h.classes.map((c) => ({
      ...refs(c),
      lessons: c.lessons.map(refs),
      now: c.now ? { course: courseRef(c.now.course), progress: { next: lessonRef(c.now.progress.next), taughtCount: c.now.progress.taughtCount, total: c.now.progress.total } } : null,
    })),
    purchases: h.purchases.map((p) => ({ ...refs(p), lessons: p.lessons.map(refs) })),
    lessons: h.lessons.map(refs),
    assignments: h.assignments,
    timeline: h.timeline.map(refs),
    totals: h.totals,
  };
}

// `source` is db/useMockSource.js's: getState, dispatch, waitFor.
export function createMockStudentsClient({ getState, dispatch }) {
  return {
    async roster() { return rosterJson(getState()); },
    async getStudent(studentId) {
      const state = getState();
      const student = state.students.find((s) => s.id === studentId);
      return student ? { ...student, blocked: state.blocks.some((b) => b.studentId === studentId) } : null;
    },
    async history(studentId) { return historyJson(studentHistory(getState(), studentId)); },
    async classMembers(classId) {
      return classMembers(getState(), classId).map((m) => ({ ...m }));
    },
    async addToClass(classId, studentId) { dispatch({ type: "ADD_CLASS_MEMBER", classId, studentId }); },
    async removeMember(membershipId) {
      const m = getState().memberships.find((x) => x.id === membershipId);
      if (m) dispatch({ type: "REMOVE_CLASS_MEMBER", classId: m.classId, studentId: m.studentId });
    },
    async decideRequest(membershipId, status) { dispatch({ type: "DECIDE_MEMBERSHIP", membershipId, status }); },
    async block(studentId) { dispatch({ type: "BLOCK_STUDENT", studentId }); },
    async unblock(studentId) { dispatch({ type: "UNBLOCK_STUDENT", studentId }); },
    async invitations(classId) { return getState().invitations.filter((i) => i.classId === classId && i.status === "pending"); },
    async invite(classId, email) { dispatch({ type: "CREATE_INVITATION", classId, email }); },
    async revokeInvitation(invitationId) { dispatch({ type: "REVOKE_INVITATION", invitationId }); },
    async names() { return (getState().students || []).map(({ id, name }) => ({ id, name })); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient();
// `audience` "student" knows only its own name (the student app's group work).
export function createHttpStudentsClient(api, { audience = "teacher" } = {}) {
  const done = () => {};
  return {
    roster: () => api.get("/students"),
    getStudent: (studentId) => api.get(`/students/${studentId}`).catch(nullIfMissing),
    history: (studentId) => api.get(`/students/${studentId}/history`),
    classMembers: (classId) => api.get(`/classes/${classId}/members?status=active`),
    addToClass: (classId, studentId) => api.post(`/classes/${classId}/members`, { studentId }).then(done),
    removeMember: (membershipId) => api.patch(`/memberships/${membershipId}`, { status: "removed" }).then(done),
    decideRequest: (membershipId, status) => api.patch(`/memberships/${membershipId}`, { status }).then(done),
    block: (studentId) => api.post("/blocked-students", { studentId }).then(done),
    unblock: (studentId) => api.delete(`/blocked-students/${studentId}`).then(done),
    invitations: (classId) => api.get(`/classes/${classId}/invitations?status=pending`),
    invite: (classId, email) => api.post(`/classes/${classId}/invitations`, { email }).then(done),
    revokeInvitation: (invitationId) => api.delete(`/invitations/${invitationId}`).then(done),
    names: async () => {
      if (audience === "student") { const me = await api.get("/me"); return [{ id: me.id, name: me.name }]; }
      return rosterStudents(await api.get("/students")).map(({ id, name }) => ({ id, name }));
    },
  };
}
