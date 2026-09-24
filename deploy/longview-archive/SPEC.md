# Longview Business Archive: engineering spec

This is the contract every module is built against. The runbook for operators is
`README.md`. The plain-language plan and log are in `docs/longview-directory/`.

## What it is

Two halves with one contract between them.

1. **The archive engine** (`deploy/longview-archive/`, Python 3.10+, standard
   library only). It runs 24/7 on the LeadFlow droplet as the systemd service
   `longview-archive` (user `lvarchive`). It ingests public open data, reads
   business websites politely, keeps a sourced SQLite archive, serves a private
   noindex status page, and writes a **publish export**: one JSON file that holds
   only publishable businesses and publishable fields, each fact with its source
   and the date it was checked.
2. **The public directory** (`app/longview/businesses/`, `lib/longviewDirectory/`)
   on theleadflowpro.com. It renders from the committed publish export at
   `content/longview-directory/directory.json`. A new batch reaches the website
   only through a pull request, so merging the pull request is the approval.

Nothing in the engine contacts a business, sends a message, or writes to any
CRM, email list, or ad audience.

## Hard rules (every module)

- **Businesses only.** Never publish, log, or export a person's name. The
  taxpayer name from the Comptroller is private: it is stored in `raw_json` and
  used only for privacy checks. Only the outlet/trade name is ever displayed.
- **Never invent.** A missing field is `null` and the page shows an honest
  fallback. No guessed am/pm, no assumed "closed", no guessed domains.
- **Fill only, never overwrite.** A verified fact is never replaced by a
  different value; the conflict goes to the review queue.
- **Contact details come only from the business's own website.** Phone and email
  are published only when found on the business's own site. Emails must be a
  generic office local part on the site's own registrable domain.
- **Websites come only from** the business's own records (JSON-LD `url`), OSM
  `website`/`contact:website` tags, NPI or TABC records. Never guess a domain.
- **No third-party ratings, reviews, photos, or copied paragraphs.** Service tags
  come from a controlled vocabulary matched against the business's own headings
  and menus.
- **Logs** go to stdout/stderr (journald). They carry `public_id`, host names,
  counts, and error classes. Never raw rows, taxpayer names, emails, or phones.
- **SSRF guard.** The crawler runs next to a CRM on the same droplet. It refuses
  any URL whose host resolves to a loopback, private, link-local, multicast,
  reserved, or unspecified address, any port other than 80/443, and any scheme
  other than http/https. The check runs on every redirect hop.

## Paths and settings (`longview_archive/config.py`)

`Settings` is a frozen dataclass built by `load_settings(env=os.environ)`.
Defaults are production values; every one can be overridden by an `LVA_*`
environment variable so tests never touch real paths or the network.

| Setting | Default | Env |
| --- | --- | --- |
| `data_dir` | `/var/lib/longview-archive` | `LVA_DATA_DIR` |
| `db_path` | `{data_dir}/db/archive.db` | derived |
| `www_dir` | `{data_dir}/www` (served by Caddy) | derived |
| `backup_dir` | `{data_dir}/backups` | derived |
| `export_dir` | `{data_dir}/exports` (private, 0700) | derived |
| `pause_file` | `{data_dir}/PAUSE` | derived |
| `user_agent` | `LeadFlowPro-LongviewArchive/1.0 (+https://www.theleadflowpro.com/longview/businesses/about; hello@theleadflowpro.com)` | `LVA_USER_AGENT` |
| `max_sites_concurrent` | 2 | `LVA_MAX_SITES` |
| `min_host_delay_s` | 20.0 | `LVA_MIN_HOST_DELAY` |
| `max_pages_per_visit` | 6 | `LVA_MAX_PAGES` |
| `max_page_bytes` | 2_500_000 | `LVA_MAX_PAGE_BYTES` |
| `request_timeout_s` | 20.0 | `LVA_TIMEOUT` |
| `backoff_days` | (1, 3, 7, 14) | |
| `reverify_days` | 30 | |
| `open_data_sync_days` | 7 | |
| `osm_sync_days` | 7 | |
| `robots_ttl_s` | 86400 | |
| `disk_guard_bytes` | 5 GiB | `LVA_DISK_GUARD_BYTES` |
| `status_every_s` | 600 | `LVA_STATUS_EVERY` |
| `publish_every_s` | 2700 (45 min) | `LVA_PUBLISH_EVERY` |
| `backup_keep` | 14 | |
| `backup_local_time` | `03:30` America/Chicago | |
| `socrata_base` | `https://data.texas.gov` | `LVA_SOCRATA_BASE` |
| `overpass_url` | `https://overpass-api.de/api/interpreter` | `LVA_OVERPASS_URL` |
| `npi_url` | `https://npiregistry.cms.hhs.gov/api/` | `LVA_NPI_URL` |
| `allow_private_hosts` | False (tests only) | `LVA_ALLOW_PRIVATE_HOSTS=1` |
| `publish_scopes` | `("city",)` | |
| `indexable` | False (global switch, see decisions) | `LVA_INDEXABLE=1` |

Constants in `config.py`: `LONGVIEW_ZIPS = ("75601","75602","75603","75604","75605")`,
`EAST_TEXAS_AREA_CODES = ("903","430")`, `TIMEZONE = "America/Chicago"`,
`CONTACT_EMAIL = "hello@theleadflowpro.com"`,
`DIRECTORY_URL = "https://www.theleadflowpro.com/longview/businesses"`,
`VERSION`.

## Storage (`longview_archive/db.py`)

SQLite, WAL mode, `foreign_keys=ON`, `busy_timeout=5000`. `connect(path)` opens
and `migrate(conn)` creates/updates the schema (idempotent; version in `meta`).
All timestamps are UTC ISO-8601 strings with `Z` (`db.now_iso()`); local dates
for display are computed at export time in America/Chicago. JSON columns hold
`json.dumps(..., sort_keys=True, separators=(",", ":"))`.

The schema is in `db.py` and is the source of truth. Summary:

- `meta(key, value)`: schema version, heartbeat, last job times.
- `sources(id, name, publisher, license, terms_url, dataset_id, dataset_url,
  columns_json, last_synced_at, last_status, last_error, row_count)`: one row per
  source: `tx_sales_tax`, `tx_tabc`, `osm`, `npi`, `website`.
- `source_records`: raw rows plus a normalized projection used for matching.
  Unique on `(source_id, source_key)`. `business_id` links to the canonical
  business once matched. `raw_json` is private and is never exported.
- `businesses`: one row per physical location. Identity (`public_id`, `slug`,
  `name`, normalized keys, address, `zip`, `scope`, `naics`, `category`,
  `permit_start`, `is_individual`), website candidate and crawl state, and
  publish state (`publish_state`, `publish_reason`).
- `facts`: the accepted value per `(business_id, field)` with provenance
  (`source_id`, `source_url`, `method`, `confidence`, `first_observed_at`,
  `checked_at`). Website-derived fields live here.
- `observations`: every value seen, per `(business_id, field, value_hash,
  source_url)`, with `first_observed_at`/`last_observed_at`.
- `merges`: why a source record was joined to a business (`rule`,
  `evidence_json`, `explanation`).
- `categories(slug, name, sort_order)` and `category_naics(prefix, slug,
  label)`: NAICS prefixes to friendly categories (longest prefix wins).
- `review_queue`: anything uncertain (`kind`, `field`, `proposed_json`,
  `current_json`, `source_url`, `detail`, `status`). Deduplicated on
  `(business_id, source_record_id, kind, field, proposed_hash)`.
- `hiring_signals(business_id, careers_url, roles_json, first_seen_at,
  last_seen_at, active)`.
- `suppressions(kind, value, reason, created_at, note)`: `kind` is `public_id`,
  `domain`, `phone`, or `name_zip`. Honored at ingest, crawl, and export.
- `host_state(host, robots_txt, robots_status, robots_fetched_at,
  last_request_at, backoff_level, backoff_until, blocked_reason)`.
- `runs(kind, started_at, finished_at, status, counts_json, error)`.

Field names used in `facts` / `observations` / `review_queue.field`:
`website`, `phone`, `email`, `hours`, `facebook`, `instagram`, `careers`,
`services`, `address_listed`, `name_on_site`.

## Modules and their contracts

### `normalize.py`
- `norm_name(s) -> str`: casefold, `&`→`and`, strip punctuation, drop legal
  suffixes (llc, l l c, inc, incorporated, corp, corporation, co, company when
  trailing, ltd, lp, llp, pllc, pc, pa, dba and everything before it when the
  form is `X DBA Y` keeps `Y`), drop a leading `the`, collapse whitespace.
- `name_tokens(s) -> set[str]` distinctive tokens (stop words removed).
- `name_similarity(a, b) -> float` in [0,1]: max of token Jaccard and
  `difflib.SequenceMatcher` ratio on normalized names; 1.0 when one normalized
  name contains the other and the shorter has at least 2 tokens.
- `parse_street(line) -> (street_norm, suite)`: uppercase-insensitive USPS
  normalization (suffixes `street→st`, `avenue→ave`, `road→rd`, `drive→dr`,
  `boulevard→blvd`, `highway|hwy|us highway|us hwy|u s hwy|state highway|state hwy|sh→hwy`,
  `parkway→pkwy`, `lane→ln`, `circle→cir`, `court→ct`, `place→pl`,
  `trail→trl`, `freeway→fwy`, `expressway→expy`, `farm to market|farm-to-market|f m→fm`,
  directionals `north→n` etc.), unit designators (`suite|ste|unit|#|apt|bldg|building|rm|room|space|spc`)
  split into `suite` (normalized to the bare unit id). Returns lowercase.
- `display_street(line) -> str`: tidy title-case street for display
  (`1200 W Example Ave Ste 4`), keeping USPS abbreviations uppercase-first.
- `norm_phone(s) -> str|None`: NANP validation (area and exchange codes cannot
  start with 0/1; 555-01xx is valid only in tests via `allow_fictional=True`),
  returns E.164 `+1XXXXXXXXXX` or None.
- `display_phone(e164) -> "(903) 555-0100"`.
- `norm_url(u) -> str|None`: http/https only, lowercase host, strip fragment,
  strip tracking params (`utm_*`, `fbclid`, `gclid`), default path `/`.
- `registrable_domain(host) -> str`: last two labels, or last three when the
  last two are a known two-level public suffix (`co.uk`, `com.au`, `k12.tx.us`,
  `tx.us`, ...). `www.` is ignored.
- `slugify(s) -> str`: ASCII, lowercase, hyphens, max 80 chars.
- `zip5(s) -> str|None`.

### `categories.py`
- `CATEGORIES`: ordered list of `(slug, name)`: `restaurants` Restaurants & Food,
  `auto` Auto, `health-dental` Health & Dental, `beauty` Beauty & Personal Care,
  `home-services` Home Services, `retail` Retail & Shopping,
  `professional` Professional Services, `faith-community` Faith & Community,
  `lodging-recreation` Lodging, Arts & Recreation, `education-childcare`
  Education & Childcare, `industrial` Industrial, Wholesale & Transport,
  `other` Other Services.
- `NAICS_MAP`: prefix → (slug, label). Longest prefix wins; unknown → `other`.
- `categorize(naics: str|None, osm_tags: dict|None=None) -> (slug, label)`.
- `seed(conn)`: writes both tables.

### `privacy.py`
- `is_individual_taxpayer(taxpayer_name, org_type) -> bool`. `org_type` text
  containing `individual`/`sole` is decisive; otherwise the name has no
  organization marker (llc, inc, corp, co, company, ltd, lp, llp, pllc, pc, pa,
  trust, church, association, assn, partnership, partners, group, holdings,
  enterprises, ministries, foundation, district, city of, county, state of,
  university, college, school, club, society, cooperative, coop) and looks like
  a person (`LAST, FIRST M` or two to four alphabetic tokens).
- `looks_like_person_name(name) -> bool`: `LAST, FIRST` form, or 2–3
  alphabetic tokens with no business word and at least one token in the
  embedded common given-name list.
- `outlet_is_personal_name(outlet_name, taxpayer_name, is_individual) -> bool`:
  only for an individual taxpayer. Both names are compared as tokens with
  hyphens split and generational suffixes (jr, sr, ii, iii, iv, v) and
  single-letter initials dropped. Personal when the outlet's tokens are a
  subset of the taxpayer's; or, when the outlet has no business word, when it
  shares at least two tokens with the taxpayer's name or is 2–4 purely
  alphabetic tokens; or when `looks_like_person_name(outlet_name)`. This is
  deliberately conservative: holding back a business with no public presence
  is the safe failure.
- `has_public_presence(conn, business_id) -> bool`: a verified own website
  (fact `website` present), or a linked `osm`, `tx_tabc`, or `npi` record.
- `address_is_public(conn, business_id) -> (bool, evidence)`: true only with
  positive storefront evidence: fact `address_listed` (a line on the site has
  the house number immediately followed by the street), a linked TABC or NPI
  record at the same street, a linked OSM storefront at the same street, or a
  storefront NAICS with a non-individual taxpayer. Otherwise the page shows
  "Longview, TX" only.
  - `osm_is_storefront(tags)`: an OSM record counts only when its tags describe
    a public-facing premises: `shop=*`; `amenity` in restaurant, fast_food,
    cafe, bar, pub, biergarten, ice_cream, food_court, bank, pharmacy, fuel,
    car_wash, car_rental, cinema, theatre, nightclub, hospital, clinic,
    dentist, doctors, veterinary; `tourism` hotel or motel; `leisure`
    fitness_centre, sports_centre, bowling_alley. Never `craft=*`,
    `office=*`, `healthcare=*` alone, childcare, kindergarten, place_of_worship,
    driving_school, dojo, or guest_house (often mapped at a home).
  - `storefront_naics(naics)`: `STOREFRONT_NAICS_PREFIXES` lists only
    establishments that cannot reasonably be run from a home: 721110 hotels,
    622 hospitals, 447/457110/457120 gas stations, 445110 supermarkets,
    44512/445131 convenience stores, 4521/452210/452311/455110/455211
    department stores and warehouse clubs, 4411 car dealers, 811192 car
    washes, 5221 banks and credit unions, 512131 cinemas, 71395 bowling,
    722511 full-service restaurants, 7224 bars. Salons, barbers, auto repair,
    limited-service restaurants and the broad retail subsectors (NAICS 2022
    moved online and home sellers into 449 and 455–459) need another signal.
  - `premises_record(rec, street_norm)`: the per-record test above (TABC/NPI
    at the street, or an OSM storefront at the street).
- `generic_email_ok(email, site_domain) -> bool`: local part in the generic
  allowlist (info, office, contact, hello, frontdesk, front.desk, reception,
  appointments, appts, scheduling, service, services, sales, support, orders,
  order, bookings, booking, reservations, care, team, mail, inquiries,
  inquiry, help, admin, customerservice, custserv, events, catering, jobs,
  careers, hr, billing, parts) and the registrable domain equals the site's.
- `is_suppressed(conn, business) -> bool`.
- `PRIVATE_FIELDS`: fields that never leave the engine (`taxpayer_name`,
  `raw_json`, authorized officials, NPI individual names).

### `matching.py`
- `match_record(conn, source_record_id) -> MatchResult(action, business_id,
  rule, explanation)` where `action` is `matched`, `created`, `review`, or
  `ignored`. Rules, in order:
  1. Existing link by `(source_id, source_key)`: update in place. The
     business's identity source is its first ACTIVE linked primary record by
     source priority (`tx_sales_tax`, `tx_tabc`, `npi`), then `source_key`.
     When the changed record is the identity source, the business follows its
     current name/`name_norm`, street/`street_norm`/suite, ZIP and
     NAICS/category (non-empty values only; slug and public_id never change;
     `permit_start` keeps the earliest sales-tax date), the `address_listed`
     fact is deleted when the street changed (it vouched for the old street),
     and a review `identity_changed` (field `name` and/or `address`, proposed =
     new, current = old) is queued for visibility; it does not block
     publishing. A changed record that is not the identity source and now
     disagrees (name similarity below 0.6, or another street) queues
     `source_conflict` and changes nothing. Values are never logged.
  2. Same phone (E.164) and addresses do not conflict (same `street_norm`+`zip`,
     or one side has no street): merge, rule `same_phone`. Same phone but a
     different street: review (`merge_ambiguous`, chain or shared line).
  3. Same `street_norm` + `zip` (+ same `suite` when both have one) and
     `name_similarity >= 0.6`: merge, rule `same_address_similar_name`.
  4. Same website registrable domain and same address: merge, rule
     `same_domain_same_address`.
  5. Same address with similarity in [0.4, 0.6): review.
  6. Otherwise create a new business (only for primary sources:
     `tx_sales_tax`, `tx_tabc`, `npi`). An unmatched `osm` record creates a
     business with `publish_state='review'` and reason `osm_only_needs_primary_source`.
     When a primary record later joins it, the primary record's name,
     `name_norm`, street, `street_norm`, suite, ZIP, NAICS and category replace
     the OSM values (lat/lon are kept only when the primary has none) and the
     slug is rebuilt from the new name; the public_id is kept. This is safe
     because an OSM-only business was never exported.
- Chains: same name at different streets are separate businesses.
- Every merge writes a `merges` row whose `explanation` is a plain sentence,
  e.g. "Joined because both records list +19035550100 at 1200 w example ave."
- `match_pending(conn) -> counts`.
- `assign_identity(conn, business_id)`: `public_id = "lv-" + base32(sha256(first
  source_id:source_key))[:10].lower()`, and a unique slug `slugify(name)` (set
  once; only the OSM-only confirmation above clears and rebuilds it),
  then `-{street slug}`, then `-{public_id suffix}` on collision. Reserved slugs:
  `about`, `new`, `hiring`, `category`, `page`, `search`, `status`.

### `sources/` (open data)
- `sources/http.py`: `get_json(url, settings, params=None, data=None)`
  with the archive user agent, 60 s timeout, 1 request/second per API host, 3
  retries with backoff on 429/5xx. Tests inject a transport.
- `sources/socrata.py`: `discover_dataset(settings, query, name_pattern,
  required_columns) -> DatasetInfo(id, name, url, license, columns, updated_at)`
  via `{base}/api/catalog/v1?q=...&only=dataset` then `{base}/api/views/{id}.json`
  for columns and license. Never hard-code a dataset ID. `fetch_rows(settings,
  dataset_id, where, order=":id", page_size=5000)` pages with `$limit`/`$offset`.
- `sources/comptroller.py`: `sync_sales_tax(conn, settings) -> counts`. Field map
  with candidates (`outlet_name`; `outlet_address`; `outlet_city`;
  `outlet_zip_code|outlet_zip`; `outlet_naics_code|naics_code`;
  `outlet_permit_issue_date|outlet_first_sales_date|permit_issue_date`;
  `taxpayer_number`; `outlet_number`; `taxpayer_name`;
  `taxpayer_organizational_type|taxpayer_organization_type`;
  `outlet_inside_outside_city_limits_indicator|outlet_inside_outside_city_limits`).
  Required: name, address, city, zip, taxpayer_number, outlet_number. A missing
  required column raises `SchemaMismatch` with the discovered column list; the
  run is recorded as `error` and nothing is guessed. Filter: `upper(city) =
  'LONGVIEW'`. Scope: `city` when inside-city-limits says inside (or the
  indicator is absent and the ZIP is in `LONGVIEW_ZIPS`), `nearby` when the
  indicator says outside or the ZIP is another one. Rows no longer present are
  marked `active=0` (their business becomes inactive only when no active record
  remains).
- `sources/tabc.py`: optional TABC licenses, same discovery pattern; skipped
  with a recorded note when no dataset matches.
- `sources/osm.py`: Overpass query for the Longview city boundary
  (`admin_level=8`, inside Texas) for `shop`, business `amenity` values,
  `office`, `craft`, `healthcare`, lodging `tourism`, and selected `leisure`.
  `out center tags;`. Records carry attribution "© OpenStreetMap contributors,
  ODbL". OSM names, addresses, and phones are never published; OSM is used to
  discover and cross-check and to learn a website.
- `sources/npi.py`: NPPES API v2.1, `enumeration_type=NPI-2`, city LONGVIEW,
  state TX, per ZIP; when a query hits the 1,200-result ceiling, split by
  `organization_name` two-letter prefixes. Uses the LOCATION address only.
  Authorized-official names stay in `raw_json`.
- Each sync records `sources` metadata, one `runs` row, and upserts
  `source_records` (license and fetch time on every row).

### `fetcher.py` (the polite fetcher)
- `PoliteFetcher(settings, transport=None, clock=time.monotonic,
  wall_clock=time.time, sleep=time.sleep, resolver=socket.getaddrinfo)`. Host
  state (spacing, robots cache, backoff) lives in memory; the main thread moves
  it to and from `host_state` with `export_host_state()` / `import_host_state()`
  (see `worker.load_host_state` / `persist_host_state`).
- `fetch(url) -> FetchResult(url, final_url, status, headers, body: bytes,
  text: str|None, content_type, error: str|None, blocked: str|None,
  redirected_offsite: bool)`.
- Enforces: robots.txt (`urllib.robotparser`, cached per host for 24 h and
  persisted through the main thread; 401/403 robots → disallow all, other 4xx →
  allow all; 5xx/timeout → disallow all for that day); at least `min_host_delay_s` between requests to the same host
  (robots fetch counts), thread-safe; `request_timeout_s`; `max_page_bytes`
  (streamed read, abort beyond cap, also for gzip-decoded size); only
  `text/html` and `application/xhtml+xml` bodies are decoded; manual redirects
  (max 5) with the SSRF and robots checks on every hop.
- Classification: 429 or 503 → `backoff` (host `backoff_level` increments,
  `backoff_until = now + backoff_days[level]`); Cloudflare/Sucuri/Incapsula/
  Akamai challenge (`cf-mitigated: challenge`, "Just a moment...",
  `cf-chl`, "Attention Required", "Incapsula incident", "Sucuri WebSite
  Firewall") → `blocked` (move on; never retry around it); DNS/connection
  failure → `dead`; robots disallow → `blocked` with reason `robots`.
- Never sends cookies, never runs JavaScript, never submits forms, never logs in.

### `extract/`
- `extract/html.py`: `parse_page(html, base_url) -> Page(title, lines,
  headings, links: list[Link(url, text, rel)], jsonld: list[dict], meta: dict,
  nav_texts)`. `html.parser` based. Skips script/style/noscript/template/svg/
  iframe text; block elements break lines; JSON-LD parsed from
  `application/ld+json` scripts (lists and `@graph` flattened).
- `extract/hours.py`: `hours_from_jsonld(items) -> HoursResult` and
  `hours_from_lines(lines) -> HoursResult`. `HoursResult(hours: dict|None,
  issues: list[str], confidence: float)`. `hours` maps `mon..sun` to a list of
  `["HH:MM","HH:MM"]` pairs (24 h; close `"24:00"` allowed; close earlier than
  open means past midnight); an explicitly stated closed day is `[]`; a day not
  stated is absent. Strict: times need am/pm or 24-hour form; `8-5` style
  ranges raise the issue `ambiguous_ampm` and return `hours=None`; lunch notes
  → `lunch_break`; more than one distinct hours block (multiple locations) →
  `multiple_blocks`; appointment-only → `by_appointment`; JSON-LD 00:00–00:00
  (which some sites use to mean closed) → `ambiguous_all_day`; a line that states
  hours in a form the parser cannot read exactly → `unparsed`. Any issue sends
  the candidate to review instead of facts.
- `extract/contacts.py`: `phones(page, allow_fictional=False) -> list[(e164,
  method, confidence)]` (`tel:` links first, then text), `emails(page,
  site_domain) -> list[(email, method, confidence)]` (mailto and text; generic + same domain only; others are
  dropped, never stored).
- `extract/social.py`: `social_links(page, business_name, site_domain) ->
  list[SocialCandidate(network, url, handle, matches: bool, reason)]` for
  facebook and instagram. Ignores share/sharer/plugins/tr/dialog links and the
  platform's own pages. `matches` is true only when the handle shares a name
  token of 4+ letters that is not a generic category, place, or brand word
  (`GENERIC_HANDLE_WORDS`), or contains the whole domain label.
- `extract/careers.py`: `careers_links(page) -> list[url]` (link text or path
  matching careers, jobs, employment, join our team, now hiring, we're hiring,
  work with us, openings; "apply" only when the text or path also names jobs,
  careers, employment, hiring, positions, or openings; or a known
  applicant-tracking host) and `roles_on_page(page) -> list[str]` flags:
  `front_desk`, `office_manager`, `medical_assistant`, `dental_assistant`,
  `receptionist`.
- `extract/services.py`: `service_tags(page, category) -> list[str]`: phrases
  (a phrase in a negated clause such as "No delivery" is skipped)
  from the controlled `VOCABULARY` (per category plus shared) found in headings,
  nav texts, and short list items (≤ 60 chars). Never free text.
- `extract/identity.py`: `site_matches_business(pages, business_name,
  street=None, phone=None) -> (matches, reason, address_listed)`: distinctive name tokens in title / og:site_name / h1 / JSON-LD
  name, or the domain label contains them, or the site lists the business's
  street number and street. Also returns `address_listed` evidence.

### `facts.py` (fill-only rules)
- `observe(conn, business_id, field, value, source_id, source_url, method,
  confidence, observed_at=None) -> str` records an observation and returns one
  of `accepted` (new fact), `confirmed` (same value, `checked_at` bumped),
  `review` (conflict, low confidence, or flagged), `rejected`.
- Values are compared canonically (phones E.164, URLs normalized, hours dicts
  sorted, service lists sorted).
- Confidence floor for acceptance is 0.8. `jsonld` and `tel_link` are 0.95,
  `mailto` 0.9, text 0.8, anything flagged by an extractor goes to review.
- `accept_review(conn, review_id, actor)` / `reject_review(conn, review_id,
  actor)`: the human path. Accepting a conflict replaces the fact and records
  who did it.

### `worker.py` (the website worker)
- `due_businesses(conn, settings, now, limit) -> list[BusinessSnapshot]`:
  website known, not suppressed, `next_crawl_at <= now`, host not in backoff,
  scope in city or nearby.
- `visit(snapshot, fetcher, settings) -> VisitResult` (network only, no DB):
  home page, then up to 5 more same-site pages ranked contact > hours >
  locations > about > careers > services/menu. Runs extractors.
- `apply_visit(conn, snapshot, result, settings, now)`: writes observations and
  facts through `facts.observe`, hiring signals, website status, next crawl time
  (success: `now + reverify_days`; failure: backoff ladder), review items.
  Phones outside 903/430 → review `phone_out_of_area`. Social handles that do not
  match → review `social_mismatch`. Site identity not confirmed → no facts from
  that site; review `website_identity`.

### `publish.py`
- `evaluate(conn, settings) -> counts`: sets `publish_state` and
  `publish_reason` for every business: `suppressed`; `held`
  (`personal_name_no_presence`, `out_of_scope`, `inactive`); `review`
  (`osm_only_needs_primary_source`, `person_name_check`, `open_merge_review`);
  otherwise `ready`.
- `build_export(conn, settings, now) -> dict` in the publish contract below,
  deterministic ordering (by `slug`), and `write_export(path, data)` atomically.
- `diff_exports(old, new) -> {added, removed, changed}` for pull request notes.

### `status.py`
- `collect(conn, settings, now) -> dict` (counts only, no personal data) and
  `write_status(settings, data)`: writes `www/status.json`, `www/status/index.html`
  (phone-first, LeadFlow tokens, `<meta name=robots content=noindex>`, no
  scripts, no external requests), `www/index.html` (redirect link to /status),
  and `www/robots.txt` (`User-agent: *` / `Disallow: /`).

### `exports.py` (private, not served, unused until approved)
- `website-prospects.csv` (in-city businesses with no website or a dead one) and
  `hiring-partners.csv` (businesses with a careers page) under
  `exports/private/`. Only fields the directory would publish.

### `backup.py`
- `nightly_backup(conn, settings, today)`: online backup
  (`sqlite3.Connection.backup`) to `backups/archive-YYYY-MM-DD.db`, keep newest 14.

### `service.py` and `__main__.py`
- `python -m longview_archive run` is the service entry point. Loop: heartbeat;
  PAUSE file → idle (status still written); free space under the disk guard →
  no crawling or ingest; run due jobs (open data weekly, OSM weekly, NPI weekly,
  matching after ingest, publish evaluation + export every 45 min, status every
  10 min, nightly backup at 03:30 Chicago); crawl up to 2 sites at a time on a
  thread pool (visits are network-only; the main thread writes the DB).
  SIGTERM/SIGINT stop cleanly.
- Other commands: `migrate`, `sync [sales-tax|tabc|osm|npi|all]`, `match`,
  `crawl-once [--limit N]`, `publish [--out PATH]`, `exports`, `status`, `backup`,
  `suppress --id|--domain|--phone|--name-zip --reason`, `review list|accept|reject`,
  `check` (self-test: settings, schema, disk, pause, caps).

## The publish contract (`content/longview-directory/directory.json`)

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-24T18:00:00Z",
  "batchId": "2026-09-24T18:00Z",
  "sample": false,
  "indexable": false,
  "scope": "City of Longview, Texas",
  "counts": { "published": 1, "inArchive": 1, "heldForPrivacy": 0, "needsReview": 0 },
  "sources": [
    { "id": "tx_sales_tax", "name": "Active Sales Tax Permit Holders",
      "publisher": "Texas Comptroller of Public Accounts", "license": "Public Domain",
      "url": "https://data.texas.gov/d/xxxx-xxxx", "lastSyncedAt": "2026-09-24" }
  ],
  "categories": [ { "slug": "auto", "name": "Auto", "count": 1 } ],
  "businesses": [
    {
      "id": "lv-abcde12345",
      "slug": "example-tire-and-lube",
      "name": "Example Tire & Lube",
      "category": "auto",
      "categoryLabel": "Automotive repair and maintenance",
      "address": { "street": "1200 W Example Ave", "city": "Longview", "state": "TX", "zip": "75601" },
      "permitSince": "2019-03-01",
      "website": { "url": "https://www.exampletire.example/", "status": "ok" },
      "phone": { "e164": "+19035550100", "display": "(903) 555-0100" },
      "email": "info@exampletire.example",
      "hours": { "mon": [["08:00", "17:30"]], "sun": [] },
      "social": { "facebook": "https://www.facebook.com/exampletire", "instagram": null },
      "careersUrl": "https://www.exampletire.example/careers",
      "hiringRoles": ["front_desk"],
      "services": ["brake repair", "oil change"],
      "facts": [
        { "field": "name", "source": "tx_sales_tax", "url": "https://data.texas.gov/d/xxxx-xxxx", "checkedAt": "2026-09-24" },
        { "field": "phone", "source": "website", "url": "https://www.exampletire.example/contact", "checkedAt": "2026-09-24" }
      ],
      "updatedAt": "2026-09-24",
      "indexable": false
    }
  ]
}
```

Rules the contract guarantees (the site re-checks them and drops a record that
breaks one):

- `address.street` and `address.zip` are `null` unless `address_is_public`.
- `phone`, `email`, `hours`, `social`, `careersUrl`, `services` come only from
  the business's own website (`facts[].source == "website"`).
- `email` is a generic local part on the website's registrable domain.
- `hours` keys are only days the business states; `[]` means it states closed.
- `facts` has one entry for every non-null field shown, with `source` in
  `tx_sales_tax | tx_tabc | npi | website` and a `YYYY-MM-DD` `checkedAt`.
- `hiringRoles` ⊆ `front_desk, office_manager, medical_assistant,
  dental_assistant, receptionist`.
- `indexable` per business is true only when the global switch is on and the
  profile has at least one fact from the business's own website.
- `sample: true` marks a fictional fixture; the site shows a banner and the
  committed file must never be a sample.
- Ordering: businesses by `slug`, categories by the fixed category order.
- Characters: plain UTF-8 text; no HTML.

## Tests

`cd deploy/longview-archive && python3 -m unittest discover -s tests -v`
(also `npm run test:archive`). Standard library only. Tests never touch the
network: HTTP goes through injected transports and fixtures under
`tests/fixtures/`. All fixture businesses are fictional (`*.example` domains,
555-01xx phone numbers).
