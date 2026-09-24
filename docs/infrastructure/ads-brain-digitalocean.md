# Ads Brain on DigitalOcean

Status: deployed as a read only LeadFlow observer. The public site remains on Vercel.

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
- The Meta token remains in the Vercel production runtime. It is never copied to the shared droplet.
- The droplet signs a short lived GET request with `/etc/brain/ads_brain_ed25519`. Vercel stores only the public key in code.
- The Vercel route supports one GET path and contains no Meta mutation call.
- The droplet reads LeadFlow through the existing `tlfp_reader` role and stores only aggregate ad intelligence in local Postgres.

## Runtime

| Component | Location |
| --- | --- |
| Signed aggregate source | `/api/ads-brain/pull` on Vercel |
| Worker | `/opt/brain/ads-brain-worker.js` |
| Private dashboard | `/ads` on the central brain |
| Timer | `ads-brain.timer`, every fifteen minutes |
| Tables | `ads_brain_run`, `ads_brain_snapshot`, `ads_brain_alert` |

The Vercel route uses `META_ADS_READ_TOKEN` for ad-account reporting and
`META_PAGE_ACCESS_TOKEN` for Page lead-form inventory. If the Page-scoped token
is unavailable, campaign, delivery, spend and insight reporting remain live and
the private dashboard raises a limited form-inventory warning.

If Meta returns permission error `#200`, provision a dedicated system-user
token inside Business Portfolio `1154478850201530`, assign read access only to
ad account `1637329904238602`, grant the LeadFlow app `ads_read`, and store the
token as the Vercel secret `META_ADS_READ_TOKEN`. `ads_management` is not needed.
Never copy that credential into `/etc/brain/env` or onto the shared droplet.

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
