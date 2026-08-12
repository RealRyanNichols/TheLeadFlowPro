import {
  ArrowLeft,
  BarChart3,
  Building2,
  CreditCard,
  Database,
  Megaphone,
  MessageSquareMore,
  MonitorSmartphone,
  Radio,
} from "lucide-react";

// The connected-company system visual. Eight stages laid out as a circuit, not a
// list: attention enters at the top left, revenue and delivery come out the
// bottom, and reporting feeds the next round of attention. The dashed rails
// carry a flowing pulse so the diagram reads as a machine that is running.
//
// Both rails read left to right and the sweeps carry the flow back to the left
// margin, the same way a line of text wraps. Visual order matches DOM order
// exactly, so screen readers and sighted users get the identical sequence. All
// motion sits behind prefers-reduced-motion.

type Stage = {
  index: string;
  icon: typeof Megaphone;
  name: string;
  note: string;
};

const TOP: Stage[] = [
  { index: "01", icon: Megaphone, name: "Attention", note: "Ads, search, content, referrals" },
  { index: "02", icon: MonitorSmartphone, name: "Website", note: "The offer, explained and priced" },
  { index: "03", icon: Radio, name: "Lead capture", note: "Forms, calls, texts, chat, DMs" },
  { index: "04", icon: Database, name: "CRM", note: "One record per person, scored" },
];

const BOTTOM: Stage[] = [
  { index: "05", icon: MessageSquareMore, name: "Follow-up", note: "Text, email, call, booking" },
  { index: "06", icon: CreditCard, name: "Sale", note: "Quote, contract, payment" },
  { index: "07", icon: Building2, name: "Delivery", note: "Portal, onboarding, the work" },
  { index: "08", icon: BarChart3, name: "Reporting", note: "What produced revenue" },
];

function Node({ stage }: { stage: Stage }) {
  const Icon = stage.icon;
  return (
    <div className="cb-node">
      <span className="cb-node-index">{stage.index}</span>
      <span className="cb-node-icon">
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <span className="cb-node-copy">
        <strong>{stage.name}</strong>
        <small>{stage.note}</small>
      </span>
    </div>
  );
}

export default function CompanyLoop() {
  return (
    <figure className="cb-loop">
      <figcaption className="cb-loop-title">
        <strong>How a company actually moves money</strong>
        <span>One connected system</span>
      </figcaption>

      <div className="cb-loop-row">
        {TOP.map((s) => (
          <Node key={s.index} stage={s} />
        ))}
      </div>

      {/* Top rail hands off to the bottom rail: down the right side, back across. */}
      <svg
        className="cb-loop-sweep"
        viewBox="0 0 1000 58"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M 968 0 L 968 29 L 32 29 L 32 58" />
      </svg>

      <div className="cb-loop-row">
        {BOTTOM.map((s) => (
          <Node key={s.index} stage={s} />
        ))}
      </div>

      {/* Reporting feeds the next round of attention. The loop closes. */}
      <svg
        className="cb-loop-sweep cb-loop-sweep--return"
        viewBox="0 0 1000 58"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M 968 0 L 968 40 L 32 40" />
      </svg>

      <p className="cb-loop-return">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Reporting tells you which attention was worth buying, so the next round starts
        smarter. A website builder gives you stage two. We build all eight and wire them
        together.
      </p>
    </figure>
  );
}
