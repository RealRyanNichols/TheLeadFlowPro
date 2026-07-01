"use client";

import Link from "next/link";
import { ArrowRight, Download, LockKeyhole } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";

export function SampleViewerActions({
  sampleId,
  listingId,
}: {
  sampleId: string;
  listingId: string | null;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <a
        href={`/api/leadflow/samples/${sampleId}/download`}
        onClick={() => trackLeadFlowEvent("sample_downloaded", { route: `/buyer/samples/${sampleId}`, sample_id: sampleId })}
        className="btn-accent justify-center text-sm"
      >
        <Download className="h-4 w-4" />
        Download CSV
      </a>
      <Link
        href={listingId ? `/checkout/listing_access/${encodeURIComponent(listingId)}` : "/marketplace"}
        onClick={() => trackLeadFlowEvent("checkout_started", { route: `/buyer/samples/${sampleId}`, sample_id: sampleId, listing_id: listingId || "", checkout_type: "listing_access" })}
        className="btn-ghost justify-center text-sm"
      >
        Buy full access
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href={listingId ? `/marketplace/${encodeURIComponent(listingId)}/exclusive` : "/marketplace"}
        onClick={() => trackLeadFlowEvent("full_access_requested_from_sample", { route: `/buyer/samples/${sampleId}`, sample_id: sampleId, listing_id: listingId || "", request_type: "exclusive" })}
        className="btn-ghost justify-center text-sm"
      >
        <LockKeyhole className="h-4 w-4" />
        Ask exclusive
      </Link>
    </div>
  );
}
