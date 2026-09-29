// Display formatting for stored ISO timestamps. Data only ever holds ISO
// strings (what an API returns); these turn them into words at render time,
// so "5 days ago" stays true however long the data has been sitting there.

const DAY = 24 * 60 * 60 * 1000;

// "today", "yesterday", "5 days ago", "3 weeks ago", "2 months ago".
export function timeAgo(iso, now = Date.now()) {
  if (!iso) return "";
  const days = Math.floor((startOfDay(now) - startOfDay(new Date(iso).getTime())) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

// "Thu, 24 Sep" — for a title/tooltip next to a relative time.
export function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
