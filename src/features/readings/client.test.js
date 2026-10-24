import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpReadingsClient, createMockReadingsClient } from "./client.js";

// Seed: "A morning standup" (t_standup) sits in the IT folder (tf_it).

describe("readings — mock client", () => {
  it("lists texts as summaries, without their body", async () => {
    const texts = await createMockReadingsClient(mockDb()).listTexts();
    expect(texts.find((t) => t.id === "t_standup")).toEqual({
      id: "t_standup", title: "A morning standup", folderId: "tf_it", level: "B1", wordCount: 58, hasTranslation: true,
    });
    expect(texts.some((t) => "body" in t)).toBe(false);
  });

  it("gets one text with its tagged body, or null when it doesn't exist", async () => {
    const client = createMockReadingsClient(mockDb());
    const text = await client.getText("t_standup");
    expect(text.body.map((token) => token.text ?? token.term).join("")).toContain("Every morning the team has a short standup");
    expect(await client.getText("no-such-text")).toBeNull();
  });

  it("creates, renames and deletes folders; a blank name is ignored", async () => {
    const client = createMockReadingsClient(mockDb());
    await client.createFolder({ parentId: null, name: "  Grammar  " });
    await client.createFolder({ parentId: null, name: "   " });
    let folders = await client.listFolders();
    const grammar = folders.find((f) => f.name === "Grammar");
    expect(grammar).toMatchObject({ parentId: null });
    expect(folders.filter((f) => !f.name.trim())).toEqual([]);

    await client.renameFolder(grammar.id, "Grammar notes");
    await client.renameFolder(grammar.id, "");
    folders = await client.listFolders();
    expect(folders.find((f) => f.id === grammar.id).name).toBe("Grammar notes");

    await client.deleteFolder(grammar.id);
    expect((await client.listFolders()).some((f) => f.id === grammar.id)).toBe(false);
  });

  it("deleting a folder deletes the folders and texts inside it, nothing else", async () => {
    const client = createMockReadingsClient(mockDb());
    await client.createFolder({ parentId: null, name: "Outer" });
    const outer = (await client.listFolders()).find((f) => f.name === "Outer");
    await client.createFolder({ parentId: outer.id, name: "Inner" });
    const inner = (await client.listFolders()).find((f) => f.name === "Inner");
    await client.createText({ title: "Deep text", folderId: inner.id, level: "B1", wordCount: 2, hasTranslation: false, body: [{ text: "Hi there" }] });
    const before = await client.listTexts();

    await client.deleteFolder(outer.id);

    const folders = await client.listFolders();
    expect(folders.some((f) => f.id === outer.id || f.id === inner.id)).toBe(false);
    const after = await client.listTexts();
    expect(after.some((t) => t.title === "Deep text")).toBe(false);
    expect(after).toHaveLength(before.length - 1);
  });

  it("adds a text, which then lists and opens", async () => {
    const client = createMockReadingsClient(mockDb());
    await client.createText({ title: "Sprint retro", folderId: "tf_it", level: "B2", wordCount: 3, hasTranslation: false, body: [{ text: "We shipped it." }] });
    const added = (await client.listTexts()).find((t) => t.title === "Sprint retro");
    expect(added).toMatchObject({ folderId: "tf_it", level: "B2", wordCount: 3 });
    expect((await client.getText(added.id)).body).toEqual([{ text: "We shipped it." }]);
  });
});

describe("readings — HTTP client (docs/openapi.yaml: Library — reading)", () => {
  it("teacher: calls the library endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpReadingsClient(api);
    await client.listFolders();
    await client.createFolder({ parentId: "f1", name: "Grammar" });
    await client.renameFolder("f2", "Notes");
    await client.deleteFolder("f2");
    await client.listTexts();
    await client.createText({ title: "T", folderId: "f1", body: [] });
    await client.getText("t1");
    expect(calls).toEqual([
      { method: "GET", path: "/library/reading/folders" },
      { method: "POST", path: "/library/reading/folders", body: { parentId: "f1", name: "Grammar" } },
      { method: "PATCH", path: "/library/reading/folders/f2", body: { name: "Notes" } },
      { method: "DELETE", path: "/library/reading/folders/f2" },
      { method: "GET", path: "/library/reading/texts" },
      { method: "POST", path: "/library/reading/texts", body: { title: "T", folderId: "f1", body: [] } },
      { method: "GET", path: "/library/reading/texts/t1" },
    ]);
  });

  it("student: has no library to browse, and reads a text through /me", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpReadingsClient(api, { audience: "student" });
    expect(await client.listFolders()).toEqual([]);
    expect(await client.listTexts()).toEqual([]);
    await client.getText("t1");
    expect(calls).toEqual([{ method: "GET", path: "/me/library/reading/texts/t1" }]);
  });

  it("treats a text the caller can't read (403) as null", async () => {
    const { api } = recordingApi({ "GET /me/library/reading/texts/t1": new ApiError("forbidden", "Not yours") });
    expect(await createHttpReadingsClient(api, { audience: "student" }).getText("t1")).toBeNull();
  });
});
