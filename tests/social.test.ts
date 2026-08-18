import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashtagCount,
  validDailySlots,
  validateMetaSchedule,
  validateSocialPostInput,
} from "../lib/social.ts";
import { buildFacebookPublishRequest } from "../lib/meta-publishing.ts";

describe("LeadFlow social copy rules", () => {
  it("accepts a clean talk-to-text Facebook draft", () => {
    const result = validateSocialPostInput({
      message: "Your form got filled out at 10:47 PM. Who followed up?\n\nThat is the leak we fix.\n\n#LeadFlow #EastTexasBusiness",
      media_type: "text",
      scheduled_for: "2026-08-20T12:15:00.000Z",
      source: "chatgpt",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.source, "chatgpt");
      assert.equal(result.value.timezone, "America/Chicago");
    }
  });

  it("blocks em dashes and more than two hashtags", () => {
    const result = validateSocialPostInput({
      message: "This is the leak — fix it. #One #Two #Three",
      media_type: "text",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((error) => error.includes("em dash")));
      assert.ok(result.errors.some((error) => error.includes("two hashtags")));
    }
    assert.equal(hashtagCount("#One copy #Two\n#Three"), 3);
  });

  it("requires public HTTPS media and link URLs", () => {
    const photo = validateSocialPostInput({
      message: "Proof, not promises.",
      media_type: "photo",
      media_url: "http://example.com/image.jpg",
    });
    const link = validateSocialPostInput({
      message: "Pick your lane.",
      media_type: "link",
      link_url: "javascript:alert(1)",
    });
    assert.equal(photo.ok, false);
    assert.equal(link.ok, false);
  });
});

describe("Meta scheduling window", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");

  it("publishes immediately when no time is supplied", () => {
    assert.deepEqual(validateMetaSchedule(null, now), { mode: "publish" });
  });

  it("accepts schedules from 10 minutes through 75 days", () => {
    const result = validateMetaSchedule("2026-08-18T12:10:00.000Z", now);
    assert.equal(result.mode, "schedule");
    assert.equal(result.error, undefined);
    assert.equal(result.unixTime, 1787055000);
  });

  it("rejects schedules outside Meta's window", () => {
    assert.match(
      validateMetaSchedule("2026-08-18T12:09:59.000Z", now).error || "",
      /at least 10 minutes/,
    );
    assert.match(
      validateMetaSchedule("2026-11-02T12:00:01.000Z", now).error || "",
      /up to 75 days/,
    );
  });
});

describe("Meta publish request construction", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");

  it("builds a scheduled photo payload without credentials", () => {
    const request = buildFacebookPublishRequest({
      pageId: "123",
      message: "The post gets attention. The system makes money.",
      mediaType: "photo",
      mediaUrl: "https://cdn.example.com/proof.jpg",
      scheduledFor: "2026-08-18T13:00:00.000Z",
      now,
    });
    assert.equal(request.endpoint, "photos");
    assert.equal(request.mode, "schedule");
    assert.equal(request.params.get("url"), "https://cdn.example.com/proof.jpg");
    assert.equal(request.params.get("published"), "false");
    assert.equal(request.params.get("unpublished_content_type"), "SCHEDULED");
    assert.equal(request.params.has("access_token"), false);
  });

  it("builds an immediate link post", () => {
    const request = buildFacebookPublishRequest({
      pageId: "123",
      message: "Go to TheLeadFlowPro.com and pick your lane.",
      mediaType: "link",
      linkUrl: "https://www.theleadflowpro.com/",
      now,
    });
    assert.equal(request.endpoint, "feed");
    assert.equal(request.mode, "publish");
    assert.equal(request.params.get("link"), "https://www.theleadflowpro.com/");
    assert.equal(request.params.get("published"), "true");
  });

  it("validates the configured daily slots", () => {
    assert.equal(validDailySlots(["07:15", "10:30", "19:45"]), true);
    assert.equal(validDailySlots(["25:00"]), false);
    assert.equal(validDailySlots([]), false);
  });
});
