import assert from "node:assert/strict";
import test from "node:test";
import { metaAdsReadToken, metaReportingPageToken, metaReportingAccount } from "../lib/metaReporting";

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

const reportingInput = { credential: "private-report-token", appId: "1595903401874517", accountId: "1637329904238602", graphVersion: "v26.0" };

test("reporting verifies its app then exact account using only read metadata", async () => {
  const requests: URL[] = [];
  const account = await metaReportingAccount({ ...reportingInput, fetcher: (async (url, init) => {
    const request = new URL(String(url)); requests.push(request);
    assert.equal(init?.method, "GET");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${reportingInput.credential}`);
    assert.equal(String(url).includes(reportingInput.credential), false);
    assert.equal(request.searchParams.get("fields")?.split(",").includes("business"), false);
    return Response.json(request.pathname.endsWith("/app")
      ? { id: reportingInput.appId }
      : { id: `act_${reportingInput.accountId}`, account_id: reportingInput.accountId });
  }) as typeof fetch });
  assert.equal(account.account_id, reportingInput.accountId);
  assert.deepEqual(requests.map(url => url.pathname), ["/v26.0/app", `/v26.0/act_${reportingInput.accountId}`]);
});

test("a different app is rejected before any account metadata is requested", async () => {
  let requests = 0;
  await assert.rejects(metaReportingAccount({ ...reportingInput, fetcher: (async () => {
    requests += 1; return Response.json({ id: "foreign-app" });
  }) as typeof fetch }), /different app/);
  assert.equal(requests, 1);
});

test("reporting rejects either foreign account identity field", async () => {
  for (const account of [
    { id: "act_foreign", account_id: reportingInput.accountId },
    { id: `act_${reportingInput.accountId}`, account_id: "foreign" },
  ]) {
    await assert.rejects(metaReportingAccount({ ...reportingInput, fetcher: (async (url) => Response.json(String(url).includes("/app?") ? { id: reportingInput.appId } : account)) as typeof fetch }), /different ad account/);
  }
});

test("reporting fails closed on provider errors without exposing token text", async () => {
  await assert.rejects(metaReportingAccount({ ...reportingInput, fetcher: (async () => Response.json({ error: { code: 190, message: reportingInput.credential } }, { status: 400 })) as typeof fetch }), (error: Error) => {
    assert.match(error.message, /HTTP 400, code 190/);
    assert.equal(error.message.includes(reportingInput.credential), false);
    return true;
  });
});
