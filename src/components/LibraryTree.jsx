import React, { useState } from "react";
import { IconChevronRight, IconChevronDown, IconFolder, IconFolderOpen, IconFolderPlus, IconPencil, IconTrash, IconLibrary, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from "@tabler/icons-react";
import { Card } from "../design-system.jsx";
import { kidsOf, pathOf } from "../libraryTree.js";

/* A file-explorer style tree for the Library's folders (word sets, reading
   texts): click a folder to open it, the chevron to fold it, and the small
   buttons that appear on hover to add a folder inside it, rename it or
   delete it. Nothing here knows what a folder holds — the caller shows that
   next to it and says what the counts and the labels are. */

function NameInput({ initial = "", placeholder, onDone, onCancel }) {
  const [value, setValue] = useState(initial);
  const commit = () => { const v = value.trim(); if (v) onDone(v); else onCancel(); };
  return (
    <input autoFocus value={value} placeholder={placeholder} aria-label={placeholder}
      onChange={(e) => setValue(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
      className="h-8 min-w-0 flex-1 rounded-lg border border-primary-500 bg-surface px-2 text-sm text-neutral-900 outline-none" />
  );
}

function Tool({ title, onClick, danger, children }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-300 ${danger ? "hover:text-warning-600" : "hover:text-neutral-950"}`}>
      {children}
    </button>
  );
}

export default function LibraryTree({ nodes, labelKey, selectedId, onSelect, rootLabel, countOf, addLabel = "New folder", onAdd, onRename, onDelete, folded = false, onFoldChange }) {
  const [open, setOpen] = useState(() => new Set(selectedId ? pathOf(nodes, selectedId).map((n) => n.id) : []));
  const [adding, setAdding] = useState(undefined); // undefined = no, null = at the top level, id = inside that folder
  const [renaming, setRenaming] = useState(null);
  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const expand = (id) => setOpen((s) => new Set(s).add(id));

  const addRow = (parentId, depth) => (
    <div className="flex items-center gap-2 py-1 pr-2" style={{ paddingLeft: 12 + depth * 18 }}>
      <IconFolderPlus size={16} stroke={1.75} className="shrink-0 text-neutral-500" />
      <NameInput placeholder={addLabel} onCancel={() => setAdding(undefined)}
        onDone={(name) => { onAdd(parentId, name); if (parentId) expand(parentId); setAdding(undefined); }} />
    </div>
  );

  const renderLevel = (parentId, depth) => kidsOf(nodes, parentId).map((n) => {
    const kids = kidsOf(nodes, n.id);
    const isOpen = open.has(n.id);
    const selected = selectedId === n.id;
    return (
      <li key={n.id}>
        <div className={`group flex items-center gap-1 rounded-lg py-1 pr-1 ${selected ? "bg-neutral-300" : "hover:bg-neutral-200"}`} style={{ paddingLeft: 4 + depth * 18 }}>
          <button type="button" aria-label={isOpen ? "Fold" : "Unfold"} onClick={() => toggle(n.id)}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 ${kids.length ? "" : "invisible"}`}>
            {isOpen ? <IconChevronDown size={14} stroke={1.75} /> : <IconChevronRight size={14} stroke={1.75} />}
          </button>
          {renaming === n.id ? (
            <NameInput initial={n[labelKey]} placeholder="Name" onCancel={() => setRenaming(null)} onDone={(name) => { onRename(n.id, name); setRenaming(null); }} />
          ) : (
            <>
              <button type="button" onClick={() => { onSelect(n.id); if (kids.length) expand(n.id); }}
                className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
                {isOpen ? <IconFolderOpen size={16} stroke={1.75} className="shrink-0 text-primary-600" /> : <IconFolder size={16} stroke={1.75} className="shrink-0 text-primary-600" />}
                <span className={`truncate text-sm ${selected ? "font-semibold text-neutral-950" : "text-neutral-800"}`}>{n[labelKey]}</span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-neutral-500">{countOf(n)}</span>
              </button>
              <span className="flex shrink-0 items-center opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 focus-within:opacity-100">
                <Tool title={addLabel} onClick={() => { setAdding(n.id); expand(n.id); }}><IconFolderPlus size={15} stroke={1.75} /></Tool>
                <Tool title="Rename" onClick={() => setRenaming(n.id)}><IconPencil size={15} stroke={1.75} /></Tool>
                <Tool title="Delete" danger onClick={() => onDelete(n)}><IconTrash size={15} stroke={1.75} /></Tool>
              </span>
            </>
          )}
        </div>
        {isOpen && (
          <ul>
            {renderLevel(n.id, depth + 1)}
            {adding === n.id && <li>{addRow(n.id, depth + 1)}</li>}
          </ul>
        )}
      </li>
    );
  });

  // Shrunk: a slimmer list of top-level folders with their names (no counts,
  // tools or subfolders), so the content gets the room.
  if (folded) {
    const row = (active, label, onClick, icon) => (
      <button key={label} type="button" title={label} onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${active ? "bg-neutral-300 font-semibold text-neutral-950" : "text-neutral-800 hover:bg-neutral-200"}`}>
        {icon}<span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    );
    return (
      <Card className="flex flex-col gap-0.5 p-2 overflow-hidden animate-fade-rise">
        <button type="button" title="Unfold panel" aria-label="Unfold panel" onClick={() => onFoldChange(false)}
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950">
          <IconLayoutSidebarLeftExpand size={18} stroke={1.75} />
        </button>
        {row(selectedId === null, rootLabel, () => onSelect(null), <IconLibrary size={16} stroke={1.75} className="shrink-0 text-neutral-600" />)}
        {kidsOf(nodes, null).map((n) => row(
          selectedId === n.id || pathOf(nodes, selectedId || "").some((p) => p.id === n.id),
          n[labelKey], () => onSelect(n.id), <IconFolder size={16} stroke={1.75} className="shrink-0 text-primary-600" />))}
      </Card>
    );
  }

  return (
    <Card className="p-2 overflow-hidden animate-fade-rise">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onSelect(null)}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selectedId === null ? "bg-neutral-300 font-semibold text-neutral-950" : "text-neutral-800 hover:bg-neutral-200"}`}>
          <IconLibrary size={16} stroke={1.75} className="shrink-0 text-neutral-600" /> <span className="flex-1 truncate">{rootLabel}</span>
        </button>
        {onFoldChange && (
          <button type="button" title="Fold panel" aria-label="Fold panel" onClick={() => onFoldChange(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950">
            <IconLayoutSidebarLeftCollapse size={18} stroke={1.75} />
          </button>
        )}
      </div>
      <ul className="mt-1">{renderLevel(null, 0)}</ul>
      {adding === null && addRow(null, 0)}
      <button type="button" onClick={() => setAdding(null)}
        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary-600 hover:bg-neutral-200">
        <IconFolderPlus size={16} stroke={1.75} /> {addLabel}
      </button>
    </Card>
  );
}
