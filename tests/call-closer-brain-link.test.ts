import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { NEXT_CALL_PATH } from "../lib/callQueue.ts";
import { BUSINESS } from "../lib/site/business.ts";

// deploy/call-closer/install.sh adds a "Today's calls" link to the central
// brain's Command menu on the droplet. These tests run it against a copy of
// that page in a temporary folder, never against a real server.

const SCRIPT = join(process.cwd(), "deploy/call-closer/install.sh");
const SOURCE = readFileSync(SCRIPT, "utf8");
const TARGET = `${BUSINESS.siteUrl}${NEXT_CALL_PATH}`;
// The Command menu as the Ads Brain installer leaves it (deploy/ads-brain/command-navigation.patch).
const NAV =
  '<nav class="nav"><a href="/dashboard">Dashboard</a><a href="/ads">Ads Brain</a><a href="/">Call desk</a><button id="refresh" type="button">Refresh</button></nav>';

function brainWith(page: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), "brain-"));
  mkdirSync(join(dir, "public"));
  if (page !== null) writeFileSync(join(dir, "public/command.html"), page);
  return dir;
}

function run(dir: string) {
  return spawnSync("sh", [SCRIPT], { env: { ...process.env, BRAIN_DIR: dir, CALL_CLOSER_LINK_TEST: "1" }, encoding: "utf8" });
}

const page = (dir: string) => readFileSync(join(dir, "public/command.html"), "utf8");
const backups = (dir: string) => readdirSync(join(dir, "public")).filter((f) => f.startsWith("command.html.bak.call-closer-"));

test("the link points at the Call Closer's next-call page on the owned site", () => {
  assert.ok(SOURCE.includes(`TARGET="${TARGET}"`));
  assert.equal(TARGET, "https://www.theleadflowpro.com/admin/call-sheet/next");
});

test("adds Today's calls right after Dashboard, once, and keeps a backup", () => {
  const dir = brainWith(`<body>${NAV}</body>`);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  const html = page(dir);
  assert.ok(html.includes(`<a href="/dashboard">Dashboard</a><a href="${TARGET}" rel="noopener">Today&#39;s calls</a><a href="/ads">Ads Brain</a>`));
  assert.equal(html.split(`href="${TARGET}"`).length - 1, 1);
  assert.equal(backups(dir).length, 1);
  assert.equal(readFileSync(join(dir, "public", backups(dir)[0]), "utf8"), `<body>${NAV}</body>`);
  assert.match(r.stdout, /Today's calls added/);
});

test("running it twice changes nothing the second time", () => {
  const dir = brainWith(`<body>${NAV}</body>`);
  assert.equal(run(dir).status, 0);
  const once = page(dir);
  const again = run(dir);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /already in the Command menu/);
  assert.equal(page(dir), once);
  assert.equal(backups(dir).length, 1);
});

test("an unfamiliar page is left untouched and the address is printed to add by hand", () => {
  for (const html of ["<body><nav>Something else</nav></body>", `<body>${NAV}${NAV}</body>`]) {
    const dir = brainWith(html);
    const r = run(dir);
    assert.equal(r.status, 1);
    assert.equal(page(dir), html);
    assert.equal(backups(dir).length, 0);
    assert.ok(r.stderr.includes(TARGET));
  }
});

test("a missing page is an error with nothing written", () => {
  const dir = brainWith(null);
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.equal(existsSync(join(dir, "public/command.html")), false);
});

test("the installer touches one static file: no network, services, database, or secrets", () => {
  for (const forbidden of ["curl", "wget", "systemctl", "psql", "server.js", "/etc/brain", "env", "patch -"]) {
    const code = SOURCE.split("\n").filter((l) => !l.trimStart().startsWith("#")).join("\n");
    if (forbidden === "env") {
      assert.ok(!/\/etc\/brain\/env|\.\s+\/etc/.test(code));
      continue;
    }
    assert.ok(!code.includes(forbidden), forbidden);
  }
  assert.ok(!/[–—]/.test(SOURCE));
  // It refuses to run on the droplet unless it is root.
  assert.ok(SOURCE.includes('if [ "$(id -u)" -ne 0 ]'));
  execFileSync("sh", ["-n", SCRIPT]);
});
