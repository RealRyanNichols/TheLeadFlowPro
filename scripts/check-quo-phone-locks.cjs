#!/usr/bin/env node
// Read-only verification of the exact advisory-lock primitive used by Quo ingestion.
// Never invokes the ingestion functions or reads/writes customer rows.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { Client } = require("/opt/brain/node_modules/pg");
const { readProtectedEnv } = require("/usr/local/libexec/leadflow-meta/meta-ops.cjs");

const env = readProtectedEnv();
const url = new URL(env.DATABASE_URL);
const project = "hpzpwfymwfgwspaixrxi";
if (url.hostname !== `db.${project}.supabase.co` && !decodeURIComponent(url.username).endsWith(`.${project}`)) {
  throw new Error("Quo lock test refused an unverified database identity");
}
if (["sslmode", "sslcert", "sslkey", "sslrootcert"].some((name) => url.searchParams.has(name))) {
  throw new Error("Connection URL must not override strict TLS settings");
}
const options = {
  connectionString: url.toString(),
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: true, ca: fs.readFileSync("/opt/leadflow-release-tools/supabase-prod-ca-2021.crt", "utf8") },
};
const clients = [new Client(options), new Client(options), new Client(options)];
const [first, second, observer] = clients;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function check() {
  await Promise.all(clients.map((client) => client.connect()));
  for (const client of clients) {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '10s'");
  }
  const [{ rows: firstPid }, { rows: secondPid }] = await Promise.all([
    first.query("SELECT pg_backend_pid() AS pid"),
    second.query("SELECT pg_backend_pid() AS pid"),
  ]);
  // Non-phone randomized keys cannot hold the lock of a real caller.
  const key = `leadflow-quo-phone:concurrency-test:${randomUUID()}`;
  const acquire = "SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1, 0))";
  const tryAcquire = "SELECT pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended($1, 0)) AS acquired";
  await first.query(acquire, [key]);
  assert.equal((await second.query(tryAcquire, [key])).rows[0].acquired, false,
    "same-phone work must wait for the first transaction");
  assert.equal((await observer.query(tryAcquire, [`${key}:another-phone`])).rows[0].acquired, true,
    "unrelated phone work must remain independent");

  let waitingError;
  const waiting = second.query(acquire, [key]).catch((error) => { waitingError = error; });
  let observedBlocked = false;
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && !observedBlocked && !waitingError) {
    const { rows } = await observer.query("SELECT $1::integer = ANY(pg_blocking_pids($2::integer)) AS blocked", [firstPid[0].pid, secondPid[0].pid]);
    observedBlocked = rows[0].blocked;
    if (!observedBlocked) await pause(50);
  }
  assert.equal(observedBlocked, true, "the second transaction must actually queue behind the first");
  await first.query("COMMIT");
  await waiting;
  if (waitingError) throw waitingError;
  await second.query("ROLLBACK");
  await observer.query("ROLLBACK");

  await first.query("BEGIN READ ONLY");
  assert.equal((await first.query(tryAcquire, [key])).rows[0].acquired, true,
    "commit and rollback must release transaction locks");
  await first.query("ROLLBACK");
  console.log(JSON.stringify({
    strictTLS: true,
    readOnly: true,
    customerRowsReadOrWritten: false,
    ingestionFunctionsInvoked: false,
    sameKeySerialized: true,
    differentKeyIndependent: true,
    commitAndRollbackRelease: true,
  }));
}

check().catch((error) => {
  console.error(JSON.stringify({ ok: false, errorType: error.name, code: error.code || null }));
  process.exitCode = 1;
}).finally(async () => {
  await Promise.all(clients.map(async (client) => {
    await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
  }));
});
