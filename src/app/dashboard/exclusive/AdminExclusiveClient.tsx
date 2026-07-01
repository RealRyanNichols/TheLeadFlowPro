"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock3, Crown, Loader2, LockKeyhole, RotateCcw, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { AdminExclusivePageData, ListingAccessModel } from "@/lib/leadflow-exclusive";
import { cn } from "@/lib/utils";

function readable(value: string | null | undefined) {
  return (value || "not set").replace(/_/g, " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function statusTone(status: string) {
  if (/granted|approved|available|sample|sold_shared/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/reserved|review|submitted|needs/.test(status)) return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  if (/denied|revoked|suppressed|archived|sold_exclusive/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-white/10 bg-white/[0.04] text-ink-200";
}

export function AdminExclusiveClient({ data }: { data: AdminExclusivePageData }) {
  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Crown className="h-4 w-4" />
              Exclusive access
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Control who can block a listing.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Review exclusive listing, territory, vertical, and time-window requests before granting entitlements. This page should prevent overselling and keep every buyer lock auditable.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe examples"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Crown} label="Requests" value={String(data.stats.requests)} />
        <Stat icon={Clock3} label="Pending" value={String(data.stats.pending)} />
        <Stat icon={LockKeyhole} label="Reserved" value={String(data.stats.reserved)} />
        <Stat icon={BadgeCheck} label="Granted" value={String(data.stats.granted)} />
        <Stat icon={ShieldCheck} label="Sold exclusive" value={String(data.stats.soldExclusive)} />
        <Stat icon={UsersRound} label="Seats full" value={String(data.stats.limitedSeatsFull)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <ExclusiveRequestsTable data={data} />
        <ListingControlPanel data={data} />
      </section>

      <ListingsTable data={data} />
    </div>
  );
}

function ExclusiveRequestsTable({ data }: { data: AdminExclusivePageData }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Exclusive requests</h2>
      <p className="mt-2 text-sm leading-6 text-ink-300">
        Approve only after source rights, suppression, high-risk status, territory, and buyer use case make sense.
      </p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {["Buyer", "Listing", "Request", "Budget", "Window", "Status", "Actions"].map((header) => (
                <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.requests.length ? data.requests.map((request) => <ExclusiveRequestRow key={request.id} request={request} />) : (
              <tr>
                <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No exclusive requests loaded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExclusiveRequestRow({ request }: { request: AdminExclusivePageData["requests"][number] }) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  async function submit(action: "approve" | "deny" | "request_more_info" | "reserve" | "grant_entitlement") {
    const needsConfirmation = action === "approve" || action === "reserve" || action === "grant_entitlement";
    if (needsConfirmation) {
      const confirmed = window.confirm("Granting exclusive access will block other buyers from this listing during the active exclusivity window.");
      if (!confirmed) return;
    }
    setPendingAction(action);
    setResult(null);
    trackLeadFlowEvent("exclusive_request_reviewed", {
      route: "/dashboard/exclusive",
      exclusive_request_id: request.id,
      action,
      status: request.status,
      user_role: "admin",
    });
    try {
      const response = await fetch("/api/leadflow/exclusive/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          requestId: request.id,
          adminNotes: adminNotes || `${action} from exclusive dashboard`,
          confirmedImpact: needsConfirmation,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Exclusive action failed.");
      setResult(`${readable(action)} saved`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Exclusive action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <tr>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="font-bold text-white">{request.buyerName}</p>
        <p className="mt-1 text-xs text-ink-400">{request.buyerCompany}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="font-bold text-white">{request.listingTitle}</p>
        <p className="mt-1 text-xs text-ink-400">{request.requested_territory || request.listing_slug || "No territory"}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{readable(request.requested_access_model)}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{request.budget_range || "Not set"}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">
        {formatDate(request.requested_start)}<br />
        <span className="text-xs text-ink-400">to {formatDate(request.requested_end)}</span>
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <Badge label={readable(request.status)} tone={statusTone(request.status)} />
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <div className="grid min-w-[340px] gap-2">
          <textarea
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            rows={2}
            placeholder="Admin note for review, approval, denial, or reserve."
            className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-cyan-300/50"
          />
          <div className="flex flex-wrap gap-2">
            {(["reserve", "grant_entitlement", "deny", "request_more_info"] as const).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => submit(action)}
                disabled={Boolean(pendingAction)}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center gap-1 rounded-md border px-2.5 text-xs font-bold disabled:opacity-50",
                  action === "reserve" || action === "grant_entitlement"
                    ? "border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10"
                    : "border-red-300/30 text-red-100 hover:bg-red-300/10",
                )}
              >
                {pendingAction === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action === "deny" ? <XCircle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {readable(action)}
              </button>
            ))}
          </div>
          {result ? <p className="text-xs text-ink-300">{result}</p> : null}
        </div>
      </td>
    </tr>
  );
}

function ListingControlPanel({ data }: { data: AdminExclusivePageData }) {
  const firstListing = data.listings[0];
  const [listingId, setListingId] = useState(firstListing?.slug || firstListing?.id || "");
  const [accessModel, setAccessModel] = useState<ListingAccessModel>("exclusive_listing");
  const [territory, setTerritory] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [adminNotes, setAdminNotes] = useState("Exclusive access available after manual review.");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const listingOptions = useMemo(() => data.listings, [data.listings]);

  async function submit(action: "convert_to_exclusive" | "convert_to_shared" | "remove_exclusivity") {
    if ((action === "convert_to_shared" || action === "remove_exclusivity") && !window.confirm("This will remove exclusive display settings from the listing. Continue?")) return;
    setPendingAction(action);
    setResult(null);
    trackLeadFlowEvent(action === "convert_to_exclusive" ? "listing_reserved" : "exclusive_access_expired", {
      route: "/dashboard/exclusive",
      listing_id: listingId,
      action,
      user_role: "admin",
    });
    try {
      const response = await fetch("/api/leadflow/exclusive/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          listingId,
          accessModel,
          territory,
          startsAt,
          endsAt,
          adminNotes,
          confirmedImpact: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Listing action failed.");
      setResult(`${readable(action)} saved`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Listing action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <aside className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Listing access controls</h2>
      <p className="mt-2 text-sm leading-6 text-ink-300">
        Convert a listing to exclusive, set a territory/window, or return it to shared access.
      </p>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Listing</span>
          <select value={listingId} onChange={(event) => setListingId(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
            {listingOptions.length ? listingOptions.map((listing) => <option key={listing.id} value={listing.slug || listing.id}>{listing.title}</option>) : <option value="">No listings loaded</option>}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Access model</span>
          <select value={accessModel} onChange={(event) => setAccessModel(event.target.value as ListingAccessModel)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
            <option value="exclusive_listing">Exclusive listing</option>
            <option value="exclusive_geo">Exclusive geo</option>
            <option value="exclusive_vertical">Exclusive vertical</option>
            <option value="exclusive_time_window">Exclusive time window</option>
            <option value="limited_seats">Limited seats</option>
            <option value="shared">Shared</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Territory</span>
          <input value={territory} onChange={(event) => setTerritory(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Starts</span>
            <input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Ends</span>
            <input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Exclusivity notes</span>
          <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>
        <div className="grid gap-2">
          <button type="button" onClick={() => submit("convert_to_exclusive")} disabled={!listingId || Boolean(pendingAction)} className="btn-accent justify-center text-sm disabled:opacity-50">
            {pendingAction === "convert_to_exclusive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            Convert to exclusive
          </button>
          <button type="button" onClick={() => submit("convert_to_shared")} disabled={!listingId || Boolean(pendingAction)} className="btn-ghost justify-center text-sm disabled:opacity-50">
            <RotateCcw className="h-4 w-4" />
            Convert to shared
          </button>
          <button type="button" onClick={() => submit("remove_exclusivity")} disabled={!listingId || Boolean(pendingAction)} className="rounded-lg border border-red-300/30 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-300/10 disabled:opacity-50">
            Remove exclusivity
          </button>
        </div>
        {result ? <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-200">{result}</p> : null}
      </div>
    </aside>
  );
}

function ListingsTable({ data }: { data: AdminExclusivePageData }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Listing access models</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {["Listing", "Access model", "Status", "Buyers", "Territory", "Window", "Buyer page"].map((header) => (
                <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.listings.length ? data.listings.map((listing) => (
              <tr key={listing.id}>
                <td className="border-t border-white/10 px-3 py-3">
                  <p className="font-bold text-white">{listing.title}</p>
                  <p className="mt-1 text-xs text-ink-400">{listing.category}</p>
                </td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{readable(listing.accessModel)}</td>
                <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(listing.status)} tone={statusTone(listing.status)} /></td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{listing.currentBuyerCount}{listing.maxBuyers ? ` / ${listing.maxBuyers}` : ""}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{listing.territory || "Any"}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(listing.exclusiveStartsAt)} to {formatDate(listing.exclusiveEndsAt)}</td>
                <td className="border-t border-white/10 px-3 py-3">
                  <Link href={`/marketplace/${listing.slug}/exclusive`} className="inline-flex min-h-9 items-center justify-center rounded-md border border-cyan-300/30 px-2.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
                    Open
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No listings loaded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/25">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-extrabold capitalize", tone)}>{label}</span>;
}
