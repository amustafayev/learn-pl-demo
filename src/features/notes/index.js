/* Lesson notes — the only file outside this folder may import. Screens get
   notes through these hooks; how notes are stored and fetched (the mock db
   today, the API later) stays inside the folder. */
export { useLessonNotes, useMyNotes } from "./hooks.js";
export { googleDocsConfigured, docEmbedUrl } from "./googleDocs.js";
