import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* The student app's own pages (src/features/learning, and the student side
   of students and sales): Home, a class page, the lesson player and its
   access rule, the course catalog, the join page and email invites.
   Seed: Rashad is in ITler — Morning (IT English: lessons 1–4 shared, next
   up Lesson 4, 3 of 6 taught). Zeynab bought Everyday English and finished
   lessons 1–3. Lala asked to join IELTS Speaking — Main and waits. Rashad
   has bought nothing; IELTS Speaking (49 AZN) is for sale. */

const main = (page) => page.locator("main");

test("Home shows the student's class and where it is, and what they're waiting for", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Rashad Aliyev");
  await expect(main(page)).toContainText("ITler — Morning");
  await expect(main(page)).toContainText("Next: Lesson 4 · Tense forms");
  await expect(main(page)).toContainText("3 of 6 lessons taught");
  await expect(main(page)).toContainText("with Maria Carey");

  await sidebar(page, "Sign out").click();
  await page.getByRole("button", { name: /Lala Hasanova/ }).click();
  await expect(main(page)).toContainText("Waiting for Maria Carey to accept you");
  await expect(main(page)).toContainText("IELTS Speaking — Main");
});

test("a class page lists its lessons: shared ones open, the rest not yet; finished ones say so", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Rashad Aliyev");
  await sidebar(page, "ITler — Morning").click();
  await expect(main(page)).toContainText("IT English");
  await expect(main(page)).toContainText("3 of 6 lessons taught");
  await expect(main(page).getByRole("button", { name: "Open", exact: false })).toHaveCount(5); // 4 lessons + "Open Lesson 4"
  await expect(main(page).getByText("Not shared yet")).toHaveCount(2);
  await expect(main(page)).toContainText("1 note");
});

test("the lesson player steps through a lesson and records finishing it", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Rashad Aliyev");
  await sidebar(page, "ITler — Morning").click();
  await main(page).getByRole("button", { name: "Open Lesson 4" }).click();
  await expect(main(page)).toContainText("Lesson 4: Tense forms · Step 1 of 8");
  await page.getByRole("button", { name: /^Next:/ }).click();
  await expect(main(page)).toContainText("Step 2 of 8");

  await page.getByRole("navigation", { name: "Steps" }).getByRole("button").last().click();
  await page.getByRole("button", { name: "Finish lesson" }).click();
  await expect(page.getByText("Lesson 4 finished — nice work!")).toBeVisible();
  await expect(main(page).getByText("Finished", { exact: true })).toBeVisible();
});

test("a lesson that isn't shared stays locked, even by its address", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Rashad Aliyev");
  await page.goto("/student/classes/cls_it_morning/lessons/it5");
  await expect(main(page)).toContainText("Lesson 5 isn't shared yet");
  await expect(main(page)).not.toContainText("Step 1 of");

  await page.goto("/student/courses/ielts/lessons/ie1"); // a course he hasn't bought
  await expect(main(page)).toContainText("Lesson 1 isn't shared yet");
  await expect(main(page)).not.toContainText("Step 1 of");

  await page.goto("/student/courses/ielts/lessons/no-such-lesson");
  await expect(main(page)).toContainText("This lesson isn't available");
});

test("the catalog separates bought courses from ones to buy; a bought course opens every lesson", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Zeynab Guliyeva");
  await sidebar(page, "Courses").click();
  await expect(main(page)).toContainText("My courses");
  await expect(main(page)).toContainText("Everyday English");
  await expect(main(page)).toContainText("3 finished");
  await expect(main(page)).toContainText("Available to buy");
  await expect(main(page)).toContainText("IELTS Speaking");

  await page.goto("/student/courses/every");
  await expect(main(page)).toContainText("3 of 5 lessons finished · self-paced");
  await expect(main(page).getByRole("button", { name: "Open" })).toHaveCount(5);
});

test("a course not bought shows what's inside and its price", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Rashad Aliyev");
  await page.goto("/student/courses/ielts");
  await expect(main(page)).toContainText("What's inside");
  await expect(main(page)).toContainText("Part 1 — familiar topics");
  await expect(page.getByRole("button", { name: /Request to buy · 49 AZN/ })).toBeVisible();
});

test("the join page previews a class; a bad link says so; a member is told they're in", async ({ studentPage: page }) => {
  await signInAsStudent(page, "Rashad Aliyev");
  await page.goto("/student/join/2d9e7b61-a4c3-4f08-b6d2-8e1a5c730f94"); // IELTS Speaking — Main
  await expect(main(page).getByRole("heading", { name: "IELTS Speaking — Main" })).toBeVisible();
  await expect(main(page)).toContainText("Part 2 — the long turn");
  await expect(page.getByRole("button", { name: "Request to join" })).toBeVisible();

  await page.goto("/student/join/6f1c2a9e-3b7d-4e58-9a41-c0d5e8b27f13"); // his own class
  await expect(main(page)).toContainText("You're already in ITler — Morning");

  await page.goto("/student/join/not-a-real-link");
  await expect(main(page)).toContainText("This link doesn't work");
});

test("an email invite shows on Home; accepting puts the student in the class", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  await page.goto("/classes/cls_it_evening");
  await page.getByRole("button", { name: "Invite" }).click();
  await page.getByRole("dialog").getByLabel("Student email").fill("rashad.aliyev@example.com");
  await page.getByRole("dialog").getByRole("button", { name: "Invite" }).click();
  await expect(page.getByText("Invite sent to rashad.aliyev@example.com")).toBeVisible();

  await expect(main(studentPage)).toContainText("Maria Carey invited you to ITler — Evening");
  await studentPage.getByRole("button", { name: "Accept invite" }).click();
  await expect(studentPage.getByText("You're in ITler — Evening").first()).toBeVisible();
  await expect(sidebar(studentPage, "ITler — Evening")).toBeVisible();
});
