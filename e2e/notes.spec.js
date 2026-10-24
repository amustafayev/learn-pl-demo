import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Lesson notes (src/features/notes). The teacher writes them in a panel
   beside a lesson opened from a class, and sends them to that class; its
   students read them in the student app: on Home, Notes, the class page and
   inside the lesson. Seed: IT English lesson 4 has unsent notes; lesson 3's
   notes ("Write three standup updates…") are already sent to ITler —
   Morning, where Rashad is a student. */

const LESSON_4_FROM_CLASS = "/courses/it/lessons/it4/parts/p1?classId=cls_it_morning";

async function openNotesPanel(page) {
  await page.goto(LESSON_4_FROM_CLASS);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  return page.getByRole("complementary", { name: "Lesson notes" });
}

test("the panel shows the lesson's notes; an edit autosaves and survives a reload", async ({ page }) => {
  let panel = await openNotesPanel(page);
  await expect(panel.getByText("Open with a 5-minute recap")).toBeVisible();

  const editor = panel.getByRole("textbox", { name: "Lesson notes" });
  await editor.click();
  await page.keyboard.press("End");
  await editor.pressSequentially(" Bring laptops.");
  await expect(panel.getByText("Saving…")).toBeVisible();
  await expect(panel.getByText("Saved", { exact: true })).toBeVisible();

  // The teacher app keeps notes across reloads (localStorage, in the mock).
  await page.reload();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  panel = page.getByRole("complementary", { name: "Lesson notes" });
  await expect(panel.getByText("Bring laptops.")).toBeVisible();
});

test("sending reaches the class's students live; unsending takes it back", async ({ page, studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  const studentMain = studentPage.locator("main");
  await expect(studentMain.getByText("Open with a 5-minute recap")).toBeHidden();

  const panel = await openNotesPanel(page);
  await panel.getByRole("button", { name: "Send to ITler — Morning" }).click();
  await expect(page.getByText("Notes sent to ITler — Morning")).toBeVisible();
  await expect(panel.getByText("Sent to: ITler — Morning.")).toBeVisible();

  await expect(studentPage.getByText("New note from Maria Carey")).toBeVisible();
  await expect(studentMain.getByText("Open with a 5-minute recap")).toBeVisible();

  await panel.getByRole("button", { name: "Unsend" }).click();
  await expect(page.getByText("Notes taken back from ITler — Morning")).toBeVisible();
  await expect(studentMain.getByText("Open with a 5-minute recap")).toBeHidden();
});

test("a student finds a sent note on Home, Notes, the class page and in its lesson", async ({ studentPage }) => {
  await signInAsStudent(studentPage, "Rashad Aliyev");
  const main = studentPage.locator("main");
  const note = main.getByText("Write three standup updates");

  await expect(note).toBeVisible(); // Home: latest notes

  await sidebar(studentPage, "Notes").click();
  await expect(main.getByText("What your teacher sent your class")).toBeVisible();
  await expect(note).toBeVisible();

  await sidebar(studentPage, "ITler — Morning").click();
  await expect(main.getByText("Notes from Maria")).toBeVisible();
  await expect(note).toBeVisible();

  await main.getByRole("button", { name: "Lesson 3: Talking about a bug in standup" }).first().click();
  await expect(main.getByText(/Step 1 of \d+/)).toBeVisible();
  await expect(note).toBeVisible();
});
