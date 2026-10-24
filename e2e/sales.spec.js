import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Sales (src/features/sales): selling a course on its own. A student asks
   to buy, pays the teacher outside the app, and the teacher confirms —
   every lesson then opens for them. Seed: IELTS Speaking is for sale at
   49 AZN and Murad's request to buy it waits; Everyday English is for sale
   at 29 AZN and Zeynab bought it. */

const main = (page) => page.locator("main");
const requestRow = (page, name) => main(page).locator("div").filter({ has: page.getByText(name) }).filter({ has: page.getByRole("button") }).last();

test("the course page shows its sale, its customers and requests to confirm", async ({ page }) => {
  await page.goto("/courses/ielts");
  await expect(main(page)).toContainText("For sale · 49 AZN");
  await expect(main(page)).toContainText("1 to confirm");
  await page.getByRole("button", { name: /^Customers/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Murad Karimov");

  await page.goto("/courses/every");
  await page.getByRole("button", { name: /^Customers/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Zeynab Guliyeva");
});

test("confirming a payment makes the student a customer", async ({ page }) => {
  await page.goto("/students?filter=requests");
  await requestRow(page, "Murad Karimov").getByRole("button", { name: "Mark paid & give access" }).click();
  await expect(page.getByText("Murad can now take IELTS Speaking")).toBeVisible();
  await page.getByRole("button", { name: /^Customers/ }).click();
  await expect(main(page)).toContainText("Murad Karimov");
});

test("declining a purchase request takes it off the list", async ({ page }) => {
  await page.goto("/students?filter=requests");
  await requestRow(page, "Murad Karimov").getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("Declined Murad's request")).toBeVisible();
  await expect(main(page)).not.toContainText("Murad Karimov");
});

test("a student asks to buy a course; the teacher confirms; every lesson opens for them", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  await sidebar(studentPage, "Courses").click();
  await expect(main(studentPage)).toContainText("Available to buy");
  await studentPage.goto("/student/courses/ielts");
  await expect(main(studentPage).getByRole("heading", { name: "IELTS Speaking" })).toBeVisible();
  await studentPage.getByRole("button", { name: /Request to buy · 49 AZN/ }).click();
  await studentPage.getByPlaceholder("e.g. Paid by card today, Rashad Aliyev").fill("Paid by card today");
  await studentPage.getByRole("button", { name: "Send request" }).click();
  await expect(studentPage.getByText(/^Request sent/)).toBeVisible();
  await expect(main(studentPage)).toContainText("Waiting for Maria Carey to confirm your payment");

  await page.goto("/courses/ielts");
  await page.getByRole("button", { name: /^Customers/ }).click();
  await requestRow(page, "Rashad Aliyev").getByRole("button", { name: "Mark paid & give access" }).click();
  await expect(page.getByText("Rashad can now take IELTS Speaking")).toBeVisible();

  await expect(studentPage.getByText("Payment confirmed — IELTS Speaking is yours")).toBeVisible();
  await expect(main(studentPage)).toContainText("0 of 2 lessons finished · self-paced");
});
