import { nullIfMissing } from "../../db/apiClient.js";
import { lessonBlocks, uid } from "../../db/mockDb.jsx";

/* Courses API — the teacher's authored content: courses, their lessons in
   order, each lesson's blocks (steps) and each block's components; and a
   course's sale settings. The UI only talks to a client below, through
   ./hooks.js — never to `state.courses`, `state.lessons` or reducer
   actions.

   Contract (every method resolves; failures reject with an ApiError):
     listCourses()                          -> Course[]   each with lessonCount
     getCourse(courseId)                    -> Course | null
     createCourse({ title, level, hue, templateId }) -> Course
     updateSale(courseId, sale)             -> void   merged field by field
     listLessons(courseId)                  -> Lesson[]   in order, each with its blocks
     getLesson(courseId, lessonId)          -> Lesson | null
     createLesson(courseId, { title })      -> Lesson
     addBlock(courseId, lessonId, { type, title, meta? })   -> Block   at the end
     updateBlock(courseId, lessonId, blockId, patch)        -> void    { title } or { content }
     removeBlock(courseId, lessonId, blockId)               -> void
     moveBlock(courseId, lessonId, blockId, "up" | "down")  -> void    no-op past either end
   Lesson = { id, courseId, n, title, blocks: Block[] }; a lesson never
   built still has blocks, from its block types, with stable ids
   (docs/openapi.yaml: Courses, Lessons & blocks).

   Two implementations of that contract:
     createMockCoursesClient — on the in-browser mock db; what the app uses today
     createHttpCoursesClient — the REST calls in docs/openapi.yaml, on
                               db/apiClient.js; not wired in yet */

// `source` is db/useMockSource.js's: getState, dispatch, waitFor.
export function createMockCoursesClient({ getState, dispatch, waitFor }) {
  const withCount = (state, course) => ({ ...course, lessonCount: (state.lessons[course.id] || []).length });
  const asLesson = (courseId, lesson) => ({ ...lesson, courseId, blocks: lessonBlocks(lesson) });
  const lessonIn = (state, courseId, lessonId) => (state.lessons[courseId] || []).find((l) => l.id === lessonId) || null;
  return {
    async listCourses() {
      const state = getState();
      return state.courses.map((c) => withCount(state, c));
    },
    async getCourse(courseId) {
      const state = getState();
      const course = state.courses.find((c) => c.id === courseId);
      return course ? withCount(state, course) : null;
    },
    async createCourse({ title, level, hue, templateId = "general" }) {
      const before = new Set(getState().courses.map((c) => c.id));
      dispatch({ type: "ADD_COURSE", title, level, hue, templateId });
      const isNew = (c) => !before.has(c.id);
      const state = await waitFor((s) => s.courses.some(isNew));
      return withCount(state, state.courses.find(isNew));
    },
    async updateSale(courseId, sale) { dispatch({ type: "UPDATE_COURSE_SALE", courseId, sale }); },
    async listLessons(courseId) { return (getState().lessons[courseId] || []).map((l) => asLesson(courseId, l)); },
    async getLesson(courseId, lessonId) {
      const lesson = lessonIn(getState(), courseId, lessonId);
      return lesson ? asLesson(courseId, lesson) : null;
    },
    async createLesson(courseId, { title }) {
      const id = uid("l");
      dispatch({ type: "ADD_LESSON", courseId, title, id });
      const state = await waitFor((s) => lessonIn(s, courseId, id));
      return asLesson(courseId, lessonIn(state, courseId, id));
    },
    async addBlock(courseId, lessonId, { type, title, meta = "—" }) {
      const block = { id: uid("p"), type, title, meta };
      dispatch({ type: "ADD_PART", courseId, lessonId, part: block });
      return block;
    },
    async updateBlock(courseId, lessonId, blockId, patch) { dispatch({ type: "UPDATE_PART", courseId, lessonId, partId: blockId, patch }); },
    async removeBlock(courseId, lessonId, blockId) { dispatch({ type: "REMOVE_PART", courseId, lessonId, partId: blockId }); },
    async moveBlock(courseId, lessonId, blockId, direction) {
      dispatch({ type: "MOVE_PART", courseId, lessonId, partId: blockId, dir: direction === "up" ? -1 : 1 });
    },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpCoursesClient(api) {
  const lessons = (courseId) => `/courses/${courseId}/lessons`;
  const blocks = (courseId, lessonId) => `${lessons(courseId)}/${lessonId}/blocks`;
  const done = () => {};
  return {
    listCourses: () => api.get("/courses"),
    getCourse: (courseId) => api.get(`/courses/${courseId}`).catch(nullIfMissing),
    createCourse: (body) => api.post("/courses", body),
    updateSale: (courseId, sale) => api.patch(`/courses/${courseId}`, { sale }).then(done),
    listLessons: (courseId) => api.get(`${lessons(courseId)}?include=blocks`),
    getLesson: (courseId, lessonId) => api.get(`${lessons(courseId)}/${lessonId}`).catch(nullIfMissing),
    createLesson: (courseId, body) => api.post(lessons(courseId), body),
    addBlock: (courseId, lessonId, body) => api.post(blocks(courseId, lessonId), body),
    updateBlock: (courseId, lessonId, blockId, patch) => api.patch(`${blocks(courseId, lessonId)}/${blockId}`, patch).then(done),
    removeBlock: (courseId, lessonId, blockId) => api.delete(`${blocks(courseId, lessonId)}/${blockId}`).then(done),
    moveBlock: (courseId, lessonId, blockId, direction) => api.post(`${blocks(courseId, lessonId)}/${blockId}/move`, { direction }).then(done),
  };
}
