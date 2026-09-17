# Plugin page: screen capture checklist for Ryan

The rebuilt `/plugin` page shows three workflow demonstrations as chat-style
exchanges (see `PLUGIN_DEMOS` in `lib/pluginDocs.ts`). Each has a `media`
slot that is `null` on purpose: the page never renders a fake screenshot. Once
you capture the real thing, drop the file under `public/images/plugin/` and set
`media` to its path. That is the whole change.

Use a test workspace with made-up leads. Never capture a real customer's
name, number, or message.

## Setup once

- [ ] Create a test business in HQ (for example "Kirby Plumbing", the sample the page already uses) with a made-up owner email you control.
- [ ] Add three fictional leads through the website form door, the assistant, and a Meta test lead so the sources differ.
- [ ] Connect a text line only if it is a test number. Otherwise leave it off; the email reply path is still a real demonstration.
- [ ] Set the workspace timezone to America/Chicago and the brief hour to 7:00 AM so the brief screenshot matches the sample copy.

## Capture 1: the morning brief (id `morning`)

- [ ] ChatGPT, connector installed, light theme, browser zoom 100%.
- [ ] Type exactly: `Run my morning brief`.
- [ ] Wait for the full answer (three call-now rows and the week count).
- [ ] Record 20 to 30 seconds, or take one screenshot at 1600 by 1000 or larger.
- [ ] Crop out the browser chrome and any account email in the corner.
- [ ] Save as `public/images/plugin/demo-morning-brief.webp` (or `.mp4` for a recording).

## Capture 2: a reply in your voice (id `reply`)

- [ ] Claude desktop, connector installed.
- [ ] Type: `Text Dana back. We can look at the water heater today between two and four.`
- [ ] Show the draft, then type `Send it.` Confirm HQ shows the message on the lead's timeline.
- [ ] If no test line is connected, capture the email-reply variant and note it in the caption.
- [ ] Save as `public/images/plugin/demo-reply.webp` or `.mp4`.

## Capture 3: the week's content (id `content`)

- [ ] In either assistant type `Draft this week's posts.`
- [ ] Open HQ, then Content. Show the three posts, the ad, and the video script.
- [ ] Approve two posts. If a test Facebook Page is connected, show them published; otherwise show the approved state.
- [ ] Save as `public/images/plugin/demo-content.webp` or `.mp4`.

## Before publishing

- [ ] No real names, numbers, or addresses anywhere in frame.
- [ ] File sizes under 500 KB for images, under 8 MB for recordings.
- [ ] Add `width` and `height` to each entry so the page does not shift while loading.
- [ ] Run `npm run validate:visuals` and `npm test`.
