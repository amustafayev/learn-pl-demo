import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconBrandApple, IconBrandFacebook, IconBrandGoogle, IconSparkles } from "@tabler/icons-react";
import { Field, TextField, PasswordField, Button, SocialButton } from "../design-system.jsx";
import { TEACHER } from "../data.jsx";

/* =========================================================================
   Login / Sign up — the Learniv kit's Auth sheet: a left image panel (just a
   placeholder here — no real illustration to source) + a right-hand form,
   full-bleed outside the app shell (no sidebar/topbar — see the top-level
   <Route path="/login">/<Route path="/signup"> in english-platform-
   prototype.jsx, siblings of the shell route rather than nested inside it).
   No real auth backend to check credentials against (see CLAUDE.md's Data
   layer section) — submitting either form just navigates into the app,
   the same way the rest of this prototype has no login gate today.
   ========================================================================= */

// The Learniv reference has no real artwork to source for this panel — a
// checkerboard "no image yet" placeholder is more honest than inventing a
// stock illustration that isn't part of the kit.
function ImagePlaceholder({ className = "" }) {
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

function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-200 flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:block p-8">
          <ImagePlaceholder className="h-full min-h-[520px]" />
        </div>
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white shrink-0"><IconSparkles size={18} stroke={1.75} /></div>
            <span className="font-bold tracking-tight text-neutral-950">Lucid</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

const SOCIALS = [
  { id: "google", icon: IconBrandGoogle, label: "Google" },
  { id: "apple", icon: IconBrandApple, label: "Apple" },
  { id: "facebook", icon: IconBrandFacebook, label: "Facebook" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const firstName = TEACHER.name.split(" ")[0];

  function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError(true); return; }
    // No real auth to check against — this prototype has no login gate,
    // so "logging in" just takes you into the app (see CLAUDE.md).
    navigate("/dashboard");
  }

  return (
    <AuthShell>
      <div className="text-2xl sm:text-3xl font-bold text-neutral-950 flex items-center gap-2">
        <span>👋</span> Welcome back, {firstName}
      </div>
      <p className="text-sm text-neutral-500 mt-2 mb-8 max-w-sm">
        Log in to your account to continue where you left off. Access your personalized dashboard and stay updated.
      </p>

      <form onSubmit={submit}>
        <Field label="Email">
          <TextField type="email" state={error && !email.trim() ? "error" : "default"} value={email}
            onChange={(e) => { setEmail(e.target.value); setError(false); }} placeholder="Enter your email" autoFocus />
        </Field>
        <Field label="Password">
          <PasswordField state={error && !password.trim() ? "error" : "default"} value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }} placeholder="Enter password" />
        </Field>

        <Button type="submit" variant="primary" className="w-full !rounded-2xl">Login</Button>
      </form>

      <div className="text-center text-xs text-neutral-500 mt-6 mb-3">Login with</div>
      <div className="flex gap-3">
        {SOCIALS.map((s) => <SocialButton key={s.id} icon={s.icon} label={s.label} onClick={() => navigate("/dashboard")} />)}
      </div>

      <p className="text-center text-sm text-neutral-500 mt-8">
        Don't have an account? <button type="button" onClick={() => navigate("/signup")} className="text-primary-600 font-semibold hover:text-primary-700">Sign up</button>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", repeat: "" });
  const [error, setError] = useState(null); // which field failed, for the error state
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(null); };

  function submit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) return setError("required");
    if (form.password !== form.repeat) return setError("mismatch");
    // No real auth to register against — this prototype has no login gate,
    // so "signing up" just takes you into the app (see CLAUDE.md).
    navigate("/dashboard");
  }

  return (
    <AuthShell>
      <div className="text-2xl sm:text-3xl font-bold text-neutral-950 flex items-center gap-2">
        <span>😊</span> Join Us Today!
      </div>
      <p className="text-sm text-neutral-500 mt-2 mb-8 max-w-sm">
        Create your account to unlock exclusive features and start your journey with us. It's quick and easy!
      </p>

      <form onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <TextField state={error === "required" && !form.firstName.trim() ? "error" : "default"} value={form.firstName} onChange={set("firstName")} placeholder="your first name" autoFocus />
          </Field>
          <Field label="Last name">
            <TextField state={error === "required" && !form.lastName.trim() ? "error" : "default"} value={form.lastName} onChange={set("lastName")} placeholder="your last name" />
          </Field>
        </div>
        <Field label="Email">
          <TextField type="email" state={error === "required" && !form.email.trim() ? "error" : "default"} value={form.email} onChange={set("email")} placeholder="enter your email" />
        </Field>
        <Field label="Password">
          <PasswordField state={error === "required" && !form.password.trim() ? "error" : "default"} value={form.password} onChange={set("password")} placeholder="create strong password" />
        </Field>
        <Field label="Repeat Password">
          <PasswordField state={error === "mismatch" ? "error" : "default"} value={form.repeat} onChange={set("repeat")} placeholder="repeat password" />
        </Field>
        {error === "mismatch" && <p className="text-xs text-warning-600 -mt-2 mb-4">Passwords don't match.</p>}

        <Button type="submit" variant="primary" className="w-full !rounded-2xl">Sign up</Button>
      </form>

      <div className="text-center text-xs text-neutral-500 mt-6 mb-3">Sign up with</div>
      <div className="flex gap-3">
        {SOCIALS.map((s) => <SocialButton key={s.id} icon={s.icon} label={s.label} onClick={() => navigate("/dashboard")} />)}
      </div>

      <p className="text-center text-sm text-neutral-500 mt-8">
        Already have an account? <button type="button" onClick={() => navigate("/login")} className="text-primary-600 font-semibold hover:text-primary-700">Log in</button>
      </p>
    </AuthShell>
  );
}
