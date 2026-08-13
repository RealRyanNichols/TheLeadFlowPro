# Tool card scene style guide

Every published tool gets one original scene illustration in `art/scenes/<slug>.svg`.
The registry entry in `lib/tools/visuals.ts` is the brief: `visualConcept` is what
the picture is, `primarySubject` is what must be recognizable at a glance,
`composition` says where things sit, `colorAccent` picks the gradient. The scene
is published to `/public/tools-art/card` (1200x675) and `/hero` (1600x900) by
`npm run art` — same drawing, two sizes.

## The bar

Bland boxes with an icon inside are unacceptable. Two tools sharing the same
picture skeleton is unacceptable. If a viewer covers the title and cannot tell
which tool this is from the picture alone, the scene has failed.

## Canvas

- `viewBox="0 0 1600 900"`. Root tag must carry `xmlns="http://www.w3.org/2000/svg"`.
- Self-contained: no `<text>`, no raster images, no external references, no scripts.
- Keep it under 30KB. Simple flat geometry compresses fine; filters are allowed
  sparingly (one soft blur for a wash is fine, ten are not).

## Palette — locked

Ground: `#f7f9fc` base. Two or three large, soft, asymmetric washes of the
tool's accent (radial gradients fading to transparent, 8–16% peak opacity).
The site is light; the card must sit comfortably on a white card.

Ink for silhouettes and detail: `#0e1a2e`. White surfaces: `#ffffff` with
`#d7e0ee` hairlines. Neutral support: `#b9c6da`, `#8299b8`. Ground shadow
under the subject: ink at 6–8% opacity, soft ellipse.

The six accent gradients, fixed order, never randomized — use the pair for the
entry's `colorAccent` (1-indexed):

1. `#38bdf8 → #2563eb`   2. `#a78bfa → #d946ef`   3. `#34d399 → #0ea371`
4. `#fbbf24 → #f97316`   5. `#f87171 → #ef4444`   6. `#22d3ee → #3b82f6`

Color points at the subject; it does not carpet the canvas. The accent gradient
belongs on the focal object (the phone screen, the chart bars, the QR frame),
not the whole scene.

## Composition

- Follow the entry's `composition` field literally — it says which side the
  subject sits on and where the negative space lives.
- The primary subject occupies 55–75% of the canvas height. Never a small
  centered icon floating in space.
- Include at least one `supportingSubjects` element, smaller and quieter than
  the subject.
- Depth comes from overlap and the ground shadow, not from 3D effects.

## Craft — the difference between illustration and clip-art

These cards have to read as premium product illustration, the way a serious
brand studio would draw them — not stickers, not "gen one pill graphics".

- Objects have structure: a phone has a chassis edge, a screen inset, and a
  reflection line; paper has a fold or a clipped corner; a chart sits on a
  panel with a hairline grid. Draw the two or three details that make the
  object feel engineered, then stop.
- Shade with intent: each accent gradient object gets one darker face or an
  inner edge (the accent's deep stop at 25–40% opacity) so forms have weight.
  No drop-shadow soup, no bevels, no 3D renders.
- Geometry is deliberate: align to an invisible grid, use consistent corner
  radii within a scene, keep stroke weights to two values. Nothing floats
  arbitrarily; everything sits, leans, or overlaps for a reason.
- Silhouette first: squint-test the scene. The primary subject's outline must
  be readable as a thumbnail at 200px wide.

## Forbidden

- Copying another scene's skeleton and swapping one glyph. Every scene's
  silhouette must be distinct.
- The retired template glyphs (the identical calculator / QR / document icons)
  as the whole composition.
- Text of any kind baked into the art — the card next to it carries the name.
- Dark page-sized backgrounds. This artwork lives on the light site.
