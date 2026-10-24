import { describe, expect, it, vi } from "vitest";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpHomeworkClient, createMockHomeworkClient, homeworkStats } from "./client.js";

// Seed: no homework yet; ITler — Morning (cls_it_morning) has Rashad,
// Nigar and Leyla.
const CLASS = "cls_it_morning";
const quiz = (id) => ({ id, kind: "task", title: "Quiz", componentKind: "quiz", content: { id: `c-${id}`, kind: "quiz", items: [] } });
const post = (title, extra = {}) => ({ title, instructions: "Do it", attachments: [quiz("a1"), quiz("a2")], ...extra });
const rowsOf = (db, homeworkId) => db.raw().assignments.filter((a) => a.homeworkId === homeworkId);

describe("homework — mock client", () => {
  it("a draft holds no student work until it's assigned", async () => {
    const db = mockDb();
    const client = createMockHomeworkClient(db);
    await client.saveDraft(CLASS, post("Draft one"));
    const [draft] = await client.list(CLASS);
    expect(draft).toMatchObject({ title: "Draft one", status: "draft", turnedIn: 0, assigned: 0, missing: 0 });
    expect(rowsOf(db, draft.id)).toEqual([]);
  });

  it("assigning gives every student one row per attachment", async () => {
    const db = mockDb();
    const client = createMockHomeworkClient(db);
    await client.publish(CLASS, post("Week 1"));
    const [hw] = await client.list(CLASS);
    expect(hw).toMatchObject({ status: "assigned", assigned: 3, turnedIn: 0 });
    const rows = rowsOf(db, hw.id);
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((r) => r.studentId))).toEqual(new Set(["s_rashad", "s_nigar", "s_leyla"]));
  });

  it("a post scheduled for later goes out once its time has come", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
      const db = mockDb();
      const client = createMockHomeworkClient(db);
      await client.publish(CLASS, post("Later"), { scheduledAt: "2026-10-25T12:00:00.000Z" });
      const [hw] = await client.list(CLASS);
      expect(hw.status).toBe("scheduled");
      expect(rowsOf(db, hw.id)).toEqual([]);

      await client.releaseScheduled();
      expect((await client.get(CLASS, hw.id)).status).toBe("scheduled");

      vi.setSystemTime(new Date("2026-10-25T12:00:01Z"));
      await client.releaseScheduled();
      expect((await client.get(CLASS, hw.id)).status).toBe("assigned");
      expect(rowsOf(db, hw.id)).toHaveLength(6);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a scheduled time already past assigns it at once", async () => {
    const client = createMockHomeworkClient(mockDb());
    await client.publish(CLASS, post("Overdue"), { scheduledAt: new Date(Date.now() - 1_000).toISOString() });
    expect((await client.list(CLASS))[0].status).toBe("assigned");
  });

  it("updating a posted post changes its title and due date on open work too", async () => {
    const db = mockDb();
    const client = createMockHomeworkClient(db);
    await client.publish(CLASS, post("Week 1"));
    const [hw] = await client.list(CLASS);
    const due = "2026-11-01T18:00:00.000Z";
    await client.update(CLASS, hw.id, { title: "Week 1 (updated)", dueAt: due });
    expect(await client.get(CLASS, hw.id)).toMatchObject({ title: "Week 1 (updated)", dueAt: due });
    expect(rowsOf(db, hw.id).every((r) => r.dueAt === due && r.homeworkTitle === "Week 1 (updated)")).toBe(true);
  });

  it("deleting a post takes back open work and keeps done work as history", async () => {
    const db = mockDb();
    const client = createMockHomeworkClient(db);
    await client.publish(CLASS, post("Week 1"));
    const [hw] = await client.list(CLASS);
    const rashadsRows = rowsOf(db, hw.id).filter((r) => r.studentId === "s_rashad");
    rashadsRows.forEach((r) => db.dispatch({ type: "COMPLETE_ASSIGNMENT", assignmentId: r.id, studentId: "s_rashad" }));

    await client.remove(CLASS, hw.id);
    expect(await client.list(CLASS)).toEqual([]);
    const statuses = rowsOf(db, hw.id).map((r) => `${r.studentId}:${r.status}`).sort();
    expect(statuses).toEqual([
      "s_leyla:withdrawn", "s_leyla:withdrawn", "s_nigar:withdrawn", "s_nigar:withdrawn", "s_rashad:done", "s_rashad:done",
    ]);
  });
});

describe("homeworkStats", () => {
  const hw = { id: "h1", dueAt: "2026-10-20T12:00:00.000Z" };
  const row = (studentId, status, completedAt = null) => ({ homeworkId: "h1", studentId, status, completedAt });

  it("a student has turned it in once every attachment of theirs is done", () => {
    const stats = homeworkStats(hw, [row("a", "done", "2026-10-19"), row("a", "done", "2026-10-18"), row("b", "done"), row("b", "assigned")], Date.parse("2026-10-19T00:00:00Z"));
    expect(stats.students).toEqual([
      { studentId: "a", status: "turnedIn", doneAt: "2026-10-19" },
      { studentId: "b", status: "assigned", doneAt: null },
    ]);
  });

  it("not turned in after the due date is missing; taken-back work doesn't count", () => {
    const stats = homeworkStats(hw, [row("a", "assigned"), row("b", "withdrawn")], Date.parse("2026-10-21T00:00:00Z"));
    expect(stats).toMatchObject({ turnedIn: 0, assigned: 0, missing: 1 });
    expect(stats.students.map((s) => s.studentId)).toEqual(["a"]);
  });
});

describe("homework — HTTP client (docs/openapi.yaml: /classes/{classId}/homework)", () => {
  it("calls the homework endpoints; publishing saves the post first", async () => {
    const { api, calls } = recordingApi({ "POST /classes/c1/homework": { id: "h9" } });
    const client = createHttpHomeworkClient(api);
    await client.list("c1");
    await client.get("c1", "h1");
    await client.saveDraft("c1", { title: "New" });
    await client.publish("c1", { title: "New" }, { scheduledAt: null });
    await client.update("c1", "h1", { title: "T" });
    await client.remove("c1", "h1");
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /classes/c1/homework",
      "GET /classes/c1/homework/h1",
      "POST /classes/c1/homework",
      "POST /classes/c1/homework",
      "POST /classes/c1/homework/h9/publish",
      "PATCH /classes/c1/homework/h1",
      "DELETE /classes/c1/homework/h1",
    ]);
  });
});
