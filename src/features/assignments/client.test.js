import { describe, expect, it } from "vitest";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpAssignmentsClient, createMockAssignmentsClient } from "./client.js";

// Seed: Rashad (ITler — Morning) has "Tense timeline pack" to do and
// finished "IT essentials"; Nigar finished "IT starter words". Orkhan left
// his class; Zeynab only bought a course; Tural is Kamal's student.
const task = { kind: "task", title: "Quick quiz", componentKind: "quiz", content: { id: "c1", kind: "quiz", items: [{ q: "Q?" }] } };

describe("assignments — mock client", () => {
  it("lists a student's work newest first", async () => {
    const work = await createMockAssignmentsClient(mockDb()).forStudent("s_rashad");
    expect(work.map((a) => [a.title, a.status])).toEqual([["Tense timeline pack", "assigned"], ["IT essentials", "done"]]);
  });

  it("assigns one row per student — only students in a class of the teacher's now", async () => {
    const db = mockDb();
    const client = createMockAssignmentsClient(db);
    await client.assign(["s_rashad", "s_nigar", "s_orkhan", "s_zeynab", "s_tural", "s_rashad"], task);
    const rows = db.raw().assignments.filter((a) => a.title === "Quick quiz");
    expect(rows.map((a) => a.studentId)).toEqual(["s_rashad", "s_nigar"]);
    expect(rows[0]).toMatchObject({ kind: "task", status: "assigned", teacherId: "t_maria" });
  });

  it("gives each student their own copy of the content", async () => {
    const db = mockDb();
    const content = { id: "c1", kind: "quiz", items: [{ q: "Q?" }] };
    await createMockAssignmentsClient(db).assign(["s_rashad", "s_nigar"], { ...task, content });
    content.items[0].q = "changed";
    const [a, b] = db.raw().assignments.filter((x) => x.title === "Quick quiz");
    expect(a.content.items[0].q).toBe("Q?");
    expect(a.content).not.toBe(b.content);
  });

  it("withdraws open work only; the row stays, and the student no longer sees it", async () => {
    const db = mockDb();
    const teacher = createMockAssignmentsClient(db);
    await teacher.withdraw("as_seed_1");
    await teacher.withdraw("as_seed_2"); // done: stays done
    expect((await teacher.forStudent("s_rashad")).map((a) => a.status)).toEqual(["withdrawn", "done"]);
    expect((await createMockAssignmentsClient(db.as("s_rashad")).mine()).map((a) => a.title)).toEqual(["IT essentials"]);
  });

  it("a student's work comes with the teacher's name; they finish their own open work only", async () => {
    const db = mockDb();
    await createMockAssignmentsClient(db).assign(["s_nigar"], task);
    const nigars = db.raw().assignments.find((a) => a.studentId === "s_nigar" && a.title === "Quick quiz");
    const rashad = createMockAssignmentsClient(db.as("s_rashad"));
    expect((await rashad.mine())[0]).toMatchObject({ title: "Tense timeline pack", teacher: { id: "t_maria", name: "Maria Carey" } });

    await rashad.complete("as_seed_1");
    await rashad.complete(nigars.id);
    expect((await rashad.mine())[0]).toMatchObject({ status: "done", completedAt: expect.any(String) });
    expect(db.raw().assignments.find((a) => a.id === nigars.id).status).toBe("assigned");
  });
});

describe("assignments — HTTP client (docs/openapi.yaml)", () => {
  it("calls the assignment endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpAssignmentsClient(api);
    await client.forStudent("s1");
    await client.assign(["s1", "s2"], { kind: "wordSet", title: "IT", source: { wordSetId: "ws1" } });
    await client.withdraw("a1");
    await client.mine();
    await client.complete("a2");
    expect(calls).toEqual([
      { method: "GET", path: "/assignments?studentId=s1" },
      { method: "POST", path: "/assignments", body: { studentIds: ["s1", "s2"], kind: "wordSet", title: "IT", source: { wordSetId: "ws1" } } },
      { method: "PATCH", path: "/assignments/a1", body: { status: "withdrawn" } },
      { method: "GET", path: "/me/assignments" },
      { method: "POST", path: "/me/assignments/a2/complete" },
    ]);
  });
});
