/* Assigned work API — work a teacher hands one student outside the class's
   lessons (a saved block, a one-off task, a word set, a reading), and the
   student's My work. Class homework posts are the homework feature's (they
   create these same rows). The UI only talks to a client below, through
   ./hooks.js — never to `state.assignments` or reducer actions.

   Contract (every method resolves; failures reject with an ApiError):
     Teacher
       forStudent(studentId)        -> Assignment[]   newest first, taken-back work included
       assign(studentIds, item)     -> void   one row per student who is in one of the
                                      teacher's classes now (anyone else is dropped);
                                      item = { kind, title, blockType?, componentKind?,
                                      source?, content? } — a block/task's content is a
                                      snapshot (copy its H5P content first)
       withdraw(assignmentId)       -> void   open work only; the row stays as history
     Student
       mine()                       -> Assignment[]   open and done, newest first, each
                                      with `teacher: { id, name }`; never withdrawn work
       complete(assignmentId)       -> void   their own open work only
   (docs/openapi.yaml: listAssignments, assignWork, withdrawAssignment,
   listMyAssignments, completeAssignment.)

   Two implementations of that contract:
     createMockAssignmentsClient — on the in-browser mock db; what the app uses today
     createHttpAssignmentsClient — the REST calls in docs/openapi.yaml, on
                                   db/apiClient.js; not wired in yet */

const newestFirst = (list) => [...list].sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));

// `source` is db/useMockSource.js's: getState, dispatch, waitFor.
export function createMockAssignmentsClient({ getState, dispatch }) {
  return {
    async forStudent(studentId) { return newestFirst((getState().assignments || []).filter((a) => a.studentId === studentId)); },
    async assign(studentIds, item) { dispatch({ type: "ASSIGN_WORK", studentIds, item }); },
    async withdraw(assignmentId) { dispatch({ type: "WITHDRAW_ASSIGNMENT", assignmentId }); },
    async mine() {
      const state = getState();
      const teacherOf = (id) => (state.teachers || []).find((t) => t.id === id);
      return newestFirst((state.assignments || []).filter((a) => a.status !== "withdrawn"))
        .map((a) => ({ ...a, teacher: teacherOf(a.teacherId) ? { id: a.teacherId, name: teacherOf(a.teacherId).name } : null }));
    },
    async complete(assignmentId) { dispatch({ type: "COMPLETE_ASSIGNMENT", assignmentId, studentId: getState().me.id }); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpAssignmentsClient(api) {
  const done = () => {};
  return {
    forStudent: (studentId) => api.get(`/assignments?studentId=${encodeURIComponent(studentId)}`),
    assign: (studentIds, item) => api.post("/assignments", { studentIds, ...item }).then(done),
    withdraw: (assignmentId) => api.patch(`/assignments/${assignmentId}`, { status: "withdrawn" }).then(done),
    mine: () => api.get("/me/assignments"),
    complete: (assignmentId) => api.post(`/me/assignments/${assignmentId}/complete`).then(done),
  };
}
