import { test, expect, signInAsStudent, sidebar } from "./fixtures.js";

/* Account (src/features/account): the teacher's profile and security
   settings, and the student app's log in, sign up and sign out. Seed: the
   teacher is Maria Carey (maria.carey@lucid.app) with two-factor on; Rashad
   Aliyev (rashad.aliyev@example.com) is a student. There's no password
   check in the prototype — any password works. */

const accountMenu = (page) => page.getByRole("button", { name: "Account menu" });

test.describe("teacher", () => {
  test("the top bar shows who's signed in, and the login page greets them", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(accountMenu(page)).toContainText("Maria Carey");
    await expect(accountMenu(page)).toContainText("maria.carey@lucid.app");

    await accountMenu(page).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByText("Welcome back, Maria")).toBeVisible();
  });

  test("editing the profile changes the name everywhere it shows", async ({ page }) => {
    await page.goto("/settings/account/profile");
    await expect(page.getByLabel("First Name")).toHaveValue("Maria");
    await page.getByLabel("First Name").fill("Mariam");
    await page.getByRole("button", { name: "Save change" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
    await expect(accountMenu(page)).toContainText("Mariam Carey");

    await sidebar(page, "Courses").click();
    await expect(page.locator("main").getByText("Mariam Carey").first()).toBeVisible();
  });

  test("two-factor authentication turns off and back on", async ({ page }) => {
    await page.goto("/settings/account/security");
    const twoFactor = page.getByRole("switch");
    await expect(twoFactor).toHaveAttribute("aria-checked", "true");
    await twoFactor.click();
    await expect(page.getByText("Two-factor authentication disabled")).toBeVisible();
    await expect(twoFactor).toHaveAttribute("aria-checked", "false");
    await twoFactor.click();
    await expect(page.getByText("Two-factor authentication enabled")).toBeVisible();
    await expect(twoFactor).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("student", () => {
  test("logs in with an account's email", async ({ studentPage: page }) => {
    await page.goto("/student/");
    await page.getByPlaceholder("Enter your email").fill("Rashad.Aliyev@example.com");
    await page.getByPlaceholder("Enter password").fill("anything");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByText("Welcome, Rashad!")).toBeVisible();
  });

  test("an unknown email is told to sign up instead", async ({ studentPage: page }) => {
    await page.goto("/student/");
    await page.getByPlaceholder("Enter your email").fill("nobody@example.com");
    await page.getByPlaceholder("Enter password").fill("anything");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("No student account with that email — sign up instead?");
  });

  test("signs up, lands on Home, signs out, and can sign straight back in", async ({ studentPage: page }) => {
    await page.goto("/student/");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.getByPlaceholder("Your name").fill("Test Student");
    await page.getByPlaceholder("Enter your email").fill("test.student@example.com");
    await page.getByPlaceholder("Choose a password").fill("secret");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByText("Welcome, Test!")).toBeVisible();

    await sidebar(page, "Sign out").click();
    await expect(page.getByText("Welcome back")).toBeVisible();
    await page.getByRole("button", { name: /Test Student/ }).click();
    await expect(page.getByText("Welcome, Test!")).toBeVisible();
  });

  test("signing up with an email that's taken is refused", async ({ studentPage: page }) => {
    await page.goto("/student/");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.getByPlaceholder("Your name").fill("Someone Else");
    await page.getByPlaceholder("Enter your email").fill("rashad.aliyev@example.com");
    await page.getByPlaceholder("Choose a password").fill("secret");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("There's already an account with that email — log in instead.");
  });

  test("a demo account signs in with one click", async ({ studentPage: page }) => {
    await signInAsStudent(page, "Rashad Aliyev");
    await expect(page.getByText("rashad.aliyev@example.com")).toBeVisible();
  });
});
