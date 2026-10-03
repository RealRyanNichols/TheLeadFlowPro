"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Tractor,
  Zap,
  Droplets,
  Wind,
  Fuel,
  Layers,
  Landmark,
  House,
  MapPin,
  Check,
  LockKeyhole,
  Clock3,
} from "lucide-react";
import {
  INDUSTRIES,
  PLACES,
  SERVICE_NAMES,
  STAGE_LABELS,
  type IndustryId,
} from "@/lib/service-areas/catalog";
import {
  type Geometry,
  type PublicTerritory,
} from "@/lib/service-areas/engine";
import {
  inquiryAttempt,
  type InquiryAttempt,
  type InquiryRequestDetails,
} from "@/lib/service-areas/inquiry-retry";
import Link from "next/link";
import {
  managedUpfrontSummary,
  managedMonthlySummary,
} from "@/lib/site/managedPlans";
import TerritoryMap, { type MapView } from "./TerritoryMap";
import styles from "./service-areas.module.css";
import { useFormReady } from "@/components/site/useFormReady";
import { BUSINESS } from "@/lib/site/business";

const ICONS = {
  tractor: Tractor,
  zap: Zap,
  droplets: Droplets,
  wind: Wind,
  fuel: Fuel,
  layers: Layers,
  landmark: Landmark,
  house: House,
};
export default function ServiceAreas({
  territories = [],
  available = false,
  updatedAt = null,
  preview = false,
}: {
  territories?: PublicTerritory[];
  available?: boolean;
  updatedAt?: string | null;
  preview?: boolean;
}) {
  const formReady = useFormReady();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const [industry, setIndustry] = useState<IndustryId>("farm-ag"),
    [view, setView] = useState<MapView>("local"),
    [placeId, setPlaceId] = useState("tyler"),
    [miles, setMiles] = useState(35),
    [milesDraft, setMilesDraft] = useState("35"),
    [illustration, setIllustration] = useState(true),
    [compare, setCompare] = useState(false);
  const [scope, setScope] = useState<"local" | "states" | "national">("local"),
    [states, setStates] = useState("TX"),
    [services, setServices] = useState<string[]>([...INDUSTRIES[0].services]);
  const [market, setMarket] = useState<string>(PLACES[0].name),
    [marketEdited, setMarketEdited] = useState(false);
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState<InquiryAttempt | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null),
    successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
    else if (done) successRef.current?.focus();
  }, [error, done]);
  const selected = INDUSTRIES.find((i) => i.id === industry)!,
    place = PLACES.find((p) => p.id === placeId)!;
  const visible = territories.filter(
    (t) =>
      (!t.expiresAt || now === null || Date.parse(t.expiresAt) > now) &&
      (t.industry === industry || t.services.some((s) => services.includes(s))),
  );
  const candidate: Geometry =
    scope === "national"
      ? { kind: "national" }
      : scope === "states"
        ? {
            kind: "states",
            states: states
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean),
          }
        : { kind: "radius", center: { lat: place.lat, lng: place.lng }, miles };
  function choose(id: IndustryId) {
    setIndustry(id);
    setServices([...INDUSTRIES.find((i) => i.id === id)!.services]);
    setDone(false);
    setError(null);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formReady || busy) return;
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const details: InquiryRequestDetails = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      business: String(form.get("business") ?? ""),
      industry,
      services,
      market: String(form.get("market") ?? ""),
      scope,
      states:
        scope === "states"
          ? states
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          : [],
      miles: Number(form.get("miles") ?? miles),
      publicConsent: form.get("publicConsent") === "on",
      contactConsent: form.get("contactConsent") === "on",
    };
    const currentAttempt = inquiryAttempt(details, attempt, () =>
      crypto.randomUUID(),
    );
    setAttempt(currentAttempt);
    if (preview) {
      setError(
        "Preview only. No inquiry was sent. The live form saves a private area request for our team to review.",
      );
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/service-areas/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details,
          requestId: currentAttempt.requestId,
          website: form.get("website"),
        }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error ?? "Request could not be saved.");
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      {preview && (
        <div className={styles.preview}>
          DESIGN PREVIEW · Demo signals below are labeled examples. No territory
          is reserved and no inquiry is sent.
        </div>
      )}
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              <span /> BUILT AROUND YOUR BUSINESS
            </p>
            <h1>
              Your market.
              <br />
              <span>Your advantage.</span>
            </h1>
            <p className={styles.heroBody}>
              We don’t put a competing client’s ads on top of yours. We agree on
              your services and your territory, then protect that space.
            </p>
            <a href="#check-my-area" className={styles.primary}>
              Check my area <ArrowRight size={19} />
            </a>
          </div>
          <div className={styles.promise}>
            <ShieldCheck size={28} />
            <p>
              ONE INDUSTRY.
              <br />
              ONE AGREED TERRITORY.
              <br />
              <strong>ONE PARTNER.</strong>
            </p>
            <span>
              Local, statewide, or national.
              <br />
              Built for the work you actually want.
            </span>
          </div>
        </section>
        <section className={styles.explorer} aria-label="Service-area explorer">
          <div className={styles.explorerIntro}>
            <div>
              <p className={styles.eyebrow}>THE SERVICE AREA MAP</p>
              <h2>Find your industry. Explore your area.</h2>
            </div>
            <p>
              Territories change with the client’s needs. Availability changes
              when an area is held or secured.
            </p>
          </div>
          <div
            className={styles.industryGrid}
            role="group"
            aria-label="Choose an industry"
          >
            {INDUSTRIES.map((i) => {
              const Icon = ICONS[i.icon];
              return (
                <button
                  type="button"
                  key={i.id}
                  disabled={busy}
                  aria-pressed={industry === i.id}
                  onClick={() => choose(i.id)}
                >
                  <Icon size={21} />
                  <span>{i.short}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.explorerGrid}>
            <aside className={styles.panel}>
              <span className={styles.smallLabel}>YOUR INDUSTRY</span>
              <h3>{selected.name}</h3>
              <p>{selected.description}</p>
              <div className={styles.line} />
              <label htmlFor="territory-place">Explore a market</label>
              <select
                id="territory-place"
                disabled={busy}
                value={placeId}
                onChange={(e) => {
                  setCompare(false);
                  setPlaceId(e.target.value);
                  if (!marketEdited)
                    setMarket(
                      PLACES.find((p) => p.id === e.target.value)!.name,
                    );
                  setScope("local");
                  setView("local");
                  setIllustration(true);
                }}
              >
                {PLACES.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className={styles.radiusHeader}>
                <label htmlFor="territory-radius">Illustrative radius</label>
                <strong>
                  {miles}
                  <span> mi</span>
                </strong>
              </div>
              <input
                id="territory-radius"
                disabled={busy}
                aria-valuetext={`${miles} miles`}
                type="range"
                min="1"
                max="500"
                step="1"
                value={miles}
                onChange={(e) => {
                  setCompare(false);
                  setMiles(Number(e.target.value));
                  setMilesDraft(e.target.value);
                  setScope("local");
                  setIllustration(true);
                }}
              />
              <div className={styles.rangeLabels}>
                <span>1 mi</span>
                <span>500 mi</span>
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={illustration}
                  onChange={(e) => setIllustration(e.target.checked)}
                />
                Show an illustrative area
              </label>
              <div className={styles.legend}>
                <p>
                  <i className={styles.blueDot} />
                  Client protected
                </p>
                <p>
                  <i className={styles.violetDot} />
                  Temporarily held
                </p>
                <p>
                  <i className={styles.amberDot} />
                  Interest registered
                </p>
              </div>
              <div className={styles.panelNotice}>
                <ShieldCheck size={19} />
                <p>
                  Interest does not reserve an area. Reviewed holds have an
                  expiration. An approved agreement protects the agreed scope.
                </p>
              </div>
            </aside>
            <TerritoryMap
              view={view}
              onView={setView}
              territories={visible}
              candidate={illustration ? candidate : undefined}
              illustration={illustration}
              compare={compare && illustration}
            />
          </div>
          <div className={styles.coverageStatus} aria-live="polite">
            <span className={styles.statusIcon}>
              <MapPin size={19} />
            </span>
            <div>
              <strong>
                {preview
                  ? "Example pipeline for design review"
                  : !available
                    ? "Confirm current availability with our team"
                    : visible.length
                      ? `${visible.length} reviewed area ${visible.length === 1 ? "record" : "records"} for these services`
                      : "No public territory records for these services"}
              </strong>
              <p>
                {preview
                  ? "These example areas demonstrate the stages. They are not actual client or lead inventory."
                  : !available
                    ? "The coverage register is awaiting verification. The map does not claim any area is open."
                    : "Public records show approved, anonymous coverage only. An unmarked area still needs a private conflict review."}
                {updatedAt && !preview
                  ? ` Updated ${new Date(updatedAt).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}.`
                  : ""}
              </p>
            </div>
          </div>
          {visible.length > 0 && (
            <div className={styles.areaCards}>
              {visible.map((t) => (
                <article key={t.id}>
                  <span
                    className={
                      styles[
                        t.stage === "protected"
                          ? "blueBadge"
                          : t.stage === "held"
                            ? "violetBadge"
                            : "amberBadge"
                      ]
                    }
                  >
                    {preview ? "EXAMPLE · " : ""}
                    {STAGE_LABELS[t.stage]}
                  </span>
                  <h3>{t.publicRegion}</h3>
                  <p>
                    {t.stage === "protected"
                      ? "Competing campaigns are restricted by the agreed scope."
                      : t.stage === "held"
                        ? "A reviewed temporary hold is in place."
                        : "A verified inquiry is pursuing this area. It is not reserved."}
                  </p>
                  {t.expiresAt && (
                    <small>
                      {t.stage === "held"
                        ? "Hold ends"
                        : "Interest shown until"}{" "}
                      {new Date(t.expiresAt).toLocaleDateString("en-US", {
                        timeZone: "America/Chicago",
                      })}
                    </small>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        <section className={styles.rules}>
          <div>
            <span className={styles.step}>01</span>
            <h3>Start with the work.</h3>
            <p>
              We define what you sell and who competes for the same customer.
              Shared services count, even across different industry labels.
            </p>
          </div>
          <div>
            <span className={styles.step}>02</span>
            <h3>Draw the right territory.</h3>
            <p>
              A local radius, selected states, or the whole country. We build
              around travel, capacity, and the market you can serve.
            </p>
          </div>
          <div>
            <span className={styles.step}>03</span>
            <h3>Protect the agreement.</h3>
            <p>
              We review existing commitments before accepting a competing
              campaign. Changes get reviewed before the boundary moves.
            </p>
          </div>
        </section>
        <section className={styles.math}>
          <div>
            <p className={styles.eyebrow}>
              THE RIGHT AREA BEATS THE BIGGEST AREA
            </p>
            <h2>
              More miles.
              <br />
              More hauling.
              <br />
              <span>Less time doing the work.</span>
            </h2>
            <p>
              A tighter area can put travel, equipment, and response time back
              in your favor. Your territory should fit your business.
            </p>
          </div>
          <div className={styles.mathCard}>
            <div className={styles.circleGraphic}>
              <div className={styles.outerCircle}>
                <span>50 mi</span>
                <div className={styles.innerCircle}>
                  <strong>
                    35<span> mi</span>
                  </strong>
                </div>
              </div>
            </div>
            <div className={styles.mathNumbers}>
              <div>
                <strong>51%</strong>
                <span>less geographic area</span>
              </div>
              <p>
                35 miles covers about 3,848 sq mi.
                <br />
                50 miles covers about 7,854 sq mi.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              className={styles.textButton}
              onClick={() => {
                setPlaceId("tyler");
                if (!marketEdited) setMarket(PLACES[0].name);
                setScope("local");
                setMiles(35);
                setMilesDraft("35");
                setView("local");
                setIllustration(true);
                setCompare((v) => !v);
                document
                  .querySelector(`.${styles.explorer}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {compare ? "Hide" : "Compare"} 35 and 50 miles on the map{" "}
              <ArrowRight size={16} />
            </button>
            <small>
              Circle-area comparison, not a road-distance or profit estimate.
            </small>
          </div>
        </section>
        <section id="check-my-area" className={styles.request}>
          <div>
            <p className={styles.eyebrow}>
              CHECK BEFORE SOMEONE ELSE SECURES IT
            </p>
            <h2>
              The next partner
              <br />
              could be in your market.
            </h2>
            <p>
              Once an area is secured, we close that agreed space to competing
              client campaigns. Tell us what you do and where you want more
              work. We’ll check the commitments and tell you the next step.
            </p>
            <p>
              <Link href="/pricing">
                <strong>{managedUpfrontSummary()}</strong>{" "}
                {managedMonthlySummary()} Compare the monthly plans.
              </Link>
            </p>
            <ul>
              <li>
                <Check size={18} /> One real review of your industry and area
              </li>
              <li>
                <Check size={18} /> No competing-client overlap in the agreed
                scope
              </li>
              <li>
                <Check size={18} /> A clear answer before a commitment
              </li>
            </ul>
            <p className={styles.finePrint}>
              Sending this request does not reserve a territory. Protection
              begins only under an approved agreement.
            </p>
          </div>
          {done ? (
            <div
              className={styles.success}
              role="status"
              tabIndex={-1}
              ref={successRef}
            >
              <ShieldCheck size={36} />
              <h3>Your area request is saved.</h3>
              <p>
                Our team can review your private request and contact you by
                email about the next step.
              </p>
              <p>
                Your territory is not reserved yet. Anonymous interest appears
                only after verification and your permission.
              </p>
            </div>
          ) : (
            <form
              className={styles.form}
              method="post"
              action="/api/service-areas/inquiries"
              onSubmit={submit}
              aria-busy={busy}
            >
              <div className={styles.formHeading}>
                <LockKeyhole size={18} />
                <span>CHECK MY AREA</span>
              </div>
              <div className={styles.formRow}>
                <div>
                  <label htmlFor="area-name">Your name</label>
                  <input
                    id="area-name"
                    name="name"
                    autoComplete="name"
                    disabled={busy}
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <label htmlFor="area-business">Business name</label>
                  <input
                    id="area-business"
                    name="business"
                    autoComplete="organization"
                    disabled={busy}
                    required
                    maxLength={200}
                  />
                </div>
              </div>
              <label htmlFor="area-email">Email</label>
              <input
                id="area-email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={busy}
                required
                maxLength={200}
              />
              <label htmlFor="area-industry">Industry</label>
              <select
                id="area-industry"
                disabled={busy}
                value={industry}
                onChange={(e) => choose(e.target.value as IndustryId)}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <fieldset disabled={busy} aria-describedby="area-services-help">
                <legend>Services you want to advertise</legend>
                <div className={styles.serviceChecks}>
                  {selected.services.map((s) => (
                    <label key={s} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={services.includes(s)}
                        onChange={(e) =>
                          setServices((old) =>
                            e.target.checked
                              ? [...old, s]
                              : old.filter((x) => x !== s),
                          )
                        }
                      />
                      {SERVICE_NAMES[s]}
                    </label>
                  ))}
                </div>
                <p
                  id="area-services-help"
                  className={
                    services.length ? styles.fieldHelp : styles.fieldRequired
                  }
                  aria-live="polite"
                >
                  {services.length
                    ? "Select the work you want more requests for."
                    : "Select at least one service to check your area."}
                </p>
              </fieldset>
              <label htmlFor="area-scope">Coverage type</label>
              <select
                id="area-scope"
                disabled={busy}
                value={scope}
                onChange={(e) => {
                  setCompare(false);
                  const v = e.target.value as typeof scope;
                  setScope(v);
                  setView(
                    v === "national"
                      ? "national"
                      : v === "states"
                        ? "texas"
                        : "local",
                  );
                }}
              >
                <option value="local">Local radius</option>
                <option value="states">One or more states</option>
                <option value="national">United States</option>
              </select>
              <div className={styles.formRow}>
                <div>
                  <label htmlFor="area-market">Main city / market</label>
                  <input
                    id="area-market"
                    disabled={busy}
                    name="market"
                    value={market}
                    onChange={(e) => {
                      setMarketEdited(true);
                      setMarket(e.target.value);
                    }}
                    required
                    maxLength={150}
                  />
                </div>
                {scope === "local" ? (
                  <div>
                    <label htmlFor="area-miles">Desired radius (miles)</label>
                    <input
                      id="area-miles"
                      name="miles"
                      disabled={busy}
                      type="number"
                      min="1"
                      max="500"
                      value={milesDraft}
                      onChange={(e) => {
                        setCompare(false);
                        setMilesDraft(e.target.value);
                        const nextMiles = Number(e.target.value);
                        if (
                          e.target.value !== "" &&
                          Number.isFinite(nextMiles) &&
                          nextMiles >= 1 &&
                          nextMiles <= 500
                        )
                          setMiles(nextMiles);
                      }}
                      required
                    />
                  </div>
                ) : scope === "states" ? (
                  <div>
                    <label htmlFor="area-states">State codes</label>
                    <input
                      id="area-states"
                      disabled={busy}
                      placeholder="TX, LA, OK"
                      value={states}
                      onChange={(e) => setStates(e.target.value)}
                      required
                      maxLength={200}
                    />
                  </div>
                ) : (
                  <div className={styles.nationalNote}>
                    <Clock3 size={18} />
                    <span>
                      National exclusivity requires a full service-scope review.
                    </span>
                  </div>
                )}
              </div>
              <p className={styles.finePrint}>
                Use a city or market here. We’ll confirm your operating base
                privately.
              </p>
              <label className={styles.check}>
                <input
                  name="contactConsent"
                  type="checkbox"
                  required
                  disabled={busy}
                />
                I agree to email follow-up about this request.
              </label>
              <label className={styles.check}>
                <input name="publicConsent" type="checkbox" disabled={busy} />
                After verification, show anonymous interest in my industry and
                broad market. Keep my name, contact details, and business
                private.
              </label>
              <div className={styles.honeypot} aria-hidden="true">
                <label>
                  Leave blank
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {error && (
                <p
                  className={styles.error}
                  role="alert"
                  tabIndex={-1}
                  ref={errorRef}
                >
                  {error}
                </p>
              )}
              <button
                className={styles.primary}
                type="submit"
                disabled={!formReady || busy || services.length === 0}
              >
                {busy ? "Saving your request…" : "Check my area"}
                <ArrowRight size={18} />
              </button>
              <small>
                By submitting, you agree to our{" "}
                <a href="/privacy">Privacy Policy</a>. No payment. No
                reservation.
              </small>
              <noscript>
                <p className={styles.fieldHelp}>
                  This form needs JavaScript. Call{" "}
                  <a href={BUSINESS.phone.tel}>{BUSINESS.phone.display}</a> or{" "}
                  <a href={`mailto:${BUSINESS.email.hello}`}>email our team</a>{" "}
                  to check your area.
                </p>
              </noscript>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
