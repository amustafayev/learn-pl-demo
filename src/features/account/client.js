import { ApiError } from "../../db/apiClient.js";

/* Account API — who's signed in, the teacher's profile and security
   settings, and signing in, up and out. The UI only talks to a client
   below, through ./hooks.js — never to `state.teacher`, `state.me`,
   `state.accounts` or reducer actions.

   Contract (every method resolves; failures reject with an ApiError):
     getMe()                              -> Teacher | Student | null (signed out)
     updateProfile({ name, email, phone }) -> void   teacher only
     setTwoFactor(enabled)                -> void    teacher only
     login({ email, password })           -> { user }   rejects "invalid_credentials"
     register({ role, name, email, password })
                                          -> { user }   rejects "email_taken"
     logout()                             -> void
     demoAccounts()                       -> [{ id, name, email, hint }]
                                             the prototype's one-click sign-in;
                                             the real API has none
   Teacher and Student carry `role` (docs/openapi.yaml: Auth & profile).

   Two implementations of that contract:
     createMockAccountClient — on the in-browser mock db; what the app uses today
     createHttpAccountClient — the REST calls in docs/openapi.yaml, on
                               db/apiClient.js; not wired in yet */

const sameEmail = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

// The mock signs in students only (the teacher app has no sign-in gate), by
// email alone: there's no password to check.
export function createMockAccountClient({ getState, dispatch, waitFor }) {
  const accountFor = (state, email) => (state.accounts || []).find((a) => sameEmail(a.email, email));
  const asStudent = ({ hint: _hint, ...account }) => ({ ...account, role: "student" });
  return {
    async getMe() {
      const s = getState();
      if ("me" in s) return s.me ? { ...s.me, role: "student" } : null;
      return s.teacher ? { ...s.teacher, role: "teacher" } : null;
    },
    async updateProfile(patch) { dispatch({ type: "UPDATE_TEACHER_PROFILE", patch }); },
    async setTwoFactor(enabled) { dispatch({ type: "SET_TEACHER_2FA", enabled }); },
    async login({ email }) {
      const account = accountFor(getState(), email);
      if (!account) throw new ApiError("invalid_credentials", "No account with that email.");
      return { user: asStudent(account) };
    },
    async register({ name, email }) {
      if (accountFor(getState(), email)) throw new ApiError("email_taken", "There's already an account with that email.");
      dispatch({ type: "REGISTER_STUDENT", name, email });
      const state = await waitFor((s) => accountFor(s, email));
      return { user: asStudent(accountFor(state, email)) };
    },
    async logout() {},
    async demoAccounts() { return getState().accounts || []; },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient();
// signing in or up gives it the token every later call carries.
export function createHttpAccountClient(api) {
  const signIn = async (path, body) => {
    const { token, user } = await api.post(path, body);
    api.setAuthToken(token);
    return { user };
  };
  return {
    getMe: () => api.get("/me").catch((err) => {
      if (err.code === "401" || err.code === "unauthorized") return null;
      throw err;
    }),
    updateProfile: (patch) => api.patch("/me", patch).then(() => {}),
    setTwoFactor: (enabled) => api.put("/me/two-factor", { enabled }).then(() => {}),
    login: (body) => signIn("/auth/login", body),
    register: (body) => signIn("/auth/register", body),
    logout: async () => { await api.post("/auth/logout"); api.clearAuthToken(); },
    demoAccounts: async () => [],
  };
}
