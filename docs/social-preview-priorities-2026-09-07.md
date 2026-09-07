# Social preview priorities: active ad destinations first

Observed September 7, 2026, approximately 12:23–12:30 a.m. America/Chicago. Ryan confirmed that the active ad destinations to prioritize are **Free Build, Services, Scoreboard, and the workshop**. This overrides the earlier proposal to expand to the ten highest-traffic pages. No broad rollout or application change was made by this worker.

## Actual traffic evidence

Source: read-only aggregate SQL through the Supabase connector against the LeadFlow project `hpzpwfymwfgwspaixrxi`, `public.analytics_events`. The query selected only fixed public paths and returned no names, email addresses, phone numbers, visitor/session identifiers, query strings, or other raw event content.

Window: August 9, 2026, 00:00 America/Chicago through the observation time on September 7. Internal-flagged events are excluded. Last-seven-day figures are a rolling interval ending at query time. These are recorded page loads, not unique people, paid purchases, or proof that the newly launched ads caused them. Repeat page loads count again; unflagged internal activity and unidentified automation may remain.

| Confirmed priority | Recorded page views | Last seven days | Views recorded with paid source | Current preview before replacement |
|---|---:|---:|---:|---|
| `/free-build` | 363 | 32 | 282 | Cream text card; `/og/pages/free-build`; no page-specific art configured |
| `/services` | 14 | 13 | 0 | Cream text card; `/og/pages/services`; no page-specific art configured |
| `/scoreboard` | 12 | 12 | 0 | Cream text card; `/og/pages/scoreboard`; no page-specific art configured |
| `https://workshop.theleadflowpro.com/` | Not separately established | Not separately established | Not separately established | Existing image `/images/workshop-og-sept-17-v1.png`, declared 1731 × 909; metadata describes a blue laptop and orange arrow |

The workshop is a separately hosted page. Its independent traffic was not inferred from main-site path-only aggregates and is not presented as zero. A zero paid-source count on Services or Scoreboard means the selected analytics events did not carry that classification; it is not proof that ads are inactive or had no visitors.

The same bounded query recorded 387 homepage views (130 in the last seven days), but homepage replacement is outside this immediate four-ad-page priority.

## Verified live metadata

All four public pages returned HTTP 200 in direct metadata reads. The first three declared 1200 × 630 social images and pointed to their exact `/og/pages/…` URLs. The workshop declared its own version-1 image and canonical subdomain. These observations describe the pre-replacement metadata, not the release state after root integration.

- [Free Build](https://www.theleadflowpro.com/free-build)
- [Services](https://www.theleadflowpro.com/services)
- [Scoreboard](https://www.theleadflowpro.com/scoreboard)
- [Workshop](https://workshop.theleadflowpro.com/)

## Creative brief by destination

- **Free Build:** a polished, inviting small-business website and real inquiry path. Warm cream, electric blue, restrained red. Make the five-page/$0-build application understandable without implying every associated service is free. The assigned worker owns its final creative.
- **Services:** show the work connecting a website, inquiry, follow-up, and delivery in a tangible professional scene. A distinct composition, not the Free Build image reused. The assigned worker owns its final creative.
- **Scoreboard:** finished cream/oak analytics workspace, monitor, tablet, and tactile views/clicks/leads symbols. Headline “THE WORK. THE NUMBERS.” and subheading “Live business scoreboards”. No invented values, revenue, or promised upward trend. Completed asset and exact prompts: `docs/scoreboard-social-creative-2026-09-07.md`.
- **Workshop:** a welcoming hands-on business learning scene with the September 17 event identity. Preserve the confirmed date, offer, location, and actual host identity. Root owns the final creative and separately hosted page wiring.

Each destination gets a distinct 3840 × 2016 master/export and a directly optimized 1200 × 630 social derivative. If native generator resolution is smaller, label the 4K export as resized rather than claiming native 4K detail.

## Wiring and verification handoff

`withPublicPageMetadata` currently directs general pages to the dynamic OG renderer. `publicOgCard` displays optional art as a 400-pixel inset within a cream text layout. Merely adding finished artwork to `PUBLIC_PAGE_CATALOG.art` would preserve the word-card composition and shrink the new full creative. Root should point metadata at the completed full social image or serve the complete image from its OG route. Dated image filenames support cache separation from the old previews.

After integration, verify the actual published `og:image` and `twitter:image`, image HTTP response, dimensions, MIME type, and rendering for each exact ad destination. Page preview changes do not automatically replace the creative attached to an already published Meta ad. Existing ad creative and destination-link previews are distinct surfaces.

This worker generated and exported the Scoreboard asset, performed the bounded analytics audit, and wrote these notes. It did not change an ad, budget, shared metadata, application code, or production records.
