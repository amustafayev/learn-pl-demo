import { test as base, expect } from "@playwright/test";

/* What every browser test shares (see "Tests" in CLAUDE.md).

   - `page` is a teacher-app tab; `studentPage` is a second tab in the same
     browser, so the two apps share one mock db and sync live, as they do
     for a person with both open.
   - A test fails if either tab logs a page error or a console error.
   - The mock db lives in the tab's memory: page.goto() (a reload) starts
     that tab from the seed data again, then it catches up from any other
     open tab. Navigate inside the app (clicks) to keep what a test did. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = collectErrors(page);
    await use(page);
    expect(errors, "errors in the teacher app").toEqual([]);
  },
  studentPage: async ({ context }, use) => {
    const page = await context.newPage();
    const errors = collectErrors(page);
    await use(page);
    expect(errors, "errors in the student app").toEqual([]);
  },
});
export { expect };

function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  return errors;
}

// Opens the student app and signs in as one of its demo accounts.
export async function signInAsStudent(page, name) {
  await page.goto("/student/");
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await expect(page.getByText(`Welcome, ${name.split(" ")[0]}!`)).toBeVisible();
}

// A sidebar link, in either app.
export const sidebar = (page, label) => page.locator("aside").getByRole("button", { name: label }).first();
