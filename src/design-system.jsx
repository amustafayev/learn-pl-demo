import React from "react";
import { IconCheck, IconChevronDown, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";

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
            className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-primary-300 bg-primary-50" : "border-neutral-200 hover:border-neutral-300"}`}>
            <Avatar name={s.name} color={on ? "primary" : "neutral"} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate text-neutral-950">{s.name}</div>
              <div className="text-xs text-neutral-500">{metaFor(s)}</div>
            </div>
            <Checkbox checked={on} />
          </button>
        );
      })}
      {!students.length && <p className="text-sm text-neutral-500 p-2">{emptyText}</p>}
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
        className={`inline-flex items-center justify-center rounded-full font-semibold transition-colors ${fill} ${BUTTON_ICON_SIZE[size]} ${className}`}
        {...rest}
      >
        {Icon && <Icon size={size === "sm" ? 16 : 18} stroke={1.75} />}
      </button>
    );
  }
  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors ${fill} ${BUTTON_SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
      {chevron && <IconChevronDown size={size === "sm" ? 14 : 16} stroke={1.75} />}
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
  primary: "text-primary-600 border-primary-500", success: "text-success-600 border-success-500",
  pending: "text-pending-600 border-pending-500", warning: "text-warning-600 border-warning-500",
  info: "text-info-600 border-info-500", neutral: "text-neutral-700 border-neutral-500",
};

export function Badge({ color = "primary", children, className = "" }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_SOLID[color]} ${className}`}>{children}</span>;
}

export function Tag({ color = "neutral", onRemove, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border-l-[3px] bg-white pl-2 pr-2.5 py-1 text-xs font-semibold ${TAG_SOFT[color]}`}>
      {children}
      {onRemove && <button onClick={onRemove} className="opacity-60 hover:opacity-100"><IconX size={12} stroke={2} /></button>}
    </span>
  );
}

/* ----------------------------------------------------------------- Alert */
export function Alert({ tone = "primary", icon: Icon, actionLabel, onAction, onClose, children }) {
  const tint = {
    primary: "bg-primary-50 border-primary-200 text-neutral-900",
    warning: "bg-warning-50 border-warning-200 text-neutral-900",
  }[tone] || "bg-primary-50 border-primary-200 text-neutral-900";
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${tint}`}>
      {Icon && <Icon size={18} stroke={1.75} className="shrink-0 text-primary-600" />}
      <span className="flex-1">
        {children}{" "}
        {actionLabel && <button onClick={onAction} className="font-semibold text-primary-600 hover:text-primary-700">{actionLabel}</button>}
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

export function StatCard({ icon: Icon, label, value, delta, className = "" }) {
  return (
    <Card className={`p-5 ${className}`}>
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

export function CourseCard({ icon: Icon, badgeNew, title, mentorName, mentorColor = "pending", category, students, rating, progressPct, onViewDetail, className = "" }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="bg-primary-50 p-4">
        <div className="flex items-start justify-between">
          {Icon && <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-600"><Icon size={18} stroke={1.75} /></span>}
          {badgeNew && <Badge color="primary">New</Badge>}
        </div>
        <div className="mt-3 text-base font-bold leading-snug text-neutral-950">{title}</div>
      </div>
      <div className="p-4">
        <div className="text-xs text-neutral-600">Mentor</div>
        <div className="mt-1 flex items-center gap-2">
          <Avatar name={mentorName} color={mentorColor} size="xs" />
          <span className="text-sm font-semibold text-neutral-900">{mentorName}</span>
        </div>
        {category && <div className="mt-3 text-xs text-neutral-600">{category}</div>}
        <div className="mt-2 flex items-center gap-4 text-xs text-neutral-700">
          {students != null && <span>{students} students</span>}
          {rating != null && <span>★ {rating}</span>}
        </div>
        {progressPct != null && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold text-neutral-800">Progress</div>
            <SegmentedBar pct={progressPct} />
          </div>
        )}
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={onViewDetail}>View Detail</Button>
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

/* --------------------------------------------------- Toggle / Checkbox */
export function Switch({ checked, onChange, className = "" }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary-500" : "bg-neutral-300"} ${className}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export function Checkbox({ checked, onChange, className = "" }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${checked ? "border-primary-500 bg-primary-500" : "border-neutral-400 bg-white"} ${className}`}
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
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${value === o.id ? "bg-neutral-950 text-white" : "text-neutral-500 hover:text-neutral-800"}`}
        >
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
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-neutral-100 text-neutral-950 font-semibold" : "text-neutral-600 hover:bg-neutral-50"}`}
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
          className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${value === t.id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
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
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm font-semibold transition-colors ${value === t.id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
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
