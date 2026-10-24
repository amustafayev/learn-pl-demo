import { useMemo, useRef } from "react";
import { useStore, copyWithOwnH5P, discardH5PContent } from "../../store.jsx";
import { useToast } from "../../toasts.jsx";
import { useLoad } from "../../useLoad.js";
import { createMockSavedComponentsClient } from "./client.js";

/* The UI's one door to saved components: Library → Saved, saving from a
   lesson (Block Studio, the course tree), and inserting a saved one into a
   block or a homework post. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpSavedComponentsClient(api) here.
function useSavedComponentsSource() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const latest = useRef(state);
  latest.current = state;
  const client = useMemo(() => createMockSavedComponentsClient({ getState: () => latest.current, dispatch }), [dispatch]);
  const revision = useMemo(() => [state.componentBank], [state.componentBank]);
  return { client, revision, toast };
}

export function useSavedComponents() {
  const { client, revision, toast } = useSavedComponentsSource();
  const { data, loading, refresh } = useLoad(() => client.list(), "saved", revision);
  const items = useMemo(() => data || [], [data]);
  const actions = useMemo(() => ({
    // Saves a snapshot that owns its own H5P content, so it never changes
    // with the lesson it came from. Resolves false if the H5P copy failed
    // (the teacher was already told).
    async save(component, title, from) {
      const snapshot = await copyWithOwnH5P(toast, component);
      if (!snapshot) return false;
      await client.save({ component: snapshot, title, from });
      toast(`“${title}” saved`);
      refresh();
      return true;
    },
    // Removing also deletes the H5P content only this saved item owned.
    async remove(item) {
      discardH5PContent(toast, item);
      await client.remove(item.id);
      toast(`“${item.title}” removed from Saved`);
      refresh();
    },
  }), [client, toast, refresh]);
  return { items, loading, ...actions };
}
