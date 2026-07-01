"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { trackEvent } from "@/lib/events";

type ConversionEventName =
  | "audit_start_click"
  | "audit_form_submit"
  | "stripe_checkout_click"
  | "book_call_click"
  | "phone_click"
  | "email_click"
  | "lead_leak_page_view"
  | "lead_leak_197_page_view"
  | "lead_leak_197_apply_click"
  | "lead_leak_197_form_submit"
  | "lead_leak_197_context_submit"
  | "lead_leak_197_book_call_click"
  | "lead_leak_197_message_click"
  | "lead_leak_197_payment_link_click"
  | "ad_autopsy_submit"
  | "start_router_submit"
  | "problem_intake_start_click"
  | "problem_intake_form_submit"
  | "problem_intake_marketplace_click"
  | "data_marketplace_start_click"
  | "data_marketplace_form_submit"
  | "data_marketplace_starter_click"
  | "data_marketplace_problem_intake_click"
  | "homepage_hero_buy_signals_click"
  | "homepage_hero_build_machine_click"
  | "homepage_hero_submit_source_click"
  | "homepage_lane_buy_leads_click"
  | "homepage_lane_build_system_click"
  | "homepage_lane_submit_source_click"
  | "homepage_marketplace_preview_view_sample_click"
  | "homepage_marketplace_preview_request_access_click"
  | "homepage_marketplace_preview_build_similar_click"
  | "homepage_tool_entry_click"
  | "build_system_machine_click"
  | "phase3_machine_buy_lane_click"
  | "phase3_machine_build_lane_click"
  | "phase3_machine_source_lane_click"
  | "phase3_machine_problem_intake_click"
  | "phase3_machine_marketplace_click"
  | "phase3_machine_submit_source_click"
  | "phase3_machine_final_marketplace_click"
  | "phase3_machine_privacy_center_click"
  | "preference_lab_category_click"
  | "preference_lab_result_click"
  | "preference_lab_save_submit"
  | "preference_lab_deep_intake_click"
  | "homepage_viewed"
  | "hero_cta_clicked"
  | "buyer_lane_clicked"
  | "system_lane_clicked"
  | "submit_source_lane_clicked"
  | "listing_card_clicked"
  | "marketplace_viewed"
  | "marketplace_filter_changed"
  | "listing_preview_opened"
  | "sample_request_started"
  | "sample_request_submitted"
  | "access_request_started"
  | "access_request_submitted"
  | "watchlist_added"
  | "tools_hub_viewed"
  | "tool_card_clicked"
  | "questionnaire_started"
  | "questionnaire_step_completed"
  | "questionnaire_completed"
  | "result_viewed"
  | "consent_given"
  | "contact_request_submitted"
  | "submit_source_viewed"
  | "source_submission_started"
  | "source_submission_step_completed"
  | "source_file_uploaded"
  | "source_submission_completed"
  | "source_submission_flagged"
  | "buyer_login_started"
  | "buyer_login_completed"
  | "buyer_dashboard_viewed"
  | "buyer_profile_updated"
  | "buyer_request_viewed"
  | "buyer_export_started"
  | "buyer_export_completed"
  | "admin_dashboard_viewed"
  | "admin_table_filtered"
  | "admin_profile_reviewed"
  | "admin_source_reviewed"
  | "admin_buyer_request_reviewed"
  | "admin_export_created"
  | "admin_suppression_resolved";

type ConversionPayload = {
  route: string;
  cta_text: string;
  destination: string;
  source_page: string;
  timestamp: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function cleanText(value: string | null | undefined, fallback = "") {
  return (value || fallback).replace(/\s+/g, " ").trim().slice(0, 180);
}

function attribution(route: string, ctaText: string, destination: string, sourcePage?: string): ConversionPayload {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  return {
    route,
    cta_text: cleanText(ctaText, "unknown"),
    destination: cleanText(destination, "unknown"),
    source_page: cleanText(sourcePage || route, route),
    timestamp: new Date().toISOString(),
    utm_source: cleanText(params.get("utm_source"), ""),
    utm_medium: cleanText(params.get("utm_medium"), ""),
    utm_campaign: cleanText(params.get("utm_campaign"), ""),
    utm_content: cleanText(params.get("utm_content"), ""),
    utm_term: cleanText(params.get("utm_term"), ""),
  };
}

function sendConversionEvent(eventName: ConversionEventName, payload: ConversionPayload) {
  trackEvent(eventName, payload);

  try {
    window.fbq?.("trackCustom", eventName, payload);
  } catch {
    // Pixel must never block the buyer.
  }
}

export function ConversionEventTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (pathname !== "/lead-leak-audit-197") return;
    const key = `leadflow.conversion.lead_leak_197_page_view.${pathname}.${search}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    sendConversionEvent(
      "lead_leak_197_page_view",
      attribution(pathname, "page view", `${pathname}${search ? `?${search}` : ""}`, pathname),
    );
  }, [pathname, search]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const tracked = target.closest("[data-conversion-event]");
      if (!(tracked instanceof HTMLElement)) return;

      const explicit = tracked.dataset.conversionEvent as ConversionEventName | undefined;
      const href =
        tracked instanceof HTMLAnchorElement
          ? tracked.getAttribute("href") || tracked.href || ""
          : tracked.dataset.conversionDestination || "";
      let eventName = explicit;
      if (!eventName && href.startsWith("tel:")) eventName = "phone_click";
      if (!eventName && href.startsWith("mailto:")) eventName = "email_click";
      if (!eventName) return;

      sendConversionEvent(
        eventName,
        attribution(
          pathname,
          tracked.dataset.conversionCta || tracked.innerText || tracked.getAttribute("aria-label") || eventName,
          href,
          tracked.dataset.conversionSourcePage || pathname,
        ),
      );
    }

    function onSubmit(event: SubmitEvent) {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      const explicit = target.dataset.conversionEvent as ConversionEventName | undefined;
      const action = target.getAttribute("action") || "";
      const eventName =
        explicit ||
        (action.includes("/api/lead-leak-audit-197") ? "lead_leak_197_form_submit" : null) ||
        (action.includes("/api/intake") ? "start_router_submit" : null) ||
        (action.includes("/api/ad-account-autopsy") ? "ad_autopsy_submit" : null);
      if (!eventName) return;

      const submitter = (event as SubmitEvent & { submitter?: HTMLElement }).submitter;
      sendConversionEvent(
        eventName,
        attribution(
          pathname,
          target.dataset.conversionCta || submitter?.innerText || eventName,
          target.dataset.conversionDestination || action,
          target.dataset.conversionSourcePage || pathname,
        ),
      );
    }

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
    };
  }, [pathname]);

  return null;
}

export function ConversionLink({
  eventName,
  ctaText,
  sourcePage,
  children,
  ...props
}: LinkProps & {
  eventName: ConversionEventName;
  ctaText: string;
  sourcePage?: string;
  children: ReactNode;
  className?: string;
}) {
  const hrefText = typeof props.href === "string" ? props.href : props.href.toString();
  return (
    <Link
      {...props}
      data-conversion-event={eventName}
      data-conversion-cta={ctaText}
      data-conversion-source-page={sourcePage}
      data-conversion-destination={hrefText}
    >
      {children}
    </Link>
  );
}

export function ConversionAnchor({
  eventName,
  ctaText,
  sourcePage,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: ConversionEventName;
  ctaText: string;
  sourcePage?: string;
  children: ReactNode;
}) {
  return (
    <a
      {...props}
      data-conversion-event={eventName}
      data-conversion-cta={ctaText}
      data-conversion-source-page={sourcePage}
    >
      {children}
    </a>
  );
}

export function ConversionHiddenFields({ formType, sourcePage }: { formType: string; sourcePage: string }) {
  const empty = useMemo(
    () => Object.fromEntries(UTM_KEYS.map((key) => [key, ""])) as Record<(typeof UTM_KEYS)[number], string>,
    [],
  );
  const [values, setValues] = useState(empty);
  const [pageUrl, setPageUrl] = useState("");
  const [clientCreatedAt, setClientCreatedAt] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValues(Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key) || ""])) as Record<(typeof UTM_KEYS)[number], string>);
    setPageUrl(window.location.href);
    setClientCreatedAt(new Date().toISOString());
  }, []);

  return (
    <>
      <input type="hidden" name="formType" value={formType} />
      <input type="hidden" name="sourcePage" value={sourcePage} />
      <input type="hidden" name="currentPageUrl" value={pageUrl} />
      <input type="hidden" name="clientCreatedAt" value={clientCreatedAt} />
      {UTM_KEYS.map((key) => (
        <input key={key} type="hidden" name={key} value={values[key]} />
      ))}
    </>
  );
}
