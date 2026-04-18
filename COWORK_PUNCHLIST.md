# CoWork Punch List — The LeadFlow Pro

**Heads up:** You can't see the Claude Code chat where this plan was built. Work only from this document. If something is unclear, flag it back to Ryan — don't guess.

**Rules of the road:**
1. Do tasks in order. Each one unblocks the next.
2. After every task, paste the result Ryan needs (usually an API key or price ID) into **Vercel → The LeadFlow Pro → Settings → Environment Variables** (select all three envs: Production, Preview, Development).
3. Never paste secrets into email, Slack, or chat. Vercel env vars only.
4. After pasting **any** new env var in Vercel, hit **Redeploy** on the latest production deployment so the new value takes effect.
5. If a site asks for a card, use Ryan's business card tied to **Real Ryan Nichols LLC**.
6. When done, reply in Ryan's ticketing channel with a checklist of what's complete and what's blocked.

---

## Task 1 — Rotate the exposed Stripe test key (DO FIRST)

**Why:** A Stripe test key was pasted in chat and needs to be rotated for hygiene. No money risk but do this first.

1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure the top-left toggle says **Test mode** (orange).
3. Find the **Secret key** row, click the three dots → **Roll key**.
4. Copy the new secret key (starts with `sk_test_...`).
5. Paste into Vercel env var `STRIPE_SECRET_KEY` (overwrite the old value), all three environments.
6. Hit Redeploy on the latest production deployment.

---

## Task 2 — Finish the Stripe webhook

**Why:** Without this, Stripe can't tell our app when a purchase completes. Boosters wouldn't activate.

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**.
3. **Endpoint URL:** `https://the-lead-flow-pro.vercel.app/api/webhooks/stripe`
   *(We'll swap this to www.theleadflowpro.com after DNS is live — see Task 4.)*
4. **Events to send:** click **Select events** and pick:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**.
6. On the endpoint page, find **Signing secret** → click **Reveal** → copy it (starts with `whsec_...`).
7. Paste into Vercel env var `STRIPE_WEBHOOK_SECRET`, all three environments.
8. Redeploy.

---

## Task 3 — Run a real test purchase

**Why:** Confirms the whole Stripe loop works before going live.

1. Open https://the-lead-flow-pro.vercel.app in a private/incognito window.
2. Scroll to the Pricing section, click **Get Starter $5/mo**.
3. On the Stripe Checkout page use the test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g., `12/34`)
   - CVC: any 3 digits (e.g., `123`)
   - ZIP: any 5 digits (e.g., `75601`)
4. Complete checkout. You should land back on `/dashboard/billing?checkout=success`.
5. Go back to Stripe dashboard → https://dashboard.stripe.com/test/payments — you should see a successful `$5.00` payment.
6. Check https://dashboard.stripe.com/test/webhooks → your endpoint → confirm the events show green checkmarks (not red).
7. Report back: screenshot the webhook page with green events.

**If any event is red:** copy the error message and send to Ryan — don't try to fix.

---

## Task 4 — GoDaddy DNS for www.theleadflowpro.com

**Why:** Right now the custom domain shows "Invalid" in Vercel. This fixes it.

1. Log into GoDaddy → My Products → find `theleadflowpro.com` → **DNS**.
2. **Delete** any existing `A` record for `@` and any existing `CNAME` for `www` that don't match below.
3. Add these two records:

   | Type  | Name | Value                  | TTL     |
   |-------|------|------------------------|---------|
   | A     | @    | 76.76.21.21            | 600 sec |
   | CNAME | www  | cname.vercel-dns.com   | 600 sec |

4. Save. DNS propagation takes 10 minutes to 2 hours.
5. Come back to Vercel → The LeadFlow Pro → Settings → Domains. Both `theleadflowpro.com` and `www.theleadflowpro.com` should show a green **Valid Configuration** within 2 hours.
6. Once they're green, go back to Task 2's Stripe webhook and **update the endpoint URL** to `https://www.theleadflowpro.com/api/webhooks/stripe`.

**If still Invalid after 2 hours:** screenshot the GoDaddy DNS page + Vercel domain page and send to Ryan.

---

## Task 5 — Anthropic API key (powers Claude inside the app)

1. Go to https://console.anthropic.com/ → Sign up with Ryan's business email.
2. Verify email.
3. Left sidebar → **API keys** → **Create Key** → name it `leadflowpro-production` → copy the key (`sk-ant-api03-...`).
4. Top of screen → **Plans & Billing** → add Ryan's business card → buy **$20 of credits** to start.
5. Paste the key into Vercel env var `ANTHROPIC_API_KEY`, all three environments.
6. Redeploy.

---

## Task 6 — Twilio (powers SMS outreach)

1. Go to https://www.twilio.com/try-twilio → sign up with Ryan's business email.
2. Verify phone + email.
3. In the Twilio Console dashboard, copy:
   - **Account SID** → Vercel env var `TWILIO_ACCOUNT_SID`
   - **Auth Token** → Vercel env var `TWILIO_AUTH_TOKEN`
4. Left sidebar → **Phone Numbers → Buy a number** → pick a US local number with SMS capability → buy it (~$1.15/mo).
5. Copy the new number → Vercel env var `TWILIO_PHONE_NUMBER` (format: `+19035550100`).
6. Redeploy.

**A2P 10DLC registration:** For business SMS at volume, Twilio will prompt Ryan to register a brand + campaign. Start that process (it takes 1–2 weeks). Use business legal name **Real Ryan Nichols LLC** and brief use case: "Transactional appointment confirmations and lead follow-up for small businesses."

---

## Task 7 — Resend (powers email sending)

1. Go to https://resend.com/signup → sign up with Ryan's business email.
2. Left sidebar → **API Keys** → **Create API Key** → name it `leadflowpro-production` → scope `Full access` → copy the key (`re_...`).
3. Paste into Vercel env var `RESEND_API_KEY`, all three environments.
4. Left sidebar → **Domains** → **Add Domain** → enter `theleadflowpro.com`.
5. Resend will show 3 DNS records (1 MX, 1 TXT, 1 DKIM). **Add all 3 to GoDaddy** (same DNS panel as Task 4).
6. Click **Verify** in Resend after records are in. Takes 10–60 minutes to verify.
7. Redeploy after step 3.

---

## Task 8 — Google Workspace (custom email @theleadflowpro.com)

1. Go to https://workspace.google.com/ → start free trial → pick **Business Starter** ($7.20/user/mo).
2. Use domain `theleadflowpro.com` (already owned in GoDaddy).
3. Create user: `ryan@theleadflowpro.com`.
4. When prompted to verify domain, Google will give a TXT record → add to GoDaddy DNS.
5. For email delivery, add the Google MX records to GoDaddy (Google will list them).
   **Warning:** If you add Google's MX records while also setting up Resend's MX in Task 7, use Google's. Resend only needs the TXT + DKIM records for *sending*, not receiving.
6. Once verified, email Ryan from `ryan@theleadflowpro.com` to confirm it works.

---

## Task 9 — Social OAuth apps (for Connect buttons in the dashboard)

For each platform below, create a developer app named **The LeadFlow Pro**. Use redirect URI:
`https://www.theleadflowpro.com/api/oauth/<platform>/callback`

(Use `https://the-lead-flow-pro.vercel.app/api/oauth/<platform>/callback` if custom domain isn't Valid yet — Task 4.)

**9a. Meta (Facebook + Instagram)**
- https://developers.facebook.com/apps/ → **Create App** → use case **Other** → app type **Business**.
- Add products: **Facebook Login**, **Instagram Graph API**.
- App Dashboard → Settings → Basic → copy **App ID** + **App Secret**.
- Vercel env vars: `META_APP_ID`, `META_APP_SECRET`.

**9b. TikTok**
- https://developers.tiktok.com/apps → **Connect an app** → fill form.
- Copy **Client Key** + **Client Secret**.
- Vercel env vars: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.

**9c. Google (Calendar + Login)**
- https://console.cloud.google.com/ → create project `leadflowpro`.
- APIs & Services → Enabled APIs → enable **Google Calendar API** + **Google People API**.
- Credentials → Create Credentials → OAuth 2.0 Client ID → Web application.
- Authorized redirect URIs: add the callback URL.
- Copy **Client ID** + **Client Secret**.
- Vercel env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

**9d. X (Twitter)**
- https://developer.x.com/en/portal/dashboard → create project + app.
- User authentication settings → OAuth 2.0 → Web App.
- Callback URL: add the URL.
- Copy **Client ID** + **Client Secret**.
- Vercel env vars: `X_CLIENT_ID`, `X_CLIENT_SECRET`.

**For each app, note in your report whether it's in Dev Mode or needs app review.** Most of them need review before working for non-test users — flag these to Ryan; they take 1–4 weeks.

---

## Task 10 — Claim social handles

Claim `@theleadflowpro` (or closest variant) on:
- Instagram
- TikTok
- Facebook Page (named "The LeadFlow Pro")
- X (Twitter)
- YouTube
- LinkedIn Company Page

For each, add profile pic (Ryan's logo — ask him for the file), short bio ("Tools that turn local businesses into lead magnets."), and website link `https://www.theleadflowpro.com`.

Report back with links to each profile.

---

## Task 11 — Stripe Live mode activation

**Only do this after Tasks 1–4 are green and Ryan confirms he wants to accept real money.**

1. Go to https://dashboard.stripe.com/account/onboarding → fill out business info for **Real Ryan Nichols LLC**:
   - EIN (tax ID)
   - Business address
   - Bank account for payouts
   - Ryan's SSN (for identity verification — required for US LLCs)
2. Once activated, flip the Test/Live toggle in Stripe (top right → **Live mode**).
3. Re-run the product/price setup in **Live mode** — Ryan will tell you how; this step needs his involvement.
4. Copy the **Live** secret key + publishable key + webhook signing secret (new webhook endpoint needed for Live mode — repeat Task 2 but with Live toggle on).
5. New Vercel env vars to add:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_...` (from the Live webhook)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
6. Redeploy.

---

## Reporting back

When you're done with a batch, send Ryan:
1. A bulleted list of which tasks above are **✅ complete**, **🟡 in progress**, **🔴 blocked** (with the blocker).
2. Screenshots of:
   - Vercel Environment Variables page showing new vars are saved (blur out the values themselves).
   - Stripe webhook endpoint page showing green events (Task 3).
   - Vercel Domains page showing both domains Valid (Task 4).
3. Any error messages you hit — copy them word for word. Don't paraphrase.

**Never share API keys, secret keys, or passwords in chat/email.** They go into Vercel env vars only.
