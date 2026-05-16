"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Phone, Send } from "lucide-react";

type Status = "idle" | "sending" | "sent" | "rate-limited" | "error";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
}

export function MissedCallRescueDemo() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage(null);

    try {
      const res = await fetch("/api/demo/missed-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; reason?: string };

      if (res.status === 429) {
        setStatus("rate-limited");
        setMessage(
          data.message ||
            "You already got the demo text in the last 24 hours. Check your phone — or buy the real version below.",
        );
        return;
      }

      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.message || "Couldn't send the demo text. Try a different number or buy the real version below.");
        return;
      }

      setStatus("sent");
      setMessage(data.message || "Demo text sent. Check your phone.");
    } catch {
      setStatus("error");
      setMessage("Network hiccup. Try again or buy the real version below.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <Phone className="h-3.5 w-3.5" /> Try the rescue
        </div>
        <h3 className="mt-2 text-xl font-bold text-slate-950">
          Drop your number. Get the demo text-back.
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          One SMS, sample script, capped at one send per phone per 24 hours. Your
          real version uses your business name, your area code, and your actual
          after-hours script.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-800">Mobile phone</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="(555) 555-1234"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <button
            type="submit"
            disabled={status === "sending" || phone.replace(/\D/g, "").length < 10}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? (
              "Sending…"
            ) : (
              <>
                Send me the demo text <Send className="h-4 w-4" />
              </>
            )}
          </button>

          {message ? (
            <div
              className={`rounded-2xl border p-3 text-sm leading-6 ${
                status === "sent"
                  ? "border-cyan-200 bg-cyan-50 text-cyan-900"
                  : status === "rate-limited"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {status === "sent" ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : null}
              {message}
            </div>
          ) : null}

          <p className="text-xs leading-5 text-slate-500">
            By submitting you agree to receive a single demo SMS from The LeadFlow
            Pro. Standard message rates apply. We do not store your number after
            the demo window closes.
          </p>
        </form>
      </div>

      <FakeConversationPreview activated={status === "sent"} />
    </div>
  );
}

const SAMPLE_CONVO: Array<{ who: "buyer" | "bot"; body: string; t: string }> = [
  {
    who: "bot",
    body: "Hey — sorry I missed your call. I'm on a job right now. What can I help you with? Reply here and I'll get right back. — Ryan @ LeadFlow",
    t: "0:00",
  },
  {
    who: "buyer",
    body: "thx — what time u open?",
    t: "0:18",

  },
  {
    who: "bot",
    body: "We open at 9am Mon-Fri. Want me to set a reminder so we connect first thing tomorrow?",
    t: "0:21",
  },
  {
    who: "buyer",
    body: "yes pls — also need a quote on a small bath remodel",
    t: "0:34",
  },
  {
    who: "bot",
    body: "Got it. I'll text at 9:05 with a 3-question intake so we can ballpark before you spend time on the phone.",
    t: "0:36",
  },
];

function FakeConversationPreview({ activated }: { activated: boolean }) {
  return (
    <div
      className={`rounded-3xl border bg-slate-50 p-5 transition-opacity sm:p-6 ${
        activated ? "border-cyan-300 opacity-100" : "border-slate-200 opacity-90"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
        <MessageCircle className="h-3.5 w-3.5" /> Live conversation preview
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-950">Sarah — missed call 2:14 PM</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            activated ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${activated ? "bg-emerald-500" : "bg-slate-400"}`}
          />
          {activated ? "Active" : "Sample"}
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {SAMPLE_CONVO.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.who === "bot" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-5 shadow-sm ${
                msg.who === "bot"
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div>{msg.body}</div>
              <div
                className={`mt-1 text-[10px] uppercase tracking-widest ${
                  msg.who === "bot" ? "text-cyan-100/80" : "text-slate-400"
                }`}
              >
                {msg.who === "bot" ? "Bot" : "Sarah"} · +{msg.t}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
        The conversation above is sample copy. Your version captures the live thread,
        notifies you the moment the buyer replies, and lets you take the conversation
        anytime from the dashboard.
      </div>
    </div>
  );
}
