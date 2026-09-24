# Moving email to Google Workspace

Written September 20, 2026, from the live DNS zone and the repository. Nothing
in this runbook has been executed. Every step is Ryan's to do in the Google
Admin console and GoDaddy, in the order given. The MX change is the one
irreversible-feeling step and it is last.

## The verdict in one paragraph

Go. Email for theleadflowpro.com is on Microsoft 365 bought through GoDaddy
(MX `theleadflowpro-com.mail.protection.outlook.com`, SPF
`include:secureserver.net -all`, DMARC `p=quarantine` reporting to GoDaddy).
That tenant is GoDaddy-managed, which is the thing that keeps blocking
third-party consent screens, and the current SPF does not even include
Microsoft's own senders, so replies Ryan sends by hand from Outlook may be
landing in spam. Google Workspace fixes both, costs about the same, and
comes with the one thing the sales side is missing: a self-serve booking
page (Google Calendar appointment schedules). Nothing in this repository
changes for the move. Resend keeps sending every transactional email from
the five addresses in `lib/site/business.ts`; replies land in Gmail instead
of Outlook.

## What must not change

These records carry the website, the plugin, and every email the
application sends. Do not edit, lower, or delete any of them at any step:

| Record | Value | Why it stays |
| --- | --- | --- |
| A `@` | 76.76.21.21 until the droplet cutover, then the droplet's IP | The production site. Changed only by the site move (`droplet.md`), never by this one |
| CNAME `www` | cname.vercel-dns.com until the droplet cutover, then an A record to the droplet | The production site, same rule |
| A `workshop` | 104.18.22.186, 104.18.23.186 | Separate deployment (Cloudflare) |
| TXT `resend._domainkey` | Resend DKIM | Every lead alert, welcome email, receipt, digest |
| MX `send` | feedback-smtp.us-east-1.amazonses.com | Resend bounce and envelope domain |
| TXT `send` | `v=spf1 include:...spfm.send.theleadflowpro.com` | Resend SPF; the root SPF does not cover subdomains |
| TXT `@` google-site-verification | existing value | Search Console; the Workspace wizard may add a second one, keep both |
| NS | ns57/ns58.domaincontrol.com | Do not move nameservers |

The site move to the droplet (`droplet.md`) and this email move touch
different records. Do them on different days so a problem in one is never
confused with the other.

## Order of operations

1. **Buy Workspace Business Starter, Flexible plan**, for theleadflowpro.com.
   Month to month. Three seats.
2. **Create the users** in Admin console, Directory, Users:
   `hello@`, `ryan@`, `pat@`. Then on the `hello@` user add
   `leadflow@theleadflowpro.com` and `hq@theleadflowpro.com` as alternate
   email addresses (User information, Alternate email addresses). Those two
   are Resend sender addresses in the app (alerts and the plugin); they need
   a home for bounces and replies without paying for two more seats.
   Google's import tool only fills accounts that already exist.
3. **Verify the domain** when the Admin console asks. It issues its own TXT
   record. Add it at GoDaddy as a new TXT on `@`. Do not replace the
   existing google-site-verification record.
4. **Import the old mail** before touching MX: Admin console, Data, Data
   import and export, Data import, Exchange Online. It copies mail, calendar,
   and contacts into the accounts from step 2 and changes nothing on the
   Microsoft side. The connection step wants a Microsoft 365 Global
   Administrator sign-in. GoDaddy-provisioned tenants sometimes refuse that
   consent; if it refuses, ask GoDaddy support to "defederate" the Microsoft
   365 tenant, then retry. Wait for every user to show Complete.
5. **Cut over at GoDaddy** (My Products, Domains, theleadflowpro.com, DNS),
   in one sitting, at a quiet hour:
   - MX `@`: delete the Outlook record. Add `smtp.google.com`, priority 1.
     If the Admin console wizard shows the legacy five-record set instead,
     use exactly what it shows and nothing else. Never mix the two sets, and
     never leave the Outlook record alongside; that splits inbound mail.
   - TXT `@` SPF: edit `v=spf1 include:secureserver.net -all` to
     `v=spf1 include:_spf.google.com ~all`. One SPF record on the root, never
     two.
6. **DKIM**: Admin console, Apps, Google Workspace, Gmail, Authenticate
   email. Generate the record, add TXT `google._domainkey` at GoDaddy with the
   value shown, wait for it to show as found, then click Start
   authentication.
7. **DMARC**: keep `p=quarantine`. Change the `rua=` address to an inbox Ryan
   reads (for example `hello@theleadflowpro.com`) instead of GoDaddy's
   collector. Leave the rest.
8. **Run the checks** below. Do not cancel Microsoft 365 for thirty days.

## Checks, in order

Before the MX change:

- Every import shows Complete; sign in to each Gmail inbox and see old mail.
- Google Admin Toolbox Dig for theleadflowpro.com MX shows only the Outlook
  record (that is the baseline).

Right after the MX and SPF edits:

- Dig MX from two resolvers until both return `smtp.google.com` priority 1
  and no Outlook record. GoDaddy usually clears in under an hour; allow up
  to 48.
- Dig TXT on the root shows the new SPF; an SPF checker reports no errors.
- From an outside mailbox send one message each to `hello@`, `ryan@`,
  `pat@`, `leadflow@`, `hq@`. All five must arrive in Gmail. Any that land
  in Outlook mean propagation is not done: wait, do not edit again.
- Submit the homepage consultation form once with the test flag (a name
  containing "test" so it stays out of the lead counts) and confirm the
  owner alert reaches `hello@` and `pat@` in Gmail and the welcome email
  reaches the test address. That proves Resend still delivers with the
  root SPF changed.
- Send one email from the new `ryan@` Gmail to a personal Gmail, open
  "Show original", and read SPF PASS, DKIM PASS, DMARC PASS.

Day 30:

- Cancel Microsoft 365 in GoDaddy. Before that, confirm OneDrive and
  SharePoint hold no files anyone uses; the import moves mail, calendar,
  and contacts only.

## Rollback

Until step 8 is done, rollback is the reverse of step 5: put the Outlook MX
back at priority 0, restore the old SPF, and mail flows to Microsoft again
within the TTL. Nothing else in the move is destructive. Mail that arrived
in Gmail during the window stays in Gmail.

## What this unlocks

- **The booking page.** In Google Calendar as `ryan@`: Create, Appointment
  schedule, 30 minutes, the weekly window Ryan actually keeps, the booking
  form fields. Business Starter allows one booking page, which is exactly
  one offer: the free consultation. Paste the `https://calendar.app.google/...`
  address into `bookingPage` in `lib/site/external-links.ts`. The
  confirmation screen, the consultation welcome email, and the text-back
  then show it; until then they do not mention it (see
  `tests/booking-link.test.ts`).
- **A clean sender reputation** for the replies Ryan types by hand.
- **One admin console** Ryan controls, which is what the ChatGPT app
  directory and the Meta business verification keep asking for.

## Google sign-in for the admin (after the email move)

The sign-in page already has "Continue with Google Workspace"
(`app/login/LoginForm.tsx`); it needs three settings, all free:

1. **Google Cloud, signed in as the Workspace admin** (console.cloud.google.com):
   create a project "LeadFlow Admin". APIs and Services, OAuth consent screen:
   User type **Internal**. Internal means only accounts inside the
   theleadflowpro.com Workspace can sign in at all; Google enforces it, not
   the app. App name "The LeadFlow Pro", support email `hello@`.
2. Same project, Credentials, Create credentials, OAuth client ID, Web
   application. Authorized redirect URI:
   `https://hpzpwfymwfgwspaixrxi.supabase.co/auth/v1/callback`. Copy the
   client ID and secret.
3. **Supabase dashboard**, the LeadFlow project, Authentication, Sign In /
   Providers, Google: paste the client ID and secret, enable. Under URL
   Configuration, confirm `https://www.theleadflowpro.com/auth/callback` is
   in the redirect list.

Roles do not come from Google. A first sign-in creates the account with the
role set in `public.handle_new_user()`: `ryan@`, `hello@` (and the existing
personal addresses) get admin, `pat@` gets sales, everyone else is a client
(migration `20260924050000_workspace_admin_email.sql`). Test: sign in as
`ryan@theleadflowpro.com` in a private window and land on `/admin`.

## The brain reads Gmail, Calendar and Drive (next phase)

Plan, not built yet. It needs the email move done and the brain's code in a
repository a session can work on (today it lives only in `/opt/brain` on the
droplet).

- **Access:** a Google Cloud service account in the same project with
  domain-wide delegation, read-only scopes only:
  `gmail.readonly`, `calendar.readonly`, `drive.readonly`. Granted in Google
  Admin, Security, API controls, Domain-wide delegation. Nothing can send,
  delete, or share. Free.
- **Where it runs:** a container next to the brain on the droplet, on a
  schedule, writing into the brain's own database. No new paid service.
- **What it pulls first:** calendar events (who booked, when), mail threads
  with leads (matched by email address to the CRM, so the brain stops
  guessing who was answered), and Drive file names and links for client
  folders. Message bodies stay in Gmail unless a later decision says
  otherwise.
- **Needs Ryan:** push `/opt/brain` to a private GitHub repository so the
  work can be reviewed and redeployed, and approve the scopes above.

