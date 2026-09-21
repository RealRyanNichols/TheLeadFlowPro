import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "app/api/cron/digest/route.ts"), "utf8");

describe("weekly digest cron route", () => {
  it("fails closed when CRON_SECRET is missing", () => {
    assert.match(source, /if \(!cronSecret/);
  });

  it("only counts paid purchases", () => {
    assert.ok(source.includes('.eq("status", "paid")'));
  });

  it("reads paid invoices and plugin workspaces alongside purchases", () => {
    assert.ok(source.includes('from("sales_invoices")'));
    assert.ok(source.includes('from("hq_workspaces")'));
  });

  it("surfaces a rejected send as a failed cron run", () => {
    assert.ok(!source.includes(".catch(() => {})"));
    assert.ok(source.includes("status: 500"));
    assert.ok(source.includes("digest_send_rejected"));
  });

  it("uses no em dashes in the email text", () => {
    assert.ok(!source.includes("—"));
  });
});
