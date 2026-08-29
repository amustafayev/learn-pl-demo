import React, { useState, useCallback } from "react";
import {
  IconHome2, IconLayoutGrid, IconSchool, IconBooks, IconCertificate, IconUsers, IconSparkles, IconBell, IconBrain, IconBroadcast,
} from "@tabler/icons-react";
import { StoreProvider, NavProvider } from "./store.jsx";
import { ToastHost } from "./ui.jsx";
import { Button, NavItem, NavSectionLabel, Avatar } from "./design-system.jsx";
import { TEACHER } from "./data.jsx";
import Dashboard from "./views/Dashboard.jsx";
import { CoursesView, CourseView, LessonBuilderView } from "./views/Courses.jsx";
import { ClassesView, ClassDetailView } from "./views/Classes.jsx";
import PartStudio from "./views/parts.jsx";
import Library from "./views/Library.jsx";
import { StudentsView, StudentDetail } from "./views/Students.jsx";
import Insights from "./views/Insights.jsx";
import LevelTests from "./views/LevelTests.jsx";
import LiveSession from "./views/LiveSession.jsx";

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
  // one shared route object drives every view
  const [route, setRoute] = useState({ tab: "dashboard", courseId: null, classId: null, lessonId: null, partId: null, studentId: null });
  const [live, setLive] = useState(null); // null | { courseId?, lessonId? }

  const go = useCallback((patch) => {
    setRoute((r) => {
      // switching top-level tab resets deep selection
      if (patch.tab && patch.tab !== r.tab) return { tab: patch.tab, courseId: null, classId: null, lessonId: null, partId: null, studentId: null, ...patch };
      // picking a different course drops any class selected under the old one
      if (patch.courseId !== undefined && patch.courseId !== r.courseId && patch.classId === undefined) return { ...r, classId: null, lessonId: null, partId: null, ...patch };
      return { ...r, ...patch };
    });
  }, []);
  const startLive = useCallback((ctx) => setLive(ctx || {}), []);
  const endLive = useCallback(() => setLive(null), []);

  return (
    <StoreProvider>
      <NavProvider value={{ route, go, startLive }}>
        <div className="min-h-screen bg-neutral-50 text-neutral-950 flex font-sans">
          <Sidebar route={route} go={go} />
          <main className="flex-1 overflow-y-auto h-screen">
            <TopBar route={route} onStartLive={() => startLive()} />
            <Content route={route} />
          </main>
          <ToastHost />
        </div>
        {live && <LiveSession context={live} onEnd={endLive} />}
      </NavProvider>
    </StoreProvider>
  );
}

function Sidebar({ route, go }) {
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
          <NavItem key={n.id} icon={n.icon} label={<span className="hidden sm:inline">{n.label}</span>} active={route.tab === n.id} onClick={() => go({ tab: n.id })} />
        ))}
      </nav>
      <div className="p-3 border-t border-neutral-200 flex items-center gap-2.5">
        <Avatar name={TEACHER.name} color="dark" size="sm" />
        <div className="hidden sm:block leading-none">
          <div className="text-sm font-semibold text-neutral-950">{TEACHER.name.split(" ")[0]} {TEACHER.name.split(" ")[1]?.[0]}.</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Teacher</div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ route, onStartLive }) {
  const titles = { dashboard: "Dashboard", courses: "Courses", classes: "Classes", library: "Library", students: "Students", levelTests: "Level tests", insights: "AI Insights" };
  return (
    <div className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8">
      <div className="text-lg font-bold text-neutral-950">{titles[route.tab]}</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500 hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-500" /> Interface: Azerbaijani</span>
        <Button variant="primary" size="sm" onClick={onStartLive}>
          <IconBroadcast size={15} stroke={1.75} /> <span className="hidden sm:inline">Start lesson</span>
        </Button>
        <button className="relative text-neutral-500 hover:text-neutral-900"><IconBell size={18} stroke={1.75} /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-warning-500" /></button>
      </div>
    </div>
  );
}

function Content({ route }) {
  if (route.tab === "dashboard") return <Dashboard />;
  if (route.tab === "courses") {
    if (route.partId) return <PartStudio />;
    if (route.lessonId) return <LessonBuilderView />;
    if (route.courseId) return <CourseView />;
    return <CoursesView />;
  }
  if (route.tab === "classes") return route.classId ? <ClassDetailView /> : <ClassesView />;
  if (route.tab === "library") return <Library />;
  if (route.tab === "students") return route.studentId ? <StudentDetail /> : <StudentsView />;
  if (route.tab === "levelTests") return <LevelTests />;
  if (route.tab === "insights") return <Insights />;
  return null;
}
