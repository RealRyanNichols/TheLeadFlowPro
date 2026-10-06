import assert from "node:assert/strict";
import test from "node:test";
import { metaAdsReadToken, metaReportingPageToken } from "../lib/metaReporting";

const pageId = "887023637835514";
const input = { credential: "private-system-token", pageId, graphVersion: "v26.0" };

test("reporting requires its dedicated credential and never falls back to lead access", () => {
  assert.equal(metaAdsReadToken({ META_PAGE_ACCESS_TOKEN: "lead-token" }), "");
  assert.equal(metaAdsReadToken({ META_ADS_READ_TOKEN: " report-token " }), "report-token");
});

test("Page inventory derives a Page token with Bearer auth and a token-free URL", async () => {
  let observedUrl = "";
  let observedInit: RequestInit | undefined;
  const token = await metaReportingPageToken({ ...input, fetcher: (async (url, init) => {
    observedUrl = String(url); observedInit = init;
    return Response.json({ id: pageId, access_token: "derived-page-token" });
  }) as typeof fetch });
  assert.equal(token, "derived-page-token");
  assert.equal(observedInit?.method, "GET");
  assert.equal(new Headers(observedInit?.headers).get("Authorization"), "Bearer private-system-token");
  assert.equal(observedUrl.includes(input.credential), false);
  assert.equal(new URL(observedUrl).searchParams.get("fields"), "id,access_token");
});

test("an existing Page credential can be retained after exact identity validation", async () => {
  assert.equal(await metaReportingPageToken({ ...input, fetcher: (async () => Response.json({ id: pageId })) as typeof fetch }), input.credential);
});

test("Page identity mismatch and missing credential fail closed", async () => {
  await assert.rejects(metaReportingPageToken({ ...input, credential: "" }), /not configured/);
  await assert.rejects(metaReportingPageToken({ ...input, fetcher: (async () => Response.json({ id: "foreign-page", access_token: "foreign-secret" })) as typeof fetch }), /different Page/);
});

test("provider failures expose status/code without raw provider secrets", async () => {
  await assert.rejects(metaReportingPageToken({ ...input, fetcher: (async () => Response.json({ error: { code: 190, message: "private-system-token" } }, { status: 400 })) as typeof fetch }), (error: Error) => {
    assert.match(error.message, /HTTP 400, code 190/);
    assert.equal(error.message.includes(input.credential), false);
    return true;
  });
});
