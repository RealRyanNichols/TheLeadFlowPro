// The plan stays right even when Stripe's subscription webhooks were never
// registered: the pulse asks Stripe directly when a trial clock runs out
// and once a day after that. These run against a fake database client and
// a stubbed Stripe, so no network and no Supabase.

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { syncWorkspaceFromStripe } from "../lib/hq/subscription.ts";
import { runPulseForAll } from "../lib/hq/pulse.ts";
import type { Db } from "../lib/hq/server.ts";
import { NOW, workspace } from "./fixtures/hq.ts";

type Row = Record<string, unknown>;

/** Enough of the Supabase client for workspace reads, updates, and event inserts. */
function fakeDb(rows: Row[]) {
  const updates: Row[] = [];
  const events: Row[] = [];
  const client = {
    from(table: string) {
      if (table === "hq_workspaces") {
        return {
          select() {
            return { in: () => ({ limit: async () => ({ data: rows.map((r) => ({ ...r })), error: null }) }) };
          },
          update(patch: Row) {
            return {
              eq(_col: string, id: string) {
                const row = rows.find((r) => r.id === id);
                if (row) Object.assign(row, patch);
                updates.push({ id, ...patch });
                return { select: () => ({ single: async () => ({ data: row ? { ...row } : null, error: row ? null : { message: "missing" } }) }) };
              },
            };
          },
        };
      }
      if (table === "hq_events") {
        return { insert: async (event: Row) => ({ error: events.some((e) => e.dedupe_key && e.dedupe_key === event.dedupe_key) ? { code: "23505" } : (events.push(event), null) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return { client: client as unknown as Db, updates, events };
}

const realFetch = globalThis.fetch;
const calls: string[] = [];
function stripeSays(status: number, body: unknown) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}
after(() => {
  globalThis.fetch = realFetch;
});

const row = (over: Row = {}): Row => ({
  id: "ws-1",
  slug: "kirby-plumbing",
  name: "Kirby Plumbing",
  owner_id: "user-1",
  email: "dan@kirbyplumbing.com",
  plan: "trial",
  trial_ends_at: new Date(NOW.getTime() - 3_600_000).toISOString(),
  trial_used_at: "2026-08-31T00:00:00Z",
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  stripe_event_at: 0,
  settings: {},
  ...over,
});

describe("syncWorkspaceFromStripe", () => {
  test("does nothing without a key or a subscription on file", async () => {
    calls.length = 0;
    stripeSays(200, { status: "active" });
    const { client, updates } = fakeDb([row()]);
    assert.equal(await syncWorkspaceFromStripe(client, workspace({ stripe_subscription_id: "sub_1" }), undefined, NOW), null);
    assert.equal(await syncWorkspaceFromStripe(client, workspace({ stripe_subscription_id: null }), "sk_test", NOW), null);
    assert.equal(calls.length, 0);
    assert.equal(updates.length, 0);
  });

  test("takes Stripe's answer and records the change once", async () => {
    calls.length = 0;
    stripeSays(200, { id: "sub_1", customer: "cus_1", status: "active", current_period_end: 1_800_000_000 });
    const { client, updates, events } = fakeDb([row()]);
    const ws = workspace({ plan: "trial", stripe_subscription_id: "sub_1", trial_used_at: "2026-08-31T00:00:00Z", stripe_event_at: 0 });
    const synced = await syncWorkspaceFromStripe(client, ws, "sk_test", NOW);
    assert.equal(synced?.plan, "active");
    assert.match(calls[0], /\/v1\/subscriptions\/sub_1$/);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].plan, "active");
    assert.equal(updates[0].current_period_end, new Date(1_800_000_000 * 1000).toISOString());
    assert.equal(updates[0].stripe_event_at, Math.floor(NOW.getTime() / 1000));
    assert.equal(updates[0].trial_used_at, "2026-08-31T00:00:00Z", "a used trial stays used");
    assert.equal(events.length, 1);
    assert.match(String(events[0].detail), /Plan is now active/);

    // Same answer again: the plan did not change, so nothing new is written to the timeline.
    const again = await syncWorkspaceFromStripe(client, { ...ws, plan: "active" }, "sk_test", NOW);
    assert.equal(again?.plan, "active");
    assert.equal(events.length, 1);
  });

  test("a failed call changes nothing", async () => {
    stripeSays(500, { error: { message: "down" } });
    const { client, updates, events } = fakeDb([row()]);
    assert.equal(await syncWorkspaceFromStripe(client, workspace({ stripe_subscription_id: "sub_1" }), "sk_test", NOW), null);
    assert.equal(updates.length, 0);
    assert.equal(events.length, 0);
  });
});

describe("trial expiry in the pulse", () => {
  const key = process.env.STRIPE_SECRET_KEY;
  after(() => {
    if (key === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = key;
  });

  test("a trial Stripe already charged for goes on as active", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    stripeSays(200, { id: "sub_1", customer: "cus_1", status: "active", current_period_end: 1_800_000_000 });
    const rows = [row()];
    const { client, updates, events } = fakeDb(rows);
    // The plan is set right here; the engine itself picks the workspace up
    // on the next pulse, so nothing else runs for it this time.
    const out = await runPulseForAll(client, NOW);
    assert.equal(rows[0].plan, "active");
    assert.equal(updates.length, 1);
    assert.equal(events.some((e) => e.dedupe_key === "trial:ended"), false);
    assert.match(String(events[0]?.detail), /Plan is now active/);
    assert.equal(out.length, 0);
  });

  test("a trial Stripe could not be asked about waits for the next pulse", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    stripeSays(503, {});
    const rows = [row()];
    const { client, updates, events } = fakeDb(rows);
    await runPulseForAll(client, NOW);
    assert.equal(rows[0].plan, "trial");
    assert.equal(updates.length, 0);
    assert.equal(events.length, 0);
  });

  test("a trial Stripe says is canceled ends, with the note written once", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    stripeSays(200, { id: "sub_1", customer: "cus_1", status: "canceled" });
    const rows = [row()];
    const { client, events } = fakeDb(rows);
    await runPulseForAll(client, NOW);
    await runPulseForAll(client, NOW);
    assert.equal(rows[0].plan, "canceled");
    assert.equal(events.filter((e) => e.dedupe_key === "trial:ended").length, 1);
  });

  test("a trial with no Stripe subscription ends on the clock", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const rows = [row({ stripe_subscription_id: null, stripe_customer_id: null })];
    const { client, updates, events } = fakeDb(rows);
    await runPulseForAll(client, NOW);
    assert.equal(rows[0].plan, "canceled");
    assert.equal(updates.length, 1);
    assert.equal(events.filter((e) => e.dedupe_key === "trial:ended").length, 1);
  });
});
