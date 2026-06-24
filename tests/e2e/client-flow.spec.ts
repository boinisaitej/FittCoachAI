import { test, expect } from "./fixtures";

test.describe("Client flows", () => {
  test.skip(!process.env.E2E_CLIENT_EMAIL, "Set E2E_CLIENT_EMAIL in .env.test.local");

  test("client dashboard loads with role-based redirect protection", async ({ clientPage }) => {
    await clientPage.goto("/client");
    await expect(clientPage.getByRole("heading", { name: /^hi /i })).toBeVisible();
  });

  test("client cannot access /owner", async ({ clientPage }) => {
    await clientPage.goto("/owner");
    await expect(clientPage).toHaveURL(/\/client/);
  });

  test("log BMI", async ({ clientPage }) => {
    await clientPage.goto("/client/bmi");
    await clientPage.getByLabel(/height/i).fill("170");
    await clientPage.getByLabel(/weight/i).fill("70");
    await clientPage.getByRole("button", { name: /log bmi/i }).click();
    await expect(clientPage.getByText(/logged/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("water +1 persists", async ({ clientPage }) => {
    await clientPage.goto("/client");
    const before = await clientPage.locator("text=/^\\d+\\/\\d+$/").first().textContent();
    await clientPage.getByRole("button", { name: /add glass/i }).click();
    await expect(async () => {
      const after = await clientPage.locator("text=/^\\d+\\/\\d+$/").first().textContent();
      expect(after).not.toBe(before);
    }).toPass({ timeout: 5_000 });
  });

  test("AI diet generates without GOOGLE_API_KEY (fallback path)", async ({ clientPage }) => {
    await clientPage.goto("/client/ai-diet");
    await clientPage.getByRole("button", { name: /today's plan/i }).click();
    // Either AI worked or fallback rendered — both produce meal cards.
    await expect(clientPage.getByText(/kcal/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("notifications page loads", async ({ clientPage }) => {
    await clientPage.goto("/notifications");
    await expect(clientPage.getByRole("heading", { name: /notifications/i })).toBeVisible();
  });
});
