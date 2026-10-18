/* Class homework API — the seam between the UI and wherever homework lives.

   Modeled on Google Classroom's Classwork: an *assignment* is one post with a
   title, instructions, attachments (lesson blocks / components / word sets),
   an optional due date and a topic (here: the lesson; none = "No topic").
   It is a draft, scheduled for later, or assigned. Posting gives every active
   member of the class one `assignments` row per attachment, tagged with the
   post's id — that is how the student app keeps working unchanged. Per
   student the teacher sees Turned in / Assigned / Missing (not turned in
   after the due date). Individual-student assigning is not part of this yet.

   The UI only talks to the client below — never to reducer actions or
   `state.assignments` — so moving to a real backend means swapping which
   client `homework.jsx` builds, nothing else.

   Contract (every method resolves; failures reject with an ApiError):
     list(classId)                      -> Post[]     newest first, with stats
     get(classId, id)                   -> Post
     saveDraft(classId, post)           -> void       create/update a draft
     publish(classId, post, { scheduledAt? })
                                        -> void       post now, or schedule for later
     update(classId, id, patch)         -> void       title / instructions / dueAt of a posted one
     remove(classId, id)                -> void       open work taken back, done work stays
   Post = { id, classId, lessonId, courseId, title, instructions, attachments[],
            dueAt, status: draft|scheduled|assigned, scheduledAt, postedAt, createdAt,
            students: [{ studentId, status: turnedIn|assigned|missing, doneAt }],
            turnedIn, assigned, missing }     (the counts are 0 until it is assigned)

   Two implementations of that contract:
     createMockHomeworkClient  — on the in-browser mock db (reducer actions);
                                 what the app uses today
     createHttpHomeworkClient  — the REST shape in docs/openapi.yaml
                                 (/classes/{classId}/homework…), on db/apiClient.js;
                                 not wired in yet */

// One post's per-student picture, from the rows its posting created. A
// student has "turned in" once every attachment row of theirs is done.
export function homeworkStats(hw, assignments, now = Date.now()) {
  const rows = assignments.filter((a) => a.homeworkId === hw.id && a.status !== "withdrawn");
  const byStudent = new Map();
  for (const r of rows) {
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, []);
    byStudent.get(r.studentId).push(r);
  }
  const late = hw.dueAt && new Date(hw.dueAt).getTime() < now;
  const students = [...byStudent.entries()].map(([studentId, list]) => {
    const done = list.every((r) => r.status === "done");
    const doneAt = done ? list.map((r) => r.completedAt).sort().pop() : null;
    return { studentId, status: done ? "turnedIn" : late ? "missing" : "assigned", doneAt };
  });
  const count = (st) => students.filter((x) => x.status === st).length;
  return { students, turnedIn: count("turnedIn"), assigned: count("assigned"), missing: count("missing") };
}

// `getState` reads the latest mock db; `dispatch` writes it.
export function createMockHomeworkClient({ getState, dispatch }) {
  const withStats = (hw, s) => ({ ...hw, ...homeworkStats(hw, s.assignments) });
  return {
    async list(classId) {
      const s = getState();
      return s.homework.filter((h) => h.classId === classId)
        .map((h) => withStats(h, s))
        .sort((a, b) => (b.postedAt || b.createdAt).localeCompare(a.postedAt || a.createdAt));
    },
    async get(classId, id) {
      const s = getState();
      const h = s.homework.find((x) => x.id === id && x.classId === classId);
      return h ? withStats(h, s) : null;
    },
    async saveDraft(classId, post) { dispatch({ type: "SAVE_HOMEWORK", homework: { ...post, classId } }); },
    async publish(classId, post, { scheduledAt = null } = {}) { dispatch({ type: "PUBLISH_HOMEWORK", homework: { ...post, classId }, scheduledAt }); },
    async update(_classId, id, patch) { dispatch({ type: "UPDATE_HOMEWORK", id, patch }); },
    async remove(_classId, id) { dispatch({ type: "DELETE_HOMEWORK", id }); },
    // a real backend releases scheduled posts itself; the mock has no server clock
    async releaseScheduled() { dispatch({ type: "RELEASE_SCHEDULED_HOMEWORK" }); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpHomeworkClient(api) {
  const base = (classId) => `/classes/${classId}/homework`;
  return {
    list: (classId) => api.get(base(classId)),
    get: (classId, id) => api.get(`${base(classId)}/${id}`),
    saveDraft: (classId, post) => (post.id ? api.put(`${base(classId)}/${post.id}`, post) : api.post(base(classId), post)),
    publish: async (classId, post, opts = {}) => {
      const saved = post.id ? await api.put(`${base(classId)}/${post.id}`, post) : await api.post(base(classId), post);
      return api.post(`${base(classId)}/${saved.id}/publish`, opts);
    },
    update: (classId, id, patch) => api.patch(`${base(classId)}/${id}`, patch),
    remove: (classId, id) => api.delete(`${base(classId)}/${id}`),
  };
}
