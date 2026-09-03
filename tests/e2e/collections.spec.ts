// A published collection page reached from the directory renders its heading
// and at least one tool card.

import { test, expect } from "playwright/test";

test("a collection page renders tools", async ({ page }) => {
  await page.goto("/tools");
  const collectionLink = page.locator('a[href^="/tools/collections/"]').first();
  await expect(collectionLink, "the directory links at least one collection").toBeVisible();
  await collectionLink.click();
  await expect(page).toHaveURL(/\/tools\/collections\/[a-z0-9-]+/);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(
    page.locator('a[href^="/tools/"]:not([href^="/tools/collections"])').first(),
    "the collection lists at least one tool",
  ).toBeVisible();
});
