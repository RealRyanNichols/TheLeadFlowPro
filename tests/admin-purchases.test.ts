import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const page = readFileSync(join(process.cwd(), "app/admin/purchases/page.tsx"), "utf8");
const layout = readFileSync(join(process.cwd(), "app/admin/layout.tsx"), "utf8");

test("the purchases page checks the admin role next to the private read", () => {
  assert.ok(page.includes('profile?.role !== "admin"'), "the page gates on the admin role");
  assert.ok(page.includes('export const dynamic = "force-dynamic"'));
  assert.ok(page.includes("Purchases | The LeadFlow Pro"));
});

test("the purchases page reads purchases and delivery state, and never looks up leads by email", () => {
  assert.ok(page.includes('from("purchases")'));
  assert.ok(page.includes("payment_email_deliveries"));
  assert.ok(page.includes("stripe_checkout:"), "leads are matched through the checkout session id");
  assert.ok(!page.includes('.ilike("email"'), "no ilike on email");
  assert.ok(!page.includes('.eq("email"'), "no eq on email");
  assert.ok(!page.includes(".insert(") && !page.includes(".update(") && !page.includes(".delete(") && !page.includes(".upsert("), "the page is read-only");
});

test("the purchases page has the stated error and empty copy, with no em dashes", () => {
  assert.ok(page.includes("Purchases could not be loaded."));
  assert.ok(page.includes("This is a connection problem, not an empty list."));
  assert.ok(page.includes("No purchases yet."));
  assert.ok(page.includes("The first paid checkout, invoice, or plugin month lands here."));
  assert.ok(!page.includes("—"), "no em dashes in copy");
});

test("the admin nav links to the purchases page", () => {
  assert.ok(layout.includes("/admin/purchases"));
});
