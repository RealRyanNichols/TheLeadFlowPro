// A representative calculator produces a currency result from typed inputs
// and offers the free save affordances.

import { test, expect } from "playwright/test";

test("missed-call calculator computes a dollar figure", async ({ page }) => {
  await page.goto("/tools/missed-call-calculator");
  await expect(page.locator("h1").first()).toContainText(/missed call/i);

  const inputs = page.locator('input[type="number"]');
  const count = await inputs.count();
  expect(count, "the calculator exposes numeric inputs").toBeGreaterThan(0);
  for (let i = 0; i < Math.min(count, 4); i++) {
    await inputs.nth(i).fill(String([10, 250, 30, 40][i] ?? 10));
  }

  await expect(
    page.locator("main").getByText(/\$[\d,]+/).first(),
    "a dollar result renders from the inputs",
  ).toBeVisible({ timeout: 10_000 });

  await expect(
    page.getByRole("button", { name: /copy|download|print|save/i }).first(),
    "a free save affordance is present",
  ).toBeVisible();
});
