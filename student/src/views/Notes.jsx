import React, { useEffect, useState } from "react";
import { IconFilter, IconNotes } from "@tabler/icons-react";
import { Card, MenuButton, Page, PageHeader } from "@app/design-system.jsx";
import { useStore } from "@app/store.jsx";
import { timeAgo } from "@app/format.js";
import { useSeen } from "../session.jsx";
import { capitalize, classOf } from "../lib.js";
import NoteItem from "../components/NoteItem.jsx";

// Every note the student's teachers have sent them, newest first, grouped by
// when it arrived — each one says which class and lesson it's about (and
// opens that lesson). Filter to one class when they're in several.
export default function Notes() {
  const { state } = useStore();
  const { seen, markSeen } = useSeen();
  const [classFilter, setClassFilter] = useState("all");
  // What was new when they opened this page (or arrived while it's open)
  // keeps its "New" badge until they leave, even once it counts as seen.
  const [fresh, setFresh] = useState(() => new Set(state.classNotes.filter((n) => !seen.has(n.id)).map((n) => n.id)));
  const unseen = state.classNotes.filter((n) => !seen.has(n.id)).map((n) => n.id);
  const unseenKey = unseen.join(",");
  useEffect(() => {
    if (!unseenKey) return;
    const ids = unseenKey.split(",");
    setFresh((prev) => new Set([...prev, ...ids]));
    markSeen(ids);
  }, [unseenKey, markSeen]);

  const classIds = [...new Set(state.classNotes.map((n) => n.classId))];
  const shown = state.classNotes.filter((n) => classFilter === "all" || n.classId === classFilter);
  // Group headings by when the note was sent: Today, Yesterday, 5 days ago…
  const groups = [];
  shown.forEach((n) => {
    const label = capitalize(timeAgo(n.sharedAt));
    const g = groups.at(-1);
    if (g?.label === label) g.notes.push(n); else groups.push({ label, notes: [n] });
  });

  return (
    <Page>
      <PageHeader title="Notes" sub="What your teacher sent your class — homework, what to review, reminders. Newest first."
        right={classIds.length > 1 && (
          <MenuButton icon={IconFilter} value={classFilter} onChange={setClassFilter} active={classFilter !== "all"}
            label={classFilter === "all" ? "All classes" : classOf(state, classFilter)?.name}
            options={[
              { id: "all", label: "All classes", count: state.classNotes.length },
              ...classIds.map((id) => ({ id, label: classOf(state, id)?.name || "Class", count: state.classNotes.filter((n) => n.classId === id).length })),
            ]} />
        )} />

      {groups.length ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-sm font-semibold text-neutral-700 mb-2">{g.label}</div>
              <Card className="px-5">
                <div className="divide-y divide-neutral-400">
                  {g.notes.map((n) => <NoteItem key={n.id} note={n} isNew={fresh.has(n.id)} showClass={classIds.length > 1} showTime={false} />)}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center">
          <IconNotes size={24} stroke={1.5} className="mx-auto mb-2 text-neutral-500" />
          <div className="font-semibold text-neutral-950">No notes yet</div>
          <p className="text-sm text-neutral-600 mt-1">When your teacher sends your class a note, it shows up here and inside its lesson.</p>
        </Card>
      )}
    </Page>
  );
}
