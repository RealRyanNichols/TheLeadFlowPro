"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  LEADFLOW_CONSENT_VERSION,
  leadFlowConsentModules,
  leadFlowConsentText,
  type LeadFlowConsentModuleDefinition,
  type LeadFlowConsentType,
} from "@/lib/leadflow-consent";
import { trackEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

type ConsentCardState = {
  checked: boolean;
  sellerId: string;
  selectedSellerIds: string;
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
};

const emptyState: ConsentCardState = {
  checked: false,
  sellerId: "",
  selectedSellerIds: "",
  status: "idle",
};

function getAnonymousSessionId() {
  const storageKey = "leadflow_anonymous_session_id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `lf_anon_${crypto.randomUUID()}`
      : `lf_anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(storageKey, id);
  return id;
}

function splitSelectedSellers(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildConsentText(module: LeadFlowConsentModuleDefinition, state: ConsentCardState) {
  const base = leadFlowConsentText(module);

  if (module.requiresSellerId && state.sellerId.trim()) {
    return `${base}\n\nNamed seller: ${state.sellerId.trim()}`;
  }

  const selected = splitSelectedSellers(state.selectedSellerIds);
  if (module.requiresSelectedSellerIds && selected.length > 0) {
    return `${base}\n\nSelected sellers: ${selected.join(", ")}`;
  }

  return base;
}

export function LeadFlowConsentModules({
  className,
  toolSlug = "privacy-center",
  identityId,
  modules = leadFlowConsentModules,
}: {
  className?: string;
  toolSlug?: string;
  identityId?: string;
  modules?: readonly LeadFlowConsentModuleDefinition[];
}) {
  const [states, setStates] = useState<Record<LeadFlowConsentType, ConsentCardState>>(
    {} as Record<LeadFlowConsentType, ConsentCardState>,
  );

  function stateFor(type: LeadFlowConsentType) {
    return states[type] ?? emptyState;
  }

  function updateState(type: LeadFlowConsentType, next: Partial<ConsentCardState>) {
    setStates((current) => ({
      ...current,
      [type]: {
        ...emptyState,
        ...(current[type] ?? {}),
        ...next,
      },
    }));
  }

  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)} data-component="LeadFlowConsentModules">
      {modules.map((module) => (
        <ConsentModuleCard
          key={module.type}
          module={module}
          state={stateFor(module.type)}
          updateState={updateState}
          toolSlug={toolSlug}
          identityId={identityId}
        />
      ))}
    </div>
  );
}

function ConsentModuleCard({
  module,
  state,
  updateState,
  toolSlug,
  identityId,
}: {
  module: LeadFlowConsentModuleDefinition;
  state: ConsentCardState;
  updateState: (type: LeadFlowConsentType, next: Partial<ConsentCardState>) => void;
  toolSlug: string;
  identityId?: string;
}) {
  const selectedSellers = useMemo(
    () => splitSelectedSellers(state.selectedSellerIds),
    [state.selectedSellerIds],
  );
  const sellerMissing = module.requiresSellerId && !state.sellerId.trim();
  const selectedMissing = module.requiresSelectedSellerIds && selectedSellers.length === 0;
  const canSubmit = state.checked && !sellerMissing && !selectedMissing && state.status !== "saving";
  const consentText = buildConsentText(module, state);

  async function submitConsent() {
    if (!canSubmit) return;

    updateState(module.type, { status: "saving", message: undefined });

    try {
      const anonymousSessionId = identityId ? undefined : getAnonymousSessionId();
      const primarySellerId = module.requiresSellerId
        ? state.sellerId.trim()
        : selectedSellers[0] ?? undefined;

      const response = await fetch("/api/leadflow/consent-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identityId,
          anonymousSessionId,
          consentType: module.type,
          consentText,
          consentVersion: LEADFLOW_CONSENT_VERSION,
          sellerId: primarySellerId,
          selectedSellerIds: selectedSellers,
          timestamp: new Date().toISOString(),
          sourceUrl: window.location.href,
          sourcePath: window.location.pathname,
          toolSlug: module.toolSlug ?? toolSlug,
          metadata: {
            moduleTitle: module.title,
            moduleMode: module.mode,
            selectedSellerIds: selectedSellers,
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Consent event was not saved.");
      }

      trackEvent("consent_given", {
        tool_slug: module.toolSlug ?? toolSlug,
        consent_scope: module.type,
        notice_version: LEADFLOW_CONSENT_VERSION,
        permission_mode: module.mode,
        seller_count_bucket: selectedSellers.length > 1 ? "multiple" : primarySellerId ? "one" : "none",
      });

      updateState(module.type, {
        status: "saved",
        message: "Saved. This consent event is now part of the audit trail.",
      });
    } catch (error) {
      updateState(module.type, {
        status: "error",
        message: error instanceof Error ? error.message : "Consent event was not saved.",
      });
    }
  }

  return (
    <article className="lead-shell min-w-0 p-5" data-consent-type={module.type}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
            {module.eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">{module.title}</h3>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-ink-200">{module.body}</p>

      <div className="mt-5 grid gap-2">
        {module.guardrails.map((guardrail) => (
          <div
            key={guardrail}
            className="flex min-w-0 items-start gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-5 text-ink-100"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lead-300" />
            <span className="min-w-0 break-words">{guardrail}</span>
          </div>
        ))}
      </div>

      {module.requiresSellerId ? (
        <label className="mt-5 block">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
            Named seller shown to the user
          </span>
          <input
            value={state.sellerId}
            onChange={(event) => updateState(module.type, { sellerId: event.target.value, status: "idle" })}
            placeholder="Example: Acme Roofing, Seller ID 123"
            className="mt-2 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
          />
        </label>
      ) : null}

      {module.requiresSelectedSellerIds ? (
        <label className="mt-5 block">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
            Selected sellers shown to the user
          </span>
          <input
            value={state.selectedSellerIds}
            onChange={(event) =>
              updateState(module.type, { selectedSellerIds: event.target.value, status: "idle" })
            }
            placeholder="Comma-separated seller names or IDs"
            className="mt-2 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
          />
        </label>
      ) : null}

      <label className="mt-5 flex min-w-0 items-start gap-3 rounded-lg border border-accent-300/25 bg-accent-300/10 p-4">
        <input
          type="checkbox"
          checked={state.checked}
          onChange={(event) => updateState(module.type, { checked: event.target.checked, status: "idle" })}
          className="mt-1 h-5 w-5 shrink-0 rounded border-white/30 bg-ink-950 accent-amber-300"
        />
        <span className="min-w-0 text-sm font-bold leading-6 text-white">{module.checkboxLabel}</span>
      </label>

      {(sellerMissing || selectedMissing) && state.checked ? (
        <p className="mt-3 flex items-start gap-2 text-xs font-bold leading-5 text-accent-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Seller routing consent requires the seller or selected sellers to be named before it can be saved.
        </p>
      ) : null}

      <button
        type="button"
        onClick={submitConsent}
        disabled={!canSubmit}
        className={cn(
          "mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition sm:w-auto",
          canSubmit
            ? "bg-accent-300 text-ink-950 shadow-xl shadow-accent-950/25 hover:-translate-y-0.5 hover:bg-accent-200"
            : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-ink-400",
        )}
      >
        {state.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {module.ctaLabel}
        {state.status !== "saving" ? <ArrowRight className="h-4 w-4" /> : null}
      </button>

      {state.message ? (
        <p
          className={cn(
            "mt-3 rounded-lg border p-3 text-sm font-bold leading-5",
            state.status === "saved"
              ? "border-lead-300/25 bg-lead-300/10 text-lead-100"
              : "border-red-300/25 bg-red-300/10 text-red-100",
          )}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </article>
  );
}
