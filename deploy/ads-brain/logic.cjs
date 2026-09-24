'use strict';

const LEADFLOW_ACCOUNT_ID = '1637329904238602';

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function withinDays(dateValue, days, nowMs) {
  const at = Date.parse(String(dateValue || ''));
  return Number.isFinite(at) && at >= nowMs - days * 86400000 && at <= nowMs + 86400000;
}

function summarizeInsights(rows, days, nowMs) {
  const selected = (Array.isArray(rows) ? rows : []).filter((row) => withinDays(row.date, days, nowMs));
  return {
    spend: Number(selected.reduce((sum, row) => sum + number(row.spend), 0).toFixed(2)),
    impressions: Math.round(selected.reduce((sum, row) => sum + number(row.impressions), 0)),
    reach: Math.round(selected.reduce((sum, row) => sum + number(row.reach), 0)),
    clicks: Math.round(selected.reduce((sum, row) => sum + number(row.clicks), 0)),
    link_clicks: Math.round(selected.reduce((sum, row) => sum + number(row.link_clicks), 0)),
    platform_leads: Math.round(selected.reduce((sum, row) => sum + number(row.platform_leads), 0)),
  };
}

function analyzeAdsBrain(metaPayload, leads, now = new Date()) {
  const nowMs = now.getTime();
  const metaConnected = !!metaPayload && metaPayload.ok === true;
  const identityMatch = !metaConnected || String(metaPayload.identity?.adAccountId || '') === LEADFLOW_ACCOUNT_ID;
  const campaigns = metaConnected && Array.isArray(metaPayload.campaigns) ? metaPayload.campaigns : [];
  const ads = metaConnected && Array.isArray(metaPayload.ads) ? metaPayload.ads : [];
  const activeCampaigns = campaigns.filter((row) => String(row.effective_status || '').toUpperCase() === 'ACTIVE');
  const activeAds = ads.filter((row) => String(row.effective_status || '').toUpperCase() === 'ACTIVE');
  const insights = metaConnected && Array.isArray(metaPayload.insights) ? metaPayload.insights : [];
  const last7 = summarizeInsights(insights, 7, nowMs);
  const last30 = summarizeInsights(insights, 30, nowMs);
  const leadTotals = leads?.totals || {};
  const uncontacted = number(leadTotals.uncontacted);
  const proposals = number(leadTotals.proposal);
  const won = number(leadTotals.won);
  const alerts = [];

  if (!identityMatch) {
    alerts.push({
      key: 'foreign_ad_account', severity: 'critical', category: 'identity',
      title: 'Foreign ad account rejected',
      detail: `The reporting source returned ${String(metaPayload.identity?.adAccountId || 'no account')}. LeadFlow only allows ${LEADFLOW_ACCOUNT_ID}.`,
    });
  }
  if (!metaConnected) {
    alerts.push({
      key: 'meta_reporting_disconnected', severity: 'warning', category: 'connection',
      title: 'Live Meta reporting is disconnected',
      detail: String(metaPayload?.detail || metaPayload?.error || 'The read only Meta source did not answer.'),
    });
  }
  if (activeAds.length > 0) {
    alerts.push({
      key: 'ads_delivery_active', severity: 'critical', category: 'spend_lock',
      title: `${activeAds.length} ad${activeAds.length === 1 ? '' : 's'} still show active delivery`,
      detail: 'Ryan ordered all advertising off. The brain cannot change delivery, so Ads Manager needs immediate review.',
    });
  }
  if (uncontacted > 0) {
    alerts.push({
      key: 'meta_leads_uncontacted', severity: 'high', category: 'sales',
      title: `${uncontacted} Meta lead${uncontacted === 1 ? '' : 's'} still show no first contact`,
      detail: 'Close the leads already paid for before spending another dollar.',
    });
  }
  if (last7.spend > 0 && number(leadTotals.d7) === 0) {
    alerts.push({
      key: 'spend_without_crm_leads', severity: 'high', category: 'routing',
      title: 'Meta reports spend but the CRM has no Meta leads in the last seven days',
      detail: 'Check the exact form, webhook, Supabase insert, owner alert and duplicate guard before any restart.',
    });
  }
  const routingGap = last30.platform_leads - number(leadTotals.d30);
  if (metaConnected && routingGap >= 2) {
    alerts.push({
      key: 'meta_crm_lead_gap', severity: 'high', category: 'routing',
      title: `${routingGap} platform lead${routingGap === 1 ? '' : 's'} are not matched by CRM rows`,
      detail: 'Platform counts and CRM arrivals need to be reconciled form by form before the data is trusted.',
    });
  }

  const recommendations = [];
  if (activeAds.length > 0) {
    recommendations.push({ priority: 1, action: 'Verify every LeadFlow campaign and ad is off in Meta Ads Manager.', reason: 'The hard spend lock is the first rule.' });
  } else {
    recommendations.push({ priority: 1, action: 'Keep the ads off until a deal closes and Ryan explicitly approves a restart.', reason: 'The current job is conversion, not more traffic.' });
  }
  if (uncontacted > 0) {
    recommendations.push({ priority: 2, action: `Call the ${uncontacted} uncontacted Meta lead${uncontacted === 1 ? '' : 's'} first.`, reason: 'They already raised their hand and have no recorded first contact.' });
  }
  if (proposals > 0) {
    recommendations.push({ priority: 3, action: `Follow up on ${proposals} open proposal${proposals === 1 ? '' : 's'} and ask for the deposit.`, reason: 'A proposal is closer to cash than another impression.' });
  }
  if (won === 0 && number(leadTotals.total) > 0) {
    recommendations.push({ priority: 4, action: 'Record every booked, won, lost and paid outcome in the CRM.', reason: 'The brain cannot learn what sells while outcomes stay blank.' });
  }

  return {
    identity: { ad_account_id: LEADFLOW_ACCOUNT_ID, match: identityMatch },
    hard_stops: {
      mode: 'observe_only',
      spend_lock: true,
      mutate_campaigns: false,
      publish_ads: false,
      send_messages: false,
    },
    meta: {
      connected: metaConnected,
      error: metaConnected ? null : String(metaPayload?.detail || metaPayload?.error || 'Meta reporting unavailable'),
      account: metaConnected ? metaPayload.account : null,
      active_campaigns: activeCampaigns.map((row) => ({ id: row.id, name: row.name, status: row.status, effective_status: row.effective_status })),
      active_ads: activeAds.map((row) => ({ id: row.id, name: row.name, campaign_id: row.campaign_id, status: row.status, effective_status: row.effective_status })),
      campaign_count: campaigns.length,
      ad_count: ads.length,
      forms: metaConnected && Array.isArray(metaPayload.forms) ? metaPayload.forms : [],
      last_7_days: last7,
      last_30_days: last30,
      campaigns,
      ads,
    },
    leads,
    alerts,
    recommendations,
  };
}

module.exports = { LEADFLOW_ACCOUNT_ID, analyzeAdsBrain, summarizeInsights };
