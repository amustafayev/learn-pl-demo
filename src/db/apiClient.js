/* Seam for a real backend (see CLAUDE.md's "Data layer" section). The H5P
   client (db/h5pClient.js) is its first real caller; mockDb.jsx's reducer is
   still fully synchronous. When a reducer case starts awaiting a real
   request, build on createApiClient() here instead of reaching for fetch()
   ad hoc, so every endpoint fails the same way: a typed ApiError with a
   {code, description} shape a toast can render directly, never a raw
   Response/TypeError.

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

// For a "get one" call where a missing (or not-yours) answer just means
// "none": `api.get(path).catch(nullIfMissing)`.
export function nullIfMissing(err) {
  if (["404", "403", "not_found", "forbidden"].includes(err?.code)) return null;
  throw err;
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

    const text = await res.text();
    // An HTML page where data was expected means the request never reached
    // the API: a hosting catch-all rewrite or the dev server's own fallback
    // answering with index.html because the backend isn't running.
    const isHtmlPage = /^\s*</.test(text);
    let data = null;
    if (text && !isHtmlPage) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) {
      // A web page or an empty reply instead of the backend's own error
      // means the backend never answered: something else holds its port
      // (another app's 404 page), or nothing does (the dev proxy's bare 500).
      if (isHtmlPage || !text) {
        throw new ApiError("backend_unreachable", `The backend didn't answer (${res.status}) — it may not be running, or another program is using its port.`);
      }
      const message = typeof data === "string" ? data : data?.description || data?.message;
      throw new ApiError(data?.code || String(res.status), message || `The server couldn't handle this request (${res.status}).`);
    }
    if (isHtmlPage) {
      throw new ApiError("unexpected_response", "Got a web page back instead of data — the backend may not be running.");
    }
    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: (path) => request(path, { method: "DELETE" }),
    setAuthToken: (nextToken) => { token = nextToken; },
    clearAuthToken: () => { token = null; },
  };
}
