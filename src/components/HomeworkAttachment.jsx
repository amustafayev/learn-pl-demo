import { COMPONENT_META } from "../views/parts.jsx";

/* How a homework attachment reads in a list, shared by the composer and the
   assignment page: a title, one line saying what kind of thing it is and where
   it came from, and — for a lesson block — the components inside it. */

export const compLabel = (c) => COMPONENT_META[c.kind]?.label || c.kind;
// What an attachment is, in words: a title, a one-line "what kind of thing and
// where from", and — for a lesson block — the components inside it.
export function describeAttachment(a) {
  if (a.kind === "block") {
    const comps = a.content?.components || [];
    return { title: a.title, sub: `Lesson block · ${comps.length} component${comps.length === 1 ? "" : "s"}${a.source?.from ? ` · from ${a.source.from}` : ""}`, chips: comps.map(compLabel) };
  }
  if (a.kind === "wordSet") return { title: a.title, sub: "Word set · words go to each student's vocabulary" };
  if (a.kind === "reading") return { title: a.title, sub: "Reading text" };
  const c = a.content || {};
  if (a.componentKind === "document") return { title: c.title || a.title, sub: c.fileName ? `File · ${c.fileName}` : c.url ? `Document link · ${c.url}` : "Document — no file yet" };
  if (a.componentKind === "youtube") return { title: c.title || a.title, sub: `YouTube video${c.url ? ` · ${c.url}` : ""}` };
  return { title: a.title, sub: `${COMPONENT_META[a.componentKind]?.label || "Task"} · ${a.source?.from || "created here"}` };
}

