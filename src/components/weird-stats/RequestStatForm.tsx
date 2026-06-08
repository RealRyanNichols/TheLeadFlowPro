"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { WEIRD_PURCHASE_PRODUCTS, WEIRD_STAT_CATEGORIES, weirdProductByKey } from "@/lib/weird-stats";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function RequestStatForm({
  defaultProductKey = "submit_weird_stat_300",
  defaultQuestion = "",
}: {
  defaultProductKey?: string;
  defaultQuestion?: string;
}) {
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [productKey, setProductKey] = useState(defaultProductKey);
  const selectedProduct = useMemo(() => weirdProductByKey(productKey), [productKey]);

  async function submit(formData: FormData) {
    setStatus({ type: "loading" });
    const payload = {
      question: String(formData.get("question") || "").trim(),
      category: String(formData.get("category") || "Internet"),
      reason: String(formData.get("reason") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      displayName: String(formData.get("displayName") || "").trim(),
      urgency: String(formData.get("urgency") || "standard"),
      visibility: String(formData.get("visibility") || "public"),
      productKey,
      sourcePage: "/request",
    };

    if (!payload.question || !payload.email) {
      setStatus({ type: "error", message: "Add the stat idea and email first." });
      return;
    }

    try {
      const requestResponse = await fetch("/api/stat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const requestJson = await requestResponse.json();
      if (!requestResponse.ok) throw new Error(requestJson?.error || "Could not create request.");

      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKey,
          email: payload.email,
          requestId: requestJson.id,
          successPath: "/request/thank-you",
          cancelPath: "/request",
        }),
      });
      const checkoutJson = await checkoutResponse.json().catch(() => ({}));
      if (checkoutResponse.ok && checkoutJson?.url) {
        window.location.href = checkoutJson.url;
        return;
      }

      setStatus({
        type: "success",
        message:
          checkoutJson?.error ||
          "Your weird stat is in the machine. If checkout is not available, Ryan can still review the request in the admin queue.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Something broke before the request saved.",
      });
    }
  }

  if (status.type === "success") {
    return (
      <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-6 text-cyan-50">
        <div className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100">
          Submitted
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
          Your weird stat is in the machine.
        </h2>
        <p className="mt-3 text-sm leading-6 text-cyan-50/90">{status.message}</p>
        <a
          href="/requests"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
        >
          Watch the request queue <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await submit(new FormData(event.currentTarget));
      }}
      className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20"
    >
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">What weird number should we track?</span>
          <textarea
            name="question"
            required
            defaultValue={defaultQuestion}
            rows={4}
            placeholder="Example: How many business owners lose a paid lead because the first reply took too long?"
            className="min-h-32 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none ring-cyan-300/20 placeholder:text-slate-500 focus:border-cyan-300/45 focus:ring-4"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-black text-white">Category</span>
            <select
              name="category"
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none focus:border-cyan-300/45"
              defaultValue="Business Waste"
            >
              {WEIRD_STAT_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black text-white">What are you buying?</span>
            <select
              name="productKey"
              value={productKey}
              onChange={(event) => setProductKey(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none focus:border-cyan-300/45"
            >
              {WEIRD_PURCHASE_PRODUCTS.map((product) => (
                <option key={product.key} value={product.key}>
                  {product.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Why do you want this tracked?</span>
          <textarea
            name="reason"
            rows={3}
            placeholder="Funny, useful, business angle, content idea, private research question, or something you want to share."
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none ring-cyan-300/20 placeholder:text-slate-500 focus:border-cyan-300/45 focus:ring-4"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-black text-white">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none ring-cyan-300/20 placeholder:text-slate-500 focus:border-cyan-300/45 focus:ring-4"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-black text-white">Public display name</span>
            <input
              name="displayName"
              placeholder="Optional"
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none ring-cyan-300/20 placeholder:text-slate-500 focus:border-cyan-300/45 focus:ring-4"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-black text-white">Urgency</span>
            <select
              name="urgency"
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none focus:border-cyan-300/45"
            >
              <option value="standard">Standard</option>
              <option value="priority">Priority</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-black text-white">Visibility</span>
            <select
              name="visibility"
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none focus:border-cyan-300/45"
            >
              <option value="public">Public stat request</option>
              <option value="private">Private research pull</option>
            </select>
          </label>
        </div>
      </div>

      {selectedProduct ? (
        <div className="mt-5 rounded-2xl border border-accent-300/20 bg-accent-300/10 p-4 text-sm leading-6 text-accent-50">
          <div className="font-black text-white">{selectedProduct.label}</div>
          <p className="mt-1">{selectedProduct.body}</p>
        </div>
      ) : null}

      {status.type === "error" ? (
        <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm font-semibold text-rose-100">
          {status.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status.type === "loading"}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400 disabled:cursor-wait disabled:opacity-70"
      >
        {status.type === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Send it into the machine <ArrowRight className="h-5 w-5" />
      </button>
    </form>
  );
}
