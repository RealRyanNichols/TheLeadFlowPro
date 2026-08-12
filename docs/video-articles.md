# Publishing a video article on theleadflowpro.com

Written 2026-08-12, after shipping `/articles/data-centers-are-coming-to-texas`.
Read this before publishing the next video. Do not reinvent the pipeline.

## Where the code lives

- Deploy clone on the Mac: `~/LeadFlowPro-Deploy/repo3`. It is clean and tracks `origin/main`.
  The other clones are stale: `~/TheLeadFlowPro`, `~/LeadFlowPro-Deploy/repo`,
  `~/LeadRepCodexSwarm/repos/TheLeadFlowPro`. Do not use them.
- GitHub `RealRyanNichols/TheLeadFlowPro`. Push to `main` is a live production deploy.
- Vercel team `RealRyanNichols` (`team_2a0TrkWvu7Mv1IIMToSYyhER`), project `the-lead-flow-pro`
  (`prj_u4h1Q6eAGJOf5QxBlsc2jQPFFOYY`). Never deploy to Team KJR.

## The article system

Articles are entries in `lib/articles.ts`. The body is markdown rendered with `ReactMarkdown`
with no raw HTML support, so **HTML inside the body will not render**. Anything visual has to be
a field on the article plus JSX in `app/articles/[slug]/page.tsx`.

`Article` has an optional `video` field (`ArticleVideo`):

    video: {
      src, poster, captions,   // paths under /public
      title, description,
      durationSeconds, width, height
    }

When present, `app/articles/[slug]/page.tsx` renders an inline
`<video controls playsInline preload="metadata">` with a `<track kind="captions">` in place of
the static OG image, and emits a `VideoObject` next to the `Article` JSON-LD so the clip can be
indexed on its own. The articles index adds `· Watch {n}s` to the card meta line. Articles with
no video are unchanged.

## Where the files actually live

Three copies, three jobs. Do not skip the archive step.

**1. The original, in Google Drive. This is the master.**
`My Drive / TheLeadFlowPro / Video Source Archive / YYYY-MM-DD-<slug>/`
One folder per video, holding `source-original.mov`, the `web-*.mp4` that got published,
`captions.vtt`, `poster-source.jpg`, `og-1200x630.jpg`, `transcript.txt`, and a `README.txt`
with the live URL and the encode settings. Drive syncs it off the machine. If the laptop dies
or a re-encode is needed later, everything is there.

Do this first, because the file a video usually arrives as is a Photos export sitting in
`/private/var/folders/.../TemporaryItems/`, and macOS deletes that folder without warning.
That is exactly how the first one nearly got lost.

**2. The web encode, in the git repo.** `public/video/<slug>.mp4`, `-poster.jpg`, `.vtt`.
Committed to `RealRyanNichols/TheLeadFlowPro` and deployed to Vercel's CDN, so it is served
from theleadflowpro.com with `content-type: video/mp4` and `accept-ranges: bytes`. That is the
copy the public plays. No rented player, nothing a platform can pull down. Keep it near 10 MB
so the repo stays sane.

**3. Working files, on the Mac.** `~/rrn-transcribe/dcx/out/` holds the extracted audio, the
sampled frames, and intermediate encodes. Pure scratch. Safe to delete once steps 1 and 2 are
done.

## The video pipeline (there is no ffmpeg on this Mac)

Archive the original to Drive before anything else. Then:

No Homebrew, no ffmpeg. Do not try to install either. Everything below uses built-in macOS
tools. Scripts live in `~/rrn-transcribe/dcx/`.

1. **Audio for transcription**
   `afconvert -f WAVE -d LEI16@16000 -c 1 in.mov audio.wav`. afconvert reads .mov directly.

2. **Transcribe**
   `~/rrn-transcribe/whisper.cpp/build/bin/whisper-cli -m models/ggml-base.en.bin -f audio.wav -ng -np -ovtt -of out/captions`
   `-ng` (CPU, no Metal) is required. With Metal the binary aborts on this machine. The
   `for-tests-*.bin` files in that models folder are dummies. Get a real model with
   `sh ./models/download-ggml-model.sh base.en`.

3. **Frames and poster**
   `swift ~/rrn-transcribe/dcx/grab.swift <video> <outdir>` (AVAssetImageGenerator, full res).
   Pick a moment before the burned-in captions animate in.

4. **Web encode**
   `swift ~/rrn-transcribe/dcx/encode.swift <in> <out.mp4> 2000`
   AVAssetReader into AVAssetWriter, H.264 High + AAC 96k, longest side capped at 1280,
   `shouldOptimizeForNetworkUse`. A 42s 1080x1920 clip at 10 Mbps was 55 MB and came out 11 MB
   at 720x1280. Do not use `AVAssetExportPreset1280x720`, it ignores bitrate and produced 38 MB.

5. **OG image**
   `swift ~/rrn-transcribe/dcx/og.swift <photo> <out.jpg> "line one|line two" "subline"`
   Renders the 1200x630 brand template: navy gradient, "The LeadFlow" white plus "Pro" blue,
   bold headline, gray subline, blue to gold rule, TheLeadFlowPro.com, and the source photo
   faded in from the right with a play badge. Keep the headline to two lines so it clears
   the photo.

## Building locally before you push

Four traps on this machine:

- `npm` is not on the default PATH. Run
  `export PATH="$HOME/.fnm/node-versions/v22.22.2/installation/bin:$PATH"`.
- `NODE_ENV=production` is set in the shell, so a plain `npm install` silently skips
  devDependencies and the build fails with a misleading `Can't resolve '@/lib/supabase/client'`.
  The real cause is TypeScript missing. Use `unset NODE_ENV` and
  `npm install --no-save --include=dev`.
- `npm ci` fails because `package-lock.json` is out of sync with `package.json` (missing
  `@vercel/analytics` and `@vercel/speed-insights`). Vercel builds fine anyway. Do not "fix" the
  lock file as a side effect of shipping an article. `--no-save` keeps it untouched.
- `repo3` is a sparse checkout. New top-level `public` folders need
  `git sparse-checkout add public/<dir>` before `git add` will stage them.

Then `npm run build` and confirm the new slug appears under `/articles/[slug]` in the output.

## Verify after deploying

    curl -sSI https://www.theleadflowpro.com/video/<slug>.mp4
    # expect content-type: video/mp4 and accept-ranges: bytes

    curl -sS -r 0-99 -o /dev/null -w "%{http_code}\n" https://www.theleadflowpro.com/video/<slug>.mp4
    # expect 206

    curl -sS https://www.theleadflowpro.com/articles/<slug> | grep -o '<video[^>]*>'

The Cowork cloud sandbox cannot reach theleadflowpro.com. Verify from the Mac. For a screenshot:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --window-size=1280,1400 --virtual-time-budget=9000 \
      --user-data-dir=/tmp/shot --screenshot=out.png <url>

## Posting order

Upload the video natively to Facebook, Reels, and X. Native video gets reach, link posts do not.
Put the tracked article link in the caption and again in the first comment. The video gets the
attention, the owned article closes it. UTM campaign for the first one: `data-centers`.
