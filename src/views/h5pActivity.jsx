import { Puzzle } from "lucide-react";
import { Pill } from "../ui.jsx";
import { Card, Field, inputCls } from "../design-system.jsx";

/* =========================================================================
   H5P activity — one generic wrapper for H5P's whole content-type catalog
   (60+ types: Crossword, Branching Scenario, Course Presentation, Drag the
   Words, Interactive Video …). This component never lists or knows about
   individual H5P types — a teacher picks one in H5P's own editor/gallery,
   and this only ever holds a reference (a content-type label + an embed
   link) to what she built there.

   Playback needs no backend of ours: it's a real iframe embed, exactly like
   the YouTube/slide-deck components in parts.jsx. Real *authoring* (saving
   what a teacher builds, instead of just linking to something already
   published) would need a small Node service (@lumieducation/h5p-server) —
   this prototype's mock store has no backend to host that, so for now this
   stays link-based, same as slidedeck.

   Deliberately its own file, decoupled from parts.jsx's shared component
   registry: parts.jsx only imports the four exports below and wires them
   into its kind switches. Swapping this mock embed for a real
   @lumieducation/h5p-react integration later touches this file alone.
   ========================================================================= */

export const H5P_ACTIVITY_META = {
  label: "H5P activity",
  icon: Puzzle,
  tone: "text-cyan-700 bg-cyan-50",
  hint: "Embed any H5P content type, built in H5P's own editor",
};

export function defaultH5PActivity() {
  return { contentType: "H5P.Crossword", embedUrl: "", title: "Untitled H5P activity", notes: "" };
}

export function H5PActivityComponent({ component }) {
  const url = component.embedUrl;
  return (
    <div className="max-w-3xl">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-neutral-100">
          {url ? (
            <iframe className="w-full h-full" src={url} title={component.title || "H5P activity"} allowFullScreen loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-400 text-sm">
              <Puzzle size={22} />
              No activity linked yet — add an embed link in Edit content.
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{component.title || "Untitled H5P activity"}</span>
            <Pill className="bg-info-50 text-info-700">{component.contentType || "H5P"}</Pill>
          </div>
          {component.notes && <div className="text-xs text-neutral-400 mt-0.5">{component.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

export function H5PActivityEditor({ component, onChange }) {
  return (
    <div className="space-y-3">
      <Field label="Content type">
        <input className={inputCls} value={component.contentType} onChange={(e) => onChange({ contentType: e.target.value })} placeholder="e.g. H5P.Crossword, H5P.BranchingScenario…" />
      </Field>
      <p className="text-xs text-neutral-400">Build or find one in H5P's own content-type gallery, then paste its embed link below.</p>
      <Field label="Embed link">
        <input className={inputCls} value={component.embedUrl} onChange={(e) => onChange({ embedUrl: e.target.value })} placeholder="https://h5p.org/h5p/embed/…" />
      </Field>
      <Field label="Title"><input className={inputCls} value={component.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Notes for students"><input className={inputCls} value={component.notes} onChange={(e) => onChange({ notes: e.target.value })} /></Field>
    </div>
  );
}
