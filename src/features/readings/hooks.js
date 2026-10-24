import { useMemo, useRef } from "react";
import { useStore } from "../../store.jsx";
import { useLoad } from "../../useLoad.js";
import { createMockReadingsClient } from "./client.js";

/* The UI's one door to reading texts and their folders: the Library's
   Reading tab, adding a text, and every passage in a lesson. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpReadingsClient(api, { audience }) here —
// "student" in the student app.
function useReadingsSource() {
  const { state, dispatch } = useStore();
  const latest = useRef(state);
  latest.current = state;
  const client = useMemo(() => createMockReadingsClient({ getState: () => latest.current, dispatch }), [dispatch]);
  const revision = useMemo(() => [state.texts, state.textFolders], [state.texts, state.textFolders]);
  return { client, revision };
}

// The folder tree, and its writes.
export function useReadingFolders() {
  const { client, revision } = useReadingsSource();
  const { data, loading, refresh } = useLoad(() => client.listFolders(), "folders", revision);
  const folders = useMemo(() => data || [], [data]);
  const actions = useMemo(() => ({
    createFolder: (parentId, name) => client.createFolder({ parentId, name }).then(refresh),
    renameFolder: (id, name) => client.renameFolder(id, name).then(refresh),
    deleteFolder: (id) => client.deleteFolder(id).then(refresh),
  }), [client, refresh]);
  return { folders, loading, ...actions };
}

// Every reading text, as summaries (no body) — for lists, pickers and
// labels. Open one with useReadingText.
export function useReadingTexts() {
  const { client, revision } = useReadingsSource();
  const { data, loading, refresh } = useLoad(() => client.listTexts(), "texts", revision);
  const texts = useMemo(() => data || [], [data]);
  const createText = useMemo(() => (input) => client.createText(input).then(refresh), [client, refresh]);
  return { texts, loading, createText };
}

// One text with its tagged body, or null once it turns out to be missing.
export function useReadingText(id) {
  const { client, revision } = useReadingsSource();
  const { data, loading } = useLoad(() => (id ? client.getText(id) : Promise.resolve(null)), id || "none", revision);
  return { text: data || null, loading };
}
