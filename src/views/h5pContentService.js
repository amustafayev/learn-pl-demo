// Talks to the real H5P backend in /server (a small
// @lumieducation/h5p-server + h5p-express Express app — see
// server/README.md). JS port of @lumieducation/h5p-react's own example
// client (packages/h5p-rest-example-client/src/services/ContentService.ts)
// trimmed to what H5PEditorUI/H5PPlayerUI actually call — no CSRF token,
// since this backend has no session/login of its own yet.
//
// In dev, Vite proxies "/h5p" to the backend (vite.config.js), so this
// stays a same-origin relative path — no CORS to deal with.
const BASE_URL = "/h5p";

export const h5pContentService = {
  async getEdit(contentId) {
    const res = await fetch(`${BASE_URL}/${contentId}/edit`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  async getPlay(contentId, contextId, asUserId, readOnlyState) {
    const query = new URLSearchParams();
    if (contextId) query.append("contextId", contextId);
    if (asUserId) query.append("asUserId", asUserId);
    if (readOnlyState === true) query.append("readOnlyState", "yes");
    const qs = query.toString();
    const res = await fetch(`${BASE_URL}/${contentId}/play${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  async save(contentId, requestBody) {
    const res = await fetch(contentId ? `${BASE_URL}/${contentId}` : BASE_URL, {
      method: contentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${await res.text()}`);
    return res.json();
  },

  async remove(contentId) {
    const res = await fetch(`${BASE_URL}/${contentId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  },
};
