"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CircleDollarSign,
  MousePointerClick,
  RadioTower,
  Route,
} from "lucide-react";

/**
 * The Command Center is a live, simulated demo of the analytics and automation
 * back office a LeadFlow Pro build ships with. Clearly labeled demo data.
 */

const CITIES = ["Longview, TX", "Tyler, TX", "Marshall, TX", "Kilgore, TX", "Gladewater, TX", "Shreveport, LA", "Dallas, TX", "Nacogdoches, TX"];
const SOURCES = ["facebook / premier-system", "google / website-launch", "shared link", "direct", "facebook / proof-video"];
const PAGES = ["/premier-system", "/", "/pricing", "/tools", "/portfolio", "/live"];

type EventKind = "view" | "click" | "lead" | "automation" | "sale";
type Ev = { id: number; kind: EventKind; text: string; tone: string; time: string };

const EVENT_ICONS = {
  view: RadioTower,
  click: MousePointerClick,
  lead: Route,
  automation: Bot,
  sale: CircleDollarSign,
} as const;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function ShowcaseDashboard() {
  const [visitors, setVisitors] = useState(23);
  const [views, setViews] = useState(1847);
  const [leads, setLeads] = useState(31);
  const [emails, setEmails] = useState(58);
  const [feed, setFeed] = useState<Ev[]>([]);
  const [traffic, setTraffic] = useState<number[]>(() =>
    Array.from({ length: 24 }, (_, i) => 18 + Math.round(14 * Math.sin(i / 3.2)) + Math.floor(Math.random() * 9))
  );
  const idRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      const roll = Math.random();
      const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      let ev: Ev;
      idRef.current += 1;
      if (roll < 0.5) {
        setViews((v) => v + 1);
        setVisitors((v) => Math.max(9, v + (Math.random() < 0.5 ? 1 : -1)));
        ev = { id: idRef.current, kind: "view", text: `Visitor from ${pick(CITIES)} viewing ${pick(PAGES)} | ${pick(SOURCES)}`, tone: "text-[var(--text)]", time: now };
      } else if (roll < 0.68) {
        ev = { id: idRef.current, kind: "click", text: `CTA click: "See the Exact Scope" on ${pick(PAGES)}`, tone: "text-[var(--blue)]", time: now };
      } else if (roll < 0.82) {
        setLeads((l) => l + 1);
        setEmails((e) => e + 2);
        ev = { id: idRef.current, kind: "lead", text: "Lead captured | saved to owned database | owner alerted | response queued", tone: "text-mint font-semibold", time: now };
      } else if (roll < 0.93) {
        ev = { id: idRef.current, kind: "automation", text: pick([
          "AI agent: follow-up email queued for lead with no call booked (24h rule)",
          "AI agent: ad attribution matched | lead credited to facebook / premier-system",
          "AI agent: weekly analytics digest compiled for owner",
          "AI agent: incomplete form detected | reminder scheduled",
        ]), tone: "text-[var(--violet)]", time: now };
      } else {
        ev = { id: idRef.current, kind: "sale", text: pick([
          "Website Launch deposit received | $500",
          "System Map purchased | $497",
          "Call booked | Lead Engine scope",
        ]), tone: "text-mint font-black", time: now };
      }
      setFeed((f) => [ev, ...f].slice(0, 9));
      setTraffic((tr) => {
        const next = [...tr.slice(1), Math.max(6, tr[tr.length - 1] + Math.floor(Math.random() * 11) - 5)];
        return next;
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const maxT = Math.max(...traffic, 1);
  const linePts = traffic.map((v, i) => `${(i / (traffic.length - 1)) * 700},${150 - (v / maxT) * 130}`).join(" ");
  const areaPts = `0,150 ${linePts} 700,150`;

  const funnel = [
    { label: "Visitors", v: 2140, pct: 100, hex: "#1240E8" },
    { label: "Engaged (clicked)", v: 861, pct: 40, hex: "#0E6F96" },
    { label: "Leads captured", v: 214, pct: 10, hex: "#6D28D9" },
    { label: "Calls booked", v: 58, pct: 2.7, hex: "#146C34" },
    { label: "Clients won", v: 19, pct: 0.9, hex: "#146C34" },
  ];

  const sources = [
    { name: "Facebook ads", v: 46, hex: "#1240E8" },
    { name: "Google ads", v: 27, hex: "#6D28D9" },
    { name: "Shares & referrals", v: 17, hex: "#146C34" },
    { name: "Direct", v: 10, hex: "#4E5866" },
  ];

  const agents = [
    { name: "Lead Responder", status: "ACTIVE", detail: `${emails} emails sent · avg response 0.8s`, hex: "#146C34" },
    { name: "Ad Attribution", status: "ACTIVE", detail: "3 campaigns tracked · every lead credited to its ad", hex: "#1240E8" },
    { name: "Follow-Up Sequencer", status: "ACTIVE", detail: "12 follow-ups scheduled · no lead goes cold", hex: "#6D28D9" },
    { name: "Analytics Logger", status: "ACTIVE", detail: "first-party tracking · YOUR database, not Google's", hex: "#92400E" },
  ];

  return (
    <div className="space-y-6">
      {/* LIVE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] px-5 py-3 -xl">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-mint" />
          </span>
          <span className="font-black tracking-wide text-[var(--heading)]">LIVE</span>
          <span className="text-sm text-[var(--muted)]">Command Center · simulated demo data</span>
        </div>
        <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--violet)]">
          Larger custom system example
        </span>
      </div>

      {/* KPI TILES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { v: visitors, l: "on site right now", c: "text-mint ", suffix: "" },
          { v: views, l: "page views today", c: "text-[var(--heading)]", suffix: "" },
          { v: leads, l: "leads captured today", c: "text-[var(--blue)]", suffix: "" },
          { v: emails, l: "automated emails sent", c: "text-[var(--violet)]", suffix: "" },
        ].map((s) => (
          <div key={s.l} className="card !p-5 text-center">
            <div className={`text-4xl font-black tabular-nums transition-all ${s.c}`}>
              {s.v.toLocaleString()}{s.suffix}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* TRAFFIC LINE */}
        <div className="card lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold text-[var(--heading)]">Traffic | rolling live</h2>
            <span className="text-xs text-[var(--quiet)]">last 24 intervals</span>
          </div>
          <svg viewBox="0 0 700 160" className="mt-4 w-full" role="img" aria-label="Live rolling traffic line chart">
            <defs>
              <linearGradient id="tfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1240E8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#1240E8" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 90, 140].map((y) => (
              <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#ded8d0" strokeWidth="1" />
            ))}
            <polygon points={areaPts} fill="url(#tfill)" />
            <polyline points={linePts} fill="none" stroke="#1240e8" strokeWidth="2.5" style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.6))" }} />
            <circle cx="700" cy={150 - (traffic[traffic.length - 1] / maxT) * 130} r="5" fill="#1240e8">
              <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* LIVE FEED */}
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-[var(--heading)]">Live activity</h2>
          <div className="mt-3 space-y-2 text-xs">
            {feed.length === 0 && <p className="text-[var(--quiet)]">Listening…</p>}
            {feed.map((e) => {
              const EventIcon = EVENT_ICONS[e.kind];
              return (
                <div key={e.id} className="flex gap-2 rounded-lg bg-[var(--page)] p-2.5" style={{ animation: "fadeIn 0.4s ease" }}>
                  <span className="showcase-event-icon" aria-hidden="true">
                    <EventIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={e.tone}>{e.text}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--quiet)]">{e.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FUNNEL */}
        <div className="card">
          <h2 className="font-bold text-[var(--heading)]">The funnel | 30 days</h2>
          <p className="mt-1 text-xs text-[var(--quiet)]">Every stage tracked automatically, attributed to its source.</p>
          <div className="mt-4 space-y-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text)]">{f.label}</span>
                  <span className="font-black text-[var(--heading)]">{f.v.toLocaleString()} <span className="font-medium text-[var(--quiet)]">· {f.pct}%</span></span>
                </div>
                <div className="mt-1 h-4 overflow-hidden rounded bg-line/40">
                  <div className="h-full rounded-r transition-all duration-700" style={{ width: `${f.pct}%`, minWidth: "2%", backgroundColor: f.hex, boxShadow: `0 0 12px ${f.hex}66` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-mint">Simulated 2.7% visitor-to-call rate. Every stage remains visible to the owner.</p>
        </div>

        {/* SOURCES + AGENTS */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-bold text-[var(--heading)]">Where the traffic comes from</h2>
            <div className="mt-4 space-y-3">
              {sources.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--text)]">{s.name}</span>
                    <span className="font-black text-[var(--heading)]">{s.v}%</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded bg-line/40">
                    <div className="h-full rounded-r" style={{ width: `${s.v}%`, backgroundColor: s.hex, boxShadow: `0 0 10px ${s.hex}55` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATIONS */}
      <div className="card border border-violet-400/30 shadow-glow-violet">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-[var(--heading)]">Automations on shift</h2>
          <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-mint">Simulated always-on workflows</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <div key={a.name} className="flex items-start gap-3 rounded-xl bg-[var(--page)] p-4">
              <span className="relative mt-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ backgroundColor: a.hex }} />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.hex }} />
              </span>
              <div>
                <p className="font-bold text-[var(--heading)]">{a.name} <span className="ml-1 text-[10px] font-black" style={{ color: a.hex }}>{a.status}</span></p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="card border border-[var(--accent-line)] text-center shadow-[0_12px_32px_rgba(18,64,232,0.16)]">
        <h2 className="text-2xl font-black text-[var(--heading)] sm:text-3xl">
          See the system behind the website.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-[var(--text)]">
          This simulation shows what a larger connected build can make visible.
          The $1,000 Website Launch is the focused public foundation, and deeper
          CRM, automation, reporting, and portal modules are scoped separately.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/premier-system" className="btn-primary">
            See the Premier System
          </Link>
          <Link href="/live" className="btn-ghost">
            Inspect Live Proof
          </Link>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
