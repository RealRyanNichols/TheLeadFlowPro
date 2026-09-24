// The Post Creator migration, read as source text.
//
// Applying it is Ryan's action (docs/decisions-needed.md item 85), so nothing
// here talks to a database. These checks pin what must be true of the file
// before it is applied: service role only, every function locked to a fixed
// search path with its execute privilege taken back from the browser roles,
// the write-once guards, one lock for reserve and settle, and the order of the
// reserve checks that keeps a replayed or blocked request from spending money.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, test } from "node:test";

const MIGRATIONS_DIR = new URL("../supabase/migrations/", import.meta.url);
const FILE = "20260924150000_post_creator.sql";
const PREVIOUS = "20260923233307";

const sql = readFileSync(new URL(FILE, MIGRATIONS_DIR), "utf8");
const lower = sql.toLowerCase();
/** The SQL without its comment lines, so the rollback notes never satisfy a check. */
const code = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .toLowerCase();

const TABLES = ["post_creator_accounts", "post_creator_generations", "post_creator_spend_daily", "post_creator_rate_limits"];
const RPCS = ["post_creator_record_purchase", "post_creator_reserve", "post_creator_settle", "post_creator_usage", "post_creator_hit"];
const TRIGGER_FN = "post_creator_accounts_guard";

type Fn = { name: string; header: string; body: string; argTypes: string };

/** Each function: its header (up to the body), its body, and its argument types as a revoke or grant names them. */
function functions(): Fn[] {
  const out: Fn[] = [];
  const re = /create or replace function public\.(\w+)\(([\s\S]*?)\)\s*(returns[\s\S]*?)\$\$([\s\S]*?)\$\$;/g;
  for (const m of code.matchAll(re)) {
    const args = m[2].trim();
    const argTypes = args
      ? args
          .split(",")
          .map((a) => a.trim().split(/\s+/)[1])
          .join(", ")
      : "";
    out.push({ name: m[1], header: m[3], body: m[4], argTypes });
  }
  return out;
}

function fn(name: string): Fn {
  const found = functions().find((f) => f.name === name);
  assert.ok(found, `${name} is defined`);
  return found;
}

describe("the Post Creator migration", () => {
  test("sorts after the newest migration it was written against", () => {
    const files = readdirSync(MIGRATIONS_DIR).sort();
    const previous = files.find((f) => f.startsWith(PREVIOUS));
    assert.ok(previous, `${PREVIOUS} is in the migrations directory`);
    assert.ok(files.indexOf(FILE) > files.indexOf(previous));
    assert.match(FILE, /^\d{14}_[a-z_]+\.sql$/);
  });

  test("four tables, each service role only: RLS on, no policy, every privilege revoked from the browser roles", () => {
    const created = [...code.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
    assert.deepEqual(created, TABLES);
    for (const table of TABLES) {
      assert.ok(code.includes(`alter table public.${table} enable row level security;`), `${table} enables RLS`);
    }
    assert.ok(!code.includes("create policy"), "no policy: the service role is the only way in");
    const revoke = /revoke all on table ([^;]*?) from anon, authenticated;/.exec(code);
    assert.ok(revoke, "one revoke from anon and authenticated");
    const grant = /grant select, insert, update, delete on table ([^;]*?) to service_role;/.exec(code);
    assert.ok(grant, "the service role keeps table access");
    for (const table of TABLES) {
      assert.ok(revoke[1].includes(`public.${table}`), `${table} is revoked`);
      assert.ok(grant[1].includes(`public.${table}`), `${table} is granted to service_role`);
    }
  });

  test("every create is safe to run twice", () => {
    const statements = code.split(";").map((s) => s.trim()).filter(Boolean);
    for (const s of statements.filter((x) => x.startsWith("create "))) {
      assert.ok(
        s.startsWith("create table if not exists") || s.startsWith("create index if not exists") || s.startsWith("create or replace function") || s.startsWith("create trigger"),
        `not idempotent: ${s.slice(0, 80)}`,
      );
    }
    assert.ok(code.indexOf(`drop trigger if exists ${TRIGGER_FN}`) < code.indexOf(`create trigger ${TRIGGER_FN}`));
  });

  test("every function has a fixed search path; the five RPCs are security definer and callable by service_role only", () => {
    const names = functions().map((f) => f.name);
    assert.deepEqual([...names].sort(), [...RPCS, TRIGGER_FN].sort());
    for (const name of RPCS) {
      const f = fn(name);
      assert.match(f.header, /security definer set search_path = public, pg_temp as $/, `${name} header`);
      assert.ok(code.includes(`revoke all on function public.${name}(${f.argTypes}) from public, anon, authenticated;`), `${name}(${f.argTypes}) is revoked`);
      assert.ok(code.includes(`grant execute on function public.${name}(${f.argTypes}) to service_role;`), `${name}(${f.argTypes}) is granted`);
      assert.ok(lower.includes(`--   drop function if exists public.${name}(${f.argTypes});`), `${name} is in the rollback notes`);
    }
    const guard = fn(TRIGGER_FN);
    assert.match(guard.header, /set search_path = public, pg_temp as $/);
    assert.ok(!guard.header.includes("security definer"), "the trigger runs as the caller");
    assert.ok(code.includes(`revoke all on function public.${TRIGGER_FN}() from public, anon, authenticated;`));
  });

  test("the guard trigger keeps the claim fields write-once and the epoch rising", () => {
    const guard = fn(TRIGGER_FN).body;
    assert.ok(guard.includes("first_session_id is write-once"));
    assert.ok(guard.includes("first_claimed_at is write-once"));
    assert.ok(guard.includes("access_epoch only goes up"));
    assert.ok(guard.includes("old.first_claimed_at is not null"), "null to a value is the one change allowed");
    assert.ok(code.includes(`create trigger ${TRIGGER_FN} before update on public.post_creator_accounts`));
  });

  test("the session id check matches the claim route's and allows the manual comp id", () => {
    const m = /first_session_id ~ '([^']+)'/.exec(sql);
    assert.ok(m);
    const re = new RegExp(m[1]);
    assert.ok(re.test("cs_test_abcdefghijkl"));
    assert.ok(re.test("manual:comp"));
    assert.ok(!re.test("cs_short"));
    assert.ok(!re.test("manual:Comp With Spaces"));
    assert.ok(sql.includes("p_session_id !~ '^cs_[A-Za-z0-9_]{8,200}$'"), "record_purchase takes only a real checkout id");
  });

  test("a later checkout bumps the epoch and never rewrites the claim fields", () => {
    const body = fn("post_creator_record_purchase").body;
    const update = body.slice(body.indexOf("update public.post_creator_accounts set"));
    assert.ok(update.includes("access_epoch = access_epoch + 1"));
    assert.ok(!/first_session_id\s*=/.test(update.split("where")[0]), "first_session_id is not in the update");
    assert.ok(!update.includes("first_claimed_at"));
    assert.ok(body.includes("'created_by_this_session', v_row.first_session_id = p_session_id"));
    assert.ok(body.includes("on conflict (email) do nothing"));
  });

  test("reserve and settle share one lock", () => {
    assert.ok(fn("post_creator_reserve").body.includes("pg_advisory_xact_lock(hashtext('post_creator_ai'))"));
    assert.ok(fn("post_creator_settle").body.includes("pg_advisory_xact_lock(hashtext('post_creator_ai'))"));
  });

  test("reserve checks a replay, then a write in flight, then the counts, and the spend cap before it inserts", () => {
    const body = fn("post_creator_reserve").body;
    const at = (s: string) => {
      const i = body.indexOf(s);
      assert.ok(i >= 0, `reserve contains ${s}`);
      return i;
    };
    assert.ok(at("'duplicate'") < at("'busy'"));
    assert.ok(at("'busy'") < at("count(*) filter"));
    assert.ok(at("'monthly_limit'") < at("'spend_cap'"));
    assert.ok(at("'account_cost_limit'") < at("'spend_cap'"));
    assert.ok(at("'spend_cap'") < at("insert into public.post_creator_generations"));
    assert.ok(at("interval '5 minutes'") < at("'no_account'"), "stale reservations expire before anything is counted");
  });

  test("days and months are America/Chicago in the database too", () => {
    assert.ok(fn("post_creator_reserve").body.includes("at time zone 'america/chicago'"));
    assert.ok(fn("post_creator_usage").body.includes("at time zone 'america/chicago'"));
    assert.ok(sql.includes("America/Chicago"));
  });

  test("the file is plain ASCII", () => {
    assert.ok(!/[^\x00-\x7F]/.test(sql));
  });
});
