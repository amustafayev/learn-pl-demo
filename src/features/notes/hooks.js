import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useStore } from "../../store.jsx";
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
  const key = `${courseId}:${lessonId}`;
  const [loaded, setLoaded] = useState({ key: null, note: null, error: null });
  const [version, refresh] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    let live = true;
    client.get(courseId, lessonId)
      .then((note) => { if (live) setLoaded({ key, note, error: null }); })
      .catch((error) => { if (live) setLoaded((prev) => ({ key, note: prev.key === key ? prev.note : null, error })); });
    return () => { live = false; };
  }, [client, courseId, lessonId, key, revision, version]);

  const note = loaded.key === key ? loaded.note : null;
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
  }), [client, courseId, lessonId]);

  return { note, loading: loaded.key !== key, error: loaded.key === key ? loaded.error : null, ...actions };
}

// Student: every note sent to them, newest first. `loading` is true until
// the list reflects the latest data — on first load and briefly after each
// change — so code that compares old and new lists waits for it.
export function useMyNotes() {
  const { client, revision } = useNotesSource();
  const [loaded, setLoaded] = useState({ revision: null, notes: null });
  useEffect(() => {
    let live = true;
    client.listMine()
      .then((notes) => { if (live) setLoaded({ revision, notes }); })
      .catch(() => { if (live) setLoaded((prev) => ({ revision, notes: prev.notes || [] })); });
    return () => { live = false; };
  }, [client, revision]);
  const notes = useMemo(() => loaded.notes || [], [loaded.notes]);
  return { notes, loading: loaded.revision !== revision };
}
