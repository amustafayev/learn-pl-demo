import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpNotesClient, createMockNotesClient } from "./client.js";

// Seed: lesson it4 (IT English) has notes that aren't sent anywhere yet;
// Rashad is in ITler — Morning, which takes IT English; Aysel isn't.
const DOC = "https://docs.google.com/document/d/abc123/edit";

describe("notes — mock client", () => {
  it("gets a lesson's notes, or null when it has none", async () => {
    const teacher = createMockNotesClient(mockDb());
    expect(await teacher.get("it", "it4")).toMatchObject({ courseId: "it", lessonId: "it4", sentTo: [] });
    expect((await teacher.get("it", "it4")).text).toContain("Open with a 5-minute recap");
    expect(await teacher.get("it", "it6")).toBeNull();
  });

  it("saves only basic formatting — scripts and attributes are stripped", async () => {
    const teacher = createMockNotesClient(mockDb());
    await teacher.save("it", "it6", '<p onclick="steal()">Bring laptops<script>steal()</script></p>');
    const note = await teacher.get("it", "it6");
    expect(note.html).toBe("<p>Bring laptops</p>");
    expect(note.text).toBe("Bring laptops");
  });

  it("removes notes that end up with no text and no Google Doc", async () => {
    const teacher = createMockNotesClient(mockDb());
    await teacher.save("it", "it4", "");
    expect(await teacher.get("it", "it4")).toBeNull();
  });

  it("links a Google Doc, ignores any other link, and unlinks", async () => {
    const teacher = createMockNotesClient(mockDb());
    await teacher.setDoc("it", "it4", { docUrl: "https://example.com/doc" });
    expect((await teacher.get("it", "it4")).docUrl).toBeNull();
    await teacher.setDoc("it", "it4", { docUrl: DOC, managed: true });
    expect(await teacher.get("it", "it4")).toMatchObject({ docUrl: DOC, docManaged: true });
    await teacher.setDoc("it", "it4", { docUrl: "" });
    expect(await teacher.get("it", "it4")).toMatchObject({ docUrl: null, docManaged: false });
  });

  it("sends notes to a class: its active students get them, others don't", async () => {
    const db = mockDb();
    const teacher = createMockNotesClient(db);
    await teacher.send("it", "it4", "cls_it_morning", true);

    const sent = await teacher.get("it", "it4");
    expect(sent.sentTo).toEqual([{ classId: "cls_it_morning", className: "ITler — Morning", at: expect.any(String) }]);

    const rashad = await createMockNotesClient(db.as("s_rashad")).listMine();
    const mine = rashad.find((n) => n.lessonId === "it4");
    expect(mine).toMatchObject({ id: `${sent.id}:cls_it_morning`, classId: "cls_it_morning", courseId: "it", sentAt: sent.sentTo[0].at });
    expect(mine).not.toHaveProperty("sharedAt");

    const aysel = await createMockNotesClient(db.as("s_aysel")).listMine();
    expect(aysel.some((n) => n.lessonId === "it4")).toBe(false);
  });

  it("takes notes back from a class", async () => {
    const db = mockDb();
    const teacher = createMockNotesClient(db);
    await teacher.send("it", "it4", "cls_it_morning", true);
    await teacher.send("it", "it4", "cls_it_morning", false);
    expect((await teacher.get("it", "it4")).sentTo).toEqual([]);
    expect((await createMockNotesClient(db.as("s_rashad")).listMine()).some((n) => n.lessonId === "it4")).toBe(false);
  });

  it("won't send to a class that doesn't take the course", async () => {
    const teacher = createMockNotesClient(mockDb());
    await teacher.send("it", "it4", "cls_ielts_main", true);
    expect((await teacher.get("it", "it4")).sentTo).toEqual([]);
  });

  it("lists a student's notes newest first", async () => {
    const db = mockDb();
    await createMockNotesClient(db).send("it", "it4", "cls_it_morning", true);
    const notes = await createMockNotesClient(db.as("s_rashad")).listMine();
    expect(notes.map((n) => n.sentAt)).toEqual([...notes.map((n) => n.sentAt)].sort().reverse());
  });
});

describe("notes — HTTP client (docs/openapi.yaml: Lesson notes, /me/notes)", () => {
  it("calls the lesson-notes endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpNotesClient(api);
    await client.get("it", "it4");
    await client.save("it", "it4", "<p>Hi</p>");
    await client.setDoc("it", "it4", { docUrl: DOC, managed: true });
    await client.send("it", "it4", "cls_it_morning", true);
    await client.listMine();
    expect(calls).toEqual([
      { method: "GET", path: "/courses/it/lessons/it4/notes" },
      { method: "PUT", path: "/courses/it/lessons/it4/notes", body: { html: "<p>Hi</p>" } },
      { method: "PATCH", path: "/courses/it/lessons/it4/notes", body: { docUrl: DOC, managed: true } },
      { method: "PUT", path: "/courses/it/lessons/it4/notes/classes/cls_it_morning", body: { sent: true } },
      { method: "GET", path: "/me/notes" },
    ]);
  });

  it("treats a lesson with no notes (404) as null, and passes other errors on", async () => {
    const missing = recordingApi({ "GET /courses/it/lessons/it6/notes": new ApiError("not_found", "No notes") });
    expect(await createHttpNotesClient(missing.api).get("it", "it6")).toBeNull();
    const down = recordingApi({ "GET /courses/it/lessons/it6/notes": new ApiError("network_error", "Offline") });
    await expect(createHttpNotesClient(down.api).get("it", "it6")).rejects.toThrow("Offline");
  });
});
