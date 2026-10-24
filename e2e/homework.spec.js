import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Class homework — Classwork (src/features/homework): a post with a title,
   instructions and attachments, given to every student in the class. Each
   student gets the attachments in My work; the teacher sees who turned it
   in. Seed: no homework yet; ITler — Morning's students are Rashad, Nigar
   and Leyla. */

const main = (page) => page.locator("main");
const CLASSWORK = "/classes/cls_it_morning/homework";

async function compose(page, title) {
  await page.goto(CLASSWORK);
  await expect(main(page)).toContainText("Classwork");
  await page.getByRole("button", { name: "Create assignment" }).click();
  await page.getByPlaceholder("e.g. Describe your job — 5 sentences").fill(title);
  await page.getByRole("button", { name: "Add component" }).click();
  await page.getByRole("dialog").getByPlaceholder(/^Search all/).fill("Quiz");
  await page.getByRole("dialog").getByText("Quiz (multiple choice)", { exact: true }).click();
}

test("a teacher assigns homework; a student turns it in; the teacher sees who did", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");

  await compose(page, "E2E homework");
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(page.getByText("“E2E homework” assigned")).toBeVisible();
  const row = main(page).getByRole("button", { name: /E2E homework/ });
  await expect(row).toContainText("Assigned");

  await expect(studentPage.getByText(/^New work from Maria Carey/)).toBeVisible();
  await sidebar(studentPage, "My work").click();
  await main(studentPage).getByText("Quiz (multiple choice)").first().click();
  await studentPage.getByRole("button", { name: "Mark as done" }).click();
  await expect(studentPage.getByText(/done — nice work!/)).toBeVisible();

  await row.click();
  const rashad = main(page).locator("div").filter({ has: page.getByText("Rashad Aliyev") }).filter({ hasText: /Turned in|Assigned/ }).last();
  await expect(rashad).toContainText("Turned in");
  const nigar = main(page).locator("div").filter({ has: page.getByText("Nigar Mammadova") }).filter({ hasText: /Turned in|Assigned/ }).last();
  await expect(nigar).toContainText("Assigned");
});

test("a draft is saved and listed as a draft", async ({ page }) => {
  await compose(page, "E2E draft");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  const row = main(page).getByRole("button", { name: /E2E draft/ });
  await expect(row).toContainText("Draft");
});

test("a posted assignment is renamed, and deleting it takes it back from students", async ({ page, studentPage }) => {
  await compose(page, "E2E rename me");
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(page.getByText("“E2E rename me” assigned")).toBeVisible();

  await main(page).getByRole("button", { name: /E2E rename me/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByPlaceholder("e.g. Describe your job — 5 sentences").fill("E2E renamed");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Assignment updated")).toBeVisible();
  await expect(main(page)).toContainText("E2E renamed");

  await signInAsStudent(studentPage, "Rashad Aliyev");
  await expect(sidebar(studentPage, "My work")).toContainText("2");

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted “E2E renamed”")).toBeVisible();
  await expect(main(page)).not.toContainText("E2E renamed");
  await expect(sidebar(studentPage, "My work")).toContainText("1");
});
