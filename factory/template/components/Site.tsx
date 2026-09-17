// The five page templates and the frame around them. Pure React with plain
// anchors, so the same components render inside the standalone client app
// and inside The LeadFlow Pro admin preview. No next/link, no next/image, no
// hooks: the lead form is a plain HTML form the app's route handler receives.

import type { ClientConfig, PageKey } from "../lib/config";
import { primaryCtaHref, siteRoutes } from "../lib/config";
import { jsonLdText, localBusinessJsonLd, webPageJsonLd } from "../lib/schema";

type Ctx = {
  config: ClientConfig;
  /** Current path, for aria-current. */
  path: string;
  /** Prefix for every internal link (the preview mounts the site under /factory/preview/<slug>). */
  base?: string;
  /** Where the conversion form posts. The standalone app uses /api/lead. */
  formAction?: string;
  preview?: boolean;
};

function href(ctx: Ctx, path: string): string {
  const base = ctx.base ?? "";
  return path === "/" ? base || "/" : `${base}${path}`;
}

export function brandStyle(c: ClientConfig): Record<string, string> {
  return {
    "--f-primary": c.brand.primary,
    "--f-accent": c.brand.accent,
    "--f-bg": c.brand.background,
    "--f-ink": c.brand.ink,
    ...(c.brand.fontDisplay ? { "--f-font-display": c.brand.fontDisplay } : {}),
    ...(c.brand.fontBody ? { "--f-font-body": c.brand.fontBody } : {}),
  };
}

export function Frame({ ctx, children, title, description, path }: { ctx: Ctx; children: React.ReactNode; title: string; description: string; path: string }) {
  const c = ctx.config;
  const routes = siteRoutes(c);
  const cta = primaryCtaHref(c);
  const ctaHref = cta.startsWith("/") ? href(ctx, cta) : cta;
  return (
    <div style={brandStyle(c) as React.CSSProperties} className="f-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(localBusinessJsonLd(c)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(webPageJsonLd(c, path, title, description)) }} />
      {ctx.preview ? <div className="f-preview-banner">Preview build for {c.business.name}. Not live. Form submissions go nowhere.</div> : null}
      <a className="f-skip" href="#main">Skip to content</a>
      <header className="f-header">
        <div className="f-shell f-header-inner">
          <a className="f-brand" href={href(ctx, "/")}>
            {c.brand.logo ? <img src={c.brand.logo} alt="" width={40} height={40} /> : null}
            <span>{c.business.name}</span>
          </a>
          <nav className="f-nav" aria-label="Primary">
            {routes.map((r) => (
              <a key={r.key} href={href(ctx, r.href)} aria-current={ctx.path === r.href ? "page" : undefined}>
                {r.label}
              </a>
            ))}
            <a className="f-call" href={ctaHref} data-analytics="cta-header">
              {c.offer.primaryCta.label}
            </a>
          </nav>
          <details className="f-menu">
            <summary aria-label="Open menu">Menu</summary>
            <div className="f-menu-panel">
              {routes.map((r) => (
                <a key={r.key} href={href(ctx, r.href)}>
                  {r.label}
                </a>
              ))}
              <a href={`tel:${c.business.phoneE164}`}>Call {c.business.phoneDisplay}</a>
            </div>
          </details>
        </div>
      </header>
      <main id="main" className="f-page" tabIndex={-1}>
        {children}
      </main>
      <footer className="f-footer">
        <div className="f-shell f-footer-inner">
          <strong>{c.business.name}</strong>
          <span>
            {c.business.address?.showStreet && c.business.address.street ? `${c.business.address.street}, ` : ""}
            {c.business.address ? `${c.business.address.city}, ${c.business.address.region}` : c.business.serviceArea[0]}
            {" · "}
            <a href={`tel:${c.business.phoneE164}`}>{c.business.phoneDisplay}</a>
            {" · "}
            <a href={`mailto:${c.business.email}`}>{c.business.email}</a>
          </span>
          {c.business.hours?.length ? <span>{c.business.hours.join(" · ")}</span> : null}
          <nav aria-label="Footer">
            {routes.map((r) => (
              <a key={r.key} href={href(ctx, r.href)}>
                {r.label}
              </a>
            ))}
          </nav>
          <span>Serving {c.business.serviceArea.join(", ")}.</span>
          {c.business.legalName ? <span>{c.business.legalName}</span> : null}
        </div>
      </footer>
    </div>
  );
}

export function HomePage({ ctx }: { ctx: Ctx }) {
  const c = ctx.config;
  const cta = primaryCtaHref(c);
  return (
    <Frame ctx={ctx} path="/" title={c.seo.title} description={c.seo.description}>
      <section className="f-hero f-shell">
        <div>
          <p className="f-eyebrow">{c.business.tagline}</p>
          <h1>{c.offer.headline}</h1>
          <p className="f-lead">{c.offer.subhead}</p>
          <div className="f-actions">
            <a className="f-call" href={cta.startsWith("/") ? href(ctx, cta) : cta} data-analytics="cta-hero">
              {c.offer.primaryCta.label}
            </a>
            <a className="f-ghost" href={href(ctx, "/services")}>
              See services
            </a>
          </div>
          {c.offer.trustLine ? <p className="f-trust">{c.offer.trustLine}</p> : null}
        </div>
      </section>
      <section className="f-band f-band--tint">
        <div className="f-shell">
          <h2>{c.offer.promise}</h2>
          <div className="f-grid">
            {c.pages.home.sections.map((s) => (
              <div key={s.title} className="f-card">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="f-band">
        <div className="f-shell">
          <h2>What we do</h2>
          <div className="f-grid">
            {c.pages.services.items.slice(0, 3).map((s) => (
              <a key={s.slug} className="f-card" href={`${href(ctx, "/services")}#${s.slug}`} style={{ textDecoration: "none" }}>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                {s.startingAt ? <small>{s.startingAt}</small> : null}
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="f-band f-band--tint">
        <div className="f-shell">
          <h2>{c.pages.conversion.title}</h2>
          <p className="f-lead">{c.pages.conversion.intro}</p>
          <div className="f-actions">
            <a className="f-call" href={href(ctx, `/${c.pages.conversion.slug}`)} data-analytics="cta-home-conversion">
              {c.pages.conversion.title}
            </a>
            <a className="f-ghost" href={`tel:${c.business.phoneE164}`}>
              Call {c.business.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </Frame>
  );
}

export function ServicesPage({ ctx }: { ctx: Ctx }) {
  const c = ctx.config;
  return (
    <Frame ctx={ctx} path="/services" title={`Services | ${c.business.name}`} description={c.pages.services.intro}>
      <section className="f-hero f-shell">
        <div>
          <p className="f-eyebrow">Services</p>
          <h1>What {c.business.name} does</h1>
          <p className="f-lead">{c.pages.services.intro}</p>
        </div>
      </section>
      <section className="f-band">
        <div className="f-shell f-grid">
          {c.pages.services.items.map((s) => (
            <div key={s.slug} id={s.slug} className="f-card">
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              {s.startingAt ? <small>{s.startingAt}</small> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="f-band f-band--tint">
        <div className="f-shell">
          <h2>Ready when you are</h2>
          <div className="f-actions">
            <a className="f-call" href={href(ctx, `/${c.pages.conversion.slug}`)} data-analytics="cta-services">
              {c.pages.conversion.title}
            </a>
            <a className="f-ghost" href={`tel:${c.business.phoneE164}`}>
              Call {c.business.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </Frame>
  );
}

export function AboutPage({ ctx }: { ctx: Ctx }) {
  const c = ctx.config;
  return (
    <Frame ctx={ctx} path="/about" title={`About | ${c.business.name}`} description={c.pages.about.story.slice(0, 155)}>
      <section className="f-hero f-shell">
        <div>
          <p className="f-eyebrow">About</p>
          <h1>The people behind {c.business.name}</h1>
          <p className="f-lead">{c.pages.about.story}</p>
        </div>
      </section>
      {c.pages.about.people?.length ? (
        <section className="f-band">
          <div className="f-shell f-grid">
            {c.pages.about.people.map((p) => (
              <div key={p.name} className="f-card">
                {p.photo ? <img src={p.photo} alt={p.name} width={320} height={320} style={{ borderRadius: 12, marginBottom: 12 }} /> : null}
                <h3>{p.name}</h3>
                <p>
                  <strong>{p.role}</strong>
                  {p.bio ? ` · ${p.bio}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="f-band f-band--tint">
        <div className="f-shell">
          <h2>Serving {c.business.serviceArea.join(", ")}</h2>
          <div className="f-actions">
            <a className="f-call" href={href(ctx, "/contact")} data-analytics="cta-about">
              Get in touch
            </a>
          </div>
        </div>
      </section>
    </Frame>
  );
}

export function ContactPage({ ctx }: { ctx: Ctx }) {
  const c = ctx.config;
  return (
    <Frame ctx={ctx} path="/contact" title={`Contact | ${c.business.name}`} description={c.pages.contact.intro}>
      <section className="f-hero f-shell">
        <div>
          <p className="f-eyebrow">Contact</p>
          <h1>Reach {c.business.name}</h1>
          <p className="f-lead">{c.pages.contact.intro}</p>
          <div className="f-contact" style={{ marginTop: 20 }}>
            <a className="f-call" href={`tel:${c.business.phoneE164}`} data-analytics="cta-contact-call">
              Call {c.business.phoneDisplay}
            </a>
            <a className="f-ghost" href={`sms:${c.business.phoneE164}`}>
              Text {c.business.phoneDisplay}
            </a>
            <a href={`mailto:${c.business.email}`}>{c.business.email}</a>
            {c.business.hours?.length ? <span>{c.business.hours.join(" · ")}</span> : null}
            {c.business.address ? (
              <span>
                {c.business.address.showStreet && c.business.address.street ? `${c.business.address.street}, ` : ""}
                {c.business.address.city}, {c.business.address.region}
              </span>
            ) : null}
          </div>
          <div className="f-actions">
            <a className="f-ghost" href={href(ctx, `/${c.pages.conversion.slug}`)}>
              {c.pages.conversion.title}
            </a>
          </div>
        </div>
      </section>
    </Frame>
  );
}

export function ConversionPage({ ctx, submitted, error }: { ctx: Ctx; submitted?: boolean; error?: string | null }) {
  const c = ctx.config;
  const cv = c.pages.conversion;
  const action = ctx.formAction ?? `${ctx.base ?? ""}/api/lead`;
  return (
    <Frame ctx={ctx} path={`/${cv.slug}`} title={`${cv.title} | ${c.business.name}`} description={cv.intro}>
      <section className="f-hero f-shell">
        <div>
          <p className="f-eyebrow">{cv.kind === "booking" ? "Book" : cv.kind === "campaign" ? "This month" : "Get a number"}</p>
          <h1>{cv.title}</h1>
          <p className="f-lead">{cv.intro}</p>
        </div>
      </section>
      <section className="f-band">
        <div className="f-shell">
          {submitted ? (
            <div className="f-success" role="status">
              <strong>Got it.</strong> {cv.thankYou}
            </div>
          ) : (
            <form className="f-form" method="post" action={action} data-analytics={`form-${cv.kind}`}>
              <input type="hidden" name="site" value={c.slug} />
              <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
              {cv.fields.map((f) => (
                <label key={f.id}>
                  {f.label}
                  {f.type === "textarea" ? (
                    <textarea name={f.id} required={f.required} maxLength={2000} />
                  ) : f.type === "select" ? (
                    <select name={f.id} required={f.required} defaultValue="">
                      <option value="" disabled>
                        Choose one
                      </option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input name={f.id} type={f.type} required={f.required} maxLength={200} inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined} />
                  )}
                </label>
              ))}
              <p className="f-consent">{cv.consentLine}</p>
              {error ? (
                <p className="f-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="f-call" type="submit" disabled={ctx.preview} data-analytics="form-submit">
                {ctx.preview ? "Preview only" : cv.title}
              </button>
            </form>
          )}
        </div>
      </section>
    </Frame>
  );
}

export function renderPage(key: PageKey, ctx: Ctx, extra: { submitted?: boolean; error?: string | null } = {}) {
  switch (key) {
    case "home":
      return <HomePage ctx={ctx} />;
    case "services":
      return <ServicesPage ctx={ctx} />;
    case "about":
      return <AboutPage ctx={ctx} />;
    case "contact":
      return <ContactPage ctx={ctx} />;
    case "conversion":
      return <ConversionPage ctx={ctx} {...extra} />;
  }
}
