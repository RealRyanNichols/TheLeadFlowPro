// The /tools directory: search narrows, clearing restores, chips filter,
// cards navigate. Selectors lean on visible text and roles, not class chains.

import { test, expect } from "playwright/test";

test.describe("tool directory", () => {
  test("search narrows the grid and clearing restores it", async ({ page }) => {
    await page.goto("/tools");
    const search = page.getByPlaceholder(/roofer/i);
    await expect(search, "the tool search input is on the page").toBeVisible();

    await search.fill("roofer");
    const status = page.getByRole("status").first();
    await expect(status, "searching for roofer reports matches").toContainText(/match/i);

    const firstCard = page.locator(".tool-grid a").first();
    await expect(firstCard, "at least one card survives the roofer search").toBeVisible();

    await search.clear();
    await expect(status, "clearing the search restores the full library count").toContainText(/86 tools/);
  });

  test("a domain chip filters the count", async ({ page }) => {
    await page.goto("/tools");
    const status = page.getByRole("status").first();
    await expect(status).toContainText(/86 tools/);

    await page.getByRole("button", { name: /Websites and Digital/ }).click();
    await expect(status, "filtering by domain changes the reported count").not.toContainText(/86 tools/);
    await expect(status).toContainText(/match|tool/i);
  });

  test("a card navigates to a tool page", async ({ page }) => {
    await page.goto("/tools");
    const firstCard = page.locator(".tool-grid a").first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/tools\/[a-z0-9-]+/);
    await expect(page.locator("h1").first(), "the tool page renders its heading").toBeVisible();
  });
});
