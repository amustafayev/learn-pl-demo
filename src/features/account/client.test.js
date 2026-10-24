import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpAccountClient, createMockAccountClient } from "./client.js";

// Seed: the teacher is Maria Carey (two-factor on); Rashad Aliyev
// (rashad.aliyev@example.com) is a student.

describe("account — mock client", () => {
  it("says who's signed in: the teacher, a student, or nobody", async () => {
    const db = mockDb();
    expect(await createMockAccountClient(db).getMe()).toMatchObject({ role: "teacher", name: "Maria Carey", email: "maria.carey@lucid.app" });
    expect(await createMockAccountClient(db.as("s_rashad")).getMe()).toMatchObject({ role: "student", id: "s_rashad", name: "Rashad Aliyev" });
    expect(await createMockAccountClient(db.as(null)).getMe()).toBeNull();
  });

  it("updates the teacher's profile and two-factor setting", async () => {
    const teacher = createMockAccountClient(mockDb());
    await teacher.updateProfile({ name: "Mariam Carey", phone: "+994 50 000 00 00" });
    await teacher.setTwoFactor(false);
    expect(await teacher.getMe()).toMatchObject({ name: "Mariam Carey", email: "maria.carey@lucid.app", phone: "+994 50 000 00 00", twoFactorEnabled: false });
  });

  it("logs a student in by email, whatever the case", async () => {
    const visitor = createMockAccountClient(mockDb().as(null));
    const { user } = await visitor.login({ email: "Rashad.Aliyev@Example.com", password: "x" });
    expect(user).toMatchObject({ id: "s_rashad", role: "student", name: "Rashad Aliyev" });
  });

  it("refuses an email no account has", async () => {
    const visitor = createMockAccountClient(mockDb().as(null));
    await expect(visitor.login({ email: "nobody@example.com", password: "x" })).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("signs up a new student, who can then log in and appears among the demo accounts", async () => {
    const db = mockDb();
    const visitor = createMockAccountClient(db.as(null));
    const { user } = await visitor.register({ role: "student", name: " Test Student ", email: "Test.Student@example.com", password: "x" });
    expect(user).toMatchObject({ role: "student", name: "Test Student", email: "test.student@example.com" });
    expect((await visitor.login({ email: "test.student@example.com" })).user.id).toBe(user.id);
    expect((await visitor.demoAccounts()).some((a) => a.id === user.id)).toBe(true);
  });

  it("refuses to sign up an email that's taken", async () => {
    const visitor = createMockAccountClient(mockDb().as(null));
    await expect(visitor.register({ role: "student", name: "Someone", email: "RASHAD.ALIYEV@example.com", password: "x" }))
      .rejects.toMatchObject({ code: "email_taken" });
  });
});

describe("account — HTTP client (docs/openapi.yaml: Auth & profile)", () => {
  it("calls the profile endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpAccountClient(api);
    await client.getMe();
    await client.updateProfile({ name: "Mariam Carey" });
    await client.setTwoFactor(true);
    expect(calls).toEqual([
      { method: "GET", path: "/me" },
      { method: "PATCH", path: "/me", body: { name: "Mariam Carey" } },
      { method: "PUT", path: "/me/two-factor", body: { enabled: true } },
    ]);
  });

  it("keeps the token from logging in or signing up, and drops it on logout", async () => {
    const user = { id: "s1", role: "student", name: "Test" };
    const recorded = recordingApi({
      "POST /auth/login": { token: "t-login", user },
      "POST /auth/register": { token: "t-register", user },
    });
    const client = createHttpAccountClient(recorded.api);

    expect(await client.login({ email: "a@b.c", password: "x" })).toEqual({ user });
    expect(recorded.token()).toBe("t-login");
    await client.register({ role: "student", name: "Test", email: "a@b.c", password: "x" });
    expect(recorded.token()).toBe("t-register");
    await client.logout();
    expect(recorded.token()).toBeNull();
    expect(recorded.calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /auth/login", "POST /auth/register", "POST /auth/logout"]);
  });

  it("treats a signed-out caller (401) as nobody, and has no demo accounts", async () => {
    const { api } = recordingApi({ "GET /me": new ApiError("401", "Sign in first") });
    const client = createHttpAccountClient(api);
    expect(await client.getMe()).toBeNull();
    expect(await client.demoAccounts()).toEqual([]);
  });
});
