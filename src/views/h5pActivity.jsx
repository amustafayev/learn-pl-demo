import { useEffect, useRef, useState } from "react";
import { Puzzle } from "lucide-react";
import { H5PEditorUI, H5PPlayerUI } from "@lumieducation/h5p-react";
import { Pill } from "../ui.jsx";
import { Card, Field, inputCls, Button } from "../design-system.jsx";
import { h5pClient } from "../store.jsx";

/* =========================================================================
   H5P activity — one generic wrapper for H5P's whole content-type catalog
   (60+ types: Crossword, Branching Scenario, Course Presentation, Drag the
   Words, Interactive Video …). This component never lists or knows about
   individual H5P types — a teacher picks one from H5P's own real editor
   (H5PEditorUI, talking to the real @lumieducation/h5p-server backend in
   /server — see server/README.md), and this only ever holds a reference
   ({ contentId, mainLibrary }) to what she built there, same shape the
   architecture notes describe. Playback (H5PPlayerUI) hits the same
   backend to render whatever content type she picked — this component
   never needs to know which one.

   Deliberately its own file, decoupled from parts.jsx's shared component
   registry: parts.jsx only imports the four exports at the bottom and
   wires them into its kind switches.
   ========================================================================= */

export const H5P_ACTIVITY_META = {
  label: "H5P activity",
  icon: Puzzle,
  tone: "text-cyan-700 bg-cyan-50",
  hint: "Build a real H5P activity in H5P's own editor — Crossword, Drag the Words, and 60+ more",
};

export function defaultH5PActivity() {
  return { contentId: null, mainLibrary: null, title: "Untitled H5P activity", notes: "" };
}

export function H5PActivityComponent({ component }) {
  if (!component.contentId) {
    return (
      <div className="max-w-3xl">
        <Card className="p-8 flex flex-col items-center gap-2 text-neutral-400 text-sm">
          <Puzzle size={22} />
          Not created yet — switch to Edit content to build it in the H5P editor.
        </Card>
      </div>
    );
  }
  return (
    <div className="max-w-3xl">
      <Card className="p-0 overflow-hidden">
        <div className="p-4">
          <H5PPlayerUI
            contentId={component.contentId}
            loadContentCallback={h5pClient.getPlay}
            onxAPIStatement={(statement) => {
              // Real H5P xAPI events (attempt/answer/completion/score) land
              // here — the one hook point a real analytics pipe would
              // subscribe to later, same shape as any other xAPI source.
              console.log("H5P xAPI statement", statement);
            }}
          />
        </div>
        <div className="px-5 py-4 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{component.title || "Untitled H5P activity"}</span>
            {component.mainLibrary && <Pill className="bg-info-50 text-info-700">{component.mainLibrary}</Pill>}
          </div>
          {component.notes && <div className="text-xs text-neutral-400 mt-0.5">{component.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

export function H5PActivityEditor({ component, onChange, registerFlush }) {
  const editorRef = useRef(null);
  // H5PEditorUI.save() never rejects — it resolves undefined and reports the
  // reason through onSaveError — so the message is kept here to rethrow it.
  const lastErrorRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Set once H5P has a content type's form loaded (existing content, or a
  // type just picked in the Hub) — before that there's nothing to save.
  const [formLoaded, setFormLoaded] = useState(false);

  async function saveNow() {
    lastErrorRef.current = null;
    const result = await editorRef.current?.save();
    if (!result) throw new Error(lastErrorRef.current || "Could not save this activity.");
    return { contentId: result.contentId, mainLibrary: result.metadata?.mainLibrary };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      onChange(await saveNow());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // H5P keeps unsaved edits inside its own iframe, so anything that unmounts
  // this editor (selecting another component, Save & close …) would drop
  // them. Block Studio calls this first; it resolves to the patch to apply,
  // or null when there's nothing to save.
  useEffect(() => {
    if (!registerFlush) return undefined;
    registerFlush(component.id, () => (formLoaded ? saveNow() : Promise.resolve(null)));
    return () => registerFlush(component.id, null);
  });

  return (
    <div className="space-y-3">
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <H5PEditorUI
          ref={editorRef}
          contentId={component.contentId || "new"}
          loadContentCallback={h5pClient.getEdit}
          saveContentCallback={h5pClient.save}
          onLoaded={() => setFormLoaded(true)}
          onSaveError={(message) => { lastErrorRef.current = message; setError(message); }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save H5P content"}
        </Button>
        {error && <span className="text-xs text-warning-600">{error}</span>}
      </div>
      <Field label="Title"><input className={inputCls} value={component.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Notes for students"><input className={inputCls} value={component.notes} onChange={(e) => onChange({ notes: e.target.value })} /></Field>
    </div>
  );
}
