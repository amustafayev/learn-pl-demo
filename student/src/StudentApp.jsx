import React, { useEffect, useMemo, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  IconHome2, IconNotes, IconLayoutGrid, IconUserPlus, IconSchool, IconLogout, IconSun, IconMoon, IconSparkles, IconBell, IconClipboardList,
} from "@tabler/icons-react";
import { StoreProvider, studentView, signedOutView } from "@app/store.jsx";
import { useTheme } from "@app/theme.js";
import { Avatar, CountBadge, NavItem, NavSectionLabel, SegmentedToggle } from "@app/design-system.jsx";
import { ToastProvider, useToast } from "@app/toasts.jsx";
import { ErrorBoundary } from "@app/components/ErrorBoundary.jsx";
import { useMyNotes } from "@app/features/notes/index.js";
import { useMe, useSignIn } from "@app/features/account/index.js";
import { useMyClasses } from "@app/features/learning/index.js";
import { useMyPurchases } from "@app/features/sales/index.js";
import { SeenProvider, useSeen, useStudentSession } from "./session.jsx";
import { teacherName } from "./lib.js";
import SignIn from "./views/SignIn.jsx";
import Home from "./views/Home.jsx";
import ClassPage from "./views/ClassPage.jsx";
import LessonPage from "./views/LessonPage.jsx";
import Notes from "./views/Notes.jsx";
import { Catalog, CoursePage } from "./views/Courses.jsx";
import JoinClass from "./views/JoinClass.jsx";
import { WorkList, WorkPage } from "./views/Work.jsx";
import { useMyWork } from "@app/features/assignments/index.js";

/* =========================================================================
   The student app — its own package (student/), served at /student/, on
   the teacher app's design system and mock db (`@app/…` is src/). Screens
   get their data only through the features' hooks (@app/features/…/index.js);
   this file is where the mock is plugged in. What a student can see and
   open is decided by the data layer, not here: studentView scopes the data
   like a student API would, canOpenLesson is the access rule,
   notesSentToStudent says which notes reach them. See "The student app" in
   CLAUDE.md.
   ========================================================================= */

export default function StudentApp() {
  const [studentId, setStudentId] = useStudentSession();
  const scope = useMemo(() => (studentId ? (db) => studentView(db, studentId) : signedOutView), [studentId]);
  return (
    <BrowserRouter basename="/student">
      <ToastProvider>
        <StoreProvider scope={scope} keepComponentBank={false}>
          {/* A new session starts every screen afresh, so none outlives the
              student it was showing. */}
          <Gate key={studentId || "signed-out"} onSignIn={setStudentId} onSignOut={() => setStudentId(null)} />
        </StoreProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

function Gate({ onSignIn, onSignOut }) {
  const { me, loading } = useMe();
  const { logout } = useSignIn();
  const signOut = () => { logout(); onSignOut(); };
  if (loading) return null;
  return me
    ? <SeenProvider key={me.id} studentId={me.id}><Shell onSignOut={signOut} /></SeenProvider>
    : <SignIn onSignIn={onSignIn} />;
}

const NAV = [
  { path: "/", label: "Home", icon: IconHome2, active: (p) => p === "/" },
  { path: "/work", label: "My work", icon: IconClipboardList, active: (p) => p.startsWith("/work") },
  { path: "/notes", label: "Notes", icon: IconNotes, active: (p) => p.startsWith("/notes") },
  { path: "/courses", label: "Courses", icon: IconLayoutGrid, active: (p) => p.startsWith("/courses") },
  { path: "/join", label: "Join a class", icon: IconUserPlus, active: (p) => p.startsWith("/join") },
];

const LIGHT_DARK_OPTIONS = [
  { id: "light", label: <span className="inline-flex items-center gap-1.5"><IconSun size={14} stroke={1.75} /> Light</span> },
  { id: "dark", label: <span className="inline-flex items-center gap-1.5"><IconMoon size={14} stroke={1.75} /> Dark</span> },
];

function Shell({ onSignOut }) {
  const { pathname } = useLocation();
  useLiveUpdates();
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 flex font-sans">
      <Sidebar pathname={pathname} onSignOut={onSignOut} />
      <main className="flex-1 overflow-y-auto h-screen">
        <TopBar pathname={pathname} />
        <div key={pathname.split("/")[1] || "home"} className="animate-fade-rise">
          <ErrorBoundary resetKey={pathname} className="p-5 sm:p-8 max-w-3xl" title="This page couldn't be displayed">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/work" element={<WorkList />} />
              <Route path="/work/:assignmentId" element={<WorkPage />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/courses" element={<Catalog />} />
              <Route path="/courses/:courseId" element={<CoursePage />} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
              <Route path="/classes/:classId" element={<ClassPage />} />
              <Route path="/classes/:classId/lessons/:lessonId" element={<LessonPage />} />
              <Route path="/join" element={<JoinClass />} />
              <Route path="/join/:token" element={<JoinClass />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

// Same rail as the teacher app: icon-only under sm, labeled from sm up. The
// student's classes get their own section, so any of them is one click away.
function Sidebar({ pathname, onSignOut }) {
  const navigate = useNavigate();
  const { seen } = useSeen();
  const { notes } = useMyNotes();
  const [theme, setTheme] = useTheme();
  const unseen = notes.filter((n) => !seen.has(n.id)).length;
  // A count on the items with something waiting: new notes, open work.
  const { open: openWork } = useMyWork();
  const counts = { "/notes": unseen, "/work": openWork.length };
  const { active: classes } = useMyClasses();
  const label = (text) => <span className="hidden sm:inline">{text}</span>;
  return (
    <aside className="w-16 sm:w-64 shrink-0 bg-neutral-50 flex flex-col h-screen sticky top-0 overflow-hidden">
      <div className="h-16 flex items-center gap-2.5 px-4">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white shrink-0"><IconSparkles size={18} stroke={1.75} /></div>
        <div className="hidden sm:block leading-none min-w-0">
          <div className="font-bold tracking-tight text-neutral-950 truncate">Lucid</div>
          <div className="text-[11px] text-neutral-500 mt-0.5 truncate">for students</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <NavSectionLabel><span className="hidden sm:inline">Main Menu</span></NavSectionLabel>
        {NAV.map((n) => (
          <NavItem key={n.path} icon={n.icon} active={n.active(pathname)} onClick={() => navigate(n.path)}
            label={counts[n.path]
              ? <span className="hidden sm:flex items-center justify-between gap-2" title={`${counts[n.path]} ${n.path === "/notes" ? "new" : "to do"}`}>{n.label} <CountBadge active={n.active(pathname)}>{counts[n.path]}</CountBadge></span>
              : label(n.label)} />
        ))}
        {classes.length > 0 && (
          <>
            <NavSectionLabel><span className="hidden sm:inline">My classes</span></NavSectionLabel>
            {classes.map((c) => (
              <NavItem key={c.id} icon={IconSchool} label={<span className="hidden sm:inline truncate">{c.name}</span>}
                active={pathname.startsWith(`/classes/${c.id}`)} onClick={() => navigate(`/classes/${c.id}`)} />
            ))}
          </>
        )}
      </nav>
      <div className="px-3 py-2">
        <NavItem icon={IconLogout} label={label("Sign out")} onClick={onSignOut} />
        <div className="hidden sm:block mt-2">
          <SegmentedToggle value={theme} options={LIGHT_DARK_OPTIONS} onChange={setTheme} />
        </div>
        <div className="sm:hidden" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <NavItem icon={theme === "dark" ? IconSun : IconMoon} label={<span className="hidden">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ pathname }) {
  const { me } = useMe();
  const { seen } = useSeen();
  const navigate = useNavigate();
  const section = pathname.split("/")[1];
  const title = { "": "Home", work: "My work", notes: "Notes", courses: "Courses", classes: "My classes", join: "Join a class" }[section] || "Home";
  const { notes } = useMyNotes();
  const unseen = notes.some((n) => !seen.has(n.id));
  return (
    <div className="h-16 bg-neutral-50/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 gap-4">
      <div className="text-lg font-bold text-neutral-950 shrink-0">{title}</div>
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => navigate("/notes")} title={unseen ? "New notes from your teacher" : "Notes"} aria-label="Notes"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-400 text-neutral-500 hover:border-neutral-500 hover:text-neutral-900">
          <IconBell size={18} stroke={1.75} />{unseen && <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-warning-500" />}
        </button>
        <div className="hidden sm:flex items-center gap-2.5 pl-3">
          <Avatar name={me?.name || ""} color="primary" size="sm" />
          <div className="leading-none">
            <div className="text-sm font-semibold text-neutral-950">{me?.name}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{me?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// What the teacher just did, as it arrives (from the teacher app's tab, via
// the mock server's push — src/db/mockSync.js): a note sent, work assigned,
// a join request accepted, a lesson shared, a purchase confirmed. Nothing counts as new
// until this tab has caught up with the others (a fresh tab starts from the
// seed and then receives the real data — that isn't news); from then on it
// compares against what was already there. Each list comes through its own
// feature door, and each says `stale` until it reflects the latest data
// (with the mock: also until this tab has caught up), so nothing is compared
// until all of them have.
function useLiveUpdates() {
  const toast = useToast();
  const { notes: myNotes, stale: notesStale } = useMyNotes();
  const { work: myWork, stale: workStale } = useMyWork();
  const { active: classes, stale: classesStale } = useMyClasses();
  const { purchases, stale: purchasesStale } = useMyPurchases();
  const before = useRef(null);
  useEffect(() => {
    if (notesStale || workStale || classesStale || purchasesStale) return;
    const classById = (id) => classes.find((c) => c.id === id);
    const now = {
      notes: new Set(myNotes.map((n) => n.id)),
      work: new Set(myWork.map((a) => a.id)),
      classes: new Set(classes.map((c) => c.id)),
      shared: new Set(classes.flatMap((c) => c.courses.flatMap((x) => (x.releasedLessonIds || []).map((l) => `${c.id}:${x.courseId}:${l}`)))),
      bought: new Set(purchases.filter((p) => p.status === "paid").map((p) => p.courseId)),
    };
    const prev = before.current;
    before.current = now;
    if (!prev) return;
    const fresh = (key) => [...now[key]].filter((x) => !prev[key].has(x));
    const notes = myNotes.filter((n) => !prev.notes.has(n.id));
    if (notes.length === 1) {
      toast(`New note from ${teacherName(classById(notes[0].classId)?.teacher)}: “${notes[0].text.length > 60 ? `${notes[0].text.slice(0, 57)}…` : notes[0].text}”`);
    } else if (notes.length > 1) toast(`${notes.length} new notes from your teacher`);
    const work = myWork.filter((a) => !prev.work.has(a.id) && a.status === "assigned");
    if (work.length === 1) toast(`New work from ${work[0].teacher?.name || "your teacher"}: “${work[0].title}”`);
    else if (work.length > 1) toast(`${work.length} new pieces of work from your teacher`);
    fresh("classes").forEach((id) => toast(`You're in ${classById(id)?.name} now`));
    const joinedNow = new Set(fresh("classes"));
    fresh("shared").filter((k) => !joinedNow.has(k.split(":")[0])).forEach((k) => {
      const [classId, courseId, lessonId] = k.split(":");
      const cls = classById(classId);
      const lesson = cls?.courses.find((x) => x.courseId === courseId)?.progress?.lessons.find((l) => l.id === lessonId);
      if (lesson) toast(`Lesson ${lesson.n} is open in ${cls.name}`);
    });
    fresh("bought").forEach((id) => toast(`Payment confirmed — ${purchases.find((p) => p.courseId === id)?.course?.title} is yours`));
  }, [toast, myNotes, notesStale, myWork, workStale, classes, classesStale, purchases, purchasesStale]);
}
