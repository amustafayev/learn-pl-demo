import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpLearningClient, createMockLearningClient } from "./client.js";

// Seed: Rashad is in ITler — Morning (cls_it_morning) on IT English (it):
// lessons it1–it4 shared, it4 next, 3 of 6 taught. Zeynab bought Everyday
// English (every, 5 lessons) and finished ev1–ev3. Lala asked to join
// IELTS Speaking — Main and waits. IELTS Speaking (ielts) is for sale;
// Rashad hasn't bought it.
const ids = (list) => list.map((x) => x.id);

describe("learning — mock client", () => {
  it("my classes: an active one with its teacher and where it is on its course", async () => {
    const [cls] = await createMockLearningClient(mockDb().as("s_rashad")).myClasses();
    expect(cls).toMatchObject({ id: "cls_it_morning", name: "ITler — Morning", teacher: { name: "Maria Carey" }, membership: { status: "active" } });
    const entry = cls.courses.find((x) => x.status === "in-progress");
    expect(entry.course).toMatchObject({ id: "it", title: "IT English" });
    expect(entry.progress).toMatchObject({ taughtCount: 3, total: 6, next: { id: "it4", n: 4 } });
    expect(entry.releasedLessonIds).toEqual(["it1", "it2", "it3", "it4"]);
  });

  it("a class they only asked to join shows its name and teacher, never its courses", async () => {
    const classes = await createMockLearningClient(mockDb().as("s_lala")).myClasses();
    expect(classes.find((c) => c.id === "cls_ielts_main")).toMatchObject({ teacher: { name: "Maria Carey" }, membership: { status: "requested" }, courses: [] });
  });

  it("a class page: every lesson, shared ones open, the next one marked, finished ones too", async () => {
    const db = mockDb();
    const rashad = createMockLearningClient(db.as("s_rashad"));
    await rashad.completeLesson("it", "it2");
    const page = await rashad.myClassPage("cls_it_morning");
    const [course] = page.courses;
    expect(course).toMatchObject({ course: { id: "it" }, status: "in-progress", taughtCount: 3, total: 6, pct: 50 });
    expect(course.lessons.map((r) => `${r.lesson.id}:${r.open ? "open" : "locked"}${r.isNext ? ":next" : ""}${r.finished ? ":finished" : ""}`)).toEqual([
      "it1:open", "it2:open:finished", "it3:open", "it4:open:next", "it5:locked", "it6:locked",
    ]);
  });

  it("someone else's class has no page", async () => {
    expect(await createMockLearningClient(mockDb().as("s_rashad")).myClassPage("cls_ielts_main")).toBeNull();
  });

  it("my courses: what they bought, and what their classes take, each saying why", async () => {
    const zeynab = await createMockLearningClient(mockDb().as("s_zeynab")).myCourses();
    expect(zeynab.map((c) => [c.id, c.access, c.lessonCount, c.completedLessons, c.teacher.name])).toEqual([["every", "purchase", 5, 3, "Maria Carey"]]);
    const rashad = await createMockLearningClient(mockDb().as("s_rashad")).myCourses();
    expect(rashad.map((c) => [c.id, c.access])).toEqual([["it", "class"]]);
  });

  it("the lesson player: a shared lesson opens with its steps; one not shared is locked, without them", async () => {
    const rashad = createMockLearningClient(mockDb().as("s_rashad"));
    const open = await rashad.myLesson("it", "it4");
    expect(open).toMatchObject({ open: true, lesson: { id: "it4", n: 4 }, course: { id: "it" }, teacher: { name: "Maria Carey" }, finished: false });
    expect(open.lesson.blocks.length).toBeGreaterThan(0);

    const locked = await rashad.myLesson("it", "it5");
    expect(locked).toMatchObject({ open: false, lesson: { id: "it5", n: 5 } });
    expect(locked.lesson.blocks).toBeUndefined();
    expect((await rashad.myLesson("ielts", "ie1")).open).toBe(false); // a course he hasn't bought
    expect(await rashad.myLesson("it", "no-such-lesson")).toBeNull();
  });

  it("a bought course opens every lesson", async () => {
    const zeynab = createMockLearningClient(mockDb().as("s_zeynab"));
    for (const lessonId of ["ev1", "ev5"]) expect((await zeynab.myLesson("every", lessonId)).open).toBe(true);
  });

  it("finishing a lesson is recorded once, however often they finish it", async () => {
    const db = mockDb();
    const rashad = createMockLearningClient(db.as("s_rashad"));
    await rashad.completeLesson("it", "it4");
    await rashad.completeLesson("it", "it4");
    expect((await rashad.myLesson("it", "it4")).finished).toBe(true);
    expect(db.raw().lessonCompletions.filter((c) => c.studentId === "s_rashad" && c.lessonId === "it4")).toHaveLength(1);
  });

  it("a lesson that isn't open can't be finished", async () => {
    const db = mockDb();
    await createMockLearningClient(db.as("s_rashad")).completeLesson("it", "it5");
    expect(db.raw().lessonCompletions.some((c) => c.studentId === "s_rashad" && c.lessonId === "it5")).toBe(false);
  });

  it("only the signed-in student's own classes appear", async () => {
    const aysel = await createMockLearningClient(mockDb().as("s_aysel")).myClasses();
    expect(ids(aysel)).not.toContain("cls_it_morning");
  });
});

describe("learning — HTTP client (docs/openapi.yaml: Student app)", () => {
  it("calls the student endpoints", async () => {
    const { api, calls } = recordingApi({ "GET /me/courses/it/lessons/it4": { id: "it4", n: 4, blocks: [], course: { id: "it" }, teacher: { id: "t1", name: "T" }, finished: true } });
    const client = createHttpLearningClient(api);
    await client.myClasses();
    await client.myClassPage("c1");
    await client.myCourses();
    expect(await client.myLesson("it", "it4")).toEqual({ open: true, lesson: { id: "it4", n: 4, blocks: [] }, course: { id: "it" }, teacher: { id: "t1", name: "T" }, finished: true });
    await client.completeLesson("it", "it4");
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /me/classes",
      "GET /me/classes/c1",
      "GET /me/courses",
      "GET /me/courses/it/lessons/it4",
      "POST /me/courses/it/lessons/it4/completion",
    ]);
  });

  it("a locked lesson (403 lesson_not_open) is closed; a missing one or class page is null; other errors pass on", async () => {
    const { api } = recordingApi({
      "GET /me/courses/it/lessons/it5": new ApiError("lesson_not_open", "Not open"),
      "GET /me/courses/it/lessons/gone": new ApiError("404", "Not found"),
      "GET /me/classes/gone": new ApiError("404", "Not found"),
      "GET /me/courses": new ApiError("500", "Server error"),
    });
    const client = createHttpLearningClient(api);
    expect(await client.myLesson("it", "it5")).toEqual({ open: false, lesson: null, course: null, teacher: null, finished: false });
    expect(await client.myLesson("it", "gone")).toBeNull();
    expect(await client.myClassPage("gone")).toBeNull();
    await expect(client.myCourses()).rejects.toMatchObject({ code: "500" });
  });
});
