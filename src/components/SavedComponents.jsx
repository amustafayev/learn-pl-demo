import React, { useState } from "react";
import { IconChevronRight, IconChevronDown, IconStack2, IconTrash } from "@tabler/icons-react";
import { Card, Button, Tag, SearchField, Select } from "../design-system.jsx";
import { COMPONENT_META } from "../views/parts.jsx"; // used only when a card renders, so the import cycle is harmless

/* The saved-component library as a browsable collection: search, category
   and course filters, categorized groups of cards that show a few at a time.
   Used by the Library's Saved tab and by "Add a component → Saved". */

// A collapsible group for one category of saved components.
function BankGroup({ label, icon: Icon, count, shown, onShowAll, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-6 last:mb-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 mb-3 group">
        {open ? <IconChevronDown size={14} stroke={1.75} className="text-neutral-300 shrink-0" /> : <IconChevronRight size={14} stroke={1.75} className="text-neutral-300 shrink-0" />}
        {Icon && <Icon size={14} stroke={1.75} className="text-neutral-600 shrink-0" />}
        <h3 className="text-sm font-bold text-neutral-700 group-hover:text-primary-600 transition-colors">{label}</h3>
        <Tag color="neutral">{count}</Tag>
        <div className="flex-1 h-px bg-neutral-200" />
      </button>
      {open && children}
      {open && onShowAll && count > shown && (
        <div className="mt-3"><Button variant="light" size="sm" onClick={onShowAll}>Show all {count}</Button></div>
      )}
    </div>
  );
}

// How many cards a category shows in the overview, and how many more each
// "Show more" reveals once a single category is open — a bank can hold
// hundreds of items, so nothing renders unbounded.
const PREVIEW_COUNT = 6;
const PAGE_SIZE = 24;

// Search + category/course filters + categorized, paged grid, shared by the
// saved Blocks and saved Components lists. `categories` is [{id, label, icon}]
// in display order; `categoryOf(item)` returns one of those ids.
export function BankBrowser({ compact = false, items, categories, categoryOf, searchText, courseOf, noun, empty, renderCard }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [course, setCourse] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const q = query.trim().toLowerCase();
  const courses = [...new Set(items.map(courseOf))].sort();
  const matches = items.filter((it) =>
    (course === "all" || courseOf(it) === course) && (!q || searchText(it).toLowerCase().includes(q)));
  const counts = new Map();
  for (const it of matches) counts.set(categoryOf(it), (counts.get(categoryOf(it)) || 0) + 1);
  const groups = categories
    .map((c) => ({ ...c, items: matches.filter((it) => categoryOf(it) === c.id) }))
    .filter((g) => g.items.length && (cat === "all" || g.id === cat));
  const reset = (fn) => (e) => { fn(e.target.value); setLimit(PAGE_SIZE); };

  if (!items.length) return empty;
  return (
    <>
      {!compact && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchField className="flex-1" placeholder={`Search ${noun} by name, course or component`} value={query} onChange={reset(setQuery)} />
          <Select className="sm:w-52" value={cat} onChange={reset(setCat)} aria-label="Category">
            <option value="all">All categories ({matches.length})</option>
            {categories.filter((c) => counts.get(c.id)).map((c) => <option key={c.id} value={c.id}>{c.label} ({counts.get(c.id)})</option>)}
          </Select>
          {courses.length > 1 && (
            <Select className="sm:w-52" value={course} onChange={reset(setCourse)} aria-label="Course">
              <option value="all">All courses</option>
              {courses.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </div>
      )}
      {groups.length ? groups.map((g) => {
        const single = cat !== "all";
        const shown = single ? limit : PREVIEW_COUNT;
        return (
          <BankGroup key={g.id} label={g.label} icon={g.icon} count={g.items.length} shown={shown}
            onShowAll={single ? () => setLimit((n) => n + PAGE_SIZE) : () => { setCat(g.id); setLimit(PAGE_SIZE); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{g.items.slice(0, shown).map(renderCard)}</div>
          </BankGroup>
        );
      }) : (
        <Card className="p-8 text-center text-sm text-neutral-500">No {noun} match your search.</Card>
      )}
    </>
  );
}

export const parentOf = (item) => (item.from || "Other").split(" · ")[0] || "Other";

// One saved component. `onOpen` runs when the card is clicked; `onDelete`
// adds the trash button (the Library has it, the lesson picker doesn't).
export function SavedComponentCard({ item, onOpen, onDelete, actionLabel }) {
  const M = COMPONENT_META[item.kind] || { label: item.kind, icon: IconStack2, tone: "bg-neutral-100 text-neutral-600" };
  const I = M.icon;
  return (
    <Card className="p-5 cursor-pointer hover:border-primary-500 transition-colors" role="button" tabIndex={0}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      <div className="flex items-center justify-between mb-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${M.tone}`}><I size={16} /></span>
        <div className="flex items-center gap-1.5">
          {item.data?.level && <Tag color="neutral">{item.data.level}</Tag>}
          {onDelete && (
            <button title="Delete from Saved" onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-neutral-400 hover:text-warning-500 p-1"><IconTrash size={14} stroke={1.75} /></button>
          )}
        </div>
      </div>
      <div className="font-bold mb-0.5 text-neutral-950">{item.title}</div>
      <div className="text-xs text-neutral-500">{M.label}{item.from ? ` · ${item.from}` : ""}</div>
      {actionLabel && <div className="mt-3 text-xs font-semibold text-primary-600">{actionLabel}</div>}
    </Card>
  );
}
