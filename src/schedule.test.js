import { describe, expect, it } from "vitest";
import { endTime, inAutoShareWindow, nextSession, scheduleLabel, sessionsOnDay, sortSchedule } from "./schedule.js";

// Days are Mon = 0 … Sun = 6; times are the viewer's local time, so every
// date below is built in local time too. 26 Oct 2026 is a Monday.
const MON = (h, m = 0) => new Date(2026, 9, 26, h, m);
const WED = (h, m = 0) => new Date(2026, 9, 28, h, m);
const mondayAndWednesday = [{ day: 2, start: "10:00", durationMin: 60 }, { day: 0, start: "10:00", durationMin: 60 }];

describe("schedule", () => {
  it("sorts sessions Monday first", () => {
    expect(sortSchedule(mondayAndWednesday).map((s) => s.day)).toEqual([0, 2]);
  });

  it("labels a schedule — one time for all days, or each day's own", () => {
    expect(scheduleLabel(mondayAndWednesday)).toBe("Mon, Wed · 10:00–11:00");
    expect(scheduleLabel([{ day: 0, start: "09:00", durationMin: 60 }, { day: 4, start: "18:00", durationMin: 90 }]))
      .toBe("Mon 09:00–10:00, Fri 18:00–19:30");
    expect(scheduleLabel([])).toBe("No schedule set");
  });

  it("works out when a session ends, past midnight too", () => {
    expect(endTime({ start: "18:00", durationMin: 90 })).toBe("19:30");
    expect(endTime({ start: "23:30", durationMin: 60 })).toBe("00:30");
  });

  it("finds the session in progress, or the next one", () => {
    expect(nextSession(mondayAndWednesday, MON(10, 30)).start).toEqual(MON(10));
    expect(nextSession(mondayAndWednesday, MON(12)).start).toEqual(WED(10));
  });

  it("opens the next lesson from 5 minutes before a session until it ends", () => {
    expect(inAutoShareWindow(mondayAndWednesday, MON(9, 54))).toBe(false);
    expect(inAutoShareWindow(mondayAndWednesday, MON(9, 55))).toBe(true);
    expect(inAutoShareWindow(mondayAndWednesday, MON(10, 59))).toBe(true);
    expect(inAutoShareWindow(mondayAndWednesday, MON(11, 0))).toBe(false);
  });

  it("lists one day's sessions, earliest first", () => {
    const twiceOnMonday = [{ day: 0, start: "18:00", durationMin: 60 }, { day: 0, start: "09:00", durationMin: 30 }, { day: 1, start: "09:00", durationMin: 30 }];
    expect(sessionsOnDay(twiceOnMonday, MON(0)).map((s) => [s.start, s.end])).toEqual([
      [MON(9), MON(9, 30)],
      [MON(18), MON(19)],
    ]);
  });
});
