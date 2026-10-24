import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockLearningClient } from "./client.js";

/* The student app's door to their own learning: the sidebar's and Home's
   classes, a class page, the courses they can reach, the lesson player. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpLearningClient(api) here.
function useLearningSource() {
  const { source, revision, synced } = useMockSource((s) => [s.classes, s.memberships, s.courses, s.lessons, s.taughtLessons, s.lessonCompletions, s.purchases, s.invitations, s.teachers]);
  const client = useMemo(() => createMockLearningClient(source), [source]);
  return { client, revision, synced };
}

// Every class of theirs (any membership, or a pending invite). `active` are
// the ones they're in now, `waiting` the ones they asked to join. `stale`
// is true until the list reflects the latest data (for code comparing old
// and new lists).
export function useMyClasses() {
  const { client, revision, synced } = useLearningSource();
  const { data, loading, stale } = useLoad(() => client.myClasses(), "classes", revision);
  return useMemo(() => {
    const classes = data || [];
    const withStatus = (status) => classes.filter((c) => c.membership?.status === status);
    return { classes, active: withStatus("active"), waiting: withStatus("requested"), loading, stale: stale || !synced };
  }, [data, loading, stale, synced]);
}

// One class page (null once it turns out not to be theirs).
export function useMyClassPage(classId) {
  const { client, revision } = useLearningSource();
  const { data, loading } = useLoad(() => client.myClassPage(classId), classId || "none", revision);
  return { page: data || null, loading };
}

// The courses they can reach — bought, or taken in a class.
export function useMyCourses() {
  const { client, revision } = useLearningSource();
  const { data, loading } = useLoad(() => client.myCourses(), "courses", revision);
  const courses = useMemo(() => data || [], [data]);
  return { courses, loading };
}

// One lesson through the access rule, and finishing it.
export function useMyLesson(courseId, lessonId) {
  const { client, revision } = useLearningSource();
  const { data, loading } = useLoad(
    () => (courseId && lessonId ? client.myLesson(courseId, lessonId) : Promise.resolve(null)),
    `${courseId || "none"}:${lessonId || "none"}`, revision);
  const complete = useMemo(() => () => client.completeLesson(courseId, lessonId), [client, courseId, lessonId]);
  return { result: data || null, loading, complete };
}
