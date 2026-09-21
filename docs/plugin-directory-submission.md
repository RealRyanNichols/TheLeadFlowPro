# Getting the plugin listed in ChatGPT and Claude

Written September 20, 2026. The connector itself works today: anyone on a
paid ChatGPT plan with Developer mode, or a paid Claude plan, can add
`https://www.theleadflowpro.com/api/mcp` as a custom connector, sign in with
OAuth, and use all nineteen tools. What does not exist yet is a listing in
either directory, and a listing is what makes "install the LeadFlow app"
a one-click step for people on free plans. This is the packet and the
order of work.

## What is already true (verified in the repository)

- MCP over streamable HTTP at `/api/mcp`, JSON responses, `GET` answers 405.
- OAuth 2.1 with PKCE, RFC 8414 metadata at
  `/.well-known/oauth-authorization-server`, protected-resource metadata,
  dynamic client registration at `/api/oauth/register`, token endpoint at
  `/api/oauth/token`, consent screen at `/hq/authorize`.
- Nineteen tools, three prompts, four resources (`lib/hq/mcp.ts`). Every
  tool carries the four annotations, and as of this change they are honest:
  `send_message` and `publish_post` are destructive and open-world,
  `update_business_profile` is destructive (it can switch on automated
  texting), the drafting and scheduling tools are idempotent, every
  read-only tool is safe and closed-world.
- Domain verification routes for the ChatGPT directory at both
  `/.well-known/openai-apps-challenge` and `/.well-known/openai-apps`,
  serving `OPENAI_APPS_VERIFICATION_TOKEN` as plain text, 404 until set.
- The privacy policy (`/privacy`) now has a section on the plugin, HQ
  workspaces, the subscriber's lead data, connection credentials, and
  OpenAI and Anthropic as recipients of tool results.
- Install steps on `/plugin/docs` say which plans each assistant needs and
  walk through ChatGPT's Developer mode.

## ChatGPT app directory

Who can do it: only Ryan. The submission lives under his OpenAI
organisation and needs the organisation verified and the Apps management
role.

1. In the OpenAI developer platform, verify the organisation (identity
   check) and confirm the Apps management permission.
2. Open the app submission portal, create the app, name it exactly
   "LeadFlow HQ" (the connector name in `lib/hq/types.ts`), MCP server URL
   `https://www.theleadflowpro.com/api/mcp`, authentication OAuth.
3. Domain verification: the portal issues a token for
   `www.theleadflowpro.com`. Paste it, exactly, into the Vercel environment
   variable `OPENAI_APPS_VERIFICATION_TOKEN` (production), redeploy, then
   open `https://www.theleadflowpro.com/.well-known/openai-apps-challenge`
   in a browser and confirm the body is the token and nothing else. Then
   click Verify in the portal. The portal names the exact path; both
   spellings are served, so whichever it fetches will answer.
4. Fill the listing: description from `lib/pluginDocs.ts` (`PLUGIN_TASKS`
   and `PLUGIN_INCLUDED` are the approved copy), privacy policy
   `https://www.theleadflowpro.com/privacy`, terms
   `https://www.theleadflowpro.com/terms`, support
   `hello@theleadflowpro.com`.
5. Reviewer access: the reviewer needs a workspace with a live plan to
   exercise the write tools. Create a workspace named "OpenAI review" from
   `/login?mode=signup&next=/hq/start`, start the trial, and give the
   reviewer that sign-in. Do not connect a real text line or Facebook Page
   to it; the tools degrade to drafts without them, which is what the
   reviewer should see.
6. Test cases to list, one per tool family: `daily_brief`, `next_calls`,
   `add_lead`, `draft_reply` then `send_message` (expect the consent
   refusal when the lead has no consent), `draft_weekly_content` then
   `approve_content`, `run_calculator`.

## Claude connector directory

Who can do it: only Ryan, and only from a Claude Team or Enterprise
organisation. A Pro or Max account can add the custom connector but cannot
submit to the directory.

1. Decide whether to move the Claude account to Team (decision 47). Without
   it, the Claude path stays "add custom connector by address", which works
   for every paid Claude user today.
2. From the Team organisation's admin settings, submit the connector:
   name "LeadFlow HQ", remote MCP URL as above, OAuth, privacy policy and
   support links as above, and a short description of what each tool does
   and which ones write. The annotations answer the "which ones write"
   question mechanically.
3. Reviewer access as in the ChatGPT section: a review workspace on a live
   plan, no real connections.

## What both reviews will check, and where the answer lives

| Check | Where it is answered |
| --- | --- |
| Tool annotations are truthful | `lib/hq/mcp.ts` `toolAnnotations`, pinned by `tests/hq-mcp.test.ts` |
| Write tools ask before acting | Every send and publish tool requires a prior draft and the owner's word; texts need recorded consent (`lib/hq/consent.ts`) |
| Privacy policy covers the app | `/privacy`, section "The LeadFlow HQ plugin and workspaces" |
| OAuth is standard | `lib/hq/oauth.ts`, RFC 8414 and 9728 metadata routes |
| Data isolation between customers | Row level security on every `hq_*` table (`supabase/migrations/20260912180000_hq_plugin_workspaces.sql`) |
| Support and cancellation | `/plugin/docs#support` and `#billing`; Stripe portal cancellation |

## Not done, on purpose

- No token has been requested or set; the verification paths return 404.
- No submission has been made anywhere. Both portals require Ryan's own
  sign-in and organisation.
- The plugin price and trial are unchanged.
