import test from "node:test";
import assert from "node:assert/strict";
import {
  deliverContactNotification,
  type ContactNotification,
  type ContactNotificationStore,
} from "../lib/contactNotifications.ts";

const start = Date.parse("2026-09-06T22:00:00Z");
function fixture() {
  let time = start;
  let row: ContactNotification & Record<string, unknown> = {
    message_id: "c3df10ad-3437-4c8a-ad24-78d7248ae196",
    snapshot: {
      visitor_name: "QA visitor",
      visitor_email: "qa@example.com",
      body: "Test contact. Phone: +12025550109",
    },
    email_payload: null,
    status: "pending",
    attempt_count: 0,
    created_at: new Date(start).toISOString(),
    next_attempt_at: new Date(start).toISOString(),
  };
  const store: ContactNotificationStore = {
    get: async () => structuredClone(row),
    claim: async (old, payload, now) => {
      if (
        row.status !== "pending" ||
        old.attempt_count !== row.attempt_count ||
        Date.parse(row.next_attempt_at) > +now
      )
        return null;
      row = {
        ...row,
        attempt_count: row.attempt_count + 1,
        email_payload: structuredClone(payload),
        next_attempt_at: new Date(+now + 300_000).toISOString(),
      };
      return structuredClone(row);
    },
    finish: async (old, values) => {
      assert.equal(old.attempt_count, row.attempt_count);
      assert.equal(row.status, "pending");
      row = { ...row, ...values } as typeof row;
    },
    pending: async () => [structuredClone(row)],
  };
  return {
    store,
    now: () => new Date(time),
    advance: (ms: number) => {
      time += ms;
    },
    row: () => row,
  };
}

test("provider rejection keeps the message alert for retry; later acceptance marks sent", async () => {
  const f = fixture();
  const headers: Headers[] = [];
  const bodies: unknown[] = [];
  let attempts = 0;
  const send: typeof fetch = async (_url, options) => {
    headers.push(new Headers(options?.headers));
    bodies.push(JSON.parse(String(options?.body)));
    return ++attempts === 1
      ? new Response('{"message":"private provider detail"}', { status: 429 })
      : Response.json({ id: "accepted-message-id" });
  };
  const run = () =>
    deliverContactNotification(f.store, f.row().message_id, {
      now: f.now,
      send,
      apiKey: "test",
    });
  assert.equal(await run(), "pending");
  assert.equal(
    f.row().last_error,
    "Email provider rejected the alert (HTTP 429)",
  );
  assert.equal(await run(), "claimed");
  f.advance(60_000);
  assert.equal(await run(), "sent");
  assert.equal(await run(), "sent");
  assert.equal(attempts, 2);
  assert.equal(
    headers[0].get("Idempotency-Key"),
    headers[1].get("Idempotency-Key"),
  );
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(f.row().provider_message_id, "accepted-message-id");
});

test("concurrent workers produce one provider request", async () => {
  const f = fixture();
  let calls = 0;
  const send: typeof fetch = async () => {
    calls++;
    return Response.json({ id: "one" });
  };
  const runs = await Promise.all(
    Array.from({ length: 8 }, () =>
      deliverContactNotification(f.store, f.row().message_id, {
        now: f.now,
        send,
        apiKey: "test",
      }),
    ),
  );
  assert.equal(calls, 1);
  assert.equal(runs.filter((r) => r === "sent").length, 1);
});

test("a concurrent worker respects the seventh attempt while its provider request is in flight", async () => {
  const f = fixture();
  f.row().attempt_count = 6;
  let accepted!: () => void;
  let started!: () => void;
  const inFlight = new Promise<void>((resolve) => {
    started = resolve;
  });
  const release = new Promise<void>((resolve) => {
    accepted = resolve;
  });
  const send: typeof fetch = async () => {
    started();
    await release;
    return Response.json({ id: "final-attempt-accepted" });
  };
  const first = deliverContactNotification(f.store, f.row().message_id, {
    now: f.now,
    send,
    apiKey: "test",
  });
  await inFlight;
  assert.equal(f.row().attempt_count, 7);
  assert.equal(
    await deliverContactNotification(f.store, f.row().message_id, {
      now: f.now,
      send,
      apiKey: "test",
    }),
    "claimed",
  );
  assert.equal(f.row().status, "pending");
  accepted();
  assert.equal(await first, "sent");
  assert.equal(f.row().provider_message_id, "final-attempt-accepted");
});

test("an accepted email with a lost database write is retried with the same payload and key", async () => {
  const f = fixture();
  const finish = f.store.finish;
  let failedWrite = false;
  f.store.finish = async (row, values) => {
    if (!failedWrite) {
      failedWrite = true;
      throw new Error("database disconnected");
    }
    return finish(row, values);
  };
  const requests: string[] = [];
  const send: typeof fetch = async (_url, options) => {
    requests.push(
      new Headers(options?.headers).get("Idempotency-Key") +
        String(options?.body),
    );
    return Response.json({ id: "same-provider-id" });
  };
  const run = () =>
    deliverContactNotification(f.store, f.row().message_id, {
      now: f.now,
      send,
      apiKey: "test",
    });
  await assert.rejects(run, /could|disconnect/);
  assert.equal(f.row().status, "pending");
  f.advance(300_000);
  assert.equal(await run(), "sent");
  assert.equal(requests[0], requests[1]);
});

test("missing configuration, malformed acceptance and network failures never claim delivery", async () => {
  for (const send of [
    async () => Response.json({ unexpected: true }),
    async () => {
      throw new Error("customer@example.com secret-token");
    },
  ] as Array<typeof fetch>) {
    const f = fixture();
    assert.equal(
      await deliverContactNotification(f.store, f.row().message_id, {
        now: f.now,
        send,
        apiKey: "test",
      }),
      "pending",
    );
    assert.doesNotMatch(String(f.row().last_error), /customer|secret-token/);
  }
  const f = fixture();
  let called = false;
  assert.equal(
    await deliverContactNotification(f.store, f.row().message_id, {
      now: f.now,
      apiKey: "",
      send: async () => {
        called = true;
        return Response.json({ id: "bad" });
      },
    }),
    "pending",
  );
  assert.equal(called, false);
});

test("old ambiguous deliveries require manual review instead of sending duplicate email", async () => {
  const f = fixture();
  f.advance(23 * 60 * 60_000);
  let called = false;
  assert.equal(
    await deliverContactNotification(f.store, f.row().message_id, {
      now: f.now,
      apiKey: "test",
      send: async () => {
        called = true;
        return Response.json({ id: "bad" });
      },
    }),
    "failed",
  );
  assert.equal(called, false);
});
