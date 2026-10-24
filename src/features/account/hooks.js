import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockAccountClient } from "./client.js";

/* The UI's one door to the account: who's signed in (both apps' top bars,
   the login page's greeting, "Designed by"), the teacher's Settings, and
   the student app's sign-in page. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpAccountClient(api) here.
function useAccountSource() {
  const { source, revision } = useMockSource((s) => [s.teacher, s.me, s.accounts]);
  const client = useMemo(() => createMockAccountClient(source), [source]);
  return { client, revision };
}

// The signed-in teacher or student (null when signed out), and the
// teacher's profile and security writes.
export function useMe() {
  const { client, revision } = useAccountSource();
  const { data, loading, refresh } = useLoad(() => client.getMe(), "me", revision);
  const actions = useMemo(() => ({
    updateProfile: (patch) => client.updateProfile(patch).then(refresh),
    setTwoFactor: (enabled) => client.setTwoFactor(enabled).then(refresh),
  }), [client, refresh]);
  return { me: data ?? null, loading, ...actions };
}

// The student app's sign-in page: log in, sign up, the demo accounts.
// login/register resolve with { user }, or reject with an ApiError whose
// `code` says why ("invalid_credentials", "email_taken").
export function useSignIn() {
  const { client, revision } = useAccountSource();
  const { data } = useLoad(() => client.demoAccounts(), "demo", revision);
  const accounts = useMemo(() => data || [], [data]);
  return useMemo(() => ({
    accounts,
    login: (email, password) => client.login({ email, password }),
    register: (name, email, password) => client.register({ role: "student", name, email, password }),
    logout: () => client.logout(),
  }), [accounts, client]);
}
