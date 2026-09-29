/* =========================================================================
   Uploaded media (audio a teacher attaches to a Listening component) — the
   mock stand-in for a real backend's file storage, same seam as the rest of
   db/: swap these two functions for an upload endpoint that returns a URL
   and nothing above this file changes.

   IndexedDB rather than localStorage: an MP3 is megabytes, far past
   localStorage's ~5MB total, and would silently stop the component library
   (which does live in localStorage) from saving at all. Blobs here survive
   reloads, so a Listening component saved to the library keeps its audio.
   Components only ever hold the returned id, never the file itself.
   ========================================================================= */
import { uid } from "./mockDb.jsx";

const DB_NAME = "lucid.media";
const STORE = "files";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  }));
}

// Stores the file, returns the id a component keeps.
export async function saveMedia(file) {
  const id = uid("media");
  await run("readwrite", (store) => store.put(file, id));
  return id;
}

// The stored Blob for an id, or null if it's gone (e.g. site data cleared).
export function loadMedia(id) {
  return run("readonly", (store) => store.get(id)).then((blob) => blob || null);
}
