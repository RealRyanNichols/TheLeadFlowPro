'use strict';

const READERS = new Set(['ryan', 'pat', 'agent']);

function register(app, { pool, gate }) {
  function reader(req, res, next) {
    if (!READERS.has(req.user)) return res.status(403).json({ error: 'Ads Brain is limited to LeadFlow operators.' });
    next();
  }

  app.get('/ads', gate, reader, (_req, res) => {
    res.set('Cache-Control', 'no-store').sendFile('/opt/brain/public/ads.html');
  });

  app.get('/api/ads', gate, reader, async (_req, res) => {
    const [snapshot, alerts, runs] = await Promise.all([
      pool.query(`SELECT captured_at, payload FROM ads_brain_snapshot ORDER BY captured_at DESC LIMIT 1`),
      pool.query(`SELECT dedupe_key, severity, category, title, detail, first_seen_at, last_seen_at
                  FROM ads_brain_alert WHERE resolved_at IS NULL
                  ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, last_seen_at DESC`),
      pool.query(`SELECT id, started_at, finished_at, ok, mode, account_id, meta_state, leads_seen, error
                  FROM ads_brain_run ORDER BY id DESC LIMIT 20`),
    ]);
    res.set('Cache-Control', 'no-store').json({
      generated_at: new Date().toISOString(),
      snapshot: snapshot.rows[0] || null,
      alerts: alerts.rows,
      runs: runs.rows,
    });
  });
}

module.exports = { register };
