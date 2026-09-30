import React, { createContext, useCallback, useContext, useState } from "react";

/* Who's signed in, and which notes they've already seen. Both are per-viewer
   conveniences, not app data, so they live in the browser, never in the
   mock db. */

// Per tab (sessionStorage), so two tabs can be two different students. A
// stand-in for a real login token.
const SESSION_KEY = "lucid.student.session";

export function useStudentSession() {
  const [id, setId] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  });
  const set = useCallback((next) => {
    try {
      if (next) sessionStorage.setItem(SESSION_KEY, next); else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* still signs in, just not across a reload */ }
    setId(next);
  }, []);
  return [id, set];
}

// Seen notes, per student — what drives the "New" badges and the count on
// Notes in the sidebar.
const SeenCtx = createContext(null);
const seenKey = (studentId) => `lucid.student.seen-notes:${studentId}`;

export function SeenProvider({ studentId, children }) {
  const [seen, setSeen] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey(studentId)) || "[]")); } catch { return new Set(); }
  });
  const markSeen = useCallback((ids) => {
    setSeen((prev) => {
      if (ids.every((id) => prev.has(id))) return prev;
      const next = new Set([...prev, ...ids]);
      try { localStorage.setItem(seenKey(studentId), JSON.stringify([...next])); } catch { /* badges just reset next visit */ }
      return next;
    });
  }, [studentId]);
  return <SeenCtx.Provider value={{ seen, markSeen }}>{children}</SeenCtx.Provider>;
}

export function useSeen() {
  const ctx = useContext(SeenCtx);
  if (!ctx) throw new Error("useSeen must be used inside <SeenProvider>");
  return ctx;
}
