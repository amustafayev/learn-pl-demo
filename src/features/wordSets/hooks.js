import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockWordSetsClient } from "./client.js";

/* The UI's one door to word sets: the Library's Word sets tab, picking a
   set to assign, the word games, and a student's assigned set. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpWordSetsClient(api, { audience }) here —
// "student" in the student app.
function useWordSetsSource() {
  const { source, revision } = useMockSource((s) => [s.wordSets]);
  const client = useMemo(() => createMockWordSetsClient(source), [source]);
  return { client, revision };
}

// Every word set (flat — the tree is `parentId`), and its writes.
export function useWordSets() {
  const { client, revision } = useWordSetsSource();
  const { data, loading, refresh } = useLoad(() => client.list(), "sets", revision);
  const sets = useMemo(() => data || [], [data]);
  const actions = useMemo(() => ({
    createSet: (parentId, title, level) => client.create({ parentId, title, level }).then(refresh),
    updateSet: (id, patch) => client.update(id, patch).then(refresh),
    deleteSet: (id) => client.remove(id).then(refresh),
    addWord: (setId, word) => client.addWord(setId, word).then(refresh),
    updateWord: (setId, wordId, patch) => client.updateWord(setId, wordId, patch).then(refresh),
    deleteWord: (setId, wordId) => client.deleteWord(setId, wordId).then(refresh),
  }), [client, refresh]);
  return { sets, loading, ...actions };
}

// One set's words and everything below it, or null once it turns out to be
// missing — what a student was given when the set was assigned.
export function useWordSetWords(setId) {
  const { client, revision } = useWordSetsSource();
  const { data, loading } = useLoad(() => (setId ? client.wordsOf(setId) : Promise.resolve(null)), setId || "none", revision);
  return { words: data || null, loading };
}
