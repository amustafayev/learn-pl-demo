import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  IconBolt, IconUserCircle, IconShieldCheck, IconLink, IconExternalLink, IconChevronRight, IconBooks, IconSettings2, IconCreditCard,
} from "@tabler/icons-react";
import {
  Page, TabBar, NavItem, SectionLabel, Field, TextField, PasswordField, Button, Switch, Modal, ComingSoon, ImagePlaceholder,
} from "../design-system.jsx";
import { useStore } from "../store.jsx";

/* =========================================================================
   Settings — the Learniv kit's Setting sheet. Owns its own nested routing
   (top-level tabs + Account's own Profile/Security/Linked Account sub-nav)
   directly with react-router hooks, same decoupled pattern as Classes.jsx/
   Library.jsx: this is page-internal navigation, not a cross-page resource,
   so it doesn't go through the shared useNav() shim.
   ========================================================================= */

const TOP_TABS = [
  { id: "account", label: "Account", path: "/settings/account/profile" },
  { id: "course-reference", label: "Course reference", path: "/settings/course-reference" },
  { id: "system", label: "System Setting", path: "/settings/system" },
  { id: "billing", label: "Billing and Subscription", path: "/settings/billing" },
];

export default function Settings() {
  return (
    <Routes>
      <Route index element={<Navigate to="/settings/account/profile" replace />} />
      <Route path="account" element={<Navigate to="/settings/account/profile" replace />} />
      <Route path="account/:section" element={<AccountTab />} />
      <Route path="course-reference" element={
        <SettingsShell active="course-reference">
          <ComingSoon icon={IconBooks} title="Course reference — coming soon" sub="Shared grading rubrics, level descriptors, and template defaults will live here." />
        </SettingsShell>
      } />
      <Route path="system" element={
        <SettingsShell active="system">
          <ComingSoon icon={IconSettings2} title="System setting — coming soon" sub="Workspace-wide preferences (language, notifications, defaults) will live here." />
        </SettingsShell>
      } />
      <Route path="billing" element={
        <SettingsShell active="billing">
          <ComingSoon icon={IconCreditCard} title="Billing and subscription — coming soon" sub="Plan, invoices, and payment method management will live here." />
        </SettingsShell>
      } />
      <Route path="*" element={<Navigate to="/settings/account/profile" replace />} />
    </Routes>
  );
}

function SettingsShell({ active, children }) {
  const navigate = useNavigate();
  return (
    <Page>
      <div className="flex items-center gap-2 mb-6">
        <IconBolt size={22} stroke={1.75} className="text-pending-500" />
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Setting</h1>
      </div>
      <TabBar tabs={TOP_TABS} value={active} onChange={(id) => navigate(TOP_TABS.find((t) => t.id === id).path)} />
      <div className="pt-6">{children}</div>
    </Page>
  );
}

const ACCOUNT_SECTIONS = [
  { id: "profile", label: "Profile", icon: IconUserCircle },
  { id: "security", label: "Security", icon: IconShieldCheck },
  { id: "linked-account", label: "Linked Account", icon: IconLink },
];

function AccountTab() {
  const { section = "profile" } = useParams();
  const navigate = useNavigate();
  return (
    <SettingsShell active="account">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <nav className="space-y-1">
          {ACCOUNT_SECTIONS.map((s) => (
            <NavItem key={s.id} icon={s.icon} label={s.label} active={section === s.id}
              onClick={() => navigate(`/settings/account/${s.id}`)} />
          ))}
        </nav>
        <div className="max-w-2xl">
          {section === "profile" && <ProfilePanel />}
          {section === "security" && <SecurityPanel />}
          {section === "linked-account" && <LinkedAccountPanel />}
        </div>
      </div>
    </SettingsShell>
  );
}

// A left-label / right-content row — the shape every row in Security and
// Linked Account shares (title + description on the left, one action on
// the right), pulled out once instead of repeating the flex classes per row.
function SettingRow({ title, desc, action }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0">
      <div className="max-w-md">
        <div className="font-bold text-neutral-950 mb-1">{title}</div>
        <p className="text-sm text-neutral-500">{desc}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function ProfilePanel() {
  const { state, dispatch, toast } = useStore();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const [f, ...rest] = state.teacher.name.split(" ");
    setFirst(f || ""); setLast(rest.join(" "));
    setEmail(state.teacher.email); setPhone(state.teacher.phone || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.teacher.name, state.teacher.email, state.teacher.phone]);

  function save() {
    dispatch({ type: "UPDATE_TEACHER_PROFILE", patch: { name: `${first} ${last}`.trim(), email, phone } });
    toast("Profile updated");
  }

  return (
    <div className="flex flex-col sm:flex-row gap-8">
      <div className="flex flex-col items-center gap-3 shrink-0">
        <ImagePlaceholder className="w-32 h-32" />
        <button onClick={() => toast("Avatar upload isn't wired up in this prototype")}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700">Change</button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name"><TextField value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
          <Field label="Last Name"><TextField value={last} onChange={(e) => setLast(e.target.value)} /></Field>
        </div>
        <Field label="Email"><TextField type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Phone"><TextField value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Button variant="light" className="w-full !rounded-xl" onClick={save}>Save change</Button>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const { state, dispatch, toast } = useStore();
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="divide-y divide-neutral-100">
      <SettingRow title="Change Password"
        desc="Enhance account security by updating your password regularly. Enter your current and new password to proceed."
        action={<Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>Change</Button>} />
      <SettingRow title="Two-Factor Authentication"
        desc="Enhance security with Two-Factor Authentication (2FA). It requires your password and a code sent to your mobile."
        action={<Switch checked={state.teacher.twoFactorEnabled}
          onChange={(v) => { dispatch({ type: "SET_TEACHER_2FA", enabled: v }); toast(v ? "Two-factor authentication enabled" : "Two-factor authentication disabled"); }} />} />
      <SettingRow title="Login Activity"
        desc="Stay informed about your account's security. Monitor login attempts and check your history."
        action={
          <button onClick={() => toast("Login activity detail isn't available in this prototype")}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            View Detail <IconChevronRight size={14} stroke={1.75} />
          </button>
        } />
      <div className="pt-4">
        <Button variant="light" className="w-full !rounded-xl" onClick={() => toast("Security settings saved")}>Save change</Button>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const { toast } = useStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  function reset() { setCurrent(""); setNext(""); setConfirm(""); }
  function submit() {
    if (!current.trim() || !next.trim()) return toast("Fill in your current and new password", "err");
    if (next !== confirm) return toast("New password and confirmation don't match", "err");
    toast("Password updated");
    reset(); onClose();
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Change password" sub="Enter your current password, then choose a new one"
      footer={<><Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button><Button onClick={submit}>Update password</Button></>}>
      <Field label="Current password"><PasswordField value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoFocus /></Field>
      <Field label="New password"><PasswordField value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" /></Field>
      <Field label="Confirm new password"><PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" /></Field>
    </Modal>
  );
}

function LinkedAccountPanel() {
  const { state, toast } = useStore();
  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-6">
        <div className="max-w-md">
          <div className="font-bold text-neutral-950 mb-1">Linked Account</div>
          <p className="text-sm text-neutral-500">Link accounts for a seamless experience. Connect to manage settings and access services in one place.</p>
        </div>
        <span className="shrink-0 inline-flex items-center justify-center h-11 px-4 rounded-2xl border border-neutral-950 text-sm font-semibold text-neutral-900">Linked now</span>
      </div>
      <SectionLabel>Status</SectionLabel>
      <div className="divide-y divide-neutral-100">
        {state.teacher.linkedAccounts.map((acc) => (
          <div key={acc.id} className="flex items-center justify-between py-3.5">
            <div>
              <div className="font-semibold text-sm text-neutral-950">{acc.label}</div>
              <div className="text-sm text-neutral-500">{acc.handle}</div>
            </div>
            <button onClick={() => toast(`Would open ${acc.handle} in a new tab`)} className="text-neutral-400 hover:text-neutral-700 p-1">
              <IconExternalLink size={16} stroke={1.75} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
