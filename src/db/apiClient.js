/* Seam for a real backend (see CLAUDE.md's "Data layer" section) — nothing
   in this file is called yet, since mockDb.jsx's reducer is fully
   synchronous. When a reducer case starts awaiting a real request, import
   createApiClient() here instead of reaching for fetch() ad hoc, so every
   endpoint fails the same way: a typed ApiError with a {code, description}
   shape a toast can render directly, never a raw Response/TypeError.

   Modeled after a real Xsolla project's axios client factory (setupApi.ts +
   getApiError.ts): one client instance created once, a response step that
   normalizes every failure the same way, and setAuthToken/clearAuthToken
   that mutate that instance so every call after login carries the token
   without threading it through every function signature. Swapped to
   fetch since this prototype has no axios dependency to justify yet. */

export class ApiError extends Error {
  constructor(code, description) {
    super(description);
    this.name = "ApiError";
    this.code = code;
    this.description = description;
  }
}

export function createApiClient(baseURL) {
  let token = null;

  async function request(path, { method = "GET", body, headers } = {}) {
    let res;
    try {
      res = await fetch(`${baseURL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError("network_error", "Couldn't reach the server. Check your connection and try again.");
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(data?.code || String(res.status), data?.description || data?.message || "Something went wrong.");
    }
    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    delete: (path) => request(path, { method: "DELETE" }),
    setAuthToken: (nextToken) => { token = nextToken; },
    clearAuthToken: () => { token = null; },
  };
}
