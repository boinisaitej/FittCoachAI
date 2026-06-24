import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/login\?next=%2Fowner/);
});

test("middleware allows public marketing pages", async ({ page }) => {
  for (const path of ["/", "/login", "/signup", "/forgot-password"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(400);
  }
});
