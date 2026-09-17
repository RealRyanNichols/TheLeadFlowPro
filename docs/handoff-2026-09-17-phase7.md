# Phase 7 handoff, September 17, 2026

All nine product and margin engines are built, tested, documented, and
merged to `main` (production on Vercel) at green checkpoints, as Ryan
asked. Nothing was sent, charged, connected, migrated, or priced. Every
engine has a decision entry in `docs/decisions-needed.md` (items 23 to
43) and a page under `docs/engines/`.

## What is live and what it changes in public

| Engine | Merged as | Visible change in production | Live behavior change |
| --- | --- | --- | --- |
| 7.1 Client site factory | PR #56 | Admin-only preview at `/factory/preview/<slug>` | None public |
| 7.2 Ads reporting | PR #57 | `/hq/reports` in the plugin (sample data until an account is connected) | None; live providers off |
| 7.3 Company OS stack | PR #58 | None (library, schema, demo) | None |
| 7.4 Proposal generator | PR #59 | Admin `/admin/proposals/<lead>` and a link on each lead | None public |
| 7.5 Workshop kit | PR #60 | `/events/<slug>/worksheet`, prep checklist on the paid-attendee page | September 17 pages render the same copy from config |
| 7.6 Client scoreboards | PR #61 | Owner view by signed link; opt-in records | Public boards unchanged |
| 7.7 Tool and kit factory | PR #62 | Every tool page's final CTA now opens the free build (or agency intake) instead of `/start` | Yes: 86 tool pages, one CTA each |
| 7.8 Plugin vertical packs | PR #63 | None (draft packs 404) | Three drafts use a trade noun when a lead has no service |
| 7.9 SellerProof generator | this PR | "Fingerprint the original file" on each evidence item; shared fictional sample | Optional field; old drafts parse unchanged |

## How to run each engine

```
npm run factory:new -- --config factory/clients/fixture-fence-co.json
npm run factory:qa -- --config factory/clients/fixture-fence-co.json
npm run stack:demo               # add -- --plan for the provisioning steps
npm run proposal:demo
npm run workshop:check -- --slug chatgpt-for-business-owners-longview
HQ_SECRET=... npm run scoreboard:owner-link -- --business <slug>
npm run tool:new -- --list
npm run plugin:packs
npm run sellerproof:demo
```

Every demo uses fictional data and writes only to the gitignored
`build/` folder.

## What Ryan decides next (short list)

1. Agency prices (decision 3) unblock 7.4 proposals and the agency lane.
2. Approve one backlog item (decision 38) to exercise the tool factory.
3. Pick the first vertical pack to finish (decision 40).
4. Send the scoreboard owner links (decision 37).
5. Confirm the SellerProof price stays (decision 42) and fingerprints over
   uploads (decision 43).
6. Whether the client site factory sells under Website Launch (decision 23).

## Verified at the last checkpoint

- `validate:facts` clean, `check:links` 139 resolve, `validate:tools` OK
- `tsc --noEmit` clean
- `npm test`: 1239 pass, 0 fail
- `npm run build` green

## Not done, on purpose

- No automation activated (workshop follow-up, ads sync, sequences).
- No env variable, DNS, Stripe product, or account connection.
- No migration applied to production (7.2's is on the branch, unapplied;
  7.3's live in the client's project by design).
- No price changed or added beyond TBD placeholders.
