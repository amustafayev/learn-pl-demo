import { describe, expect, it } from "vitest";
import { cleanNoteHtml, htmlToText, isGoogleDocUrl } from "./richText.js";

// A lesson note's HTML is shown to students as HTML, so cleanNoteHtml is a
// security boundary: only basic formatting may survive it.
describe("cleanNoteHtml", () => {
  it("keeps basic formatting", () => {
    const html = "<h3>Homework</h3><ul><li><b>Write</b> <i>three</i> <u>updates</u></li></ul><p>Bye</p>";
    expect(cleanNoteHtml(html)).toBe(html);
  });

  it("drops scripts, frames and embeds with their contents", () => {
    expect(cleanNoteHtml('<p>Hi<script>alert(1)</script><iframe src="https://evil.example"></iframe></p>')).toBe("<p>Hi</p>");
  });

  it("strips every attribute, event handlers and links included", () => {
    expect(cleanNoteHtml('<p onclick="steal()" class="x" id="y">Hi</p>')).toBe("<p>Hi</p>");
    expect(cleanNoteHtml('<a href="javascript:steal()">click</a>')).toBe("click");
  });

  it("unwraps tags it doesn't know, keeping their text", () => {
    expect(cleanNoteHtml("<section><article>Plain words</article></section>")).toBe("Plain words");
  });

  it("keeps only text colour and highlight on span/mark, and only real colours", () => {
    expect(cleanNoteHtml('<span style="color: #ff5c20; font-size: 40px">orange</span>')).toBe('<span style="color: #ff5c20">orange</span>');
    expect(cleanNoteHtml('<mark style="background-color: rgba(255, 92, 32, 0.28)">lit</mark>')).toBe('<mark style="background-color: rgba(255, 92, 32, 0.28)">lit</mark>');
    expect(cleanNoteHtml('<span style="color: url(https://evil.example)">x</span>')).toBe("<span>x</span>");
    expect(cleanNoteHtml('<p style="color: red">x</p>')).toBe("<p>x</p>");
  });

  it("returns an empty string for nothing", () => {
    expect(cleanNoteHtml("")).toBe("");
    expect(cleanNoteHtml(null)).toBe("");
  });
});

describe("htmlToText", () => {
  it("separates blocks and line breaks with a space", () => {
    expect(htmlToText("<h3>Homework</h3><ul><li>One</li><li>Two</li></ul><p>Bye<br>now</p>")).toBe("Homework One Two Bye now");
  });
});

describe("isGoogleDocUrl", () => {
  it("accepts https Google Docs and Drive links only", () => {
    expect(isGoogleDocUrl("https://docs.google.com/document/d/abc/edit")).toBe(true);
    expect(isGoogleDocUrl("https://drive.google.com/file/d/abc/view")).toBe(true);
    expect(isGoogleDocUrl("http://docs.google.com/document/d/abc")).toBe(false);
    expect(isGoogleDocUrl("https://docs.google.com.evil.example/d/abc")).toBe(false);
    expect(isGoogleDocUrl("not a url")).toBe(false);
  });
});
