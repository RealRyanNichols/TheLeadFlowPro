// The plugin engine, pure parts. Every generated draft goes through the
// copy rules, every schedule is checked against a fixed clock in a fixed
// timezone, and the credential helpers are checked for shape and rotation.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, planIsLive, type Lead, type Workspace } from "../lib/hq/types.ts";
import { parseSettings, parseWorkspace, profileGaps } from "../lib/hq/settings.ts";
import { decryptSecret, encryptSecret, hqSecrets, sha256Hex, signPayload, verifyPayload } from "../lib/hq/crypto.ts";
import { bearerFrom, hashKey, keyHint, keyKind, looksLikeKey, mintKey } from "../lib/hq/keys.ts";
import { localParts, localWeekStart, nextSendWindow, localDateShift } from "../lib/hq/time.ts";
import { firstName, formatPhone, last10, normalizeEmail, toE164 } from "../lib/hq/phone.ts";
import { rankLeads, scoreLead } from "../lib/hq/score.ts";
import { afterFollowUpSent, afterTouch, dueFollowUps, nextFollowUpAt } from "../lib/hq/followups.ts";
import { pendingAlerts, responseStats, watchdogKey } from "../lib/hq/watchdog.ts";
import { clampSms, emailReply, followUp, ownerAlertText, quoteFollowUp, reviewAsk, reschedule, textBack } from "../lib/hq/drafts.ts";
import { buildDailyBrief, buildWeeklyReport } from "../lib/hq/brief.ts";
import { buildWeeklyContent, reviewReply } from "../lib/hq/content.ts";
import { copyProblems, plain } from "../lib/hq/copy.ts";
import { isAllowedRedirectUri, normalizeScope, parseAuthorizeParams, parseRegistration, pkceMatches } from "../lib/hq/oauth.ts";
import crypto from "node:crypto";

const NOW = new Date("2026-09-14T14:00:00Z"); // Monday 9:00 a.m. Central

export function workspace(over: Partial<Workspace> = {}): Workspace {
  return parseWorkspace({
    id: "ws-1",
    slug: "kirby-plumbing",
    name: "Kirby Plumbing",
    owner_id: "user-1",
    owner_name: "Dan Kirby",
    industry: "plumbing",
    phone: "+19035550142",
    email: "dan@kirbyplumbing.com",
    website: "https://kirbyplumbing.com",
    city: "Longview",
    state: "TX",
    timezone: "America/Chicago",
    brand_color: "#0B5A33",
    voice: "plain",
    services: ["Water heater replacement", "Drain cleaning", "Leak repair"],
    offer: "$50 off any water heater install this month",
    review_link: "https://g.page/r/kirby/review",
    plan: "active",
    settings: {},
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...over,
  });
}

export function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: over.id ?? "lead-1",
    workspace_id: "ws-1",
    created_at: over.created_at ?? new Date(NOW.getTime() - 10 * 60_000).toISOString(),
    updated_at: NOW.toISOString(),
    name: "Jamie Rivera",
    phone: "+19035550199",
    email: "jamie@example.com",
    source: "website",
    source_detail: null,
    message: "Water heater is leaking, need someone today",
    service: "Water heater replacement",
    status: "new",
    score: 0,
    first_contact_at: null,
    last_contact_at: null,
    next_follow_up_at: null,
    follow_up_step: 0,
    value_cents: null,
    notes: null,
    consent_sms: true,
    consent_email: true,
    unsubscribed_at: null,
    auto_replied_at: null,
    external_id: null,
    meta: {},
    ...over,
  };
}

describe("settings and workspace parsing", () => {
  test("loose JSON becomes clamped settings", () => {
    const s = parseSettings({ responseTargetMinutes: "999", briefHour: -3, followUpDays: [3, "1", 3, 200], alertPhones: [" 903-555-0100 ", 5], autoTextBack: "true", notes: "x".repeat(2000) });
    assert.equal(s.responseTargetMinutes, 240);
    assert.equal(s.briefHour, 0);
    assert.deepEqual(s.followUpDays, [1, 3, 90]);
    assert.deepEqual(s.alertPhones, ["903-555-0100"]);
    assert.equal(s.autoTextBack, true);
    assert.equal(s.notes.length, 1500);
  });

  test("empty settings are the defaults", () => {
    assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
    assert.deepEqual(parseSettings("junk"), DEFAULT_SETTINGS);
  });

  test("a bad voice or plan falls back safely", () => {
    const ws = parseWorkspace({ id: "x", voice: "shouty", plan: "gold", services: "not-an-array" });
    assert.equal(ws.voice, "plain");
    assert.equal(ws.plan, "none");
    assert.deepEqual(ws.services, []);
  });

  test("profile gaps name what is missing", () => {
    assert.deepEqual(profileGaps(workspace()), []);
    const gaps = profileGaps(workspace({ owner_name: null, services: [], city: null }));
    assert.ok(gaps.includes("your name") && gaps.includes("at least one service") && gaps.includes("city"));
  });

  test("plan liveness honors the trial clock", () => {
    assert.equal(planIsLive("active"), true);
    assert.equal(planIsLive("past_due"), true);
    assert.equal(planIsLive("canceled"), false);
    assert.equal(planIsLive("trial", new Date(Date.now() + 86_400_000).toISOString()), true);
    assert.equal(planIsLive("trial", new Date(Date.now() - 86_400_000).toISOString()), false);
    assert.equal(planIsLive("none"), false);
  });
});

describe("crypto and keys", () => {
  const secrets = ["a-secret-that-is-long-enough-1", "an-older-secret-still-valid-2"];

  test("secrets chain skips short and duplicate values", () => {
    const list = hqSecrets({ HQ_SECRET: "short", PRO_TOOLS_SECRET: "x".repeat(20), UNSUBSCRIBE_SECRET: "x".repeat(20), SUPABASE_SERVICE_ROLE_KEY: "y".repeat(40) } as unknown as NodeJS.ProcessEnv);
    assert.deepEqual(list, ["x".repeat(20), "y".repeat(40)]);
  });

  test("encrypt round-trips and decrypts under a rotated chain", () => {
    const ct = encryptSecret("op_live_abc123", [secrets[0]]);
    assert.ok(ct.startsWith("v1."));
    assert.equal(decryptSecret(ct, secrets), "op_live_abc123");
    assert.equal(decryptSecret(ct, [secrets[1], secrets[0]]), "op_live_abc123", "an older ciphertext still opens after rotation");
    assert.equal(decryptSecret(ct, ["completely-different-secret-xx"]), null);
    assert.equal(decryptSecret(`${ct}x`, secrets), null, "a tampered tag fails closed");
    assert.equal(decryptSecret("garbage", secrets), null);
  });

  test("two encryptions of the same value differ (fresh iv)", () => {
    assert.notEqual(encryptSecret("same", secrets), encryptSecret("same", secrets));
  });

  test("payload signatures verify against any secret in the chain", () => {
    const sig = signPayload("hello", secrets[0]);
    assert.equal(verifyPayload("hello", sig, secrets), true);
    assert.equal(verifyPayload("hello", sig, [secrets[1]]), false);
    assert.equal(verifyPayload("hellp", sig, secrets), false);
  });

  test("minted keys have the right shape, hash, and hint", () => {
    const k = mintKey("api");
    assert.match(k.plaintext, /^lfp_live_[a-z0-9]{32}$/);
    assert.equal(k.hash, hashKey(k.plaintext));
    assert.equal(k.hash, sha256Hex(`hq-key:${k.plaintext}`));
    assert.match(k.hint, /^lfp_live_[a-z0-9]{4}\.\.\.[a-z0-9]{4}$/);
    assert.equal(keyHint(k.plaintext).includes(k.plaintext.slice(9, 20)), false, "the hint never carries the middle of the key");
    assert.equal(keyKind(k.plaintext), "api");
    assert.equal(keyKind(mintKey("access").plaintext), "access");
    assert.equal(keyKind("sk_live_notours"), null);
  });

  test("bearer parsing only accepts our shapes", () => {
    const k = mintKey("access").plaintext;
    assert.equal(bearerFrom(`Bearer ${k}`), k);
    assert.equal(bearerFrom(`bearer ${k}`), k);
    assert.equal(bearerFrom("Bearer nope"), null);
    assert.equal(bearerFrom(`Basic ${k}`), null);
    assert.equal(looksLikeKey("lfpat_" + "a".repeat(31)), false);
    assert.equal(looksLikeKey("lfpat_" + "A".repeat(32)), false, "uppercase is not our alphabet");
  });
});

describe("local time", () => {
  test("parts come out in the business's zone", () => {
    const p = localParts(NOW, "America/Chicago");
    assert.equal(p.hour, 9);
    assert.equal(p.weekday, 1);
    assert.equal(p.date, "2026-09-14");
    const la = localParts(NOW, "America/Los_Angeles");
    assert.equal(la.hour, 7);
  });

  test("an invalid zone falls back instead of throwing", () => {
    assert.equal(localParts(NOW, "Mars/Olympus").hour, 9);
  });

  test("week start is Monday in local time", () => {
    assert.equal(localWeekStart(NOW, "America/Chicago"), "2026-09-14");
    assert.equal(localWeekStart(new Date("2026-09-14T03:00:00Z"), "America/Chicago"), "2026-09-07", "Sunday night Central is still last week");
    assert.equal(localDateShift(NOW, "America/Chicago", -1), "2026-09-13");
  });

  test("the send window pushes a 2 a.m. touch to 8 a.m. local", () => {
    const late = new Date("2026-09-15T07:30:00Z"); // 2:30 a.m. Central
    const moved = nextSendWindow(late, "America/Chicago");
    const p = localParts(moved, "America/Chicago");
    assert.equal(p.hour, 8);
    assert.equal(p.date, "2026-09-15");
    assert.equal(nextSendWindow(NOW, "America/Chicago").getTime(), NOW.getTime(), "a daytime touch is left alone");
  });
});

describe("phones and names", () => {
  test("every common shape becomes E.164", () => {
    assert.equal(toE164("(903) 555-0142"), "+19035550142");
    assert.equal(toE164("903.555.0142"), "+19035550142");
    assert.equal(toE164("1 903 555 0142"), "+19035550142");
    assert.equal(toE164("+19035550142"), "+19035550142");
    assert.equal(toE164("+44 20 7946 0958"), "+442079460958");
    assert.equal(toE164("555-0142"), null);
    assert.equal(toE164("call me"), null);
    assert.equal(formatPhone("+19035550142"), "(903) 555-0142");
    assert.equal(last10("903-555-0142"), "9035550142");
  });

  test("emails normalize and names shorten", () => {
    assert.equal(normalizeEmail(" Jamie@Example.com "), "jamie@example.com");
    assert.equal(normalizeEmail("nope"), null);
    assert.equal(firstName("jamie rivera"), "Jamie");
    assert.equal(firstName(""), "");
    assert.equal(firstName("<script>"), "", "markup is not a first name");
  });
});

describe("scoring", () => {
  test("a fresh lead with a hot word and a phone outranks an old contacted one", () => {
    const fresh = scoreLead(lead(), NOW);
    const old = scoreLead(lead({ id: "l2", status: "contacted", created_at: "2026-08-01T00:00:00Z", message: "just curious", phone: null }), NOW);
    assert.ok(fresh.score > old.score);
    assert.ok(fresh.reasons.some((r) => r.includes("brand new")));
    assert.ok(fresh.reasons.some((r) => r.includes('"today"')));
  });

  test("closed leads score zero and are dropped from the ranking", () => {
    assert.equal(scoreLead(lead({ status: "won" }), NOW).score, 0);
    const ranked = rankLeads([lead({ status: "won" }), lead({ id: "l2" })], NOW);
    assert.equal(ranked.length, 1);
  });

  test("an opted-out lead is capped and told to be called", () => {
    const s = scoreLead(lead({ unsubscribed_at: NOW.toISOString() }), NOW);
    assert.ok(s.score <= 25);
    assert.ok(s.reasons.some((r) => r.includes("call instead")));
  });
});

describe("the follow-up ladder", () => {
  const settings = DEFAULT_SETTINGS;

  test("steps land on the configured days, in business hours", () => {
    const step0 = nextFollowUpAt(0, settings, NOW, "America/Chicago")!;
    assert.equal(localParts(step0, "America/Chicago").date, "2026-09-15");
    assert.equal(nextFollowUpAt(5, settings, NOW, "America/Chicago"), null, "past the last rung there is no next date");
  });

  test("a touch sets first contact and schedules the first rung", () => {
    const patch = afterTouch(lead(), settings, "America/Chicago", NOW, "contacted");
    assert.equal(patch.status, "contacted");
    assert.equal(patch.first_contact_at, NOW.toISOString());
    assert.equal(patch.follow_up_step, 0);
    assert.ok(patch.next_follow_up_at);
  });

  test("won, lost, booked clear the ladder", () => {
    for (const outcome of ["won", "lost", "booked", "spam"] as const) {
      const patch = afterTouch(lead(), settings, "America/Chicago", NOW, outcome);
      assert.equal(patch.next_follow_up_at, null, outcome);
    }
  });

  test("a no-answer keeps climbing so the ladder ends", () => {
    let l = lead();
    for (let i = 0; i < 6; i++) l = { ...l, ...afterTouch(l, settings, "America/Chicago", NOW, "no_answer") } as Lead;
    assert.equal(l.next_follow_up_at, null, "after the last rung the lead stops being nagged");
  });

  test("sending a follow-up advances the step", () => {
    const patch = afterFollowUpSent(lead({ follow_up_step: 1, status: "contacted" }), settings, "America/Chicago", NOW);
    assert.equal(patch.follow_up_step, 2);
    assert.ok(patch.next_follow_up_at);
  });

  test("due follow-ups are the open ones whose date has passed", () => {
    const due = dueFollowUps(
      [
        lead({ id: "a", status: "contacted", next_follow_up_at: new Date(NOW.getTime() - 1000).toISOString() }),
        lead({ id: "b", status: "contacted", next_follow_up_at: new Date(NOW.getTime() + 86_400_000).toISOString() }),
        lead({ id: "c", status: "won", next_follow_up_at: new Date(NOW.getTime() - 1000).toISOString() }),
      ],
      NOW,
    );
    assert.deepEqual(due.map((l) => l.id), ["a"]);
  });
});

describe("the watchdog", () => {
  test("fires the highest stage reached once, and never again", () => {
    const fired = new Set<string>();
    const waiting = lead({ created_at: new Date(NOW.getTime() - 5 * 60 * 60_000).toISOString() });
    const first = pendingAlerts([waiting], DEFAULT_SETTINGS, fired, NOW);
    assert.equal(first.length, 1);
    assert.equal(first[0].stage, "4h");
    fired.add(first[0].dedupeKey);
    assert.equal(pendingAlerts([waiting], DEFAULT_SETTINGS, fired, NOW).length, 0, "same run again is silent");
    assert.equal(fired.has(watchdogKey(waiting.id, "1h")), true, "lower stages are marked spent");
  });

  test("a lead inside the target window, or already contacted, is not an alert", () => {
    assert.equal(pendingAlerts([lead()], DEFAULT_SETTINGS, new Set(), NOW).length, 0);
    assert.equal(pendingAlerts([lead({ created_at: "2026-09-01T00:00:00Z", first_contact_at: "2026-09-01T00:05:00Z" })], DEFAULT_SETTINGS, new Set(), NOW).length, 0);
  });

  test("response stats compute the median first reply", () => {
    const stats = responseStats([
      lead({ id: "a", created_at: "2026-09-10T10:00:00Z", first_contact_at: "2026-09-10T10:05:00Z", status: "contacted" }),
      lead({ id: "b", created_at: "2026-09-10T10:00:00Z", first_contact_at: "2026-09-10T12:00:00Z", status: "contacted" }),
      lead({ id: "c", created_at: "2026-09-10T10:00:00Z", first_contact_at: "2026-09-10T10:30:00Z", status: "contacted" }),
      lead({ id: "d" }),
    ]);
    assert.equal(stats.contacted, 3);
    assert.equal(stats.uncontacted, 1);
    assert.equal(stats.medianMinutes, 30);
    assert.equal(stats.withinTarget, 1);
  });
});

describe("drafts", () => {
  const ws = workspace();
  const drafts = [
    textBack(ws, lead()),
    emailReply(ws, lead()),
    followUp(ws, lead(), 0),
    followUp(ws, lead(), 3),
    followUp(ws, lead({ phone: null }), 1),
    quoteFollowUp(ws, lead(), 1),
    quoteFollowUp(ws, lead(), 5),
    reviewAsk(ws, lead()),
    reviewAsk(workspace({ review_link: null }), lead()),
    reschedule(ws, lead()),
    textBack(workspace({ voice: "friendly" }), lead({ name: "" })),
    emailReply(workspace({ voice: "formal", phone: null, email: null }), lead({ name: "" })),
  ];

  test("every draft passes the copy rules and renders every value", () => {
    for (const d of drafts) {
      assert.deepEqual(copyProblems(d.body), [], `${d.purpose}: ${d.body}`);
      if (d.subject) assert.deepEqual(copyProblems(d.subject), []);
    }
  });

  test("every text carries the opt-out line and fits in two segments", () => {
    for (const d of drafts) {
      if (d.channel !== "sms") continue;
      assert.match(d.body, /Reply STOP to opt out\.$/, d.purpose);
      assert.ok(d.body.length <= 300, `${d.purpose} is ${d.body.length} chars`);
    }
  });

  test("the text-back names the business and the person", () => {
    const d = textBack(ws, lead());
    assert.match(d.body, /^Jamie, this is Dan Kirby with Kirby Plumbing\./);
    assert.match(d.body, /water heater replacement/);
  });

  test("a lead who opted out gets follow-ups by email", () => {
    const d = followUp(ws, lead({ unsubscribed_at: NOW.toISOString() }), 0);
    assert.equal(d.channel, "email");
    assert.ok(d.subject);
  });

  test("the review ask carries the link when there is one", () => {
    assert.match(reviewAsk(ws, lead()).body, /g\.page\/r\/kirby/);
    assert.doesNotMatch(reviewAsk(workspace({ review_link: null }), lead()).body, /undefined/);
  });

  test("clampSms never cuts a word and keeps the opt-out", () => {
    const long = clampSms(`${"word ".repeat(120)}Reply STOP to opt out.`);
    assert.ok(long.length <= 300);
    assert.match(long, /Reply STOP to opt out\.$/);
  });

  test("the owner alert has the essentials on one line", () => {
    const t = ownerAlertText(ws, lead());
    assert.match(t, /New lead: Jamie Rivera \| \(903\) 555-0199 \| Water heater replacement/);
    assert.match(t, /\/hq\/leads\/lead-1/);
  });
});

describe("the daily brief and weekly report", () => {
  const ws = workspace();
  const leads = [
    lead({ id: "waiting", created_at: new Date(NOW.getTime() - 40 * 60_000).toISOString() }),
    lead({ id: "yesterday", created_at: "2026-09-13T18:00:00Z", status: "contacted", first_contact_at: "2026-09-13T18:10:00Z", next_follow_up_at: new Date(NOW.getTime() - 60_000).toISOString() }),
    lead({ id: "won", created_at: "2026-09-10T12:00:00Z", status: "won", first_contact_at: "2026-09-10T12:20:00Z", last_contact_at: "2026-09-12T12:00:00Z", value_cents: 180_000 }),
    lead({ id: "spam", created_at: "2026-09-13T12:00:00Z", status: "spam" }),
  ];

  test("the brief leads with who is waiting and lists real actions", () => {
    const brief = buildDailyBrief({ workspace: ws, leads, events: [], content: [], now: NOW });
    assert.equal(brief.date, "2026-09-14");
    assert.match(brief.headline, /1 person is waiting/);
    assert.equal(brief.numbers.find((n) => n.label === "New yesterday")?.value, "1", "spam does not count");
    assert.equal(brief.callNow[0].leadId, "waiting");
    assert.ok(brief.followUps.some((f) => f.leadId === "yesterday"));
    assert.ok(brief.actions[0].text.startsWith("Call Jamie Rivera at (903) 555-0199"));
    assert.deepEqual(copyProblems(brief.text), []);
    assert.match(brief.text, /DO THIS/);
  });

  test("a quiet inbox says so instead of inventing work", () => {
    const brief = buildDailyBrief({ workspace: ws, leads: [], events: [], content: [], now: NOW });
    assert.match(brief.headline, /Quiet inbox/);
    assert.equal(brief.actions.length, 1);
    assert.equal(brief.actions[0].kind, "setup");
  });

  test("the weekly report counts the week, names the gap, and passes copy rules", () => {
    const report = buildWeeklyReport({ workspace: ws, leads, events: [], content: [], now: NOW });
    assert.equal(report.weekStart, "2026-09-07");
    assert.equal(report.numbers.find((n) => n.label === "New leads")?.value, "2", "the waiting one is today, not last week");
    assert.equal(report.numbers.find((n) => n.label === "Won")?.value, "1 ($1,800)");
    assert.ok(report.takeaways.some((t) => t.includes("never got a first reply")) === false, "the waiting lead is today's, not the week's");
    assert.equal(report.byDay.length, 7);
    assert.deepEqual(copyProblems(report.text), []);
  });
});

describe("weekly content", () => {
  const ws = workspace();

  test("a week has three posts, one ad, one video script, all clean", () => {
    const bundle = buildWeeklyContent(ws, "2026-09-14");
    const kinds = bundle.drafts.map((d) => d.kind);
    assert.deepEqual(kinds, ["post", "post", "post", "ad", "video_script"]);
    for (const d of bundle.drafts) {
      assert.deepEqual(copyProblems(d.body), [], `${d.title}: ${d.body}`);
      assert.deepEqual(copyProblems(d.hook), []);
      assert.ok(d.body.includes("Kirby Plumbing") || d.body.includes("Dan Kirby"), d.title);
    }
  });

  test("consecutive weeks rotate angles and the same week is stable", () => {
    const a = buildWeeklyContent(ws, "2026-09-14");
    const b = buildWeeklyContent(ws, "2026-09-21");
    assert.notEqual(a.angle, b.angle);
    assert.deepEqual(buildWeeklyContent(ws, "2026-09-14"), a);
  });

  test("the video script has a five shot list and a phone number on screen", () => {
    const video = buildWeeklyContent(ws, "2026-09-14").drafts.find((d) => d.kind === "video_script")!;
    const shots = video.extras.shots as { shot: number }[];
    assert.equal(shots.length, 5);
    assert.match(video.body, /\(903\) 555-0142/);
  });

  test("the ad carries a headline, form questions, and the compliance note", () => {
    const ad = buildWeeklyContent(ws, "2026-09-14").drafts.find((d) => d.kind === "ad")!;
    assert.match(String(ad.extras.headline), /in Longview, TX/);
    assert.equal((ad.extras.formQuestions as string[]).length, 2);
    assert.match(String(ad.extras.compliance), /not the person/);
  });

  test("a business with nothing filled in still gets usable drafts", () => {
    const bare = workspace({ owner_name: null, phone: null, email: null, city: null, state: null, services: [], offer: null, review_link: null, website: null });
    const bundle = buildWeeklyContent(bare, "2026-09-14");
    for (const d of bundle.drafts) assert.deepEqual(copyProblems(d.body), [], d.title);
  });

  test("review replies fit the star count", () => {
    assert.match(reviewReply(ws, { name: "Pat", stars: 5, text: "Great work" }).body, /^Pat, thank you/);
    assert.match(reviewReply(ws, { stars: 1, text: "Late" }).body, /make it right/);
  });
});

describe("copy rules", () => {
  test("catch dashes, filler, and guarantees", () => {
    assert.deepEqual(copyProblems("Plain and honest."), []);
    assert.ok(copyProblems("We guarantee results").length);
    assert.ok(copyProblems("A game changer").length);
    assert.ok(copyProblems("Fast — and cheap").length);
    assert.ok(copyProblems("Value: undefined").length);
  });
  test("plain strips markup", () => {
    assert.equal(plain("<b>Hi</b> there"), "Hi there");
    assert.equal(plain(42), "");
  });
});

describe("oauth helpers", () => {
  test("redirect URIs must be https or localhost", () => {
    assert.equal(isAllowedRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect"), true);
    assert.equal(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback"), true);
    assert.equal(isAllowedRedirectUri("http://localhost:3000/cb"), true);
    assert.equal(isAllowedRedirectUri("http://evil.com/cb"), false);
    assert.equal(isAllowedRedirectUri("https://x.com/cb#frag"), false);
    assert.equal(isAllowedRedirectUri("javascript:alert(1)"), false);
  });

  test("registration keeps only valid URIs and a clean name", () => {
    const r = parseRegistration({ client_name: "Claude ", redirect_uris: ["https://claude.ai/cb", "http://evil.com/cb"], grant_types: ["authorization_code", "refresh_token"] });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.client_name, "Claude");
      assert.deepEqual(r.value.redirect_uris, ["https://claude.ai/cb"]);
    }
    assert.equal(parseRegistration({ redirect_uris: [] }).ok, false);
  });

  test("PKCE S256 verifies the exact verifier", () => {
    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    assert.equal(pkceMatches(verifier, challenge), true);
    assert.equal(pkceMatches(`${verifier}x`, challenge), false);
    assert.equal(pkceMatches(verifier, challenge, "plain"), false);
  });

  test("scopes drop unknowns and default to all", () => {
    assert.equal(normalizeScope("leads:read admin:everything"), "leads:read");
    assert.equal(normalizeScope(""), "leads:read leads:write messages:send content:write calculators:run");
  });

  test("authorize params reject a mismatched redirect and demand PKCE", () => {
    const client = { client_id: "c1", redirect_uris: ["https://claude.ai/cb"] };
    const good = new URLSearchParams({ client_id: "c1", redirect_uri: "https://claude.ai/cb", response_type: "code", code_challenge: "a".repeat(43), code_challenge_method: "S256", state: "s" });
    assert.equal(parseAuthorizeParams(good, client).ok, true);
    const wrongUri = new URLSearchParams(good);
    wrongUri.set("redirect_uri", "https://evil.com/cb");
    const r = parseAuthorizeParams(wrongUri, client);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.redirect, undefined, "never redirect to an unregistered address");
    const noPkce = new URLSearchParams(good);
    noPkce.delete("code_challenge");
    const r2 = parseAuthorizeParams(noPkce, client);
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.match(r2.redirect ?? "", /error=invalid_request&state=s/);
  });
});
