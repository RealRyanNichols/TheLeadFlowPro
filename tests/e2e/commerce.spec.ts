import { test, expect, type Page } from "playwright/test";
import AxeBuilder from "@axe-core/playwright";

type LeadBody = Record<string, unknown>;

// Every API request is intercepted. These tests never save real leads, send
// notifications, or start payments, even when run against a deployed preview.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    // Block third-party tracking and services as well as the intake API below.
    const requestOrigin = new URL(route.request().url()).origin;
    const documentOrigin = new URL(route.request().frame().url()).origin;
    if (
      route.request().isNavigationRequest() ||
      requestOrigin === documentOrigin
    )
      return route.fallback();
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Unmocked API blocked by QA" },
    }),
  );
});

for (const width of [320, 390, 768, 1440]) {
  test(`the full commerce page fits ${width}px with loaded artwork and accessible controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/commerce");
    const images = page.locator("main img");
    await expect(images).toHaveCount(9);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        )
        .toBeGreaterThan(0);
      expect(await image.getAttribute("alt")).toBeTruthy();
    }
    for (const name of [
      "Physical products",
      "Services & appointments",
      "Downloads & training",
    ]) {
      await page.getByRole("radio", { name }).check();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

async function fillContact(page: Page) {
  await page.locator('input[name="full_name"]').fill("  Commerce QA  ");
  await page.locator('input[name="email"]').fill("commerce@example.invalid");
}

async function readBuildList(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save my build list" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("my-commerce-build-list.txt");
  const stream = await file.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

test("switching business types changes the actual steps and useful tool links", async ({
  page,
}) => {
  await page.goto("/commerce");
  await expect(
    page.getByRole("radio", { name: "Physical products" }),
  ).toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Show the product", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Check my margin" }),
  ).toHaveAttribute("href", "/tools/profit-margin-calculator");

  await page.getByRole("radio", { name: "Services & appointments" }).check();
  await expect(
    page.getByRole("heading", {
      name: "A customer asks for a quote and approves the work.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Draft estimate terms" }),
  ).toHaveAttribute("href", "/tools/estimate-terms-generator");
  await expect(
    page.getByRole("link", { name: "Build a payment plan" }),
  ).toHaveAttribute("href", "/tools/payment-plan-calculator");
  await expect(page.getByRole("link", { name: "Check my margin" })).toHaveCount(
    0,
  );

  await page.getByRole("radio", { name: "Downloads & training" }).check();
  await expect(
    page.getByRole("heading", {
      name: "A customer buys a document kit or learning resource.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Make a digital business card" }),
  ).toHaveAttribute("href", "/tools/digital-business-card");
  await expect(
    page.getByRole("link", { name: "Try a paid kit preview" }),
  ).toHaveAttribute("href", "/tools/pro");
  await expect(
    page.getByRole("link", { name: "Draft estimate terms" }),
  ).toHaveCount(0);
});

test("keyboard radio navigation works and existing accounts survive path changes", async ({
  page,
}) => {
  await page.goto("/commerce");
  await page.getByRole("checkbox", { name: "Website", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Payment account", exact: true })
    .check();
  await page.getByRole("radio", { name: "Physical products" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Services & appointments" }),
  ).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Downloads & training" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Website", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Payment account", exact: true }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Website", exact: true }).uncheck();
  expect(await readBuildList(page)).toContain(
    "Already in place: Payment account",
  );
});

test("the real file download contains all selected steps, attribution and scope limits, without contact data", async ({
  page,
}) => {
  await page.goto("/commerce");
  await page.getByRole("radio", { name: "Downloads & training" }).check();
  await page.getByRole("checkbox", { name: "Website", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Customer records", exact: true })
    .check();
  await fillContact(page);
  await page
    .locator('textarea[name="goals"]')
    .fill("Private draft notes for QA only");
  const file = await readBuildList(page);
  expect(file).toContain("I sell: Downloads & training");
  expect(file).toContain("Already in place: Website, Customer records");
  expect(file).toContain("1. Let them try the result");
  expect(file).toContain("2. Verify the purchase");
  expect(file).toContain("3. Make access easy");
  expect(file).toContain("https://www.theleadflowpro.com/commerce");
  expect(file).toContain(
    "A planning outline, not a quote or an installed integration.",
  );
  expect(file).toContain(
    "Do not include passwords, customer lists, or card information",
  );
  expect(file).not.toContain("commerce@example.invalid");
  expect(file).not.toContain("Private draft notes");
  expect(file).not.toContain("Commerce QA");
});

test("starting fresh downloads a useful plan without requiring signup or an API", async ({
  page,
}) => {
  let apiCalls = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls++;
  });
  await page.goto("/commerce");
  const file = await readBuildList(page);
  expect(file).toContain("I sell: Physical products");
  expect(file).toContain("Already in place: Starting fresh");
  expect(file).toContain("3. Complete the handoff");
  expect(apiCalls).toBe(0);
});

test("successful intake sends the chosen setup, trims details and confirms only a scope request", async ({
  page,
}) => {
  const leads: LeadBody[] = [];
  await page.route("**/api/leads", async (route) => {
    expect(route.request().method()).toBe("POST");
    leads.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto(
    "/commerce?utm_source=qa&utm_medium=test&utm_campaign=commerce-check",
  );
  await page.getByRole("radio", { name: "Services & appointments" }).check();
  await page.getByRole("checkbox", { name: "Website", exact: true }).check();
  await fillContact(page);
  await page.locator('input[name="phone"]').fill("  202-555-0100  ");
  await page
    .locator('input[name="business_name"]')
    .fill("  Fictional QA Shop  ");
  await page
    .locator('textarea[name="goals"]')
    .fill("  Connect the quote request.  ");
  await page.getByRole("button", { name: "Send my build list" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your commerce request is saved.",
  );
  await expect(page.getByRole("status")).toContainText(
    "No payment was taken and no accounts were connected.",
  );
  await expect(page.locator("#build form")).toHaveCount(0);
  expect(leads).toHaveLength(1);
  expect(leads[0]).toMatchObject({
    full_name: "Commerce QA",
    email: "commerce@example.invalid",
    phone: "202-555-0100",
    business_name: "Fictional QA Shop",
    interest: "custom_platform",
    sms_consent: false,
    marketing_email_consent: false,
    desired_modules: [
      "forms_tools",
      "payments_checkout",
      "booking_routing",
      "crm_pipeline",
    ],
    utm_source: "qa",
    utm_medium: "test",
    utm_campaign: "commerce-check",
    goals:
      "COMMERCE BUILD REQUEST: Services & appointments. Already in place: Website. Connect the quote request.",
    diagnostic: {
      source: "commerce_planner",
      version: 1,
      selling: "services",
      existing: ["Website"],
      owner: "Ryan",
    },
  });
});

test("blank optional details are null and email consent is separate from SMS", async ({
  page,
}) => {
  const leads: LeadBody[] = [];
  await page.route("**/api/leads", async (route) => {
    leads.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/commerce");
  await fillContact(page);
  await page.locator('input[name="marketing_email_consent"]').check();
  await page.getByRole("button", { name: "Send my build list" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your commerce request is saved.",
  );
  expect(leads[0]).toMatchObject({
    phone: null,
    business_name: null,
    marketing_email_consent: true,
    sms_consent: false,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
  });
});

for (const failure of [
  "http",
  "network",
  "invalid-json",
  "unconfirmed",
] as const) {
  test(`${failure} intake failure preserves the form and a retry can confirm it`, async ({
    page,
  }) => {
    const leads: LeadBody[] = [];
    await page.route("**/api/leads", async (route) => {
      leads.push(route.request().postDataJSON());
      if (leads.length > 1) return route.fulfill({ json: { ok: true } });
      if (failure === "network") return route.abort("failed");
      if (failure === "http")
        return route.fulfill({ status: 503, json: { error: "Unavailable" } });
      if (failure === "invalid-json")
        return route.fulfill({
          contentType: "application/json",
          body: "not-json",
        });
      return route.fulfill({ json: { ok: false } });
    });
    await page.goto("/commerce");
    await page.getByRole("radio", { name: "Downloads & training" }).check();
    await page
      .getByRole("checkbox", { name: "Product catalog", exact: true })
      .check();
    await fillContact(page);
    await page.getByRole("button", { name: "Send my build list" }).click();
    await expect(page.getByRole("alert")).toContainText("We could not confirm");
    await expect(
      page.getByRole("heading", { name: "Your commerce request is saved." }),
    ).toHaveCount(0);
    await expect(page.locator('input[name="email"]')).toHaveValue(
      "commerce@example.invalid",
    );
    await expect(
      page.getByRole("radio", { name: "Downloads & training" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Product catalog", exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("button", { name: "Send my build list" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Send my build list" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Your commerce request is saved.",
    );
    expect(leads).toHaveLength(2);
    expect(leads[1]).toEqual(leads[0]);
  });
}

test("repeated submits during a pending request send only one lead", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/leads", async (route) => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/commerce");
  await fillContact(page);
  await page.locator("#build form").evaluate((element) => {
    const form = element as HTMLFormElement;
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(
    page.getByRole("button", { name: "Saving your request…" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(
    "Your commerce request is saved.",
  );
  expect(calls).toBe(1);
});

test("analytics failure cannot turn a saved inquiry into an error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.fbq = () => {
      throw new Error("Optional analytics unavailable");
    };
  });
  await page.route("**/api/leads", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/commerce");
  await fillContact(page);
  await page.getByRole("button", { name: "Send my build list" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your commerce request is saved.",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("required name and valid email prevent incomplete submissions", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/leads", async (route) => {
    calls++;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/commerce");
  await page.getByRole("button", { name: "Send my build list" }).click();
  expect(
    await page
      .locator('input[name="full_name"]')
      .evaluate((input) => (input as HTMLInputElement).validity.valueMissing),
  ).toBe(true);
  await page.locator('input[name="full_name"]').fill("Commerce QA");
  await page.locator('input[name="email"]').fill("invalid-address");
  await page.getByRole("button", { name: "Send my build list" }).click();
  expect(
    await page
      .locator('input[name="email"]')
      .evaluate((input) => (input as HTMLInputElement).validity.typeMismatch),
  ).toBe(true);
  expect(calls).toBe(0);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("the full page exposes the planner, eight real kit previews, and honest marketplace next steps", async ({
  page,
}) => {
  await page.goto("/commerce");
  await page.getByRole("link", { name: "Plan my selling setup" }).click();
  await expect(page).toHaveURL(/#plan$/);
  await expect(page.locator("#plan")).toBeInViewport();
  const previews = page
    .locator("#kits")
    .getByRole("link", { name: "Preview the kit" });
  await expect(previews).toHaveCount(8);
  const urls = await previews.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  expect(new Set(urls).size).toBe(8);
  expect(
    urls.every((url) =>
      /^https:\/\/www\.theleadflowpro\.com\/tools\/pro\/[a-z0-9-]+$/.test(
        url || "",
      ),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Plan my commerce build" }),
  ).toHaveAttribute("href", "#build");
  await expect(page.locator("#build")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Explore the marketplace preview" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page
    .getByText("Are all of Gideon’s marketplace features ready?", {
      exact: true,
    })
    .click();
  await expect(page.locator("details[open]")).toContainText(
    "No. Its marketplace is a preview.",
  );
});
