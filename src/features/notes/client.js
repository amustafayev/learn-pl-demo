import { nullIfMissing } from "../../db/apiClient.js";

/* Lesson notes API — the seam between the UI and wherever notes live.

   A lesson has one notes document (rich text, optionally a Google Doc
   link), private to the teacher until sent to a class; the class's active
   students then read it. The UI only talks to a client below, through
   ./hooks.js — never to reducer actions or `state.lessonNotes` /
   `state.classNotes` — so moving to the real backend means swapping which
   client hooks.js builds, nothing else.

   Contract (every method resolves; failures reject with an ApiError):
     Teacher
       get(courseId, lessonId)                    -> Note | null
       save(courseId, lessonId, html)             -> void   (upsert; an empty one is removed)
       setDoc(courseId, lessonId, { docUrl, managed? })
                                                  -> void   ("" unlinks)
       send(courseId, lessonId, classId, sent)    -> void   (send to a class, or take back)
     Student
       listMine()                                 -> MyNote[]   newest first
   Note   = { id, courseId, lessonId, html, text, docUrl, docManaged,
              sentTo: [{ classId, className, at }], createdAt, updatedAt }
   MyNote = { id, classId, courseId, lessonId, html, text, docUrl, sentAt, updatedAt }
   (docs/openapi.yaml: LessonNotes and MyNote.)

   Two implementations of that contract:
     createMockNotesClient — on the in-browser mock db; what the app uses today
     createHttpNotesClient — the REST calls in docs/openapi.yaml, on
                             db/apiClient.js; not wired in yet */

// `getState` reads the latest mock db (already scoped to the signed-in
// teacher or student); `dispatch` writes it.
export function createMockNotesClient({ getState, dispatch }) {
  const className = (s, classId) => (s.classes || []).find((c) => c.id === classId)?.name || null;
  return {
    async get(courseId, lessonId) {
      const s = getState();
      const note = (s.lessonNotes || []).find((n) => n.courseId === courseId && n.lessonId === lessonId);
      return note ? { ...note, sentTo: note.sentTo.map((x) => ({ ...x, className: className(s, x.classId) })) } : null;
    },
    async save(courseId, lessonId, html) { dispatch({ type: "SAVE_LESSON_NOTES", courseId, lessonId, html }); },
    async setDoc(courseId, lessonId, { docUrl, managed = false }) { dispatch({ type: "SET_LESSON_NOTES_DOC", courseId, lessonId, docUrl, managed }); },
    async send(courseId, lessonId, classId, sent) { dispatch({ type: "SEND_LESSON_NOTES", courseId, lessonId, classId, sent }); },
    // The mock names the send time `sharedAt`; the API calls it `sentAt`.
    async listMine() {
      return (getState().classNotes || []).map(({ sharedAt, ...n }) => ({ ...n, sentAt: sharedAt }));
    },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpNotesClient(api) {
  const base = (courseId, lessonId) => `/courses/${courseId}/lessons/${lessonId}/notes`;
  return {
    get: (courseId, lessonId) => api.get(base(courseId, lessonId)).catch(nullIfMissing),
    save: (courseId, lessonId, html) => api.put(base(courseId, lessonId), { html }).then(() => {}),
    setDoc: (courseId, lessonId, { docUrl, managed = false }) => api.patch(base(courseId, lessonId), { docUrl, managed }).then(() => {}),
    send: (courseId, lessonId, classId, sent) => api.put(`${base(courseId, lessonId)}/classes/${classId}`, { sent }).then(() => {}),
    listMine: () => api.get("/me/notes"),
  };
}
