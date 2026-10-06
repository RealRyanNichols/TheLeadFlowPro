# Ads Brain on DigitalOcean

Status: deployed as a read-only LeadFlow observer. The public site and reporting route run on the LeadFlow DigitalOcean droplet.

## Purpose

The Ads Brain joins aggregate Meta delivery data to The LeadFlow Pro's own CRM outcomes. It answers five questions:

1. Are any ads unexpectedly delivering while the spend lock is on?
2. Did the platform count leads that never reached the CRM?
3. Which campaign tags produced leads, first contacts, proposals and recorded wins?
4. Which paid leads still need a first contact or proposal follow up?
5. Is the reporting connection healthy enough to trust the numbers?

It does not create campaigns, change budgets, publish ads, send email, text leads or write to Supabase.

## Security contract

- Exact LeadFlow ad account only: `1637329904238602`.
- Exact LeadFlow business portfolio only: `1154478850201530`.
- Exact LeadFlow Page only: `887023637835514`.
- Premier Dental Academy account `924465906541446` and the old wrong account `1439074857790304` are outside the contract.
- Credentials live only in root-owned mode-600 `/srv/site-env/leadflow.env`, read by systemd into the LeadFlow server runtime. They never appear in dashboard responses or client bundles.
- The droplet signs a short-lived GET request with `/etc/brain/ads_brain_ed25519`. The reporting route stores only the public key in code.
- The reporting route supports one GET path and contains no Meta mutation call.
- The droplet reads LeadFlow through the existing `tlfp_reader` role and stores only aggregate ad intelligence in local Postgres.

## Runtime

| Component | Location |
| --- | --- |
| Signed aggregate source | `/api/ads-brain/pull` in the DigitalOcean LeadFlow runtime |
| Worker | `/opt/brain/ads-brain-worker.js` |
| Private dashboard | `/ads` on the central brain |
| Timer | `ads-brain.timer`, every fifteen minutes |
| Tables | `ads_brain_run`, `ads_brain_snapshot`, `ads_brain_alert` |

The route requires `META_ADS_READ_TOKEN` for ad-account reporting; it does not
substitute the lead-import credential. It preserves `META_PAGE_ACCESS_TOKEN`
for the working lead workflow and derives an exact-Page credential from it
when needed for Page form inventory. If Page inventory fails, account and
Insights reporting remain available with a limited form-inventory warning.

The verified app is LeadFlow Lead Sync (`1595903401874517`) in Business
Portfolio `1154478850201530`. Reporting needs a system-user credential with
`ads_read` and assigned access to ad account `1637329904238602`. Save it as
`META_ADS_READ_TOKEN` in the protected runtime environment, then restart the
LeadFlow service to load it and verify the actual signed reporting endpoint.
Do not copy credentials into dashboard fields, chat, email, or source control.

Private ad creation is a separate workflow using `META_ADS_MANAGEMENT_TOKEN`
with `ads_management`. The observer remains read-only even when a separate
creation client is installed. Every concrete campaign manifest must be reviewed
before a creation test; campaign, ad set and ad must all use `PAUSED` status.
Activation and spending need their own approval. Keep Premier and all other
client identities outside this LeadFlow credential and manifest allowlist.

The reporting Graph version is `v26.0`. The existing lead importer currently
uses `v21.0`; that working path is not upgraded by reporting credential setup.
All three contractor forms (`1410074817946865`, `1149268527613297`,
`2084381329108926`) already belong to the compiled form registry and are polled.
Legacy environment form IDs do not replace the full registry.

## Verification

```bash
systemctl is-active brain-api.service ads-brain.timer
systemctl start ads-brain.service
journalctl -u ads-brain.service -n 30 --no-pager
```

Then sign in to the central brain and open `/ads`. Confirm:

- Spend lock is on.
- Mode is `observe_only`.
- Account is `1637329904238602`.
- Active ad count is zero while Ryan has advertising off.
- Meta lead totals match the live LeadFlow CRM aggregate.
- No lead names, phone numbers or email addresses appear in Ads Brain tables or responses.

## Recovery

The installer takes a timestamped copy of `server.js` before registering the private dashboard. To remove the Ads Brain, disable `ads-brain.timer`, remove the one `require('./ads')` registration, restore the prior `server.js` copy if needed, and restart `brain-api.service`. The three local aggregate tables can remain for audit history or be dropped after an explicit retention decision.
