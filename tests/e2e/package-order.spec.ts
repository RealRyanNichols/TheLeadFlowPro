import { test, expect, type Page } from "playwright/test";

const STRIPE_TEST_DESTINATION =
  "https://checkout.stripe.com/c/pay/package-order-fixture";

type RequestBody = Record<string, unknown>;

async function form(page: Page, slug = "system-map") {
  await page.goto(`/packages/${slug}`);
  await page.locator('input[name="full_name"]').fill("Checkout Test");
  await page.locator('input[name="email"]').fill("checkout@example.invalid");
}

async function mockLeadCapture(page: Page, bodies: RequestBody[]) {
  await page.route("**/api/leads", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
}

async function mockStripePage(page: Page) {
  await page.route(STRIPE_TEST_DESTINATION, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Mock secure checkout</h1>",
    }),
  );
}

test("System Map full payment uses the unchanged SKU and opens checkout", async ({
  page,
}) => {
  const leads: RequestBody[] = [];
  const checkouts: RequestBody[] = [];
  await mockLeadCapture(page, leads);
  await mockStripePage(page);
  await page.route("**/api/checkout", async (route) => {
    checkouts.push(route.request().postDataJSON());
    await route.fulfill({ json: { url: STRIPE_TEST_DESTINATION } });
  });
  await form(page);
  await page.getByRole("button", { name: "Send Order + Pay $497 Now" }).click();
  await expect(page).toHaveURL(STRIPE_TEST_DESTINATION);
  expect(leads).toHaveLength(1);
  expect(checkouts).toEqual([
    { kind: "system_map", email: "checkout@example.invalid" },
  ]);
});

test("failed checkout keeps the form and retries without duplicating the saved lead", async ({
  page,
}) => {
  const leads: RequestBody[] = [];
  let attempts = 0;
  await mockLeadCapture(page, leads);
  await mockStripePage(page);
  await page.route("**/api/checkout", async (route) => {
    attempts++;
    await route.fulfill(
      attempts < 3
        ? { status: 503, json: { error: "Temporary checkout failure" } }
        : { json: { url: STRIPE_TEST_DESTINATION } },
    );
  });
  await form(page);
  await page.getByRole("button", { name: "Send Order + Pay $497 Now" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Payment has not been completed here",
  );
  await expect(page.locator('input[name="email"]')).toHaveValue(
    "checkout@example.invalid",
  );
  await expect(page.locator("body")).not.toContainText(
    "Your order is locked in",
  );
  await expect(page.locator("body")).not.toContainText("will be in your inbox");
  await expect(
    page.getByRole("heading", { name: "Your order is in." }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry Secure Checkout | $497" })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry Secure Checkout | $497" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Retry Secure Checkout | $497" })
    .click();
  await expect(page).toHaveURL(STRIPE_TEST_DESTINATION);
  expect(leads).toHaveLength(1);
  expect(attempts).toBe(3);
});

for (const failure of ["network", "invalid-json", "missing-url"] as const) {
  test(`${failure} checkout response remains retryable after one lead capture`, async ({
    page,
  }) => {
    const leads: RequestBody[] = [];
    let attempts = 0;
    await mockLeadCapture(page, leads);
    await mockStripePage(page);
    await page.route("**/api/checkout", async (route) => {
      attempts++;
      if (attempts > 1)
        return route.fulfill({ json: { url: STRIPE_TEST_DESTINATION } });
      if (failure === "network") return route.abort("failed");
      if (failure === "invalid-json")
        return route.fulfill({
          body: "not-json",
          contentType: "application/json",
        });
      return route.fulfill({ json: { ok: true } });
    });
    await form(page);
    await page
      .getByRole("button", { name: "Send Order + Pay $497 Now" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Your request is saved",
    );
    await page
      .getByRole("button", { name: "Retry Secure Checkout | $497" })
      .click();
    await expect(page).toHaveURL(STRIPE_TEST_DESTINATION);
    expect(leads).toHaveLength(1);
    expect(attempts).toBe(2);
  });
}

test("changed contact details are saved and used by the next checkout attempt", async ({
  page,
}) => {
  const leads: RequestBody[] = [];
  const checkouts: RequestBody[] = [];
  await mockLeadCapture(page, leads);
  await page.route("**/api/checkout", async (route) => {
    checkouts.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      json: { error: "Temporary checkout failure" },
    });
  });
  await form(page);
  await page.getByRole("button", { name: "Send Order + Pay $497 Now" }).click();
  await expect(page.getByRole("alert")).toContainText("Your request is saved");
  await page.locator('input[name="email"]').fill("updated@example.invalid");
  await page
    .getByRole("button", { name: "Retry Secure Checkout | $497" })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry Secure Checkout | $497" }),
  ).toBeEnabled();
  expect(leads.map((lead) => lead.email)).toEqual([
    "checkout@example.invalid",
    "updated@example.invalid",
  ]);
  expect(checkouts.map((checkout) => checkout.email)).toEqual([
    "checkout@example.invalid",
    "updated@example.invalid",
  ]);
});

test("a failed lead save prevents checkout and is not cached as saved", async ({
  page,
}) => {
  let leads = 0;
  let checkouts = 0;
  await page.route("**/api/leads", async (route) => {
    leads++;
    await route.fulfill(
      leads === 1
        ? { status: 503, json: { error: "Intake unavailable" } }
        : { json: { ok: true } },
    );
  });
  await page.route("**/api/checkout", async (route) => {
    checkouts++;
    await route.fulfill({
      status: 503,
      json: { error: "Checkout unavailable" },
    });
  });
  await form(page);
  await page.getByRole("button", { name: "Send Order + Pay $497 Now" }).click();
  await expect(page.getByRole("alert")).toHaveText("Intake unavailable");
  expect(checkouts).toBe(0);
  await page.getByRole("button", { name: "Send Order + Pay $497 Now" }).click();
  await expect(page.getByRole("alert")).toContainText("Your request is saved");
  expect(leads).toBe(2);
  expect(checkouts).toBe(1);
});

test("repeated submits during a pending request create only one lead and checkout", async ({
  page,
}) => {
  let leads = 0;
  let checkouts = 0;
  await page.route("**/api/leads", async (route) => {
    leads++;
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/checkout", async (route) => {
    checkouts++;
    await route.fulfill({ status: 503, json: {} });
  });
  await form(page);
  await page.locator("form").evaluate((element) => {
    const order = element as HTMLFormElement;
    order.requestSubmit();
    order.requestSubmit();
  });
  await expect(page.getByRole("alert")).toContainText("Your request is saved");
  expect(leads).toBe(1);
  expect(checkouts).toBe(1);
});

test("optional analytics failure does not block lead capture or checkout", async ({
  page,
}) => {
  const leads: RequestBody[] = [];
  let checkouts = 0;
  await page.addInitScript(() => {
    window.fbq = () => {
      throw new Error("Analytics unavailable");
    };
  });
  await mockLeadCapture(page, leads);
  await mockStripePage(page);
  await page.route("**/api/checkout", async (route) => {
    checkouts++;
    await route.fulfill({ json: { url: STRIPE_TEST_DESTINATION } });
  });
  await form(page);
  await page.getByRole("button", { name: "Send Order + Pay $497 Now" }).click();
  await expect(page).toHaveURL(STRIPE_TEST_DESTINATION);
  expect(leads).toHaveLength(1);
  expect(checkouts).toBe(1);
});

test("a question-only request confirms the inquiry without opening checkout", async ({
  page,
}) => {
  const leads: RequestBody[] = [];
  let checkouts = 0;
  await mockLeadCapture(page, leads);
  await page.route("**/api/checkout", async (route) => {
    checkouts++;
    await route.fulfill({ status: 500, json: {} });
  });
  await form(page);
  await page.getByRole("button", { name: /^I have questions first/ }).click();
  await page.getByRole("button", { name: "Send My System Map Order" }).click();
  await expect(
    page.getByRole("heading", { name: "Your request is saved." }),
  ).toBeVisible();
  expect(leads).toHaveLength(1);
  expect(checkouts).toBe(0);
});

test("only System Map loses the redundant same-SKU option", async ({
  page,
}) => {
  await page.goto("/packages/system-map");
  await expect(
    page.getByRole("button", { name: /^Start me with the \$497 System Map/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^I want to purchase in full/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /^Skip the line with a down payment/ }),
  ).toHaveCount(1);
  await page.goto("/packages/industry-os");
  await expect(
    page.getByRole("button", { name: /^Start me with the \$497 System Map/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Buy the Map | $497" }),
  ).toHaveCount(1);
  await page.goto("/packages/launch");
  await expect(
    page.getByRole("button", { name: "Send Order + Pay $500 Now" }),
  ).toHaveCount(1);
});

test("shared BuyButton still opens checkout when analytics throws", async ({
  page,
}) => {
  const checkouts: RequestBody[] = [];
  await page.addInitScript(() => {
    window.fbq = () => {
      throw new Error("Analytics unavailable");
    };
  });
  await mockStripePage(page);
  await page.route("**/api/checkout", async (route) => {
    checkouts.push(route.request().postDataJSON());
    await route.fulfill({ json: { url: STRIPE_TEST_DESTINATION } });
  });
  await page.goto("/packages/industry-os");
  await page.getByRole("button", { name: "Buy the Map | $497" }).click();
  await expect(page).toHaveURL(STRIPE_TEST_DESTINATION);
  expect(checkouts).toEqual([{ kind: "system_map" }]);
});
