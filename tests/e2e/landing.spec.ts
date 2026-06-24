import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /run your gym/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create your gym/i }).first()).toBeVisible();
});

test("signup page renders", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Gym name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("login page renders + invalid creds shows toast", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrongpassword");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/login failed/i)).toBeVisible({ timeout: 5_000 });
});
