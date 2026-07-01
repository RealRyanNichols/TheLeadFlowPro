"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { SampleLandingPageData } from "@/lib/leadflow-samples";

type RequestState =
  | { status: "idle"; message: string }
  | { status: "saving"; message: string }
  | { status: "success"; message: string; sampleId?: string }
  | { status: "error"; message: string };

function dollars(value: number) {
  if (value <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function SampleRequestPanel({ data }: { data: SampleLandingPageData }) {
  const [intendedUse, setIntendedUse] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<RequestState>({ status: "idle", message: "" });
  const buyerReady = data.buyerData.authenticated && Boolean(data.buyerData.account);
  const price = Number(data.sample.price || 0);

  useEffect(() => {
    trackLeadFlowEvent("sample_page_viewed", {
      route: `/marketplace/${data.listing.slug}/sample`,
      listing_id: data.listing.id,
      sample_id: data.sample.id,
      category: data.listing.category,
      vertical: data.listing.vertical,
      status: data.sample.status,
    });
  }, [data.listing.category, data.listing.id, data.listing.slug, data.listing.vertical, data.sample.id, data.sample.status]);

  async function requestSample() {
    setState({ status: "saving", message: price > 0 ? "Starting paid sample checkout..." : "Saving sample request..." });
    trackLeadFlowEvent("sample_requested", {
      route: `/marketplace/${data.listing.slug}/sample`,
      listing_id: data.listing.id,
      sample_id: data.sample.id,
      price,
      status: "started",
    });
    try {
      const response = await fetch("/api/leadflow/samples/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: data.listing.slug || data.listing.id,
          intendedUse,
          confirmedAllowedUse: confirmed,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Sample request failed.");
      if (payload.checkoutUrl) {
        trackLeadFlowEvent("sample_checkout_started", {
          route: `/marketplace/${data.listing.slug}/sample`,
          sample_id: payload.sampleId,
          sample_request_id: payload.requestId,
          price,
        });
        window.location.href = payload.checkoutUrl;
        return;
      }
      setState({
        status: "success",
        message: payload.paymentTodo || (payload.status === "fulfilled" ? "Sample access is ready." : "Sample request saved for review."),
        sampleId: payload.sampleId,
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Sample request failed." });
    }
  }

  return (
    <div className="lead-shell p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Get sample access</p>
          <h2 className="mt-1 text-2xl font-black text-white">{dollars(price)} sample</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            {price > 0
              ? "Pay for a limited, proof-backed sample before requesting the full signal product."
              : "Request the redacted sample. Review can still be required before buyer access is granted."}
          </p>
        </div>
      </div>

      {!data.listing.sampleEnabled || data.sample.status !== "active" ? (
        <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
          Sample access is not active for this listing yet.
        </div>
      ) : !data.buyerData.authenticated ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <LockKeyhole className="h-5 w-5 text-cyan-300" />
          <h3 className="mt-3 text-lg font-black text-white">Buyer login required.</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Public users can see the redacted preview. Sample requests require a buyer account so access can be scoped and audited.
          </p>
          <Link href={`/login?mode=buyer&next=/marketplace/${data.listing.slug}/sample`} className="btn-accent mt-4 justify-center text-sm">
            Log in to request sample
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : !buyerReady ? (
        <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
          Complete the buyer profile before requesting paid or approved samples.
          <Link href="/buyer/settings" className="mt-3 inline-flex font-black underline">
            Complete buyer profile
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">How will you use the sample?</span>
            <textarea
              value={intendedUse}
              onChange={(event) => setIntendedUse(event.target.value)}
              rows={4}
              placeholder="Example: I want to verify ecommerce vendor signals before requesting full agency access."
              className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
            />
          </label>

          <label className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100">
            <span className="flex items-start gap-3">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              <span>
                I understand this sample is limited to approved fields and cannot be used as a blind list, suppressed outreach file, raw identity dossier, or guaranteed-result promise.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={requestSample}
            disabled={state.status === "saving" || intendedUse.trim().length < 12 || !confirmed}
            className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {price > 0 ? "Get paid sample" : "Request sample"}
          </button>

          {state.status === "error" ? (
            <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">{state.message}</div>
          ) : null}
          {state.status === "success" ? (
            <div className="rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">
              <CheckCircle2 className="mb-2 h-5 w-5" />
              {state.message}
              {state.sampleId ? (
                <Link href={`/buyer/samples/${state.sampleId}`} className="mt-3 inline-flex font-black underline">
                  Open sample
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
