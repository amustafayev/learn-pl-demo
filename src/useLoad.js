import { useEffect, useReducer, useState } from "react";

/* Loads data for a feature hook (see "Features" in CLAUDE.md) from an async
   source — the mock client today, the API later.
     data      the latest answer; kept while a refresh is on its way, so
               nothing on screen blinks or remounts
     loading   true until there's an answer for the current `key`
     stale     true while the answer for the latest `revision` is still on
               its way (for code that compares old and new data)
     refresh() asks again — call it after a write
   `load` is read when `key`, `revision` or a refresh changes; give a new
   `key` whenever it would ask for something else. */
export function useLoad(load, key, revision) {
  const [answer, setAnswer] = useState({ key: undefined, revision: undefined, data: undefined, error: null });
  const [version, refresh] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    let live = true;
    load().then(
      (data) => { if (live) setAnswer({ key, revision, data, error: null }); },
      (error) => { if (live) setAnswer((prev) => ({ key, revision, data: prev.key === key ? prev.data : undefined, error })); },
    );
    return () => { live = false; };
    // `load` is a new function every render; `key` says what it asks for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision, version]);
  const current = answer.key === key;
  return {
    data: current ? answer.data : undefined,
    loading: !current,
    stale: !current || answer.revision !== revision,
    error: current ? answer.error : null,
    refresh,
  };
}
