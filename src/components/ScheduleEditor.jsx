import React from "react";
import { Select } from "../design-system.jsx";
import { DAY_NAMES, DURATIONS, DEFAULT_START, DEFAULT_DURATION, sortSchedule, endTime } from "../schedule.js";

// Pick the days a class meets, then a start time and length for each — a
// Monday can be an hour and a Friday an hour and a half.
export default function ScheduleEditor({ value, onChange }) {
  const byDay = new Map(value.map((s) => [s.day, s]));
  const toggle = (day) => onChange(byDay.has(day) ? value.filter((s) => s.day !== day) : sortSchedule([...value, { day, start: DEFAULT_START, durationMin: DEFAULT_DURATION }]));
  const patch = (day, p) => onChange(value.map((s) => (s.day === day ? { ...s, ...p } : s)));
  return (
    <div>
      <span className="text-xs font-semibold text-neutral-600">Meets on</span>
      <div className="mt-1.5 flex gap-1.5">
        {DAY_NAMES.map((d, i) => (
          <button key={d} type="button" onClick={() => toggle(i)} aria-pressed={byDay.has(i)}
            className={`h-9 w-11 rounded-lg border text-xs font-semibold transition-colors ${byDay.has(i) ? "border-primary-500 bg-primary-50 text-primary-600" : "border-neutral-400 text-neutral-700 hover:bg-neutral-200"}`}>{d}</button>
        ))}
      </div>
      {sortSchedule(value).length > 0 && (
        <div className="mt-3 space-y-2">
          {sortSchedule(value).map((s) => (
            <div key={s.day} className="flex flex-wrap items-center gap-2">
              <span className="w-10 text-sm font-semibold text-neutral-950">{DAY_NAMES[s.day]}</span>
              <input type="time" value={s.start} required aria-label={`${DAY_NAMES[s.day]} start time`}
                onChange={(e) => e.target.value && patch(s.day, { start: e.target.value })}
                className="h-11 rounded-lg border border-transparent bg-neutral-200 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:bg-surface" />
              <Select value={s.durationMin} onChange={(e) => patch(s.day, { durationMin: Number(e.target.value) })} aria-label={`${DAY_NAMES[s.day]} length`} className="!w-32">
                {DURATIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
              </Select>
              <span className="text-xs text-neutral-600">until {endTime(s)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
