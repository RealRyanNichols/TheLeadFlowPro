// Every tool ships a share card and card art; spot-check five slugs end to
// end over HTTP: correct type, sensible size.

import { test, expect } from "playwright/test";

const SLUGS = [
  "missed-call-calculator",
  "qr-code-maker",
  "review-response-writer",
  "household-budget-planner",
  "salary-to-hourly-converter",
];

for (const slug of SLUGS) {
  test(`assets serve for ${slug}`, async ({ request }) => {
    const og = await request.get(`/og/tools/${slug}.jpg`);
    expect(og.status(), `OG card for ${slug} returns 200`).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/jpeg");
    expect((await og.body()).length, "OG card stays under 200KB").toBeLessThan(200_000);

    const card = await request.get(`/tools-art/card/${slug}.svg`);
    expect(card.status(), `card art for ${slug} returns 200`).toBe(200);
    expect(card.headers()["content-type"]).toContain("image/svg");
    expect((await card.body()).length, "card art stays under 200KB").toBeLessThan(200_000);
  });
}
