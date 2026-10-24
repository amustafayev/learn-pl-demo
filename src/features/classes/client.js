import { nullIfMissing } from "../../db/apiClient.js";
import { classCourseProgress } from "../../db/mockDb.jsx";

/* Classes API — the teacher's classes: their weekly schedule, their class
   link, the course each takes and where it is on it (next up, lessons
   taught, lessons shared with its students), and attendance. Who is in a
   class is the students feature's. The UI only talks to a client below,
   through ./hooks.js — never to `state.classes`, `state.taughtLessons` or
   reducer actions.

   Contract (every method resolves; failures reject with an ApiError):
     listClasses()                                -> Class[]
     getClass(classId)                            -> Class | null
     createClass({ name, schedule, courseId })    -> Class
     updateSchedule(classId, schedule)            -> void
     setJoining(classId, joinOpen)                -> void   the class link on or off
     newJoinLink(classId)                         -> void   the old link stops working
     assignCourse(classId, courseId)              -> void   one course per class, for now
     setCourseStatus(classId, courseId, status)   -> void   in-progress | paused | done
     setNextLesson(classId, courseId, lessonId)   -> void   the teacher's correction of "next up"
     markTaught(classId, courseId, lessonId)      -> void   logs it, shares it, moves "next up" on
     setShared(classId, courseId, lessonId, shared) -> void
     setAttendance(taughtLessonId, studentId, status) -> void   present | absent
   Class = { id, name, schedule, joinToken, joinOpen,
             courses: [ClassCourse & { progress: ClassCourseProgress }] }
   (docs/openapi.yaml: Classes; ClassCourseProgress, with lessons as
   { id, n, title }).

   Two implementations of that contract:
     createMockClassesClient — on the in-browser mock db; what the app uses today
     createHttpClassesClient — the REST calls in docs/openapi.yaml, on
                               db/apiClient.js; not wired in yet */

const summary = (lesson) => (lesson ? { id: lesson.id, n: lesson.n, title: lesson.title } : null);

// One class's progress on one course, in the API's JSON shape.
function progressOf(state, cls, courseId) {
  const p = classCourseProgress(state, cls, courseId);
  if (!p) return null;
  return {
    entry: p.entry, lessons: p.lessons.map(summary), taughtAt: p.taughtAt, taughtCount: p.taughtCount,
    total: p.total, pct: p.pct, allTaught: p.allTaught, next: summary(p.next),
    last: p.last ? { lesson: summary(p.last.lesson), taughtAt: p.last.taughtAt } : null,
  };
}
const withProgress = (state, cls) => ({ ...cls, courses: cls.courses.map((entry) => ({ ...entry, progress: progressOf(state, cls, entry.courseId) })) });

// `source` is db/useMockSource.js's: getState, dispatch, waitFor.
export function createMockClassesClient({ getState, dispatch, waitFor }) {
  return {
    async listClasses() {
      const state = getState();
      return state.classes.map((c) => withProgress(state, c));
    },
    async getClass(classId) {
      const state = getState();
      const cls = state.classes.find((c) => c.id === classId);
      return cls ? withProgress(state, cls) : null;
    },
    async createClass({ name, schedule = [], courseId = null }) {
      const before = new Set(getState().classes.map((c) => c.id));
      dispatch({ type: "ADD_CLASS", name, schedule, courseId });
      const isNew = (c) => !before.has(c.id);
      const state = await waitFor((s) => s.classes.some(isNew));
      return withProgress(state, state.classes.find(isNew));
    },
    async updateSchedule(classId, schedule) { dispatch({ type: "UPDATE_CLASS_SCHEDULE", classId, schedule }); },
    async setJoining(classId, joinOpen) { dispatch({ type: "SET_CLASS_JOINING", classId, joinOpen }); },
    async newJoinLink(classId) { dispatch({ type: "REGENERATE_JOIN_TOKEN", classId }); },
    async assignCourse(classId, courseId) { dispatch({ type: "ASSIGN_CLASS_COURSE", classId, courseId }); },
    async setCourseStatus(classId, courseId, status) { dispatch({ type: "SET_CLASS_COURSE_STATUS", classId, courseId, status }); },
    async setNextLesson(classId, courseId, lessonId) { dispatch({ type: "SET_CLASS_CURRENT_LESSON", classId, courseId, lessonId }); },
    // The server stamps the time; the mock stands in for it.
    async markTaught(classId, courseId, lessonId) { dispatch({ type: "MARK_LESSON_TAUGHT", classId, courseId, lessonId, taughtAt: new Date().toISOString() }); },
    async setShared(classId, courseId, lessonId, shared) { dispatch({ type: "SET_LESSON_RELEASED", classId, courseId, lessonId, released: shared }); },
    async setAttendance(taughtLessonId, studentId, status) { dispatch({ type: "SET_ATTENDANCE", taughtLessonId, studentId, status }); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpClassesClient(api) {
  const cls = (classId) => `/classes/${classId}`;
  const course = (classId, courseId) => `${cls(classId)}/courses/${courseId}`;
  const done = () => {};
  return {
    listClasses: () => api.get("/classes?include=progress"),
    getClass: (classId) => api.get(`${cls(classId)}?include=progress`).catch(nullIfMissing),
    createClass: (body) => api.post("/classes", body),
    updateSchedule: (classId, schedule) => api.put(`${cls(classId)}/schedule`, { schedule }).then(done),
    setJoining: (classId, joinOpen) => api.patch(cls(classId), { joinOpen }).then(done),
    newJoinLink: (classId) => api.post(`${cls(classId)}/join-token`).then(done),
    assignCourse: (classId, courseId) => api.post(`${cls(classId)}/courses`, { courseId }).then(done),
    setCourseStatus: (classId, courseId, status) => api.patch(course(classId, courseId), { status }).then(done),
    setNextLesson: (classId, courseId, lessonId) => api.patch(course(classId, courseId), { currentLessonId: lessonId }).then(done),
    markTaught: (classId, courseId, lessonId) => api.post(`${course(classId, courseId)}/taught-lessons`, { lessonId }).then(done),
    setShared: (classId, courseId, lessonId, shared) => api.put(`${course(classId, courseId)}/released/${lessonId}`, { released: shared }).then(done),
    setAttendance: (taughtLessonId, studentId, status) => api.put(`/taught-lessons/${taughtLessonId}/attendance/${studentId}`, { status }).then(done),
  };
}
