import { MANAGED_PLANS, type ManagedPlanId } from "./managedPlans";

export type AgencyServiceOption = { slug: string; label: string };
export const AGENCY_CHANNELS = [
  ["facebook_instagram", "Facebook or Instagram"],
  ["google_ads", "Google Ads"],
  ["google_business", "Google Business Profile and reviews"],
  ["referrals", "Referrals and word of mouth"],
  ["website", "Our website"],
  ["none", "Nothing steady yet"],
] as const;
export const AGENCY_DECIDERS = [
  ["me", "I decide"],
  ["shared", "A partner or spouse decides with me"],
  ["someone_else", "Someone else signs off"],
] as const;
export const AGENCY_TIMELINES = [
  ["this_month", "This month"],
  ["30_60_days", "In the next 30 to 60 days"],
  ["this_quarter", "This quarter"],
  ["researching", "Just researching for now"],
] as const;
export const AGENCY_OTHER_PLANS = [
  ["custom", "A larger plan or custom build"],
  ["discuss", "Help me choose a starting plan"],
] as const;

export type AgencyIntakeField =
  | "business_name"
  | "full_name"
  | "email"
  | "phone"
  | "website_url"
  | "services"
  | "managed_plan_budget"
  | "bottleneck"
  | "decision_maker"
  | "timeline";
export type AgencyIntakeErrors = Partial<Record<AgencyIntakeField, string>>;
export type AgencyPlanChoice = ManagedPlanId | "custom" | "discuss";
type QueryValue = string | string[] | undefined;

/** Ignore repeated/unknown choices rather than silently selecting a tier or client. */
export function agencyIntakeContext(
  params: { service?: QueryValue; plan?: QueryValue; lead?: QueryValue },
  knownServices: readonly { slug: string }[],
  coreServices: readonly { slug: string }[],
) {
  const requestedService =
    typeof params.service === "string" &&
    knownServices.some((service) => service.slug === params.service)
      ? params.service
      : null;
  const preselected = requestedService
    ? coreServices.some((service) => service.slug === requestedService)
      ? requestedService
      : "custom"
    : null;
  const initialPlan =
    typeof params.plan === "string" &&
    [
      ...MANAGED_PLANS.map((plan) => plan.id),
      ...AGENCY_OTHER_PLANS.map(([choice]) => choice),
    ].some((choice) => choice === params.plan)
      ? (params.plan as AgencyPlanChoice)
      : null;
  const originatingLead =
    typeof params.lead === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.lead,
    )
      ? params.lead.toLowerCase()
      : null;
  return { requestedService, preselected, initialPlan, originatingLead };
}

/** Carry campaign and private scope attribution through a price-card handoff.
 * Only named attribution fields are copied; no arbitrary query or secret is forwarded. */
export function agencyIntakeHref(
  plan: AgencyPlanChoice | null,
  params: Record<string, QueryValue> = {},
): string {
  const query = new URLSearchParams();
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]) {
    const values = Array.isArray(params[key]) ? params[key] : [params[key]];
    for (const value of values ?? [])
      if (typeof value === "string" && value.trim())
        query.append(key, value.trim().slice(0, 100));
  }
  if (
    typeof params.service === "string" &&
    /^[a-z][a-z\d-]{0,59}$/.test(params.service)
  )
    query.set("service", params.service);
  if (
    typeof params.lead === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.lead,
    )
  )
    query.set("lead", params.lead.toLowerCase());
  if (plan) query.set("plan", plan);
  return `/agency/start${query.size ? `?${query}` : ""}`;
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Accept a pasted domain while storing an ordinary HTTP(S) link, never credentials. */
export function agencyWebsiteUrl(value: string): string | null {
  if (!value) return null;
  if (value.length > 300 || /\s/.test(value))
    throw new Error("Invalid website link");
  const url = new URL(
    /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`,
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname.includes(".") ||
    url.username ||
    url.password ||
    url.href.length > 300
  )
    throw new Error("Invalid website link");
  return url.href;
}

/** Frontend validation mirrors the lead API's name/email bounds; no submission occurs here. */
export function validateAgencyIntake(
  form: FormData,
  services: readonly AgencyServiceOption[],
) {
  const errors: AgencyIntakeErrors = {};
  const businessName = text(form, "business_name");
  const fullName = text(form, "full_name");
  const email = text(form, "email");
  const phone = text(form, "phone");
  const smsConsent = form.get("sms_consent") === "on";
  const picked = services.filter(
    (service) => form.get(`service_${service.slug}`) === "on",
  );
  const rawPlan = text(form, "managed_plan_budget");
  const plan = [
    ...MANAGED_PLANS.map((entry) => entry.id),
    ...AGENCY_OTHER_PLANS.map(([id]) => id),
  ].find((id) => id === rawPlan);
  const decider = AGENCY_DECIDERS.find(
    ([id]) => id === form.get("decision_maker"),
  );
  const timeline = AGENCY_TIMELINES.find(([id]) => id === form.get("timeline"));
  const bottleneck = text(form, "bottleneck");
  let websiteUrl: string | null = null;

  if (!businessName || businessName.length > 200)
    errors.business_name = "Enter your business name.";
  if (!fullName || fullName.length > 200) errors.full_name = "Enter your name.";
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter an email address, such as you@business.com.";
  if (smsConsent && !phone)
    errors.phone = "Add a mobile number before choosing call or text consent.";
  else if (
    phone &&
    (phone.length > 50 ||
      !/^\+?[\d().\s-]+$/.test(phone) ||
      !/^\d{10,15}$/.test(phone.replace(/\D/g, "")))
  )
    errors.phone =
      "Enter a phone number with its area or country code, or leave it blank.";
  try {
    websiteUrl = agencyWebsiteUrl(text(form, "website_url"));
  } catch {
    errors.website_url =
      "Enter a website or Facebook link, such as yourbusiness.com, or leave it blank.";
  }
  if (!picked.length)
    errors.services = "Choose at least one service, or select a custom build.";
  if (!plan)
    errors.managed_plan_budget = "Choose a plan, or ask us to help you choose.";
  if (!bottleneck || bottleneck.length > 1000)
    errors.bottleneck =
      "Tell us what you want to improve in a sentence or two.";
  if (!decider) errors.decision_maker = "Choose who will approve the work.";
  if (!timeline)
    errors.timeline = "Choose when you want to start. Researching is fine.";

  if (Object.keys(errors).length) return { ok: false as const, errors };
  return {
    ok: true as const,
    value: {
      businessName,
      fullName,
      email,
      phone: phone || null,
      websiteUrl,
      smsConsent,
      marketingEmailConsent: form.get("marketing_email_consent") === "on",
      picked,
      plan: plan!,
      decider: decider!,
      timeline: timeline!,
      bottleneck,
      channels: AGENCY_CHANNELS.filter(
        ([id]) => form.get(`channel_${id}`) === "on",
      ),
    },
  };
}
