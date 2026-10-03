# Website sales and visual review — October 3, 2026

**Verdict: ready for release within the reviewed scope.** The pricing and service-area journeys now use strong violet headings, lavender surfaces, cream, and dark ink. Buyers can distinguish the upfront commitment, monthly service, illustrative territory, and the request that starts a private review.

This is a Product Design audit of the local preview at `http://127.0.0.1:3250`, using Chrome because the in-app browser was unavailable to the capture tool. All screenshots below were captured, saved as their original JPEG bytes, and inspected during this review. Desktop captures are 1905 × 895; the temporary 390 × 844 viewport produced 375 × 812 screenshots because of browser capture and scrollbar bounds. The viewport override was reset afterward. This report does not prove production publication.

## Reviewed flow

1. **Pricing entry — healthy.** The headline states $7,500 upfront. Supporting copy states the $5,000 monthly minimum and included onboarding, agreed build, and advertising allocation. Two clear next actions lead to plan intake and service-area review.

![1. Pricing entry](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/01-pricing-desktop.jpg)

2. **Monthly plan comparison — healthy.** Growth is the first, recommended card at $7,500/month. Focused is $5,000/month minimum, and Structured is $15,000/month. Each names its initial month separately. Custom work has a written scope. This earlier screenshot has the previous Scoreboard navigation label; plan content is unchanged, and step 1 shows the final Pricing navigation.

![2. Monthly plan comparison](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/02-monthly-plan-comparison.jpg)

3. **Acquisition planning — healthy.** About $500 is labelled per acquired farm/ag job; about $1,250 is per completed real-estate/mortgage deal. Adjacent copy explains estimates, included advertising allocation, and the difference between a lead and an outcome. The page does not divide package prices into promised volume.

![3. Planning targets](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/03-completed-outcome-targets.jpg)

4. **Billing FAQ — healthy.** Enter expands the native disclosure, and the focused summary has a visible violet outline. The answers explain the first-month bundle, no second setup fee, included advertising, and written approval for work outside scope.

![4. Billing FAQ](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/04-billing-faq.jpg)

5. **Service-area entry — healthy.** The proposition and next action are prominent. Industry controls use text and icons; the chosen industry has a visible border and a programmatic selected state.

![5. Service-area entry](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/05-service-areas-desktop.jpg)

6. **Local explorer — healthy.** Industry and market changes update the illustration and request context. This accepted view shows farm/ag around Kilgore at 35 miles. The legend distinguishes protected, held, and interested records in words. The empty state explicitly requires private conflict review; it does not imply that every blank area is available.

![6. Local territory explorer](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/06-filtered-territory-map.jpg)

7. **National view — healthy with a legibility limit.** State geography and Alaska/Hawaii insets are present, with different-scale labelling. Small geographic annotations support orientation, while industry, market, radius, and coverage controls remain the primary accessible labels. This screenshot does not establish national availability.

![7. National view](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/07-national-map.jpg)

8. **Area request — healthy; delivery outside this visual review.** The price expectation appears before the form. Named inputs and service choices are present. Operating-base confirmation is private; email follow-up and anonymous-public-interest consent are separate unchecked choices. A request does not reserve an area. No personal data was entered or submitted.

![8. Area request](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/08-area-request-desktop.jpg)

9. **Mobile request — healthy.** The upfront and ongoing expectations remain visible in the stacked layout. DOM measurement at the 390-pixel viewport found client width and scroll width both 375 pixels, with no horizontal overflow.

![9. Mobile request](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/09-service-area-mobile-request.jpg)

10. **Mobile local map — improved and healthy.** City labels were enlarged only for the narrow local view. One crowded secondary city is omitted, the selected market remains visible, and Marshall is offset. Visible-label bounding boxes did not intersect for Tyler or selected Kilgore. Desktop city labels remain unchanged. The small numerical map badge remains secondary to the explicit radius control.

![10. Mobile local map](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/10-service-area-mobile-map.jpg)

11. **Mobile pricing entry — healthy.** The headline, monthly floor, and primary actions fit without horizontal overflow. The layout follows a single reading column.

![11. Mobile pricing entry](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/11-pricing-mobile.jpg)

12. **Mobile plan card — healthy.** The recommended badge, monthly unit, initial payment, scope, and action remain readable in a 331-pixel card. Some small-print text warrants future zoom and real-device testing.

![12. Mobile plan card](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/12-pricing-mobile-plan.jpg)

13. **Managed scope intake — healthy.** The pricing CTA opens the intake. Its DOM contains the same monthly amounts, initial payments, included advertising, and relevant marketing choices. Missing spacing between the two heading spans was fixed and the final screenshot was recaptured and inspected. The form was not submitted.

![13. Managed scope intake](/tmp/leadflow-service-area-current-20261003/docs/sales-review-20261003/13-managed-scope-intake.jpg)

## Pricing evidence and public meaning

`lib/site/prices.ts` supplies approved amount keys; `lib/site/managedPlans.ts` supplies units, plan order, billing explanation, and targets. `app/pricing/page.tsx` renders those values. Metadata comes from `lib/publicPageCatalog.ts` and `lib/publicPageMetadata.ts`, with the `violet-20261003` image revision.

The owner's current direction supplies monthly amounts, included advertising spend, most-chosen positioning, and the approximate outcome targets. “Most chosen” is owner direction, not an independently measured distribution. Bundling the upfront payment into the initial month is the implementation recommendation chosen for this presentation; a written proposal must ratify that treatment, scope, advertising allocation, and billing dates. Existing customers retain their own terms. No payment processor products, checkout charges, or subscriptions were configured by this work. The independent definitions and arithmetic review is in `docs/MANAGED_PRICING_DATA_REVIEW.md`.

## Share artwork and verification

Five actual local endpoint exports—home, agency, services, service areas, and pricing—are saved in the business asset folder `Website Cleanup/2026-10-03/Share Previews`. Each is a reviewed 1200 × 630 PNG. The versioned manifest records exact titles, descriptions, dimensions, hashes, palette, and provenance: authored code-native Next ImageResponse/Satori graphics, licensed local Inter fonts, and existing brand/proof assets. Pricing says “Expect $7,500 upfront.” The files are local reviewed exports, not proof of a live social cache refresh. The Creative Production board tool was not exposed in this session, so no board placement is claimed.

Focused pricing and metadata tests passed **19/19**, including generated image dimensions/uniqueness, price-unit distinctions, targets, and private/query route guards. Scoped lint, typecheck, facts validation, formatting, and diff checks passed. The release owner additionally reported the combined **2,303-test** suite passing, zero lint errors with six existing image warnings, typecheck/facts success, and zero dependency-audit findings.

## Evidence limits

This scoped review confirms rendered hierarchy, labels, responsive bounds, selected controls, and keyboard disclosure behavior. It is not a full WCAG assessment: screen readers, complete keyboard order, measured contrast, 200–400% zoom, physical touch devices, submission errors, CRM/email delivery, and live production routing were not established by these screenshots. Some local captures show a development issue badge; browser log inspection identified the existing ClickUp-extension body-class hydration mismatch. No sensitive submissions or private client records are included. Release and production checks belong to the release owner.
