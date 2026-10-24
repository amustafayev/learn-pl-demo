import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Classes (src/features/classes): a class's schedule, its course and where
   it is on it, sharing lessons, finishing lessons, and the class link.
   Seed: ITler — Morning (Mon, Wed 10:00) takes IT English, 3 of 6 lessons
   taught, next up Lesson 4 "Tense forms" (shared), Lessons 5–6 not shared;
   Rashad is one of its students. ITler — Evening takes IT English, nothing
   taught. IELTS Speaking — Main has had 1 of 2 lessons. */

// The card on the Classes page whose title is `name`: the smallest box
// holding both the title and the card's own View Detail button.
const classCard = (page, name) => page.locator("main div")
  .filter({ has: page.getByText(name, { exact: true }) })
  .filter({ has: page.getByRole("button", { name: "View Detail" }) }).last();

test("the list shows each class with its course and where it is", async ({ page }) => {
  await page.goto("/classes");
  await expect(classCard(page, "ITler — Morning")).toContainText("IT English");
  await expect(classCard(page, "ITler — Morning")).toContainText("Next up: Lesson 4 · Tense forms");
  await expect(classCard(page, "ITler — Morning")).toContainText("3 of 6 lessons taught");
  await expect(classCard(page, "ITler — Evening")).toContainText("0 of 6 lessons taught");
  await expect(classCard(page, "IELTS Speaking — Main")).toContainText("1 of 2 lessons taught");
});

test("a new class gets its course and schedule; one made without a course is assigned one later", async ({ page }) => {
  await page.goto("/classes");
  await page.getByRole("button", { name: "New class" }).click();
  await page.getByPlaceholder("e.g. ITler — Morning").fill("E2E with course");
  await page.locator("main select").first().selectOption({ label: "Everyday English" });
  await page.getByRole("button", { name: "Tue", exact: true }).click();
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(page.getByText("“E2E with course” class created")).toBeVisible();
  await expect(classCard(page, "E2E with course")).toContainText("Everyday English");
  await expect(classCard(page, "E2E with course")).toContainText("0 of 5 lessons taught");
  await expect(classCard(page, "E2E with course")).toContainText("Tue");

  await page.getByRole("button", { name: "New class" }).click();
  await page.getByPlaceholder("e.g. ITler — Morning").fill("E2E no course");
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(classCard(page, "E2E no course")).toContainText("No course in progress");
  await classCard(page, "E2E no course").getByRole("button", { name: "View Detail" }).click();
  await page.getByRole("button", { name: "Assign course" }).click();
  await page.getByRole("button", { name: "IELTS Speaking", exact: true }).click();
  await expect(page.getByText("IELTS Speaking assigned to E2E no course")).toBeVisible();
  await expect(page.locator("main")).toContainText("0 of 2 lessons taught");
  await expect(page.getByRole("button", { name: "Assign course" })).toHaveCount(0);
});

test("a class's page shows its course progress, and its schedule can be changed", async ({ page }) => {
  await page.goto("/classes/cls_it_morning");
  const main = page.locator("main");
  await expect(main).toContainText("3 of 6 lessons taught");
  await expect(main).toContainText("Next up: Lesson 4 · Tense forms");
  await expect(main).toContainText("Last taught: Lesson 3");
  await expect(main).toContainText("Mon, Wed · 10:00–11:00");

  await page.getByRole("button", { name: "Edit schedule" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Fri", exact: true }).click();
  await page.getByRole("button", { name: "Save schedule" }).click();
  await expect(page.getByText("Schedule updated")).toBeVisible();
  await expect(main).toContainText("Mon, Wed, Fri · 10:00–11:00");
});

test("finishing a lesson opened from a class logs it and moves the class on", async ({ page }) => {
  await page.goto("/courses/it/lessons/it4?classId=cls_it_morning");
  const main = page.locator("main");
  await expect(main).toContainText("Students can see it");
  await page.getByRole("button", { name: "Finish lesson" }).click();
  await expect(page.getByText("Lesson 4 marked as taught for ITler — Morning — next up: Lesson 5")).toBeVisible();
  await expect(main).toContainText("They're on Lesson 5: Writing clear code-review comments");

  await page.getByRole("button", { name: "IT English" }).click();
  await expect(main).toContainText("lessons taught");
  await expect(main).toContainText("Next up: Lesson 5 · Writing clear code-review comments");
});

test("Block Studio from a class ends the lesson's last block with Finish lesson", async ({ page }) => {
  await page.goto("/courses/it/lessons/it4/parts/p8?classId=cls_it_morning");
  await expect(page.getByText("Done teaching Lesson 4?")).toBeVisible();
  await page.getByRole("button", { name: "Finish lesson" }).last().click();
  await expect(page.getByText("Lesson 4 marked as taught for ITler — Morning — next up: Lesson 5")).toBeVisible();
  await expect(page.getByText("Lesson 4 was taught to ITler — Morning")).toBeVisible();
});

test("sharing a lesson opens it for the class's students, live", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  await sidebar(studentPage, "ITler — Morning").click();
  const notShared = studentPage.locator("main").getByText("Not shared yet");
  await expect(notShared).toHaveCount(2); // Lessons 5 and 6

  await page.goto("/courses/it?classId=cls_it_morning");
  await page.getByRole("button", { name: "Share with students" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Share Lesson 5 with ITler — Morning?");
  await page.getByRole("button", { name: "Share lesson" }).click();
  await expect(page.getByText("Lesson 5 shared with ITler — Morning")).toBeVisible();

  await expect(studentPage.getByText("Lesson 5 is open in ITler — Morning")).toBeVisible();
  await expect(notShared).toHaveCount(1);
});

test("a class's next lesson is set by hand, and its course completed and reopened", async ({ page }) => {
  await page.goto("/courses/it?classId=cls_it_morning");
  const main = page.locator("main");
  await page.getByRole("button", { name: "Set as next up" }).last().click();
  await expect(page.getByText("ITler — Morning is now on Lesson 6")).toBeVisible();
  await expect(main).toContainText("Next up: Lesson 6 · Explaining a technical decision");

  await page.getByRole("button", { name: "Mark as completed" }).click();
  await expect(page.getByText("IT English marked completed for ITler — Morning")).toBeVisible();
  await expect(main).toContainText("Course completed");
  await page.getByRole("button", { name: "Reopen course" }).click();
  await expect(page.getByText("IT English reopened for ITler — Morning")).toBeVisible();
});

test("the class link can be switched off, and replaced with a new one", async ({ page }) => {
  await page.goto("/classes/cls_it_morning");
  await page.getByRole("button", { name: "Invite" }).click();
  const dialog = page.getByRole("dialog");
  const link = dialog.locator("[data-join-link]");
  const before = await link.textContent();
  expect(before).toContain("/student/join/6f1c2a9e-3b7d-4e58-9a41-c0d5e8b27f13");

  await dialog.getByRole("switch").click();
  await expect(page.getByText("The class link is off — no new requests")).toBeVisible();
  await expect(dialog).toContainText("Joining off");

  await dialog.getByRole("button", { name: "New link" }).click();
  await expect(page.getByText("New link — the old one no longer works")).toBeVisible();
  await expect(link).not.toHaveText(before);
});
