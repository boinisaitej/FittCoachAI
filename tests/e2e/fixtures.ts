import { test as base, expect, type Page } from "@playwright/test";

/**
 * Test fixtures.
 *
 * To run these locally:
 *  1. Apply migrations to a TEST Supabase project (not production).
 *  2. Set env vars in .env.test.local:
 *     E2E_OWNER_EMAIL=owner@e2e.test
 *     E2E_OWNER_PASSWORD=...
 *     E2E_CLIENT_EMAIL=client@e2e.test
 *     E2E_CLIENT_PASSWORD=...
 *  3. Run: npm run test:e2e
 *
 * The first signup auto-becomes Owner. Subsequent users must be created from
 * the Owner console.
 */
export const test = base.extend<{
  ownerPage: Page;
  clientPage: Page;
}>({
  ownerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, process.env.E2E_OWNER_EMAIL!, process.env.E2E_OWNER_PASSWORD!);
    await use(page);
    await ctx.close();
  },
  clientPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, process.env.E2E_CLIENT_EMAIL!, process.env.E2E_CLIENT_PASSWORD!);
    await use(page);
    await ctx.close();
  },
});

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(owner|trainer|client)/);
}

export { expect };
