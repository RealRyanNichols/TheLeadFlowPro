// The buyer paths on a phone and on a desktop: homepage consultation form and
// the done-for-you service links; packages → Stripe click-through; plugin →
// checkout start; agency intake. Read-only: nothing is submitted and nothing
// is paid.

import { test, expect, type Page } from "playwright/test";

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1366, height: 900 },
];

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "no horizontal page scroll").toBeLessThanOrEqual(1);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("homepage leads with the free consultation form and links the done-for-you services", async ({ page }) => {
      await page.goto("/");
      await noHorizontalScroll(page);
      // No event banner, no workshop pitch anywhere on the front door.
      await expect(page.locator(".lf-announcement")).toHaveCount(0);
      await expect(page.getByText(/workshop/i)).toHaveCount(0);
      const form = page.locator("#free-consultation form");
      await expect(form).toBeVisible();
      for (const name of ["full_name", "business_name", "phone", "email", "goals"]) {
        await expect(form.locator(`[name="${name}"]`)).toHaveAttribute("required", "");
      }
      await expect(form.locator('input[name="meeting"]')).toHaveCount(3);
      await expect(form.getByRole("button", { name: /Book my free consultation/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /See the lead service/ })).toHaveAttribute("href", /^\/agency\/meta-ads/);
      await expect(page.getByRole("link", { name: /See the automation service/ })).toHaveAttribute("href", /^\/agency\/automation/);
      const build = page.getByRole("link", { name: /Check the free website program/ });
      await expect(build).toHaveAttribute("href", /^\/free-build/);
      await build.click();
      await expect(page).toHaveURL(/\/free-build/);
      await expect(page.locator("form")).toBeVisible();
    });

    test("packages page carries the Website Launch deposit link to Stripe", async ({ page }) => {
      await page.goto("/packages");
      await noHorizontalScroll(page);
      const stripe = page.locator('a[href^="https://book.stripe.com/"]').first();
      await expect(stripe).toBeVisible();
      await expect(page.getByText("$1,000").first()).toBeVisible();
    });

    test("plugin page starts checkout at the HQ sign-up and links the docs", async ({ page }) => {
      await page.goto("/plugin");
      await noHorizontalScroll(page);
      const cta = page.locator('[data-cta="plugin_checkout_start"]');
      await expect(cta).toHaveAttribute("href", /\/login\?mode=signup|\/hq\/start/);
      await expect(page.getByRole("link", { name: /plugin docs/i }).first()).toHaveAttribute("href", "/plugin/docs");
      await page.goto("/plugin/docs");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("manual");
    });

    test("agency hub lists six services with no overlapping text, carries the three doors, and the intake preserves entries on a validation error", async ({ page }) => {
      await page.goto("/agency");
      await noHorizontalScroll(page);
      const cards = page.locator(".cb-servicecard");
      await expect(cards).toHaveCount(6);
      // The old three-column tool-card grid stacked five children into three
      // cells and the eyebrow, name, and promise drew on top of each other.
      // Every card's children must now sit below the previous one.
      for (let i = 0; i < 6; i++) {
        const boxes = await cards.nth(i).locator(":scope > *").evaluateAll((nodes) =>
          nodes.map((n) => { const r = (n as HTMLElement).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }),
        );
        for (let j = 1; j < boxes.length; j++) {
          expect(boxes[j].top, `card ${i} child ${j} overlaps the one above`).toBeGreaterThanOrEqual(boxes[j - 1].bottom - 1);
        }
      }
      await expect(page.locator('[data-cta="agency_door_intake"]')).toHaveAttribute("href", "#intake");
      await expect(page.locator('[data-cta="agency_door_pay"]')).toHaveAttribute("href", "/agency/pay");
      await expect(page.locator('[data-cta="agency_door_connect"]')).toHaveAttribute("href", "/connect");
      await expect(page.locator("#intake form")).toBeVisible();
      await page.goto("/agency/pay?service=meta-ads");
      await noHorizontalScroll(page);
      await expect(page.locator('input[name="service"][value="meta-ads"]')).toBeChecked();
      await page.goto("/agency/start?service=meta-ads");
      await expect(page.locator('input[name="service_meta-ads"]')).toBeChecked();
      await page.fill('input[name="business_name"]', "Fixture Fence Co");
      await page.fill('input[name="full_name"]', "Fixture Owner");
      await page.fill('input[name="email"]', "fixture@example.com");
      // Consent to texts without a number must be refused without losing the answers.
      await page.check('input[name="sms_consent"]');
      await page.fill('textarea[name="bottleneck"]', "Leads come in and nobody follows up.");
      await page.check('input[name="ad_budget"][value="ads_0"]');
      await page.check('input[name="decision_maker"][value="me"]');
      await page.check('input[name="timeline"][value="researching"]');
      await page.getByRole("button", { name: /Send it to Ryan/ }).click();
      // Scoped to the form: Next's route announcer is also role="alert".
      await expect(page.locator('form[aria-label="Agency intake"] [role="alert"]')).toContainText(/mobile number/);
      await expect(page.locator('input[name="business_name"]')).toHaveValue("Fixture Fence Co");
    });

    test("events page serves without a redirect loop and shows either the seat CTA or the next-workshop list", async ({ page }) => {
      const response = await page.goto("/events");
      expect(response?.status()).toBeLessThan(400);
      const seat = page.getByRole("link", { name: /Reserve My Seat|Sold Out/ });
      const list = page.locator("#next-workshop");
      expect((await seat.count()) + (await list.count())).toBeGreaterThan(0);
    });
  });
}
