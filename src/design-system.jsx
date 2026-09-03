import React, { useState } from "react";
import { IconCheck, IconChevronDown, IconChevronRight, IconEye, IconEyeOff, IconPlus, IconSearch, IconUsers, IconVolume, IconX } from "@tabler/icons-react";

/* ---------------------------------------------------------------- Layout */
// Page-shell helpers — not from a Learniv variant sheet (breadcrumbs/page
// headers aren't a standalone "component" in the kit), but centralized here
// so every view shares one typographic treatment instead of re-deriving it.
export function Page({ children, className = "" }) {
  return <div className={`p-5 sm:p-8 max-w-6xl mx-auto ${className}`}>{children}</div>;
}

export function Breadcrumbs({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-4 flex-wrap">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <IconChevronRight size={14} stroke={1.75} />}
          {it.onClick ? (
            <button onClick={it.onClick} className="hover:text-primary-600">{it.label}</button>
          ) : (
            <span className="text-neutral-950 font-medium">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function PageHeader({ kicker, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {kicker && <div className="text-sm text-neutral-500 mb-1">{kicker}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{title}</h1>
        {sub && <p className="text-neutral-600 mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-sm font-semibold text-neutral-700">{children}</div>
      {right}
    </div>
  );
}

export function ProgressBar({ pct, tone = "primary" }) {
  const fill = { primary: "bg-primary-500", success: "bg-success-500", warning: "bg-warning-500", info: "bg-info-500", neutral: "bg-neutral-700" }[tone];
  return (
    <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
      <div className={`h-full ${fill} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */
// The "Add Discussion" dialog sheet: white rounded-2xl card, header with
// title + X close, footer with an outline secondary action + primary submit.
export function Modal({ open, onClose, title, sub, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-neutral-200 shadow-xl mt-10 sm:mt-0 max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-neutral-200 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-lg tracking-tight text-neutral-950">{title}</h3>
            {sub && <p className="text-sm text-neutral-500 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 p-1"><IconX size={18} stroke={1.75} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-5 border-t border-neutral-200 sticky bottom-0 bg-white rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="text-xs font-semibold text-neutral-600">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

// The shared shape behind every "pick some students" UI (assign content,
// invite to a live session) — each row an Avatar + name/meta + a checkbox.
export function StudentCheckList({ students, isSelected, onToggle, metaFor, emptyText = "No students to show." }) {
  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto">
      {students.map((s) => {
        const on = isSelected(s);
        return (
          <button key={s.id} onClick={() => onToggle(s)}
            className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left ${PRESS} ${on ? "border-primary-300 bg-primary-50" : "border-neutral-200 hover:border-neutral-300"}`}>
            <Avatar name={s.name} color={on ? "primary" : "neutral"} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate text-neutral-950">{s.name}</div>
              <div className="text-xs text-neutral-500">{metaFor(s)}</div>
            </div>
            {/* visual only — the whole row is already the click target, so
                this can't be a real nested <button> like Checkbox itself is */}
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 ${on ? "border-primary-500 bg-primary-500" : "border-neutral-400 bg-white"}`}>
              {on && <IconCheck size={13} stroke={3} className="text-white" />}
            </span>
          </button>
        );
      })}
      {!students.length && <p className="text-sm text-neutral-500 p-2">{emptyText}</p>}
    </div>
  );
}

// The shared shape behind every "pick one of many, grouped into named
// categories" surface — "Add a block" and "pick a component" both offer a
// big catalog of icon+label options sorted into sections, each with a small
// used-count badge if already placed in the lesson. One factory component so
// every picker in the app looks and behaves identically, instead of each
// screen growing its own near-duplicate grid.
export function CategoryPicker({ groups, onPick, columns = 2 }) {
  const gridCols = columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">{g.label}</div>
          <div className={`grid gap-2 ${gridCols}`}>
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => onPick(item.id)}
                  className={`relative flex items-start gap-2.5 rounded-xl border p-3 text-left ${PRESS} ${item.used ? "border-primary-300 bg-primary-50/60 hover:bg-primary-50" : "border-neutral-200 hover:border-primary-300 hover:bg-primary-50/40"}`}>
                  {item.used > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">{item.used}</span>}
                  {/* item.icon is whatever set provided the catalog entry (this
                      app's block/component catalogs are still lucide-react,
                      whose stroke-width prop is `strokeWidth` not `stroke` —
                      don't pass a tabler-style `stroke` here or it overrides
                      the SVG's actual stroke color and the glyph vanishes) */}
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tone}`}><Icon size={17} /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-900">{item.label}</span>
                    {item.description && <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">{item.description}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// A saved-library row — "From My Blocks" / "Insert from My Component
// Library" both reuse a saved item into a fresh spot, grouped by the
// course/lesson it was saved from so a growing library reads as folders
// instead of one flat pile. Same shape as CategoryPicker's cards (icon +
// label + meta) but single-column, denser, and ends in a plain "insert" cue
// instead of a used-count badge, since a saved item can be reused any number
// of times.
export function LibraryPickList({ groups, onPick }) {
  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-0.5">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-primary-600/80 mb-1.5 px-0.5">{g.label}</div>
          <div className="space-y-1.5">
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => onPick(item.id)}
                  className={`w-full flex items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50/50 hover:bg-primary-100/70 p-2.5 text-left ${PRESS}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tone}`}><Icon size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate text-neutral-900">{item.label}</span>
                    {item.description && <span className="block text-[11px] text-neutral-500 truncate">{item.description}</span>}
                  </span>
                  <IconPlus size={14} stroke={1.75} className="text-primary-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   Design-system factory — every primitive here is a faithful reproduction
   of one variant sheet from the Learniv UI KIT (dpopstudio/UI8), not an
   original design. Real pages are assembled FROM these, not styled ad hoc.
   Source pages: Button, Input form, Avatar, Label, Card, Toggle & checkbox,
   Bar (nav/tabs). Colors/type come from the tokens in index.css, which are
   themselves sourced from (and one hue corrected against) the kit's own
   "Token Colors" / "Primitive Colors" / "Font Display" sheets.
   ========================================================================= */

/* ---------------------------------------------------------------- Button */
// Shared tactile feedback for every clickable primitive in the factory — a
// quick scale-down on press plus a soft shadow lift on hover, so clicking
// something feels physical (like pressing a real button) instead of just an
// instant color swap. One constant so the feel stays identical everywhere
// and can be tuned in one place. Exported (not just used internally) so a
// view's own hand-rolled clickable row — one that doesn't match any single
// factory component, e.g. Classes.jsx's roster rows — can still opt into the
// exact same feel instead of inventing its own.
export const PRESS = "transition-all duration-150 hover:shadow-md active:scale-[0.97] active:shadow-sm";
// Lighter touch for flat/text-only controls (underline tabs, nav rows) where
// a shadow would look odd with no card/fill behind it — press-scale only.
export const PRESS_FLAT = "transition-all duration-150 active:scale-[0.97]";

// 5 fills x {icon-only, label, label+chevron} from the kit's Button sheet.
const BUTTON_FILL = {
  primary: "bg-primary-500 hover:bg-primary-600 text-white",
  dark: "bg-neutral-950 hover:bg-black text-white",
  light: "bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300",
  outline: "bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-950",
  disabled: "bg-neutral-200 text-neutral-500 cursor-not-allowed",
};
const BUTTON_SIZE = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
};
const BUTTON_ICON_SIZE = { md: "h-11 w-11", sm: "h-9 w-9" };

export function Button({ variant = "primary", size = "md", icon: Icon, iconOnly = false, chevron = false, className = "", children, ...rest }) {
  const fill = BUTTON_FILL[variant];
  const isDisabled = variant === "disabled";
  if (iconOnly) {
    return (
      <button
        disabled={isDisabled}
        className={`inline-flex items-center justify-center rounded-full font-semibold ${PRESS} ${fill} ${BUTTON_ICON_SIZE[size]} ${className}`}
        {...rest}
      >
        {Icon && <Icon size={size === "sm" ? 16 : 18} stroke={1.75} />}
      </button>
    );
  }
  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold ${PRESS} ${fill} ${BUTTON_SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
      {chevron && <IconChevronDown size={size === "sm" ? 14 : 16} stroke={1.75} />}
    </button>
  );
}

// A "log in / sign up with X" button — same neutral-100 fill as Button's
// light variant, just icon+label centered rather than left-aligned, since
// these always sit in an even row of equal-width brand buttons.
export function SocialButton({ icon: Icon, label, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-900 ${PRESS} ${className}`}>
      {Icon && <Icon size={17} stroke={1.75} />}
      {label}
    </button>
  );
}

/* ----------------------------------------------------------------- Input */
// Text/search fields carry 4 states from the kit's Input-form sheet:
// default (muted placeholder, neutral-100 fill), focus (white fill, orange
// ring), filled (neutral text, neutral-100 fill), error (rose fill+text).
const FIELD_STATE = {
  default: "bg-neutral-100 border-transparent text-neutral-900 placeholder:text-neutral-600 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
  error: "bg-warning-50 border-warning-500 text-warning-700 placeholder:text-warning-400",
};

export function TextField({ state = "default", className = "", ...rest }) {
  return (
    <input
      className={`w-full h-11 rounded-xl border px-3.5 text-sm outline-none transition-colors ${FIELD_STATE[state] || FIELD_STATE.default} ${className}`}
      {...rest}
    />
  );
}

// TextField plus a show/hide toggle — the Input-form sheet's password
// variant. Owns its own visibility state since every consumer wants the
// same eye-icon behavior, not a prop the parent has to wire up each time.
export function PasswordField({ state = "default", className = "", ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField type={show ? "text" : "password"} state={state} className={`pr-10 ${className}`} {...rest} />
      <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800">
        {show ? <IconEyeOff size={17} stroke={1.75} /> : <IconEye size={17} stroke={1.75} />}
      </button>
    </div>
  );
}

// A native <select>, styled to the same field treatment as TextField —
// the kit's Input-form sheet doesn't show a distinct select variant, so this
// reuses that same visual language rather than inventing a new one.
export function Select({ className = "", children, ...rest }) {
  return (
    <select
      className={`w-full h-11 rounded-xl border px-3.5 text-sm outline-none transition-colors bg-neutral-100 border-transparent text-neutral-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function SearchField({ shortcut, className = "", ...rest }) {
  return (
    <div className={`relative ${className}`}>
      <IconSearch size={16} stroke={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
      <input
        className="w-full h-11 rounded-xl border border-transparent bg-neutral-100 pl-10 pr-14 text-sm text-neutral-900 placeholder:text-neutral-600 outline-none transition-colors focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        {...rest}
      />
      {shortcut && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-mono text-neutral-600">
          {shortcut}
        </kbd>
      )}
    </div>
  );
}

export function TextArea({ state = "default", className = "", ...rest }) {
  return (
    <textarea
      className={`w-full min-h-[112px] rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors resize-none ${FIELD_STATE[state] || FIELD_STATE.default} ${className}`}
      {...rest}
    />
  );
}

// A bordered field that hosts colored chips + a free-text entry, exactly the
// "Tags" pattern in the Input-form sheet (e.g. PHP / API / Relevant / Laravel).
export function TagField({ tags = [], onRemove, placeholder = "Add a tag…", className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 min-h-[112px] rounded-xl border border-neutral-300 bg-neutral-100 p-3 ${className}`}>
      {tags.map((t, i) => (
        <Tag key={i} color={t.color || "neutral"} onRemove={onRemove ? () => onRemove(i) : undefined}>{t.label}</Tag>
      ))}
      <input className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-neutral-600" placeholder={placeholder} />
    </div>
  );
}

/* ---------------------------------------------------------------- Avatar */
const AVATAR_SIZE = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
const AVATAR_COLOR = {
  primary: "bg-primary-500", dark: "bg-neutral-950", info: "bg-info-500",
  success: "bg-success-500", warning: "bg-warning-500", pending: "bg-pending-500", neutral: "bg-neutral-400",
};
const STATUS_DOT = { online: "bg-success-500", offline: "bg-neutral-400" };

export function Avatar({ src, name, color = "primary", shape = "circle", size = "md", status, className = "" }) {
  const shapeCls = shape === "square" ? "rounded-lg" : "rounded-full";
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={name || ""} className={`${AVATAR_SIZE[size]} ${shapeCls} object-cover`} />
      ) : (
        <span className={`flex items-center justify-center font-bold text-white ${AVATAR_SIZE[size]} ${shapeCls} ${AVATAR_COLOR[color]}`}>{initial}</span>
      )}
      {status && <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT[status]}`} />}
    </span>
  );
}

/* ----------------------------------------------------------- Badge / Tag */
// Two treatments from the Label sheet: solid (colored fill, white text) and
// soft (pale fill, colored left rule + colored text) — the latter is what
// the kit calls a "Tag".
const BADGE_SOLID = {
  primary: "bg-primary-500 text-white", success: "bg-success-500 text-white",
  pending: "bg-pending-500 text-white", warning: "bg-warning-500 text-white",
  info: "bg-info-500 text-white", neutral: "bg-neutral-800 text-white",
};
const TAG_SOFT = {
  primary: "bg-primary-50 text-primary-600 border-primary-500", success: "bg-success-50 text-success-600 border-success-500",
  pending: "bg-pending-50 text-pending-600 border-pending-500", warning: "bg-warning-50 text-warning-600 border-warning-500",
  info: "bg-info-50 text-info-600 border-info-500", neutral: "bg-neutral-200 text-neutral-700 border-neutral-500",
};

export function Badge({ color = "primary", children, className = "" }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_SOLID[color]} ${className}`}>{children}</span>;
}

export function Tag({ color = "neutral", onRemove, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border-l-[3px] pl-2 pr-2.5 py-1 text-xs font-semibold ${TAG_SOFT[color]}`}>
      {children}
      {onRemove && <button onClick={onRemove} className="opacity-60 hover:opacity-100"><IconX size={12} stroke={2} /></button>}
    </span>
  );
}

/* ----------------------------------------------------------------- Alert */
const ALERT_TONE = {
  primary: { bg: "bg-primary-50 border-primary-200", icon: "text-primary-600", action: "text-primary-600 hover:text-primary-700" },
  success: { bg: "bg-success-50 border-success-200", icon: "text-success-600", action: "text-success-600 hover:text-success-700" },
  warning: { bg: "bg-warning-50 border-warning-200", icon: "text-warning-600", action: "text-warning-600 hover:text-warning-700" },
  pending: { bg: "bg-pending-50 border-pending-200", icon: "text-pending-600", action: "text-pending-600 hover:text-pending-700" },
  info: { bg: "bg-info-50 border-info-200", icon: "text-info-600", action: "text-info-600 hover:text-info-700" },
};

export function Alert({ tone = "primary", icon: Icon, title, actionLabel, onAction, onClose, children }) {
  const t = ALERT_TONE[tone] || ALERT_TONE.primary;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm text-neutral-900 ${t.bg}`}>
      {Icon && <Icon size={18} stroke={1.75} className={`shrink-0 mt-0.5 ${t.icon}`} />}
      <span className="flex-1 leading-relaxed">
        {title && <span className="block font-semibold mb-0.5 text-neutral-950">{title}</span>}
        {children}{" "}
        {actionLabel && <button onClick={onAction} className={`font-semibold ${t.action}`}>{actionLabel}</button>}
      </span>
      {onClose && <button onClick={onClose} className="shrink-0 text-neutral-500 hover:text-neutral-800"><IconX size={16} stroke={1.75} /></button>}
    </div>
  );
}

/* ------------------------------------------------------------ ChatBubble */
export function ChatBubble({ onReply, children }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-800">
      <span className="flex-1">{children}</span>
      {onReply && (
        <button onClick={onReply} className="shrink-0 rounded-full border border-neutral-950 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50">
          Reply
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Card */
export function Card({ children, className = "", ...rest }) {
  return <div className={`rounded-2xl border border-neutral-200 bg-white ${className}`} {...rest}>{children}</div>;
}

export function StatCard({ icon: Icon, label, value, delta, onClick, className = "" }) {
  return (
    <Card
      className={`p-5 ${onClick ? `text-left w-full cursor-pointer hover:border-primary-300 ${PRESS}` : ""} ${className}`}
      onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-neutral-700">
          {Icon && <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100"><Icon size={17} stroke={1.75} /></span>}
          {label}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold text-neutral-950">{value}</div>
      {delta && <div className="mt-1 text-xs font-semibold text-success-600">{delta}</div>}
    </Card>
  );
}

// Segmented progress bar — the dashed multi-cell bar under "Progress" on the
// Course card, filled left-to-right by whole cells up to pct.
export function SegmentedBar({ pct = 0, cells = 10 }) {
  const filled = Math.round((pct / 100) * cells);
  return (
    <div className="flex gap-1">
      {Array.from({ length: cells }).map((_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < filled ? "bg-primary-500" : "bg-neutral-200"}`} />
      ))}
    </div>
  );
}

// An honest "no image sourced yet" placeholder (the classic transparent-PNG
// checkerboard) — used wherever the kit shows artwork/a photo this prototype
// has no real asset for (Auth's side panel, Settings' avatar), rather than
// inventing stock art that isn't part of the Learniv kit.
export function ImagePlaceholder({ className = "" }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        backgroundColor: "#f7f7f7",
        backgroundImage:
          "linear-gradient(45deg, #e9e9e9 25%, transparent 25%), linear-gradient(-45deg, #e9e9e9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9e9e9 75%), linear-gradient(-45deg, transparent 75%, #e9e9e9 75%)",
        backgroundSize: "28px 28px",
        backgroundPosition: "0 0, 0 14px, 14px -14px, -14px 0",
      }}
    />
  );
}

const BAND_TINT = { primary: "bg-primary-50", success: "bg-success-50", pending: "bg-pending-50", warning: "bg-warning-50", info: "bg-info-50" };

// `stats` is a list of {icon, value} pairs rendered as icon+text side by
// side (e.g. class count, lesson count) — kept generic rather than hardcoded
// to "students/rating" since not every consumer has both of those numbers.
export function CourseCard({ icon: Icon, tone = "primary", title, creatorLabel = "Mentor", creatorName, creatorColor = "dark", category, stats = [], progressPct, onViewDetail, className = "" }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className={`p-5 ${BAND_TINT[tone]}`}>
        <div className="flex items-start justify-between">
          {Icon && <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"><Icon size={18} stroke={1.75} /></span>}
        </div>
        <div className="mt-3 text-xl font-bold leading-snug text-neutral-950">{title}</div>
        {creatorName && (
          <div className="mt-4">
            <div className="text-sm text-neutral-600">{creatorLabel}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <Avatar name={creatorName} shape="square" color={creatorColor} size="xs" />
              <span className="text-sm font-semibold text-neutral-900">{creatorName}</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        {category && <div className="text-sm text-neutral-500">{category}</div>}
        {stats.length > 0 && (
          <div className="mt-2.5 flex items-center gap-4 text-sm text-neutral-800">
            {stats.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5"><s.icon size={16} stroke={1.75} className="text-neutral-500" /> {s.value}</span>
            ))}
          </div>
        )}
        {progressPct != null && (
          <div className="mt-4">
            <div className="mb-1.5 text-sm font-bold text-neutral-950">Progress</div>
            <SegmentedBar pct={progressPct} />
          </div>
        )}
        <Button variant="outline" className="mt-4 w-full !rounded-2xl" onClick={onViewDetail}>View Detail</Button>
      </div>
    </Card>
  );
}

// Same band+body shell as CourseCard (tinted header, stats row, progress
// bar, full-width "View Detail" button) — a Class just fills it with
// roster/schedule instead of a creator credit, since it's a roster on a
// schedule, not authored content. `roster` is a list of {id, name, color}
// rendered as an overlapping avatar stack, same as the Student panel.
export function ClassCard({ icon: Icon = IconUsers, tone = "primary", title, scheduleLabel, courseTitle, currentLessonTitle, roster = [], studentCountLabel, progressPct, onViewDetail, className = "" }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className={`p-5 ${BAND_TINT[tone]}`}>
        <div className="flex items-start justify-between gap-2">
          {Icon && <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm shrink-0"><Icon size={18} stroke={1.75} /></span>}
          {scheduleLabel && <Tag color="neutral">{scheduleLabel}</Tag>}
        </div>
        <div className="mt-3 text-xl font-bold leading-snug text-neutral-950">{title}</div>
        <div className="mt-1.5 text-sm text-neutral-600">{courseTitle}</div>
      </div>
      <div className="p-5">
        <div className="text-sm text-neutral-500 min-h-[1.25rem]">{currentLessonTitle ? `Current: ${currentLessonTitle}` : ""}</div>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden">
            {roster.slice(0, 5).map((s) => <Avatar key={s.id} name={s.name} color={s.color} size="xs" />)}
          </div>
          <span className="text-sm text-neutral-800">{studentCountLabel}</span>
        </div>
        {progressPct != null && (
          <div className="mt-4">
            <div className="mb-1.5 text-sm font-bold text-neutral-950">Progress</div>
            <SegmentedBar pct={progressPct} />
          </div>
        )}
        <Button variant="outline" className="mt-4 w-full !rounded-2xl" onClick={onViewDetail}>View Detail</Button>
      </div>
    </Card>
  );
}

// The radio-marked device/session row from Settings → Login Activity.
export function SessionRow({ title, subtitle, active, className = "" }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${active ? "bg-neutral-100" : ""} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${active ? "bg-primary-500" : "bg-neutral-400"}`} />
      <div>
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        {subtitle && <div className={`text-xs ${active ? "text-primary-600" : "text-neutral-500"}`}>{subtitle}</div>}
      </div>
    </div>
  );
}

// A placeholder shell for a section that isn't built yet — one empty state
// reused everywhere instead of each spot inventing its own.
export function ComingSoon({ icon: Icon, title, sub }) {
  return (
    <Card className="p-10 text-center max-w-lg mx-auto">
      {Icon && <span className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4"><Icon size={22} stroke={1.75} /></span>}
      <div className="font-bold text-lg mb-1.5 text-neutral-950">{title}</div>
      <p className="text-sm text-neutral-500">{sub}</p>
    </Card>
  );
}

// Speaks a word/phrase via the browser's built-in TTS — one button per
// accent, since US/UK vowel differences are exactly what a learner needs to
// hear apart. Not from a Learniv sheet; kept in the factory since it's a
// small reusable primitive touched from several pages.
export function SpeakButton({ text, className = "" }) {
  function speak(accent) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent === "uk" ? "en-GB" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {["us", "uk"].map((accent) => (
        <button key={accent} type="button" title={`Play ${accent.toUpperCase()} pronunciation`} onClick={(e) => { e.stopPropagation(); speak(accent); }}
          className="inline-flex items-center gap-0.5 text-[10px] font-mono text-neutral-500 hover:text-primary-600 rounded px-1 py-0.5 hover:bg-neutral-100 transition-colors">
          <IconVolume size={12} stroke={1.75} /> {accent.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

/* --------------------------------------------------- Toggle / Checkbox */
export function Switch({ checked, onChange, className = "" }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 rounded-full ${PRESS_FLAT} ${checked ? "bg-primary-500" : "bg-neutral-300"} ${className}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export function Checkbox({ checked, onChange, className = "" }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`flex h-5 w-5 items-center justify-center rounded-md border ${PRESS_FLAT} ${checked ? "border-primary-500 bg-primary-500" : "border-neutral-400 bg-white"} ${className}`}
    >
      {checked && <IconCheck size={13} stroke={3} className="text-white" />}
    </button>
  );
}

// The pill-shaped Light/Dark segmented switcher used in the sidebar footer.
export function SegmentedToggle({ value, onChange, options = [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }] }) {
  return (
    <div className="inline-flex rounded-full border border-neutral-300 bg-white p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange?.(o.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${PRESS_FLAT} ${value === o.id ? "bg-neutral-950 text-white" : "text-neutral-500 hover:text-neutral-800"}`}
        >
          {o.icon && <o.icon size={14} stroke={1.75} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- Nav / Tabs */
// Sidebar nav-item — leaf building block; the sidebar shell itself is
// assembled per-page, not part of the factory.
export function NavItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium ${PRESS_FLAT} ${active ? "bg-neutral-100 text-neutral-950 font-semibold" : "text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100"}`}
    >
      {Icon && <Icon size={18} stroke={1.75} />}
      <span className="flex-1 text-left">{label}</span>
      {badge != null && <Badge color="neutral">{badge}</Badge>}
    </button>
  );
}

export function NavSectionLabel({ children }) {
  return <div className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{children}</div>;
}

// Underline tab bar — Detail / Assignment / Discussion / Report issue.
export function TabBar({ tabs, value, onChange }) {
  return (
    <div className="flex items-center gap-6 border-b border-neutral-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange?.(t.id)}
          className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${PRESS_FLAT} ${value === t.id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Filter pills with a trailing count badge — All / Unread(13) / Mentioned(4).
export function PillTabs({ tabs, value, onChange }) {
  return (
    <div className="flex items-center gap-6 border-b border-neutral-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange?.(t.id)}
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm font-semibold ${PRESS_FLAT} ${value === t.id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
        >
          {t.label}
          {t.count != null && (
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${value === t.id ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-600"}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
