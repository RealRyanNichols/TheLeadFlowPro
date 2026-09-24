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

const TABLES = ["post_creator_accounts", "post_creator_checkouts", "post_creator_generations", "post_creator_spend_daily", "post_creator_rate_limits"];
const RPCS = ["post_creator_record_purchase", "post_creator_reserve", "post_creator_settle", "post_creator_usage", "post_creator_hit"];
const TRIGGER_FN = "post_creator_accounts_guard";
const RELEASE_FN = "post_creator_generations_release";
const EPOCH_SEQ = "post_creator_access_epoch_seq";

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

  test("five tables, each service role only: RLS on, no policy, every privilege revoked from the browser roles", () => {
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
        s.startsWith("create table if not exists") ||
          s.startsWith("create index if not exists") ||
          s.startsWith("create sequence if not exists") ||
          s.startsWith("create or replace function") ||
          s.startsWith("create trigger"),
        `not idempotent: ${s.slice(0, 80)}`,
      );
    }
    assert.ok(code.indexOf(`drop trigger if exists ${TRIGGER_FN}`) < code.indexOf(`create trigger ${TRIGGER_FN}`));
    assert.ok(code.indexOf(`drop trigger if exists ${RELEASE_FN}`) < code.indexOf(`create trigger ${RELEASE_FN}`));
  });

  test("every function has a fixed search path; the five RPCs are security definer and callable by service_role only", () => {
    const names = functions().map((f) => f.name);
    assert.deepEqual([...names].sort(), [...RPCS, TRIGGER_FN, RELEASE_FN].sort());
    const release = fn(RELEASE_FN);
    assert.match(release.header, /set search_path = public, pg_temp as $/);
    assert.ok(!release.header.includes("security definer"), "the release trigger runs as the caller");
    assert.ok(code.includes(`revoke all on function public.${RELEASE_FN}() from public, anon, authenticated;`));
    assert.ok(lower.includes(`--   drop function if exists public.${RELEASE_FN}();`));
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
    assert.ok(guard.includes("key_version only goes up"), "a revoked key can never be brought back");
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

  test("a later checkout gives a fresh epoch and never rewrites the claim fields", () => {
    const body = fn("post_creator_record_purchase").body;
    const update = body.slice(body.indexOf("update public.post_creator_accounts set"));
    assert.ok(update.includes(`access_epoch = nextval('public.${EPOCH_SEQ}')`));
    assert.ok(!/first_session_id\s*=/.test(update.split("where email")[0]), "first_session_id is not in the update");
    assert.ok(!update.includes("first_claimed_at"));
    assert.ok(body.includes("'created_by_this_session', v_row.first_session_id = p_session_id"));
    assert.ok(body.includes("on conflict (email) do nothing"));
  });

  test("an epoch never repeats: every value comes from one sequence the browser roles cannot touch", () => {
    assert.ok(code.indexOf(`create sequence if not exists public.${EPOCH_SEQ}`) < code.indexOf("create table if not exists public.post_creator_accounts"));
    assert.match(code, new RegExp(`access_epoch integer not null default nextval\\('public\\.${EPOCH_SEQ}'\\)`));
    assert.ok(!/access_epoch\s*=\s*access_epoch\s*\+/.test(code), "no epoch is ever computed by adding to an old one");
    assert.ok(code.includes(`revoke all on sequence public.${EPOCH_SEQ} from public, anon, authenticated;`));
    assert.ok(code.includes(`grant usage, select on sequence public.${EPOCH_SEQ} to service_role;`));
    assert.ok(lower.includes(`--   drop sequence if exists public.${EPOCH_SEQ};`));
  });

  test("each checkout is applied once, ever, before anything else is written", () => {
    const body = fn("post_creator_record_purchase").body;
    const ledger = body.indexOf("insert into public.post_creator_checkouts (session_id) values (p_session_id)");
    assert.ok(ledger > 0, "the ledger insert is there");
    assert.ok(ledger < body.indexOf("insert into public.post_creator_accounts"), "before the account is touched");
    assert.ok(body.includes("on conflict (session_id) do nothing"));
    assert.ok(body.includes("get diagnostics v_applied = row_count;"));
    const seen = body.slice(ledger, body.indexOf("insert into public.post_creator_accounts"));
    assert.ok(!seen.includes("update "), "a checkout applied before writes nothing");
    assert.ok(seen.includes("'account', null"), "and finds no account when it was deleted on request");
    assert.ok(!body.includes("last_session_id is distinct from p_session_id"), "no first-and-last-only guard is left");
    const table = /create table if not exists public\.post_creator_checkouts \(([\s\S]*?)\n\);/.exec(code);
    assert.ok(table, "the ledger table");
    assert.ok(!table[1].includes("email"), "the ledger holds no email");
    assert.ok(!table[1].includes("references"), "it outlives an account deleted on request");
  });

  test("the plan rules: an owned one payment plan never downgrades, a refunded one does, and a running monthly plan is named for the webhook to stop", () => {
    const body = fn("post_creator_record_purchase").body;
    assert.ok(body.includes("v_owns_lifetime := v_old.plan = 'lifetime' and v_old.status = 'active' and v_old.money_back_at is null;"));
    assert.ok(body.includes("plan = case when p_plan = 'lifetime' or v_owns_lifetime then 'lifetime' else 'monthly' end,"));
    assert.ok(body.includes("status = 'active',"));
    assert.ok(body.includes("replaced_subscription_id = v_replaced,"));
    assert.ok(body.includes("money_back_at = null,"), "a new paid checkout clears a money-back close");
    assert.ok(body.includes("past_due_since = null,"));
    const replaced = body.slice(body.indexOf("v_replaced := case"), body.indexOf("update public.post_creator_accounts set"));
    assert.ok(replaced.includes("v_old.plan = 'monthly' and v_old.status <> 'canceled'"));
    assert.ok(replaced.includes("p_subscription_id <> v_old.stripe_subscription_id"), "only a different subscription replaces one");
    assert.ok(replaced.includes("p_plan = 'lifetime'"), "the one payment plan replaces a running monthly one");
  });

  test("an account deleted on request charges its open reservation to its day", () => {
    const release = fn(RELEASE_FN).body;
    assert.ok(release.includes("if old.status = 'reserved' then"));
    assert.ok(release.includes("reserved_micro_usd = greatest(0, reserved_micro_usd - old.reserved_micro_usd)"));
    assert.ok(release.includes("spent_micro_usd = spent_micro_usd + old.reserved_micro_usd"));
    assert.ok(code.includes(`create trigger ${RELEASE_FN} after delete on public.post_creator_generations`));
  });

  test("the account carries the grace start, the money-back close, the replaced subscription, and the monthly carry-over", () => {
    const table = /create table if not exists public\.post_creator_accounts \(([\s\S]*?)\n\);/.exec(code);
    assert.ok(table);
    for (const column of ["past_due_since timestamptz", "money_back_at timestamptz", "replaced_subscription_id text", "monthly_until timestamptz"]) {
      assert.ok(table[1].includes(column), column);
    }
    // A past-due plan's period end was never paid for: the carry-over stops at the current month.
    const update = fn("post_creator_record_purchase").body;
    const pastDue = update.indexOf("when p_plan = 'lifetime' and v_replaced is not null and v_old.status = 'past_due' then now()");
    const running = update.indexOf("when p_plan = 'lifetime' and v_replaced is not null then greatest(coalesce(v_old.current_period_end, now()), now())");
    assert.ok(pastDue > 0 && running > pastDue, "the past-due case is decided first");
  });

  test("the account carries a key version, starting at 0 so every key already emailed keeps working", () => {
    const table = /create table if not exists public\.post_creator_accounts \(([\s\S]*?)\n\);/.exec(code);
    assert.ok(table);
    assert.ok(table[1].includes("key_version integer not null default 0 check (key_version between 0 and 1000)"));
    // Only a person raises it (the revoke runbook); no function writes it.
    for (const name of ["post_creator_record_purchase", "post_creator_reserve", "post_creator_settle", "post_creator_usage", "post_creator_hit"]) {
      assert.ok(!fn(name).body.includes("key_version"), name);
    }
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
