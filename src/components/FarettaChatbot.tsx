"use client";

// src/components/FarettaChatbot.tsx
// Faretta AI — site-wide floating chat widget powered by Claude.
// Qualifies visitors, answers questions, converts to /start, /book, or /tiers.
// Falls back to a graceful "we'll email you" form when ANTHROPIC_API_KEY isn't set.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "I'm Ryan's routing assistant. I help serious buyers get to the free blueprint, leak audit, service path, or call in about 30 seconds. What are you trying to figure out?",
};

const QUICK_PROMPTS = [
  "Stump Ryan with a tool",
  "I want help growing my social",
  "I need a sales process built",
  "What package fits me?",
];

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

function questionTopic(text: string) {
  const normalized = text.toLowerCase();
  if (/(social|facebook|tiktok|youtube|instagram|x |twitter|post|reel|short)/.test(normalized)) {
    return "social growth";
  }
  if (/(ad|ads|meta|lead|funnel|crm|follow up|sales)/.test(normalized)) {
    return "lead generation";
  }
  if (/(price|cost|package|tier|fit|budget|afford)/.test(normalized)) {
    return "pricing and fit";
  }
  if (/(travel|come out|onsite|on-site|film|video|shoot|camera|content day)/.test(normalized)) {
    return "onsite content";
  }
  if (/(website|landing page|dashboard|automation|system|process)/.test(normalized)) {
    return "systems and websites";
  }
  return "general question";
}

function beaconPulse(eventType: string, target: string, value = 1) {
  const payload = JSON.stringify({
    visitorId: getVisitorId(),
    eventType,
    path: window.location.pathname,
    source: "faretta-chatbot",
    target,
    value,
  });
  const body = new Blob([payload], { type: "application/json" });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/site-pulse", body);
    return;
  }

  fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function FarettaChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    function openChat() {
      setOpen(true);
    }

    window.addEventListener("leadflow:open-chat", openChat);
    return () => window.removeEventListener("leadflow:open-chat", openChat);
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    beaconPulse("chat_question", questionTopic(trimmed), trimmed.length);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          visitorId: getVisitorId(),
          path: window.location.pathname,
        }),
      });
      const data = await res.json();
      if (data.remembered?.visitorId) {
        window.localStorage.setItem("leadflow_public_visitor_id", data.remembered.visitorId);
      }
      if (data.ok && data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              data.fallback ||
              `I'm offline right now. Email Ryan directly at ${LEADFLOW_PUBLIC_EMAIL} or book the 10-min call.`,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            `Connection hiccup. Email Ryan at ${LEADFLOW_PUBLIC_EMAIL} or book the 10-min call at /book.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            beaconPulse("chat_open", "floating-bubble");
          }}
          aria-label="Chat with Faretta AI"
          className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-brand-700 text-white shadow-2xl shadow-cyan-500/30 hover:scale-105 transition-transform"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M2 4a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H8l-4 4V4z" />
          </svg>
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-300 ring-2 ring-white" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-br from-cyan-500 to-brand-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-bold">F</span>
              <div>
                <div className="font-semibold">LeadFlow Assistant</div>
                <div className="text-[11px] opacity-90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
                  online · remembers context
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts (only on greeting) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-slate-50">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:border-brand-500 hover:text-brand-700"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Quick CTAs always visible */}
          <div className="px-3 py-2 border-t border-slate-200 bg-white flex gap-2">
            <Link
              href="/stump-ryan"
              onClick={() => beaconPulse("chat_cta", "stump-ryan")}
              className="flex-1 text-center text-xs rounded-lg bg-cyan-600 px-2 py-1.5 font-semibold text-white hover:bg-cyan-700"
            >
              Free blueprint
            </Link>
            <Link
              href="/book"
              onClick={() => beaconPulse("chat_cta", "book")}
              className="flex-1 text-center text-xs rounded-lg bg-accent-500 px-2 py-1.5 font-semibold text-white hover:bg-accent-600"
            >
              Book call
            </Link>
            <Link
              href="/tiers"
              onClick={() => beaconPulse("chat_cta", "tiers")}
              className="flex-1 text-center text-xs rounded-lg bg-slate-900 px-2 py-1.5 font-semibold text-white hover:bg-slate-800"
            >
              Bring me in
            </Link>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-slate-200 bg-white px-3 py-2 flex gap-2 rounded-b-2xl"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me what you need..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Send
            </button>
          </form>
          <div className="rounded-b-2xl border-t border-slate-100 bg-white px-3 pb-2 text-[10px] leading-relaxed text-slate-500">
            Private memory: this assistant remembers returning buyers when you share your name,
            business, or email. It does not publish that context.
          </div>
        </div>
      )}
    </>
  );
}
