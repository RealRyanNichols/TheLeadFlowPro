# Tools accessibility

Target: WCAG 2.2 AA.

## What was broken and is fixed

The tools section was written against the old navy canvas. When the site went
light in the August 2026 rebuild, the tools kept their dark panels while
inheriting the light type tokens. The result was near-black text on dark navy.

| Problem | Fix |
| --- | --- |
| Save-result dialog rendered `#0A1220` type on a `#12213A` panel, effectively unreadable | Rebuilt on the same tokens as every other panel on the site, so it cannot drift again |
| Full-screen white overlay behind the dialog, with no scrim | Proper dimmed scrim with a blur, dialog on a white panel |
| `select` elements used a dark navy background with light-theme type | `.tool-select`, on site tokens |
| Marketing consent arrived pre-ticked | Both consents start unticked, in their own fieldset, neither bundled into the submit |
| Escape closed the dialog but dropped focus to the body | Escape and the close button both restore focus to the element that opened it |
| Emoji carried the entire visual identity of the catalogue | Real `img` elements with alt text and declared dimensions |

## Dialogs

The save-result dialog and the filter drawer both:

- use `role="dialog"` with `aria-modal="true"`
- are labelled by their heading and described by their intro
- trap Tab and Shift+Tab inside
- close on Escape
- restore focus to the triggering element on every close path
- lock background scrolling while open
- render on a light panel at full contrast

## Forms

Every field has a real `label` bound by `htmlFor`. Help text is linked with
`aria-describedby`. The email field sets `aria-invalid` and points at its error
with `aria-describedby`, and the error carries `role="alert"`. Required and
optional are stated in the label text, not signalled by colour alone. Inputs
carry the right `type`, `inputMode` and `autoComplete` so phone keyboards behave.

## Results

The headline result sits in a polite live region, so a screen reader announces
the number changing without re-reading the whole panel on every slider step.

Charts are decoration. Every bar has its value printed next to it as text, and
the bars themselves are `aria-hidden`. The ramp chart states its first and last
value in a sentence underneath. Nothing depends on reading a shape or a colour.

## Contrast

Every domain ink was checked against its own tint at 4.5:1 or better. Tone
colours for good, warning and danger were moved off the old dark-theme values to
the light-theme tokens. Status is never carried by colour alone: a bad result
also says so in the verdict text.

## Targets and motion

Interactive controls are at least 44 by 44 pixels. Focus rings are a 3px solid
ring at a 2px offset on every card, chip, checkbox button, preset and suggestion.
`prefers-reduced-motion` removes the card lift and hover transitions and disables
smooth scrolling.

## Responsive

Verified with no horizontal overflow at 320, 360, 390, 768, 1024 and 1440. The
directory grid is `auto-fill` with a `min(100%, 290px)` track, so it never forces
a card wider than the viewport. Wide content, tables and code snippets, scrolls
inside its own container rather than the page.

## How it is checked

- `tests/registry.test.ts` covers alt text presence and image dimensions.
- The Playwright pass in `scripts/check-a11y.mjs` covers overflow at six widths,
  consent defaults, Escape-to-close, focus restoration and touch target sizes.
- The rest is manual: keyboard through the directory, the finder, a tool, the
  dialog and the drawer.
