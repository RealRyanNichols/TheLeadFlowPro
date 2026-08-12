# Embedding a tool

Any published tool can run on somebody else's website. It is free, it is hosted
here, and it does not expire.

## The snippet

```html
<iframe src="https://www.theleadflowpro.com/embed/missed-call-calculator"
        width="100%" height="900"
        style="border:0;border-radius:16px;max-width:760px"
        title="Missed Call Money Calculator, a free tool from The LeadFlow Pro"
        loading="lazy"></iframe>
```

The tool page generates this with the right slug, height and title, shows a live
copy button, and no longer asks for anything before showing it. Emailing the code
plus install instructions is offered, and that does ask for an email, because it
needs somewhere to send it.

## Height

`embedHeight` on the tool definition. It defaults to 820 and is set per tool
where the result panel is taller. The frame scrolls internally rather than
clipping, so a wrong value degrades to a scrollbar rather than a cut-off result.

## Where it works

WordPress, Wix, Squarespace, Shopify, GoDaddy, Webflow, Duda, HubSpot,
ClickFunnels, and any page where you can paste HTML. Anywhere that accepts an
embed, HTML or custom code block.

## What the embed does and does not do

- Renders the tool, the result, the assumptions and the disclaimer.
- Carries one attribution link back to the tool page, tagged with UTM parameters.
- Runs every calculation in the visitor's browser.
- Does **not** carry any account state, session or personal data.
- Does **not** put anything the visitor types into the URL, so nothing sensitive
  can leak through a referrer header.
- Does **not** show the embed or share controls inside the frame.
- Is `noindex`, so an embed cannot compete with the tool's own page.

## Styling

The embed uses the same light tokens as the rest of the site, so it sits on a
white or near-white host page without a theme clash. It has no fixed width, it
respects `prefers-reduced-motion`, and it has no horizontal scroll down to 320px.

## Testing an embed

1. Load `/embed/<slug>` directly and check it fills the frame with no page chrome.
2. Put the snippet on a scratch page and check it at phone width.
3. Confirm the result updates and the download button works inside the frame.
4. Confirm the attribution link opens the tool page in the top window, not inside
   the iframe.
