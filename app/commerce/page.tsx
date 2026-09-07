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
import CommercePlanner from "./CommercePlanner";
import styles from "./commerce.module.css";

export const metadata: Metadata = withPublicPageMetadata("/commerce", {
  title: "eCommerce Websites, Payments & Tools | The LeadFlow Pro",
  description:
    "Connect your online store, payments, downloads and customer follow-up. Try useful tools or plan an eCommerce build with The LeadFlow Pro in Longview, Texas.",
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
                <Link className={styles.primary} href="#plan">
                  Plan my selling setup{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className={styles.secondary} href="#kits">
                  Try a working product
                </Link>
              </div>
              <p className={styles.fine}>
                Websites and commerce systems for businesses in Longview, East
                Texas, and beyond. Start with what you already have.
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
              and save a build list.
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
              <h2>Open to buyers. Built for our clients and partners.</h2>
              <p>
                Gideon HQ is the commerce side of The LeadFlow Pro. Anyone can
                browse. Selling requires an approved LeadFlow client
                relationship or partner agreement, including verified AI-company
                partners. Creating an account or buying a tool does not
                automatically approve a seller.
              </p>
              <p>
                LeadFlow kits use the checkout and download access on this
                website. A 1% marketplace platform fee is a proposed seller
                benefit, confirmed in each approved agreement. Payment
                processing and other costs are separate. Marketplace payments
                remain in preparation.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="#build">
                  Plan my commerce build{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a
                  className={styles.secondary}
                  href="https://gideonhq.com/marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explore the marketplace preview{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
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
                Apply, agree the relationship and terms, then receive seller
                access after approval. Existing billing agreements keep their
                terms.
              </p>
            </aside>
          </div>
          <div className={styles.resources}>
            <article>
              <p className={styles.eyebrow}>BEFORE THE BUILD</p>
              <h3>Start with a website.</h3>
              <p>
                Need the foundation first? Review the five-page program and what
                the $0 build fee includes.
              </p>
              <Link href="/free-build">
                See the free website program{" "}
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
              <summary>Who can sell on Gideon HQ?</summary>
              <p>
                Approved LeadFlow clients and partners. We review the business
                relationship and written agreement before granting seller
                access. AI-company ownership must be verified and still requires
                an agreement. A free account, listing claim, or kit purchase
                alone does not grant approval.
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
                No. Its marketplace is a preview. Live seller checkout requires
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
