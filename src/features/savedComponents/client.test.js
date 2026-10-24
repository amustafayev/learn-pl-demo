import { describe, expect, it } from "vitest";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpSavedComponentsClient, createMockSavedComponentsClient } from "./client.js";
import { savedFromDetail } from "./labels.js";

const quiz = () => ({ id: "c1", kind: "quiz", title: "Tenses quiz", items: [{ q: "I ___ home.", options: ["go", "goes"], answer: 0 }] });

describe("saved components — mock client", () => {
  it("lists the saved library", async () => {
    const items = await createMockSavedComponentsClient(mockDb()).list();
    expect(items.find((i) => i.id === "cb1")).toMatchObject({ title: "Wheel of Fortune — IT Standup Vocab", kind: "wheel" });
  });

  it("saves a snapshot, newest first, that later edits to the original don't change", async () => {
    const client = createMockSavedComponentsClient(mockDb());
    const original = quiz();
    await client.save({ component: original, title: "Tenses — Quiz", from: "IT English · Lesson 4" });
    original.items[0].q = "changed";

    const [newest] = await client.list();
    expect(newest).toMatchObject({ title: "Tenses — Quiz", kind: "quiz", from: "IT English · Lesson 4" });
    expect(newest.data.items[0].q).toBe("I ___ home.");
  });

  it("names an untitled save after the component", async () => {
    const client = createMockSavedComponentsClient(mockDb());
    await client.save({ component: quiz(), from: "Playground" });
    expect((await client.list())[0].title).toBe("Tenses quiz");
  });

  it("removes a saved item", async () => {
    const client = createMockSavedComponentsClient(mockDb());
    await client.remove("cb1");
    expect((await client.list()).some((i) => i.id === "cb1")).toBe(false);
  });
});

describe("saved components — HTTP client (docs/openapi.yaml: Saved components)", () => {
  it("calls the saved-components endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpSavedComponentsClient(api);
    await client.list();
    await client.save({ component: quiz(), title: "Tenses — Quiz", from: "IT English · Lesson 4" });
    await client.remove("s1");
    expect(calls).toEqual([
      { method: "GET", path: "/library/saved-components" },
      { method: "POST", path: "/library/saved-components", body: { component: quiz(), title: "Tenses — Quiz", from: "IT English · Lesson 4" } },
      { method: "DELETE", path: "/library/saved-components/s1" },
    ]);
  });
});

describe("savedFromDetail", () => {
  it("is the part of `from` after the course", () => {
    expect(savedFromDetail({ from: "IT English · Lesson 4" })).toBe("Lesson 4");
    expect(savedFromDetail({ from: "Playground" })).toBe("");
    expect(savedFromDetail({})).toBe("");
  });
});
