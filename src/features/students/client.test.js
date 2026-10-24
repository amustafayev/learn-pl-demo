import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpStudentsClient, createMockStudentsClient } from "./client.js";
import { rosterStudents } from "./roster.js";

// Seed: Rashad, Nigar and Leyla are in ITler — Morning; Elvin and Kamran in
// ITler — Evening; Aysel in IELTS. Farid (mb_7) asked to join ITler —
// Evening, Lala (mb_8) IELTS; Murad asked to buy IELTS Speaking. Lala was
// removed from and Orkhan left ITler — Morning. Zeynab bought Everyday
// English. Tural is Kamal's student, never Maria's. Rashad missed Lesson 2.
const ids = (list) => list.map((x) => x.id);
const names = (list) => list.map((x) => x.name.split(" ")[0]);

describe("students — mock client", () => {
  it("groups the roster by relationship; another teacher's students never appear", async () => {
    const roster = await createMockStudentsClient(mockDb()).roster();
    expect(names(roster.active)).toEqual(["Rashad", "Nigar", "Elvin", "Leyla", "Kamran", "Aysel"]);
    expect(roster.requests.map((r) => [r.kind, r.student.name.split(" ")[0]])).toEqual([["class", "Lala"], ["purchase", "Murad"], ["class", "Farid"]]);
    expect(roster.former.map((f) => f.student.name.split(" ")[0])).toEqual(["Lala", "Orkhan"]);
    expect(roster.customers.map((c) => [c.student.name.split(" ")[0], c.course.title])).toEqual([["Zeynab", "Everyday English"]]);
    expect(rosterStudents(roster).some((s) => s.id === "s_tural")).toBe(false);
  });

  it("names classes, courses and lessons the API's way: class / course / lesson references", async () => {
    const roster = await createMockStudentsClient(mockDb()).roster();
    expect(roster.active[0].classes).toEqual([{ id: "cls_it_morning", name: "ITler — Morning", courseId: "it" }]);
    const farid = roster.requests.find((r) => r.student.id === "s_farid");
    expect(farid.class).toEqual({ id: "cls_it_evening", name: "ITler — Evening" });
    expect(farid).not.toHaveProperty("cls");
    expect(roster.former.find((f) => f.student.id === "s_orkhan").ended[0].class).toEqual({ id: "cls_it_morning", name: "ITler — Morning" });
  });

  it("gives a student's history: their class's lessons while they were in it, and what they missed", async () => {
    const h = await createMockStudentsClient(mockDb()).history("s_rashad");
    expect(h.classes[0]).toMatchObject({ class: { id: "cls_it_morning" }, active: true, missed: 1, now: { course: { title: "IT English" }, progress: { next: { n: 4 }, taughtCount: 3, total: 6 } } });
    expect(h.lessons.map((l) => [l.lesson.n, l.absent])).toEqual([[3, false], [2, true], [1, false]]);
    expect(h.totals).toMatchObject({ taken: 2, inClass: 2, missed: 1 });
  });

  it("gets a student, saying whether this teacher blocked them", async () => {
    const client = createMockStudentsClient(mockDb());
    expect(await client.getStudent("s_rashad")).toMatchObject({ name: "Rashad Aliyev", blocked: false });
    await client.block("s_rashad");
    expect((await client.getStudent("s_rashad")).blocked).toBe(true);
    expect(await client.getStudent("s_tural")).toBeNull();
  });

  it("accepts a join request: the student is in the class", async () => {
    const client = createMockStudentsClient(mockDb());
    await client.decideRequest("mb_7", "active");
    expect(ids((await client.classMembers("cls_it_evening")).map((m) => m.student))).toContain("s_farid");
    expect((await client.roster()).requests.some((r) => r.id === "mb_7")).toBe(false);
  });

  it("removes a member by membership and adds them back: a new stint, the old one kept", async () => {
    const client = createMockStudentsClient(mockDb());
    const nigar = (await client.classMembers("cls_it_morning")).find((m) => m.studentId === "s_nigar");
    await client.removeMember(nigar.id);
    expect((await client.classMembers("cls_it_morning")).some((m) => m.studentId === "s_nigar")).toBe(false);
    expect(names((await client.roster()).former.map((f) => f.student))).toContain("Nigar");

    await client.addToClass("cls_it_morning", "s_nigar");
    const back = (await client.history("s_nigar")).classes[0];
    expect(back.active).toBe(true);
    expect(back.periods).toHaveLength(2);
  });

  it("blocking declines the student's pending requests; unblocking lets them ask again", async () => {
    const client = createMockStudentsClient(mockDb());
    await client.block("s_farid");
    let roster = await client.roster();
    expect(roster.requests.some((r) => r.student.id === "s_farid")).toBe(false);
    expect(roster.blocked.map((s) => s.id)).toContain("s_farid");
    await client.unblock("s_farid");
    roster = await client.roster();
    expect(roster.blocked.map((s) => s.id)).not.toContain("s_farid");
  });

  it("sends an email invite (once per address) and withdraws it", async () => {
    const client = createMockStudentsClient(mockDb());
    await client.invite("cls_it_morning", " New.Student@Example.com ");
    await client.invite("cls_it_morning", "new.student@example.com");
    const pending = await client.invitations("cls_it_morning");
    expect(pending.map((i) => i.email)).toEqual(["new.student@example.com"]);
    await client.revokeInvitation(pending[0].id);
    expect(await client.invitations("cls_it_morning")).toEqual([]);
  });

  it("names: the teacher knows their students; a student knows only themselves", async () => {
    const db = mockDb();
    const teacherNames = await createMockStudentsClient(db).names();
    expect(teacherNames).toContainEqual({ id: "s_nigar", name: "Nigar Mammadova" });
    expect(await createMockStudentsClient(db.as("s_rashad")).names()).toEqual([{ id: "s_rashad", name: "Rashad Aliyev" }]);
  });
});

describe("rosterStudents", () => {
  it("lists everyone once: active, asking, former, customers, blocked", () => {
    const s = (id) => ({ id, name: id });
    const roster = {
      active: [s("a")], requests: [{ student: s("b") }, { student: s("a") }], former: [{ student: s("c") }],
      customers: [{ student: s("d") }], blocked: [s("e")],
    };
    expect(rosterStudents(roster).map((x) => x.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("students — HTTP client (docs/openapi.yaml: Joining, Students)", () => {
  it("calls the roster, student and membership endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpStudentsClient(api);
    await client.roster();
    await client.getStudent("s1");
    await client.history("s1");
    await client.classMembers("c1");
    await client.addToClass("c1", "s1");
    await client.removeMember("m1");
    await client.decideRequest("m2", "active");
    expect(calls).toEqual([
      { method: "GET", path: "/students" },
      { method: "GET", path: "/students/s1" },
      { method: "GET", path: "/students/s1/history" },
      { method: "GET", path: "/classes/c1/members?status=active" },
      { method: "POST", path: "/classes/c1/members", body: { studentId: "s1" } },
      { method: "PATCH", path: "/memberships/m1", body: { status: "removed" } },
      { method: "PATCH", path: "/memberships/m2", body: { status: "active" } },
    ]);
  });

  it("calls the block and invitation endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpStudentsClient(api);
    await client.block("s1");
    await client.unblock("s1");
    await client.invitations("c1");
    await client.invite("c1", "a@b.c");
    await client.revokeInvitation("i1");
    expect(calls).toEqual([
      { method: "POST", path: "/blocked-students", body: { studentId: "s1" } },
      { method: "DELETE", path: "/blocked-students/s1" },
      { method: "GET", path: "/classes/c1/invitations?status=pending" },
      { method: "POST", path: "/classes/c1/invitations", body: { email: "a@b.c" } },
      { method: "DELETE", path: "/invitations/i1" },
    ]);
  });

  it("names: the teacher's from the roster, a student's from /me", async () => {
    const roster = { active: [{ id: "s1", name: "A" }], requests: [], former: [], customers: [], blocked: [{ id: "s2", name: "B" }] };
    const teacher = recordingApi({ "GET /students": roster });
    expect(await createHttpStudentsClient(teacher.api).names()).toEqual([{ id: "s1", name: "A" }, { id: "s2", name: "B" }]);
    const student = recordingApi({ "GET /me": { id: "s9", name: "Me", role: "student" } });
    expect(await createHttpStudentsClient(student.api, { audience: "student" }).names()).toEqual([{ id: "s9", name: "Me" }]);
  });

  it("treats a student who isn't the teacher's (404) as null", async () => {
    const { api } = recordingApi({ "GET /students/x": new ApiError("not_found", "No") });
    expect(await createHttpStudentsClient(api).getStudent("x")).toBeNull();
  });
});
