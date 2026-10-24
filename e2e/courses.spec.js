import { test, expect } from "./fixtures.js";

/* Courses & lessons (src/features/courses): the Courses list, a course's
   tree, a lesson's steps (its blocks), Block Studio editing a block's
   components, and selling a course. Seed: Maria's courses are Everyday
   English (5 lessons), IT English (6) and IELTS Speaking (2). IT English
   lesson 5, "Writing clear code-review comments", was never built: its
   six steps (Reading … Homework) come from its block types, and its
   Practice step (it5-5) starts with a gap fill and a matching task. */

const steps = (page) => page.locator("main").locator(".font-bold.text-base.text-neutral-900");

test("the list shows each course with its lesson count; a new course starts empty", async ({ page }) => {
  await page.goto("/courses");
  const main = page.locator("main");
  await expect(main.getByText("IT English", { exact: true })).toBeVisible();
  await expect(main.getByText("6 lessons")).toBeVisible();
  await expect(main.getByText("2 lessons")).toBeVisible();

  await page.getByRole("button", { name: "New course" }).click();
  await page.getByPlaceholder("e.g. Business Emails").fill("E2E Course");
  await page.getByRole("button", { name: "Create course" }).click();
  await expect(page.getByText("Course created")).toBeVisible();
  await expect(main.getByText("E2E Course")).toBeVisible();
  await expect(main.getByText("0 lessons")).toBeVisible();
});

test("a course page lists its lessons; a new lesson opens its empty pathway", async ({ page }) => {
  await page.goto("/courses/it");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Tense forms" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Explaining a technical decision" })).toBeVisible();

  await page.getByRole("button", { name: "New lesson" }).click();
  await page.getByPlaceholder("e.g. Writing a status update").fill("E2E lesson");
  await page.getByRole("button", { name: "Add lesson" }).click();
  await expect(page.getByText("Lesson added")).toBeVisible();
  await expect(main.getByRole("heading", { name: "Lesson 7: E2E lesson" })).toBeVisible();
  await expect(main.getByText("Add the first step to the pathway")).toBeVisible();
});

test("a lesson's steps are added, renamed, moved and removed", async ({ page }) => {
  await page.goto("/courses/it/lessons/it5");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Lesson 5: Writing clear code-review comments" })).toBeVisible();
  await expect(steps(page)).toHaveText(["Reading", "Vocabulary", "Listening", "Grammar", "Practice", "Homework"]);

  await page.getByRole("button", { name: "Add Step" }).click();
  // The last "Speaking" is the block; the first is its category's heading.
  await page.getByRole("dialog").getByText("Speaking", { exact: true }).last().click();
  await expect(page.getByText("Added Speaking step")).toBeVisible();
  await expect(steps(page)).toHaveText(["Reading", "Vocabulary", "Listening", "Grammar", "Practice", "Homework", "Speaking"]);

  await page.getByTitle("Rename").first().click();
  await main.locator("input").fill("Warm-up reading");
  await main.locator("input").press("Enter");
  await page.getByTitle("Move down").first().click();
  await expect(steps(page)).toHaveText(["Vocabulary", "Warm-up reading", "Listening", "Grammar", "Practice", "Homework", "Speaking"]);

  await page.getByTitle("Remove").last().click();
  await expect(page.getByText("Step removed")).toBeVisible();
  await expect(steps(page)).toHaveText(["Vocabulary", "Warm-up reading", "Listening", "Grammar", "Practice", "Homework"]);
});

test("Block Studio edits a component in place — typing mid-text keeps its place — and students see it", async ({ page }) => {
  await page.goto("/courses/it/lessons/it5/parts/it5-5");
  await page.getByRole("button", { name: "Edit content" }).click();
  await page.getByRole("button", { name: "Add component" }).first().click();
  await page.getByRole("dialog").getByText("Quiz (multiple choice)").click();

  const question = page.getByPlaceholder("Question");
  await expect(question).toHaveValue("I ___ to work every morning.");
  // Put the cursor at the very start (the Home key doesn't, on macOS).
  await question.click();
  await question.evaluate((input) => input.setSelectionRange(0, 0));
  await question.pressSequentially("Q1: ");
  await expect(question).toHaveValue("Q1: I ___ to work every morning.");

  await page.getByRole("button", { name: "As student" }).click();
  await expect(page.locator("main").getByText("Q1: I ___ to work every morning.")).toBeVisible();

  // Step to another block and back: the edit was saved.
  const stepsBar = page.getByRole("navigation", { name: "Steps" });
  await stepsBar.getByRole("button", { name: "4 Grammar" }).click();
  await expect(page.getByRole("heading", { name: "Grammar", level: 1 })).toBeVisible();
  await stepsBar.getByRole("button", { name: "5 Practice" }).click();
  await expect(page.locator("main").getByText("Q1: I ___ to work every morning.")).toBeVisible();
});

test("a course is put on sale with a price, and taken off sale again", async ({ page }) => {
  await page.goto("/courses/it");
  const main = page.locator("main");
  await expect(main.getByText("Not for sale")).toBeVisible();

  await page.getByRole("button", { name: "Put on sale" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("switch").click();
  await dialog.getByLabel("Price").fill("35");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("IT English is for sale — 35 AZN")).toBeVisible();
  await expect(main.getByText("For sale · 35 AZN")).toBeVisible();

  await page.getByRole("button", { name: "Sale settings" }).click();
  await dialog.getByRole("switch").click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("IT English is no longer for sale — buyers keep their access")).toBeVisible();
  await expect(main.getByText("Not for sale")).toBeVisible();
});
