import React, { useState } from "react";
import { Plus, Send, Boxes } from "lucide-react";
import { Modal, Btn, Card, Pill } from "../ui.jsx";
import { useStore, groupBankByParent, bankChildLabel, assignToStudent, kitContents } from "../store.jsx";
import { blockMeta } from "../data.jsx";
import { ComponentKindPicker, ComponentStudent, COMPONENT_META, COMPONENT_CATEGORIES, defaultComponent } from "../views/parts.jsx";

/* =========================================================================
   Everything a teacher can hand to ONE student, in one place: (un)assign a
   lesson from their course, drop in a saved block from My Blocks, assign a
   word set, or build a quick one-off task from any component kind — picked,
   previewed and assigned without leaving this dialog ("in-place creation").
   ========================================================================= */

const TABS = [
  { id: "blocks", label: "My Blocks" },
  { id: "kits", label: "Kits" },
  { id: "words", label: "Word sets" },
  { id: "new", label: "New task" },
];

export function StudentAssignModal({ open, onClose, student }) {
  const { state, dispatch, toast } = useStore();
  const [tab, setTab] = useState("blocks");
  const [preview, setPreview] = useState(null); // { kind, component }

  const close = () => { setPreview(null); setTab("blocks"); onClose(); };
  if (!student) return null;

  function assignBlock(item) {
    // categorize by the block's own type (reading, vocabulary, grammar, …) —
    // the same category names used throughout the lesson component list.
    assignToStudent(dispatch, toast, student.id, `${item.title} (saved block)`, item.type);
    close();
  }
  function assignWordSet(ws) {
    assignToStudent(dispatch, toast, student.id, `Word set: ${ws.title}`, "vocabulary");
    close();
  }
  function assignKit(kit, count) {
    assignToStudent(dispatch, toast, student.id, `${kit.title} (kit · ${count} item${count === 1 ? "" : "s"})`, "kit");
    close();
  }
  function assignNew() {
    if (!preview) return;
    const category = COMPONENT_CATEGORIES.find((c) => c.kinds.includes(preview.kind))?.id || "component";
    assignToStudent(dispatch, toast, student.id, `${COMPONENT_META[preview.kind].label} (custom task)`, category);
    close();
  }

  return (
    <Modal open={open} onClose={close} wide title={`Assign to ${student.name.split(" ")[0]}`}
      sub="Lessons, saved blocks, word sets — or build a quick task on the spot">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setPreview(null); }}
            className={`flex-1 text-xs font-semibold rounded-lg px-2 py-1.5 transition-colors ${tab === t.id ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "blocks" && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-0.5">
          {groupBankByParent(state.blockBank).map(({ parent, items }) => (
            <div key={parent}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-500/80 mb-1.5 px-0.5">{parent}</div>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const BT = blockMeta(item.type); const I = BT.icon;
                  const child = bankChildLabel(item);
                  return (
                    <button key={item.id} onClick={() => assignBlock(item)}
                      className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-2.5 text-left transition-colors">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${BT.tone}`}><I size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium block truncate">{item.title}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{BT.label}{child ? ` · ${child}` : ""}</span>
                      </span>
                      <Plus size={14} className="text-indigo-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!state.blockBank.length && <p className="text-sm text-slate-400 p-2">Nothing saved in My Blocks yet — save a block from any lesson first.</p>}
        </div>
      )}

      {tab === "kits" && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {(state.kits || []).map((kit) => {
            const { blocks, components, count } = kitContents(kit, state.blockBank, state.componentBank);
            return (
              <button key={kit.id} onClick={() => assignKit(kit, count)} disabled={!count}
                className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${count ? "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40" : "border-slate-100 opacity-50 cursor-not-allowed"}`}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-50 text-violet-600"><Boxes size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{kit.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {count ? [...blocks.map((b) => b.title), ...components.map((c) => c.title)].join(" · ") : "Referenced items were removed from the bank"}
                  </div>
                </div>
                <Pill className="bg-slate-100 text-slate-500 font-mono shrink-0">{count}</Pill>
              </button>
            );
          })}
          {!(state.kits || []).length && <p className="text-sm text-slate-400 p-2">No kits yet — build one from Library → My Blocks → Kits.</p>}
        </div>
      )}

      {tab === "words" && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {state.wordSets.map((ws) => (
            <button key={ws.id} onClick={() => assignWordSet(ws)}
              className="w-full flex items-center gap-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-2.5 text-left transition-colors">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{ws.title}</div>
                <div className="text-xs text-slate-400">{ws.category} · {ws.level} · {ws.words.length} words</div>
              </div>
              <Plus size={14} className="text-indigo-600 shrink-0" />
            </button>
          ))}
          {!state.wordSets.length && <p className="text-sm text-slate-400 p-2">No word sets in the library yet.</p>}
        </div>
      )}

      {tab === "new" && (
        preview ? (
          <div>
            <button onClick={() => setPreview(null)} className="text-xs text-slate-400 hover:text-indigo-600 mb-3">← Pick a different kind</button>
            <div className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-2">{COMPONENT_META[preview.kind].label} · preview — this is exactly what {student.name.split(" ")[0]} will see</div>
            <Card className="p-4 mb-4">
              <ComponentStudent component={preview.component} />
            </Card>
            <Btn onClick={assignNew}><Send size={14} /> Assign this task</Btn>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto pr-0.5">
            <p className="text-xs text-slate-400 mb-3">Pick a kind — it fills with sensible starter content instantly, ready to assign as a one-off task.</p>
            <ComponentKindPicker kinds={Object.keys(COMPONENT_META)} onPick={(kind) => setPreview({ kind, component: defaultComponent(kind, state.texts) })} />
          </div>
        )
      )}
    </Modal>
  );
}
