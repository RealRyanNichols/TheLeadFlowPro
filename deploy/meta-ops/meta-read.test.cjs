"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { IDENTITY, FORMS, GraphClient, preflight, readProtectedEnv } = require('./meta-ops.cjs');
const { installCredential, REQUIRED_SCOPES } = require('./install-meta-credential.cjs');
const token = 'private-test-system-token-0123456789';
function provider(overrides = {}, observe = () => {}) {
  return async (url, init) => {
    const parsed = new URL(String(url));
    const endpoint = parsed.pathname.replace(/^\/v[0-9.]+\//, '');
    assert.equal(init.method, 'GET');
    assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${token}`);
    assert.equal(String(url).includes(token), false);
    observe(endpoint, parsed);
    const rows = {
      'me/permissions': { data: REQUIRED_SCOPES.map(permission => ({ permission, status: 'granted' })) },
      app: { id: IDENTITY.appId },
      [`act_${IDENTITY.adAccountId}`]: { id: `act_${IDENTITY.adAccountId}`, account_id: IDENTITY.adAccountId, account_status: 1, currency: 'USD' },
      [IDENTITY.pageId]: { id: IDENTITY.pageId },
      ...Object.fromEntries(FORMS.map(id => [id, { id, page_id: IDENTITY.pageId, status: 'ACTIVE' }])),
      [`act_${IDENTITY.adAccountId}/insights`]: { data: [{ account_id: IDENTITY.adAccountId }] },
    };
    assert.ok(Object.hasOwn(rows, endpoint), `unexpected endpoint ${endpoint}`);
    return Response.json(Object.hasOwn(overrides, endpoint) ? overrides[endpoint] : rows[endpoint]);
  };
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-read-test-'));
  fs.chmodSync(root, 0o700);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const envPath = path.join(root, 'leadflow.env');
  const original = '# preserve all unrelated bytes\nMETA_PAGE_ACCESS_TOKEN="working-lead-token-1234567890"\nMETA_ADS_MANAGEMENT_TOKEN="existing-management-stays"\nUNRELATED="first\nsecond"\n';
  fs.writeFileSync(envPath, original, { mode: 0o600 });
  return { root, envPath, original, backupDir: path.join(root, 'backups'), ownerUid: process.getuid() };
}

test('read preflight verifies exact app/account/Page without broad business metadata', async () => {
  const result = await preflight(new GraphClient(token, provider({}, (_endpoint, url) => assert.equal((url.searchParams.get('fields') || '').split(',').includes('business'), false))), null, false);
  assert.equal(result.portfolioOwnershipVerified, false);
});

test('read preflight rejects foreign app/account/Page', async () => {
  const cases = [
    [{ app: { id: 'foreign-app' } }, 'TOKEN_APP_MISMATCH'],
    [{ [`act_${IDENTITY.adAccountId}`]: { id: 'act_foreign', account_id: IDENTITY.adAccountId } }, 'ACCOUNT_IDENTITY_MISMATCH'],
    [{ [`act_${IDENTITY.adAccountId}`]: { id: `act_${IDENTITY.adAccountId}`, account_id: 'foreign' } }, 'ACCOUNT_IDENTITY_MISMATCH'],
    [{ [IDENTITY.pageId]: { id: 'foreign-page' } }, 'PAGE_MISMATCH'],
  ];
  for (const [overrides, code] of cases) await assert.rejects(preflight(new GraphClient(token, provider(overrides)), null, false), error => error.code === code);
});

test('write preflight retains exact business ownership guard', async () => {
  let businessRequested = false;
  const observe = (endpoint, url) => { if (endpoint === `act_${IDENTITY.adAccountId}`) businessRequested = (url.searchParams.get('fields') || '').split(',').includes('business'); };
  await assert.rejects(preflight(new GraphClient(token, provider({}, observe)), FORMS[0], true), error => error.code === 'ACCOUNT_BUSINESS_MISMATCH');
  assert.equal(businessRequested, true);
  const right = { id: `act_${IDENTITY.adAccountId}`, account_id: IDENTITY.adAccountId, account_status: 1, currency: 'USD', business: { id: IDENTITY.businessPortfolioId } };
  const checked = await preflight(new GraphClient(token, provider({ [`act_${IDENTITY.adAccountId}`]: right })), FORMS[0], true);
  assert.equal(checked.portfolioOwnershipVerified, true);
});

test('installer writes only read token, preserves lead/management/unrelated bytes and creates private rollback', async t => {
  const setup = fixture(t);
  const result = await installCredential(token, { ...setup, fetchImpl: provider() });
  assert.deepEqual(result.updatedKeys, ['META_ADS_READ_TOKEN']);
  assert.equal(result.managementCredentialInstalled, false);
  assert.equal(result.portfolioOwnershipVerified, false);
  assert.equal(result.writeActionsTested, false);
  assert.equal(result.restartPerformed, false);
  assert.equal(result.leadCredentialPreserved, true);
  assert.equal(fs.readFileSync(setup.envPath, 'utf8'), setup.original + `META_ADS_READ_TOKEN="${token}"\n`);
  assert.equal(fs.readFileSync(result.rollbackBackup, 'utf8'), setup.original);
  assert.equal(fs.statSync(setup.envPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(result.rollbackBackup).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(path.join(setup.root, '.leadflow-env-write.lock')), false);
});

test('installer honors shared writer lock and preserves another writer lock', async t => {
  const setup = fixture(t), lock = path.join(setup.root, '.leadflow-env-write.lock');
  fs.writeFileSync(lock, 'another-writer', { mode: 0o600 });
  await assert.rejects(installCredential(token, { ...setup, fetchImpl: provider() }), error => error.code === 'ENV_WRITE_LOCK_EXISTS_OR_UNAVAILABLE');
  assert.equal(fs.readFileSync(lock, 'utf8'), 'another-writer');
  assert.equal(fs.readFileSync(setup.envPath, 'utf8'), setup.original);
});

test('installer rejects any foreign/disabled approved form before backup/config mutation', async t => {
  for (const status of ['PAUSED', 'ACTIVE']) {
    const setup = fixture(t);
    const wrong = status === 'ACTIVE' ? { id: FORMS[2], page_id: 'foreign', status } : { id: FORMS[2], page_id: IDENTITY.pageId, status };
    await assert.rejects(installCredential(token, { ...setup, fetchImpl: provider({ [FORMS[2]]: wrong }) }), error => error.code === 'FORM_PAGE_OR_STATUS_MISMATCH');
    assert.equal(fs.readFileSync(setup.envPath, 'utf8'), setup.original);
    assert.equal(fs.existsSync(setup.backupDir), false);
    assert.equal(fs.existsSync(path.join(setup.root, '.leadflow-env-write.lock')), false);
  }
});

test('installer detects environment drift and removes only its own lock', async t => {
  const setup = fixture(t); let changed = false;
  const fetchImpl = provider({}, () => { if (!changed) { changed = true; fs.appendFileSync(setup.envPath, 'OTHER=modified\n'); } });
  await assert.rejects(installCredential(token, { ...setup, fetchImpl }), error => error.code === 'ENV_CHANGED_DURING_VERIFICATION');
  assert.equal(fs.readFileSync(setup.envPath, 'utf8'), setup.original + 'OTHER=modified\n');
  assert.equal(fs.existsSync(setup.backupDir), false);
  assert.equal(fs.existsSync(path.join(setup.root, '.leadflow-env-write.lock')), false);
});

test('installer rejects shared lock replacement before environment writes and preserves replacement', async t => {
  const setup = fixture(t), lock = path.join(setup.root, '.leadflow-env-write.lock'); let changed = false;
  const fetchImpl = provider({}, () => { if (!changed) { changed = true; fs.unlinkSync(lock); fs.writeFileSync(lock, 'replacement-owner', { mode: 0o600 }); } });
  await assert.rejects(installCredential(token, { ...setup, fetchImpl }), error => error.code === 'ENV_WRITE_LOCK_CHANGED_REVIEW_REQUIRED');
  assert.equal(fs.readFileSync(setup.envPath, 'utf8'), setup.original);
  assert.equal(fs.existsSync(setup.backupDir), false);
  assert.equal(fs.readFileSync(lock, 'utf8'), 'replacement-owner');
});
