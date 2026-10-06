#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { IDENTITY, FORMS, GRAPH_VERSION, GraphClient, preflight, parseEnv, parseEnvEntries, readProtectedEnv, credential, OpsError, safeError } = require('./meta-ops.cjs');

const ENV_PATH = '/srv/site-env/leadflow.env';
const BACKUP_DIR = '/srv/site-env/meta-credential-backups';
const REQUIRED_SCOPES = ['ads_read', 'ads_management', 'pages_show_list', 'pages_read_engagement', 'pages_manage_ads', 'pages_manage_metadata', 'leads_retrieval'];
function check(ok, code) { if (!ok) throw new OpsError(code); }

async function readTokenFromStdin(input = process.stdin) {
  check(!input.isTTY, 'TOKEN_MUST_ARRIVE_THROUGH_PRIVATE_STDIN');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of input) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    check(bytes <= 4098, 'TOKEN_INPUT_TOO_LARGE');
    chunks.push(buffer);
  }
  const value = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  return credential({ META_ADS_READ_TOKEN: value }, 'read');
}
function snapshot(filename, ownerUid) {
  const parent = fs.lstatSync(path.dirname(filename));
  check(parent.isDirectory() && !parent.isSymbolicLink() && parent.uid === ownerUid && (parent.mode & 0o022) === 0, 'ENV_DIRECTORY_MUST_BE_OWNED_NOT_WRITABLE_BY_OTHERS');
  readProtectedEnv(filename, ownerUid);
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    check(stat.isFile() && stat.uid === ownerUid && (stat.mode & 0o077) === 0 && stat.size <= 1024 * 1024, 'ENV_MUST_BE_ROOT_OWNED_PRIVATE_FILE');
    const raw = fs.readFileSync(fd);
    const source = raw.toString('utf8');
    check(Buffer.from(source).equals(raw), 'ENV_MUST_BE_VALID_UTF8');
    return { raw, source, stat, env: parseEnv(source) };
  } finally { fs.closeSync(fd); }
}
function assertUnchanged(filename, original, ownerUid) {
  const current = snapshot(filename, ownerUid);
  check(current.stat.ino === original.stat.ino && current.stat.dev === original.stat.dev && current.raw.equals(original.raw), 'ENV_CHANGED_DURING_VERIFICATION');
}
function rewriteChosenKeys(source, chosenKeys, token) {
  const seen = new Set();
  const entries = parseEnvEntries(source).entries;
  let result = source;
  for (const entry of [...entries].reverse()) {
    if (chosenKeys.includes(entry.key)) {
      const replacement = `${/^\s*export\s+/.test(source.slice(entry.start, entry.end)) ? 'export ' : ''}${entry.key}="${token}"`;
      result = result.slice(0, entry.start) + replacement + result.slice(entry.end);
      seen.add(entry.key);
    }
  }
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  for (const key of chosenKeys.filter(key => !seen.has(key))) {
    if (result && !result.endsWith('\n')) result += newline;
    result += `${key}="${token}"${newline}`;
  }
  const leadAssignment = value => {
    const entry = parseEnvEntries(value).entries.find(item => item.key === 'META_PAGE_ACCESS_TOKEN');
    return entry ? value.slice(entry.start, entry.end) : undefined;
  };
  check(leadAssignment(source) === leadAssignment(result), 'LEAD_CREDENTIAL_LINE_CHANGED');
  return result;
}
function writePrivateExclusive(filename, source) {
  const fd = fs.openSync(filename, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try { fs.writeFileSync(fd, source); fs.fchmodSync(fd, 0o600); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function syncDirectory(dirname) {
  const fd = fs.openSync(dirname, fs.constants.O_RDONLY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function environmentWriteLock(envPath, ownerUid) {
  const parent = fs.lstatSync(path.dirname(envPath));
  check(parent.isDirectory() && !parent.isSymbolicLink() && parent.uid === ownerUid && (parent.mode & 0o022) === 0, 'ENV_DIRECTORY_MUST_BE_OWNED_NOT_WRITABLE_BY_OTHERS');
  const lockPath = path.join(path.dirname(envPath), '.leadflow-env-write.lock');
  const contents = Buffer.from(JSON.stringify({ operation_id: crypto.randomUUID(), writer: 'leadflow-meta-read-install', pid: process.pid, started_at: new Date().toISOString() }) + '\n');
  try { writePrivateExclusive(lockPath, contents); }
  catch { throw new OpsError('ENV_WRITE_LOCK_EXISTS_OR_UNAVAILABLE'); }
  const original = fs.lstatSync(lockPath);
  const assertOwned = () => {
    let current;
    try { current = fs.lstatSync(lockPath); }
    catch { throw new OpsError('ENV_WRITE_LOCK_CHANGED_REVIEW_REQUIRED'); }
    check(current.isFile() && !current.isSymbolicLink() && current.ino === original.ino && current.dev === original.dev && fs.readFileSync(lockPath).equals(contents), 'ENV_WRITE_LOCK_CHANGED_REVIEW_REQUIRED');
  };
  return { assertOwned, release() { assertOwned(); fs.unlinkSync(lockPath); } };
}
async function installCredential(token, { envPath = ENV_PATH, backupDir = BACKUP_DIR, fetchImpl, ownerUid = 0 } = {}) {
  // Non-default file/ownership parameters are library test seams; the CLI accepts none.
  check(process.getuid() === ownerUid, 'INSTALLER_MUST_RUN_AS_CONFIGURATION_OWNER');
  token = credential({ META_ADS_READ_TOKEN: token }, 'read');
  const lock = environmentWriteLock(envPath, ownerUid);
  try {
    const original = snapshot(envPath, ownerUid);
    check(typeof original.env.META_PAGE_ACCESS_TOKEN === 'string' && original.env.META_PAGE_ACCESS_TOKEN.length > 0, 'WORKING_LEAD_CREDENTIAL_REQUIRED');
    for (const [key, value] of [['META_APP_ID', IDENTITY.appId], ['META_BUSINESS_ID', IDENTITY.businessPortfolioId], ['META_AD_ACCOUNT_ID', IDENTITY.adAccountId], ['META_PAGE_ID', IDENTITY.pageId]]) {
      check(!original.env[key] || original.env[key] === value, 'CONFIGURED_META_IDENTITY_MISMATCH');
    }
    const client = new GraphClient(token, fetchImpl);
    const permissions = await client.get('me/permissions');
    const grants = (permissions.data || []).filter(row => row.status === 'granted').map(row => row.permission);
    check(REQUIRED_SCOPES.every(scope => grants.includes(scope)), 'INSTALLER_REQUIRED_SCOPE_MISSING');
    await preflight(client, null, false);
    for (const formId of FORMS) {
      const form = await client.get(formId, { fields: 'id,page_id,status' });
      check(form.id === formId && String(form.page_id) === IDENTITY.pageId && form.status === 'ACTIVE', 'FORM_PAGE_OR_STATUS_MISMATCH');
    }
    const insights = await client.get(`act_${IDENTITY.adAccountId}/insights`, { fields: 'account_id,date_start,date_stop,spend,impressions,clicks', date_preset: 'last_7d', level: 'account', limit: 100 });
    check(Array.isArray(insights.data) && insights.data.every(row => row.account_id === IDENTITY.adAccountId), 'INSIGHTS_ACCOUNT_MISMATCH');
    // All remote verification finishes before backups, temporary files, or config writes.
    lock.assertOwned();
    assertUnchanged(envPath, original, ownerUid);
    const chosenKeys = ['META_ADS_READ_TOKEN'];
    const changed = rewriteChosenKeys(original.source, chosenKeys, token);
    const parsed = parseEnv(changed);
    check(parsed.META_PAGE_ACCESS_TOKEN === original.env.META_PAGE_ACCESS_TOKEN && chosenKeys.every(key => parsed[key] === token), 'CREDENTIAL_REWRITE_VERIFICATION_FAILED');

    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const backupStat = fs.lstatSync(backupDir);
    check(backupStat.isDirectory() && !backupStat.isSymbolicLink() && backupStat.uid === ownerUid && (backupStat.mode & 0o777) === 0o700, 'BACKUP_DIRECTORY_MUST_BE_PRIVATE_OWNED');
    const nonce = crypto.randomUUID();
    const backup = path.join(backupDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${nonce}.env`);
    writePrivateExclusive(backup, original.raw);
    syncDirectory(backupDir);
    const temporary = path.join(path.dirname(envPath), `.meta-credential-${nonce}.tmp`);
    let installed = false;
    try {
      writePrivateExclusive(temporary, changed);
      lock.assertOwned();
      assertUnchanged(envPath, original, ownerUid);
      fs.renameSync(temporary, envPath);
      installed = true;
      syncDirectory(path.dirname(envPath));
      const readback = snapshot(envPath, ownerUid);
      check(readback.raw.equals(Buffer.from(changed)) && readback.env.META_PAGE_ACCESS_TOKEN === original.env.META_PAGE_ACCESS_TOKEN && chosenKeys.every(key => readback.env[key] === token), 'INSTALLED_CONFIGURATION_READBACK_FAILED');
      return { ok: true, identity: IDENTITY, graphVersion: GRAPH_VERSION, updatedKeys: chosenKeys, requiredPermissionsVerified: REQUIRED_SCOPES, insightsAvailable: true, insightsRows: insights.data.length, leadCredentialPreserved: true, rollbackBackup: backup, restartPerformed: false, managementCredentialInstalled: false, portfolioOwnershipVerified: false, writeActionsTested: false };
    } catch (error) {
      if (installed) throw new OpsError('CONFIGURATION_MAY_HAVE_CHANGED_REVIEW_ROLLBACK', { rollbackBackup: backup, configurationMayHaveChanged: true });
      throw error;
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  } finally { lock.release(); }
}
async function main() {
  check(process.argv.length === 2, 'INSTALLER_ACCEPTS_STDIN_ONLY_NO_ARGUMENTS');
  check(process.getuid() === 0, 'INSTALLER_MUST_RUN_AS_ROOT');
  const token = await readTokenFromStdin();
  return installCredential(token);
}
if (require.main === module) {
  main().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch(error => { process.stderr.write(`${JSON.stringify({ ok: false, ...safeError(error) })}\n`); process.exitCode = 1; });
}
module.exports = { REQUIRED_SCOPES, readTokenFromStdin, rewriteChosenKeys, installCredential };
