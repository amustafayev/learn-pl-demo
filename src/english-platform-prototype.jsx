import React, { useCallback, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  IconHome2, IconLayoutGrid, IconSchool, IconBooks, IconCertificate, IconUsers, IconSparkles, IconBrain,
  IconSettings2, IconHelpCircle, IconSun, IconMoon, IconLogout, IconChevronLeft, IconChevronRight,
} from "@tabler/icons-react";
import { StoreProvider } from "./store.jsx";
import { ToastProvider } from "./toasts.jsx";
import { useMe } from "./features/account/index.js";
import { useRoster } from "./features/students/index.js";
import { Bridge, TAB_PATH, tabForPath } from "./router.jsx";
import { useTheme } from "./theme.js";
import { Page, NavItem, AccountMenu, AccountMenuItem, AccountMenuDivider, SegmentedToggle, ComingSoon, CountBadge } from "./design-system.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import Dashboard from "./views/Dashboard.jsx";
import { CoursesView, CourseView, LessonBuilderView } from "./views/Courses.jsx";
import Classes from "./views/Classes.jsx";
import Homework from "./views/Homework.jsx";
import HomeworkEdit from "./views/HomeworkEdit.jsx";
import HomeworkDetail from "./views/HomeworkDetail.jsx";
import PartStudio from "./views/parts.jsx";
import Library from "./views/Library.jsx";
import { StudentsView, StudentDetail } from "./views/Students.jsx";
import Insights from "./views/Insights.jsx";
import LevelTests from "./views/LevelTests.jsx";
import { LoginPage, SignupPage } from "./views/Auth.jsx";
import Settings from "./views/Settings.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: IconHome2 },
  { id: "courses", label: "Courses", icon: IconLayoutGrid },
  { id: "classes", label: "Classes", icon: IconSchool },
  { id: "library", label: "Library", icon: IconBooks },
  { id: "students", label: "Students", icon: IconUsers },
  { id: "levelTests", label: "Level tests", icon: IconCertificate },
  { id: "insights", label: "AI Insights", icon: IconBrain },
];

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <StoreProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </StoreProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

function AppShell() {
  const { pathname } = useLocation();
  // Manual override on top of the existing responsive w-16/w-64 breakpoint —
  // a teacher on a real desktop screen may still want the icon-only rail
  // (more room for a wide page like Block Studio's rail+canvas+add-panel),
  // not just whoever happens to be on a narrow viewport. Persisted so it
  // sticks across a reload rather than resetting every visit.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* prototype still works without storage */ }
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 flex font-sans">
      <Sidebar pathname={pathname} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main className="flex-1 overflow-y-auto h-screen">
        <TopBar pathname={pathname} />
        {/* Keyed on the top-level tab, not the full pathname: drilling from
            /courses into /courses/:id shouldn't remount the subtree and
            re-run its effects just to replay a 180ms entrance. */}
        <div key={tabForPath(pathname)} className="animate-fade-rise">
          <ErrorBoundary resetKey={pathname} className="p-5 sm:p-8 max-w-3xl" title="This page couldn't be displayed">
            <Content />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ pathname, collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  // `collapsed` is a manual override forcing icon-only at any width; without
  // it, the existing sm: breakpoint still decides (icon-only under sm,
  // labeled at sm+).
  const showLabels = !collapsed;
  const labelCls = showLabels ? "hidden sm:inline" : "hidden";
  // Waiting join/purchase requests, so the teacher sees them from any page.
  // Carried inside the label (not NavItem's `count`) so it hides with the
  // label in the icon-only rail instead of overflowing it.
  const { roster } = useRoster();
  const pending = { students: roster.requests.length };
  return (
    // A width transition, deliberately, despite the app's own "never
    // animate width" rule (see CLAUDE.md's Motion section): that rule is
    // about a property that re-fires on every hover/press/list-render:
    // real jank. A sidebar collapse is a single, rare, user-initiated
    // click — exactly the case every desktop app with a foldable sidebar
    // (VS Code, Slack, Notion) already animates this same way, and leaving
    // it an instant snap read as broken rather than restrained.
    <aside className={`${collapsed ? "w-16" : "w-16 sm:w-64"} shrink-0 bg-neutral-50 flex flex-col h-screen sticky top-0 transition-[width] duration-(--dur-base) ease-soft-out overflow-hidden`}>
      <div className="h-16 flex items-center gap-2.5 px-4">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white shrink-0"><IconSparkles size={18} stroke={1.75} /></div>
        {showLabels && (
          <div className="hidden sm:block leading-none min-w-0">
            <div className="font-bold tracking-tight text-neutral-950 truncate">Lucid</div>
            <div className="text-[11px] text-neutral-500 mt-0.5 truncate">for teachers</div>
          </div>
        )}
      </div>
      {/* Only meaningful once a screen is wide enough that the sm:
          breakpoint would otherwise force the labeled w-64 rail — on a
          genuinely narrow viewport the responsive icon-only mode already
          applies and there's nothing to toggle. */}
      <div className="hidden sm:flex px-3 pb-1 justify-end">
        <button onClick={onToggleCollapse} title={collapsed ? "Expand menu" : "Collapse menu"}
          className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg p-1.5 transition-colors duration-(--dur-fast) outline-none focus:ring-2 focus:ring-primary-100">
          {collapsed ? <IconChevronRight size={16} stroke={1.75} /> : <IconChevronLeft size={16} stroke={1.75} />}
        </button>
      </div>
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {NAV.map((n) => (
          <NavItem key={n.id} icon={n.icon} collapsed={collapsed}
            label={pending[n.id]
              ? <span className={showLabels ? "hidden sm:flex items-center justify-between gap-2" : "hidden"} title={`${pending[n.id]} waiting for you`}>
                  {n.label} <CountBadge active={pathname.startsWith(TAB_PATH[n.id])}>{pending[n.id]}</CountBadge>
                </span>
              : <span className={labelCls}>{n.label}</span>}
            active={pathname.startsWith(TAB_PATH[n.id])} onClick={() => navigate(TAB_PATH[n.id])} />
        ))}
      </nav>
    </aside>
  );
}

const LIGHT_DARK_OPTIONS = [
  { id: "light", label: <span className="inline-flex items-center gap-1.5"><IconSun size={14} stroke={1.75} /> Light</span> },
  { id: "dark", label: <span className="inline-flex items-center gap-1.5"><IconMoon size={14} stroke={1.75} /> Dark</span> },
];

function TopBar({ pathname }) {
  const { me } = useMe();
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const titles = {
    dashboard: "Dashboard", courses: "Courses", classes: "Classes", library: "Library", students: "Students",
    levelTests: "Level tests", insights: "AI Insights", settings: "Setting", help: "Help & Support",
  };
  return (
    <div className="h-16 bg-neutral-50/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 gap-4">
      <div className="text-lg font-bold text-neutral-950 shrink-0">{titles[tabForPath(pathname)]}</div>
      <div className="flex items-center gap-3 shrink-0">
        <AccountMenu name={me?.name || ""} email={me?.email || ""}>
          <AccountMenuItem icon={IconSettings2} onClick={() => navigate("/settings/account/profile")}>Setting</AccountMenuItem>
          <AccountMenuItem icon={IconHelpCircle} onClick={() => navigate("/help")}>Help &amp; Support</AccountMenuItem>
          <div className="px-1.5 py-1.5"><SegmentedToggle value={theme} options={LIGHT_DARK_OPTIONS} onChange={setTheme} /></div>
          <AccountMenuDivider />
          <AccountMenuItem icon={IconLogout} tone="danger" onClick={() => navigate("/login")}>Sign out</AccountMenuItem>
        </AccountMenu>
      </div>
    </div>
  );
}

// A student's own URL always carries a `:section` (overview/words/…) —
// landing on just `/students/:studentId` picks the default one.
function StudentOverviewRedirect() {
  const { studentId } = useParams();
  return <Navigate to={`/students/${studentId}/profile`} replace />;
}

function Content() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Bridge tab="dashboard"><Dashboard /></Bridge>} />

      <Route path="/courses" element={<Bridge tab="courses"><CoursesView /></Bridge>} />
      <Route path="/courses/:courseId" element={<Bridge tab="courses"><CourseView /></Bridge>} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<Bridge tab="courses"><LessonBuilderView /></Bridge>} />
      <Route path="/courses/:courseId/lessons/:lessonId/parts/:partId" element={<Bridge tab="courses"><PartStudio /></Bridge>} />

      {/* Homework is its own page (views/Homework.jsx), not part of Classes.jsx */}
      <Route path="/classes/:classId/homework/new" element={<Bridge tab="classes"><HomeworkEdit /></Bridge>} />
      <Route path="/classes/:classId/homework/:homeworkId/edit" element={<Bridge tab="classes"><HomeworkEdit /></Bridge>} />
      <Route path="/classes/:classId/homework/:homeworkId" element={<Bridge tab="classes"><HomeworkDetail /></Bridge>} />
      <Route path="/classes/:classId/homework" element={<Bridge tab="classes"><Homework /></Bridge>} />
      <Route path="/classes/*" element={<Bridge tab="classes"><Classes /></Bridge>} />

      <Route path="/library/*" element={<Bridge tab="library"><Library /></Bridge>} />

      <Route path="/students" element={<Bridge tab="students"><StudentsView /></Bridge>} />
      <Route path="/students/:studentId" element={<StudentOverviewRedirect />} />
      <Route path="/students/:studentId/:section" element={<Bridge tab="students"><StudentDetail /></Bridge>} />

      <Route path="/level-tests" element={<Bridge tab="levelTests"><LevelTests /></Bridge>} />
      <Route path="/insights" element={<Bridge tab="insights"><Insights /></Bridge>} />

      <Route path="/settings/*" element={<Bridge tab="settings"><Settings /></Bridge>} />
      <Route path="/help" element={
        <Bridge tab="help">
          <Page><ComingSoon icon={IconHelpCircle} title="Help & support — coming soon" sub="Docs, FAQs, and a way to reach the Lucid team will live here." /></Page>
        </Bridge>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
