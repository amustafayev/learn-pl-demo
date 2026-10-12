import { ApiError, createApiClient } from "./apiClient.js";

/* The real H5P backend in /server (@lumieducation/h5p-server + h5p-express —
   see server/README.md). Dev proxies "/h5p" there (vite.config.js); a
   deployed build needs its host to forward "/h5p" to wherever server/ runs,
   since that proxy only exists in dev. No CSRF token: the backend has no
   session/login of its own yet.

   getEdit/getPlay/save match what H5PEditorUI/H5PPlayerUI expect from their
   loadContentCallback/saveContentCallback. */
const api = createApiClient("/h5p");

// When the H5P server isn't the one answering, say what to do about it —
// every H5P call goes through here, so the editor, the player and copies all
// show the same message instead of a bare status code.
const NOT_RUNNING = new Set(["backend_unreachable", "network_error", "unexpected_response"]);
const h5p = (call) => call.catch((err) => {
  if (NOT_RUNNING.has(err?.code)) {
    throw new ApiError(err.code, "The H5P server isn't answering. Start it by running “npm run h5p”, and make sure no other app is using port 8080.");
  }
  throw err;
});

export const h5pClient = {
  getEdit: (contentId) => h5p(api.get(`/${contentId}/edit`)),

  getPlay(contentId, contextId, asUserId, readOnlyState) {
    const query = new URLSearchParams();
    if (contextId) query.append("contextId", contextId);
    if (asUserId) query.append("asUserId", asUserId);
    if (readOnlyState === true) query.append("readOnlyState", "yes");
    const qs = query.toString();
    return h5p(api.get(`/${contentId}/play${qs ? `?${qs}` : ""}`));
  },

  save: (contentId, body) => h5p(contentId ? api.patch(`/${contentId}`, body) : api.post("", body)),
  remove: (contentId) => h5p(api.delete(`/${contentId}`)),
  // Server-side copy, media files included → { contentId, metadata }.
  copy: (contentId) => h5p(api.post(`/${contentId}/copy`)),
};

/* A lesson component only holds a reference to its H5P content, so that
   content has to follow the component's lifecycle: every independent copy
   of a component (duplicate, save to a library, reuse from one) gets its own
   server-side copy — otherwise two lessons would edit the same activity —
   and removing the last thing that references it deletes it. */

function h5pComponentsIn(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((v) => h5pComponentsIn(v, found));
  } else if (value && typeof value === "object") {
    if (value.kind === "h5pActivity" && value.contentId) found.push(value);
    else Object.values(value).forEach((v) => h5pComponentsIn(v, found));
  }
  return found;
}

// Deep copy of `value` (a component, a block, a bank item …) in which every
// H5P activity points at a fresh server-side copy of its content.
export async function withOwnH5PCopies(value) {
  const copy = structuredClone(value);
  await Promise.all(h5pComponentsIn(copy).map(async (component) => {
    component.contentId = (await h5pClient.copy(component.contentId)).contentId;
  }));
  return copy;
}

export function deleteH5PContentIn(value) {
  return Promise.all(h5pComponentsIn(value).map((component) => h5pClient.remove(component.contentId)));
}
