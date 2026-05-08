// src/app/availability/page.tsx — public capacity / bandwidth page.
//
// Shows the same data the BandwidthMeter does, but with the full breakdown:
// every active engagement, hours per engagement, recently completed count,
// the 60-hr cap, and the "what does this mean for me" framing.

import Link from "next/link";
import { ArrowRight, Calendar, Check, Clock, ShieldCheck, Users } from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";
import { getCapacitySnapshot, WEEKLY_CAPACITY_HOURS } from "@/lib/capacity";
import {
  DECISION_SPRINT_BREAKDOWN,
  LOCAL_FIELD_SESSION_BREAKDOWN,
  OFFER_WORKLOADS,
  WORK_ORDER_PRESETS,
  formatHours,
} from "@/lib/workload";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = createSeoMetadata({
  title: "Availability · Ryan's bandwidth this week — The LeadFlow Pro",
  description:
    "Real-time view of Ryan's 60 hours/week capacity. See how much is booked, who's working with him right now, and how much is left for new engagements.",
  path: "/availability",
  imageTitle: "Live Availability",
  imageSubtitle: "Ryan's 60-hour weekly capacity, booked work, and remaining room for new engagements.",
});

export default async function AvailabilityPage() {
  let snap;
  try {
    snap = await getCapacitySnapshot();
  } catch {
    snap = null;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/availability" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
              <Clock className="h-3.5 w-3.5" /> Live · {WEEKLY_CAPACITY_HOURS} hrs/week cap
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-slate-950">
              Real-time availability.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                No mysteries about whether I have time.
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed">
              I cap my paid client work at 60 hours per week. This page shows you exactly how much is
              booked, who's working with me right now, and how much room is left. When work for a
              client wraps, the meter moves down — automatically.
            </p>
          </div>
        </div>
      </section>

      {/* FULL METER */}
      {snap && (
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #f3eaff 0%, #fff8f1 100%)" }}
          />
          <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-16">
            {/* Big meter card */}
            <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
              <div className="grid gap-6 lg:grid-cols-3 lg:items-center">
                {/* Big number */}
                <div className="lg:col-span-1">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                    This week's status
                  </div>
                  <div className="mt-2 text-6xl font-bold text-slate-950 tabular-nums">
                    {snap.remaining}
                  </div>
                  <div className="text-base text-slate-500">
                    of <span className="text-slate-950 font-bold tabular-nums">{snap.capacity}</span>{" "}
                    hours left
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-800 uppercase tracking-widest">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    {snap.status}
                  </div>
                </div>

                {/* Bar + percent */}
                <div className="lg:col-span-2">
                  <div className="flex items-baseline justify-between text-sm mb-2">
                    <span className="text-slate-700">
                      <strong className="text-slate-950 tabular-nums">{snap.booked}</strong> hours
                      booked across {snap.activeClientCount}{" "}
                      {snap.activeClientCount === 1 ? "engagement" : "engagements"}
                    </span>
                    <span className="text-cyan-700 font-bold tabular-nums">
                      {snap.utilizationPct}%
                    </span>
                  </div>
                  <div className="h-5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500 transition-all duration-700 ease-out"
                      style={{ width: `${snap.utilizationPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500 uppercase tracking-widest">
                    <span>0 hrs</span>
                    <span>30 hrs · 50%</span>
                    <span>{snap.capacity} hrs cap</span>
                  </div>
                </div>
              </div>

              {/* Active engagements */}
              {snap.activeEngagements.length > 0 && (
                <div className="mt-8">
                  <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-3">
                    Currently working with
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {snap.activeEngagements.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                          <span className="font-semibold text-slate-950 text-sm">{e.label}</span>
                        </div>
                        <div className="text-xs text-slate-600 tabular-nums">
                          {e.hoursPerWeek} hrs / wk
                        </div>
                      </div>
                    ))}
                  </div>
                  {snap.recentlyCompletedCount > 0 && (
                    <p className="mt-4 text-xs text-slate-500">
                      <Check className="inline h-3.5 w-3.5 text-cyan-600 mr-1" />
                      {snap.recentlyCompletedCount}{" "}
                      {snap.recentlyCompletedCount === 1 ? "engagement" : "engagements"} completed in
                      the last 30 days.
                    </p>
                  )}
                </div>
              )}

              {snap.activeWorkOrders.length > 0 && (
                <div className="mt-8">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold">
                        Open work orders
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Specific deliverables clear capacity as Ryan marks the work done.
                      </p>
                    </div>
                    <div className="rounded-full border border-accent-300 bg-accent-300/15 px-3 py-1 text-xs font-bold text-slate-800">
                      {snap.workOrderSummary.remainingHours}h open
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {snap.activeWorkOrders.slice(0, 6).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">{order.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {order.label}
                              {order.dueAt && (
                                <>
                                  {" "}· due{" "}
                                  {new Date(order.dueAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-800">
                            {order.remainingHours}h left
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((order.completedHours / Math.max(0.1, order.estimatedHours)) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                          <span>{order.status.replaceAll("_", " ")}</span>
                          <span>
                            {order.completedHours}h / {order.estimatedHours}h done
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {snap.activeEngagements.length === 0 && (
                <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
                  No active engagements yet. The first {WEEKLY_CAPACITY_HOURS} hours / week are
                  yours for the taking.
                </div>
              )}
            </div>

            {/* Refresh hint */}
            <p className="mt-4 text-center text-xs text-slate-500">
              Live data · refreshes ~every minute · last updated{" "}
              {new Date(snap.lastUpdated).toLocaleString()}
            </p>

            <div className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold">
                    Rolling forecast
                  </div>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950">
                    Forward-looking capacity, not just this week.
                  </h2>
                </div>
                <div className="max-w-xl text-sm leading-relaxed text-slate-600">
                  This projects recurring commitments plus open work orders. When Ryan marks half of
                  a deliverable complete, only the remaining half stays booked against the forward
                  windows.
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {snap.forecastWindows.map((forecast) => (
                  <div
                    key={forecast.key}
                    className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{forecast.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {forecast.weeks.toLocaleString(undefined, { maximumFractionDigits: 1 })} weeks
                        </div>
                      </div>
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">
                        {forecast.utilizationPct}%
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Booked</span>
                        <span className="font-semibold tabular-nums text-slate-950">
                          {forecast.bookedHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Remaining</span>
                        <span className="font-semibold tabular-nums text-cyan-700">
                          {forecast.remainingHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Sprint blocks</span>
                        <span className="font-semibold tabular-nums text-slate-950">
                          {forecast.decisionSprintBlocks}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500"
                        style={{ width: `${forecast.utilizationPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {snap && (
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
              <div className="lg:col-span-2">
                <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
                  What counts as work
                </div>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
                  A 90-minute call is not 90 minutes of capacity.
                </h2>
                <p className="mt-4 text-slate-700 leading-relaxed">
                  The public meter uses fulfillment blocks, not just calendar time. A Decision Sprint
                  reserves {formatHours(OFFER_WORKLOADS["decision-sprint"].reserveHours)} because
                  the real work includes prep, transcript handling, machine research, worksheet
                  finalization, foldering, delivery, and small follow-up.
                </p>
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-white/80 p-4 text-sm text-slate-700">
                  With {snap.remaining} hours left this week, that is about{" "}
                  <strong className="text-slate-950">{snap.decisionSprintsRemaining}</strong>{" "}
                  Decision Sprint {snap.decisionSprintsRemaining === 1 ? "block" : "blocks"} before
                  the week is full.
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DECISION_SPRINT_BREAKDOWN.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-950">{item.label}</span>
                          <span className="text-sm font-bold tabular-nums text-cyan-700">
                            {item.minutes}m
                          </span>
                        </div>
                        {item.note && <p className="mt-1 text-xs text-slate-500">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-accent-300 bg-accent-300/15 p-4 text-sm leading-relaxed text-slate-800">
                    The planning total is {formatHours(OFFER_WORKLOADS["decision-sprint"].planningHours)}.
                    The meter rounds it to {formatHours(OFFER_WORKLOADS["decision-sprint"].reserveHours)}
                    so delivery promises survive normal client follow-up and context switching.
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-accent-700 font-semibold">
                        Local field work
                      </div>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                        {WORK_ORDER_PRESETS["local-field-proposal"].label}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        Some jobs look like a simple local proposal until travel, scanning, review,
                        presentation, collection, and the next offer are counted.
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-accent-300 bg-accent-300/20 px-3 py-1 text-sm font-bold text-slate-950">
                      {formatHours(WORK_ORDER_PRESETS["local-field-proposal"].reserveHours)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {LOCAL_FIELD_SESSION_BREAKDOWN.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-950">{item.label}</span>
                          <span className="text-sm font-bold tabular-nums text-accent-700">
                            {item.minutes}m
                          </span>
                        </div>
                        {item.note && <p className="mt-1 text-xs text-slate-500">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-3">
                Offer load and delivery promise
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {snap.offerCapacity.map((offer) => (
                  <div key={offer.slug} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{offer.label}</h3>
                        <p className="mt-1 text-xs text-slate-500">{offer.visibleTime}</p>
                      </div>
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-800">
                        {offer.reserveLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{offer.deliveryPromise}</p>
                    {offer.dueDate && (
                      <p className="mt-2 text-xs text-slate-500">
                        If started today: due by{" "}
                        <span className="font-semibold text-slate-700">
                          {new Date(offer.dueDate).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </p>
                    )}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      Fits this week:{" "}
                      <strong className={offer.fitsThisWeek ? "text-cyan-700" : "text-rose-700"}>
                        {offer.blocksRemaining}
                      </strong>{" "}
                      {offer.blocksRemaining === 1 ? "block" : "blocks"} at current capacity.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* WHY THIS EXISTS */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Why I publish this
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Honest scarcity beats fake urgency.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Why
              Icon={ShieldCheck}
              title="No hidden waitlist"
              body="Every other consultant says 'I might have room.' I show you exactly how much I have, who's already in, and when slots open up."
            />
            <Why
              Icon={Users}
              title="The cap is real"
              body="60 hours / week is the line. After that I'm not taking serious work. I'd rather turn money away than ship under the bar."
            />
            <Why
              Icon={Calendar}
              title="Updates in real time"
              body="When I close out a client's engagement I mark it complete and the meter moves down. No '7 spots left forever' fake pressure."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            {snap && snap.status === "full"
              ? "I'm full this week. Apply to be next."
              : snap && snap.status === "limited"
              ? "Room's tight. Get on the calendar before it's gone."
              : "Plenty of room. Let's get to work."}
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Pick the path that fits. Same operator either way.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <Link
              href="/tiers"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              See all packages <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/offers/decision-sprint"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-600"
            >
              $90 for 90 minutes
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Free 10-min call
            </Link>
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function Why({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}
