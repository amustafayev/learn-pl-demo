import { useEffect, useMemo } from "react";
import { copyWithOwnH5P } from "../../store.jsx";
import { useMockSource } from "../../db/useMockSource.js";
import { useToast } from "../../toasts.jsx";
import { useLoad } from "../../useLoad.js";
import { createMockHomeworkClient } from "./client.js";

/* The UI's one door to class homework. Everything homework-shaped (the
   Classwork list, the composer, an assignment's detail page, the lesson
   row's Assign link) goes through here — none of it touches reducer
   actions or `state.homework`, and none of it lives in the Classes or
   Courses views. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpHomeworkClient(api) here.
function useHomeworkSource() {
  const { source, revision } = useMockSource((s) => [s.homework, s.assignments, s.memberships]);
  const client = useMemo(() => createMockHomeworkClient(source), [source]);
  return { client, revision };
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
// numbers.
export function useClassHomework(classId) {
  const { client, revision } = useHomeworkSource();
  useReleaseScheduled(client);
  const { data, loading } = useLoad(() => client.list(classId), classId || "none", revision);
  const posts = useMemo(() => data || [], [data]);
  return { posts, loading };
}

// One post (null once it turns out missing).
export function useHomeworkPost(classId, id) {
  const { client, revision } = useHomeworkSource();
  useReleaseScheduled(client);
  const { data, loading } = useLoad(() => (id ? client.get(classId, id) : Promise.resolve(null)), `${classId}:${id || "none"}`, revision);
  return { post: data || null, loading };
}

// The writes. Publishing snapshots H5P content per attachment first (as saving
// to the Component Library does), then hands the post to the client.
export function useHomeworkActions() {
  const { client } = useHomeworkSource();
  const toast = useToast();
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
