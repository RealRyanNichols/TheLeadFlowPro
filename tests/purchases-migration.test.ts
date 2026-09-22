import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const MIGRATIONS_DIR = new URL("../supabase/migrations/", import.meta.url);
const BASELINE_FILE = "20260831220000_purchases_baseline.sql";
const CASH_LEDGER_FILE = "20260831230000_operatoros_verified_cash_ledger.sql";

function readMigration(name: string): string {
  return readFileSync(new URL(name, MIGRATIONS_DIR), "utf8");
}

test("purchases baseline creates the live table shape idempotently", () => {
  const sql = readMigration(BASELINE_FILE).toLowerCase();

  assert.ok(sql.includes("create table if not exists public.purchases"));
  assert.ok(sql.includes("unique index if not exists purchases_stripe_session_id_key"));
  // The live index is named purchases_email_idx; "if not exists" matches on name, so the name must match.
  assert.ok(sql.includes("create index if not exists purchases_email_idx"));
  assert.ok(sql.includes("lower(email)"));
  assert.ok(sql.includes("drop default"));
  assert.ok(sql.includes("add column if not exists lead_id"));
  // The foreign key waits for public.leads, which no migration here creates.
  assert.ok(sql.includes("to_regclass('public.leads')"));
  assert.ok(!sql.includes("comment on table"), "a table comment would be a third undocumented change on the live table");
});

test("purchases baseline sorts before the cash ledger trigger migration", () => {
  const files = readdirSync(MIGRATIONS_DIR).sort();
  const baselineIndex = files.indexOf(BASELINE_FILE);
  const ledgerIndex = files.indexOf(CASH_LEDGER_FILE);

  assert.ok(baselineIndex >= 0, `${BASELINE_FILE} missing from migrations directory`);
  assert.ok(ledgerIndex >= 0, `${CASH_LEDGER_FILE} missing from migrations directory`);
  assert.ok(
    baselineIndex < ledgerIndex,
    "purchases baseline must run before the migration that attaches a trigger to purchases",
  );
});

test("every create statement in the purchases baseline is guarded", () => {
  const sql = readMigration(BASELINE_FILE);
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((statement) => statement.trim().toLowerCase())
    .filter((statement) => statement.length > 0);
  const createStatements = statements.filter((statement) => statement.startsWith("create "));

  assert.ok(createStatements.length > 0, "expected at least one create statement");
  for (const statement of createStatements) {
    assert.ok(
      statement.includes("if not exists"),
      `create statement is not idempotent: ${statement.slice(0, 80)}`,
    );
  }
});

test("purchases baseline does not change row level security", () => {
  const sql = readMigration(BASELINE_FILE).toLowerCase();
  assert.ok(!sql.includes("enable row level security"));
});
