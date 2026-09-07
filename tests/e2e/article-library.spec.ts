import { test, expect } from "playwright/test";
import { getPublishedArticles } from "../../lib/articles";
import { ARTICLE_PAGE_SIZE } from "../../app/articles/article-library";

const count = getPublishedArticles().length;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({ status: 204 }),
  );
});

test("search, task filtering, no results, clearing, and load more work together", async ({ page }) => {
  await page.goto("/articles#article-library");
  const library = page.locator("[data-article-library]");
  const visibleCards = library.locator("[data-article-card]:visible");
  const status = library.getByRole("status");
  const search = page.getByRole("searchbox", { name: "What do you want to work on?" });
  await expect(visibleCards).toHaveCount(ARTICLE_PAGE_SIZE);
  await expect(status).toHaveText(`Showing ${ARTICLE_PAGE_SIZE} of ${count} guides`);

  await search.fill("MISSED-call");
  await expect(status).toContainText("matching guides");
  expect(await visibleCards.count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Get more leads/ }).click();
  await expect(page.getByRole("button", { name: /Get more leads/ })).toHaveAttribute("aria-pressed", "true");
  expect(await visibleCards.count()).toBeGreaterThan(0);

  await search.fill("no-such-guide-qzxw");
  await expect(status).toHaveText("No guides match your search.");
  await expect(visibleCards).toHaveCount(0);
  await page.getByRole("button", { name: "Show all guides", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(visibleCards).toHaveCount(ARTICLE_PAGE_SIZE);

  await page.getByRole("button", { name: /Show 9 more guides/ }).click();
  await expect(visibleCards).toHaveCount(ARTICLE_PAGE_SIZE * 2);
  await expect(visibleCards.nth(ARTICLE_PAGE_SIZE).locator("a")).toBeFocused();
  await search.fill("QR");
  await page.getByRole("button", { name: /Website & search/ }).click();
  await expect(status).toContainText("matching guides");
  expect(await visibleCards.count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(visibleCards).toHaveCount(ARTICLE_PAGE_SIZE);
});

test("every published guide remains a canonical link in server HTML", async ({ request }) => {
  const response = await request.get("/articles");
  expect(response.status()).toBe(200);
  const html = await response.text();
  for (const article of getPublishedArticles()) expect(html).toContain(`href="/articles/${article.slug}"`);
  expect(html).toContain("<noscript>");
  expect(html).not.toContain("Latest breakdowns");
});

test("without JavaScript every rich card remains visible and usable", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/articles#article-library`);
  await expect(page.locator("[data-article-card]:visible")).toHaveCount(count);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  const href = await page.locator("[data-article-card] a").last().getAttribute("href");
  expect(href).toMatch(/^\/articles\/[a-z0-9-]+$/);
  await context.close();
});

for (const width of [320, 390, 768, 1440]) {
  test(`article library fits ${width}px and keeps filters in view`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/articles#article-library");
    await expect(page.locator("[data-article-card]:visible")).toHaveCount(ARTICLE_PAGE_SIZE);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const filters = page.getByRole("group", { name: "Filter guides by task" });
    for (const button of await filters.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator("[data-article-library]").evaluate((element) => {
      window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" });
    });
    await page.screenshot({ path: testInfo.outputPath(`articles-${width}.png`), fullPage: false });
  });
}
