import assert from "node:assert/strict";
import test from "node:test";
import { ENDS_AT, STARTS_AT } from "../lib/septemberSpecial.ts";
import { NURTURE_STEPS } from "../lib/nurture.ts";
import {
  NURTURE_STEP_MEDIA,
  renderNurtureHtml,
  septemberSpecialOpen,
  splitNurtureBody,
} from "../lib/nurtureHtml.ts";
import { BUSINESS } from "../lib/site/business.ts";

const UNSUB = "https://www.theleadflowpro.com/unsubscribe?t=fixture";
const DURING = Date.parse(STARTS_AT) + 60_000;
const AFTER = Date.parse(ENDS_AT) + 60_000;

test("every thirty day step renders with its picture, its button, the unsubscribe link, and no dashes", () => {
  for (const step of NURTURE_STEPS) {
    const html = renderNurtureHtml({ step, firstName: "Scott", unsubUrl: UNSUB, now: AFTER });
    assert.ok(NURTURE_STEP_MEDIA[step.step], `step ${step.step} has no media entry`);
    assert.ok(html.includes(UNSUB), `step ${step.step} lost the unsubscribe link`);
    assert.ok(html.includes(`Day ${step.day} of 30`), `step ${step.step} day label`);
    assert.ok(html.includes(BUSINESS.phone.display), `step ${step.step} phone`);
    assert.ok(html.includes("<img"), `step ${step.step} has no hero image`);
    assert.ok(!/[–—]/.test(html), `step ${step.step} contains a dash`);
    assert.ok(!/no-email\./.test(html));
  }
});

test("the plain body still carries every URL the button now owns", () => {
  for (const step of NURTURE_STEPS) {
    const body = step.body("Scott");
    const { paragraphs, links } = splitNurtureBody(body);
    assert.ok(paragraphs.length >= 2, `step ${step.step} split too little`);
    assert.ok(links.length >= 1, `step ${step.step} has no link line`);
    for (const link of links) assert.ok(body.includes(link));
    const html = renderNurtureHtml({ step, firstName: "Scott", unsubUrl: UNSUB, now: AFTER });
    const media = NURTURE_STEP_MEDIA[step.step];
    const target = (media.ctaHref ?? links[0]).replace(/&/g, "&amp;");
    assert.ok(html.includes(`href="${target}"`), `step ${step.step} button target`);
  }
});

test("the September special banner shows only while the special is open", () => {
  assert.equal(septemberSpecialOpen(DURING), true);
  assert.equal(septemberSpecialOpen(AFTER), false);
  const step = NURTURE_STEPS[0];
  const during = renderNurtureHtml({ step, firstName: "Scott", unsubUrl: UNSUB, now: DURING });
  const after = renderNurtureHtml({ step, firstName: "Scott", unsubUrl: UNSUB, now: AFTER });
  assert.ok(during.includes("/september-special?"));
  assert.ok(!after.includes("/september-special?"));
});

test("html escapes the first name and never inlines a third party image host", () => {
  const step = NURTURE_STEPS[0];
  const html = renderNurtureHtml({ step, firstName: "<b>Scott</b>", unsubUrl: UNSUB, now: AFTER });
  assert.ok(html.includes("&lt;b&gt;Scott&lt;/b&gt;"));
  const hosts = [...html.matchAll(/src="https?:\/\/([^/"]+)/g)].map((m) => m[1]);
  assert.ok(hosts.length > 0);
  for (const host of hosts) assert.equal(host, "www.theleadflowpro.com");
});
