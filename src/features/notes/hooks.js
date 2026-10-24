import { useMemo, useRef } from "react";
import { useStore } from "../../store.jsx";
import { useLoad } from "../../useLoad.js";
import { createMockNotesClient } from "./client.js";
import { googleDocs } from "./googleDocs.js";

/* The UI's one door to lesson notes: the teacher's notes panel and the
   student app's notes all go through these hooks. Nothing here is drawn on
   screen, and nothing outside this folder knows where notes come from. */

// Which client answers, and when to ask it again. The mock answers from the
// in-browser db, so a change there stands in for the server's push. For the
// real backend, build createHttpNotesClient(api) here instead and drive
// `revision` from its push (GET /events: notes.updated).
function useNotesSource() {
  const { state, dispatch } = useStore();
  const latest = useRef(state);
  latest.current = state;
  const client = useMemo(() => createMockNotesClient({ getState: () => latest.current, dispatch }), [dispatch]);
  // A token that changes whenever the mock's notes (or the class names on
  // them) do.
  const revision = useMemo(() => [state.lessonNotes, state.classNotes, state.classes], [state.lessonNotes, state.classNotes, state.classes]);
  return { client, revision };
}

// Teacher: one lesson's notes and what can be done with them. `loading` is
// true only until this lesson's notes first arrive; a later refresh keeps
// showing the current ones, so an open editor is never swapped out.
export function useLessonNotes(courseId, lessonId) {
  const { client, revision } = useNotesSource();
  const { data, loading, error, refresh } = useLoad(() => client.get(courseId, lessonId), `${courseId}:${lessonId}`, revision);
  const note = data || null;
  const current = useRef(note);
  current.current = note;

  const actions = useMemo(() => ({
    save: (html) => client.save(courseId, lessonId, html).then(refresh),
    linkDoc: (docUrl) => client.setDoc(courseId, lessonId, { docUrl }).then(refresh),
    unlinkDoc: () => client.setDoc(courseId, lessonId, { docUrl: "" }).then(refresh),
    // Signs the teacher in to Google, creates the doc in their Drive and
    // links it, as one the app manages (so sending can open its sharing).
    async createGoogleDoc(title) {
      const doc = await googleDocs.createDoc(title);
      await client.setDoc(courseId, lessonId, { docUrl: doc.url, managed: true });
      refresh();
    },
    // A Google Doc the app created is open to "anyone with the link can
    // read" while any class has the notes, and closed when none does.
    async send(classId, sent) {
      const n = current.current;
      if (!n) return;
      const elsewhere = n.sentTo.some((x) => x.classId !== classId);
      if (n.docUrl && n.docManaged && (sent || !elsewhere)) await googleDocs.setLinkSharing(n.docUrl, sent);
      await client.send(courseId, lessonId, classId, sent);
      refresh();
    },
  }), [client, courseId, lessonId, refresh]);

  return { note, loading, error, ...actions };
}

// Student: every note sent to them, newest first. `loading` is true until
// the list reflects the latest data — on first load and briefly after each
// change — so code that compares old and new lists waits for it.
export function useMyNotes() {
  const { client, revision } = useNotesSource();
  const { data, stale } = useLoad(() => client.listMine(), "mine", revision);
  const notes = useMemo(() => data || [], [data]);
  return { notes, loading: stale };
}
