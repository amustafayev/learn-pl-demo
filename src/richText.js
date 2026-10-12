/* Rich text for lesson notes: the editor (LessonNotes.jsx) produces HTML, and
   everything that stores or shows it goes through here first, so a note can
   only ever contain basic formatting — never a script, a link or an
   attribute that wasn't asked for. The reducer cleans on write (a real
   backend would too); readers can trust what they get. */

const KEEP = new Set(["P", "BR", "B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "H2", "H3", "DIV", "SPAN", "MARK"]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"]);
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*(,\s*[\d.]+\s*){2,3}\))$/i;

// Only text colour and highlight survive from a style attribute.
function keepStyle(style) {
  return style.split(";").map((d) => d.split(":")).map(([k, ...v]) => [(k || "").trim().toLowerCase(), v.join(":").trim()])
    .filter(([k, v]) => (k === "color" || k === "background-color") && COLOR.test(v))
    .map(([k, v]) => `${k}: ${v}`).join("; ");
}

export function cleanNoteHtml(html) {
  if (!html || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) return;
      if (child.nodeType !== 1 || DROP.has(child.tagName)) { child.remove(); return; }
      walk(child);
      if (!KEEP.has(child.tagName)) { child.replaceWith(...child.childNodes); return; }
      const style = child.tagName === "SPAN" || child.tagName === "MARK" ? keepStyle(child.getAttribute("style") || "") : "";
      [...child.attributes].forEach((a) => child.removeAttribute(a.name));
      if (style) child.setAttribute("style", style);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML.trim();
}

// Plain text of a note — for toasts, search and "is it empty?".
export function htmlToText(html) {
  if (!html || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<body>${html.replace(/<\/(p|div|li|h2|h3)>|<br\s*\/?>/gi, " $&")}</body>`, "text/html");
  return doc.body.textContent.replace(/\s+/g, " ").trim();
}

// A Google Docs (or Drive) address the teacher pasted — https only.
export function isGoogleDocUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && (u.hostname === "docs.google.com" || u.hostname === "drive.google.com");
  } catch { return false; }
}
