import React, { useState, useCallback } from "react";
import { Home, LayoutGrid, Library as LibraryIcon, BarChart3, Users, Sparkles, Bell } from "lucide-react";
import { StoreProvider, NavProvider } from "./store.jsx";
import { ToastHost } from "./ui.jsx";
import { TEACHER } from "./data.jsx";
import Dashboard from "./views/Dashboard.jsx";
import { CoursesView, CourseView, LessonBuilderView } from "./views/Courses.jsx";
import PartStudio from "./views/parts.jsx";
import Library from "./views/Library.jsx";
import { StudentsView, StudentDetail } from "./views/Students.jsx";
import Statistics from "./views/Statistics.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "courses", label: "Courses", icon: LayoutGrid },
  { id: "library", label: "Library", icon: LibraryIcon },
  { id: "students", label: "Students", icon: Users },
  { id: "stats", label: "Statistics", icon: BarChart3 },
];

export default function App() {
  // one shared route object drives every view
  const [route, setRoute] = useState({ tab: "dashboard", courseId: null, lessonId: null, partId: null, studentId: null });

  const go = useCallback((patch) => {
    setRoute((r) => {
      // switching top-level tab resets deep selection
      if (patch.tab && patch.tab !== r.tab) return { tab: patch.tab, courseId: null, lessonId: null, partId: null, studentId: null, ...patch };
      return { ...r, ...patch };
    });
  }, []);

  return (
    <StoreProvider>
      <NavProvider value={{ route, go }}>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
          <Sidebar route={route} go={go} />
          <main className="flex-1 overflow-y-auto h-screen">
            <TopBar route={route} />
            <Content route={route} />
          </main>
          <ToastHost />
        </div>
      </NavProvider>
    </StoreProvider>
  );
}

function Sidebar({ route, go }) {
  return (
    <aside className="w-16 sm:w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><Sparkles size={18} /></div>
        <div className="hidden sm:block leading-none">
          <div className="font-bold tracking-tight">Lucid</div>
          <div className="text-[11px] text-slate-400 mt-0.5">for teachers</div>
        </div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((n) => {
          const A = n.icon; const active = route.tab === n.id;
          return (
            <button key={n.id} onClick={() => go({ tab: n.id })}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${active ? "bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}>
              <A size={18} className="shrink-0" /><span className="hidden sm:block">{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">{TEACHER.initials}</div>
        <div className="hidden sm:block leading-none">
          <div className="text-sm font-medium">{TEACHER.name.split(" ")[0]} {TEACHER.name.split(" ")[1]?.[0]}.</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Teacher</div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ route }) {
  const titles = { dashboard: "Dashboard", courses: "Courses", library: "Library", students: "Students", stats: "Statistics" };
  return (
    <div className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8">
      <div className="text-sm text-slate-400 font-mono uppercase tracking-widest">{titles[route.tab]}</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Interface: Azerbaijani</span>
        <button className="relative text-slate-400 hover:text-slate-700"><Bell size={18} /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" /></button>
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
  if (route.tab === "library") return <Library />;
  if (route.tab === "students") return route.studentId ? <StudentDetail /> : <StudentsView />;
  if (route.tab === "stats") return <Statistics />;
  return null;
}
