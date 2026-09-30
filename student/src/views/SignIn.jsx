import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { IconChevronRight } from "@tabler/icons-react";
import { Avatar, Button, Field, PasswordField, TextField } from "@app/design-system.jsx";
import { useStore } from "@app/store.jsx";
import { AuthShell } from "@app/views/Auth.jsx";

// Log in or sign up, on the teacher app's own Auth sheet. There's no real
// auth to check a password against (see CLAUDE.md), so an email that
// matches a student account signs in; the demo accounts below sign in with
// one click. Opened from a class link (/join/CODE), it says so, and the
// join page is waiting right after.
export default function SignIn({ onSignIn }) {
  const { state, dispatch } = useStore();
  const { pathname } = useLocation();
  const joining = /^\/join\/[A-Za-z0-9]+/.test(pathname);
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(null); // email just signed up with
  const accounts = state.accounts || [];
  const byEmail = (e) => accounts.find((a) => (a.email || "").toLowerCase() === e.trim().toLowerCase());

  // A new account exists once the reducer has added it — then sign in.
  useEffect(() => {
    const account = registering && byEmail(registering);
    if (account) onSignIn(account.id);
  });

  function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) { setError("Fill in every field."); return; }
    if (mode === "login") {
      const account = byEmail(email);
      if (!account) { setError("No student account with that email — sign up instead?"); return; }
      onSignIn(account.id);
      return;
    }
    if (byEmail(email)) { setError("There's already an account with that email — log in instead."); return; }
    dispatch({ type: "REGISTER_STUDENT", name, email });
    setRegistering(email);
  }

  const switchMode = (m) => { setMode(m); setError(""); };
  const lead = joining ? "Log in or sign up to join the class — your teacher accepts you after." : null;

  return (
    <AuthShell>
      <div className="text-2xl sm:text-3xl font-bold text-neutral-950 flex items-center gap-2">
        <span>👋</span> {mode === "login" ? "Welcome back" : "Create your account"}
      </div>
      <p className="text-sm text-neutral-500 mt-2 mb-8 max-w-sm">
        {lead || (mode === "login"
          ? "Log in to see your classes, the lessons your teacher shared, and their notes."
          : "Sign up, then join your class with the code your teacher gave you.")}
      </p>

      <form onSubmit={submit}>
        {mode === "signup" && (
          <Field label="Full name">
            <TextField value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Your name" autoFocus />
          </Field>
        )}
        <Field label="Email">
          <TextField type="email" state={error && !email.trim() ? "error" : "default"} value={email} autoFocus={mode === "login"}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="Enter your email" />
        </Field>
        <Field label="Password">
          <PasswordField state={error && !password.trim() ? "error" : "default"} value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder={mode === "login" ? "Enter password" : "Choose a password"} />
        </Field>
        {error && <p className="-mt-2 mb-4 text-sm text-warning-600" role="alert">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">{mode === "login" ? "Login" : "Sign up"}</Button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        {mode === "login"
          ? <>New here? <button type="button" onClick={() => switchMode("signup")} className="text-primary-600 font-semibold hover:text-primary-700">Sign up</button></>
          : <>Already have an account? <button type="button" onClick={() => switchMode("login")} className="text-primary-600 font-semibold hover:text-primary-700">Log in</button></>}
      </p>

      {mode === "login" && accounts.length > 0 && (
        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Demo accounts — try it as</div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-400 divide-y divide-neutral-400">
            {accounts.map((a) => (
              <button key={a.id} type="button" onClick={() => onSignIn(a.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-(--dur-fast) hover:bg-neutral-200">
                <Avatar name={a.name} color="primary" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-950">{a.name}</span>
                  <span className="block truncate text-xs text-neutral-600">{a.hint}</span>
                </span>
                <IconChevronRight size={16} stroke={1.75} className="shrink-0 text-neutral-500" />
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
