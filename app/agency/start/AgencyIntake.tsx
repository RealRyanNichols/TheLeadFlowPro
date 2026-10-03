"use client";

// Answers remain in the form on an error. The existing lead API stores the
// owner summary in goals and the private structured answers in diagnostic.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SmsConsentText } from "@/components/site/SmsConsentText";
import { useFormReady } from "@/components/site/useFormReady";
import { campaignTags, storedCampaignTags } from "@/lib/site/campaignTags";
import { BUSINESS } from "@/lib/site/business";
import {
  AGENCY_CHANNELS,
  AGENCY_DECIDERS,
  AGENCY_TIMELINES,
  validateAgencyIntake,
  type AgencyIntakeErrors,
  type AgencyIntakeField,
  type AgencyServiceOption,
} from "@/lib/site/agencyIntake";
import {
  MANAGED_COMMERCIAL_TERMS,
  MANAGED_PLANS,
  managedCampaignSummary,
  managedAdvertisingExplanation,
  managedCompletionExplanation,
  managedRenewalExplanation,
  managedPlanPrice,
} from "@/lib/site/managedPlans";
import styles from "./agency-intake.module.css";

type Status = "idle" | "sending" | "done";

function Section({
  number,
  title,
  note,
  requiredMark,
  children,
  ...props
}: {
  number: number;
  title: string;
  note?: string;
  requiredMark?: boolean;
  children: ReactNode;
} & React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return (
    <fieldset className={styles.section} {...props}>
      <legend className={styles.legend}>
        <span className={styles.step} aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
        <span>
          {title}
          {requiredMark ? <span aria-hidden="true"> *</span> : null}
        </span>
      </legend>
      <div className={styles.sectionBody}>
        {note ? <p className={styles.helper}>{note}</p> : null}
        {children}
      </div>
    </fieldset>
  );
}

export default function AgencyIntake({
  services,
  preselected,
  placement = "agency_start",
  requestedService = null,
  originatingLead = null,
}: {
  services: AgencyServiceOption[];
  preselected: string | null;
  initialPlan?: string | null;
  requestedService?: string | null;
  originatingLead?: string | null;
  placement?: "agency_start" | "agency_hub";
}) {
  const ready = useFormReady();
  const prefix = useId();
  const id = (field: string) => `${prefix}-${field}`;
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<AgencyIntakeErrors>({});
  const [serverError, setServerError] = useState(false);
  const [errorVersion, setErrorVersion] = useState(0);
  const sending = useRef(false);
  const errorNotice = useRef<HTMLDivElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const campaign = MANAGED_PLANS[0];
  const campaignPrice = managedPlanPrice(campaign);
  const busy = !ready || status === "sending";

  useEffect(() => {
    if (errorVersion) errorNotice.current?.focus();
  }, [errorVersion]);
  useEffect(() => {
    if (status === "done") doneHeading.current?.focus();
  }, [status]);

  function fieldError(field: AgencyIntakeField) {
    return errors[field] ? (
      <span id={id(`${field}-error`)} className={styles.fieldError}>
        {errors[field]}
      </span>
    ) : null;
  }
  function fieldA11y(field: AgencyIntakeField, helper?: string) {
    return {
      "aria-invalid": errors[field] ? (true as const) : undefined,
      "aria-describedby":
        [helper, errors[field] ? id(`${field}-error`) : null]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }
  function clearError(event: React.FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name;
    const field = name.startsWith("service_")
      ? "services"
      : name === "sms_consent"
        ? "phone"
        : name;
    if (errors[field as AgencyIntakeField]) {
      setErrors((previous) => {
        const next = { ...previous };
        delete next[field as AgencyIntakeField];
        return next;
      });
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || sending.current) return;
    setServerError(false);
    const result = validateAgencyIntake(
      new FormData(event.currentTarget),
      services,
    );
    if (!result.ok) {
      setErrors(result.errors);
      setErrorVersion((version) => version + 1);
      return;
    }
    setErrors({});
    const values = result.value;
    const summary = [
      `AGENCY INTAKE: ${values.picked.map((service) => service.label).join(", ")}.`,
      values.channels.length
        ? `Current channels: ${values.channels.map(([, label]) => label).join(", ")}.`
        : "",
      `Campaign under consideration: ${campaign.name}, ${campaignPrice.amount} ${campaignPrice.unit}. Agreed advertising allocation included; scope and goal agreed in writing.`,
      `Decision-maker: ${values.decider[1]}.`,
      `Timeline: ${values.timeline[1]}.`,
      `Bottleneck: ${values.bottleneck}`,
    ]
      .filter(Boolean)
      .join(" ");
    sending.current = true;
    setStatus("sending");
    const tags = campaignTags(
      new URLSearchParams(window.location.search),
      storedCampaignTags(),
      "agency_intake",
    );
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: values.fullName,
          business_name: values.businessName,
          email: values.email,
          phone: values.phone,
          website_url: values.websiteUrl,
          interest: "done_for_you",
          goals: summary.slice(0, 2000),
          budget_range: values.plan,
          timeline: values.timeline[0],
          best_contact_method:
            values.smsConsent && values.phone ? "phone" : "email",
          sms_consent: values.smsConsent && Boolean(values.phone),
          marketing_email_consent: values.marketingEmailConsent,
          utm_source: tags.utm_source,
          utm_medium: tags.utm_medium,
          utm_campaign: tags.utm_campaign,
          diagnostic: {
            version: 3,
            source: "agency_intake",
            services: values.picked.map((service) => service.slug),
            channels: values.channels.map(([choice]) => choice),
            managed_plan_budget: values.plan,
            advertising_included: true,
            upfront_treatment: "initial_campaign",
            initial_campaign_days: MANAGED_COMMERCIAL_TERMS.initialCampaignDays,
            campaign_acknowledged: values.campaignAcknowledged,
            automatic_extension: false,
            decision_maker: values.decider[0],
            timeline: values.timeline[0],
            bottleneck: values.bottleneck,
            preselected,
            requested_service: requestedService ?? preselected,
            originating_lead_id: originatingLead,
            placement,
          },
        }),
      });
      if (!res.ok) throw new Error("Request not confirmed");
      setStatus("done");
    } catch {
      setServerError(true);
      setStatus("idle");
      setErrorVersion((version) => version + 1);
    } finally {
      sending.current = false;
    }
  }

  if (status === "done") {
    return (
      <div className={styles.success} role="status">
        <CheckCircle2 size={32} aria-hidden="true" />
        <p className={styles.eyebrow}>Request received</p>
        <h2 ref={doneHeading} tabIndex={-1}>
          Your next step is a clear scope.
        </h2>
        <p>
          Expect a reply within one business day to map the first ninety days.
          We call or text only when you chose that consent.
        </p>
        <p>Nothing is scoped, built, or billed until you see it in writing.</p>
        <p>{managedRenewalExplanation()}</p>
        <Link href="/pricing" className={styles.textLink}>
          Review the 90-day campaign <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      method="post"
      action="/api/leads"
      onSubmit={submit}
      onChange={clearError}
      noValidate
      aria-label="Agency intake"
      aria-busy={busy}
    >
      <noscript>
        <p className={styles.helper}>
          This form needs JavaScript. You can{" "}
          <a href={BUSINESS.phone.tel}>call {BUSINESS.phone.display}</a> or{" "}
          <a href={BUSINESS.phone.sms}>text us</a> to discuss a campaign.
        </p>
      </noscript>
      <div className={styles.planSummary}>
        <ShieldCheck size={24} aria-hidden="true" />
        <div>
          <p className={styles.eyebrow}>Your starting point</p>
          <strong>{managedCampaignSummary()}</strong>
          <p>{managedAdvertisingExplanation()}</p>
        </div>
      </div>
      <p className={styles.requiredNote}>
        Fields marked <span aria-hidden="true">*</span> are required. Contact
        preferences are optional.
      </p>

      {Object.keys(errors).length || serverError ? (
        <div
          ref={errorNotice}
          tabIndex={-1}
          role="alert"
          className={styles.errorSummary}
        >
          {serverError ? (
            <>
              <strong>We could not confirm your request.</strong>
              <p>
                Your answers are still here. Try again, or{" "}
                <a href={`mailto:${BUSINESS.email.hello}`}>email us</a> or{" "}
                <a href={BUSINESS.phone.tel}>call {BUSINESS.phone.display}</a>.
              </p>
            </>
          ) : (
            <>
              <strong>A few details need your attention.</strong>
              <ul>
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>
                    <a
                      href={`#${id(field)}`}
                      onClick={() =>
                        document.getElementById(id(field))?.focus()
                      }
                    >
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <Section number={1} title="About your business" disabled={busy}>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor={id("business_name")}>
            Business name <span aria-hidden="true">*</span>
            <input
              id={id("business_name")}
              className={styles.input}
              name="business_name"
              type="text"
              required
              maxLength={200}
              autoComplete="organization"
              {...fieldA11y("business_name")}
            />
            {fieldError("business_name")}
          </label>
          <label className={styles.label} htmlFor={id("full_name")}>
            Your name <span aria-hidden="true">*</span>
            <input
              id={id("full_name")}
              className={styles.input}
              name="full_name"
              type="text"
              required
              maxLength={200}
              autoComplete="name"
              {...fieldA11y("full_name")}
            />
            {fieldError("full_name")}
          </label>
          <label className={styles.label} htmlFor={id("email")}>
            Email <span aria-hidden="true">*</span>
            <input
              id={id("email")}
              className={styles.input}
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              inputMode="email"
              {...fieldA11y("email")}
            />
            {fieldError("email")}
          </label>
          <label className={styles.label} htmlFor={id("phone")}>
            Mobile <span className={styles.optional}>Optional</span>
            <input
              id={id("phone")}
              className={styles.input}
              name="phone"
              type="tel"
              maxLength={50}
              autoComplete="tel"
              inputMode="tel"
              {...fieldA11y("phone", id("phone-help"))}
            />
            <span id={id("phone-help")} className={styles.fieldHelp}>
              Call and text consent is your choice below.
            </span>
            {fieldError("phone")}
          </label>
          <label
            className={`${styles.label} ${styles.fullWidth}`}
            htmlFor={id("website_url")}
          >
            Website or Facebook page{" "}
            <span className={styles.optional}>Optional</span>
            <input
              id={id("website_url")}
              className={styles.input}
              name="website_url"
              type="text"
              maxLength={300}
              placeholder="yourbusiness.com"
              inputMode="url"
              {...fieldA11y("website_url")}
            />
            {fieldError("website_url")}
          </label>
        </div>
      </Section>

      <Section
        number={2}
        disabled={busy}
        title="What should we handle?"
        requiredMark
        note="Choose everything that needs attention. We will agree on what belongs in your scope."
        id={id("services")}
        tabIndex={-1}
        {...fieldA11y("services")}
      >
        <div className={styles.choiceGrid}>
          {services.map((service) => (
            <label key={service.slug} className={styles.choice}>
              <input
                type="checkbox"
                name={`service_${service.slug}`}
                defaultChecked={preselected === service.slug}
                {...fieldA11y("services")}
              />
              <span>{service.label}</span>
            </label>
          ))}
        </div>
        {fieldError("services")}
      </Section>

      <Section
        number={3}
        disabled={busy}
        title="Where do customers find you?"
        note="Optional. Choose the channels you use today."
      >
        <div className={styles.choiceGrid}>
          {AGENCY_CHANNELS.map(([choice, label]) => (
            <label key={choice} className={styles.choice}>
              <input type="checkbox" name={`channel_${choice}`} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section
        number={4}
        disabled={busy}
        title="Review the campaign starting point"
        requiredMark
        note="This request does not start a subscription or authorize a payment. We confirm fit, the goal, and scope before you pay."
        id={id("managed_plan_budget")}
        tabIndex={-1}
      >
        <input type="hidden" name="managed_plan_budget" value={campaign.id} />
        <label className={`${styles.choice} ${styles.planChoice}`}>
          <input
            id={id("campaign_acknowledged")}
            type="checkbox"
            name="campaign_acknowledged"
            required
            {...fieldA11y("campaign_acknowledged")}
          />
          <span className={styles.planDetails}>
            <strong className={styles.planName}>{campaign.name}</strong>
            <span className={styles.planPrice}>
              {campaignPrice.amount} <small>{campaignPrice.unit}</small>
            </span>
            <span className={styles.planUpfront}>
              I understand this starting point and want to discuss whether it fits my business.
            </span>
          </span>
        </label>
        <p className={styles.helper}>{managedCompletionExplanation()}</p>
        <p className={styles.helper}>{managedRenewalExplanation()}</p>
        <p className={styles.helper}>
          Want more acquisition capacity? Tell us below. Any added prepaid scope,
          price, and outcome goal must be agreed in writing.
        </p>
        {fieldError("campaign_acknowledged")}
        {fieldError("managed_plan_budget")}
      </Section>

      <Section number={5} title="What needs to improve?" disabled={busy}>
        <label className={styles.label} htmlFor={id("bottleneck")}>
          Tell us in your own words <span aria-hidden="true">*</span>
          <textarea
            id={id("bottleneck")}
            className={styles.input}
            name="bottleneck"
            required
            maxLength={1000}
            rows={4}
            placeholder="For example: leads arrive on Facebook, but we miss the follow-up. Or we miss calls while we are on a job."
            {...fieldA11y("bottleneck")}
          />
          {fieldError("bottleneck")}
        </label>
      </Section>

      <Section
        number={6}
        disabled={busy}
        title="Who approves the work?"
        requiredMark
        id={id("decision_maker")}
        tabIndex={-1}
        {...fieldA11y("decision_maker")}
      >
        <div className={styles.choiceGrid}>
          {AGENCY_DECIDERS.map(([choice, label]) => (
            <label key={choice} className={styles.choice}>
              <input
                type="radio"
                name="decision_maker"
                value={choice}
                required
                {...fieldA11y("decision_maker")}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {fieldError("decision_maker")}
      </Section>

      <Section
        number={7}
        disabled={busy}
        title="When would you like to start?"
        requiredMark
        id={id("timeline")}
        tabIndex={-1}
        {...fieldA11y("timeline")}
      >
        <div className={styles.choiceGrid}>
          {AGENCY_TIMELINES.map(([choice, label]) => (
            <label key={choice} className={styles.choice}>
              <input
                type="radio"
                name="timeline"
                value={choice}
                required
                {...fieldA11y("timeline")}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {fieldError("timeline")}
      </Section>

      <Section
        number={8}
        disabled={busy}
        title="How we may follow up"
        note="Both choices are optional. We use your email to respond to this request even if you leave them unchecked."
      >
        <label className={`${styles.choice} ${styles.consent}`}>
          <input type="checkbox" name="sms_consent" />
          <span>
            <strong>Call or text about this request</strong>
            <span className={styles.consentDisclosure}>
              <SmsConsentText topic="this application" />
            </span>
          </span>
        </label>
        <label className={`${styles.choice} ${styles.consent}`}>
          <input type="checkbox" name="marketing_email_consent" />
          <span>
            <strong>Send me practical business emails</strong>
            <span className={styles.consentDisclosure}>
              Send me Ryan&rsquo;s daily practical business emails for up to 30
              days. One click unsubscribes at any time.
            </span>
          </span>
        </label>
      </Section>

      <div className={styles.submitRow}>
        <button
          type="submit"
          className={styles.submit}
          disabled={busy}
          data-cta="agency_intake_submit"
          data-cta-placement={placement}
        >
          {status === "sending" ? "Sending your request…" : "Send it to Ryan"}
          <ArrowRight aria-hidden="true" size={17} />
        </button>
        <p className={styles.helper}>
          We review your answers, then reply within one business day. You
          approve the scope before work or billing starts.
        </p>
      </div>
      <p className={styles.assurance}>
        <Check size={17} aria-hidden="true" />
        <span>
          Your accounts stay in your name. Nothing runs without your written
          approval. Leads, rankings, and returns are not guaranteed.
        </span>
      </p>
    </form>
  );
}
