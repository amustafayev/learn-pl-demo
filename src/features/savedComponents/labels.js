// The part of a saved item's `from` after its course (e.g. "Lesson 4"),
// shown as its own detail line instead of repeating the course on every row.
export const savedFromDetail = (item) => (item.from || "").split(" · ").slice(1).join(" · ");
