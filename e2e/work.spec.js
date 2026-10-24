import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Assigned work (src/features/assignments): work a teacher hands one
   student outside the class's lessons — a word set, a reading, a saved
   block or a one-off task — and the student's My work, where they play it
   and mark it done. Seed: Rashad has "Tense timeline pack" to do and
   finished "IT essentials"; he's in ITler — Morning. */

const main = (page) => page.locator("main");

test("a teacher assigns a word set and a quick task from a student's page, and takes one back", async ({ page }) => {
  await page.goto("/students/s_rashad/profile");
  await page.getByRole("button", { name: "Assign" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("IT essentials", { exact: true }).click();
  await expect(page.getByText("Assigned “IT essentials” to Rashad")).toBeVisible();

  await page.getByRole("button", { name: "Assign" }).first().click();
  await dialog.getByRole("button", { name: /^New task/ }).click();
  await dialog.getByText("Quiz (multiple choice)").click();
  await dialog.getByRole("button", { name: "Assign this task" }).click();
  await expect(page.getByText("Assigned “Quiz (multiple choice)” to Rashad")).toBeVisible();
  await expect(main(page)).toContainText("Quiz (multiple choice)");

  await page.getByRole("button", { name: "Withdraw Quiz (multiple choice)" }).click();
  await expect(page.getByText("Took back “Quiz (multiple choice)” from Rashad")).toBeVisible();
  await expect(main(page).getByText("Quiz (multiple choice)")).toHaveCount(0);
});

test("a student plays their work and marks it done; the teacher sees it done", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  await expect(sidebar(studentPage, "My work")).toContainText("1");
  await sidebar(studentPage, "My work").click();
  await main(studentPage).getByText("Tense timeline pack").click();
  await studentPage.getByRole("button", { name: "Mark as done" }).click();
  await expect(studentPage.getByText("“Tense timeline pack” done — nice work!")).toBeVisible();
  await studentPage.getByRole("button", { name: "My work" }).last().click();
  await expect(main(studentPage)).toContainText("Nothing to do right now");

  await page.goto("/students/s_rashad/profile");
  const row = main(page).locator("div").filter({ has: page.getByText("Tense timeline pack") }).filter({ hasText: "Done" }).last();
  await expect(row).toBeVisible();
});

test("work a teacher assigns reaches the student's open tab, with a toast", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  await page.goto("/students/s_rashad/profile");
  await page.getByRole("button", { name: "Assign" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^New task/ }).click();
  await page.getByRole("dialog").getByText("Quiz (multiple choice)").click();
  await page.getByRole("dialog").getByRole("button", { name: "Assign this task" }).click();
  await expect(page.getByText("Assigned “Quiz (multiple choice)” to Rashad")).toBeVisible();

  await expect(studentPage.getByText("New work from Maria Carey: “Quiz (multiple choice)”")).toBeVisible();
  await expect(sidebar(studentPage, "My work")).toContainText("2");
});
