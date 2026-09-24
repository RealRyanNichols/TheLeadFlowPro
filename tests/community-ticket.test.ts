import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import test from "node:test";
import {
  COMMUNITY_TICKET_CONTEXT,
  COMMUNITY_TICKET_TTL_SECONDS,
  communityReturnPath,
  communitySsoUrl,
  mintCommunityTicket,
  readCommunityConfig,
} from "../lib/communityTicket";

const SECRET = "x".repeat(48);
const ENV = { COMMUNITY_ORIGIN: "https://community.theleadflowpro.com", COMMUNITY_SSO_SECRET: SECRET };
const MEMBER = { id: "e94069af-d9de-4ef3-8ae9-b6848ea71a80", email: " Hello@TheLeadFlowPro.com ", name: "Ryan Nichols" };

/** The room's check (owners-room lib/ticket.ts), written out here so the two sides cannot drift. */
function verify(ticket: string, secret: string, nowSeconds: number) {
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(`${COMMUNITY_TICKET_CONTEXT}.${payload}`).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (typeof body.exp !== "number" || body.exp < nowSeconds || body.exp > nowSeconds + 120) return null;
  return body as { sub: string; email: string; name: string; exp: number; n: string };
}

test("config needs an https origin with no path and a long secret", () => {
  assert.equal(readCommunityConfig(ENV)?.origin, "https://community.theleadflowpro.com");
  assert.equal(readCommunityConfig({ ...ENV, COMMUNITY_ORIGIN: "https://community.theleadflowpro.com/" })?.origin, "https://community.theleadflowpro.com");
  assert.equal(readCommunityConfig({ ...ENV, COMMUNITY_ORIGIN: "http://community.theleadflowpro.com" }), null);
  assert.equal(readCommunityConfig({ ...ENV, COMMUNITY_ORIGIN: "https://example.com/room" }), null);
  assert.equal(readCommunityConfig({ ...ENV, COMMUNITY_SSO_SECRET: "short" }), null);
  assert.equal(readCommunityConfig({}), null);
});

test("a ticket names one person, lowercases the email and works for 60 seconds", () => {
  const now = 1_790_000_000_000;
  const body = verify(mintCommunityTicket(MEMBER, SECRET, now, "a".repeat(32)), SECRET, Math.floor(now / 1000));
  assert.ok(body);
  assert.equal(body.sub, MEMBER.id);
  assert.equal(body.email, "hello@theleadflowpro.com");
  assert.equal(body.name, "Ryan Nichols");
  assert.equal(body.exp, Math.floor(now / 1000) + COMMUNITY_TICKET_TTL_SECONDS);
  assert.equal(body.n, "a".repeat(32));
  assert.equal(verify(mintCommunityTicket(MEMBER, SECRET, now), "y".repeat(48), Math.floor(now / 1000)), null);
  assert.equal(verify(mintCommunityTicket(MEMBER, SECRET, now), SECRET, Math.floor(now / 1000) + 61), null);
});

test("every ticket is different", () => {
  assert.notEqual(mintCommunityTicket(MEMBER, SECRET), mintCommunityTicket(MEMBER, SECRET));
});

test("bad ids and emails never get a ticket", () => {
  assert.throws(() => mintCommunityTicket({ ...MEMBER, id: "not-a-uuid" }, SECRET));
  assert.throws(() => mintCommunityTicket({ ...MEMBER, email: "nobody" }, SECRET));
});

test("the room address carries the ticket and a path inside the room only", () => {
  const url = new URL(communitySsoUrl("https://community.theleadflowpro.com", "abc.def", "/post/12"));
  assert.equal(url.origin, "https://community.theleadflowpro.com");
  assert.equal(url.pathname, "/auth/sso");
  assert.equal(url.searchParams.get("t"), "abc.def");
  assert.equal(url.searchParams.get("to"), "/post/12");
  assert.equal(communityReturnPath("//evil.example"), "/feed");
  assert.equal(communityReturnPath("https://evil.example"), "/feed");
  assert.equal(communityReturnPath("/\\evil.example"), "/feed");
  assert.equal(communityReturnPath("/auth/sso?t=x"), "/feed");
  assert.equal(communityReturnPath(null), "/feed");
  assert.equal(communityReturnPath("/classroom/start-here?l=welcome"), "/classroom/start-here?l=welcome");
});
