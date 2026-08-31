import React, { useCallback, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  IconHome2, IconLayoutGrid, IconSchool, IconBooks, IconCertificate, IconUsers, IconSparkles, IconBell, IconBrain, IconBroadcast,
} from "@tabler/icons-react";
import { StoreProvider } from "./store.jsx";
import { Bridge, TAB_PATH, tabForPath } from "./router.jsx";
import { ToastHost } from "./ui.jsx";
import { Button, NavItem, NavSectionLabel, Avatar } from "./design-system.jsx";
import { TEACHER } from "./data.jsx";
import Dashboard from "./views/Dashboard.jsx";
import { CoursesView, CourseView, LessonBuilderView } from "./views/Courses.jsx";
import Classes from "./views/Classes.jsx";
import PartStudio from "./views/parts.jsx";
import Library from "./views/Library.jsx";
import { StudentsView, StudentDetail } from "./views/Students.jsx";
import Insights from "./views/Insights.jsx";
import LevelTests from "./views/LevelTests.jsx";
import LiveSession from "./views/LiveSession.jsx";
import { LoginPage, SignupPage } from "./views/Auth.jsx";

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
      <StoreProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}

function AppShell() {
  const [live, setLive] = useState(null); // null | { courseId?, lessonId? }
  const startLive = useCallback((ctx) => setLive(ctx || {}), []);
  const endLive = useCallback(() => setLive(null), []);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 flex font-sans">
      <Sidebar pathname={pathname} />
      <main className="flex-1 overflow-y-auto h-screen">
        <TopBar pathname={pathname} onStartLive={() => startLive()} />
        <Content startLive={startLive} />
      </main>
      <ToastHost />
      {live && <LiveSession context={live} onEnd={endLive} />}
    </div>
  );
}

function Sidebar({ pathname }) {
  const navigate = useNavigate();
  return (
    <aside className="w-16 sm:w-64 shrink-0 border-r border-neutral-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-neutral-200">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white shrink-0"><IconSparkles size={18} stroke={1.75} /></div>
        <div className="hidden sm:block leading-none">
          <div className="font-bold tracking-tight text-neutral-950">Lucid</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">for teachers</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <NavSectionLabel>Main Menu</NavSectionLabel>
        {NAV.map((n) => (
          <NavItem key={n.id} icon={n.icon} label={<span className="hidden sm:inline">{n.label}</span>}
            active={pathname.startsWith(TAB_PATH[n.id])} onClick={() => navigate(TAB_PATH[n.id])} />
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ pathname, onStartLive }) {
  const titles = { dashboard: "Dashboard", courses: "Courses", classes: "Classes", library: "Library", students: "Students", levelTests: "Level tests", insights: "AI Insights" };
  return (
    <div className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 gap-4">
      <div className="text-lg font-bold text-neutral-950 shrink-0">{titles[tabForPath(pathname)]}</div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-neutral-500 hidden lg:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-500" /> Interface: Azerbaijani</span>
        <Button variant="primary" size="sm" onClick={onStartLive}>
          <IconBroadcast size={15} stroke={1.75} /> <span className="hidden sm:inline">Start lesson</span>
        </Button>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900">
          <IconBell size={18} stroke={1.75} /><span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-warning-500" />
        </button>
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-neutral-200">
          <Avatar name={TEACHER.name} color="dark" size="sm" />
          <div className="leading-none">
            <div className="text-sm font-semibold text-neutral-950">{TEACHER.name}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{TEACHER.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A student's own URL always carries a `:section` (overview/words/…) —
// landing on just `/students/:studentId` picks the default one.
function StudentOverviewRedirect() {
  const { studentId } = useParams();
  return <Navigate to={`/students/${studentId}/overview`} replace />;
}

function Content({ startLive }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Bridge tab="dashboard" startLive={startLive}><Dashboard /></Bridge>} />

      <Route path="/courses" element={<Bridge tab="courses" startLive={startLive}><CoursesView /></Bridge>} />
      <Route path="/courses/:courseId" element={<Bridge tab="courses" startLive={startLive}><CourseView /></Bridge>} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<Bridge tab="courses" startLive={startLive}><LessonBuilderView /></Bridge>} />
      <Route path="/courses/:courseId/lessons/:lessonId/parts/:partId" element={<Bridge tab="courses" startLive={startLive}><PartStudio /></Bridge>} />

      <Route path="/classes/*" element={<Bridge tab="classes" startLive={startLive}><Classes /></Bridge>} />

      <Route path="/library/*" element={<Bridge tab="library" startLive={startLive}><Library /></Bridge>} />

      <Route path="/students" element={<Bridge tab="students" startLive={startLive}><StudentsView /></Bridge>} />
      <Route path="/students/:studentId" element={<StudentOverviewRedirect />} />
      <Route path="/students/:studentId/:section" element={<Bridge tab="students" startLive={startLive}><StudentDetail /></Bridge>} />

      <Route path="/level-tests" element={<Bridge tab="levelTests" startLive={startLive}><LevelTests /></Bridge>} />
      <Route path="/insights" element={<Bridge tab="insights" startLive={startLive}><Insights /></Bridge>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
