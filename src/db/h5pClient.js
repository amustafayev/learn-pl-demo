import { createApiClient } from "./apiClient.js";

/* The real H5P backend in /server (@lumieducation/h5p-server + h5p-express —
   see server/README.md). Dev proxies "/h5p" there (vite.config.js); a
   deployed build needs its host to forward "/h5p" to wherever server/ runs,
   since that proxy only exists in dev. No CSRF token: the backend has no
   session/login of its own yet.

   getEdit/getPlay/save match what H5PEditorUI/H5PPlayerUI expect from their
   loadContentCallback/saveContentCallback. */
const api = createApiClient("/h5p");

export const h5pClient = {
  getEdit: (contentId) => api.get(`/${contentId}/edit`),

  getPlay(contentId, contextId, asUserId, readOnlyState) {
    const query = new URLSearchParams();
    if (contextId) query.append("contextId", contextId);
    if (asUserId) query.append("asUserId", asUserId);
    if (readOnlyState === true) query.append("readOnlyState", "yes");
    const qs = query.toString();
    return api.get(`/${contentId}/play${qs ? `?${qs}` : ""}`);
  },

  save: (contentId, body) => (contentId ? api.patch(`/${contentId}`, body) : api.post("", body)),
  remove: (contentId) => api.delete(`/${contentId}`),
  // Server-side copy, media files included → { contentId, metadata }.
  copy: (contentId) => api.post(`/${contentId}/copy`),
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
