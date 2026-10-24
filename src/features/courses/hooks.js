import { useEffect, useMemo, useState } from "react";
import { discardH5PContent } from "../../store.jsx";
import { useMockSource } from "../../db/useMockSource.js";
import { useToast } from "../../toasts.jsx";
import { useLoad } from "../../useLoad.js";
import { createMockCoursesClient } from "./client.js";

/* The UI's one door to courses and lessons: the Courses list, a course's
   tree and sale settings, a lesson's steps, Block Studio, and every screen
   that names a course or lesson (classes, homework, students). */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpCoursesClient(api) here.
function useCoursesSource() {
  const { source, revision } = useMockSource((s) => [s.courses, s.lessons]);
  const client = useMemo(() => createMockCoursesClient(source), [source]);
  return { client, revision };
}

// Every course of the teacher's, and creating one.
export function useCourses() {
  const { client, revision } = useCoursesSource();
  const { data, loading, refresh } = useLoad(() => client.listCourses(), "courses", revision);
  const courses = useMemo(() => data || [], [data]);
  const createCourse = useMemo(() => async (input) => {
    const course = await client.createCourse(input);
    refresh();
    return course;
  }, [client, refresh]);
  return { courses, loading, createCourse };
}

// One course with all its lessons (each with its blocks), adding a lesson,
// and its sale settings.
export function useCourse(courseId) {
  const { client, revision } = useCoursesSource();
  const course = useLoad(() => (courseId ? client.getCourse(courseId) : Promise.resolve(null)), courseId || "none", revision);
  const lessons = useLoad(() => (courseId ? client.listLessons(courseId) : Promise.resolve([])), courseId || "none", revision);
  const { refresh: refreshCourse } = course;
  const { refresh: refreshLessons } = lessons;
  const actions = useMemo(() => ({
    async createLesson(title) {
      const lesson = await client.createLesson(courseId, { title });
      refreshCourse();
      refreshLessons();
      return lesson;
    },
    updateSale: (sale) => client.updateSale(courseId, sale).then(refreshCourse),
  }), [client, courseId, refreshCourse, refreshLessons]);
  const lessonList = useMemo(() => lessons.data || [], [lessons.data]);
  return { course: course.data || null, lessons: lessonList, loading: course.loading || lessons.loading, ...actions };
}

// Does `block` already show every field of `patch`?
const shows = (block, patch) => Object.entries(patch).every(([k, v]) => JSON.stringify(block[k]) === JSON.stringify(v));

// One lesson (with its course) and editing its blocks. An edit shows at
// once — before the data comes back — so an input typed into never jumps
// back to its old text; the loaded lesson takes over once it shows the edit.
export function useLesson(courseId, lessonId) {
  const { client, revision } = useCoursesSource();
  const toast = useToast();
  const key = `${courseId}:${lessonId}`;
  const course = useLoad(() => client.getCourse(courseId), courseId || "none", revision);
  const lesson = useLoad(() => client.getLesson(courseId, lessonId), key, revision);
  const { refresh } = lesson;

  const [edits, setEdits] = useState({ key, blocks: {} }); // blockId -> fields not yet shown by the loaded lesson
  useEffect(() => {
    if (!lesson.data) return;
    setEdits((e) => {
      if (e.key !== key) return { key, blocks: {} };
      const left = Object.fromEntries(Object.entries(e.blocks).filter(([id, patch]) => {
        const block = lesson.data.blocks.find((b) => b.id === id);
        return block && !shows(block, patch);
      }));
      return Object.keys(left).length === Object.keys(e.blocks).length ? e : { key, blocks: left };
    });
  }, [lesson.data, key]);

  const shown = useMemo(() => {
    const pending = edits.key === key ? edits.blocks : {};
    if (!lesson.data || !Object.keys(pending).length) return lesson.data || null;
    return { ...lesson.data, blocks: lesson.data.blocks.map((b) => (pending[b.id] ? { ...b, ...pending[b.id] } : b)) };
  }, [lesson.data, edits, key]);

  const actions = useMemo(() => ({
    addBlock: (input) => client.addBlock(courseId, lessonId, input).then((block) => { refresh(); return block; }),
    updateBlock(blockId, patch) {
      setEdits((e) => {
        const blocks = e.key === key ? e.blocks : {};
        return { key, blocks: { ...blocks, [blockId]: { ...blocks[blockId], ...patch } } };
      });
      return client.updateBlock(courseId, lessonId, blockId, patch).then(refresh);
    },
    // Removing a block also deletes the H5P content only it referenced.
    removeBlock(block) {
      discardH5PContent(toast, block);
      return client.removeBlock(courseId, lessonId, block.id).then(refresh);
    },
    moveBlock: (blockId, direction) => client.moveBlock(courseId, lessonId, blockId, direction).then(refresh),
  }), [client, courseId, lessonId, key, refresh, toast]);

  return { course: course.data || null, lesson: shown, loading: course.loading || lesson.loading, ...actions };
}
