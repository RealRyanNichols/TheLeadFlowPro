import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Stage = {
  index: string;
  name: string;
  note: string;
  href: string;
};

const STAGES: Stage[] = [
  { index: "01", name: "Attention", note: "Ads, search, content, referrals", href: "/system/attention" },
  { index: "02", name: "Website", note: "The offer, explained and priced", href: "/system/website" },
  { index: "03", name: "Lead capture", note: "Forms, calls, texts, chat, DMs", href: "/system/lead-capture" },
  { index: "04", name: "Customer record", note: "One person, one complete history", href: "/system/crm" },
  { index: "05", name: "Follow-up", note: "Text, email, call, booking", href: "/system/follow-up" },
  { index: "06", name: "Sale", note: "Quote, contract, payment", href: "/system/sale" },
  { index: "07", name: "Delivery", note: "Portal, onboarding, the work", href: "/system/delivery" },
  { index: "08", name: "Reporting", note: "What produced revenue", href: "/system/reporting" },
];

export default function CompanyLoop() {
  return (
    <figure className="cb-loop">
      <figcaption className="cb-loop-title">
        <div>
          <span className="cb-loop-kicker">The operating loop</span>
          <strong>Eight stages. One connected company.</strong>
        </div>
        <p>
          Reporting feeds the next round of attention, so the system gets smarter instead
          of starting over.
        </p>
      </figcaption>

      <div className="cb-loop-art">
        <Image
          src="/images/homepage-v2/company-operating-loop.webp"
          alt="Eight illuminated operating stations connected in a continuous company loop"
          width={1920}
          height={1080}
          sizes="(max-width: 900px) 100vw, 78vw"
        />
        <div className="cb-loop-art__caption">
          <span>Attention in</span>
          <span>Revenue intelligence back</span>
        </div>
      </div>

      <nav className="cb-loop-stages" aria-label="Open any company stage">
        {STAGES.map((stage) => (
          <Link key={stage.index} className="cb-loop-stage" href={stage.href}>
            <span className="cb-loop-stage__index">{stage.index}</span>
            <span className="cb-loop-stage__copy">
              <strong>{stage.name}</strong>
              <small>{stage.note}</small>
            </span>
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ))}
      </nav>
    </figure>
  );
}
