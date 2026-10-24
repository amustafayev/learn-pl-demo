import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpJoiningClient, createMockJoiningClient } from "./client.js";

// Seed: IELTS Speaking — Main (cls_ielts_main) takes requests through its
// link; Rashad (rashad.aliyev@example.com) is in ITler — Morning and has no
// invites; Lala already asked to join IELTS Speaking — Main.
const IELTS_LINK = "2d9e7b61-a4c3-4f08-b6d2-8e1a5c730f94";
const membershipOf = (db, studentId, classId) => db.raw().memberships.find((m) => m.studentId === studentId && m.classId === classId);

describe("joining — mock client", () => {
  it("a class link previews the class: names and an outline, never lessons' content or other students", async () => {
    const preview = await createMockJoiningClient(mockDb().as("s_rashad")).preview(IELTS_LINK);
    expect(preview).toMatchObject({ classId: "cls_ielts_main", name: "IELTS Speaking — Main", teacher: { name: "Maria Carey" } });
    expect(preview.courses.map((c) => c.title)).toEqual(["IELTS Speaking"]);
    expect(Object.keys(preview.courses[0].lessons[0]).sort()).toEqual(["n", "title"]);
    expect(preview).not.toHaveProperty("members");
    expect(preview).not.toHaveProperty("teacherId");
  });

  it("an unknown link has no preview", async () => {
    expect(await createMockJoiningClient(mockDb().as("s_rashad")).preview("not-a-real-link")).toBeNull();
  });

  it("asking to join through a link only makes a request; the teacher accepts it", async () => {
    const db = mockDb();
    await createMockJoiningClient(db.as("s_rashad")).requestToJoin(IELTS_LINK, "Hi!");
    expect(membershipOf(db, "s_rashad", "cls_ielts_main")).toMatchObject({ status: "requested", source: "code" });
  });

  it("an email invite waits on their side until they accept it — then they're in", async () => {
    const db = mockDb();
    const rashad = createMockJoiningClient(db.as("s_rashad"));
    expect(await rashad.myInvitations()).toEqual([]);

    db.dispatch({ type: "CREATE_INVITATION", classId: "cls_it_evening", email: "rashad.aliyev@example.com" });
    const [invite] = await rashad.myInvitations();
    expect(invite).toMatchObject({ class: { id: "cls_it_evening", name: "ITler — Evening" }, teacher: { name: "Maria Carey" } });

    await rashad.acceptInvitation(invite.id);
    expect(membershipOf(db, "s_rashad", "cls_it_evening")).toMatchObject({ status: "active", source: "invite" });
    expect(await rashad.myInvitations()).toEqual([]);
  });

  it("an expired invite isn't offered", async () => {
    const db = mockDb();
    db.dispatch({ type: "CREATE_INVITATION", classId: "cls_it_evening", email: "rashad.aliyev@example.com" });
    db.raw().invitations.forEach((i) => { i.expiresAt = "2000-01-01T00:00:00.000Z"; });
    expect(await createMockJoiningClient(db.as("s_rashad")).myInvitations()).toEqual([]);
  });
});

describe("joining — HTTP client (docs/openapi.yaml: Student app)", () => {
  it("calls the joining endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpJoiningClient(api);
    await client.preview("tok");
    await client.requestToJoin("tok", "Hi");
    await client.myInvitations();
    await client.acceptInvitation("inv1");
    expect(calls).toEqual([
      { method: "GET", path: "/join/tok" },
      { method: "POST", path: "/join", body: { token: "tok", message: "Hi" } },
      { method: "GET", path: "/me/invitations" },
      { method: "POST", path: "/invitations/inv1/accept" },
    ]);
  });

  it("a link that doesn't work (404) has no preview", async () => {
    const { api } = recordingApi({ "GET /join/old": new ApiError("404", "Not found") });
    expect(await createHttpJoiningClient(api).preview("old")).toBeNull();
  });
});
