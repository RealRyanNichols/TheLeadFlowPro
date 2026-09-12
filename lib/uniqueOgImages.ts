/** Finished page-specific artwork. Versioned filenames refresh social crawler caches.
 * Keep this map additive: a later batch must preserve already completed URLs.
 * Only literal public paths belong here; never add tokens or user-provided data.
 */
export const UNIQUE_OG_IMAGES: Readonly<Record<string, string>> = {
  "/go/time-back": "/og/unique/2026-09-12/go--time-back.jpg",
  "/packages": "/og/unique/2026-09-12/packages.jpg",
  "/live": "/og/unique/2026-09-12/live.jpg",
  "/tools/missed-call-calculator":
    "/og/unique/2026-09-12/tools--missed-call-calculator.jpg",
  "/academy": "/og/unique/2026-09-12/academy.jpg",
  "/diagnostic": "/og/unique/2026-09-12/diagnostic.jpg",
  "/start": "/og/unique/2026-09-12/start.jpg",
  "/articles": "/og/unique/2026-09-12/articles.jpg",
  "/privacy": "/og/unique/2026-09-12/privacy.jpg",
  "/operator-academy/content-engine":
    "/og/unique/2026-09-12/operator-academy--content-engine.jpg",
  "/add-ons": "/og/unique/2026-09-12/add-ons.jpg",
  "/events/chatgpt-for-business-owners-longview":
    "/og/unique/2026-09-12/events--chatgpt-for-business-owners-longview.jpg",
  "/go/lead-follow-up": "/og/unique/2026-09-12/go--lead-follow-up.jpg",
  "/proof-floor": "/og/unique/2026-09-12/proof-floor.jpg",
  "/system/attention": "/og/unique/2026-09-12/system--attention.jpg",
  "/chatgpt/free": "/og/unique/2026-09-12/chatgpt--free.jpg",
  "/tools/digital-business-card":
    "/og/unique/2026-09-12/tools--digital-business-card.jpg",
  "/packages/launch": "/og/unique/2026-09-12/packages--launch.jpg",
  "/showcase": "/og/unique/2026-09-12/showcase.jpg",
  "/tools/pro/missed-call-text-back-kit":
    "/og/unique/2026-09-12/tools--pro--missed-call-text-back-kit.jpg",
  "/tools/profit-margin-calculator":
    "/og/unique/2026-09-12/tools--profit-margin-calculator.jpg",
  "/book": "/og/unique/2026-09-12/book.jpg",
  "/go/tools": "/og/unique/2026-09-12/go--tools.jpg",
  "/packages/industry-os": "/og/unique/2026-09-12/packages--industry-os.jpg",
  "/packages/system-map": "/og/unique/2026-09-12/packages--system-map.jpg",
  "/pricing": "/og/unique/2026-09-12/pricing.jpg",
  "/terms": "/og/unique/2026-09-12/terms.jpg",
  "/tools/collections/restaurants-and-food":
    "/og/unique/2026-09-12/tools--collections--restaurants-and-food.jpg",
  "/tools/household-budget-planner":
    "/og/unique/2026-09-12/tools--household-budget-planner.jpg",
  "/tools/rent-receipt": "/og/unique/2026-09-12/tools--rent-receipt.jpg",
  "/articles/free-tools-that-bring-customers":
    "/og/unique/2026-09-12/articles--free-tools-that-bring-customers.jpg",
  "/articles/website-text-too-small-on-mobile":
    "/og/unique/2026-09-12/articles--website-text-too-small-on-mobile.jpg",
  "/system/crm": "/og/unique/2026-09-12/system--crm.jpg",
  "/tools/ad-budget-planner":
    "/og/unique/2026-09-12/tools--ad-budget-planner.jpg",
  "/tools/ad-character-counter":
    "/og/unique/2026-09-12/tools--ad-character-counter.jpg",
  "/tools/ad-test-budget-calculator":
    "/og/unique/2026-09-12/tools--ad-test-budget-calculator.jpg",
  "/tools/add-to-calendar-link":
    "/og/unique/2026-09-12/tools--add-to-calendar-link.jpg",
  "/tools/admin-time-audit":
    "/og/unique/2026-09-12/tools--admin-time-audit.jpg",
  "/tools/after-hours-lead-calculator":
    "/og/unique/2026-09-12/tools--after-hours-lead-calculator.jpg",
  "/tools/bad-review-impact":
    "/og/unique/2026-09-12/tools--bad-review-impact.jpg",
  "/tools/break-even-calculator":
    "/og/unique/2026-09-12/tools--break-even-calculator.jpg",
  "/tools/cac-payback-calculator":
    "/og/unique/2026-09-12/tools--cac-payback-calculator.jpg",
  "/tools/cancellation-policy-generator":
    "/og/unique/2026-09-12/tools--cancellation-policy-generator.jpg",
  "/tools/capacity-calculator":
    "/og/unique/2026-09-12/tools--capacity-calculator.jpg",
  "/tools/cash-runway-calculator":
    "/og/unique/2026-09-12/tools--cash-runway-calculator.jpg",
  "/tools/childcare-vs-work-calculator":
    "/og/unique/2026-09-12/tools--childcare-vs-work-calculator.jpg",
  "/tools/click-to-call-button":
    "/og/unique/2026-09-12/tools--click-to-call-button.jpg",
  "/tools/close-rate-calculator":
    "/og/unique/2026-09-12/tools--close-rate-calculator.jpg",
  "/tools/collections/getting-more-leads":
    "/og/unique/2026-09-12/tools--collections--getting-more-leads.jpg",
  "/tools/collections/home-services":
    "/og/unique/2026-09-12/tools--collections--home-services.jpg",
};

export function uniqueOgImagePath(path: string): string | undefined {
  return Object.hasOwn(UNIQUE_OG_IMAGES, path)
    ? UNIQUE_OG_IMAGES[path]
    : undefined;
}
