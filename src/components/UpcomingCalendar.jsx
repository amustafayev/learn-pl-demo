import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconCalendarEvent, IconCalendarOff, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Card } from "../design-system.jsx";
import { useStore, activeClassCourse, classCourseProgress } from "../store.jsx";
import { sessionsOnDay, clock } from "../schedule.js";
import { classDetailPath } from "../router.jsx";

// A course's hue is authored as a Tailwind hue key — same mapping as Classes.jsx.
const HUE_TO_TONE = { indigo: "primary", emerald: "success", amber: "pending", rose: "warning", sky: "info" };
// Static class strings so Tailwind can see them: soft tint + a left accent bar.
const TONE = {
  primary: "bg-primary-50 border-l-primary-500",
  success: "bg-success-50 border-l-success-500",
  pending: "bg-pending-50 border-l-pending-500",
  warning: "bg-warning-50 border-l-warning-500",
  info: "bg-info-50 border-l-info-500",
};

const hhmm = (d) => clock(d.getHours() * 60 + d.getMinutes());
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => a.getTime() === b.getTime();
const weekStart = (d) => addDays(d, -d.getDay()); // Sunday-first strip

// Day picker: a week strip (dots mark days with classes) over the selected
// day's session list. A busy day scrolls inside the list instead of growing.
export default function UpcomingCalendar() {
  const { state } = useStore();
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selected, setSelected] = useState(today);

  const sessionsFor = (date) => {
    const now = new Date();
    return state.classes
      .flatMap((cls) => {
        const active = activeClassCourse(cls);
        const course = state.courses.find((c) => c.id === active?.courseId);
        const p = active ? classCourseProgress(state, cls, active.courseId) : null;
        return sessionsOnDay(cls.schedule, date).map((s) => ({ ...s, cls, course, next: p?.next, done: s.end <= now }));
      })
      .sort((a, b) => a.start - b.start);
  };

  const strip = Array.from({ length: 7 }, (_, i) => addDays(weekStart(selected), i));
  const sessions = sessionsFor(selected);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
        <div className="flex items-center gap-2 text-xl font-normal text-neutral-950">
          {selected.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}
          <button onClick={() => setSelected(today)} title="Jump to today" className="text-neutral-500 hover:text-neutral-950 transition-colors">
            <IconCalendarEvent size={20} stroke={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSelected(addDays(selected, -7))} aria-label="Previous week" className="p-1 rounded-full text-neutral-600 hover:bg-neutral-200"><IconChevronLeft size={18} stroke={1.75} /></button>
          {strip.map((d) => {
            const isSel = sameDay(d, selected);
            const has = sessionsFor(d).length > 0;
            return (
              <button key={d.getTime()} onClick={() => setSelected(d)}
                className={`flex flex-col items-center w-9 sm:w-11 py-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-300 transition-colors ${isSel ? "bg-primary-100 text-primary-800" : "text-neutral-700 hover:bg-neutral-100"}`}>
                <span className="text-[10px] font-normal uppercase">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                <span className="text-base font-normal leading-tight">{d.getDate()}</span>
                <span className="mt-0.5 h-1 w-1 flex">{has && <span className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-600" : "bg-neutral-400"}`} />}</span>
              </button>
            );
          })}
          <button onClick={() => setSelected(addDays(selected, 7))} aria-label="Next week" className="p-1 rounded-full text-neutral-600 hover:bg-neutral-200"><IconChevronRight size={18} stroke={1.75} /></button>
        </div>
      </div>

      <div className="text-sm font-normal text-neutral-600 mb-2">Scheduled</div>
      {sessions.length ? (
        <div className="max-h-80 overflow-y-auto flex flex-col gap-2 pr-1">
          {sessions.map((s) => {
            const tone = TONE[HUE_TO_TONE[s.course?.hue] || "primary"];
            return (
              <button key={s.cls.id + s.start.getTime()} onClick={() => navigate(classDetailPath(s.cls.id))}
                className={`text-left rounded-lg border-l-4 px-4 py-2.5 transition-opacity hover:opacity-80 ${tone} ${s.done ? "opacity-50" : ""}`}>
                <div className="text-xs font-normal text-neutral-600">{hhmm(s.start)} – {hhmm(s.end)}</div>
                <div className="text-base font-normal text-neutral-950 truncate">{s.cls.name}</div>
                <div className="text-xs font-normal text-neutral-500 truncate">
                  {s.next ? `Lesson ${s.next.n} · ${s.next.title}` : s.course?.title || "No course yet"}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-6 text-sm text-neutral-500">
          <IconCalendarOff size={18} stroke={1.5} /> Nothing scheduled this day.
        </div>
      )}
    </Card>
  );
}
