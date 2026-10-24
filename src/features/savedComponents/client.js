/* Saved components API — the teacher's library of components kept for reuse
   (Library → Saved, and "Add a component → Saved" in a lesson). The UI only
   talks to a client below, through ./hooks.js — never to reducer actions or
   `state.componentBank`.

   Contract (every method resolves; failures reject with an ApiError):
     list()                          -> SavedComponent[]   newest first
     save({ component, title, from }) -> void   stores an independent snapshot
     remove(id)                      -> void
   SavedComponent = { id, title, kind, from, data, createdAt }
   (docs/openapi.yaml: "Saved components".)

   Two implementations of that contract:
     createMockSavedComponentsClient — on the in-browser mock db; what the app uses today
     createHttpSavedComponentsClient — the REST calls in docs/openapi.yaml, on
                                       db/apiClient.js; not wired in yet */

// `getState` reads the latest mock db; `dispatch` writes it.
export function createMockSavedComponentsClient({ getState, dispatch }) {
  return {
    async list() { return getState().componentBank || []; },
    async save({ component, title, from }) { dispatch({ type: "SAVE_COMPONENT_TO_BANK", component, title, from }); },
    async remove(id) { dispatch({ type: "REMOVE_COMPONENT_FROM_BANK", bankId: id }); },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpSavedComponentsClient(api) {
  const base = "/library/saved-components";
  return {
    list: () => api.get(base),
    save: (body) => api.post(base, body).then(() => {}),
    remove: (id) => api.delete(`${base}/${id}`).then(() => {}),
  };
}
