import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

// Step 1 of the Back Office build proposes the site's own database on the
// droplet (docs/infrastructure/database.md). Until Ryan says yes it must stay
// written down but switched off: deploys never start it, nothing depends on
// it, and no secret is in the repository. These tests pin that, and the
// safety rules of deploy/droplet/db.sh.

const read = (path: string) => readFileSync(path, "utf8");
const compose = read("deploy/droplet/compose.yml");
const dbScript = read("deploy/droplet/db.sh");
const deploy = read("deploy/droplet/deploy.sh");

/** One service's settings in compose.yml (comments left out), up to the next service or top-level key. */
function service(name: string) {
  const lines = compose.split("\n");
  const start = lines.indexOf(`  ${name}:`);
  assert.ok(start >= 0, `compose.yml has a ${name} service`);
  let end = start + 1;
  while (end < lines.length && !/^ {2}[a-z][\w-]*:\s*$/.test(lines[end]) && !/^\S/.test(lines[end])) end++;
  return lines
    .slice(start, end)
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
}

/** One shell function's body in db.sh. */
function fn(name: string) {
  const body = dbScript.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, "m"))?.[0];
  assert.ok(body, `db.sh defines ${name}`);
  return body;
}

/** Where text first appears in a body; fails if it is missing, so order checks cannot pass on -1. */
function pos(body: string, text: string, from = 0) {
  const i = body.indexOf(text, from);
  assert.ok(i >= 0, `expected to find: ${text}`);
  return i;
}

test("the database is written down but switched off: its own profile, no port on the droplet, nothing depends on it", () => {
  const db = service("db");
  assert.match(db, /^ {4}profiles: \["db"\]$/m);
  assert.match(db, /^ {4}image: postgres:17\.\d+-alpine\d+\.\d+$/m, "Postgres 17 like Supabase, pinned to the tested build");
  assert.doesNotMatch(db, /^\s+ports:/m, "no port is published: the internet cannot reach it");
  assert.match(db, /POSTGRES_PASSWORD_FILE: \/run\/leadflow\/db-password/);
  assert.match(db, /POSTGRES_INITDB_ARGS: "--locale-provider=icu --icu-locale=en-US"/, "sorts text the way Supabase does");
  assert.match(db, /create_host_path: false/, "a missing password file stops the start instead of creating a folder");
  assert.match(db, /"pg_isready", "-h", "127\.0\.0\.1"/, "healthy only once the real server listens over TCP");
  assert.match(db, /^ {4}mem_limit: \d+m$/m, "capped, because the droplet is short on memory");
  assert.match(compose, /^volumes:\n(?: {2}\S+:\n?)*? {2}db-data:$/m);
  for (const name of ["web", "cron", "worker"]) {
    assert.doesNotMatch(service(name), /\bdb\b/, `${name} does not need the database yet`);
  }
});

test("deploy.sh never starts the database, and starts the worker only when worker is one of the listed profiles", () => {
  // No command in deploy.sh touches the database at all.
  for (const line of deploy.split("\n").filter((l) => !/^\s*#/.test(l))) {
    assert.doesNotMatch(line, /\bdb\b/, line.trim());
  }
  // Every "up" names its one service. A bare "up" would start the database
  // whenever "db" is among the profiles.
  const ups = deploy.split("\n").filter((l) => /"\$\{COMPOSE\[@\]\}" up\b/.test(l));
  assert.ok(ups.length >= 3);
  for (const line of ups) {
    assert.match(line, /\bup -d --no-build(?: --force-recreate)? (web|cron|worker)(?: ;;)?$/, line.trim());
  }
  const block = deploy.match(/^case ",\$\{COMPOSE_PROFILES:-\}," in$[\s\S]*?^esac$/m)?.[0];
  assert.ok(block, "deploy.sh decides about the worker with one case block");
  const cases: [string, boolean][] = [
    ["", false],
    ["db", false],
    ["workers", false],
    ["worker", true],
    ["db,worker", true],
    ["worker,db", true],
  ];
  for (const [profiles, starts] of cases) {
    const run = spawnSync("bash", ["-c", `COMPOSE=(echo compose); COMPOSE_PROFILES=${JSON.stringify(profiles)}\n${block}`], {
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout.includes("up -d --no-build --force-recreate worker"), starts, `COMPOSE_PROFILES="${profiles}"`);
  }
});

test("db.sh asks for a typed phrase before it creates, replaces or turns off anything, and never on the timed jobs", () => {
  const phrases: [string, string][] = [
    ["do_setup", "CREATE THE DATABASE"],
    ["do_restore", "REPLACE THE DATABASE"],
    ["do_off", "TURN THE DATABASE OFF"],
  ];
  for (const [name, phrase] of phrases) {
    const body = fn(name);
    // The lock comes after the phrase, so a prompt left open never blocks the nightly backup.
    assert.ok(pos(body, `confirm "${phrase}"`) < pos(body, "\n  lock\n"), `${name}: phrase first, then the lock`);
  }
  const dispatch = dbScript.slice(pos(dbScript, 'case "${1:-}" in'));
  for (const name of ["setup", "restore", "off"]) {
    assert.doesNotMatch(dispatch, new RegExp(`^ {2}${name}\\) lock;`, "m"), `${name} locks only after its phrase`);
  }
  assert.doesNotMatch(fn("do_backup"), /confirm /, "the nightly backup runs unattended");
  assert.doesNotMatch(fn("do_restore_check"), /confirm /, "the weekly restore check runs unattended");
  assert.match(fn("confirm"), /die "Not confirmed\. Nothing changed\."/);
});

test("a restore saves the undo first, builds beside the live database, swaps in one transaction, and always starts the site again", () => {
  const restore = fn("do_restore");
  assert.ok(pos(restore, "PRUNE=0") < pos(restore, "do_backup"), "the undo backup never prunes the file being restored");
  assert.ok(pos(restore, 'exec 8< "$file"') < pos(restore, 'confirm "REPLACE'), "the file is held open before the prompt");
  assert.match(restore, /--exit-on-error <&8; then/, "so a nightly backup that rotates it out meanwhile cannot take it away");
  assert.ok(pos(restore, "do_backup") < pos(restore, "CREATE DATABASE ${DB}_restoring"), "the undo backup comes before any change");
  assert.ok(pos(restore, 'pg_restore -U postgres -d "${DB}_restoring"') < pos(restore, "stop $running"), "the site stops only after the copy restored");
  assert.ok(pos(restore, "DROP DATABASE IF EXISTS ${DB}_before_restore WITH (FORCE)") < pos(restore, "stop $running"), "old copy cleared while the site still runs");
  assert.ok(pos(restore, "trap start_site_again EXIT") < pos(restore, "stop $running"), "whatever stops is started again, even if the restore stops early");
  assert.match(restore, /"BEGIN; ALTER DATABASE \$DB RENAME TO \$\{DB\}_before_restore; ALTER DATABASE \$\{DB\}_restoring RENAME TO \$DB; COMMIT;"/);
  assert.ok(pos(restore, "COMMIT;") < pos(restore, "start_site_again\n  trap - EXIT"), "the site starts again after the swap");
  const off = fn("do_off");
  assert.match(off, /if ! \(do_backup\); then/, "turning it off tries a last backup, and still turns off if the database is not answering");
  assert.match(fn("lock"), /flock/, "one backup or restore at a time");
});

test("backups run nightly at 3:15 AM Central, keep the newest 14, never overwrite each other, and a failed check is recorded", () => {
  const unit = (name: string) => read(`deploy/droplet/systemd/${name}`);
  assert.match(unit("theleadflowpro-db-backup.timer"), /^OnCalendar=\*-\*-\* 03:15:00 America\/Chicago$/m);
  assert.match(unit("theleadflowpro-db-backup.timer"), /^Persistent=true$/m, "a night missed while the droplet was off runs at the next start");
  assert.match(unit("theleadflowpro-db-restore-check.timer"), /^OnCalendar=Sun \*-\*-\* 04:15:00 America\/Chicago$/m);
  assert.match(unit("theleadflowpro-db-backup.service"), /^ExecStart=\/opt\/theleadflowpro\/deploy\/droplet\/db\.sh backup$/m);
  assert.match(unit("theleadflowpro-db-restore-check.service"), /^ExecStart=\/opt\/theleadflowpro\/deploy\/droplet\/db\.sh restore-check$/m);
  const installed = dbScript.match(/^UNITS="([^"]+)"$/m)?.[1].split(" ").sort();
  assert.deepEqual(installed, readdirSync("deploy/droplet/systemd").sort(), "setup installs every unit in the folder");
  assert.match(dbScript, /^KEEP=14$/m);
  assert.match(dbScript, /^BACKUP_MIN_FREE_MB=1024$/m, "a nearly full disk skips the backup instead of filling up");
  assert.match(fn("backup_name"), /TZ=America\/Chicago date \+%Y-%m-%d-%H%M%S/, "named by Central time to the second, so name order is age order");
  for (const name of ["theleadflowpro-db-backup.service", "theleadflowpro-db-restore-check.service"]) {
    assert.match(unit(name), /^TimeoutStartSec=\S+$/m, `${name}: a hung run is stopped`);
  }
  const backup = fn("do_backup");
  assert.match(backup, /timeout "\$DUMP_TIMEOUT" "\$\{COMPOSE\[@\]\}" exec -T db pg_dump --lock-wait-timeout=/, "a hung dump stops and frees the lock");
  assert.ok(pos(backup, 'while [ -e "$file" ]') < pos(backup, "pg_dump"), "an existing backup's name is never reused");
  assert.doesNotMatch(backup, /mv -f/, "never overwrites a backup");
  assert.ok(pos(backup, "pg_restore --list") < pos(backup, 'mv "$tmp" "$file"'), "a backup is kept only after it reads back");
  assert.ok(pos(backup, 'if [ "$PRUNE" -eq 1 ]') > pos(backup, 'mv "$tmp" "$file"'), "old backups go only after the new one is saved");
  const check = fn("do_restore_check");
  assert.ok((check.match(/check_failed /g) ?? []).length >= 6, "every way the check can fail is written down for check.sh");
});

test("no secret in the repository: names only, and the password is made on the droplet and never read back", () => {
  assert.match(read("deploy/droplet/web.env.example"), /^DATABASE_URL=$/m);
  const rootEnv = read(".env.example");
  assert.match(rootEnv, /^DATABASE_URL=""$/m);
  assert.doesNotMatch(rootEnv, /postgres(?:ql)?:\/\//, "no connection string, not even a sample");
  assert.match(fn("do_setup"), /od -An -N24 -tx1 \/dev\/urandom \| tr -d ' \\n' > "\$PASS_FILE"/);
  assert.doesNotMatch(dbScript, /(?:<\s*"?\$PASS_FILE|cat\s+"?\$PASS_FILE|\$\(<)/, "db.sh never reads the password; only the container does");
});

test("every droplet script parses", () => {
  for (const file of readdirSync("deploy/droplet").filter((f) => f.endsWith(".sh"))) {
    const run = spawnSync("bash", ["-n", `deploy/droplet/${file}`], { encoding: "utf8" });
    assert.equal(run.status, 0, `${file}: ${run.stderr}`);
  }
});
