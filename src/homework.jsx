import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, copyWithOwnH5P } from "./store.jsx";
import { createMockHomeworkClient } from "./db/homeworkClient.js";

/* The UI's one door to class homework. Everything homework-shaped (the
   Classwork list, the composer, an assignment's detail page, the lesson row's
   Assign link) goes through here and the client in db/homeworkClient.js —
   none of it touches reducer actions or `state.assignments` directly, and
   none of it lives in the Classes or Courses views. Swap the client below for
   the HTTP one when the backend exists. */

function useHomeworkClient() {
  const { state, dispatch } = useStore();
  const latest = useRef(state);
  latest.current = state;
  return useMemo(() => createMockHomeworkClient({ getState: () => latest.current, dispatch }), [dispatch]);
}

// Scheduled posts go out when their time comes. The mock has no server clock,
// so a page that shows homework nudges it (on open, then every 30 seconds).
function useReleaseScheduled(client) {
  useEffect(() => {
    client.releaseScheduled?.();
    const t = setInterval(() => client.releaseScheduled?.(), 30_000);
    return () => clearInterval(t);
  }, [client]);
}

// A class's posts, newest first, each with its Turned in / Assigned / Missing
// numbers. `loading` is true until the first answer, so the pages already cope
// with a real, asynchronous backend.
export function useClassHomework(classId) {
  const { state } = useStore();
  const client = useHomeworkClient();
  const [posts, setPosts] = useState(null);
  useReleaseScheduled(client);
  // The mock is a function of the db, so re-ask whenever it changes; a real
  // client would re-fetch after each mutation below instead.
  useEffect(() => {
    let live = true;
    client.list(classId).then((p) => { if (live) setPosts(p); });
    return () => { live = false; };
  }, [client, classId, state.homework, state.assignments]);
  return { posts: posts || [], loading: posts === null };
}

export function useHomeworkPost(classId, id) {
  const { state } = useStore();
  const client = useHomeworkClient();
  const [post, setPost] = useState(undefined); // undefined = loading, null = not found
  useReleaseScheduled(client);
  useEffect(() => {
    let live = true;
    if (!id) { setPost(null); return undefined; }
    client.get(classId, id).then((p) => { if (live) setPost(p); });
    return () => { live = false; };
  }, [client, classId, id, state.homework, state.assignments]);
  return { post: post || null, loading: post === undefined };
}

// The writes. Publishing snapshots H5P content per attachment first (as saving
// to the Component Library does), then hands the post to the client.
export function useHomeworkActions() {
  const { toast } = useStore();
  const client = useHomeworkClient();
  return useMemo(() => ({
    async saveDraft(classId, post) {
      await client.saveDraft(classId, post);
      toast("Draft saved");
      return true;
    },
    async publish(classId, post, { scheduledAt = null } = {}) {
      const attachments = [];
      for (const att of post.attachments || []) {
        const content = att.content ? await copyWithOwnH5P(toast, att.content) : null;
        if (att.content && !content) return false;
        attachments.push({ ...att, content });
      }
      await client.publish(classId, { ...post, attachments }, { scheduledAt });
      toast(scheduledAt && new Date(scheduledAt) > new Date() ? `“${post.title}” scheduled` : `“${post.title}” assigned`);
      return true;
    },
    async update(classId, id, patch) { await client.update(classId, id, patch); toast("Assignment updated"); },
    async remove(classId, post) { await client.remove(classId, post.id); toast(`Deleted “${post.title}”`); },
  }), [client, toast]);
}
