import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpClassesClient, createMockClassesClient } from "./client.js";
import { activeCourseOf, courseAvgProgress, progressFor } from "./progress.js";

// Seed: ITler — Morning (cls_it_morning) takes IT English: lessons 1–3
// taught, next up it4, it1–it4 shared. ITler — Evening takes IT English,
// nothing taught, it1 shared. IELTS Speaking — Main had ie1 of 2. Kamal's
// class isn't Maria's. Rashad is in ITler — Morning.
const morning = async (client) => client.getClass("cls_it_morning");
const itProgress = async (client, classId = "cls_it_morning") => progressFor(await client.getClass(classId), "it");

describe("classes — mock client", () => {
  it("lists the teacher's own classes, each course with its progress", async () => {
    const classes = await createMockClassesClient(mockDb()).listClasses();
    expect(classes.map((c) => c.name)).toEqual(["ITler — Morning", "ITler — Evening", "IELTS Speaking — Main"]);
    const p = progressFor(classes[0], "it");
    expect(p).toMatchObject({ taughtCount: 3, total: 6, pct: 50, allTaught: false, next: { id: "it4", n: 4, title: "Tense forms" } });
    expect(p.last).toMatchObject({ lesson: { id: "it3", n: 3 } });
    expect([...p.released]).toEqual(["it1", "it2", "it3", "it4"]);
  });

  it("gives progress lessons as { id, n, title } only", async () => {
    const p = await itProgress(createMockClassesClient(mockDb()));
    expect(p.lessons[0]).toEqual({ id: "it1", n: 1, title: "Introducing yourself on a team" });
  });

  it("creates a class: with a course it starts on lesson 1 with nothing shared", async () => {
    const client = createMockClassesClient(mockDb());
    const cls = await client.createClass({ name: "Evening B", schedule: [{ day: 3, start: "18:00", durationMin: 90 }], courseId: "every" });
    expect(cls).toMatchObject({ name: "Evening B", joinOpen: true, schedule: [{ day: 3, start: "18:00", durationMin: 90 }] });
    expect(cls.joinToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(progressFor(cls, "every")).toMatchObject({ taughtCount: 0, total: 5, next: { id: "ev1" } });
    expect(progressFor(cls, "every").released.size).toBe(0);
  });

  it("assigns a course only to a class that has none", async () => {
    const client = createMockClassesClient(mockDb());
    const cls = await client.createClass({ name: "No course yet" });
    await client.assignCourse(cls.id, "ielts");
    await client.assignCourse(cls.id, "every");
    expect((await client.getClass(cls.id)).courses.map((c) => c.courseId)).toEqual(["ielts"]);
  });

  it("marking a lesson taught logs it, shares it and moves next up on — never backwards", async () => {
    const client = createMockClassesClient(mockDb());
    await client.markTaught("cls_it_morning", "it", "it4");
    let p = await itProgress(client);
    expect(p).toMatchObject({ taughtCount: 4, next: { id: "it5" } });
    expect(p.released.has("it4")).toBe(true);

    await client.markTaught("cls_it_morning", "it", "it1"); // a review
    p = await itProgress(client);
    expect(p.next.id).toBe("it5");
    expect(p.taughtCount).toBe(4);
  });

  it("shares and hides a lesson", async () => {
    const client = createMockClassesClient(mockDb());
    await client.setShared("cls_it_morning", "it", "it5", true);
    expect((await itProgress(client)).released.has("it5")).toBe(true);
    await client.setShared("cls_it_morning", "it", "it5", false);
    const entry = (await morning(client)).courses[0];
    expect(entry.releasedLessonIds).not.toContain("it5");
    expect(entry.heldLessonIds).toContain("it5");
  });

  it("sets next up by hand, and completes and reopens a course", async () => {
    const client = createMockClassesClient(mockDb());
    await client.setNextLesson("cls_it_morning", "it", "it6");
    expect((await itProgress(client)).next.id).toBe("it6");
    await client.setCourseStatus("cls_it_morning", "it", "done");
    expect(await itProgress(client)).toMatchObject({ pct: 100, next: null });
    await client.setCourseStatus("cls_it_morning", "it", "in-progress");
    expect(activeCourseOf(await morning(client))?.courseId).toBe("it");
  });

  it("changes the schedule (sorted by day), the class link and whether it takes requests", async () => {
    const client = createMockClassesClient(mockDb());
    const before = (await morning(client)).joinToken;
    await client.updateSchedule("cls_it_morning", [{ day: 4, start: "09:00", durationMin: 60 }, { day: 1, start: "09:00", durationMin: 60 }]);
    await client.setJoining("cls_it_morning", false);
    await client.newJoinLink("cls_it_morning");
    const cls = await morning(client);
    expect(cls.schedule.map((s) => s.day)).toEqual([1, 4]);
    expect(cls.joinOpen).toBe(false);
    expect(cls.joinToken).not.toBe(before);
  });

  it("marks attendance only for a student who was in the class when it was taught", async () => {
    const db = mockDb();
    const client = createMockClassesClient(db);
    await client.setAttendance("tl_seed_5", "s_rashad", "absent");
    await client.setAttendance("tl_seed_5", "s_aysel", "absent"); // never in ITler — Morning
    expect(db.raw().attendance.filter((a) => a.taughtLessonId === "tl_seed_5")).toEqual([
      expect.objectContaining({ studentId: "s_rashad", status: "absent" }),
    ]);
  });
});

describe("class progress helpers", () => {
  const cls = (courses) => ({ courses });
  it("activeCourseOf: the one in progress, or null", () => {
    expect(activeCourseOf(cls([{ courseId: "a", status: "done" }, { courseId: "b", status: "in-progress" }]))?.courseId).toBe("b");
    expect(activeCourseOf(cls([{ courseId: "a", status: "paused" }]))).toBeNull();
    expect(activeCourseOf(null)).toBeNull();
  });

  it("courseAvgProgress: the average over every class taking the course, or null when none does", () => {
    const classes = [
      cls([{ courseId: "it", progress: { pct: 50 } }]),
      cls([{ courseId: "it", progress: { pct: 0 } }, { courseId: "x", progress: { pct: 90 } }]),
      cls([]),
    ];
    expect(courseAvgProgress(classes, "it")).toBe(25);
    expect(courseAvgProgress(classes, "nobody")).toBeNull();
  });

  it("progressFor: null for a course the class doesn't take", () => {
    expect(progressFor(cls([]), "it")).toBeNull();
    expect(progressFor(null, "it")).toBeNull();
  });
});

describe("classes — HTTP client (docs/openapi.yaml: Classes)", () => {
  it("calls the class endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpClassesClient(api);
    await client.listClasses();
    await client.getClass("c1");
    await client.createClass({ name: "B", schedule: [], courseId: null });
    await client.updateSchedule("c1", [{ day: 0, start: "10:00", durationMin: 60 }]);
    await client.setJoining("c1", false);
    await client.newJoinLink("c1");
    expect(calls).toEqual([
      { method: "GET", path: "/classes?include=progress" },
      { method: "GET", path: "/classes/c1?include=progress" },
      { method: "POST", path: "/classes", body: { name: "B", schedule: [], courseId: null } },
      { method: "PUT", path: "/classes/c1/schedule", body: { schedule: [{ day: 0, start: "10:00", durationMin: 60 }] } },
      { method: "PATCH", path: "/classes/c1", body: { joinOpen: false } },
      { method: "POST", path: "/classes/c1/join-token" },
    ]);
  });

  it("calls the class-course endpoints and attendance", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpClassesClient(api);
    await client.assignCourse("c1", "it");
    await client.setCourseStatus("c1", "it", "done");
    await client.setNextLesson("c1", "it", "it6");
    await client.markTaught("c1", "it", "it4");
    await client.setShared("c1", "it", "it5", true);
    await client.setAttendance("tl1", "s1", "absent");
    expect(calls).toEqual([
      { method: "POST", path: "/classes/c1/courses", body: { courseId: "it" } },
      { method: "PATCH", path: "/classes/c1/courses/it", body: { status: "done" } },
      { method: "PATCH", path: "/classes/c1/courses/it", body: { currentLessonId: "it6" } },
      { method: "POST", path: "/classes/c1/courses/it/taught-lessons", body: { lessonId: "it4" } },
      { method: "PUT", path: "/classes/c1/courses/it/released/it5", body: { released: true } },
      { method: "PUT", path: "/taught-lessons/tl1/attendance/s1", body: { status: "absent" } },
    ]);
  });

  it("treats a missing class (404) as null", async () => {
    const { api } = recordingApi({ "GET /classes/x?include=progress": new ApiError("not_found", "No class") });
    expect(await createHttpClassesClient(api).getClass("x")).toBeNull();
  });
});
