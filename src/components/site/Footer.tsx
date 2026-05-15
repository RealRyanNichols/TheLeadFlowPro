// src/components/site/Footer.tsx
import Link from "next/link";
import { LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";
import { SITE_FOOTER_NAV } from "@/lib/site-navigation";
import { FunnelMark } from "./Logo";

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black/40">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <FunnelMark className="h-8 w-8" />
              <span className="font-bold text-lg">
                The <span className="funnel-text">LeadFlow</span> Pro
              </span>
            </div>
            <p className="text-ink-300 text-sm leading-relaxed">
              Turn attention into conversations, follow-up, and owner-visible next moves.
            </p>
            <p className="mt-3 text-ink-300 text-xs">
              theleadflowpro.com - built for businesses that get calls, texts, and online leads.
            </p>
          </div>

          <FooterGroup title="Funnel" items={SITE_FOOTER_NAV.funnel} />
          <FooterGroup title="Company" items={SITE_FOOTER_NAV.company} />
          <FooterGroup title="Legal" items={SITE_FOOTER_NAV.legal} />
        </div>

        <div className="mt-10 md:mt-14 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between gap-3 text-xs text-ink-300">
          <span>© {new Date().getFullYear()} REAL RYAN NICHOLS LLC - The LeadFlow Pro</span>
          <span>
            Questions?{" "}
            <a href={`mailto:${LEADFLOW_PUBLIC_EMAIL}`} className="hover:text-white">
              {LEADFLOW_PUBLIC_EMAIL}
            </a>{" "}
            -{" "}
            <Link href="/refunds" className="hover:text-white">
              Refund policy
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, items }: { title: string; items: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-300">{title}</h4>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-ink-100 hover:text-white">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
