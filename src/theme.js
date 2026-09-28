/* =========================================================================
   Light/dark theme — a UI preference, not app data, so it lives here rather
   than in the mock db. The colors themselves are all in `index.css` (the
   `:root[data-theme="dark"]` block); this file only decides which one is on.

   `index.html` sets `data-theme` with an inline script before first paint
   (so a dark-mode reload never flashes white); this hook picks up whatever
   that script decided and takes over from there. An explicit choice is
   remembered; with none, the OS preference wins and keeps winning if the
   OS setting changes.
   ========================================================================= */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "theme";
const THEMES = ["light", "dark"];

function stored() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(t) ? t : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => document.documentElement.dataset.theme || stored() || systemTheme(),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Follow the OS only until the user has picked one themselves.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => { if (!stored()) setThemeState(systemTheme()); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t) => {
    if (!THEMES.includes(t)) return;
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* still switches, just won't persist */ }
    setThemeState(t);
  }, []);

  return [theme, setTheme];
}
