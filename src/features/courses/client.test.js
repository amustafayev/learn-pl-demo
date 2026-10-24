import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpCoursesClient, createMockCoursesClient } from "./client.js";

// Seed: Maria's courses are Everyday English (every, 5 lessons), IT English
// (it, 6) and IELTS Speaking (ielts, 2); Kamal's Business English is not
// hers. IT English lesson 5 (it5) was never built: reading, vocabulary,
// listening, grammar, practice, homework.
const titles = (blocks) => blocks.map((b) => b.title);

describe("courses — mock client", () => {
  it("lists the teacher's own courses, each with its lesson count", async () => {
    const courses = await createMockCoursesClient(mockDb()).listCourses();
    expect(courses.map((c) => [c.id, c.lessonCount])).toEqual([["every", 5], ["it", 6], ["ielts", 2]]);
  });

  it("gets one course, or null for one that isn't the teacher's", async () => {
    const client = createMockCoursesClient(mockDb());
    expect(await client.getCourse("it")).toMatchObject({ title: "IT English", level: "B1 → B2", lessonCount: 6 });
    expect(await client.getCourse("biz")).toBeNull();
  });

  it("creates a course that starts empty and not for sale", async () => {
    const client = createMockCoursesClient(mockDb());
    const course = await client.createCourse({ title: "Business Emails", level: "B1", hue: "sky" });
    expect(course).toMatchObject({ title: "Business Emails", level: "B1", hue: "sky", templateId: "general", lessonCount: 0, sale: { forSale: false } });
    expect((await client.listCourses()).map((c) => c.id)).toContain(course.id);
  });

  it("gives an unbuilt lesson blocks from its block types, with ids that don't change", async () => {
    const client = createMockCoursesClient(mockDb());
    const lesson = await client.getLesson("it", "it5");
    expect(lesson).toMatchObject({ courseId: "it", n: 5, title: "Writing clear code-review comments" });
    expect(titles(lesson.blocks)).toEqual(["Reading", "Vocabulary", "Listening", "Grammar", "Practice", "Homework"]);
    expect(lesson.blocks.map((b) => b.id)).toEqual(["it5-1", "it5-2", "it5-3", "it5-4", "it5-5", "it5-6"]);
    expect((await client.getLesson("it", "it5")).blocks.map((b) => b.id)).toEqual(lesson.blocks.map((b) => b.id));
  });

  it("lists a course's lessons in order, each with its blocks", async () => {
    const lessons = await createMockCoursesClient(mockDb()).listLessons("it");
    expect(lessons.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(lessons.every((l) => l.courseId === "it" && Array.isArray(l.blocks) && l.blocks.length > 0)).toBe(true);
  });

  it("adds a lesson at the end", async () => {
    const client = createMockCoursesClient(mockDb());
    const lesson = await client.createLesson("it", { title: "Giving feedback" });
    expect(lesson).toMatchObject({ n: 7, title: "Giving feedback", blocks: [] });
    expect((await client.getCourse("it")).lessonCount).toBe(7);
  });

  it("adds, renames, moves and removes a lesson's blocks", async () => {
    const client = createMockCoursesClient(mockDb());
    const added = await client.addBlock("it", "it5", { type: "speaking", title: "Speaking" });
    expect(titles((await client.getLesson("it", "it5")).blocks).at(-1)).toBe("Speaking");

    await client.updateBlock("it", "it5", "it5-1", { title: "Warm-up reading" });
    await client.moveBlock("it", "it5", "it5-1", "down");
    await client.moveBlock("it", "it5", added.id, "down"); // already last: nothing happens
    await client.removeBlock("it", "it5", "it5-6");
    expect(titles((await client.getLesson("it", "it5")).blocks)).toEqual(["Vocabulary", "Warm-up reading", "Listening", "Grammar", "Practice", "Speaking"]);
  });

  it("replaces a block's components", async () => {
    const client = createMockCoursesClient(mockDb());
    const content = { components: [{ id: "c1", kind: "quiz", items: [{ q: "Q1", options: ["a", "b"], answer: 0 }] }] };
    await client.updateBlock("it", "it5", "it5-5", { content });
    expect((await client.getLesson("it", "it5")).blocks[4].content).toEqual(content);
  });

  it("merges sale settings field by field", async () => {
    const client = createMockCoursesClient(mockDb());
    await client.updateSale("it", { forSale: true, price: 35 });
    expect((await client.getCourse("it")).sale).toMatchObject({ forSale: true, price: 35, currency: "AZN" });
  });
});

describe("courses — HTTP client (docs/openapi.yaml: Courses, Lessons & blocks)", () => {
  it("calls the course and lesson endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpCoursesClient(api);
    await client.listCourses();
    await client.getCourse("it");
    await client.createCourse({ title: "Emails" });
    await client.updateSale("it", { forSale: true, price: 35 });
    await client.listLessons("it");
    await client.getLesson("it", "it5");
    await client.createLesson("it", { title: "Feedback" });
    expect(calls).toEqual([
      { method: "GET", path: "/courses" },
      { method: "GET", path: "/courses/it" },
      { method: "POST", path: "/courses", body: { title: "Emails" } },
      { method: "PATCH", path: "/courses/it", body: { sale: { forSale: true, price: 35 } } },
      { method: "GET", path: "/courses/it/lessons?include=blocks" },
      { method: "GET", path: "/courses/it/lessons/it5" },
      { method: "POST", path: "/courses/it/lessons", body: { title: "Feedback" } },
    ]);
  });

  it("calls the block endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpCoursesClient(api);
    await client.addBlock("it", "it5", { type: "speaking", title: "Speaking" });
    await client.updateBlock("it", "it5", "b1", { title: "Warm-up" });
    await client.moveBlock("it", "it5", "b1", "up");
    await client.removeBlock("it", "it5", "b1");
    expect(calls).toEqual([
      { method: "POST", path: "/courses/it/lessons/it5/blocks", body: { type: "speaking", title: "Speaking" } },
      { method: "PATCH", path: "/courses/it/lessons/it5/blocks/b1", body: { title: "Warm-up" } },
      { method: "POST", path: "/courses/it/lessons/it5/blocks/b1/move", body: { direction: "up" } },
      { method: "DELETE", path: "/courses/it/lessons/it5/blocks/b1" },
    ]);
  });

  it("treats a missing course or lesson (404) as null", async () => {
    const { api } = recordingApi({
      "GET /courses/x": new ApiError("not_found", "No course"),
      "GET /courses/it/lessons/x": new ApiError("404", "No lesson"),
    });
    const client = createHttpCoursesClient(api);
    expect(await client.getCourse("x")).toBeNull();
    expect(await client.getLesson("it", "x")).toBeNull();
  });
});
