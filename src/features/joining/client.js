import { nullIfMissing } from "../../db/apiClient.js";

/* Joining API — the student's side of getting into a class: the page
   behind a class link (a preview, then "Request to join") and email
   invites (accepting one admits them at once). The teacher's side —
   accepting requests, sending invites — is the students feature's; the
   classes they end up in are the learning feature's. The UI only talks to
   a client below, through ./hooks.js — never to `state.joinPreviews`,
   `state.invitations` or reducer actions.

   Contract (every method resolves; failures reject with an ApiError):
     preview(token)                 -> JoinPreview | null   null: unknown or replaced link,
                                       or the class isn't taking requests
     requestToJoin(token, message)  -> void   only ever a request; the teacher accepts it
     myInvitations()                -> Invitation[]   pending and not expired, each with
                                       `class: { id, name }` and `teacher: { id, name }`
     acceptInvitation(invitationId) -> void   puts them straight into the class
   JoinPreview = { token, classId, name, teacher, schedule, studentCount,
                   courses: [{ id, title, level, hue, lessons: [{ n, title }] }] }
   — names and an outline only, never lesson content or other students
   (docs/openapi.yaml: Student app).

   Two implementations of that contract:
     createMockJoiningClient — on the in-browser mock db; what the app uses today
     createHttpJoiningClient — the REST calls in docs/openapi.yaml, on
                               db/apiClient.js; not wired in yet */

// `source` is db/useMockSource.js's: getState, dispatch, waitFor. getState is
// the signed-in student's slice (studentView).
export function createMockJoiningClient({ getState, dispatch }) {
  const teacherOf = (s, id) => {
    const t = (s.teachers || []).find((x) => x.id === id);
    return t ? { id: t.id, name: t.name } : null;
  };
  return {
    async preview(token) {
      const s = getState();
      const p = (s.joinPreviews || []).find((x) => x.token === token);
      if (!p) return null;
      const { teacherId, ...rest } = p;
      return { ...rest, teacher: teacherOf(s, teacherId) };
    },
    async requestToJoin(token, message = "") { dispatch({ type: "REQUEST_TO_JOIN", token, studentId: getState().me.id, message }); },
    async myInvitations() {
      const s = getState();
      const now = new Date().toISOString();
      return (s.invitations || []).filter((i) => i.status === "pending" && i.expiresAt > now).map((i) => {
        const cls = s.classes.find((c) => c.id === i.classId);
        return { ...i, class: cls ? { id: cls.id, name: cls.name } : null, teacher: teacherOf(s, cls?.teacherId) };
      });
    },
    async acceptInvitation(invitationId) { dispatch({ type: "ACCEPT_INVITATION", invitationId, studentId: getState().me.id }); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpJoiningClient(api) {
  const done = () => {};
  return {
    preview: (token) => api.get(`/join/${token}`).catch(nullIfMissing),
    requestToJoin: (token, message = "") => api.post("/join", { token, message }).then(done),
    myInvitations: () => api.get("/me/invitations"),
    acceptInvitation: (invitationId) => api.post(`/invitations/${invitationId}/accept`).then(done),
  };
}
