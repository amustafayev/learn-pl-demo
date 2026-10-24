import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* The Library (src/features/readings, wordSets, savedComponents) and the
   places its items show up: Block Studio, the course tree, homework, the
   student app. Seed: "A morning standup" is a reading in the IT folder; the
   IT word set holds "IT essentials" (deploy, ship, …), which Rashad was
   already given; Saved starts with "Wheel of Fortune — IT Standup Vocab". */

// A folder or word set in the Library's tree, by its exact name.
const treeRow = (page, name) => page.locator("li", { has: page.getByText(name, { exact: true }) }).first();
// A word's row in a word set, by its term.
const wordRow = (page, term) => page.locator(`input[aria-label="Word"][value="${term}"]`).locator("xpath=..");

test.describe("reading", () => {
  test("folders filter the list; a new folder takes a new text, and deleting it takes the text too", async ({ page }) => {
    await page.goto("/library/reading");
    const main = page.locator("main");
    await expect(main.getByText("A morning standup")).toBeVisible();
    await treeRow(page, "Everyday").getByText("Everyday", { exact: true }).click();
    await expect(main.getByText("A morning standup")).toBeHidden();

    await page.getByRole("button", { name: "New folder" }).last().click();
    await page.getByPlaceholder("New folder").fill("E2E folder");
    await page.getByPlaceholder("New folder").press("Enter");
    await treeRow(page, "E2E folder").getByText("E2E folder", { exact: true }).click();

    await page.getByRole("button", { name: "Add text" }).click();
    await page.getByPlaceholder("e.g. Sprint retrospective").fill("E2E reading");
    await page.getByRole("dialog").locator("[contenteditable]").click();
    await page.keyboard.type("Hello from the browser test.");
    await page.getByRole("button", { name: "Add to library" }).click();
    await expect(page.getByText("Text added to the library")).toBeVisible();
    await expect(main.getByText("E2E folder · Level B1")).toBeVisible();

    await treeRow(page, "E2E folder").hover();
    await treeRow(page, "E2E folder").getByTitle("Delete", { exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("the 1 reading(s) in them");
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("“E2E folder” deleted")).toBeVisible();
    await expect(main.getByText("E2E reading")).toBeHidden();
  });

  test("a text opens in the reader with its body and folder", async ({ page }) => {
    await page.goto("/library/reading/t_standup");
    await expect(page.getByText("Every morning the team has a short")).toBeVisible();
    await expect(page.getByText("IT · B1 · 58 words")).toBeVisible();
  });

  test("an assigned reading opens in the student's work", async ({ page, studentPage }) => {
    await page.goto("/library/reading/t_standup");
    await page.getByRole("button", { name: "Assign" }).click();
    await page.getByRole("dialog").getByText("Rashad Aliyev").click();
    await page.getByRole("dialog").getByRole("button", { name: "Assign (1)" }).click();
    await expect(page.getByText("Assigned “A morning standup” to 1 student")).toBeVisible();

    await signInAsStudent(studentPage, "Rashad Aliyev");
    await sidebar(studentPage, "My work").click();
    await studentPage.locator("main").getByText("A morning standup").click();
    await expect(studentPage.getByText("Every morning the team has a short")).toBeVisible();
  });
});

test.describe("word sets", () => {
  test("words are added, edited and deleted, and a set's level changes", async ({ page }) => {
    const openItEssentials = async () => {
      await treeRow(page, "IT").getByRole("button", { name: "Unfold" }).first().click();
      await page.getByText("IT essentials", { exact: true }).first().click();
      await expect(wordRow(page, "deploy")).toBeVisible();
    };
    await page.goto("/library/words");
    await openItEssentials();

    await page.getByPlaceholder("New word").fill("e2eword");
    await page.getByPlaceholder("Azerbaijani").fill("e2eaz");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(wordRow(page, "e2eword")).toBeVisible();

    await wordRow(page, "e2eword").getByLabel("Azerbaijani").fill("changed");
    await wordRow(page, "e2eword").getByLabel("Azerbaijani").blur();
    await page.getByLabel("Level").selectOption("C1");

    // Leave and come back: what shows is what was saved.
    await page.getByRole("button", { name: "Reading", exact: true }).click();
    await page.getByRole("button", { name: "Word sets", exact: true }).click();
    await openItEssentials();
    await expect(wordRow(page, "e2eword").getByLabel("Azerbaijani")).toHaveValue("changed");
    await expect(page.getByLabel("Level")).toHaveValue("C1");

    await wordRow(page, "e2eword").getByRole("button", { name: "Delete word" }).click();
    await expect(wordRow(page, "e2eword")).toHaveCount(0);
    await expect(wordRow(page, "deploy")).toBeVisible();
  });

  test("a student's assigned word set shows its words", async ({ studentPage }) => {
    await signInAsStudent(studentPage, "Rashad Aliyev");
    await sidebar(studentPage, "My work").click();
    await studentPage.locator("main").getByText("IT essentials").click();
    await expect(studentPage.getByText("deploy", { exact: true })).toBeVisible();
    await expect(studentPage.getByText("rollback", { exact: true })).toBeVisible();
  });
});

test.describe("saved components", () => {
  test("a saved item can be deleted", async ({ page }) => {
    await page.goto("/library/bank");
    const item = page.getByText("Wheel of Fortune — IT Standup Vocab");
    await expect(item).toBeVisible();
    await page.getByTitle("Delete from Saved").first().click({ force: true });
    await expect(page.getByText("“Wheel of Fortune — IT Standup Vocab” removed from Saved")).toBeVisible();
    await expect(page.locator("main").getByText("Wheel of Fortune — IT Standup Vocab")).toBeHidden();
  });

  test("Block Studio shows a passage's text and saves a component to Saved", async ({ page }) => {
    await page.goto("/courses/it/lessons/it4/parts/p1");
    await expect(page.getByText("Every morning the team has a short")).toBeVisible();
    await expect(page.getByText("IT · B1 · 58 words")).toBeVisible();

    await page.getByRole("button", { name: "Edit content" }).click();
    await page.getByRole("button", { name: "Save to Saved" }).first().click();
    await expect(page.getByText(/” saved$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

    await sidebar(page, "Library").click();
    await page.getByRole("button", { name: "Saved", exact: true }).click();
    await expect(page.locator("main").getByText("Passage — How we talk about time at work", { exact: false }).first()).toBeVisible();
  });

  test("the course tree finds a passage by its text's title, and a row saves to Saved", async ({ page }) => {
    await page.goto("/courses/it");
    await page.getByPlaceholder("Find a block or component…").fill("morning standup");
    await expect(page.locator("main").getByText("A morning standup").first()).toBeVisible();
    await page.getByTitle("Save component to library").first().click({ force: true });
    await expect(page.getByText(/” saved$/)).toBeVisible();
  });
});

test.describe("student lessons", () => {
  test("a passage shows its linked text", async ({ studentPage }) => {
    await signInAsStudent(studentPage, "Rashad Aliyev");
    await studentPage.goto("/student/classes/cls_it_morning/lessons/it4");
    await expect(studentPage.getByText("Every morning the team has a short")).toBeVisible();
  });

  test("a lesson the teacher never built gets a starter passage with the library's first text", async ({ studentPage }) => {
    await signInAsStudent(studentPage, "Rashad Aliyev");
    await studentPage.goto("/student/classes/cls_it_morning/lessons/it1");
    await expect(studentPage.getByText("A morning standup")).toBeVisible();
  });
});
