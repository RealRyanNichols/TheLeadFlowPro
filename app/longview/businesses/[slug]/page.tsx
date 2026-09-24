import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DirectoryPage from "@/components/longview/DirectoryPage";
import Monogram from "@/components/longview/Monogram";
import {
  DIRECTORY_DISCLAIMER,
  addressLine,
  businessPath,
  categoryBySlug,
  categoryPath,
  claimMailto,
  getBusiness,
  hoursRows,
  isIndexable,
  loadDirectory,
  mapsSearchUrl,
} from "@/lib/longviewDirectory/data";
import { FIELD_LABELS, ROLE_LABELS, SOURCE_LABELS, formatDay, formatMonthYear, websiteHost } from "@/lib/longviewDirectory/display";
import { NOINDEX, directoryPageMetadata } from "@/lib/longviewDirectory/metadata";
import { shownFields } from "@/lib/longviewDirectory/validate";
import { DIRECTORY_PATH, type DirectoryBusiness, type WebsiteStatus } from "@/lib/longviewDirectory/types";
import { breadcrumbJsonLd, graph, jsonLdText } from "@/lib/site/structuredData";

// One business profile. Only facts from the publish export, each with its
// source and check date; honest fallbacks where a fact is missing; no
// ratings, reviews, photos, or copied text; a street address only when the
// engine found public storefront evidence.
//
// Rendering: thousands of profiles are expected and the data changes only
// when a new batch is merged and deployed. So nothing is prerendered at build
// (generateStaticParams returns []), each profile renders on its first
// request, and the result stays cached until the next deploy. An unknown
// slug is a 404.

export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

const REL = "nofollow noopener noreferrer";

const WEBSITE_NOTES: Partial<Record<WebsiteStatus, string>> = {
  moved: "This address now forwards visitors to a different website.",
  dead: "This website did not load when we last checked it.",
  blocked: "This website does not allow automated checks, so we could not read it.",
};

function profileDescription(b: DirectoryBusiness, categoryName: string): string {
  const parts = [`${b.name} in Longview, TX. ${b.categoryLabel ?? categoryName}.`];
  if (b.address.street) parts.push(`${addressLine(b)}.`);
  const listed = [
    b.website ? "website" : null,
    b.phone ? "phone" : null,
    b.hours ? "hours" : null,
    b.services.length ? "services" : null,
  ].filter(Boolean) as string[];
  if (listed.length) {
    const text = listed.length > 1 ? `${listed.slice(0, -1).join(", ")} and ${listed[listed.length - 1]}` : listed[0];
    parts.push(`${text[0].toUpperCase()}${text.slice(1)} from the business's own website.`);
  }
  parts.push("Every fact shows its source and the date it was checked.");
  return parts.join(" ");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const directory = loadDirectory();
  const business = getBusiness(slug, directory);
  if (!business) return { title: "Listing not found | Longview businesses", robots: NOINDEX };
  const categoryName = categoryBySlug(business.category, directory)?.name ?? business.category;
  return directoryPageMetadata({
    path: businessPath(business.slug),
    title: `${business.name} in Longview, TX | Longview businesses`,
    description: profileDescription(business, categoryName),
    index: isIndexable(directory, business),
  });
}

function SocialLinks({ business }: { business: DirectoryBusiness }) {
  const links = [
    business.social.facebook ? { label: "Facebook", href: business.social.facebook } : null,
    business.social.instagram ? { label: "Instagram", href: business.social.instagram } : null,
  ].filter(Boolean) as { label: string; href: string }[];
  if (!links.length) return null;
  return (
    <div>
      <dt>Social</dt>
      <dd>
        {links.map((link, i) => (
          <span key={link.label}>
            {i ? " · " : null}
            <a href={link.href} rel={REL}>
              {link.label}
            </a>
          </span>
        ))}
      </dd>
    </div>
  );
}

function Hours({ business }: { business: DirectoryBusiness }) {
  if (!business.hours) return <p className="lvd-fallback">Hours not listed.</p>;
  const { rows, someDaysMissing } = hoursRows(business.hours);
  return (
    <>
      <table className="lvd-hours">
        <caption className="sr-only">Hours as the business lists them</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <th scope="row">{row.label}</th>
              <td>{row.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {someDaysMissing ? <p className="lvd-fallback">Hours not listed for other days.</p> : null}
      <p className="lvd-fallback">As listed on the business's own website. Times are Central.</p>
    </>
  );
}

export default async function BusinessProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const directory = loadDirectory();
  const business = getBusiness(slug, directory);
  if (!business) notFound();

  const category = categoryBySlug(business.category, directory);
  const categoryName = category?.name ?? business.category;
  const path = businessPath(business.slug);
  const shown = new Set(shownFields(business));
  const facts = business.facts.filter((fact) => shown.has(fact.field));
  const websiteNote = business.website ? WEBSITE_NOTES[business.website.status] : undefined;
  const jsonLd = graph(
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Longview, TX", path: "/longview" },
      { name: "Longview businesses", path: DIRECTORY_PATH },
      { name: categoryName, path: categoryPath(business.category) },
      { name: business.name, path },
    ]),
  );

  return (
    <DirectoryPage
      directory={directory}
      variant="profile"
      footer={false}
      eyebrow={categoryName}
      title={business.name}
      crumbs={[
        { label: "Longview businesses", href: DIRECTORY_PATH },
        { label: categoryName, href: category ? categoryPath(category.slug) : undefined },
        { label: business.name },
      ]}
      art={<Monogram name={business.name} category={business.category} variant="cover" />}
      heroExtra={
        <p className="lvd-where">
          <span>{addressLine(business)}</span>
          <a href={mapsSearchUrl(business)} rel={REL}>
            Directions
          </a>
        </p>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <section className="lvd-band" aria-label="Listing details">
        <div className="cb-shell lvd-grid">
          <div className="lvd-panel">
            <h2 className="lvd-h2">Contact</h2>
            <dl className="lvd-dl">
              {business.categoryLabel ? (
                <div>
                  <dt>Kind of business</dt>
                  <dd>{business.categoryLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>Website</dt>
                <dd>
                  {business.website ? (
                    <>
                      <a href={business.website.url} rel={REL}>
                        {websiteHost(business.website.url)}
                      </a>
                      {websiteNote ? <small>{websiteNote}</small> : null}
                    </>
                  ) : (
                    <span className="lvd-fallback">No website found yet.</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {business.phone ? (
                    <a href={`tel:${business.phone.e164}`}>{business.phone.display}</a>
                  ) : (
                    <span className="lvd-fallback">No phone number listed on a website we could verify.</span>
                  )}
                </dd>
              </div>
              {business.email ? (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${business.email}`}>{business.email}</a>
                  </dd>
                </div>
              ) : null}
              <SocialLinks business={business} />
            </dl>
          </div>

          <div className="lvd-panel">
            <h2 className="lvd-h2">Hours</h2>
            <Hours business={business} />
          </div>

          {business.careersUrl ? (
            <div className="lvd-panel">
              <h2 className="lvd-h2">Hiring</h2>
              <p>
                <a href={business.careersUrl} rel={REL}>
                  Careers page on {websiteHost(business.careersUrl)}
                </a>
              </p>
              {business.hiringRoles.length ? (
                <p>Roles mentioned there: {business.hiringRoles.map((role) => ROLE_LABELS[role]).join(", ")}.</p>
              ) : null}
              <p className="lvd-fallback">Apply with the business directly. We do not take applications.</p>
            </div>
          ) : null}

          {business.services.length ? (
            <div className="lvd-panel">
              <h2 className="lvd-h2">Services</h2>
              <p className="lvd-fallback">Matched to the headings and menus on the business's own website.</p>
              <ul className="lvd-tags">
                {business.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {business.permitSince ? (
            <div className="lvd-panel">
              <h2 className="lvd-h2">Public record</h2>
              <p>Texas sales-tax permit on file since {formatMonthYear(business.permitSince)}.</p>
            </div>
          ) : null}

          <div className="lvd-panel lvd-grid--wide">
            <h2 className="lvd-h2">Sources and checks</h2>
            <ul className="lvd-sources">
              {facts.map((fact, i) => (
                <li key={`${fact.field}-${i}`}>
                  <strong>{FIELD_LABELS[fact.field]}</strong>
                  <span>
                    {fact.url ? (
                      <a href={fact.url} rel={REL}>
                        {SOURCE_LABELS[fact.source]}
                      </a>
                    ) : (
                      SOURCE_LABELS[fact.source]
                    )}
                  </span>
                  <span>checked {formatDay(fact.checkedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-claim-title">
        <div className="cb-shell lvd-claim">
          <h2 id="lvd-claim-title" className="lvd-h2">
            Something wrong or missing?
          </h2>
          <p className="lvd-disclaimer">{DIRECTORY_DISCLAIMER}</p>
          <p className="lvd-note">
            A business can ask us to correct a fact, add one from its own website, or remove the listing. The button opens an email to The LeadFlow Pro.
          </p>
          <a className="cb-btn cb-btn--primary" href={claimMailto(business)}>
            Claim, correct, or remove this listing
          </a>
          <div className="lvd-own">
            <h3 className="lvd-h3">Own this business?</h3>
            <p>
              The LeadFlow Pro builds websites and follow-up systems for Longview businesses. <Link href="/longview">See what we do in Longview</Link>.
            </p>
          </div>
          <p className="lvd-note">
            A free community resource from The LeadFlow Pro. <Link href={`${DIRECTORY_PATH}/about`}>About this directory</Link>.
          </p>
        </div>
      </section>
    </DirectoryPage>
  );
}
