# Link Audit

Generated: 2026-05-17T00:37:35.242Z

Scope:
- src/app/**/page.tsx
- src/components/site/**/*.tsx

Rules:
- Static internal targets must have a matching page.tsx or route.ts under src/app.
- /offers/[slug] targets must exist in src/lib/offers.ts.
- /platforms/[handle] targets must exist in src/lib/platforms.ts.

Summary:
- Links audited: 305
- OK: 305
- 404: 0
- redirect-needed: 0

## All Link Hrefs

| File:line | Target href | Status | Note |
| --- | --- | --- | --- |
| src/app/admin/capacity/page.tsx:162 | `/` | OK | static route exists |
| src/app/admin/capacity/page.tsx:190 | `/` | OK | static route exists |
| src/app/admin/clients/[id]/page.tsx:110 | `/admin` | OK | static route exists |
| src/app/admin/clients/[id]/page.tsx:133 | `/admin/capacity` | OK | static route exists |
| src/app/admin/growth-os/page.tsx:110 | `/admin/intelligence` | OK | static route exists |
| src/app/admin/growth-os/page.tsx:113 | `/admin/blueprint-lab` | OK | static route exists |
| src/app/admin/growth-os/page.tsx:116 | `/admin` | OK | static route exists |
| src/app/admin/growth-os/page.tsx:145 | `/stump-ryan` | OK | static route exists |
| src/app/admin/intelligence/page.tsx:53 | `/admin/proof-factory` | OK | static route exists |
| src/app/admin/intelligence/page.tsx:56 | `/admin/radar` | OK | static route exists |
| src/app/admin/intelligence/page.tsx:59 | `/admin` | OK | static route exists |
| src/app/admin/intelligence/page.tsx:83 | `/lead-leak-audit` | OK | static route exists |
| src/app/admin/intelligence/page.tsx:108 | `/audit/${report.publicId}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/admin/intelligence/page.tsx:146 | `/audit/${item.publicId}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/admin/page.tsx:102 | `/dashboard/work` | OK | static route exists |
| src/app/admin/page.tsx:105 | `/admin/requests` | OK | static route exists |
| src/app/admin/page.tsx:108 | `/admin/blueprint-lab` | OK | static route exists |
| src/app/admin/page.tsx:111 | `/admin/growth-os` | OK | static route exists |
| src/app/admin/page.tsx:114 | `/admin/intelligence` | OK | static route exists |
| src/app/admin/page.tsx:117 | `/admin/pulse` | OK | static route exists |
| src/app/admin/page.tsx:120 | `/admin/radar` | OK | static route exists |
| src/app/admin/page.tsx:123 | `/admin/capacity` | OK | static route exists |
| src/app/admin/page.tsx:151 | `/admin/clients/${user.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/admin/page.tsx:183 | `/admin/clients/by-order/${order.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/admin/page.tsx:212 | `/admin/growth-os` | OK | static route exists |
| src/app/admin/page.tsx:218 | `/admin/blueprint-lab` | OK | static route exists |
| src/app/admin/page.tsx:228 | `/admin/requests` | OK | static route exists |
| src/app/admin/proof-factory/page.tsx:38 | `/admin/intelligence` | OK | static route exists |
| src/app/admin/proof-factory/page.tsx:41 | `/proof` | OK | static route exists |
| src/app/admin/pulse/page.tsx:121 | `/pulse` | OK | static route exists |
| src/app/admin/pulse/page.tsx:124 | `/stump-ryan` | OK | static route exists |
| src/app/admin/pulse/page.tsx:127 | `/admin` | OK | static route exists |
| src/app/admin/pulse/page.tsx:153 | `/pulse/predictions` | OK | dynamic route slug exists in source data |
| src/app/admin/pulse/page.tsx:201 | `/admin/requests` | OK | static route exists |
| src/app/admin/pulse/page.tsx:373 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/admin/pulse/page.tsx:415 | `{row.path}` | OK | dynamic expression or prop-driven target |
| src/app/admin/pulse/page.tsx:450 | `{sensor.href}` | OK | dynamic expression or prop-driven target |
| src/app/admin/radar/page.tsx:34 | `/admin/intelligence` | OK | static route exists |
| src/app/audit/[publicId]/page.tsx:75 | `/book?source=audit-report` | OK | static route exists |
| src/app/audit/[publicId]/page.tsx:81 | `/lead-leak-audit` | OK | static route exists |
| src/app/availability/page.tsx:504 | `/tiers` | OK | static route exists |
| src/app/availability/page.tsx:510 | `/offers/decision-sprint` | OK | dynamic route slug exists in source data |
| src/app/availability/page.tsx:516 | `/book` | OK | static route exists |
| src/app/b/[slug]/page.tsx:172 | `/leaderboard?prefill=${encodeURIComponent(profile.publicName)}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/b/[slug]/page.tsx:178 | `/leaderboard#giveback` | OK | static route exists |
| src/app/b/[slug]/page.tsx:253 | `/leaderboard` | OK | static route exists |
| src/app/book/page.tsx:141 | `#calendar` | OK | same-page anchor |
| src/app/book/page.tsx:147 | `/stump-ryan#tool-challenge-form` | OK | static route exists |
| src/app/book/page.tsx:198 | `{lane.href}` | OK | dynamic expression or prop-driven target |
| src/app/challenge/insights/[slug]/page.tsx:287 | `/stump-ryan#tool-challenge-form` | OK | static route exists |
| src/app/challenge/insights/[slug]/page.tsx:293 | `/pulse` | OK | static route exists |
| src/app/challenge/page.tsx:410 | `/book?source=stump-ryan-continuation` | OK | static route exists |
| src/app/contact/page.tsx:231 | `/start` | OK | static route exists |
| src/app/contact/page.tsx:237 | `/book` | OK | static route exists |
| src/app/contact/page.tsx:275 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/contact/page.tsx:308 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/audience/page.tsx:104 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/audience/page.tsx:108 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/audience/page.tsx:112 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/audience/page.tsx:116 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/automations/page.tsx:97 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/billing/page.tsx:312 | `/dashboard/requests` | OK | static route exists |
| src/app/dashboard/card/page.tsx:100 | `/c/${MOCK_FLOWCARD.slug}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/chatbot/page.tsx:132 | `/dashboard/social` | OK | static route exists |
| src/app/dashboard/insights/page.tsx:85 | `/dashboard/social` | OK | static route exists |
| src/app/dashboard/insights/page.tsx:88 | `/dashboard/leads` | OK | static route exists |
| src/app/dashboard/leads/[id]/page.tsx:73 | `/dashboard/leads` | OK | static route exists |
| src/app/dashboard/leads/[id]/page.tsx:193 | `/dashboard/scripts` | OK | static route exists |
| src/app/dashboard/leads/[id]/page.tsx:218 | `{move.href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/leads/missed-call/page.tsx:80 | `/dashboard/leads` | OK | static route exists |
| src/app/dashboard/leads/page.tsx:42 | `/dashboard/leads/missed-call` | OK | static route exists |
| src/app/dashboard/leads/page.tsx:85 | `/dashboard/leads/${l.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/leads/page.tsx:152 | `/dashboard/social` | OK | static route exists |
| src/app/dashboard/leads/page.tsx:155 | `/dashboard/leads/missed-call` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:161 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:173 | `/dashboard/mortgage` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:189 | `/dashboard/mortgage` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:201 | `/dashboard/mortgage` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:244 | `/dashboard/mortgage` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:322 | `/dashboard/mortgage` | OK | static route exists |
| src/app/dashboard/mortgage/page.tsx:347 | `{cta.href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/notifications/page.tsx:118 | `{n.href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/onboarding/page.tsx:107 | `/dashboard` | OK | static route exists |
| src/app/dashboard/onboarding/page.tsx:166 | `{step.href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/page.tsx:75 | `/dashboard/work` | OK | static route exists |
| src/app/dashboard/page.tsx:154 | `/dashboard/insights` | OK | static route exists |
| src/app/dashboard/page.tsx:183 | `/dashboard/leads` | OK | static route exists |
| src/app/dashboard/page.tsx:193 | `/dashboard/leads/${l.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/page.tsx:225 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/playbooks/[id]/page.tsx:14 | `/dashboard/playbooks` | OK | static route exists |
| src/app/dashboard/playbooks/page.tsx:27 | `/dashboard/playbooks/${p.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/profile/page.tsx:71 | `/dashboard/settings` | OK | static route exists |
| src/app/dashboard/profile/page.tsx:74 | `/dashboard/billing` | OK | static route exists |
| src/app/dashboard/profile/page.tsx:203 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/recap/page.tsx:79 | `/dashboard/settings#notifications` | OK | static route exists |
| src/app/dashboard/recap/page.tsx:100 | `/dashboard/leads` | OK | static route exists |
| src/app/dashboard/recap/page.tsx:103 | `/dashboard/leads/missed-call` | OK | static route exists |
| src/app/dashboard/recap/page.tsx:210 | `/dashboard/leads/${l.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/recap/page.tsx:239 | `/dashboard/leads/${l.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/recap/page.tsx:270 | `/dashboard/scripts` | OK | static route exists |
| src/app/dashboard/recap/page.tsx:275 | `/dashboard/scripts` | OK | static route exists |
| src/app/dashboard/recap/page.tsx:286 | `/dashboard/leads` | OK | static route exists |
| src/app/dashboard/recap/page.tsx:289 | `/dashboard/playbooks` | OK | static route exists |
| src/app/dashboard/settings/page.tsx:49 | `/dashboard/billing` | OK | static route exists |
| src/app/dashboard/social/connect/[platform]/page.tsx:76 | `/dashboard/social` | OK | static route exists |
| src/app/dashboard/social/connect/[platform]/page.tsx:145 | `/pricing` | OK | static route exists |
| src/app/dashboard/social/connect/[platform]/page.tsx:179 | `/api/social/connect/${spec.id}?kind=${allowedKinds[0]}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/social/connect/[platform]/page.tsx:234 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/social/page.tsx:128 | `/pricing` | OK | static route exists |
| src/app/dashboard/social/page.tsx:242 | `/pricing` | OK | static route exists |
| src/app/dashboard/social/page.tsx:258 | `/pricing` | OK | static route exists |
| src/app/dashboard/social/page.tsx:267 | `/dashboard/social/connect/${platform.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/work/[id]/page.tsx:53 | `/dashboard/work` | OK | static route exists |
| src/app/dashboard/work/[id]/page.tsx:85 | `/book` | OK | static route exists |
| src/app/dashboard/work/[id]/page.tsx:172 | `/start` | OK | static route exists |
| src/app/dashboard/work/[id]/page.tsx:175 | `/offers/quick-look` | OK | dynamic route slug exists in source data |
| src/app/dashboard/work/[id]/page.tsx:178 | `/services` | OK | static route exists |
| src/app/dashboard/work/page.tsx:85 | `/start` | OK | static route exists |
| src/app/dashboard/work/page.tsx:88 | `/book` | OK | static route exists |
| src/app/dashboard/work/page.tsx:109 | `{nextAction.href}` | OK | dynamic expression or prop-driven target |
| src/app/dashboard/work/page.tsx:130 | `/stump-ryan` | OK | static route exists |
| src/app/dashboard/work/page.tsx:133 | `/offers/quick-look` | OK | dynamic route slug exists in source data |
| src/app/dashboard/work/page.tsx:185 | `/dashboard/work/${update.orderId}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/work/page.tsx:274 | `/dashboard/work/${order.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/work/page.tsx:351 | `/dashboard/work/${order.id}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/dashboard/work/page.tsx:401 | `/start` | OK | static route exists |
| src/app/dashboard/work/page.tsx:402 | `/offers/quick-look` | OK | dynamic route slug exists in source data |
| src/app/dashboard/work/page.tsx:403 | `/book` | OK | static route exists |
| src/app/demo/page.tsx:112 | `/login` | OK | static route exists |
| src/app/demo/page.tsx:115 | `/tiers` | OK | static route exists |
| src/app/demo/page.tsx:312 | `/offers/decision-sprint` | OK | dynamic route slug exists in source data |
| src/app/demo/page.tsx:318 | `/book` | OK | static route exists |
| src/app/demo/page.tsx:324 | `/login` | OK | static route exists |
| src/app/facebook-ad-offer/page.tsx:108 | `#blueprint-form` | OK | same-page anchor |
| src/app/facebook-ad-offer/page.tsx:114 | `/proof` | OK | static route exists |
| src/app/facebook-ad-offer/page.tsx:198 | `#blueprint-form` | OK | same-page anchor |
| src/app/grow-v2/page.tsx:425 | `/book` | OK | static route exists |
| src/app/grow-v2/page.tsx:451 | `/book` | OK | static route exists |
| src/app/grow-v2/page.tsx:499 | `/book` | OK | static route exists |
| src/app/grow-v2/page.tsx:592 | `/book` | OK | static route exists |
| src/app/grow-v2/page.tsx:632 | `/tiers` | OK | static route exists |
| src/app/grow-v2/page.tsx:633 | `/services` | OK | static route exists |
| src/app/grow-v2/page.tsx:634 | `/services/consulting` | OK | static route exists |
| src/app/grow-v2/page.tsx:635 | `/book` | OK | static route exists |
| src/app/growth/[slug]/page.tsx:86 | `#audit-form` | OK | same-page anchor |
| src/app/growth/[slug]/page.tsx:92 | `{page.secondaryHref}` | OK | dynamic expression or prop-driven target |
| src/app/lead-leak-audit/page.tsx:114 | `#audit-form` | OK | same-page anchor |
| src/app/lead-leak-audit/page.tsx:120 | `/organic-growth` | OK | static route exists |
| src/app/lead-leak-audit/page.tsx:194 | `/proof` | OK | static route exists |
| src/app/lead-leak-audit/page.tsx:229 | `/growth/${page.slug}` | OK | /growth/[slug] dynamic route |
| src/app/lead-leak-audit/thank-you/page.tsx:94 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/leaderboard/boost-success/page.tsx:77 | `/leaderboard` | OK | static route exists |
| src/app/leaderboard/boost-success/page.tsx:86 | `/leaderboard` | OK | static route exists |
| src/app/leaderboard/page.tsx:112 | `#vote` | OK | same-page anchor |
| src/app/leaderboard/page.tsx:118 | `#boost` | OK | same-page anchor |
| src/app/leaderboard/page.tsx:364 | `/contact` | OK | static route exists |
| src/app/leaderboard/page.tsx:370 | `/services` | OK | static route exists |
| src/app/leaderboard/page.tsx:449 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/leaderboard/success/page.tsx:185 | `/leaderboard` | OK | static route exists |
| src/app/leaderboard/success/page.tsx:288 | `/b/${result.slug}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/leaderboard/success/page.tsx:320 | `/leaderboard` | OK | static route exists |
| src/app/leaderboard/success/page.tsx:326 | `/leaderboard?prefill=${encodeURIComponent(result.publicName)}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/legal/page.tsx:43 | `{document.path}` | OK | dynamic expression or prop-driven target |
| src/app/login/page.tsx:56 | `/lead-leak-audit-197` | OK | static route exists |
| src/app/login/page.tsx:59 | `/` | OK | static route exists |
| src/app/login/page.tsx:91 | `/` | OK | static route exists |
| src/app/login/page.tsx:95 | `/book` | OK | static route exists |
| src/app/login/page.tsx:98 | `/` | OK | static route exists |
| src/app/login/page.tsx:386 | `/legal` | OK | static route exists |
| src/app/offers/[slug]/page.tsx:82 | `/start` | OK | static route exists |
| src/app/offers/[slug]/page.tsx:134 | `{O.primaryCta.href}` | OK | dynamic expression or prop-driven target |
| src/app/offers/[slug]/page.tsx:140 | `{O.secondaryCta.href}` | OK | dynamic expression or prop-driven target |
| src/app/offers/[slug]/page.tsx:385 | `{O.primaryCta.href}` | OK | dynamic expression or prop-driven target |
| src/app/offers/[slug]/page.tsx:391 | `{O.secondaryCta.href}` | OK | dynamic expression or prop-driven target |
| src/app/organic-growth/page.tsx:86 | `/lead-leak-audit` | OK | static route exists |
| src/app/organic-growth/page.tsx:92 | `/proof` | OK | static route exists |
| src/app/organic-growth/page.tsx:129 | `/growth/${page.slug}` | OK | /growth/[slug] dynamic route |
| src/app/page.tsx:234 | `/stump-ryan` | OK | static route exists |
| src/app/page.tsx:240 | `/lead-leak-audit` | OK | static route exists |
| src/app/page.tsx:257 | `/proof` | OK | static route exists |
| src/app/page.tsx:413 | `/stump-ryan` | OK | static route exists |
| src/app/page.tsx:419 | `/lead-leak-audit` | OK | static route exists |
| src/app/page.tsx:599 | `{demo.href}` | OK | dynamic expression or prop-driven target |
| src/app/page.tsx:703 | `/book` | OK | static route exists |
| src/app/page.tsx:767 | `{route.href}` | OK | dynamic expression or prop-driven target |
| src/app/platforms/[handle]/page.tsx:83 | `/offers/${p.primaryOfferSlug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/platforms/[handle]/page.tsx:89 | `/book` | OK | static route exists |
| src/app/platforms/[handle]/page.tsx:196 | `/offers/${p.primaryOfferSlug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/platforms/[handle]/page.tsx:203 | `/book` | OK | static route exists |
| src/app/platforms/[handle]/page.tsx:293 | `/offers/${p.primaryOfferSlug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/platforms/[handle]/page.tsx:299 | `/book` | OK | static route exists |
| src/app/proof/page.tsx:80 | `/lead-leak-audit` | OK | static route exists |
| src/app/proof/page.tsx:86 | `/pulse` | OK | static route exists |
| src/app/pulse/[signal]/page.tsx:190 | `/pulse` | OK | static route exists |
| src/app/pulse/[signal]/page.tsx:330 | `/stump-ryan` | OK | static route exists |
| src/app/pulse/[signal]/page.tsx:337 | `/book` | OK | static route exists |
| src/app/pulse/[signal]/page.tsx:344 | `/pulse` | OK | static route exists |
| src/app/pulse/[signal]/page.tsx:366 | `/pulse` | OK | static route exists |
| src/app/pulse/[signal]/page.tsx:374 | `/pulse/${item.slug}` | OK | /pulse/[signal] dynamic route |
| src/app/pulse/page.tsx:261 | `/start` | OK | static route exists |
| src/app/pulse/page.tsx:267 | `/book` | OK | static route exists |
| src/app/pulse/page.tsx:351 | `/stump-ryan` | OK | static route exists |
| src/app/pulse/page.tsx:364 | `/pulse/${signal.slug}` | OK | /pulse/[signal] dynamic route |
| src/app/pulse/page.tsx:475 | `/tools/ad-account-autopsy` | OK | static route exists |
| src/app/pulse/page.tsx:481 | `/stump-ryan` | OK | static route exists |
| src/app/pulse/page.tsx:487 | `/book` | OK | static route exists |
| src/app/pulse/page.tsx:614 | `/services` | OK | static route exists |
| src/app/pulse/page.tsx:622 | `/availability` | OK | static route exists |
| src/app/pulse/page.tsx:630 | `/tiers` | OK | static route exists |
| src/app/services/consulting/page.tsx:162 | `#consulting-products` | OK | same-page anchor |
| src/app/services/consulting/page.tsx:168 | `/book` | OK | static route exists |
| src/app/services/consulting/page.tsx:204 | `#all-consulting-offers` | OK | same-page anchor |
| src/app/services/consulting/page.tsx:247 | `/tiers` | OK | static route exists |
| src/app/services/consulting/page.tsx:341 | `/start` | OK | static route exists |
| src/app/services/consulting/page.tsx:347 | `/book` | OK | static route exists |
| src/app/services/consulting/page.tsx:376 | `/offers/${slug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/services/consulting/page.tsx:418 | `/offers/${slug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/services/consulting/page.tsx:459 | `/offers/${slug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/services/page.tsx:197 | `/tiers` | OK | static route exists |
| src/app/services/page.tsx:293 | `/book` | OK | static route exists |
| src/app/services/page.tsx:299 | `/start` | OK | static route exists |
| src/app/services/page.tsx:402 | `/platforms/${p.handle}` | OK | /platforms/[handle] dynamic route; source handles checked separately |
| src/app/services/page.tsx:481 | `/offers/power-bundle` | OK | dynamic route slug exists in source data |
| src/app/services/page.tsx:487 | `/book` | OK | static route exists |
| src/app/services/page.tsx:554 | `/offers/fb-ads` | OK | dynamic route slug exists in source data |
| src/app/services/page.tsx:560 | `/book` | OK | static route exists |
| src/app/services/page.tsx:703 | `/offers/power-bundle` | OK | dynamic route slug exists in source data |
| src/app/services/page.tsx:709 | `/offers/quick-look` | OK | dynamic route slug exists in source data |
| src/app/services/page.tsx:715 | `/book` | OK | static route exists |
| src/app/services/page.tsx:756 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/solutions/mortgage/page.tsx:107 | `#pricing` | OK | same-page anchor |
| src/app/solutions/mortgage/page.tsx:113 | `/book?source=mortgage-audit` | OK | static route exists |
| src/app/solutions/mortgage/page.tsx:250 | `/api/checkout?sku=mortgage-${p.slug}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/solutions/mortgage/page.tsx:316 | `/book?source=mortgage-audit` | OK | static route exists |
| src/app/solutions/mortgage/page.tsx:319 | `/api/checkout?sku=mortgage-pro` | OK | static route exists |
| src/app/start/page.tsx:272 | `#router` | OK | same-page anchor |
| src/app/start/page.tsx:307 | `#router` | OK | same-page anchor |
| src/app/start/page.tsx:601 | `/tiers` | OK | static route exists |
| src/app/start/page.tsx:605 | `/book` | OK | static route exists |
| src/app/start/page.tsx:652 | `/offers/${slug}` | OK | /offers/[slug] dynamic route; source slugs checked separately |
| src/app/start/thank-you/page.tsx:80 | `/login?callbackUrl=%2Fdashboard%2Fwork` | OK | static route exists |
| src/app/start/thank-you/page.tsx:86 | `/start` | OK | static route exists |
| src/app/start/thank-you/page.tsx:92 | `/book` | OK | static route exists |
| src/app/story/page.tsx:297 | `/tiers` | OK | static route exists |
| src/app/story/page.tsx:303 | `/book` | OK | static route exists |
| src/app/story/page.tsx:309 | `/offers/decision-sprint` | OK | dynamic route slug exists in source data |
| src/app/stump-ryan/thank-you/page.tsx:121 | `/proof` | OK | static route exists |
| src/app/stump-ryan/thank-you/page.tsx:172 | `/book?source=stump-ryan-thank-you` | OK | static route exists |
| src/app/stump-ryan/thank-you/page.tsx:231 | `{href}` | OK | dynamic expression or prop-driven target |
| src/app/tiers/page.tsx:436 | `/book` | OK | static route exists |
| src/app/tiers/page.tsx:527 | `{card.ctaHref}` | OK | dynamic expression or prop-driven target |
| src/app/tools/ad-account-autopsy/page.tsx:50 | `/pulse` | OK | static route exists |
| src/app/tools/seo-grader/page.tsx:22 | `/` | OK | static route exists |
| src/app/tools/seo-grader/page.tsx:91 | `/` | OK | static route exists |
| src/app/voice/[slug]/page.tsx:46 | `/voice` | OK | static route exists |
| src/app/voice/page.tsx:83 | `/voice/${t.slug}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/voice/success/page.tsx:82 | `/voice/${r.topic.slug}` | OK | dynamic internal target uses existing route pattern if runtime value is valid |
| src/app/voice/success/page.tsx:91 | `/voice` | OK | static route exists |
| src/components/site/AutomationFlow.tsx:64 | `{s.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/BuiltProjectCard.tsx:46 | `{project.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/CTA.tsx:17 | `/signup` | OK | static route exists |
| src/components/site/CTA.tsx:20 | `#pricing` | OK | same-page anchor |
| src/components/site/CommunitySubnav.tsx:44 | `{tab.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Features.tsx:102 | `{f.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Footer.tsx:41 | `/refunds` | OK | static route exists |
| src/components/site/Footer.tsx:58 | `{item.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Header.tsx:17 | `/` | OK | static route exists |
| src/components/site/Header.tsx:19 | `{item.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Header.tsx:25 | `/lead-leak-audit-197` | OK | static route exists |
| src/components/site/Hero.tsx:35 | `/signup` | OK | static route exists |
| src/components/site/Hero.tsx:38 | `#features` | OK | same-page anchor |
| src/components/site/Hero.tsx:46 | `{t.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Hero.tsx:85 | `/tools/seo-grader` | OK | static route exists |
| src/components/site/Hero.tsx:123 | `/signup` | OK | static route exists |
| src/components/site/Hero.tsx:126 | `#how` | OK | same-page anchor |
| src/components/site/LegalDocumentView.tsx:26 | `{item.path}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightHeader.tsx:70 | `/` | OK | static route exists |
| src/components/site/LightHeader.tsx:86 | `{item.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightHeader.tsx:106 | `{item.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightHeader.tsx:121 | `{primary.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightHeader.tsx:130 | `{secondary.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightHeader.tsx:185 | `{action.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightHeader.tsx:236 | `{item.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightMobileMenu.tsx:114 | `/` | OK | static route exists |
| src/components/site/LightMobileMenu.tsx:135 | `{featuredPrimary.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightMobileMenu.tsx:149 | `{featuredSecondary.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LightMobileMenu.tsx:174 | `{item.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LiveLeadFlowPulse.tsx:610 | `/rewards` | OK | static route exists |
| src/components/site/LiveLeadFlowPulse.tsx:1182 | `{href}` | OK | dynamic expression or prop-driven target |
| src/components/site/LiveLeadFlowPulse.tsx:1286 | `{href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Logo.tsx:52 | `{href}` | OK | dynamic expression or prop-driven target |
| src/components/site/MiniExplainer.tsx:260 | `{config.ctaHref}` | OK | dynamic expression or prop-driven target |
| src/components/site/MobileMenu.tsx:52 | `{n.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/MobileMenu.tsx:63 | `/lead-leak-audit-197` | OK | static route exists |
| src/components/site/PageValueModule.tsx:205 | `{active.ctaHref}` | OK | dynamic expression or prop-driven target |
| src/components/site/PageValueModule.tsx:325 | `{active.packageHref}` | OK | dynamic expression or prop-driven target |
| src/components/site/PageValueModule.tsx:429 | `{active.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/PageValueModule.tsx:522 | `{active.href}` | OK | dynamic expression or prop-driven target |
| src/components/site/Pricing.tsx:63 | `/signup` | OK | static route exists |
| src/components/site/PulseBusinessDemo.tsx:185 | `/stump-ryan#tool-challenge-form` | OK | static route exists |
| src/components/site/PulseBusinessDemo.tsx:282 | `/stump-ryan#tool-challenge-form` | OK | static route exists |
| src/components/site/SitePulseTracker.tsx:697 | `/pulse` | OK | static route exists |
| src/components/site/TierSalesPage.tsx:42 | `/signup` | OK | static route exists |
| src/components/site/TierSalesPage.tsx:194 | `/pricing` | OK | static route exists |
| src/components/site/ToolRequests.tsx:48 | `/dashboard/requests` | OK | static route exists |
