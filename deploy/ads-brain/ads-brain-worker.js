#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { Client } = require('pg');
const { analyzeAdsBrain, LEADFLOW_ACCOUNT_ID } = require('./ads-brain-logic.cjs');

const SOURCE_URL = process.env.ADS_BRAIN_SOURCE_URL || 'https://www.theleadflowpro.com/api/ads-brain/pull';
const PRIVATE_KEY_FILE = '/etc/brain/ads_brain_ed25519';
const WORKER_ID = 'leadflow-do-ads-brain-v1';

function loadEnvironment() {
  const env = {};
  for (const line of fs.readFileSync('/etc/brain/env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function db(url) {
  return new Client({
    connectionString: url,
    ssl: String(url).includes('supabase') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });
}

async function pullMetaAggregate() {
  if (!fs.existsSync(PRIVATE_KEY_FILE)) return { ok: false, error: 'Droplet signing key is missing.' };
  const url = new URL(SOURCE_URL);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const canonical = `GET\n${url.pathname}\n${timestamp}`;
  const signature = crypto.sign(null, Buffer.from(canonical), fs.readFileSync(PRIVATE_KEY_FILE)).toString('base64');
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Ads-Brain-Worker': WORKER_ID,
        'X-Ads-Brain-Timestamp': timestamp,
        'X-Ads-Brain-Signature': signature,
      },
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: body.error || `LeadFlow source returned HTTP ${response.status}`, detail: body.detail || null };
    if (String(body.identity?.adAccountId || '') !== LEADFLOW_ACCOUNT_ID) {
      return { ok: false, error: 'LeadFlow identity guard rejected the reporting source.', identity: body.identity };
    }
    return body;
  } catch (error) {
    return { ok: false, error: `Meta aggregate pull failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 500) };
  }
}

async function loadLeadMetrics(client) {
  const live = `deleted_at IS NULL AND COALESCE(is_test,false)=false AND source='meta_lead_ad'`;
  const totals = (await client.query(`
    SELECT count(*)::int total,
      count(*) FILTER (WHERE created_at > now() - interval '1 day')::int d1,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int d7,
      count(*) FILTER (WHERE created_at > now() - interval '30 days')::int d30,
      count(*) FILTER (WHERE last_contacted_at IS NULL AND lower(COALESCE(status,'')) NOT IN ('lost','spam','won','paid','customer'))::int uncontacted,
      count(*) FILTER (WHERE lower(COALESCE(status,'')) IN ('proposal','quoted'))::int proposal,
      count(*) FILTER (WHERE lower(COALESCE(status,'')) IN ('booked','appointment'))::int booked,
      count(*) FILTER (WHERE lower(COALESCE(status,'')) IN ('won','closed_won','paid','customer'))::int won,
      count(*) FILTER (WHERE email_unsubscribed_at IS NOT NULL)::int email_opt_outs,
      count(*) FILTER (WHERE sms_unsubscribed_at IS NOT NULL)::int sms_opt_outs,
      COALESCE(sum(expected_value_cents) FILTER (WHERE lower(COALESCE(status,'')) NOT IN ('lost','spam')),0)::bigint open_value_cents,
      max(created_at) newest_at
    FROM public.leads WHERE ${live}`)).rows[0];

  const statuses = (await client.query(`
    SELECT COALESCE(NULLIF(lower(status),''),'unknown') status, count(*)::int leads
    FROM public.leads WHERE ${live} GROUP BY 1 ORDER BY 2 DESC`)).rows;
  const campaigns = (await client.query(`
    SELECT COALESCE(NULLIF(utm_campaign,''), NULLIF(diagnostic->>'source',''), 'unknown') campaign,
      count(*)::int leads,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int leads_7d,
      count(*) FILTER (WHERE last_contacted_at IS NOT NULL)::int contacted,
      count(*) FILTER (WHERE lower(COALESCE(status,'')) IN ('proposal','quoted'))::int proposals,
      count(*) FILTER (WHERE lower(COALESCE(status,'')) IN ('won','closed_won','paid','customer'))::int won,
      COALESCE(sum(expected_value_cents),0)::bigint expected_value_cents,
      max(created_at) newest_at
    FROM public.leads WHERE ${live}
    GROUP BY 1 ORDER BY 2 DESC`)).rows;
  const forms = (await client.query(`
    SELECT COALESCE(NULLIF(diagnostic->>'form_id',''),'unknown') form_id,
      count(*)::int leads,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int leads_7d,
      max(created_at) newest_at
    FROM public.leads WHERE ${live}
    GROUP BY 1 ORDER BY 2 DESC`)).rows;
  const daily = (await client.query(`
    SELECT to_char((created_at AT TIME ZONE 'America/Chicago')::date,'YYYY-MM-DD') date, count(*)::int leads
    FROM public.leads WHERE ${live} AND created_at > now() - interval '35 days'
    GROUP BY 1 ORDER BY 1`)).rows;

  return { totals, statuses, campaigns, forms, daily };
}

async function persist(brain, startedAt, analysis) {
  await brain.query('BEGIN');
  try {
    const metaState = analysis.meta.connected ? 'connected' : 'disconnected';
    const run = await brain.query(`
      INSERT INTO ads_brain_run (started_at, finished_at, ok, mode, account_id, meta_state, leads_seen, error, detail)
      VALUES ($1, now(), true, 'observe_only', $2, $3, $4, $5, $6) RETURNING id`,
      [startedAt, LEADFLOW_ACCOUNT_ID, metaState, Number(analysis.leads.totals.total || 0), analysis.meta.error, {
        active_ads: analysis.meta.connected ? analysis.meta.active_ads.length : null,
        active_campaigns: analysis.meta.connected ? analysis.meta.active_campaigns.length : null,
        alerts: analysis.alerts.length,
      }]);
    await brain.query(`INSERT INTO ads_brain_snapshot (run_id, payload) VALUES ($1,$2)`, [run.rows[0].id, analysis]);

    const keys = [];
    for (const alert of analysis.alerts) {
      keys.push(alert.key);
      await brain.query(`
        INSERT INTO ads_brain_alert (dedupe_key, severity, category, title, detail, first_seen_at, last_seen_at, resolved_at)
        VALUES ($1,$2,$3,$4,$5,now(),now(),NULL)
        ON CONFLICT (dedupe_key) DO UPDATE SET severity=EXCLUDED.severity, category=EXCLUDED.category,
          title=EXCLUDED.title, detail=EXCLUDED.detail, last_seen_at=now(), resolved_at=NULL`,
        [alert.key, alert.severity, alert.category, alert.title, alert.detail]);
    }
    if (keys.length) {
      await brain.query(`UPDATE ads_brain_alert SET resolved_at=now() WHERE resolved_at IS NULL AND NOT (dedupe_key = ANY($1::text[]))`, [keys]);
    } else {
      await brain.query(`UPDATE ads_brain_alert SET resolved_at=now() WHERE resolved_at IS NULL`);
    }
    await brain.query(`DELETE FROM ads_brain_snapshot WHERE captured_at < now() - interval '365 days'`);
    await brain.query(`DELETE FROM ads_brain_run WHERE started_at < now() - interval '365 days'`);
    await brain.query('COMMIT');
    return run.rows[0].id;
  } catch (error) {
    await brain.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const env = loadEnvironment();
  if (!env.BRAIN_URL || !env.TLFP_URL) throw new Error('BRAIN_URL and TLFP_URL are required.');
  const brain = db(env.BRAIN_URL);
  const tlfp = db(env.TLFP_URL);
  await Promise.all([brain.connect(), tlfp.connect()]);
  try {
    const [meta, leads] = await Promise.all([pullMetaAggregate(), loadLeadMetrics(tlfp)]);
    const analysis = analyzeAdsBrain(meta, leads, new Date());
    const runId = await persist(brain, startedAt, analysis);
    console.log(JSON.stringify({
      at: new Date().toISOString(), event: 'ads_brain.completed', run_id: runId,
      mode: analysis.hard_stops.mode, spend_lock: analysis.hard_stops.spend_lock,
      meta_connected: analysis.meta.connected,
      active_ads: analysis.meta.connected ? analysis.meta.active_ads.length : null,
      meta_leads: Number(analysis.leads.totals.total || 0), alerts: analysis.alerts.length,
    }));
  } finally {
    await Promise.allSettled([brain.end(), tlfp.end()]);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ at: new Date().toISOString(), event: 'ads_brain.failed', error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
