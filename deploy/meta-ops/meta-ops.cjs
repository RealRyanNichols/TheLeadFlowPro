#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const IDENTITY = Object.freeze({ appId: '1595903401874517', businessPortfolioId: '1154478850201530', adAccountId: '1637329904238602', pageId: '887023637835514' });
const GRAPH_VERSION = 'v26.0';
const FORMS = Object.freeze(['1410074817946865', '1149268527613297', '2084381329108926']);
const ENV_PATH = '/srv/site-env/leadflow.env';
const RECEIPTS_DIR = '/var/lib/leadflow-meta-ops/receipts';
const ACCOUNT = `act_${IDENTITY.adAccountId}`;
const POST_PATHS = new Set(['campaigns', 'adsets', 'adcreatives', 'ads'].map(edge => `${ACCOUNT}/${edge}`));
const MANAGE_SCOPES = ['ads_management', 'ads_read', 'pages_manage_ads', 'pages_read_engagement'];

class OpsError extends Error {
  constructor(code, details = {}, ambiguous = false) {
    super(code);
    this.name = 'OpsError';
    this.code = code;
    this.details = details;
    this.ambiguous = ambiguous;
  }
}
function check(ok, code) { if (!ok) throw new OpsError(code); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function keys(value, allowed, code) {
  check(object(value) && Object.keys(value).every(key => allowed.includes(key)), code);
}
function text(value, max = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
function id(value) { return typeof value === 'string' && /^\d{5,30}$/.test(value); }

// Literal scanner: quote escapes and multiline values never invoke a shell.
// Spans distinguish real assignments from assignment-looking text inside values.
function parseEnvEntries(source) {
  check(typeof source === 'string' && !/[\u0000\ufeff]/.test(source), 'ENV_INVALID_TEXT');
  const values = Object.create(null);
  const entries = [];
  let cursor = 0;
  let lineNumber = 1;
  while (cursor < source.length) {
    const start = cursor;
    const nextNewline = source.indexOf('\n', cursor);
    const firstEnd = nextNewline === -1 ? source.length : nextNewline;
    const firstLine = source.slice(cursor, firstEnd).replace(/\r$/, '');
    if (/^[ \t]*(?:[#;].*)?$/.test(firstLine)) {
      cursor = nextNewline === -1 ? source.length : nextNewline + 1;
      lineNumber += 1;
      continue;
    }
    const match = /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*/.exec(firstLine);
    check(match, `ENV_SYNTAX_LINE_${lineNumber}`);
    const key = match[1];
    check(!Object.hasOwn(values, key), 'ENV_DUPLICATE_KEY');
    let position = cursor + match[0].length;
    let value = '';
    let end;
    const quote = ['"', "'"].includes(source[position]) ? source[position++] : null;
    if (quote) {
      let closed = false;
      while (position < source.length) {
        const character = source[position++];
        if (character === quote) { closed = true; break; }
        if (character === '\\' && quote === '"') {
          check(position < source.length, 'ENV_ESCAPE_SYNTAX');
          const following = source[position++];
          if (following === '\n') continue;
          if (following === '\r' && source[position] === '\n') { position += 1; continue; }
          value += ['"', '\\', '`', '$'].includes(following) ? following : `\\${following}`;
        } else {
          value += character;
        }
      }
      check(closed, 'ENV_QUOTE_SYNTAX');
      const newline = source.indexOf('\n', position);
      end = newline === -1 ? source.length : newline;
      check(/^[ \t]*(?:#.*)?$/.test(source.slice(position, end).replace(/\r$/, '')), 'ENV_QUOTE_SYNTAX');
    } else {
      while (position < source.length && source[position] !== '\n') {
        const character = source[position++];
        if (character === '\\') {
          check(position < source.length, 'ENV_ESCAPE_SYNTAX');
          const following = source[position++];
          if (following === '\n') continue;
          if (following === '\r' && source[position] === '\n') { position += 1; continue; }
          value += following;
        } else {
          value += character;
        }
      }
      end = position;
      value = value.replace(/[ \t\r]+#.*$/, '').replace(/^[ \t\r]+|[ \t\r]+$/g, '');
    }
    // Unrelated literal $ or command-looking text is never expanded. Meta values
    // remain stricter, including decoded escapes and literal multiline content.
    if (/^META_/.test(key)) check(!/[`$\r\n]/.test(value), 'ENV_META_INTERPOLATION_FORBIDDEN');
    values[key] = value;
    entries.push({ key, value, start, end: source[end - 1] === '\r' ? end - 1 : end });
    cursor = end < source.length ? end + 1 : end;
    lineNumber += (source.slice(start, cursor).match(/\n/g) || []).length;
  }
  return { values, entries };
}
function parseEnv(source) { return parseEnvEntries(source).values; }
function readProtectedEnv(filename = ENV_PATH, ownerUid = 0) {
  const stat = fs.lstatSync(filename);
  check(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.uid === ownerUid, 'ENV_MUST_BE_ROOT_OWNED_PRIVATE_FILE');
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd);
    check(opened.ino === stat.ino && opened.dev === stat.dev && opened.size <= 1024 * 1024, 'ENV_FILE_CHANGED_OR_TOO_LARGE');
    return parseEnv(fs.readFileSync(fd, 'utf8'));
  } finally { fs.closeSync(fd); }
}
function credential(env, kind) {
  const name = kind === 'manage' ? 'META_ADS_MANAGEMENT_TOKEN' : 'META_ADS_READ_TOKEN';
  const value = env[name];
  check(typeof value === 'string' && /^[A-Za-z0-9_.-]{20,4096}$/.test(value), `MISSING_OR_INVALID_${name}`);
  return value;
}
function validateTargeting(targeting) {
  keys(targeting, ['geo_locations', 'age_min', 'age_max', 'genders'], 'TARGETING_KEYS_NOT_SUPPORTED');
  check(object(targeting.geo_locations), 'TARGETING_GEOGRAPHY_REQUIRED');
  keys(targeting.geo_locations, ['countries', 'regions', 'cities', 'zips', 'custom_locations', 'location_types'], 'GEOGRAPHY_KEYS_NOT_SUPPORTED');
  const geo = targeting.geo_locations;
  check(['countries', 'regions', 'cities', 'zips', 'custom_locations'].some(key => Array.isArray(geo[key]) && geo[key].length > 0), 'GEOGRAPHY_EMPTY');
  if (geo.countries) check(Array.isArray(geo.countries) && geo.countries.length <= 20 && geo.countries.every(country => /^[A-Z]{2}$/.test(country)), 'COUNTRIES_INVALID');
  for (const kind of ['regions', 'cities', 'zips']) {
    if (!geo[kind]) continue;
    check(Array.isArray(geo[kind]) && geo[kind].length <= 100, 'GEO_LIST_INVALID');
    for (const item of geo[kind]) {
      keys(item, kind === 'cities' ? ['key', 'radius', 'distance_unit'] : ['key'], 'GEO_ITEM_KEYS_INVALID');
      check(typeof item.key === 'string' && /^[A-Za-z0-9:_-]{1,50}$/.test(item.key), 'GEO_KEY_INVALID');
      if (item.radius !== undefined) check(Number.isFinite(item.radius) && item.radius > 0 && item.radius <= 500 && ['mile', 'kilometer'].includes(item.distance_unit), 'GEO_RADIUS_INVALID');
    }
  }
  if (geo.custom_locations) {
    check(Array.isArray(geo.custom_locations) && geo.custom_locations.length <= 50, 'CUSTOM_GEO_INVALID');
    for (const item of geo.custom_locations) {
      keys(item, ['latitude', 'longitude', 'radius', 'distance_unit'], 'CUSTOM_GEO_KEYS_INVALID');
      check(Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180 && Number.isFinite(item.radius) && item.radius > 0 && item.radius <= 500 && ['mile', 'kilometer'].includes(item.distance_unit), 'CUSTOM_GEO_INVALID');
    }
  }
  if (geo.location_types) check(Array.isArray(geo.location_types) && geo.location_types.length > 0 && geo.location_types.every(type => ['home', 'recent', 'travel_in'].includes(type)), 'LOCATION_TYPES_INVALID');
  check(Number.isInteger(targeting.age_min) && Number.isInteger(targeting.age_max) && targeting.age_min >= 18 && targeting.age_max <= 65 && targeting.age_min <= targeting.age_max, 'EXPLICIT_ADULT_AGE_RANGE_REQUIRED');
  if (targeting.genders) check(Array.isArray(targeting.genders) && targeting.genders.length > 0 && targeting.genders.every(value => value === 1 || value === 2), 'GENDERS_INVALID');
}
function validateManifest(m) {
  keys(m, ['schemaVersion', 'identity', 'funnel', 'campaign', 'adset', 'creative', 'ad'], 'MANIFEST_KEYS_INVALID');
  check(m.schemaVersion === 1, 'MANIFEST_VERSION_INVALID');
  keys(m.identity, Object.keys(IDENTITY), 'IDENTITY_KEYS_INVALID');
  for (const [key, expected] of Object.entries(IDENTITY)) check(m.identity[key] === expected, 'FOREIGN_OR_MISSING_IDENTITY');
  check(m.funnel === 'contractor_owner', 'FUNNEL_NOT_SUPPORTED');
  keys(m.campaign, ['name', 'objective', 'specialAdCategories', 'status'], 'CAMPAIGN_KEYS_INVALID');
  check(text(m.campaign.name, 200) && m.campaign.objective === 'OUTCOME_LEADS', 'CAMPAIGN_INVALID');
  check(Array.isArray(m.campaign.specialAdCategories) && m.campaign.specialAdCategories.length === 0, 'SPECIAL_CATEGORIES_REQUIRE_SEPARATE_WORKFLOW');
  keys(m.adset, ['name', 'status', 'dailyBudgetCents', 'billingEvent', 'optimizationGoal', 'bidStrategy', 'startTime', 'endTime', 'targeting'], 'ADSET_KEYS_INVALID');
  check(text(m.adset.name, 200) && Number.isSafeInteger(m.adset.dailyBudgetCents) && m.adset.dailyBudgetCents > 0 && m.adset.dailyBudgetCents <= 10000000, 'ADSET_NAME_OR_BUDGET_INVALID');
  check(m.adset.billingEvent === 'IMPRESSIONS' && m.adset.optimizationGoal === 'LEAD_GENERATION' && m.adset.bidStrategy === 'LOWEST_COST_WITHOUT_CAP', 'ADSET_MODE_NOT_SUPPORTED');
  for (const key of ['startTime', 'endTime']) check(typeof m.adset[key] === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(m.adset[key]) && Number.isFinite(Date.parse(m.adset[key])), 'EXPLICIT_UTC_SCHEDULE_REQUIRED');
  check(Date.parse(m.adset.endTime) > Date.parse(m.adset.startTime), 'SCHEDULE_ORDER_INVALID');
  validateTargeting(m.adset.targeting);
  keys(m.creative, ['name', 'pageId', 'formId', 'message', 'headline', 'description', 'link', 'imageHash', 'callToActionType'], 'CREATIVE_KEYS_INVALID');
  check(m.creative.pageId === IDENTITY.pageId && FORMS.includes(m.creative.formId), 'FOREIGN_PAGE_OR_UNREGISTERED_FORM');
  check(text(m.creative.name, 200) && text(m.creative.message, 5000) && text(m.creative.headline, 200) && text(m.creative.description, 500), 'EXPLICIT_CREATIVE_COPY_REQUIRED');
  check(typeof m.creative.imageHash === 'string' && /^[A-Fa-f0-9]{32}$/.test(m.creative.imageHash), 'EXISTING_IMAGE_HASH_REQUIRED');
  check(['LEARN_MORE', 'SIGN_UP', 'APPLY_NOW', 'GET_QUOTE'].includes(m.creative.callToActionType), 'CALL_TO_ACTION_NOT_SUPPORTED');
  let url;
  try { url = new URL(m.creative.link); } catch { throw new OpsError('DESTINATION_INVALID'); }
  check(url.protocol === 'https:' && ['www.theleadflowpro.com', 'theleadflowpro.com'].includes(url.hostname) && !url.username && !url.password && !url.port, 'DESTINATION_MUST_BE_OWNED_HTTPS');
  check(![...url.searchParams.keys()].some(key => /token|secret|email|phone|lead/i.test(key)), 'SENSITIVE_DESTINATION_QUERY_FORBIDDEN');
  keys(m.ad, ['name', 'status'], 'AD_KEYS_INVALID');
  check(text(m.ad.name, 200), 'AD_NAME_REQUIRED');
  for (const obj of [m.campaign, m.adset, m.ad]) check(obj.status === 'PAUSED', 'DELIVERY_OBJECT_MUST_BE_PAUSED');
  const serialized = JSON.stringify(m);
  check(!/924465906541446|1439074857790304|EA[A-Za-z0-9]{50,}/.test(serialized), 'FOREIGN_ASSET_OR_TOKEN_IN_MANIFEST');
  return m;
}
function loadManifest(filename) {
  const stat = fs.lstatSync(filename);
  check(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 128000, 'MANIFEST_FILE_INVALID');
  const source = fs.readFileSync(filename);
  let manifest;
  try { manifest = JSON.parse(source.toString('utf8')); } catch { throw new OpsError('MANIFEST_JSON_INVALID'); }
  validateManifest(manifest);
  return { manifest, source, hash: crypto.createHash('sha256').update(source).digest('hex') };
}

class GraphClient {
  constructor(token, fetchImpl = fetch) { this.token = token; this.fetchImpl = fetchImpl; }
  async request(method, endpoint, params = {}) {
    check(method === 'GET' || (method === 'POST' && POST_PATHS.has(endpoint)), 'REQUEST_OUTSIDE_CONTRACT');
    check(/^[A-Za-z0-9_/-]+$/.test(endpoint), 'ENDPOINT_INVALID');
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${endpoint}`);
    const encoded = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) encoded.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    if (method === 'GET') url.search = encoded.toString();
    let response;
    try {
      response = await this.fetchImpl(url, { method, headers: { Authorization: `Bearer ${this.token}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(method === 'POST' ? { body: encoded.toString() } : {}), redirect: 'error', signal: AbortSignal.timeout(20000) });
    } catch { throw new OpsError('GRAPH_TRANSPORT_FAILED', {}, method === 'POST'); }
    let body;
    try { body = await response.json(); } catch { throw new OpsError('GRAPH_RESPONSE_INVALID', { httpStatus: response.status }, method === 'POST'); }
    if (!response.ok || body?.error) {
      const details = { httpStatus: response.status };
      for (const [remote, safe] of [['code', 'metaCode'], ['error_subcode', 'metaSubcode']]) if (Number.isSafeInteger(body?.error?.[remote])) details[safe] = body.error[remote];
      throw new OpsError('GRAPH_REJECTED', details, method === 'POST' && (response.status >= 500 || response.status === 408 || response.ok));
    }
    if (!object(body)) throw new OpsError('GRAPH_RESPONSE_INVALID', {}, method === 'POST');
    return body;
  }
  get(endpoint, params) { return this.request('GET', endpoint, params); }
  post(endpoint, params) { return this.request('POST', endpoint, params); }
}
async function preflight(client, formId, manage = false) {
  const permissions = await client.get('me/permissions');
  const grants = (permissions.data || []).filter(row => row.status === 'granted').map(row => row.permission);
  const required = manage ? MANAGE_SCOPES : ['ads_read'];
  check(required.every(scope => grants.includes(scope)), 'REQUIRED_SCOPE_MISSING');
  const app = await client.get('app', { fields: 'id' });
  check(app.id === IDENTITY.appId, 'TOKEN_APP_MISMATCH');
  const fields = manage ? 'id,account_id,business,account_status,currency' : 'id,account_id,account_status,currency';
  const account = await client.get(ACCOUNT, { fields });
  check(account.id === ACCOUNT && account.account_id === IDENTITY.adAccountId, 'ACCOUNT_IDENTITY_MISMATCH');
  if (manage) check(account.business?.id === IDENTITY.businessPortfolioId, 'ACCOUNT_BUSINESS_MISMATCH');
  const page = await client.get(IDENTITY.pageId, { fields: 'id' });
  check(page.id === IDENTITY.pageId, 'PAGE_MISMATCH');
  if (manage) {
    check(account.account_status === 1 && account.currency === 'USD', 'ACCOUNT_INACTIVE_OR_CURRENCY_UNSUPPORTED');
    const form = await client.get(formId, { fields: 'id,page_id,status' });
    check(form.id === formId && String(form.page_id) === IDENTITY.pageId && form.status === 'ACTIVE', 'FORM_PAGE_OR_STATUS_MISMATCH');
  }
  return { identity: IDENTITY, portfolioOwnershipVerified: manage, graphVersion: GRAPH_VERSION, permissions: required, accountStatus: Number.isSafeInteger(account.account_status) ? account.account_status : null, currency: typeof account.currency === 'string' && /^[A-Z]{3}$/.test(account.currency) ? account.currency : null };
}
async function probe(env, fetchImpl) {
  const client = new GraphClient(credential(env, 'read'), fetchImpl);
  const checked = await preflight(client, null, false);
  const result = await client.get(`${ACCOUNT}/insights`, { fields: 'account_id,date_start,date_stop,spend,impressions,clicks', date_preset: 'last_7d', level: 'account', limit: 100 });
  check(Array.isArray(result.data) && result.data.every(row => row.account_id === IDENTITY.adAccountId), 'INSIGHTS_ACCOUNT_MISMATCH');
  return { ok: true, ...checked, insightsRows: result.data.length, insightsAvailable: true, activationSupported: false };
}
function buildStep(step, m, ids) {
  const common = { name: m[step].name };
  if (step === 'campaign') return { endpoint: `${ACCOUNT}/campaigns`, payload: { ...common, objective: m.campaign.objective, special_ad_categories: [], status: 'PAUSED', is_adset_budget_sharing_enabled: false } };
  if (step === 'adset') return { endpoint: `${ACCOUNT}/adsets`, payload: { ...common, campaign_id: ids.campaign, status: 'PAUSED', daily_budget: m.adset.dailyBudgetCents, billing_event: m.adset.billingEvent, optimization_goal: m.adset.optimizationGoal, bid_strategy: m.adset.bidStrategy, destination_type: 'ON_AD', promoted_object: { page_id: IDENTITY.pageId }, targeting: m.adset.targeting, start_time: m.adset.startTime, end_time: m.adset.endTime } };
  if (step === 'creative') return { endpoint: `${ACCOUNT}/adcreatives`, payload: { ...common, object_story_spec: { page_id: IDENTITY.pageId, link_data: { message: m.creative.message, link: m.creative.link, image_hash: m.creative.imageHash, name: m.creative.headline, description: m.creative.description, call_to_action: { type: m.creative.callToActionType, value: { lead_gen_form_id: m.creative.formId } } } } } };
  return { endpoint: `${ACCOUNT}/ads`, payload: { ...common, adset_id: ids.adset, creative: { creative_id: ids.creative }, status: 'PAUSED' } };
}
async function verifyStep(client, step, objectId, ids, manifest) {
  const fields = step === 'campaign' ? 'id,account_id,status' : step === 'adset' ? 'id,account_id,campaign_id,status,promoted_object' : step === 'creative' ? 'id,account_id,object_story_spec' : 'id,account_id,campaign_id,adset_id,status,creative';
  const row = await client.get(objectId, { fields });
  check(row.id === objectId && row.account_id === IDENTITY.adAccountId, 'CREATED_OBJECT_ACCOUNT_MISMATCH');
  if (step !== 'creative') check(row.status === 'PAUSED', 'CREATED_OBJECT_NOT_PAUSED');
  if (step === 'adset') check(row.campaign_id === ids.campaign && row.promoted_object?.page_id === IDENTITY.pageId, 'CREATED_ADSET_ASSOCIATION_MISMATCH');
  if (step === 'creative') check(row.object_story_spec?.page_id === IDENTITY.pageId && row.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id === manifest.creative.formId && row.object_story_spec?.link_data?.image_hash === manifest.creative.imageHash, 'CREATED_CREATIVE_ASSOCIATION_MISMATCH');
  if (step === 'ad') check(row.campaign_id === ids.campaign && row.adset_id === ids.adset && row.creative?.id === ids.creative, 'CREATED_AD_ASSOCIATION_MISMATCH');
}
function safeError(error) {
  return error instanceof OpsError ? { code: error.code, ...error.details, ambiguous: error.ambiguous } : { code: 'LOCAL_OPERATION_FAILED', ambiguous: false };
}
function journalStore(directory, hash) {
  check(/^[a-f0-9]{64}$/.test(hash), 'MANIFEST_HASH_INVALID');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  check(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.uid === process.getuid(), 'RECEIPT_DIRECTORY_MUST_BE_PRIVATE_OWNED');
  const filename = path.join(directory, `${hash}.json`);
  let fd;
  try { fd = fs.openSync(filename, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600); }
  catch { throw new OpsError('MANIFEST_ALREADY_ATTEMPTED_OR_RECEIPT_UNAVAILABLE'); }
  fs.closeSync(fd);
  return { filename, write(receipt) {
    const temp = path.join(directory, `.${hash}.${crypto.randomUUID()}.tmp`);
    const out = fs.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`); fs.fsyncSync(out); } finally { fs.closeSync(out); }
    fs.renameSync(temp, filename);
    const dir = fs.openSync(directory, fs.constants.O_RDONLY);
    try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
  } };
}
async function executeManifest({ manifest, source, hash, approvedHash, execute = false, env, fetchImpl, receiptsDir = RECEIPTS_DIR }) {
  validateManifest(manifest);
  check(execute === true && approvedHash === hash && /^[a-f0-9]{64}$/.test(hash), 'EXPLICIT_EXECUTION_AND_APPROVED_HASH_REQUIRED');
  check(Buffer.isBuffer(source) && crypto.createHash('sha256').update(source).digest('hex') === hash, 'MANIFEST_HASH_OR_SNAPSHOT_MISMATCH');
  let reviewed;
  try { reviewed = JSON.parse(source.toString('utf8')); } catch { throw new OpsError('MANIFEST_JSON_INVALID'); }
  check(JSON.stringify(reviewed) === JSON.stringify(manifest), 'MANIFEST_HASH_OR_SNAPSHOT_MISMATCH');
  // Execute a private parsed snapshot of the exact approved bytes.
  manifest = validateManifest(reviewed);
  const client = new GraphClient(credential(env, 'manage'), fetchImpl);
  const store = journalStore(receiptsDir, hash);
  const receipt = { schemaVersion: 1, manifestSha256: hash, identity: IDENTITY, graphVersion: GRAPH_VERSION, startedAt: new Date().toISOString(), state: 'preflight', ids: {}, steps: [], activationSupported: false };
  store.write(receipt);
  try {
    await preflight(client, manifest.creative.formId, true);
    for (const step of ['campaign', 'adset', 'creative', 'ad']) {
      const entry = { step, state: 'posting', startedAt: new Date().toISOString() };
      receipt.steps.push(entry);
      receipt.state = 'creating';
      store.write(receipt); // A crash here requires manual reconciliation before another attempt.
      const built = buildStep(step, manifest, receipt.ids);
      const result = await client.post(built.endpoint, built.payload);
      if (!id(result.id)) throw new OpsError('CREATE_RESPONSE_ID_MISSING', {}, true);
      receipt.ids[step] = result.id;
      entry.id = result.id;
      entry.state = 'created';
      store.write(receipt); // Retain the ID even if read-back fails.
      await verifyStep(client, step, result.id, receipt.ids, manifest);
      entry.state = step === 'creative' ? 'verified_asset' : 'verified_paused';
      store.write(receipt);
    }
    receipt.state = 'verifying_all';
    store.write(receipt);
    for (const step of ['campaign', 'adset', 'creative', 'ad']) await verifyStep(client, step, receipt.ids[step], receipt.ids, manifest);
    receipt.finalVerificationAt = new Date().toISOString();
    receipt.state = 'complete_paused';
    receipt.completedAt = new Date().toISOString();
    store.write(receipt);
    return { ok: true, state: receipt.state, manifestSha256: hash, ids: receipt.ids, receipt: store.filename, activationSupported: false };
  } catch (error) {
    receipt.state = error?.ambiguous ? 'ambiguous_manual_reconciliation_required' : 'stopped_manual_review_required';
    receipt.failure = safeError(error);
    receipt.stoppedAt = new Date().toISOString();
    store.write(receipt);
    return { ok: false, state: receipt.state, manifestSha256: hash, ids: receipt.ids, failure: receipt.failure, receipt: store.filename, activationSupported: false };
  }
}
function argumentsFor(argv) {
  let command = 'validate';
  const options = Object.create(null);
  if (argv[0] && !argv[0].startsWith('--')) command = argv.shift();
  check(['validate', 'probe', 'create'].includes(command), 'COMMAND_NOT_SUPPORTED');
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    check(['--manifest', '--approved-sha256', '--execute'].includes(arg), 'OPTION_NOT_SUPPORTED');
    check(!Object.hasOwn(options, arg), 'DUPLICATE_OPTION');
    options[arg] = arg === '--execute' ? true : argv[++i];
    check(options[arg] !== undefined && !String(options[arg]).startsWith('--'), 'OPTION_VALUE_REQUIRED');
  }
  check(command === 'create' || !options['--execute'], 'EXECUTION_ONLY_SUPPORTED_BY_CREATE');
  return { command, options };
}
async function main(argv) {
  const { command, options } = argumentsFor([...argv]);
  if (command === 'probe') return probe(readProtectedEnv());
  check(options['--manifest'], 'MANIFEST_PATH_REQUIRED');
  const loaded = loadManifest(options['--manifest']);
  if (command === 'validate' || options['--execute'] !== true) return { ok: true, mode: 'validated_only', manifestSha256: loaded.hash, identity: IDENTITY, graphVersion: GRAPH_VERSION, networkRequests: 0, activationSupported: false };
  return executeManifest({ ...loaded, approvedHash: options['--approved-sha256'], execute: true, env: readProtectedEnv() });
}
if (require.main === module) {
  main(process.argv.slice(2)).then(result => { process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); if (!result.ok) process.exitCode = 1; }).catch(error => { process.stderr.write(`${JSON.stringify({ ok: false, ...safeError(error) })}\n`); process.exitCode = 1; });
}
module.exports = { IDENTITY, GRAPH_VERSION, FORMS, parseEnv, parseEnvEntries, readProtectedEnv, credential, validateManifest, loadManifest, GraphClient, preflight, probe, buildStep, verifyStep, executeManifest, argumentsFor, OpsError, safeError };
