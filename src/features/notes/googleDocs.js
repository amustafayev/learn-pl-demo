import { ApiError, createApiClient } from "../../db/apiClient.js";

/* The Google Docs seam, built on the same client as the H5P server
   (apiClient.js). A class's lesson notes can live in a Google Doc the app
   creates for the teacher: one click signs them in to Google (the browser
   sign-in popup from Google Identity Services — no backend of ours), the
   doc is created in THEIR Drive, and the page embeds it.

   Needs a Google OAuth "Web application" client ID in VITE_GOOGLE_CLIENT_ID
   (see .env.example). Without one, `googleDocsConfigured()` is false and the
   notes panel offers pasting a link instead.

   The only scope is `drive.file`: the app can see and change just the files
   it created, never the rest of the teacher's Drive. The access token stays
   in memory (about an hour); signing in again is one click. */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const drive = createApiClient("https://www.googleapis.com/drive/v3");

export const googleDocsConfigured = () => Boolean(CLIENT_ID);

let gis = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gis ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { gis = null; reject(new ApiError("network_error", "Couldn't load Google sign-in. Check your connection.")); };
    document.head.appendChild(script);
  });
  return gis;
}

let token = null;
let tokenExpiresAt = 0;
let tokenClient = null;
let pending = null; // { resolve, reject } of the sign-in in progress

// A valid access token — from memory, or from the Google sign-in popup.
// Must be called from a click, or the browser blocks the popup.
async function accessToken() {
  if (token && Date.now() < tokenExpiresAt - 60_000) return token;
  await loadGis();
  tokenClient ||= window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (res) => {
      const p = pending; pending = null;
      if (res.error || !res.access_token) return p?.reject(new ApiError(res.error || "auth_failed", "Google sign-in didn't finish."));
      token = res.access_token;
      tokenExpiresAt = Date.now() + (Number(res.expires_in) || 3600) * 1000;
      p?.resolve(token);
    },
    error_callback: (err) => {
      const p = pending; pending = null;
      p?.reject(new ApiError(err?.type || "auth_failed", err?.type === "popup_closed" ? "Google sign-in was closed." : "Google sign-in didn't finish."));
    },
  });
  return new Promise((resolve, reject) => { pending = { resolve, reject }; tokenClient.requestAccessToken(); });
}

async function authorized() {
  drive.setAuthToken(await accessToken());
  return drive;
}

export const docIdFromUrl = (url) => /^https:\/\/docs\.google\.com\/document\/d\/([\w-]+)/.exec(url || "")?.[1] || null;

// What to put in an <iframe> for a doc link: Google's own editor for the
// teacher, the read-only preview for students. Null for anything that isn't
// a Google Docs document (a Drive link can only be opened, not embedded).
export function docEmbedUrl(url, { edit = false } = {}) {
  const id = docIdFromUrl(url);
  if (!id) return null;
  return `https://docs.google.com/document/d/${id}/${edit ? "edit?embedded=true" : "preview"}`;
}

export const googleDocs = {
  // Sign in (first time) and create an empty Google Doc in the teacher's Drive.
  async createDoc(title) {
    const api = await authorized();
    const file = await api.post("/files?fields=id", { name: title, mimeType: "application/vnd.google-apps.document" });
    return { id: file.id, url: `https://docs.google.com/document/d/${file.id}/edit` };
  },
  // "Anyone with the link can read" — what students need to see the doc.
  // Only works on a doc this app created.
  async setLinkSharing(docUrl, on) {
    const id = docIdFromUrl(docUrl);
    if (!id) throw new ApiError("bad_link", "That isn't a Google Docs link.");
    const api = await authorized();
    const { permissions = [] } = await api.get(`/files/${id}/permissions?fields=permissions(id,type)`);
    const anyone = permissions.filter((p) => p.type === "anyone");
    if (on && !anyone.length) await api.post(`/files/${id}/permissions`, { role: "reader", type: "anyone" });
    if (!on) await Promise.all(anyone.map((p) => api.delete(`/files/${id}/permissions/${p.id}`)));
  },
};
