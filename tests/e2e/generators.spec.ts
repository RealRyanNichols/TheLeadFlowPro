// Generator-family tools: the QR maker renders a code, the review writer
// composes a draft.

import { test, expect } from "playwright/test";

test("qr code maker renders a code for a URL", async ({ page }) => {
  await page.goto("/tools/qr-code-maker");
  const url = page.locator('input[type="url"], input[type="text"]').first();
  await url.fill("https://www.theleadflowpro.com");
  await expect(
    page.locator("main svg, main canvas").last(),
    "a QR svg or canvas renders",
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: /png|svg|download/i }).first(),
    "a download control is present",
  ).toBeVisible();
});

test("review response writer drafts a reply", async ({ page }) => {
  // No textarea here: the writer composes from a review-type select and short
  // text inputs (business, reviewer, job). Prove composition by planting a
  // distinctive business name and finding it rendered outside the input.
  await page.goto("/tools/review-response-writer");
  const business = page.locator('main input[type="text"]').first();
  await business.fill("Bluebonnet Septic Works");
  await expect(
    page.locator("main").getByText(/Bluebonnet Septic Works/).first(),
    "the composed draft carries the business name",
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: /copy/i }).first(),
    "the draft can be copied",
  ).toBeVisible();
});
