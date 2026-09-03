import type { Metadata } from "next";
import Link from "next/link";
import { Check, KeyRound, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { TOOL_COUNT } from "@/lib/tools";
import { PRO_BUNDLE, PRO_TOOLS, proToolIndex, sortProTools } from "@/lib/tools/pro";
import { hasProAccess } from "@/lib/proAccess";
import { getProEntitlements } from "@/lib/proAccessServer";
import ProCard from "@/components/tools/pro/ProCard";
import ProBuyButton from "@/components/tools/pro/ProBuyButton";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";

const BASE = "https://www.theleadflowpro.com";

export const metadata: Metadata = {
  title: `Pro Kits: finished systems for $10 to $29 | The LeadFlow Pro`,
  description:
    "The free tools give you the number. A Pro Kit gives you the finished system built from it: printable documents, scripts, spreadsheets and calendar files, all in your own name. One payment, no subscription.",
  alternates: { canonical: `${BASE}/tools/pro` },
  openGraph: {
    title: "Pro Kits from The LeadFlow Pro",
    description:
      "Finished systems built from your own numbers and printed in your own name. Ten to twenty nine dollars, once.",
    url: `${BASE}/tools/pro`,
    siteName: "The LeadFlow Pro",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function ProShelfPage() {
  const { kinds } = await getProEntitlements();
  const kits = sortProTools(PRO_TOOLS);
  const index = proToolIndex(kits);
  const ownsBundle = kinds.has(PRO_BUNDLE.kind);
  const ownedCount = kits.filter((k) => hasProAccess(kinds, k.slug)).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Pro Kits",
        description:
          "Finished business systems generated from your own numbers and branded to your business. One payment each.",
        url: `${BASE}/tools/pro`,
        isPartOf: { "@type": "WebSite", name: "The LeadFlow Pro", url: BASE },
      },
      {
        "@type": "ItemList",
        numberOfItems: kits.length,
        itemListElement: kits.map((kit, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE}/tools/pro/${kit.slug}`,
          name: kit.name,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
          { "@type": "ListItem", position: 3, name: "Pro Kits", item: `${BASE}/tools/pro` },
        ],
      },
    ],
  };

  return (
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHero
        compact
        eyebrow={`${kits.length} pro kit${kits.length === 1 ? "" : "s"} · $10 to $29 · one payment`}
        mutedTitle="The free tool tells you the number."
        title="A kit hands you the finished thing."
        body="Same engine as the free library, pointed at the work that comes after the answer. You put in your numbers, it builds the printable documents, the scripts, the spreadsheets and the calendar reminders, with your name and your logo already on them."
        media={{
          src: "/images/homepage-v2/connected-company-hero.webp",
          alt: "A connected operating core feeding useful business modules",
          kicker: "Built from your own numbers",
          caption: "Print it, paste it, hand it to your staff.",
        }}
        primary={{ href: "#shelf", label: "See the kits" }}
        secondary={{ href: "/tools", label: `Browse the ${TOOL_COUNT} free tools` }}
        trustLine="One payment. No subscription, no account required, nothing to cancel."
      />

      <section className="cb-band">
        <div className="cb-shell">
          <div className="pro-why">
            {[
              {
                icon: <Printer className="h-5 w-5" />,
                title: "You get documents, not a screen",
                body: "Every kit produces things you keep: pages you print, sheets your platform imports, files your phone reads. They are generated from your answers, not filled into a template.",
              },
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: "Your brand, not ours",
                body: "Set your business name, phone, city, color and logo once. Every kit on this shelf uses it. Nothing you type is uploaded or stored on our servers.",
              },
              {
                icon: <RefreshCw className="h-5 w-5" />,
                title: "Rebuild it whenever the numbers change",
                body: "Prices went up, you hired somebody, the season turned. Open the kit, change the answer, take the new documents. No extra charge, ever.",
              },
            ].map((p) => (
              <article key={p.title}>
                <span className="pro-why-icon">{p.icon}</span>
                <h2>{p.title}</h2>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="shelf" className="cb-band sv-tools-band" tabIndex={-1}>
        <div className="sv-tools-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The shelf</p>
              <h2 className="cb-h2 cb-heading">Every kit, and what is in the box.</h2>
            </div>
            <p className="cb-lead">
              Open any of them and run your real numbers before you decide. The math, the chart and the
              full list of what gets built are free to look at on every kit.
            </p>
          </div>

          <div className="tool-grid mt-8">
            {index.map((kit, i) => (
              <ProCard key={kit.slug} tool={kit} owned={hasProAccess(kinds, kit.slug)} priority={i < 3} />
            ))}
          </div>
        </div>
      </section>

      <section id="bundle" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="pro-bundle">
            <div>
              <p className="cb-eyebrow">The whole shelf</p>
              <h2 className="cb-h2 cb-heading">{PRO_BUNDLE.name}</h2>
              <p className="cb-lead">{PRO_BUNDLE.pitch}</p>
              <ul className="pro-bundle-list">
                {kits.map((kit) => (
                  <li key={kit.slug}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    <span>
                      {kit.name} <small>${kit.pro.priceUsd}</small>
                    </span>
                  </li>
                ))}
                <li className="pro-bundle-future">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>Every kit added to this shelf later, on the same key</span>
                </li>
              </ul>
            </div>
            <div className="pro-bundle-buy">
              {ownsBundle ? (
                <>
                  <p className="pro-bundle-owned">
                    <Check aria-hidden="true" className="h-5 w-5" />
                    You own the bundle. Every kit above is unlocked.
                  </p>
                  <Link href="#shelf" className="button-secondary">
                    Go to the shelf
                  </Link>
                </>
              ) : (
                <>
                  <p className="pro-bundle-price">
                    <span>${PRO_BUNDLE.priceUsd}</span>
                    <small>one time, everything above</small>
                  </p>
                  <ProBuyButton
                    bundle
                    priceUsd={PRO_BUNDLE.priceUsd}
                    name={PRO_BUNDLE.name}
                    label={`Unlock every kit for $${PRO_BUNDLE.priceUsd}`}
                  />
                  <p className="pro-bundle-fine">
                    {ownedCount > 0
                      ? "You already own part of the shelf. The bundle adds the rest and every kit added later."
                      : "Instant unlock. A key arrives by email so it opens on any device."}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <div className="pro-faq">
            <h2 className="cb-h2 cb-heading">Straight answers</h2>
            <div className="pro-faq-grid">
              {[
                {
                  q: "Is this a subscription?",
                  a: "No. Every kit is one payment. There is nothing recurring, nothing to cancel, and no account to create. If you want the whole shelf, the bundle is one payment as well.",
                },
                {
                  q: "What happens the second I pay?",
                  a: "The kit unlocks in the browser you bought it in, straight away, and every document is there to open. A key also goes to your email so you can unlock it on your phone, your office computer, or a new laptop next year.",
                },
                {
                  q: "Do I need an account?",
                  a: "No. If you do happen to have a login here with the same email you paid with, your kits unlock automatically when you sign in. Everyone else uses the key.",
                },
                {
                  q: "What if my numbers change?",
                  a: "Open the kit and change them. Every document rebuilds from the new answers at no extra cost, as long as the kit exists.",
                },
                {
                  q: "Why are the other tools free then?",
                  a: `They are genuinely free and they are staying that way. All ${TOOL_COUNT} of them run with no signup, and you can put any of them on your own website for nothing. The kits are for the work that comes after the free tool has told you the number.`,
                },
                {
                  q: "Are you promising this makes me money?",
                  a: "No, and be careful with anyone who does. A kit gives you the finished documents and a plan you can work. What that is worth depends on your business, your market and whether you use it.",
                },
              ].map((f) => (
                <details key={f.q} className="pro-faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <p className="pro-faq-restore">
              <KeyRound aria-hidden="true" className="h-4 w-4" />
              Bought a kit already and landed on a new device? <Link href="/tools/pro/unlock">Restore your access</Link>.
            </p>
          </div>
        </div>
      </section>

      <FinalCta
        eyebrow="Still just looking"
        title="Run the free tools first. That is what they are for."
        body={`All ${TOOL_COUNT} of them are free to use, free to save and free to put on your own site. When one of them hands you a number you actually want to act on, the kit for it is one click away.`}
        primary={{ href: "/tools", label: `Open the ${TOOL_COUNT} free tools` }}
        secondary={{ href: "/contact", label: "Ask for a kit that does not exist yet" }}
      />
    </main>
  );
}
