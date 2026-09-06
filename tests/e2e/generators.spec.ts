// Generator-family tools: the QR maker renders a code, the review writer
// composes a draft.

import { test, expect } from "playwright/test";
import { readFile } from "node:fs/promises";

test("digital business card downloads a contact file alongside its QR images", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    const state = window as Window & { contactDownloadMime?: string };
    URL.createObjectURL = (blob) => {
      if (blob instanceof Blob) state.contactDownloadMime = blob.type;
      return create(blob);
    };
  });
  await page.goto("/tools/digital-business-card");
  await page.getByLabel("Your name", { exact: true }).fill("Jordan Example");
  await page.getByLabel("Email", { exact: true }).fill("jordan@example.test");
  await expect(page.getByRole("button", { name: "Download PNG", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download SVG", exact: true })).toBeVisible();
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download contact (.vcf)", exact: true }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("jordan-example.vcf");
  expect(await download.failure()).toBeNull();
  await download.saveAs(testInfo.outputPath("jordan-example.vcf"));
  const path = await download.path();
  expect(path).toBeTruthy();
  const body = await readFile(path!, "utf8");
  expect(body).toContain("BEGIN:VCARD\r\nVERSION:3.0\r\n");
  expect(body).toContain("FN:Jordan Example\r\n");
  expect(body).toContain("EMAIL;TYPE=WORK:jordan@example.test\r\n");
  expect(body.endsWith("END:VCARD\r\n")).toBe(true);
  expect(await page.evaluate(() => (window as Window & { contactDownloadMime?: string }).contactDownloadMime))
    .toBe("text/vcard;charset=utf-8");
});

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
