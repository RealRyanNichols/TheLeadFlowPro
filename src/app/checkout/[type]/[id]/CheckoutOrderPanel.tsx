"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { CheckoutProduct } from "@/lib/leadflow-checkout";

type PanelState =
  | { state: "idle"; message: string }
  | { state: "saving"; message: string }
  | { state: "success"; message: string; orderId?: string; checkoutUrl?: string | null }
  | { state: "error"; message: string };

export function CheckoutOrderPanel({
  product,
  buyerAccountStatus,
}: {
  product: CheckoutProduct;
  buyerAccountStatus: string;
}) {
  const [intendedUse, setIntendedUse] = useState("");
  const [confirmedAllowedUse, setConfirmedAllowedUse] = useState(false);
  const [state, setState] = useState<PanelState>({ state: "idle", message: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ state: "saving", message: product.stripeConfigured && product.amount > 0 ? "Creating secure checkout..." : "Saving order for review..." });
    trackLeadFlowEvent("checkout_started", {
      route: `/checkout/${product.type}/${product.id}`,
      checkout_type: product.type,
      listing_id: product.listingId || "",
      status: product.status,
      user_role: "buyer",
    });

    try {
      const response = await fetch("/api/leadflow/checkout/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: product.type,
          id: product.id,
          intendedUse,
          confirmedAllowedUse,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Checkout order failed.");
      if (payload.checkoutUrl) {
        trackLeadFlowEvent("checkout_completed", {
          route: `/checkout/${product.type}/${product.id}`,
          checkout_type: product.type,
          order_id: payload.order?.id || "",
          status: "stripe_redirect",
          user_role: "buyer",
        });
        window.location.href = payload.checkoutUrl;
        return;
      }
      setState({
        state: "success",
        message: payload.paymentTodo || (payload.manualReview ? "Order saved for manual review." : "Order saved."),
        orderId: payload.order?.id,
        checkoutUrl: payload.checkoutUrl,
      });
      trackLeadFlowEvent(payload.manualReview ? "order_manual_review_required" : "order_created", {
        route: `/checkout/${product.type}/${product.id}`,
        checkout_type: product.type,
        order_id: payload.order?.id || "",
        status: payload.order?.status || "saved",
        user_role: "buyer",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout order failed.";
      setState({ state: "error", message });
      trackLeadFlowEvent("checkout_failed", {
        route: `/checkout/${product.type}/${product.id}`,
        checkout_type: product.type,
        status: "error",
        user_role: "buyer",
      });
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Buyer status</p>
        <p className="mt-2 text-lg font-black capitalize text-white">{buyerAccountStatus.replace(/_/g, " ")}</p>
        <p className="mt-2 text-sm leading-6 text-ink-300">
          Pending or unreviewed buyers can pay or request review where allowed, but access can stay locked until admin approval.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-bold text-white">How will you use this?</span>
        <textarea
          value={intendedUse}
          onChange={(event) => setIntendedUse(event.target.value)}
          rows={4}
          minLength={12}
          maxLength={1200}
          required
          placeholder="Example: Review source-backed ecommerce vendor signals for agency prospecting, then request full access if the sample fits our buyer use case."
          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/50"
        />
      </label>

      <label className="flex gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-4">
        <input
          type="checkbox"
          checked={confirmedAllowedUse}
          onChange={(event) => setConfirmedAllowedUse(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-950"
          required
        />
        <span className="text-sm leading-6 text-ink-200">
          I understand this order is limited to approved access, suppression-aware use, and the listed field groups. I will not use it as a blind list, suppressed outreach file, raw resale product, or guaranteed-result promise.
        </span>
      </label>

      <button
        type="submit"
        disabled={state.state === "saving" || !confirmedAllowedUse || intendedUse.trim().length < 12}
        className="btn-accent min-h-12 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-55"
      >
        {state.state === "saving" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {state.message}
          </>
        ) : (
          <>
            {product.amount > 0 && product.stripeConfigured ? "Continue to secure checkout" : "Save for review"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {state.state === "success" ? (
        <div className="rounded-xl border border-lead-300/30 bg-lead-300/10 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-lead-100">
            <ShieldCheck className="h-4 w-4" />
            {state.message}
          </div>
          <Link href="/buyer/orders" className="mt-3 inline-flex text-sm font-black text-lead-100 underline">
            View buyer orders
          </Link>
        </div>
      ) : null}

      {state.state === "error" ? (
        <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
