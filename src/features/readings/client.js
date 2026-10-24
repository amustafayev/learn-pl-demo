import { nullIfMissing } from "../../db/apiClient.js";

/* Reading library API — reading texts kept in nested folders (Library →
   Reading), and the texts a lesson's passages show. The UI only talks to a
   client below, through ./hooks.js — never to reducer actions or
   `state.texts` / `state.textFolders`.

   Contract (every method resolves; failures reject with an ApiError):
     listFolders()                      -> ReadingFolder[]   flat; the tree is parentId
     createFolder({ parentId, name })   -> void
     renameFolder(id, name)             -> void
     deleteFolder(id)                   -> void   the folder, folders below it, their texts
     listTexts()                        -> ReadingTextSummary[]   no `body`
     createText(input)                  -> void   ReadingTextInput
     getText(id)                        -> ReadingText | null     with its tagged `body`
   (docs/openapi.yaml: "Library — reading".)

   Two implementations of that contract:
     createMockReadingsClient — on the in-browser mock db; what the app uses today
     createHttpReadingsClient — the REST calls in docs/openapi.yaml, on
                                db/apiClient.js; not wired in yet */

// `getState` reads the latest mock db; `dispatch` writes it.
export function createMockReadingsClient({ getState, dispatch }) {
  return {
    async listFolders() { return getState().textFolders || []; },
    async createFolder({ parentId = null, name }) { dispatch({ type: "ADD_TEXT_FOLDER", parentId, name }); },
    async renameFolder(id, name) { dispatch({ type: "RENAME_TEXT_FOLDER", id, name }); },
    async deleteFolder(id) { dispatch({ type: "DELETE_TEXT_FOLDER", id }); },
    // Like the API's list, without the body: a text is opened with getText.
    async listTexts() { return (getState().texts || []).map(({ body: _body, ...summary }) => summary); },
    async createText(input) { dispatch({ type: "ADD_TEXT", text: input }); },
    async getText(id) { return (getState().texts || []).find((t) => t.id === id) || null; },
  };
}

// Same contract over HTTP. `audience` is "teacher" (the library endpoints)
// or "student": no library to browse (lessons reach them already built),
// and only texts they may read.
export function createHttpReadingsClient(api, { audience = "teacher" } = {}) {
  const student = audience === "student";
  return {
    listFolders: () => (student ? Promise.resolve([]) : api.get("/library/reading/folders")),
    createFolder: ({ parentId = null, name }) => api.post("/library/reading/folders", { parentId, name }).then(() => {}),
    renameFolder: (id, name) => api.patch(`/library/reading/folders/${id}`, { name }).then(() => {}),
    deleteFolder: (id) => api.delete(`/library/reading/folders/${id}`).then(() => {}),
    listTexts: () => (student ? Promise.resolve([]) : api.get("/library/reading/texts")),
    createText: (input) => api.post("/library/reading/texts", input).then(() => {}),
    getText: (id) => api.get(student ? `/me/library/reading/texts/${id}` : `/library/reading/texts/${id}`).catch(nullIfMissing),
  };
}
