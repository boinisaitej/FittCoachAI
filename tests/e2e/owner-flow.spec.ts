import { test, expect } from "./fixtures";

test.describe("Owner flows", () => {
  test.skip(
    !process.env.E2E_OWNER_EMAIL,
    "Set E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD in .env.test.local"
  );

  test("owner console loads with KPIs", async ({ ownerPage }) => {
    await ownerPage.goto("/owner");
    await expect(ownerPage.getByRole("heading", { name: /owner console/i })).toBeVisible();
    await expect(ownerPage.getByText(/clients/i).first()).toBeVisible();
  });

  test("create client → email logged", async ({ ownerPage }) => {
    await ownerPage.goto("/owner/users?create=client");
    await expect(ownerPage.getByRole("dialog")).toBeVisible();
    await ownerPage.getByLabel("Full name").fill("E2E Test Client");
    await ownerPage.getByLabel("Email").fill(`e2e-${Date.now()}@example.test`);
    await ownerPage.getByRole("button", { name: /create client/i }).click();
    await expect(ownerPage.getByText(/welcome email sent/i)).toBeVisible({ timeout: 8_000 });
  });

  test("auto-match runs without errors", async ({ ownerPage }) => {
    await ownerPage.goto("/owner/assignments");
    await ownerPage.getByRole("button", { name: /auto-match all/i }).click();
    await expect(ownerPage.getByText(/matched \d+ clients/i)).toBeVisible({ timeout: 10_000 });
  });

  test("issue invoice", async ({ ownerPage }) => {
    await ownerPage.goto("/owner/invoices");
    await ownerPage.getByRole("button", { name: /issue invoice/i }).click();
    // Pick first client (if any)
    const select = ownerPage.getByRole("combobox").first();
    await select.click();
    const opt = ownerPage.getByRole("option").first();
    if (await opt.isVisible()) {
      await opt.click();
      await ownerPage.getByLabel(/amount/i).fill("1500");
      await ownerPage.getByRole("button", { name: /^issue$/i }).click();
      await expect(ownerPage.getByText(/invoice issued/i)).toBeVisible({ timeout: 8_000 });
    }
  });

  test("create announcement", async ({ ownerPage }) => {
    await ownerPage.goto("/owner/announcements");
    await ownerPage.getByLabel("Title").fill("E2E Test Announcement");
    await ownerPage.getByLabel("Message").fill("This is a test broadcast.");
    await ownerPage.getByRole("button", { name: /send now/i }).click();
    await expect(ownerPage.getByText(/sent!/i)).toBeVisible({ timeout: 8_000 });
  });
});
