"use client";

// The homepage qualifier. One question at a time, two giant buttons, one
// direction. The first "no" is the qualification: the visitor goes straight to
// the result panel and the free website application. Answers travel to
// /free-build as query params so the application records them with the lead.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/contactInfo";

const QUESTIONS = [
  { key: "leads", text: "Are you getting enough leads?" },
  { key: "money", text: "Are you making enough money?" },
  { key: "social", text: "Is your social media doing what you wanted?" },
  { key: "website", text: "Is your website doing what you wanted?" },
] as const;

type QuestionKey = (typeof QUESTIONS)[number]["key"];

export default function LeadQualifier() {
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, "yes" | "no">>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<"qualified" | "covered" | null>(null);

  function answer(value: "yes" | "no") {
    const question = QUESTIONS[index];
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    track("qualifier_answer", { label: `${question.key}:${value}` });

    if (value === "no") {
      setResult("qualified");
      track("qualifier_result", { label: "qualified" });
      try {
        window.fbq?.("trackCustom", "QualifierQualified", next);
      } catch {
        /* tracking must never block the flow */
      }
      return;
    }
    if (index + 1 >= QUESTIONS.length) {
      setResult("covered");
      track("qualifier_result", { label: "all_yes" });
      return;
    }
    setIndex(index + 1);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setResult(null);
  }

  function applyHref() {
    const params = new URLSearchParams({ utm_source: "website", utm_medium: "qualifier" });
    for (const [key, value] of Object.entries(answers)) params.set(`q_${key}`, value);
    return `/free-build?${params.toString()}`;
  }

  if (result) {
    const qualified = result === "qualified";
    return (
      <div className="lfp-qualifier" aria-live="polite">
        <div className="lfp-qualifier-result">
          <p className="lfp-qualifier-step">{qualified ? "That settles it" : "All four covered"}</p>
          <h3>{qualified ? "You qualify." : "You are in good shape."}</h3>
          <p className="lfp-qualifier-copy">
            {qualified
              ? "Zero dollars down. Start your FREE WEBSITE. Five pages, built for you, in accounts you own."
              : "If you ever want a website you own instead of one you rent, the free build is open to you too."}
          </p>
          <div className="lfp-qualifier-actions">
            <Link className="cb-btn cb-btn--primary lfp-qualifier-cta" href={applyHref()} data-analytics="cta-qualifier-free-build">
              Start My Free Website
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
            <a className="cb-btn cb-btn--ghost lfp-qualifier-cta" href={PHONE_TEL}>
              <Phone aria-hidden="true" className="h-5 w-5" />
              Call or text {PHONE_DISPLAY}
            </a>
          </div>
          <button type="button" className="lfp-qualifier-restart" onClick={restart}>
            Start the questions over
          </button>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[index];
  return (
    <div className="lfp-qualifier">
      <p className="lfp-qualifier-step">
        Question {index + 1} of {QUESTIONS.length}
      </p>
      <h3 className="lfp-qualifier-question">{question.text}</h3>
      <div className="lfp-qualifier-buttons">
        <button type="button" className="lfp-qualifier-yes" onClick={() => answer("yes")}>
          Yes
        </button>
        <button type="button" className="lfp-qualifier-no" onClick={() => answer("no")}>
          No
        </button>
      </div>
      <p className="lfp-qualifier-hint">One honest answer per question. A single no is all it takes to qualify.</p>
    </div>
  );
}
