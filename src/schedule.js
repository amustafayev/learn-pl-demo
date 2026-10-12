/* A class's weekly schedule: `[{ day, start, durationMin }]`, where `day` is
   an index into DAY_LABELS (Mon = 0), `start` is "HH:MM" in the viewer's
   local time and each day can have its own start and length. Everything that
   reads or compares times lives here, so views just ask. */

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DURATIONS = [30, 45, 60, 90, 120];
export const DEFAULT_START = "10:00";
export const DEFAULT_DURATION = 60;
// A lesson opens to the class this long before a session starts.
export const AUTO_SHARE_MINUTES = 5;

const pad = (n) => String(n).padStart(2, "0");
const toMinutes = (hhmm) => { const [h, m] = (hhmm || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const clock = (minutes) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
export const endTime = (s) => clock(toMinutes(s.start) + s.durationMin);

export const sortSchedule = (schedule) => [...(schedule || [])].sort((a, b) => a.day - b.day);

// "Mon, Wed · 09:00–10:00", or each day on its own when they differ:
// "Mon 09:00–10:00, Fri 18:00–19:30". Days with no time yet read as bare days.
export function scheduleLabel(schedule) {
  const list = sortSchedule(schedule);
  if (!list.length) return "No schedule set";
  const slot = (s) => `${s.start}–${endTime(s)}`;
  if (list.every((s) => slot(s) === slot(list[0]))) return `${list.map((s) => DAY_NAMES[s.day]).join(", ")} · ${slot(list[0])}`;
  return list.map((s) => `${DAY_NAMES[s.day]} ${slot(s)}`).join(", ");
}

// The date a session on `day` (Mon = 0) starts, in the week of `from`'s day
// plus `weekOffsetDays`. Local time.
function sessionDate(s, from, offsetDays) {
  const jsToday = (from.getDay() + 6) % 7; // Mon = 0
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays + (s.day - jsToday), 0, 0, 0, 0);
  d.setMinutes(toMinutes(s.start));
  return d;
}

// Sessions around `now` (yesterday through next week), as {start, end, day}.
function sessionsAround(schedule, now) {
  const out = [];
  for (const s of schedule || []) {
    for (const offset of [-7, 0, 7]) {
      const start = sessionDate(s, now, offset);
      out.push({ day: s.day, start, end: new Date(start.getTime() + s.durationMin * 60_000) });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

// The session in progress or the next one to start.
export function nextSession(schedule, now = new Date()) {
  return sessionsAround(schedule, now).find((s) => s.end > now) || null;
}

// Are we inside [5 minutes before a session, its end]? — when the class's
// next lesson opens to students on its own.
export function inAutoShareWindow(schedule, now = new Date()) {
  return sessionsAround(schedule, now).some((s) => now >= new Date(s.start.getTime() - AUTO_SHARE_MINUTES * 60_000) && now < s.end);
}

// "Mon 09:55" — when the next session's auto-share opens, for hints.
export function nextAutoShareLabel(schedule, now = new Date()) {
  const s = nextSession(schedule, now);
  if (!s) return "";
  const opens = new Date(s.start.getTime() - AUTO_SHARE_MINUTES * 60_000);
  if (opens <= now) return "";
  const today = opens.toDateString() === now.toDateString();
  return `${today ? "today" : DAY_NAMES[(opens.getDay() + 6) % 7]} at ${pad(opens.getHours())}:${pad(opens.getMinutes())}`;
}
