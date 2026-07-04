import React from "react";
import { ChevronRight, X } from "lucide-react";
import { HUE, initials } from "./data.jsx";
import { useStore } from "./store.jsx";

/* Shared presentational primitives used across every view. */

export function Page({ children }) {
  return <div className="p-5 sm:p-8 max-w-6xl mx-auto">{children}</div>;
}

export function PageHead({ kicker, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {kicker && <div className="text-xs font-mono uppercase tracking-widest text-indigo-500 mb-1">{kicker}</div>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-slate-500 mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs font-mono uppercase tracking-widest text-slate-400">{children}</div>
      {right}
    </div>
  );
}

export function Crumbs({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4 flex-wrap">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={14} />}
          {it.onClick ? (
            <button onClick={it.onClick} className="hover:text-indigo-600">{it.label}</button>
          ) : (
            <span className="text-slate-700 font-medium">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function Card({ children, className = "", ...rest }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 ${className}`} {...rest}>{children}</div>;
}

export function Bar({ pct, hue = "indigo" }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full ${HUE[hue]} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Avatar({ name, size = 8 }) {
  return (
    <div
      className={`rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold shrink-0`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: size >= 10 ? 14 : 11 }}
    >
      {initials(name)}
    </div>
  );
}

export function Btn({ children, variant = "primary", size = "md", className = "", ...rest }) {
  const v = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    soft: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700",
    ghost: "text-slate-500 hover:text-indigo-600 hover:bg-slate-50",
    outline: "border border-slate-200 hover:border-indigo-300 text-slate-700 bg-white",
    danger: "text-rose-600 hover:bg-rose-50",
  }[variant];
  const s = { md: "text-sm font-semibold rounded-lg px-4 py-2.5", sm: "text-xs font-semibold rounded-lg px-3 py-1.5" }[size];
  return <button className={`inline-flex items-center gap-1.5 transition-colors ${v} ${s} ${className}`} {...rest}>{children}</button>;
}

export function Pill({ children, className = "" }) {
  return <span className={`text-[11px] rounded-md px-2 py-0.5 inline-flex items-center gap-1 ${className}`}>{children}</span>;
}

export function StatCard({ value, label, tone = "text-slate-900", hint }) {
  return (
    <Card className="p-5">
      <div className={`font-mono text-3xl font-bold ${tone}`}>{value}</div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </Card>
  );
}

/* AI-flavoured callout — used wherever the doc calls for an insight/summary. */
export function AiNote({ icon: Icon, tone = "violet", title, children }) {
  const map = {
    violet: "bg-violet-50 text-violet-900/80 border-violet-100",
    amber: "bg-amber-50 text-amber-900/80 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-900/80 border-emerald-100",
    rose: "bg-rose-50 text-rose-900/80 border-rose-100",
    sky: "bg-sky-50 text-sky-900/80 border-sky-100",
  }[tone];
  const iconc = { violet: "text-violet-600", amber: "text-amber-600", emerald: "text-emerald-600", rose: "text-rose-600", sky: "text-sky-600" }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3.5 ${map}`}>
      {Icon && <Icon size={16} className={`${iconc} shrink-0 mt-0.5`} />}
      <div className="text-sm leading-relaxed">
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  );
}

/* Modal shell */
export function Modal({ open, onClose, title, sub, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-slate-200 shadow-xl mt-10 sm:mt-0 max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-lg tracking-tight">{title}</h3>
            {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-5 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="text-xs font-mono uppercase tracking-wide text-slate-400">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
export const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";

/* Toast host — reads ephemeral toasts from the store. */
export function ToastHost() {
  const { state, dispatch } = useStore();
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className={`text-sm rounded-xl px-4 py-2.5 shadow-lg border flex items-center gap-2 animate-[fadeIn_.15s_ease] ${
            t.tone === "err" ? "bg-rose-600 text-white border-rose-700" : "bg-slate-900 text-white border-slate-800"
          }`}
        >
          {t.text}
          <button onClick={() => dispatch({ type: "DISMISS_TOAST", id: t.id })} className="opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
