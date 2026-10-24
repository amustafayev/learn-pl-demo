import { describe, expect, it } from "vitest";
import { ApiError } from "../../db/apiClient.js";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpWordSetsClient, createMockWordSetsClient } from "./client.js";

// Seed: "IT" (wf_it) holds no words of its own; "IT essentials" (ws_it)
// inside it holds deploy, ship, release, bug, merge, rollback.
const setOf = async (client, id) => (await client.list()).find((s) => s.id === id);
const terms = (words) => words.map((w) => w.term);

describe("word sets — mock client", () => {
  it("lists every set with its own words, each word with an id", async () => {
    const itEssentials = await setOf(createMockWordSetsClient(mockDb()), "ws_it");
    expect(itEssentials).toMatchObject({ title: "IT essentials", parentId: "wf_it", level: "B1" });
    expect(itEssentials.words.slice(0, 2)).toEqual([
      expect.objectContaining({ id: "0", term: "deploy", az: "yerləşdirmək" }),
      expect.objectContaining({ id: "1", term: "ship" }),
    ]);
  });

  it("adds a word (trimmed); a word with no term is ignored", async () => {
    const client = createMockWordSetsClient(mockDb());
    await client.addWord("ws_it", { term: "  kanban ", az: "kanban" });
    await client.addWord("ws_it", { term: "   " });
    const words = (await setOf(client, "ws_it")).words;
    expect(words.at(-1)).toMatchObject({ term: "kanban", az: "kanban" });
    expect(words).toHaveLength(7);
  });

  it("edits and deletes a word by its id", async () => {
    const client = createMockWordSetsClient(mockDb());
    await client.updateWord("ws_it", "1", { az: "göndərmək" });
    expect((await setOf(client, "ws_it")).words[1]).toMatchObject({ term: "ship", az: "göndərmək" });

    await client.deleteWord("ws_it", "0");
    const words = (await setOf(client, "ws_it")).words;
    expect(terms(words)).not.toContain("deploy");
    expect(words[0]).toMatchObject({ id: "0", term: "ship" });
  });

  it("creates a set inside another, renames it and changes its level; a blank title is ignored", async () => {
    const client = createMockWordSetsClient(mockDb());
    await client.create({ parentId: "wf_it", title: "DevOps", level: "B2" });
    const devops = (await client.list()).find((s) => s.title === "DevOps");
    expect(devops).toMatchObject({ parentId: "wf_it", level: "B2", words: [] });

    await client.update(devops.id, { title: "" });
    await client.update(devops.id, { title: "DevOps words", level: "C1" });
    expect(await setOf(client, devops.id)).toMatchObject({ title: "DevOps words", level: "C1" });
  });

  it("deleting a set deletes the sets inside it", async () => {
    const client = createMockWordSetsClient(mockDb());
    await client.remove("wf_it");
    const ids = (await client.list()).map((s) => s.id);
    expect(ids).not.toContain("wf_it");
    expect(ids).not.toContain("ws_it");
  });

  it("gives a set's words and every word below it — what assigning hands out", async () => {
    const client = createMockWordSetsClient(mockDb());
    expect(terms(await client.wordsOf("wf_it"))).toEqual(["deploy", "ship", "release", "bug", "merge", "rollback"]);
    expect(await client.wordsOf("no-such-set")).toBeNull();
  });
});

describe("word sets — HTTP client (docs/openapi.yaml: Library — word sets)", () => {
  it("teacher: calls the library endpoints, words by their id", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpWordSetsClient(api);
    await client.list();
    await client.create({ parentId: "wf_it", title: "DevOps", level: "B2" });
    await client.update("ws1", { level: "C1" });
    await client.remove("ws1");
    await client.addWord("ws1", { term: "kanban" });
    await client.updateWord("ws1", "w7", { az: "kanban" });
    await client.deleteWord("ws1", "w7");
    await client.wordsOf("ws1");
    expect(calls).toEqual([
      { method: "GET", path: "/library/word-sets" },
      { method: "POST", path: "/library/word-sets", body: { parentId: "wf_it", title: "DevOps", level: "B2" } },
      { method: "PATCH", path: "/library/word-sets/ws1", body: { level: "C1" } },
      { method: "DELETE", path: "/library/word-sets/ws1" },
      { method: "POST", path: "/library/word-sets/ws1/words", body: { term: "kanban" } },
      { method: "PATCH", path: "/library/word-sets/ws1/words/w7", body: { az: "kanban" } },
      { method: "DELETE", path: "/library/word-sets/ws1/words/w7" },
      { method: "GET", path: "/library/word-sets/ws1/words?includeBelow=true" },
    ]);
  });

  it("student: reads only an assigned set's words, through /me", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpWordSetsClient(api, { audience: "student" });
    expect(await client.list()).toEqual([]);
    await client.wordsOf("ws1");
    expect(calls).toEqual([{ method: "GET", path: "/me/library/word-sets/ws1/words" }]);
  });

  it("treats a set the student wasn't given (403) as null", async () => {
    const { api } = recordingApi({ "GET /me/library/word-sets/ws1/words": new ApiError("forbidden", "Not assigned") });
    expect(await createHttpWordSetsClient(api, { audience: "student" }).wordsOf("ws1")).toBeNull();
  });
});
