# Daily social image library

The public contract is five reviewed PNG files and a manifest per date:

```text
public/social/YYYY-MM-DD/01.png
public/social/YYYY-MM-DD/02.png
public/social/YYYY-MM-DD/03.png
public/social/YYYY-MM-DD/04.png
public/social/YYYY-MM-DD/05.png
public/social/YYYY-MM-DD/manifest.json
public/social/YYYY-MM-DD/qa.json
public/social/index.json
```

`https://www.theleadflowpro.com/social/index.json` contains `dates`, newest first, limited to the most recent 60 published date folders. Its `days` array provides each date's `manifest_url` and `image_count`. Older date folders remain available at their predictable URLs. Index entries are computed only from validated complete days.

This script imports and checks images that have already been generated. It does not call an image API, spend credits, render graphics, normalize dimensions, claim to have looked at images, or schedule Facebook posts. The daily Codex task performs original image creation, visual review, and the authorized repository workflow. No new environment variables or credentials are needed for this script.

## Daily creation and backfill

Use the project's persistent external working folder with one `YYYY-MM-DD` subfolder per target date. A batch directory supplied to `import` must contain only date directories; keep prompts, contact sheets, originals, planning records, and logs in a separate working directory.

1. Generate five original compositions for the next Central calendar date. The initial backfill is fourteen consecutive dates, seventy images. Use the image generation tool for image creation and edits.
2. Save the final five files as actual, single-frame, 1200 by 630 PNGs. Imported files are not resized or edited.
3. Write `manifest.json` using the contract below.
4. Open **each final PNG** and visually check the actual rendered text, subject placement, layout, color, and exclusions. Viewing an earlier version, the prompt, or a manifest is insufficient.
5. Use `inspect` to obtain each final file's SHA256; write `qa.json` from the observations. Any file change invalidates its existing visual review.
6. Import the day or full batch. Every candidate date and the existing library must pass before promotion begins.
7. Run the required repository checks and build, review the scoped git diff, then commit and push when authorized. Site deployment occurs through the existing project deployment path.
8. After deployment, run `verify-live`. Treat import, commit, deployment, verified public URLs, and Facebook scheduling as separate states.

Recommended recurrence: early morning `America/Chicago`, generating for the next calendar day. Determine dates with that IANA timezone so daylight saving changes do not move the production date. The scheduling system owns recurrence and its run logs; this validator does not create a background cron or a competing scheduler.

### Installed daily job

The Codex heartbeat **LeadFlow daily social images** (`leadflow-daily-social-images`) is scheduled for **5:00 AM America/Chicago every day**. Its execution history is in this Codex task and the app's Automations view. This is a desktop Codex automation and requires the configured local Codex host and account to be available; it is not a GitHub Actions or Vercel cron worker.

The initial library covers September 7 through September 20, 2026. Each run checks tomorrow first, then creates one new set for the earliest uncovered date through today plus fourteen days. This keeps tomorrow covered while adding five new images at the far end of the lead window. If the horizon is already complete and healthy, it ends without replacing existing artwork. A missed or failed run is reported and the next run prioritizes the missing due date. Never recycle the initial fourteen prompts as a repeating template schedule.

After verifying the public release, mirror the validated library into Ryan's persistent **Social Image Library** folder under the LeadFlow Pro Drive asset folder:

```bash
node scripts/social-images-mirror.mjs '/absolute/path/to/Social Image Library'
```

The mirror keeps dated PNGs, captions/manifests, and QA records together and creates `gallery.html` for browsing. It checks existing files before reuse, promotes new day copies through temporary directories, and replaces index/gallery files atomically. Store generation receipts, source prompts, OCR evidence, validation output, deployment IDs, and live verification JSON in the mirror's `_logs` folder. Keep local source paths and operational logs out of the public manifest.

`scripts/social-image-ocr.swift` is an optional native macOS Vision helper for checking visible text. Compile with `swiftc scripts/social-image-ocr.swift -o /absolute/working/social-image-ocr`, then pass final PNG paths. OCR can misread condensed fonts or multiplication signs, so inspect discrepancies visually. It does not replace the mandatory final-image review.

Daily checks include `npm run test:social-images`, relevant lint/type checks, `npm run build` (which runs `validate:social`), and `git diff --check`. The JavaScript publisher uses the existing Next.js `sharp` dependency. No new environment variables, image API key, paid infrastructure, or social publishing credentials were added.

## CLI

Run from the repository with its dependencies installed (`sharp` is already in the Next.js dependency tree).

```bash
# Inspect the final files. This does not create or attest to visual QA.
node scripts/social-images.mjs inspect --source '/absolute/working/ready/2026-09-07'

# Import one day, or a directory containing only complete date folders.
node scripts/social-images.mjs import --source '/absolute/working/ready'

# Validate every published date, its review hashes, duplicate window, and index.
node scripts/social-images.mjs validate

# Verify every public index, manifest, and image against local reviewed files.
node scripts/social-images.mjs verify-live --report '/absolute/working/logs/live-check.json'

# Verify index and one selected day after an incremental release.
node scripts/social-images.mjs verify-live --date 2026-09-07 --report '/absolute/working/logs/2026-09-07-live.json'

# Run the publisher's regression tests.
node --test tests/social-images.test.mjs
```

Every command accepts `--root /absolute/repository` if invoked elsewhere. `verify-live` accepts `--base-url https://deployment-origin.example` to test a deployment before the canonical domain updates; manifest URLs must still use the canonical public domain. It rejects redirects, non-200 responses, incorrect MIME types, altered JSON, incorrect image dimensions, and image bytes that differ from the reviewed originals. PNG and JSON responses must identify as `image/png` and `application/json`; charset parameters are accepted. A supplied report file is written on both success and failed URL checks, with each URL's status and evidence. Network requests have a 30-second timeout and run at concurrency four.

## Manifest contract

`date` must match the calendar-valid folder name. `generated_at` is the actual generation timestamp, with an explicit timezone. `images` contains exactly five records in filename order. Every image requires the original fields shown below. The publishing validator also requires `composition` and `dominant_color` to make planned variation explicit.

```json
{
  "date": "2026-09-07",
  "generated_at": "2026-09-06T20:00:00Z",
  "images": [
    {
      "file": "01.png",
      "url": "https://www.theleadflowpro.com/social/2026-09-07/01.png",
      "width": 1200,
      "height": 630,
      "slot": "morning",
      "angle": "opener",
      "trade": "small business",
      "headline": "Start with one clear next step",
      "support": "Make it easy for customers to move forward",
      "alt_text": "A work truck beside a quiet East Texas storefront, with a clear headline band above.",
      "suggested_caption": "A new day does not need a complicated plan.\n\nGive one customer a clear next step.\n\nBuild yours at TheLeadFlowPro.com",
      "cta": "TheLeadFlowPro.com",
      "composition": "wide storefront photograph with overhead headline band",
      "dominant_color": "#ECE7D9"
    }
  ]
}
```

The example shows one record for readability; a real manifest with only one record is rejected. JSON encodes line breaks as `\n`; parsing `suggested_caption` must produce real blank lines, not literal backslash characters. Captions require three to six nonempty paragraphs, separated by one blank line, no dashes, and a final CTA ending in `TheLeadFlowPro.com` or `TheLeadFlowPro.com.`. Headlines allow at most eight whitespace-separated words on one line. Support allows at most sixteen words on one line. The image itself must contain only the headline and support; the CTA remains in the caption unless it is already part of those two lines.

| File | Central posting time | `slot` | `angle` | Purpose |
| --- | --- | --- | --- | --- |
| `01.png` | 7:00 AM | `morning` | `opener` | Mindset or momentum |
| `02.png` | 9:00 AM | `leak` | `leak` | One specific business leak |
| `03.png` | 1:00 PM | `trade` | `trade` | Rotating trade |
| `04.png` | 3:00 PM | `proof` | `proof` | Labeled example or sourced proof |
| `05.png` | 5:00 PM | `question` | `question` | One question for comments |

The third image's trade must come from: roofing, HVAC, plumbing, electrical, real estate, dental, med spa, auto detailing, landscaping, gyms, insurance, chiropractic, pressure washing, barbers. Trade matching is case-insensitive. A trade cannot repeat within the same fourteen-date window; the first trade may return on day fifteen (a calendar difference of fourteen). The order can continue from the last published date instead of restarting each batch.

Each day needs five different composition descriptions and at least three distinct dominant hex colors. This declaration is additional to the actual pixel comparison. It cannot be used to bypass a detected duplicate.

For `04.png`, add one of:

- `"proof_kind": "illustrative"`: the on-image headline or support **and** the suggested caption must include `example` or `illustrative`. Do not imply that a made-up result came from an actual client.
- `"proof_kind": "sourced"`: also supply an HTTPS `proof_source`, check it, and ensure it supports the precise result. A source URL alone does not verify a claim.

## Visual review contract

`qa.json` is stored beside the published files as an audit record. Keep notes public-safe; do not include local personal paths, private client information, credentials, or unpublished source material.

```json
{
  "reviewer": "Codex visual review",
  "reviewed_at": "2026-09-06T21:00:00Z",
  "images": [
    {
      "file": "01.png",
      "sha256": "REPLACE_WITH_ACTUAL_INSPECT_HASH",
      "passed": true,
      "notes": "Describe actual observations from this final image, including any correction and the verified result.",
      "text_correct": true,
      "text_clear_of_subject": true,
      "no_faces_or_hands": true,
      "no_extra_text_or_logos": true,
      "composition_distinct": true
    }
  ]
}
```

A real QA file needs five unique image records. Set assertions to true only after observing the final rendered images. Check that there is one headline and one support line, correct spelling, large readable type, no text across the main subject, no faces or hands, no logos/app icons/profile pictures/banner artwork, and no prohibited flags. Review the set together to catch repeated thumbnails and poor color balance. Automated checks cannot establish all of these semantic properties; the required hash-bound review record prevents an unchecked file change from inheriting an earlier approval.

## Duplicate checks and publication safety

The validator reads actual image pixels. It calculates SHA256 of the file and decoded RGB pixels, a low-frequency DCT perceptual hash, a difference hash, normalized grayscale pixels, and Sobel edge magnitudes. It rejects a pair when either exact hash matches, normalized grayscale correlation is at least 0.985, edge correlation is at least 0.992, or both pHash distance is at most 5/63 and dHash difference at most 0.10. These separate comparisons catch PNG reencoding and near-identical compositions after color changes. Tests exercise those bypass attempts.

Every pair within a day and every pair against the previous fourteen calendar dates is checked. The image duplicate window includes a calendar difference of fourteen, independent of the trade rotation's fourteen-date window. A rejected image should be regenerated with a substantially different composition. Do not disable the check or simply rename its layout to make a run pass. Perceptual similarity remains a heuristic; visual review is also required.

Import validates the existing library first, copies it into a private candidate directory beside the destination, adds complete new dates, and validates the entire candidate again. Only after all checks pass does it replace the library directory and its matching rolling index. Ordinary validation failures leave the existing directory and index unchanged. A promotion failure restores the prior directory. An exclusive directory lock prevents concurrent imports. Existing date folders are immutable through this CLI.

Filesystem directory replacement is not a multi-operation transaction: local readers can encounter a brief rename window, and a machine crash between renames can leave a backup. This does not publish a partial Vercel deployment; git commit and deployment follow successful validation. If a process is forcibly terminated, inspect `public/.social-publish.lock`, `public/.social-stage-*`, and `public/.social-backup-*` before recovery. Restore the last complete backup if needed, validate it, and remove only the abandoned artifacts after confirming no importer is active. Never commit staging, lock, or backup paths. Any unrecognized file, symlink, partial date directory, stale index, missing review, or changed image causes validation to fail.

The script emits concise JSON results on success and an error with a nonzero exit code on failure. Preserve those outputs in the daily task logs. A successful `import` means local static files are ready; use the live verification report to confirm the deployed artifact.
