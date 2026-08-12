# Tools analytics

## Platforms

The tool library uses the analytics already on the site: Vercel Analytics for
product events and `gtag` for ad conversions. No second analytics platform was
added.

`lib/tools/analytics.ts` is the only place tool events are sent from.

## The privacy rule

Never send what somebody typed.

A calculator input is somebody's revenue, their payroll, their household budget,
their debt balance or their patient volume. Events carry the tool slug, the
preset they picked, and coarse counts. That is enough to know which tools earn
their place and which searches come up empty.

This is enforced rather than remembered: `trackTool` drops any property whose key
is not on an allowlist, and truncates every string to 60 characters. A future
caller cannot accidentally pipe a field value into analytics, because the key
would not be on the list.

The one free-text exception is the search term, because a search that returns
nothing is a tool request. It is lowercased, trimmed, truncated, only sent once
the user stops typing, and never sent for queries under two characters.

## Events

| Event | Fires when |
| --- | --- |
| `tools_directory_view` | the library loads |
| `tool_search` | a search returns results |
| `tool_search_no_results` | a search returns nothing, which is a build request |
| `tool_filter_applied` | a facet chip or the finder is used |
| `tool_card_opened` | a card is opened from the grid |
| `tool_started` | the first input on a tool is changed |
| `tool_completed` | a result is downloaded, which is the honest completion signal |
| `tool_preset_applied` | an industry preset is chosen |
| `tool_result_copied` | copy result or copy output |
| `tool_result_downloaded` | any download, with `format` of txt, csv, png, svg or ics |
| `tool_result_printed` | print or save as PDF |
| `tool_result_emailed` | the email form is submitted |
| `embed_requested` | the embed panel is opened |
| `embed_code_copied` | the snippet is copied |
| `industry_collection_viewed` | a collection is opened from the directory |
| `tool_request_submitted` | the empty state's text-me action is used |
| `map_my_company_clicked` | the conversion call to action is used |

## Allowed properties

`slug`, `preset`, `domain`, `toolType`, `industry`, `audience`, `goal`,
`collection`, `sort`, `filter`, `results`, `terms`, `length`, `format`,
`surface`, `position`, `reason`.

Anything else is dropped silently rather than sent.

## Conversion

Calls to action appear after value has been delivered, not before it. A tool page
shows its result, its explanation, its assumptions and its disclaimer before it
mentions building anything. There is one closing call to action per page and one
contextual offer inside the embed panel. Tool pages are not sales pages.
