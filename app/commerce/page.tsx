import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  FileDown,
  PackageCheck,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { commerceCatalog } from "@/lib/commerce";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { productProjectIntakeHref } from "@/lib/site/agencyIntake";
import { PROJECT_QUOTE_SUMMARY } from "@/lib/site/projectQuotes";
import CommercePlanner from "./CommercePlanner";
import styles from "./commerce.module.css";

export const metadata: Metadata = withPublicPageMetadata("/commerce", {
  title: "Storefront & Product Project Quotes | The LeadFlow Pro",
  description:
    "Quote your storefront, product launch, checkout, delivery, and support. Smaller commerce projects have their own scope, separate from managed acquisition.",
});

export default function CommercePage() {
  const catalog = commerceCatalog();
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>THE LEADFLOW PRO • COMMERCE</p>
              <h1>
                You have something to sell.
                <br />
                <em>Make buying it easy.</em>
              </h1>
              <p className={styles.lead}>
                A useful product page. A clear payment. The right thing
                delivered. Connect the steps that turn interest into an order
                you can fulfill.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primary} href={productProjectIntakeHref({ service: "websites" })}>
                  Quote my storefront project{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className={styles.secondary} href="#plan">
                  Plan my selling setup
                </Link>
              </div>
              <p className={styles.fine}>
                Build and launch deliverables, usage costs, and support agreed
                in writing. A project quote does not enroll you in the managed
                acquisition campaign.
              </p>
            </div>
            <figure className={styles.heroArt}>
              <Image
                src="/images/page-art/commerce-20260907.webp"
                alt="An online storefront, payment terminal, packed order and digital download on a bright desk: sell it, get paid, deliver."
                width={1440}
                height={756}
                priority
                sizes="(max-width: 800px) 94vw, 50vw"
              />
              <figcaption>
                From the first click to the finished handoff.
              </figcaption>
            </figure>
          </div>
          <div className={styles.promises}>
            <p>
              <PackageCheck aria-hidden="true" /> Products, services, and
              downloads
            </p>
            <p>
              <PlugZap aria-hidden="true" /> Build around your current accounts
            </p>
            <p>
              <ShieldCheck aria-hidden="true" /> Scope and costs agreed before
              the build
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="plan">
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>SEE YOUR NEXT THREE STEPS</p>
            <h2>What are you selling?</h2>
            <p>
              Choose your business type. See the customer path, try the tools,
              and save a build list. Product orders use your own margin and
              selling model; farm job and property deal targets do not apply.
            </p>
          </div>
          <CommercePlanner />
        </div>
      </section>

      <section className={styles.tint} id="kits">
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>USE THE PRODUCT BEFORE YOU BUY</p>
            <h2>Working tools. Finished files.</h2>
            <p>
              Try a kit with your own details. See what it makes. Buy only when
              the files are useful to you.
            </p>
          </div>
          <div className={styles.kits}>
            {catalog.products.map((product) => (
              <article className={styles.kit} key={product.id}>
                <Link href={product.url}>
                  <Image
                    src={new URL(product.image).pathname}
                    width={640}
                    height={360}
                    alt={product.name}
                    sizes="(max-width: 600px) 94vw, (max-width: 1000px) 46vw, 30vw"
                  />
                </Link>
                <div className={styles.kitBody}>
                  <p className={styles.kitPrice}>
                    ${(product.priceCents / 100).toFixed(0)}{" "}
                    <span>one payment</span>
                  </p>
                  <h3>
                    <Link href={product.url}>{product.name}</Link>
                  </h3>
                  <p>{product.description}</p>
                  <ul>
                    {product.includes.slice(0, 3).map((item) => (
                      <li key={item}>
                        <FileDown size={16} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link className={styles.secondary} href={product.url}>
                    Preview the kit <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.nextLinks}>
            <Link href="/tools">
              Explore all free tools <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/tools/pro#bundle">
              See the all-kit bundle <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.gideon}>
            <div>
              <p className={styles.eyebrow}>GIDEON HQ + THE LEADFLOW PRO</p>
              <h2>Marketplace in preparation. Plan your commerce build now.</h2>
              <p>
                Gideon HQ is a developing marketplace connected to The LeadFlow
                Pro. Its public marketplace is currently unavailable. The
                planned seller program requires an approved LeadFlow client
                relationship or partner agreement, including verified AI-company
                partners. A kit purchase does not grant seller approval.
              </p>
              <p>
                LeadFlow kits use the checkout and download access on this
                website. A 1% marketplace platform fee is a proposed seller
                benefit, confirmed in each approved agreement. Payment
                processing and other costs are separate. Marketplace payments
                remain in preparation.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primary} href={productProjectIntakeHref({ service: "websites" })}>
                  Quote my commerce build{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className={styles.secondary} href="/tools/pro">
                  Explore available kits{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <aside>
              <h3>A business relationship, with useful benefits.</h3>
              <ul>
                <li>
                  <CheckItem />A website customers understand
                </li>
                <li>
                  <CheckItem />
                  Product pages and useful tools
                </li>
                <li>
                  <CheckItem />
                  Payment and access rules
                </li>
                <li>
                  <CheckItem />
                  Customer records and follow-up
                </li>
                <li>
                  <CheckItem />
                  Delivery, recovery, and support
                </li>
              </ul>
              <p>
                Seller access is not available through this page. Discuss your
                commerce needs and agree any future marketplace participation in
                writing. Existing billing agreements keep their terms.
              </p>
            </aside>
          </div>
          <div className={styles.resources}>
            <article>
              <p className={styles.eyebrow}>BEFORE THE BUILD</p>
              <h3>Start with a website.</h3>
              <p>
                Need the foundation first? Quote the website, storefront, and
                customer path you need. Launch and operating support belong in
                your project scope; acquisition is optional.
              </p>
              <Link href="/agency/websites">
                See website and storefront projects{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </article>
            <article>
              <p className={styles.eyebrow}>AFTER THE SALE</p>
              <h3>Keep the evidence together.</h3>
              <p>
                SellerProof helps you prepare a chargeback evidence packet.
                Preview first; review and submit it yourself.
              </p>
              <Link href="/sellerproof">
                Try SellerProof <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </article>
            <article>
              <p className={styles.eyebrow}>WORK OUT YOUR NUMBERS</p>
              <h3>Revenue is not profit.</h3>
              <p>
                Use your own ad costs and margins to understand what remains
                after a sale.
              </p>
              <Link href="/articles/why-ad-revenue-and-ad-profit-need-separate-columns">
                Read the guide and use the tool{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </article>
          </div>
          <div className={styles.faq}>
            <h2>Before you connect anything</h2>
            <details>
              <summary>Does a storefront require an acquisition campaign?</summary>
              <p>{PROJECT_QUOTE_SUMMARY}</p>
              <p>
                A product build has its own deliverables and launch checks. We
                do not apply farm job or property deal acquisition targets to
                ordinary product sales. Managed acquisition is a separate scope.
              </p>
            </details>
            <details>
              <summary>Who can sell on Gideon HQ?</summary>
              <p>
                The planned program is for approved LeadFlow clients and
                partners. Marketplace access remains in preparation. The
                business relationship and written agreement must be reviewed
                before any seller access is granted. A free account, listing
                claim, or kit purchase alone does not grant approval.
              </p>
            </details>
            <details>
              <summary>
                Can I keep my current website or payment account?
              </summary>
              <p>
                That is where the review starts. We inspect what you have,
                identify what is supported, and put any migration or new
                provider in the written scope before you approve it.
              </p>
            </details>
            <details>
              <summary>Does a kit purchase install an automation?</summary>
              <p>
                No. A kit creates the files listed on its product page from your
                inputs. A live integration, website build, or managed service
                has a separate written scope and price.
              </p>
            </details>
            <details>
              <summary>Are all of Gideon’s marketplace features ready?</summary>
              <p>
                No. The public marketplace is currently unavailable and its
                features remain in preparation. Live seller checkout requires
                verified payment settlement, merchant onboarding, tax,
                fulfillment, and customer support. The LeadFlow kits on this
                page use this website’s existing checkout and access system.
              </p>
            </details>
            <details>
              <summary>Will this guarantee sales or Google rankings?</summary>
              <p>
                No. We can build clear product pages, useful tools, crawlable
                content, and measured customer paths. Demand, pricing,
                competition, operations, and search engines still affect the
                results.
              </p>
            </details>
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "The LeadFlow Pro Commerce",
            url: "https://www.theleadflowpro.com/commerce",
            description:
              "Business commerce planning, tools, and downloadable kits.",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: catalog.products.map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: product.name,
                url: product.url,
              })),
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}

function CheckItem() {
  return <ShieldCheck size={18} aria-hidden="true" />;
}
