import type { Metadata } from "next";
import {
  AdminDataTable,
  AdminStatCard,
  Badge,
  Button,
  BuyerPathCard,
  ConfidenceBadge,
  EmptyState,
  ErrorState,
  ExportConfirmModal,
  FilterBar,
  LeadProfileHeader,
  ListingPreviewModal,
  MarketplaceCard,
  ProgressIndicator,
  QuestionnaireStep,
  RiskBadge,
  ScoreBreakdownCard,
  ScoreBadge,
  SourceProofList,
  StatusBadge,
  ToolCard,
} from "@/components/leadflow-system";

export const metadata: Metadata = {
  title: "LeadFlow Design System | The LeadFlow Pro",
  description: "Figma-ready LeadFlow Pro component system for buyer signals, scoring, proof, routing, and admin review.",
  robots: {
    index: false,
    follow: false,
  },
};

const scoreItems = [
  {
    label: "Intent score",
    score: 87,
    confidence: "high" as const,
    explanation: "The source trail shows a clear business problem and a visible next-action fit.",
  },
  {
    label: "Source proof score",
    score: 82,
    confidence: "high" as const,
    explanation: "The record includes public source context, freshness, and review notes.",
  },
  {
    label: "Compliance readiness",
    score: 76,
    confidence: "medium" as const,
    explanation: "Buyer release is available after suppression and allowed-use review.",
  },
];

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen py-10 md:py-14">
      <div className="container space-y-8">
        <section className="lead-shell p-6 md:p-8">
          <Badge variant="verified">Signal Proof Score Source Route Revenue</Badge>
          <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
            LeadFlow Pro design system.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200">
            Shared components for a serious buyer marketplace, first-party signal tools, protected exports, and admin review.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/marketplace">Marketplace CTA</Button>
            <Button href="/build-my-system" variant="secondary">System CTA</Button>
            <Button href="/privacy-center" variant="outline">Privacy CTA</Button>
            <Button variant="premium">Premium CTA</Button>
            <Button variant="danger">Danger CTA</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard title="New signals" value="148" trend="Profiles created from reviewed sources this week." status="verified" />
          <AdminStatCard title="Buyer requests" value="32" trend="Access requests waiting for review." status="review" />
          <AdminStatCard title="Suppression" value="4" trend="Records blocked before buyer delivery." status="suppressed" />
          <AdminStatCard title="Exports" value="11" trend="Audited export records generated." status="premium" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <MarketplaceCard
            title="Ecommerce Vendor Signal Pack"
            category="Ecommerce"
            score={87}
            confidence="high"
            sourceType="Public marketplace"
            bestBuyer="Agency, product sourcer, marketplace operator"
            sampleCount="4,800 reviewed sample rows"
            proofStatus="Public source proof"
            suppressionStatus="sample_available"
            lastUpdated="July 1, 2026"
            variant="featured"
            href="/marketplace"
          />
          <MarketplaceCard
            title="Mortgage Refi Interest Signal"
            category="Mortgage"
            score={81}
            confidence="high"
            sourceType="Consented questionnaire"
            bestBuyer="Licensed mortgage partner"
            sampleCount="Report-only preview"
            proofStatus="Consent path attached"
            suppressionStatus="review"
            lastUpdated="Live intake"
            variant="locked"
            locked
            href="/privacy-center"
          />
        </section>

        <FilterBar
          filters={[
            { label: "Industry", value: "Ecommerce" },
            { label: "Buyer type", value: "Agency" },
            { label: "Confidence", value: "High" },
            { label: "Status", value: "Sample available" },
          ]}
        />

        <section className="grid gap-5 lg:grid-cols-3">
          <BuyerPathCard
            title="Buy Lead Signals"
            body="Browse reviewed signal products with source proof, scores, and release limits."
            href="/buy-leads"
            proof="Review-gated"
          />
          <BuyerPathCard
            title="Build My Lead Machine"
            body="Build forms, AI follow-up, dashboards, ads, and routing inside the business."
            href="/build-my-system"
            proof="Operator-led"
          />
          <BuyerPathCard
            title="Submit a Lead Source"
            body="Turn a list, directory, audience, route, or demand clue into a reviewed source record."
            href="/submit-source"
            proof="Permission checked"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
          <LeadProfileHeader
            title="Website Money Leak Demand Signal"
            category="Business owner"
            vertical="Website funnel"
            score={84}
            confidence="high"
            sourceStatus="Questionnaire and URL proof"
            suppressionStatus="review"
          />
          <div className="lead-shell p-5">
            <h2 className="text-xl font-black text-white">Badges</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <ScoreBadge score={92} />
              <ScoreBadge variant="unknown" />
              <ConfidenceBadge confidence="needs_review" />
              <StatusBadge status="pending_access" />
              <RiskBadge risk="medium" />
            </div>
            <ProgressIndicator current={3} total={7} label="Questionnaire progress" />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <ScoreBreakdownCard items={scoreItems} />
          <SourceProofList
            items={[
              {
                title: "Public category page",
                sourceType: "Public source",
                status: "verified",
                verifiedDate: "July 1, 2026",
                href: "/profile-model",
              },
              {
                title: "Questionnaire answer summary",
                sourceType: "First-party response",
                status: "review",
                verifiedDate: "Pending review",
              },
            ]}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <ToolCard
            title="Website Money Leak Checker"
            who="Business owners with traffic but weak conversion paths"
            answer="Shows where calls, forms, DMs, or appointment intent may be leaking."
            time="3 min"
            dataCategory="Business funnel signal"
            href="/tools"
          />
          <QuestionnaireStep
            current={2}
            total={6}
            title="What are you trying to fix first?"
            body="The useful signal is usually the problem the buyer is already tired of explaining."
          >
            <button className="lead-panel p-4 text-left text-sm font-black text-white">Missed calls and slow follow-up</button>
            <button className="lead-panel p-4 text-left text-sm font-black text-white">Website traffic that does not convert</button>
            <button className="lead-panel p-4 text-left text-sm font-black text-white">Bad lead lists with no proof</button>
          </QuestionnaireStep>
        </section>

        <AdminDataTable
          title="Admin review table"
          columns={["Signal", "Score", "Status", "Action"]}
          rows={[
            { Signal: "Local contractor demand", Score: "84", Status: <StatusBadge status="review" />, Action: "Review" },
            { Signal: "Ecommerce vendor pack", Score: "87", Status: <StatusBadge status="approved" />, Action: "Publish" },
            { Signal: "Suppressed source", Score: "0", Status: <StatusBadge status="suppressed" />, Action: "Blocked" },
          ]}
        />

        <section className="grid gap-5 lg:grid-cols-3">
          <ListingPreviewModal title="Listing preview" body="Preview only the allowed summary fields before buyer approval." />
          <ExportConfirmModal fieldGroups={["public_profile", "source_proof", "compliance"]} />
          <div className="grid gap-5">
            <EmptyState title="No buyer access yet" body="Approved products appear after entitlement review." ctaLabel="Browse marketplace" href="/marketplace" />
            <ErrorState body="This record is blocked because suppression or risk review failed." />
          </div>
        </section>
      </div>
    </main>
  );
}
