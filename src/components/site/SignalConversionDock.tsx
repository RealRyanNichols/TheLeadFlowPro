"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

type DockMetric = {
  value: string;
  label: string;
};

type SignalConversionDockProps = {
  proofTitle: string;
  proofBody: string;
  metrics: DockMetric[];
  primaryHref: string;
  primaryLabel: string;
  primaryEvent: string;
  secondaryHref: string;
  secondaryLabel: string;
  secondaryEvent: string;
  sourcePage: string;
};

export function SignalConversionDock({
  proofTitle,
  proofBody,
  metrics,
  primaryHref,
  primaryLabel,
  primaryEvent,
  secondaryHref,
  secondaryLabel,
  secondaryEvent,
  sourcePage
}: SignalConversionDockProps) {
  return (
    <aside className="sticky-conversion-dock" aria-label="LeadFlow quick actions">
      <div className="dock-inner">
        <div className="dock-proof">
          <span className="lead-live-dot" />
          <div>
            <p>{proofTitle}</p>
            <span>{proofBody}</span>
          </div>
        </div>
        <div className="dock-metrics">
          {metrics.slice(0, 3).map((metric) => (
            <div key={`${metric.value}-${metric.label}`}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
        <div className="dock-actions">
          <Link
            href={primaryHref}
            className="btn-accent btn-magnetic dock-primary"
            data-conversion-event={primaryEvent}
            data-conversion-cta={primaryLabel}
            data-conversion-source-page={sourcePage}
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryHref}
            className="dock-secondary"
            data-conversion-event={secondaryEvent}
            data-conversion-cta={secondaryLabel}
            data-conversion-source-page={sourcePage}
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </aside>
  );
}
