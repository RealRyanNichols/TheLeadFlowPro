import { test, expect } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({ status: 204 }),
  );
});

test("forgot password opens a mobile-friendly email-only form and sends the recovery callback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let recoveryUrl = "";
  let recoveryEmail = "";
  // Never deliver a real recovery email during a UI test.
  await page.route("**.supabase.co/auth/v1/recover**", async (route) => {
    recoveryUrl = route.request().url();
    recoveryEmail = route.request().postDataJSON().email;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page
    .getByLabel("Email", { exact: true })
    .fill("recovery-check@example.com");
  await page.getByRole("button", { name: "Send password reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account uses this email",
  );
  expect(recoveryEmail).toBe("recovery-check@example.com");
  const redirect = new URL(recoveryUrl).searchParams.get("redirect_to");
  expect(redirect).toBe(
    `${new URL(page.url()).origin}/auth/callback?next=%2Faccount%2Fpassword`,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("a rejected recovery request leaves a clear error and a usable retry", async ({
  page,
}) => {
  await page.route("**.supabase.co/auth/v1/recover**", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        code: "over_email_send_rate_limit",
        msg: "Please wait before requesting another email.",
      }),
    }),
  );
  await page.goto("/login?mode=reset");
  await page
    .getByLabel("Email", { exact: true })
    .fill("recovery-check@example.com");
  await page.getByRole("button", { name: "Send password reset link" }).click();
  await expect(page.getByRole("status")).toContainText("Please wait");
  await expect(
    page.getByRole("button", { name: "Send password reset link" }),
  ).toBeEnabled();
});

test("missing authentication codes show recovery instructions without redirecting outside the site", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("/auth/callback?next=%2F%2Fevil.test", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(
    `${baseURL}/login?auth_error=link_expired`,
  );
  expect(response.headers()["cache-control"]).toContain("no-store");
});
