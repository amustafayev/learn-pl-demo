import { describe, expect, it } from "vitest";
import { descendantsOf, kidsOf, pathLabel, pathOf, subtreeWords } from "./libraryTree.js";

// IELTS → Linkers → Contrast, plus a second top-level set.
const nodes = [
  { id: "ielts", parentId: null, title: "IELTS", words: [{ term: "band" }] },
  { id: "linkers", parentId: "ielts", title: "Linkers", words: [{ term: "however" }, { term: "moreover" }] },
  { id: "contrast", parentId: "linkers", title: "Contrast", words: [{ term: "whereas" }] },
  { id: "travel", parentId: null, title: "Travel", words: [] },
];

describe("libraryTree", () => {
  it("kidsOf: the nodes directly under a parent (top level by default)", () => {
    expect(kidsOf(nodes).map((n) => n.id)).toEqual(["ielts", "travel"]);
    expect(kidsOf(nodes, "ielts").map((n) => n.id)).toEqual(["linkers"]);
  });

  it("descendantsOf: every node below, at any depth, not the node itself", () => {
    expect(descendantsOf(nodes, "ielts").map((n) => n.id)).toEqual(["linkers", "contrast"]);
    expect(descendantsOf(nodes, "contrast")).toEqual([]);
  });

  it("pathOf / pathLabel: root to node", () => {
    expect(pathOf(nodes, "contrast").map((n) => n.id)).toEqual(["ielts", "linkers", "contrast"]);
    expect(pathLabel(nodes, "contrast")).toBe("IELTS › Linkers › Contrast");
    expect(pathLabel(nodes, "missing")).toBe("");
  });

  it("pathLabel reads another name field (reading folders use `name`)", () => {
    const folders = [{ id: "a", parentId: null, name: "IT" }, { id: "b", parentId: "a", name: "Standups" }];
    expect(pathLabel(folders, "b", "name")).toBe("IT › Standups");
  });

  it("subtreeWords: a node's own words, then everything below, in tree order", () => {
    expect(subtreeWords(nodes, "ielts").map((w) => w.term)).toEqual(["band", "however", "moreover", "whereas"]);
    expect(subtreeWords(nodes, "missing")).toEqual([]);
  });
});
