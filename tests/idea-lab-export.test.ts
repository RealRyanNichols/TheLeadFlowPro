import assert from "node:assert/strict";
import test from "node:test";
import { exportIdeaBrief } from "../lib/ideaLabExport.ts";
import { ideaLabSameOrigin } from "../lib/ideaLabHttp.ts";
import { defaultIdeaBrief } from "../lib/ideaLabWorkspace.ts";

test("same-origin guard supports normalized Next URLs but rejects cross-site writes", () => {
  const request = (origin: string) =>
    new Request("http://localhost:3217/export", {
      headers: { host: "127.0.0.1:3217", origin },
    });
  assert.equal(ideaLabSameOrigin(request("http://127.0.0.1:3217")), true);
  for (const origin of [
    "https://evil.example",
    "http://127.0.0.1:1234",
    "null",
    "http://user:secret@127.0.0.1:3217",
  ])
    assert.equal(ideaLabSameOrigin(request(origin)), false);
  assert.equal(
    ideaLabSameOrigin(new Request("http://localhost/export")),
    false,
  );
});
test("export produces a downloadable private Markdown file with the edited brief", async () => {
  const form = new FormData();
  form.set(
    "brief",
    JSON.stringify({
      ...defaultIdeaBrief("concierge"),
      buyer: "Edited owner task",
    }),
  );
  const response = await exportIdeaBrief(
    new Request("http://localhost:3217/export", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3217", host: "127.0.0.1:3217" },
      body: form,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(
    response.headers.get("content-disposition")!,
    /attachment; filename="leadflow-concierge-brief.md"/,
  );
  assert.match(await response.text(), /Edited owner task/);
});
test("export rejects malformed, oversized, and cross-origin requests", async () => {
  for (const [value, origin, status] of [
    ["{}", "http://localhost", 400],
    ["x".repeat(30001), "http://localhost", 400],
    [
      JSON.stringify(defaultIdeaBrief("concierge")),
      "https://evil.example",
      403,
    ],
  ] as const) {
    const form = new FormData();
    form.set("brief", value);
    assert.equal(
      (
        await exportIdeaBrief(
          new Request("http://localhost/export", {
            method: "POST",
            headers: { origin },
            body: form,
          }),
        )
      ).status,
      status,
    );
  }
});

test("export accepts allowed Unicode brief text after form encoding", async () => {
  const brief = {
    ...defaultIdeaBrief("concierge"),
    buyer: "界".repeat(6000),
    outcome: "界".repeat(6000),
    scope: "界".repeat(6000),
    acceptance: "界".repeat(6000),
  };
  const body = new URLSearchParams({ brief: JSON.stringify(brief) }).toString();
  assert.ok(body.length > 50_000);
  const response = await exportIdeaBrief(
    new Request("http://localhost/export", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/x-www-form-urlencoded",
        "content-length": String(body.length),
      },
      body,
    }),
  );
  assert.equal(response.status, 200);
});
