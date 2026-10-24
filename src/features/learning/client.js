import { nullIfMissing } from "../../db/apiClient.js";
import { canOpenLesson, classCourseProgress, lessonBlocks } from "../../db/mockDb.jsx";

/* Learning API — the student's own side: their classes and where each is,
   a class page with every lesson and whether it's open to them, the
   courses they can reach, the lesson player (the access rule), and
   finishing a lesson. Joining a class is the joining feature's; buying a
   course is sales'; notes and work are their own features'. The UI only
   talks to a client below, through ./hooks.js — never to the mock's state.

   Contract (every method resolves; failures reject with an ApiError):
     myClasses()                    -> MyClass[]   every class they have a membership in (any
                                       status) or a pending invite to; each with `teacher`,
                                       `membership` (null for an invite only) and `courses:
                                       [ClassCourse & { course, progress }]` (an active
                                       class's; the others list none)
     myClassPage(classId)           -> MyClassPage | null
                                       { class, courses: [{ course, status, pct, taughtCount, total,
                                         next, lessons: [{ lesson, open, taughtAt, isNext, finished }] }] }
     myCourses()                    -> MyCourse[]  bought or taken in a class, each with `access`
                                       (class | purchase | both), `teacher`, `lessons` ({ id, n,
                                       title, finished }) and `completedLessons`
     myLesson(courseId, lessonId)   -> { open, lesson, course, teacher, finished } | null
                                       null: no such lesson. `lesson` has its `blocks` only when
                                       open; locked, it's { id, n, title } from the mock and null
                                       over HTTP (a 403 says nothing about the lesson)
     completeLesson(courseId, lessonId) -> void   only a lesson they can open; again is a no-op
   progress = { lessons, taughtAt, taughtCount, total, pct, allTaught, next } (where the class
   is on the course; the entry's own `releasedLessonIds` are the lessons open to it);
   lessons are { id, n, title }, courses { id, title, level, hue, teacherId }
   (docs/openapi.yaml: Student app).

   Two implementations of that contract:
     createMockLearningClient — on the in-browser mock db; what the app uses today
     createHttpLearningClient — the REST calls in docs/openapi.yaml, on
                                db/apiClient.js; not wired in yet */

const lessonRef = (l) => (l ? { id: l.id, n: l.n, title: l.title } : null);
const courseRef = (c) => (c ? { id: c.id, title: c.title, level: c.level, hue: c.hue, teacherId: c.teacherId } : null);

// `source` is db/useMockSource.js's: getState, dispatch, waitFor. getState is
// the signed-in student's slice (studentView).
export function createMockLearningClient({ getState, dispatch }) {
  const teacherOf = (s, id) => {
    const t = (s.teachers || []).find((x) => x.id === id);
    return t ? { id: t.id, name: t.name } : null;
  };
  const finished = (s, courseId, lessonId) => (s.lessonCompletions || []).some((c) => c.courseId === courseId && c.lessonId === lessonId);
  const courseOf = (s, id) => s.courses.find((c) => c.id === id) || null;

  function progressOf(s, cls, courseId) {
    const p = classCourseProgress(s, cls, courseId);
    if (!p) return null;
    return {
      lessons: p.lessons.map(lessonRef), taughtAt: p.taughtAt, taughtCount: p.taughtCount, total: p.total, pct: p.pct,
      allTaught: p.allTaught, next: lessonRef(p.next),
    };
  }
  function myClass(s, cls) {
    return {
      ...cls,
      teacher: teacherOf(s, cls.teacherId),
      membership: (s.memberships || []).find((m) => m.classId === cls.id) || null,
      courses: cls.courses.map((entry) => ({ ...entry, course: courseRef(courseOf(s, entry.courseId)), progress: progressOf(s, cls, entry.courseId) })),
    };
  }

  return {
    async myClasses() {
      const s = getState();
      return s.classes.map((c) => myClass(s, c));
    },
    async myClassPage(classId) {
      const s = getState();
      const cls = s.classes.find((c) => c.id === classId);
      if (!cls) return null;
      const page = myClass(s, cls);
      return {
        class: page,
        courses: page.courses.filter((e) => e.course && e.progress).map((e) => ({
          course: e.course, status: e.status, pct: e.progress.pct, taughtCount: e.progress.taughtCount, total: e.progress.total, next: e.progress.next,
          lessons: (s.lessons[e.courseId] || []).map((l) => ({
            lesson: lessonRef(l),
            open: canOpenLesson(s, s.me.id, e.courseId, l.id),
            taughtAt: e.progress.taughtAt[l.id] || null,
            isNext: e.progress.next?.id === l.id,
            finished: finished(s, e.courseId, l.id),
          })),
        })),
      };
    },
    async myCourses() {
      const s = getState();
      const paid = new Set((s.purchases || []).filter((p) => p.status === "paid").map((p) => p.courseId));
      const active = new Set((s.memberships || []).filter((m) => m.status === "active").map((m) => m.classId));
      const inClass = new Set(s.classes.filter((c) => active.has(c.id)).flatMap((c) => c.courses.map((x) => x.courseId)));
      return s.courses.filter((c) => paid.has(c.id) || inClass.has(c.id)).map((c) => {
        const lessons = (s.lessons[c.id] || []).map((l) => ({ ...lessonRef(l), finished: finished(s, c.id, l.id) }));
        const access = paid.has(c.id) && inClass.has(c.id) ? "both" : paid.has(c.id) ? "purchase" : "class";
        return { ...c, teacher: teacherOf(s, c.teacherId), access, lessons, lessonCount: lessons.length, completedLessons: lessons.filter((l) => l.finished).length };
      });
    },
    async myLesson(courseId, lessonId) {
      const s = getState();
      const lesson = (s.lessons[courseId] || []).find((l) => l.id === lessonId);
      if (!lesson) return null;
      const course = courseRef(courseOf(s, courseId));
      const teacher = teacherOf(s, course?.teacherId);
      if (!canOpenLesson(s, s.me.id, courseId, lessonId)) return { open: false, lesson: lessonRef(lesson), course, teacher, finished: false };
      return { open: true, lesson: { ...lessonRef(lesson), blocks: lessonBlocks(lesson) }, course, teacher, finished: finished(s, courseId, lessonId) };
    },
    async completeLesson(courseId, lessonId) { dispatch({ type: "COMPLETE_LESSON", studentId: getState().me.id, courseId, lessonId }); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpLearningClient(api) {
  return {
    myClasses: () => api.get("/me/classes"),
    myClassPage: (classId) => api.get(`/me/classes/${classId}`).catch(nullIfMissing),
    myCourses: () => api.get("/me/courses"),
    myLesson: (courseId, lessonId) => api.get(`/me/courses/${courseId}/lessons/${lessonId}`).then(
      ({ course, teacher, finished, ...lesson }) => ({ open: true, lesson, course, teacher, finished: !!finished }),
      (err) => (err.code === "lesson_not_open"
        ? { open: false, lesson: null, course: null, teacher: null, finished: false }
        : nullIfMissing(err)),
    ),
    completeLesson: (courseId, lessonId) => api.post(`/me/courses/${courseId}/lessons/${lessonId}/completion`).then(() => {}),
  };
}
