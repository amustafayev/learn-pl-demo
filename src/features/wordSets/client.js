import { nullIfMissing } from "../../db/apiClient.js";
import { subtreeWords } from "../../libraryTree.js";

/* Word sets API — the Library's word sets, nested to any depth (IELTS →
   Linkers → Contrast → the words). The UI only talks to a client below,
   through ./hooks.js — never to reducer actions or `state.wordSets`.

   Contract (every method resolves; failures reject with an ApiError):
     list()                             -> WordSet[]   flat; each with its OWN words
     create({ parentId, title, level }) -> void
     update(id, { title?, level? })     -> void
     remove(id)                         -> void   and every word set inside it
     addWord(setId, word)               -> void   { term, az?, def?, example? }
     updateWord(setId, wordId, patch)   -> void
     deleteWord(setId, wordId)          -> void
     wordsOf(setId)                     -> Word[] | null   the set's words and
                                           everything below it (what assigning gives)
   Every word has an `id` (docs/openapi.yaml: "Library — word sets").

   Two implementations of that contract:
     createMockWordSetsClient — on the in-browser mock db; what the app uses today
     createHttpWordSetsClient — the REST calls in docs/openapi.yaml, on
                                db/apiClient.js; not wired in yet */

// `getState` reads the latest mock db; `dispatch` writes it. The mock knows
// a word only by its place in the set, so that place is its id here.
export function createMockWordSetsClient({ getState, dispatch }) {
  const sets = () => getState().wordSets || [];
  const withWordIds = (set) => ({ ...set, words: set.words.map((w, i) => ({ ...w, id: String(i) })) });
  return {
    async list() { return sets().map(withWordIds); },
    async create({ parentId = null, title, level }) { dispatch({ type: "ADD_WORDSET", parentId, title, level }); },
    async update(id, patch) { dispatch({ type: "UPDATE_WORDSET", id, patch }); },
    async remove(id) { dispatch({ type: "DELETE_WORDSET", id }); },
    async addWord(setId, word) { dispatch({ type: "ADD_WORD", setId, word }); },
    async updateWord(setId, wordId, patch) { dispatch({ type: "UPDATE_WORD", setId, index: Number(wordId), patch }); },
    async deleteWord(setId, wordId) { dispatch({ type: "DELETE_WORD", setId, index: Number(wordId) }); },
    async wordsOf(setId) { return sets().some((s) => s.id === setId) ? subtreeWords(sets(), setId) : null; },
  };
}

// Same contract over HTTP. `audience` is "teacher" (the library endpoints)
// or "student": only the words of a set they were assigned.
export function createHttpWordSetsClient(api, { audience = "teacher" } = {}) {
  const base = "/library/word-sets";
  return {
    list: () => (audience === "student" ? Promise.resolve([]) : api.get(base)),
    create: ({ parentId = null, title, level }) => api.post(base, { parentId, title, level }).then(() => {}),
    update: (id, patch) => api.patch(`${base}/${id}`, patch).then(() => {}),
    remove: (id) => api.delete(`${base}/${id}`).then(() => {}),
    addWord: (setId, word) => api.post(`${base}/${setId}/words`, word).then(() => {}),
    updateWord: (setId, wordId, patch) => api.patch(`${base}/${setId}/words/${wordId}`, patch).then(() => {}),
    deleteWord: (setId, wordId) => api.delete(`${base}/${setId}/words/${wordId}`).then(() => {}),
    wordsOf: (setId) => api.get(audience === "student" ? `/me${base}/${setId}/words` : `${base}/${setId}/words?includeBelow=true`).catch(nullIfMissing),
  };
}
