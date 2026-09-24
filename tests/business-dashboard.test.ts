import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import test from "node:test";
import {
  BUSINESS_TICKET_CONTEXT,
  BUSINESS_TICKET_TTL_SECONDS,
  businessSsoUrl,
  dashboardUserFor,
  mintBusinessTicket,
  parseDashboardUsers,
  readBusinessDashboardConfig,
} from "../lib/businessDashboard";

const SECRET = "x".repeat(48);
const ENV = {
  BUSINESS_DASHBOARD_ORIGIN: "https://165-227-248-110.sslip.io",
  BUSINESS_DASHBOARD_SSO_SECRET: SECRET,
  BUSINESS_DASHBOARD_USERS: "Hello@TheLeadFlowPro.com:ryan",
};

/** The dashboard server's check, written out here so the two sides cannot drift. */
function verify(ticket: string, secret: string, nowSeconds: number) {
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(`${BUSINESS_TICKET_CONTEXT}.${payload}`).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (typeof body.exp !== "number" || body.exp < nowSeconds) return null;
  return body as { u: string; exp: number; n: string };
}

test("users map reads email:user pairs, ignoring case, spaces and junk", () => {
  const users = parseDashboardUsers(" Hello@TheLeadFlowPro.com:Ryan , pat@example.com:pat, nocolon, :ryan, a@b.co:Bad User, x@y.co:");
  assert.deepEqual([...users], [
    ["hello@theleadflowpro.com", "ryan"],
    ["pat@example.com", "pat"],
  ]);
  assert.equal(parseDashboardUsers(undefined).size, 0);
});

test("config needs an https origin with no path, a long secret and at least one user", () => {
  const config = readBusinessDashboardConfig(ENV);
  assert.ok(config);
  assert.equal(config.origin, "https://165-227-248-110.sslip.io");
  assert.equal(readBusinessDashboardConfig({ ...ENV, BUSINESS_DASHBOARD_ORIGIN: "https://165-227-248-110.sslip.io/" })?.origin, "https://165-227-248-110.sslip.io");
  assert.equal(readBusinessDashboardConfig({ ...ENV, BUSINESS_DASHBOARD_ORIGIN: "http://165-227-248-110.sslip.io" }), null);
  assert.equal(readBusinessDashboardConfig({ ...ENV, BUSINESS_DASHBOARD_ORIGIN: "https://example.com/dashboard" }), null);
  assert.equal(readBusinessDashboardConfig({ ...ENV, BUSINESS_DASHBOARD_ORIGIN: "" }), null);
  assert.equal(readBusinessDashboardConfig({ ...ENV, BUSINESS_DASHBOARD_SSO_SECRET: "short" }), null);
  assert.equal(readBusinessDashboardConfig({ ...ENV, BUSINESS_DASHBOARD_USERS: "" }), null);
  assert.equal(readBusinessDashboardConfig({}), null);
});

test("only a mapped Back Office email gets a dashboard user", () => {
  const config = readBusinessDashboardConfig(ENV);
  assert.ok(config);
  assert.equal(dashboardUserFor(config, "hello@theleadflowpro.com"), "ryan");
  assert.equal(dashboardUserFor(config, " HELLO@theleadflowpro.com "), "ryan");
  assert.equal(dashboardUserFor(config, "someone@else.com"), null);
  assert.equal(dashboardUserFor(config, undefined), null);
});

test("a ticket names the user, lives 60 seconds and verifies only with the shared secret", () => {
  const now = Date.UTC(2026, 8, 24, 17, 0, 0);
  const ticket = mintBusinessTicket("ryan", SECRET, now, "ab".repeat(16));
  const body = verify(ticket, SECRET, now / 1000);
  assert.deepEqual(body, { u: "ryan", exp: now / 1000 + BUSINESS_TICKET_TTL_SECONDS, n: "ab".repeat(16) });
  assert.equal(verify(ticket, "y".repeat(48), now / 1000), null, "another secret must not verify");
  assert.equal(verify(ticket, SECRET, now / 1000 + BUSINESS_TICKET_TTL_SECONDS + 1), null, "an old ticket must not verify");
  const [payload, signature] = ticket.split(".");
  const forged = Buffer.from(JSON.stringify({ u: "pat", exp: now / 1000 + 60, n: "cd".repeat(16) })).toString("base64url");
  assert.equal(verify(`${forged}.${signature}`, SECRET, now / 1000), null, "a changed payload must not verify");
  assert.ok(payload && /^[A-Za-z0-9_-]+$/.test(payload));
});

test("every ticket is different and bad user names are refused", () => {
  assert.notEqual(mintBusinessTicket("ryan", SECRET), mintBusinessTicket("ryan", SECRET));
  assert.throws(() => mintBusinessTicket("Ryan Nichols", SECRET));
  assert.throws(() => mintBusinessTicket("", SECRET));
});

test("the sign-in address carries the ticket and the view", () => {
  const url = new URL(businessSsoUrl("https://165-227-248-110.sslip.io", "abc.def", "frame"));
  assert.equal(url.origin, "https://165-227-248-110.sslip.io");
  assert.equal(url.pathname, "/auth/sso");
  assert.equal(url.searchParams.get("t"), "abc.def");
  assert.equal(url.searchParams.get("m"), "frame");
});
