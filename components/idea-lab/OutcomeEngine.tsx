"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Download, Sparkles } from "lucide-react";
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
    setMessage("Report prepared. Check your downloads.");
  }

  return (
    <section className={styles.engine} aria-label="Outcome Engine">
      {!started ? (
        <>
          <div className={styles.hero}>
            <Image
              src="/images/idea-lab/outcome-core.webp"
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 75vw"
              className={styles.art}
            />
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>
                <Sparkles size={15} aria-hidden /> THE LEADFLOW OUTCOME ENGINE
              </span>
              <h1>
                Make the next
                <br />
                result real.
              </h1>
              <p>
                One workflow. One test.
                <br />
                See what actually improves.
              </p>
              <button
                className={styles.primary}
                disabled={saving}
                onClick={() => (dirty ? setStarted(true) : start())}
              >
                {dirty ? "Continue your test" : "Start a test"}{" "}
                <ArrowRight size={20} aria-hidden />
              </button>
              <button
                className={styles.textButton}
                disabled={dirty || saving}
                onClick={() => {
                  setDraft(example());
                  setDemo(true);
                  setStarted(true);
                  setStep(3);
                  setDirty(false);
                }}
              >
                See how it works <ArrowRight size={16} aria-hidden />
              </button>
              {dirty && (
                <p className={styles.heroNote}>
                  Your unfinished test is kept here. Continue to save or
                  download it.
                </p>
              )}
            </div>
          </div>
          <div className={styles.intro}>
            <span className={styles.kicker}>
              A CLEAR PATH TO A BETTER RESULT
            </span>
            <h2>
              Less guesswork.
              <br />
              More proof.
            </h2>
            <ol className={styles.simpleSteps}>
              <li>
                <span>01</span>
                <div>
                  <h3>Pick the result.</h3>
                  <p>Start with one job: turn more leads into booked work.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Test one improvement.</h3>
                  <p>Prepare a workflow, then compare before and after.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Keep what works.</h3>
                  <p>See the change, check the costs, and keep the evidence.</p>
                </div>
              </li>
            </ol>
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
                      setStep(3);
                      setDirty(false);
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
              Your workspace starts with no measured results. The example uses
              invented numbers.
            </p>
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
              }}
            >
              <ArrowLeft size={17} aria-hidden /> Overview
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
            {["Choose", "Compare", "Result"].map((label, index) => (
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
                What should improve?
              </h1>
              <p className={styles.lead}>
                Start with more booked jobs from the leads you already get.
              </p>
              <label className={styles.field}>
                Name this test
                <input
                  required
                  maxLength={160}
                  value={draft.name}
                  onChange={(event) => change({ name: event.target.value })}
                  placeholder="Faster lead follow-up"
                />
              </label>
              <label className={styles.field}>
                How does follow-up work today?
                <textarea
                  required
                  rows={4}
                  maxLength={6000}
                  value={draft.workflowNote}
                  onChange={(event) =>
                    change({ workflowNote: event.target.value })
                  }
                />
              </label>
              <label className={styles.field}>
                Where did this process come from?
                <input
                  required
                  maxLength={2000}
                  value={draft.sourceReference}
                  onChange={(event) =>
                    change({ sourceReference: event.target.value })
                  }
                  placeholder="Process note, call date, or record ID"
                />
                <small>
                  Use a record reference. Keep private customer details out of
                  this field.
                </small>
              </label>
              <label className={styles.field}>
                Your target: increase bookings by how many percentage points?
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  required
                  value={draft.minimumBookingLiftPoints}
                  onChange={(event) =>
                    change({
                      minimumBookingLiftPoints: Number(event.target.value),
                    })
                  }
                />
                <small>This is your test target, not a promised result.</small>
              </label>
              <button type="submit" className={styles.primary}>
                Set up the comparison <ArrowRight size={18} aria-hidden />
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
                What actually happened?
              </h1>
              <p className={styles.lead}>
                Use comparable groups and time periods. Enter totals from your
                records.
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
                          label: "Total workflow cost ($)",
                          whole: false,
                        },
                      ] as const
                    ).map(({ key, label, whole }) => (
                      <label key={key} className={styles.field}>
                        {label}
                        <input
                          required
                          type="number"
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
                      </label>
                    ))}
                    <p className={styles.note}>
                      Count each lead once, even if they booked more than one
                      job.
                    </p>
                    <label className={styles.field}>
                      Evidence reference
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
                      />
                      <small>
                        A reference is recorded here. Its contents still need
                        human verification.
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
                  See my result <ArrowRight size={18} aria-hidden />
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
                {result.label}
              </h1>
              <p className={styles.lead}>{result.summary}</p>
              <div className={styles.resultHero}>
                <span>Change in booking rate</span>
                <strong>
                  {result.metrics.bookingLiftPoints === null
                    ? "Not measured"
                    : `${result.metrics.bookingLiftPoints > 0 ? "+" : ""}${number(result.metrics.bookingLiftPoints)} pp`}
                </strong>
                <p>
                  Percentage points · leads that booked work ÷ leads received
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
                  <dt>Time saved per 100 leads</dt>
                  <dd>
                    {number(result.metrics.minutesSavedPer100Leads)}
                    {result.metrics.minutesSavedPer100Leads !== null && " min"}
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
                        }).format(result.metrics.costDifferencePer100Leads)}
                  </dd>
                </div>
              </dl>
              <div className={styles.nextMove}>
                <h2>Your next move</h2>
                <ul>
                  {result.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p>
                  Before-and-after counts show a direction. They do not prove
                  the workflow caused the change or that a booking became paid
                  work.
                </p>
              </div>
              <details className={styles.details}>
                <summary>See the prepared workflow</summary>
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
                    Estimated additional contribution per 100 leads: $
                    {number(result.metrics.netContributionProxyPer100Leads, 2)}.
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
                    Start my own test <ArrowRight size={18} aria-hidden />
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
                          setMessage("Test saved.");
                        }
                      } catch {
                        setError(
                          "Save failed. Download the report to keep your work.",
                        );
                      }
                    }}
                  >
                    {saving ? "Saving…" : "Save this test"}
                    <Check size={18} aria-hidden />
                  </button>
                )}
                <button className={styles.secondary} onClick={download}>
                  <Download size={17} aria-hidden /> Download report
                </button>
              </div>
              {!demo && (
                <button className={styles.back} onClick={() => advance(2)}>
                  Edit the comparison
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
