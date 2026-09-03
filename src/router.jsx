import React, { useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { NavProvider } from "./store.jsx";

/* =========================================================================
   Real URL routing, with a compatibility shim so every already-written page
   keeps calling `const { route, go } = useNav()` exactly as before — no page
   had to be rewritten to adopt real URLs. `Bridge` reconstructs the same
   `route` shape the old useState-based router produced (tab/courseId/
   classId/lessonId/partId/studentId/filter) from the actual matched URL
   params + query string, and `go(patch)` reproduces the old merge semantics
   before turning the result into a real path via `buildPath`.

   Library and Students' per-student tabs manage their OWN nested routing
   directly with react-router hooks (see Library.jsx / Students.jsx) instead
   of going through this shim, since that navigation is page-internal, not a
   top-level resource — that's the "decouple" half of this: shared surface
   for cross-page navigation, local router calls for a page's own sub-nav.
   ========================================================================= */

// tab id -> its base path, single source of truth for both the sidebar
// links and buildPath below, so the two can never drift apart.
export const TAB_PATH = {
  dashboard: "/dashboard",
  courses: "/courses",
  classes: "/classes",
  library: "/library",
  students: "/students",
  levelTests: "/level-tests",
  insights: "/insights",
  settings: "/settings",
  help: "/help",
};

export function tabForPath(pathname) {
  if (pathname.startsWith("/courses")) return "courses";
  if (pathname.startsWith("/classes")) return "classes";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/students")) return "students";
  if (pathname.startsWith("/level-tests")) return "levelTests";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/help")) return "help";
  return "dashboard";
}

// Same merge rules the old useState-based `go` used: switching tab resets
// deep selection, and picking a different course drops any class carried
// over from a different one.
function mergeRoute(r, patch) {
  if (patch.tab && patch.tab !== r.tab) {
    return { tab: patch.tab, courseId: null, classId: null, lessonId: null, partId: null, studentId: null, filter: undefined, ...patch };
  }
  if (patch.courseId !== undefined && patch.courseId !== r.courseId && patch.classId === undefined) {
    return { ...r, classId: null, lessonId: null, partId: null, ...patch };
  }
  return { ...r, ...patch };
}

// Named path builders — one function per destination, each the single
// source of truth for that URL shape, the same way a real Xsolla project's
// `usePaths()` gives every settings page its own `xSettingsPath(id)`
// function instead of a path string-templated wherever it's needed.
// `buildPath` below is just a dispatcher over these; anything that needs a
// real href (not just a `go()` call) can import the specific builder it needs.
export const coursesPath = () => "/courses";
export const courseDetailPath = (courseId, classId) => `/courses/${courseId}${classId ? `?classId=${classId}` : ""}`;
export const lessonPath = (courseId, lessonId) => `/courses/${courseId}/lessons/${lessonId}`;
export const partPath = (courseId, lessonId, partId) => `/courses/${courseId}/lessons/${lessonId}/parts/${partId}`;
export const classesPath = () => "/classes";
export const classDetailPath = (classId) => `/classes/${classId}`;
export const studentsPath = (filter) => `/students${filter ? `?filter=${filter}` : ""}`;
export const studentDetailPath = (studentId, filter) => `/students/${studentId}/overview${filter ? `?filter=${filter}` : ""}`;

function buildPath(r) {
  switch (r.tab) {
    case "courses":
      if (r.partId) return partPath(r.courseId, r.lessonId, r.partId);
      if (r.lessonId) return lessonPath(r.courseId, r.lessonId);
      // classId here means "viewed through this class's progress" (set when
      // opening a course from its card on a Class page) — carried as a query
      // param since the course itself still lives at /courses/:courseId.
      if (r.courseId) return courseDetailPath(r.courseId, r.classId);
      return coursesPath();
    case "classes":
      return r.classId ? classDetailPath(r.classId) : classesPath();
    case "students":
      return r.studentId ? studentDetailPath(r.studentId, r.filter) : studentsPath(r.filter);
    default:
      return TAB_PATH[r.tab] || "/dashboard";
  }
}

// Wraps one matched route: rebuilds the shared `route` object from real URL
// params/query, and provides a `go(patch)` that merges onto it the same way
// the old in-memory router did, then navigates to the resulting real path.
export function Bridge({ tab, startLive, children }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const route = useMemo(() => ({
    tab,
    courseId: params.courseId || null,
    // classId comes from the URL param on /classes/:classId, or from the
    // ?classId= query when a course is opened "as" a specific class.
    classId: params.classId || searchParams.get("classId") || null,
    lessonId: params.lessonId || null,
    partId: params.partId || null,
    studentId: params.studentId || null,
    filter: searchParams.get("filter") || undefined,
  }), [tab, params.courseId, params.classId, params.lessonId, params.partId, params.studentId, searchParams]);

  const go = useCallback((patch) => navigate(buildPath(mergeRoute(route, patch))), [route, navigate]);

  return <NavProvider value={{ route, go, startLive }}>{children}</NavProvider>;
}
