import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockClassesClient } from "./client.js";

/* The UI's one door to classes: the Classes page and a class's page, a
   course or lesson opened from a class (its lesson bar, Share, Finish
   lesson), the calendar, and the class a homework post belongs to. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpClassesClient(api) here, and have a write
// bump this feature's revision so every hook asks again — the mock's db
// change does that today.
function useClassesSource() {
  const { source, revision } = useMockSource((s) => [s.classes, s.taughtLessons, s.lessons]);
  const client = useMemo(() => createMockClassesClient(source), [source]);
  return { client, revision };
}

// Every class of the teacher's, each course with its progress; and
// creating one.
export function useClasses() {
  const { client, revision } = useClassesSource();
  const { data, loading, refresh } = useLoad(() => client.listClasses(), "classes", revision);
  const classes = useMemo(() => data || [], [data]);
  const createClass = useMemo(() => async (input) => {
    const cls = await client.createClass(input);
    refresh();
    return cls;
  }, [client, refresh]);
  return { classes, loading, createClass };
}

// What can be done to one class. Loads nothing — for components that are
// handed the class and only act on it (the lesson bar, Share, Finish).
export function useClassActions(classId) {
  const { client } = useClassesSource();
  return useMemo(() => ({
    updateSchedule: (schedule) => client.updateSchedule(classId, schedule),
    setJoining: (joinOpen) => client.setJoining(classId, joinOpen),
    newJoinLink: () => client.newJoinLink(classId),
    assignCourse: (courseId) => client.assignCourse(classId, courseId),
    setCourseStatus: (courseId, status) => client.setCourseStatus(classId, courseId, status),
    setNextLesson: (courseId, lessonId) => client.setNextLesson(classId, courseId, lessonId),
    markTaught: (courseId, lessonId) => client.markTaught(classId, courseId, lessonId),
    setShared: (courseId, lessonId, shared) => client.setShared(classId, courseId, lessonId, shared),
  }), [client, classId]);
}

// One class (null while there's no classId, or once it turns out missing)
// and what can be done to it.
export function useClass(classId) {
  const { client, revision } = useClassesSource();
  const { data, loading } = useLoad(() => (classId ? client.getClass(classId) : Promise.resolve(null)), classId || "none", revision);
  const actions = useClassActions(classId);
  return { cls: data || null, loading, ...actions };
}

// Marking a student present or absent for a lesson a class was taught.
export function useAttendance() {
  const { client } = useClassesSource();
  return useMemo(() => ({ setAttendance: (taughtLessonId, studentId, status) => client.setAttendance(taughtLessonId, studentId, status) }), [client]);
}
