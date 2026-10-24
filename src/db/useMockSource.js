import { useEffect, useMemo, useRef } from "react";
import { ApiError } from "./apiClient.js";
import { useStore } from "../store.jsx";

/* What a feature's mock client runs on (see "Features" in CLAUDE.md). Mock
   only: it goes when the mock db does, and each feature's hooks.js then
   builds its HTTP client instead.

     const { source, revision } = useMockSource((s) => [s.courses, s.lessons]);
     const client = useMemo(() => createMockCoursesClient(source), [source]);

   source.getState()    the signed-in user's slice of the mock db, as of the
                        last render (teacherView, or studentView in the
                        student app)
   source.dispatch(a)   a write
   source.waitFor(test) resolves with the state once test(state) holds —
                        how a mock write learns what it created, which a
                        real API simply returns. Rejects if it never does.
   revision             changes whenever one of the slices `pick` names
                        does — the hooks' cue to ask again, standing in for
                        the server's push. */
const WAIT_MS = 3000;

export function useMockSource(pick) {
  const { state, dispatch } = useStore();
  const latest = useRef(state);
  latest.current = state;

  const waiters = useRef(new Set());
  useEffect(() => {
    for (const w of [...waiters.current]) {
      if (w.test(state)) { waiters.current.delete(w); clearTimeout(w.timer); w.resolve(state); }
    }
  }, [state]);

  const source = useMemo(() => ({
    getState: () => latest.current,
    dispatch,
    waitFor: (test) => new Promise((resolve, reject) => {
      if (test(latest.current)) { resolve(latest.current); return; }
      const w = { test, resolve };
      w.timer = setTimeout(() => {
        waiters.current.delete(w);
        reject(new ApiError("not_applied", "That change didn't go through."));
      }, WAIT_MS);
      waiters.current.add(w);
    }),
  }), [dispatch]);

  // The same array object while every picked slice is unchanged.
  const picked = pick(state);
  const last = useRef(picked);
  if (picked.length !== last.current.length || picked.some((x, i) => x !== last.current[i])) last.current = picked;

  return { source, revision: last.current };
}
