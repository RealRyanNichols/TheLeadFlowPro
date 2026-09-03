// The two /tools rules that must not regress on a phone (Ryan, Aug 13 2026):
// the header reads as one bar, and the library is reachable without a long
// scroll — the search input sits within 900px of the top at 390 wide.

import { test, expect } from "playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("/tools on a phone: single-bar header, library near the fold", async ({ page }) => {
  await page.goto("/tools");

  const header = page.locator("header").first();
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  expect(headerBox && headerBox.height, "the header holds a single bar").toBeLessThan(80);

  const search = page.getByPlaceholder(/roofer/i);
  await expect(search).toBeVisible();
  const y = await search.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(y, "the tool search input sits within 900px of the top").toBeLessThan(900);
});
