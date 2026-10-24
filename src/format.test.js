import { describe, expect, it } from "vitest";
import { timeAgo } from "./format.js";

// "Now" is noon on 25 Oct 2026, local time; days count by calendar day.
const NOW = new Date(2026, 9, 25, 12).getTime();
const at = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString();

describe("timeAgo", () => {
  it("counts calendar days, not 24-hour spans", () => {
    expect(timeAgo(at(25, 1), NOW)).toBe("today");
    expect(timeAgo(at(24, 23), NOW)).toBe("yesterday");
  });

  it("switches to weeks, then months", () => {
    expect(timeAgo(at(20), NOW)).toBe("5 days ago");
    expect(timeAgo(at(4), NOW)).toBe("3 weeks ago");
    expect(timeAgo(new Date(2026, 6, 25, 12).toISOString(), NOW)).toBe("3 months ago");
  });

  it("says nothing for a missing time, and 'today' for a future one", () => {
    expect(timeAgo(null, NOW)).toBe("");
    expect(timeAgo(at(27), NOW)).toBe("today");
  });
});
