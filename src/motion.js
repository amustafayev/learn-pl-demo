/* =========================================================================
   Motion — the JS half of the token layer declared in `index.css`.

   Every duration, easing and keyframe is declared exactly once, in
   `index.css`'s `@theme` block. CSS consumes them directly as Tailwind
   utilities. This file exists only for the handful of cases that need the
   same value as a *number* at runtime — an element has to stay mounted at
   least as long as its exit animation, and a timer can't read a CSS class —
   so it reads those very custom properties back rather than keeping a second
   copy that would silently drift out of sync.

   Nothing here declares a timing of its own. If you need to retune motion,
   edit `index.css`.
   ========================================================================= */
import { useEffect, useRef, useState } from "react";

// Token names, so no call site ever spells a custom property by hand.
export const MOTION = {
  fast: "--dur-fast",
  base: "--dur-base",
  slow: "--dur-slow",
  deliberate: "--dur-deliberate",
  toastLife: "--dur-toast-life",
};

const msCache = new Map();

// Raw read of a duration token, in ms. Use this for timing that isn't
// motion — e.g. how long a toast stays readable — where a reduced-motion
// preference must NOT shorten it.
export function cssMs(token) {
  if (msCache.has(token)) return msCache.get(token);
  const raw =
    typeof document === "undefined"
      ? ""
      : getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ms = raw.endsWith("ms")
    ? Number.parseFloat(raw)
    : raw.endsWith("s")
      ? Number.parseFloat(raw) * 1000
      : Number.NaN;
  // Only cache a real hit — a read before the stylesheet lands shouldn't
  // pin 0 for the rest of the session.
  if (Number.isFinite(ms)) msCache.set(token, ms);
  return Number.isFinite(ms) ? ms : 0;
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

// Duration of an actual animation. Collapses to 0 when the OS asks for
// reduced motion, mirroring what `index.css` does to the CSS side — so an
// unmount never waits on an animation that isn't going to play.
export function motionMs(token) {
  return prefersReducedMotion() ? 0 : cssMs(token);
}

// Keeps content mounted long enough for its exit animation to finish.
// `open` drives the animation classes; the returned flag drives mounting.
export function usePresence(open, token = MOTION.slow) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), motionMs(token));
    return () => clearTimeout(t);
  }, [open, token]);
  return mounted;
}

// The list flavour: an item that disappears from `items` keeps rendering,
// flagged `exiting`, until its out-animation has had time to run. Positions
// are preserved so a departing row fades where it stands instead of jumping
// to the end of the stack first. Items are matched by `id`.
export function usePresenceList(items, token = MOTION.slow) {
  const [entries, setEntries] = useState(() =>
    items.map((item) => ({ key: item.id, item, exiting: false })),
  );
  const timer = useRef(null);

  useEffect(() => {
    setEntries((prev) => {
      const live = new Map(items.map((it) => [it.id, it]));
      const known = new Set(prev.map((e) => e.key));
      const kept = prev.map((e) =>
        live.has(e.key)
          ? { key: e.key, item: live.get(e.key), exiting: false }
          : { ...e, exiting: true },
      );
      const added = items
        .filter((it) => !known.has(it.id))
        .map((it) => ({ key: it.id, item: it, exiting: false }));
      return [...kept, ...added];
    });
  }, [items]);

  useEffect(() => {
    if (!entries.some((e) => e.exiting)) return;
    timer.current = setTimeout(
      () => setEntries((prev) => prev.filter((e) => !e.exiting)),
      motionMs(token),
    );
    return () => clearTimeout(timer.current);
  }, [entries, token]);

  return entries;
}
