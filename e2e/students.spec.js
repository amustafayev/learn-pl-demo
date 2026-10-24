import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Students & joining (src/features/students): the teacher's roster and its
   requests, a student's profile and lesson history, a class's members and
   invites, blocking — and a student asking to join with the class link.
   Seed: Rashad, Nigar and Leyla are in ITler — Morning; Elvin and Kamran in
   ITler — Evening; Aysel in IELTS Speaking — Main. Farid asked to join
   ITler — Evening, Lala asked to join IELTS (she was removed from ITler —
   Morning earlier), Murad asked to buy IELTS Speaking. Orkhan left ITler —
   Morning. Zeynab bought Everyday English. Rashad missed Lesson 2. */

const main = (page) => page.locator("main");
// The smallest row naming `name` that has buttons of its own.
const studentRow = (page, name) => main(page).locator("div").filter({ has: page.getByText(name) }).filter({ has: page.getByRole("button") }).last();

test.describe("roster", () => {
  test("is grouped into active, requests, former and customers", async ({ page }) => {
    await page.goto("/students");
    await expect(main(page)).toContainText("Rashad Aliyev");
    await expect(main(page).getByText("ITler — Morning").first()).toBeVisible();

    await page.getByRole("button", { name: /^Requests/ }).click();
    await expect(main(page)).toContainText("Farid Mammadli");
    await expect(main(page)).toContainText("Lala Hasanova");
    await expect(main(page)).toContainText("Murad Karimov");

    await page.getByRole("button", { name: /^Former/ }).click();
    await expect(main(page)).toContainText("Orkhan Aliyev");

    await page.getByRole("button", { name: /^Customers/ }).click();
    await expect(main(page)).toContainText("Zeynab Guliyeva");
    await expect(main(page)).toContainText("Everyday English");
  });

  test("accepting a join request puts the student in the class", async ({ page }) => {
    await page.goto("/students?filter=requests");
    await studentRow(page, "Farid Mammadli").getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Farid joined ITler — Evening")).toBeVisible();
    await page.getByRole("button", { name: /^Active/ }).click();
    await expect(main(page)).toContainText("Farid Mammadli");
  });

  test("declining or blocking takes a request off the list", async ({ page }) => {
    await page.goto("/students?filter=requests");
    await studentRow(page, "Lala Hasanova").getByRole("button", { name: "Decline" }).click();
    await expect(page.getByText("Declined Lala's request")).toBeVisible();
    await studentRow(page, "Farid Mammadli").getByRole("button", { name: "Block" }).click();
    await expect(page.getByText(/^Farid is blocked/)).toBeVisible();
    await expect(main(page)).not.toContainText("Lala Hasanova");
    await expect(main(page)).not.toContainText("Farid Mammadli");

    await page.getByRole("button", { name: /^Former/ }).click();
    await studentRow(page, "Farid Mammadli").getByRole("button", { name: "Unblock" }).click();
    await expect(page.getByText("Farid can send you requests again")).toBeVisible();
  });

  test("a former student is added back to their class", async ({ page }) => {
    await page.goto("/students?filter=former");
    await studentRow(page, "Orkhan Aliyev").getByRole("button", { name: "Add back to ITler — Morning" }).click();
    await expect(page.getByText("Orkhan is back in ITler — Morning")).toBeVisible();
    await page.getByRole("button", { name: /^Active/ }).click();
    await expect(main(page)).toContainText("Orkhan Aliyev");
  });

  test("the sidebar counts the requests waiting", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(sidebar(page, "Students")).toContainText("3");
  });
});

test.describe("a student's page", () => {
  test("the profile shows their class and where it is; they're removed and added back", async ({ page }) => {
    await page.goto("/students/s_rashad/profile");
    await expect(main(page)).toContainText("Now on IT English · Lesson 4 next · 3 of 6 taught");

    await page.getByRole("button", { name: "Remove Rashad Aliyev from ITler — Morning" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove from class" }).click();
    await expect(page.getByText("Rashad removed from ITler — Morning")).toBeVisible();
    await expect(main(page).getByText("Former", { exact: true })).toBeVisible();

    await page.getByLabel("Add to a class").selectOption({ label: "ITler — Evening" });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Rashad added to ITler — Evening")).toBeVisible();
    await expect(main(page)).toContainText("Now on IT English · Lesson 1 next");
  });

  test("lesson history lists the lessons they had; one is marked missed and back", async ({ page }) => {
    await page.goto("/students/s_rashad/history");
    await expect(main(page)).toContainText("Lesson 1 · Introducing yourself on a team");
    await expect(main(page)).toContainText("Lesson 3 · Talking about a bug in standup");
    await expect(main(page).getByText("Missed", { exact: true })).toHaveCount(1); // Lesson 2

    await page.getByRole("button", { name: "Mark missed" }).first().click();
    await expect(page.getByText(/^Marked Rashad as missing Lesson/)).toBeVisible();
    await expect(main(page).getByText("Missed", { exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Mark attended" }).first().click();
    await expect(page.getByText(/^Marked Rashad as at Lesson/)).toBeVisible();
    await expect(main(page).getByText("Missed", { exact: true })).toHaveCount(1);
  });
});

test.describe("a class's members", () => {
  test("are listed; one is enrolled and one removed", async ({ page }) => {
    await page.goto("/classes/cls_it_morning");
    await expect(main(page)).toContainText("Nigar Mammadova");
    await page.getByRole("button", { name: "Enroll a student" }).click();
    await main(page).getByRole("button", { name: /Elvin Huseynov/ }).click();
    await expect(page.getByText("Elvin enrolled in ITler — Morning")).toBeVisible();

    await page.getByRole("button", { name: "Remove Nigar Mammadova from ITler — Morning" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove from class" }).click();
    await expect(page.getByText("Nigar removed from ITler — Morning")).toBeVisible();
    await expect(main(page).getByText("Nigar Mammadova")).toHaveCount(0);
  });

  test("an email invite is sent and withdrawn", async ({ page }) => {
    await page.goto("/classes/cls_it_morning");
    await page.getByRole("button", { name: "Invite" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Student email").fill("new.student@example.com");
    await dialog.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Invite sent to new.student@example.com")).toBeVisible();
    await expect(dialog).toContainText("new.student@example.com");
    await dialog.getByRole("button", { name: "Withdraw" }).click();
    await expect(page.getByText("Invite to new.student@example.com withdrawn")).toBeVisible();
    await expect(dialog).not.toContainText("new.student@example.com");
  });

  test("the dashboard accepts a join request", async ({ page }) => {
    await page.goto("/dashboard");
    await studentRow(page, "Farid Mammadli").getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Farid joined ITler — Evening")).toBeVisible();
    await expect(main(page)).not.toContainText("Farid Mammadli");
  });
});

test("a student asks to join with the class link; the teacher accepts; the class opens for them", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Zeynab Guliyeva");
  await studentPage.goto("/student/join/b3a8d4f0-7c21-4d96-8e5a-1f9c6a2d0e47"); // ITler — Evening
  await expect(studentPage.getByRole("heading", { name: "ITler — Evening" })).toBeVisible();
  await studentPage.getByPlaceholder("Hi! I saw your class and would like to join.").fill("I'd like to join, please.");
  await studentPage.getByRole("button", { name: "Request to join" }).click();
  await expect(studentPage.getByText("Request sent")).toBeVisible();

  await page.goto("/students?filter=requests");
  await expect(studentRow(page, "Zeynab Guliyeva")).toContainText("I'd like to join, please.");
  await studentRow(page, "Zeynab Guliyeva").getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Zeynab joined ITler — Evening")).toBeVisible();

  await expect(studentPage.getByText("You're in ITler — Evening now")).toBeVisible();
  await expect(sidebar(studentPage, "ITler — Evening")).toBeVisible();
});
