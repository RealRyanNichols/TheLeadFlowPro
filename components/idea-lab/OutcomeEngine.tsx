"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Download, FileText } from "lucide-react";
import {
  defaultIdeaOutcomeExperiment,
  evaluateIdeaOutcomeExperiment,
  type IdeaOutcomeExperiment,
} from "@/lib/ideaLabOutcome";
import styles from "./outcome-engine.module.css";

type Props = {
  experiments: IdeaOutcomeExperiment[];
  ready: boolean;
  saving: boolean;
  onSave: (experiment: IdeaOutcomeExperiment) => Promise<boolean>;
};
const number = (value: number | null, digits = 1) =>
  value === null
    ? "Not recorded"
    : value.toLocaleString("en-US", { maximumFractionDigits: digits });
const plainAssessment = (text: string) =>
  text.replace(/\bpilot\b/g, "test").replace(/\bbaseline\b/g, "before-change");

// Invented data is isolated from saved records and is always visibly labeled.
function example(): IdeaOutcomeExperiment {
  return {
    ...defaultIdeaOutcomeExperiment("example-only"),
    name: "Example: faster lead follow-up",
    sourceReference: "Invented process walkthrough for this example.",
    baseline: { leads: 60, bookings: 6, minutes: 300, cost: 30 },
    pilot: { leads: 60, bookings: 12, minutes: 180, cost: 24 },
    evidence: {
      baseline: "Invented example counts, not a customer record.",
      pilot: "Invented example counts, not a customer record.",
    },
  };
}

export default function OutcomeEngine({
  experiments,
  ready,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(defaultIdeaOutcomeExperiment);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [demo, setDemo] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const problem = useRef<HTMLParagraphElement>(null);
  const exampleResult = evaluateIdeaOutcomeExperiment(example());
  const result = (() => {
    try {
      return evaluateIdeaOutcomeExperiment(draft);
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (error) problem.current?.focus();
  }, [error]);

  function start() {
    setDraft(defaultIdeaOutcomeExperiment(crypto.randomUUID()));
    setDemo(false);
    setDirty(false);
    setStarted(true);
    setStep(1);
    setError("");
    setMessage("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function change(patch: Partial<IdeaOutcomeExperiment>) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setMessage("");
    setError("");
  }
  function advance(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function openExample() {
    if (dirty || saving) return;
    setDraft(example());
    setDemo(true);
    setStarted(true);
    setDirty(false);
    setMessage("");
    advance(3);
  }
  function download() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = window.location.pathname.startsWith("/design-preview/")
      ? "/design-preview/idea-lab/export"
      : "/api/admin/idea-lab/export";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "experiment";
    input.value = JSON.stringify(draft);
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();
    setMessage(
      "Download requested. Check your browser’s Downloads for leadflow-outcome-report.md.",
    );
  }

  return (
    <section className={styles.engine} aria-label="Outcome Engine">
      {!started ? (
        <>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>
                <FileText size={15} aria-hidden /> LEAD FOLLOW-UP REPORT
              </span>
              <h1 ref={heading} tabIndex={-1}>
                See if your follow-up is working.
              </h1>
              <p>
                Enter your before-and-after numbers. Get a report showing
                booking changes, time, cost, and what to check next.
              </p>
              <div className={styles.heroActions}>
                <button
                  className={styles.primary}
                  disabled={saving}
                  onClick={() => {
                    if (dirty) {
                      setStarted(true);
                      requestAnimationFrame(() => heading.current?.focus());
                    } else start();
                  }}
                >
                  {dirty ? "Continue my report" : "Start my report"}
                  <ArrowRight size={20} aria-hidden />
                </button>
                <button
                  className={styles.textButton}
                  disabled={dirty || saving}
                  onClick={openExample}
                >
                  Open the example report <ArrowRight size={16} aria-hidden />
                </button>
              </div>
              <p className={styles.heroNote}>
                You enter the records. We calculate the comparison and prepare a
                follow-up checklist for you to review.
              </p>
              {dirty && (
                <p className={styles.heroNote}>
                  Your unfinished report is kept here. Press Continue my report
                  to finish, save, or download it.
                </p>
              )}
            </div>
            <div
              className={styles.reportPreview}
              aria-label="Example finished report"
            >
              <div className={styles.previewTop}>
                <div>
                  <span className={styles.kicker}>WHAT YOU’LL GET</span>
                  <h2>Your follow-up report</h2>
                  <p>Example · invented numbers</p>
                </div>
                <Image
                  src="/images/idea-lab/outcome-core.webp"
                  alt=""
                  width={64}
                  height={80}
                  priority
                  className={styles.art}
                />
              </div>
              <div className={styles.previewBooking}>
                <span>Leads that booked work</span>
                <div>
                  <strong>6 of 60</strong>
                  <ArrowRight size={24} aria-hidden />
                  <strong>12 of 60</strong>
                </div>
                <p>Before the change → during the test</p>
              </div>
              <div className={styles.previewRates}>
                <span>Booking rate</span>
                <strong>
                  {number(exampleResult.metrics.baselineBookingRate)}% →{" "}
                  {number(exampleResult.metrics.pilotBookingRate)}%
                </strong>
              </div>
              <dl className={styles.previewMeasures}>
                <div>
                  <dt>Time per lead</dt>
                  <dd>5 → 3 minutes</dd>
                </div>
                <div>
                  <dt>Cost per lead</dt>
                  <dd>$0.50 → $0.40</dd>
                </div>
              </dl>
              <div className={styles.previewNext}>
                <Check size={18} aria-hidden />
                <p>
                  <strong>Next step:</strong> Check the records and repeat with
                  similar leads before expanding.
                </p>
              </div>
            </div>
          </div>
          <div className={styles.intro}>
            <span className={styles.kicker}>
              FROM YOUR NUMBERS TO YOUR NEXT STEP
            </span>
            <h2>Here’s exactly what to do.</h2>
            <ol className={styles.simpleSteps}>
              <li>
                <span>01</span>
                <div>
                  <h3>Describe your follow-up.</h3>
                  <p>
                    Press <strong>Start my report</strong>. Name your test,
                    describe the change, and add a process reference. Then press{" "}
                    <strong>Continue to numbers</strong>.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Enter your before-and-after numbers.</h3>
                  <p>
                    Add leads received, leads that booked work, time, cost, and
                    record references for both groups. Press{" "}
                    <strong>Show my report</strong>.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Read, save, and download your report.</h3>
                  <p>
                    See what changed and what to check next. Press{" "}
                    <strong>Save in this workspace</strong> to reopen it later,
                    or <strong>Download report</strong> to keep a text copy.
                  </p>
                </div>
              </li>
            </ol>
            <div className={styles.preparation}>
              <h3>Have these ready</h3>
              <p>
                Two comparable groups of leads, their date ranges, and the
                records behind the counts. If you haven’t measured time or cost,
                leave those fields blank; the report will say they need
                checking.
              </p>
              <p>
                A lead is a person who asked about your service. Count that
                person once, even if they booked more than one job.
              </p>
            </div>
            {experiments.length > 0 && (
              <label className={styles.field}>
                Open a saved test
                <select
                  value=""
                  disabled={dirty || saving}
                  onChange={(event) => {
                    if (dirty || saving) return;
                    const saved = experiments.find(
                      (item) => item.id === event.target.value,
                    );
                    if (saved) {
                      setDraft(saved);
                      setDemo(false);
                      setStarted(true);
                      setDirty(false);
                      setMessage("");
                      advance(3);
                    }
                  }}
                >
                  <option value="">Choose a test…</option>
                  {experiments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className={styles.note}>
              This tool compares records you enter and prepares a manual
              checklist. It does not send follow-ups or create bookings. The
              example is invented; your report uses your numbers.
            </p>
            <details className={styles.details}>
              <summary>What do the other tabs do?</summary>
              <ul className={styles.limitations}>
                <li>
                  <strong>Sources:</strong> Find your saved ideas and open the
                  original posts.
                </li>
                <li>
                  <strong>Queue:</strong> See the build plans you’ve chosen to
                  work on.
                </li>
                <li>
                  <strong>Brief:</strong> Write what to build, what you’ll get,
                  and how you’ll check it.
                </li>
                <li>
                  <strong>Results:</strong> Reopen saved comparisons and see
                  which business measures still need records.
                </li>
              </ul>
            </details>
          </div>
        </>
      ) : (
        <div className={styles.flow}>
          <div className={styles.flowTop}>
            <button
              className={styles.back}
              onClick={() => {
                setStarted(false);
                setStep(1);
                requestAnimationFrame(() => heading.current?.focus());
              }}
            >
              <ArrowLeft size={17} aria-hidden /> Back to instructions
            </button>
            <span>{demo ? "ILLUSTRATIVE EXAMPLE" : "LEAD FOLLOW-UP TEST"}</span>
          </div>
          {demo && (
            <p className={styles.demo}>
              Example only. These are invented numbers, not LeadFlow or customer
              results.
            </p>
          )}
          <ol className={styles.progress} aria-label="Test progress">
            {["Describe", "Add numbers", "Get report"].map((label, index) => (
              <li
                key={label}
                aria-current={step === index + 1 ? "step" : undefined}
              >
                <span>
                  {step > index + 1 ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                {label}
              </li>
            ))}
          </ol>
          {error && (
            <p
              className={styles.error}
              role="alert"
              ref={problem}
              tabIndex={-1}
            >
              {error}
            </p>
          )}
          {message && (
            <p className={styles.notice} role="status">
              {message}
            </p>
          )}
          {step === 1 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                advance(2);
              }}
            >
              <h1 ref={heading} tabIndex={-1}>
                1. Describe your follow-up.
              </h1>
              <p className={styles.lead}>
                Fill in these four fields, then press Continue to numbers. Your
                finished report will compare bookings, time, and cost.
              </p>
              <label className={styles.field}>
                1. Name this test
                <input
                  required
                  maxLength={160}
                  value={draft.name}
                  onChange={(event) => change({ name: event.target.value })}
                  placeholder="Faster lead follow-up"
                  aria-describedby="outcome-name-help"
                />
                <small id="outcome-name-help">
                  Choose a name you’ll recognize when you reopen the report.
                </small>
              </label>
              <label className={styles.field}>
                2. What follow-up are you testing?
                <textarea
                  required
                  rows={4}
                  aria-describedby="outcome-workflow-help"
                  maxLength={6000}
                  value={draft.workflowNote}
                  onChange={(event) =>
                    change({ workflowNote: event.target.value })
                  }
                />
                <small id="outcome-workflow-help">
                  Describe the current steps and the change you want to test.
                  For example: review the inquiry, prepare a reply, approve it,
                  then record whether the lead booked work.
                </small>
              </label>
              <label className={styles.field}>
                3. Where is this process recorded?
                <input
                  required
                  maxLength={2000}
                  value={draft.sourceReference}
                  onChange={(event) =>
                    change({ sourceReference: event.target.value })
                  }
                  placeholder="Process note, call date, or record ID"
                  aria-describedby="outcome-source-help"
                />
                <small id="outcome-source-help">
                  Enter a process-note ID, call date, or record link. Use a
                  reference instead of customer names or contact details.
                </small>
              </label>
              <label className={styles.field}>
                4. What booking-rate increase is your target?
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  required
                  aria-describedby="outcome-target-help"
                  value={draft.minimumBookingLiftPoints}
                  onChange={(event) =>
                    change({
                      minimumBookingLiftPoints: Number(event.target.value),
                    })
                  }
                />
                <small id="outcome-target-help">
                  10% before and 15% during the test is an increase of 5
                  percentage points. Enter your target increase. It is not a
                  promised result.
                </small>
              </label>
              <button type="submit" className={styles.primary}>
                Continue to numbers <ArrowRight size={18} aria-hidden />
              </button>
            </form>
          )}
          {step === 2 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  evaluateIdeaOutcomeExperiment(draft);
                  advance(3);
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Check your numbers.",
                  );
                }
              }}
            >
              <h1 ref={heading} tabIndex={-1}>
                2. Enter your before-and-after numbers.
              </h1>
              <p className={styles.lead}>
                Complete both groups using similar leads and comparable date
                ranges. Add the record references, then press Show my report.
              </p>
              <div className={styles.cohorts}>
                {(["baseline", "pilot"] as const).map((cohort) => (
                  <fieldset key={cohort} className={styles.cohort}>
                    <legend>
                      {cohort === "baseline"
                        ? "Before the change"
                        : "During the test"}
                    </legend>
                    {(
                      [
                        { key: "leads", label: "Leads received", whole: true },
                        {
                          key: "bookings",
                          label: "Leads that booked work",
                          whole: true,
                        },
                        {
                          key: "minutes",
                          label: "Total follow-up time (minutes)",
                          whole: false,
                        },
                        {
                          key: "cost",
                          label: "Total follow-up cost ($)",
                          whole: false,
                        },
                      ] as const
                    ).map(({ key, label, whole }) => (
                      <label key={key} className={styles.field}>
                        {label}
                        <input
                          required={whole}
                          type="number"
                          aria-describedby={`outcome-${cohort}-${key}-help`}
                          inputMode={whole ? "numeric" : "decimal"}
                          min={0}
                          max={1000000}
                          step={whole ? 1 : "any"}
                          value={draft[cohort][key] ?? ""}
                          onChange={(event) =>
                            change({
                              [cohort]: {
                                ...draft[cohort],
                                [key]:
                                  event.target.value === "" && !whole
                                    ? null
                                    : Number(event.target.value),
                              },
                            })
                          }
                        />
                        <small id={`outcome-${cohort}-${key}-help`}>
                          {key === "leads" &&
                            "Enter the total number of unique people who asked about your service in this group."}
                          {key === "bookings" &&
                            "How many of those leads booked work? Count each person once. This cannot exceed leads received."}
                          {key === "minutes" &&
                            "Add the minutes spent on follow-up, including drafting and review. Leave blank if unmeasured; enter 0 only if no time was spent."}
                          {key === "cost" &&
                            "Add the cost of running this follow-up for the same group. Leave blank if unmeasured; enter 0 only if there was no cost."}
                        </small>
                      </label>
                    ))}
                    <p className={styles.note}>
                      Count each lead once, even if they booked more than one
                      job.
                    </p>
                    <label className={styles.field}>
                      Record reference and date range
                      <input
                        maxLength={2000}
                        value={draft.evidence[cohort]}
                        onChange={(event) =>
                          change({
                            evidence: {
                              ...draft.evidence,
                              [cohort]: event.target.value,
                            },
                          })
                        }
                        placeholder="Report ID and date range"
                        aria-describedby={`outcome-${cohort}-evidence-help`}
                      />
                      <small id={`outcome-${cohort}-evidence-help`}>
                        Identify the report or record and its dates. Keep
                        customer details out. Missing references will be
                        flagged; check the underlying records before deciding.
                      </small>
                    </label>
                  </fieldset>
                ))}
              </div>
              <details className={styles.details}>
                <summary>Optional: estimate the financial effect</summary>
                <label className={styles.field}>
                  Estimated contribution per lead that books work ($)
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step="any"
                    value={draft.contributionPerBooking}
                    onChange={(event) =>
                      change({
                        contributionPerBooking: Number(event.target.value),
                      })
                    }
                  />
                  <small>
                    Use an estimate after direct delivery costs. Bookings are
                    not collected revenue.
                  </small>
                </label>
              </details>
              <div className={styles.actions}>
                <button className={styles.primary} type="submit">
                  Show my report <ArrowRight size={18} aria-hidden />
                </button>
                <button
                  className={styles.back}
                  type="button"
                  onClick={() => advance(1)}
                >
                  Back
                </button>
              </div>
            </form>
          )}
          {step === 3 && result && (
            <div>
              <span className={styles.kicker}>
                {demo
                  ? "INVENTED EXAMPLE / RECORDED COMPARISON"
                  : "YOUR RECORDED COMPARISON"}
              </span>
              <h1 ref={heading} tabIndex={-1}>
                3. Read your follow-up report.
              </h1>
              <p className={styles.lead}>
                Check the booking change, time, and cost below. Read Your next
                step, then save your comparison or download the report.
              </p>
              <div className={styles.assessment}>
                <strong>{plainAssessment(result.label)}</strong>
                <p>{plainAssessment(result.summary)}</p>
              </div>
              <div className={styles.resultHero}>
                <span>Change in booking rate</span>
                <strong>
                  {result.metrics.bookingLiftPoints === null
                    ? "Not measured"
                    : `${result.metrics.bookingLiftPoints > 0 ? "+" : ""}${number(result.metrics.bookingLiftPoints)}`}
                </strong>
                <p>
                  Percentage points: a change from 10% to 20% means 10 more
                  bookings per 100 leads.
                </p>
                {result.metrics.baselineBookingRate !== null &&
                  result.metrics.pilotBookingRate !== null && (
                    <div className={styles.bars}>
                      {(
                        [
                          {
                            name: "Before",
                            value: result.metrics.baselineBookingRate,
                          },
                          {
                            name: "Test",
                            value: result.metrics.pilotBookingRate,
                          },
                        ] as const
                      ).map((bar) => (
                        <div className={styles.barRow} key={bar.name}>
                          <span>{bar.name}</span>
                          <div className={styles.track}>
                            <div style={{ width: `${bar.value}%` }} />
                          </div>
                          <strong>{number(bar.value)}%</strong>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              <dl className={styles.measures}>
                <div>
                  <dt>Time change per 100 leads</dt>
                  <dd>
                    {result.metrics.minutesSavedPer100Leads === null
                      ? "Not recorded"
                      : `${number(Math.abs(result.metrics.minutesSavedPer100Leads))} min ${result.metrics.minutesSavedPer100Leads < 0 ? "extra" : result.metrics.minutesSavedPer100Leads > 0 ? "saved" : "change"}`}
                  </dd>
                </div>
                <div>
                  <dt>Cost change per 100 leads</dt>
                  <dd>
                    {result.metrics.costDifferencePer100Leads === null
                      ? "Not recorded"
                      : new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 2,
                        }).format(
                          Math.abs(result.metrics.costDifferencePer100Leads),
                        )}
                    {result.metrics.costDifferencePer100Leads !== null &&
                      (result.metrics.costDifferencePer100Leads < 0
                        ? " less"
                        : result.metrics.costDifferencePer100Leads > 0
                          ? " more"
                          : " change")}
                  </dd>
                </div>
              </dl>
              <div className={styles.nextMove}>
                <h2>Your next step</h2>
                <ul>
                  {result.reasons.map((reason) => (
                    <li key={reason}>{plainAssessment(reason)}</li>
                  ))}
                </ul>
                <p>
                  Before-and-after counts show a direction. They do not prove
                  the workflow caused the change or that a booking became paid
                  work.
                </p>
              </div>
              <details className={styles.details}>
                <summary>Read your follow-up checklist</summary>
                <ol className={styles.workflow}>
                  {result.workflow.map((stage) => (
                    <li key={stage.id}>
                      <strong>{stage.title}</strong>
                      <p>{stage.instruction}</p>
                    </li>
                  ))}
                </ol>
                <p className={styles.note}>
                  Prepared for human review. These steps do not run or contact
                  customers.
                </p>
              </details>
              <details className={styles.details}>
                <summary>
                  Measurement notes
                  {draft.contributionPerBooking > 0
                    ? " and financial estimate"
                    : ""}
                </summary>
                {draft.contributionPerBooking > 0 && (
                  <p className={styles.note}>
                    Estimated additional contribution per 100 leads:{" "}
                    {result.metrics.netContributionProxyPer100Leads === null
                      ? "Not recorded."
                      : `$${number(result.metrics.netContributionProxyPer100Leads, 2)}.`}{" "}
                    This is a normalized scenario using your contribution
                    estimate, not actual revenue.
                  </p>
                )}
                <ul className={styles.limitations}>
                  {result.limitations.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </details>
              <div className={styles.actions}>
                {demo ? (
                  <button className={styles.primary} onClick={start}>
                    Start my own report <ArrowRight size={18} aria-hidden />
                  </button>
                ) : (
                  <button
                    className={styles.primary}
                    disabled={!ready || saving}
                    onClick={async () => {
                      try {
                        const saved = await onSave(draft);
                        if (saved) {
                          setDirty(false);
                          setMessage(
                            "Saved in this workspace. Use Back to instructions, then Open a saved test to find it again.",
                          );
                        }
                      } catch {
                        setError(
                          "Save failed. Download the report to keep your work.",
                        );
                      }
                    }}
                  >
                    {saving ? "Saving…" : "Save in this workspace"}
                    <Check size={18} aria-hidden />
                  </button>
                )}
                <button className={styles.secondary} onClick={download}>
                  <Download size={17} aria-hidden /> Download report
                </button>
              </div>
              <p className={styles.note}>
                {demo
                  ? "This is an invented example. Start my own report opens a blank comparison."
                  : "Save in this workspace keeps this report here so you can reopen it."}{" "}
                Download report gives you a text file you can open or share,
                with the comparison, checklist, and record references.
              </p>
              {!demo && (
                <button className={styles.back} onClick={() => advance(2)}>
                  Edit my numbers
                </button>
              )}
              {dirty && !demo && (
                <p className={styles.note}>
                  Unsaved test. Save it or download the report before leaving
                  this view.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
