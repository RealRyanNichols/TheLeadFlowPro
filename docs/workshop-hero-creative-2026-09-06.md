# September 17 workshop homepage creative

Created with the built-in image generation tool in generate mode. This is a new conceptual illustration, not a photograph or evidence of actual workshop results.

## Saved asset

- Website: `public/images/workshops/chatgpt-build-september-17-warm-square.webp`
- Dimensions: 1254 × 1254 pixels.
- Size: 164,436 bytes.
- Original PNG: `/Users/ryannichols/.codex/generated_images/01a077be-4364-7da1-83d6-3c28056cc6ba/exec-40881236-626e-4456-bb92-83f8610bc286.png`
- Original compressed to WebP at quality 88 without resizing or cropping.
- Inspected the existing warehouse portrait and former workshop poster before designing. Neither was supplied as a reference; the new graphic contains no people.
- The existing warehouse image remains available for founder-story use.

## Verified event facts

Public workshop HTML and the production availability endpoint returned HTTP 200 during this change:

- https://workshop.theleadflowpro.com/
- https://www.theleadflowpro.com/api/events/availability?slug=chatgpt-for-business-owners-longview

Thursday, September 17, 2026. Longview, Texas. 6:30–8:00 PM Central. $97 per attendee. Beginners welcome; bring a laptop. The availability response reported registration open and payment ready. No static remaining-seat claim was added.

The HTML repeats the date in a contrasting amber date block, includes the time and price, and links “Reserve my seat” to the existing event registration page. The image is not the sole source of event details.

## Review

The final project WebP was visually inspected. Headline, date, location, and supporting text are legible and correctly spelled. Laptop, offer document, contact form, and follow-up message are conceptual teaching elements. No invented people, testimonials, results, money, or performance charts appear.

An isolated render of the actual homepage hero JSX and stylesheet was inspected at 390px and 568px. Neither width overflowed horizontally; the square image was uncropped, the HTML date stayed visible, and the registration button was about 59px tall. Screenshots: `/tmp/leadflow-workshop-hero-390.png` and `/tmp/leadflow-workshop-hero-568.png`.

Focused ESLint passed. Scoped git diff whitespace check passed. Full integrated site build, mobile browser verification, and deployment are owned by the release agent and were not performed as part of this bounded graphic change.

## Final prompt

```text
Use case: ads-marketing.
Asset type: final square 1:1 homepage workshop hero graphic for The LeadFlow Pro. Create a premium, visually striking event creative that feels welcoming, colorful, concrete, and exciting to a small business owner. This is a new marketing illustration, not a photograph of a real workshop.

Design: a beautiful editorial poster with a warm ivory and pale lavender background, deep ink typography, electric blue and vivid violet dimensional glass accents, and a bright warm orange highlight. Strong visual hierarchy, generous clean margins, large legible type. Make it eye-catching through composition, lighting, dimensionality, and strong typography, never through clutter or dark backgrounds.

Hero scene: in the lower half, a beautifully rendered blue and silver laptop on a cream desktop, viewed at a compelling three-quarter angle. A single luminous blue/violet ribbon flows out of its screen into three floating, tactile cream cards with simple precise business icons: an offer document, a contact form, and a follow-up message. A small warm orange spark punctuates the flow. This is an expressive conceptual illustration, not a fake dashboard or proof of real results. No numeric charts, money stacks, currency, completed progress bars, crowds, robots, stock people, or OpenAI logo.

Exact poster text, and no other text:
Small top brand: "THE LEADFLOW PRO"
Large primary headline on three clearly readable lines:
"STOP GUESSING."
"START BUILDING."
"WITH CHATGPT."
Use ink for first line, electric blue/violet for the second, ink for the third. Strong confident bold modern sans serif. The headline occupies the upper 40 percent, left aligned, and reads easily at 400 pixels wide.
A distinctive orange date badge near the lower-right of the headline, separate from the laptop: "SEPT 17"
Smaller secondary line near the bottom: "HANDS-ON WORKSHOP • LONGVIEW"
Small bottom supporting line: "Bring your laptop. Beginners welcome."

Composition: fill the square beautifully with a compelling central focal point. The laptop and physical artifacts have believable surfaces, sharp detail, soft directional shadows, and bright studio light. Keep all text well inside a 6 percent safe margin. Let the orange date badge and electric blue flow pop against the warm palette. No decorative fake body-copy lines with illegible letters, no invented logo, no black background, no claims of guaranteed outcomes, no quotes or testimonials. The date is September 17, 2026. Actual supporting facts, not additional text: live ChatGPT business workshop in Longview, 90 minutes, $97 per attendee. Do not add any price or time into the artwork. Deliver one polished square image.
```
