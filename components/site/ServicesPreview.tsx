"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileCheck2, MessageSquare, UserRound } from "lucide-react";
import styles from "@/app/services/services.module.css";

const EXAMPLES = [
  {
    id: "inquiry",
    label: "A new inquiry",
    icon: UserRound,
    problem: "A quote request comes in. Who answers it?",
    incoming: "Can you quote a driveway wash?",
    title: "An inquiry your team can act on.",
    description:
      "The form creates a customer record and a task for the right person.",
    fields: [
      ["Request", "Driveway cleaning quote"],
      ["Assigned to", "Your estimator"],
      ["Next step", "Review the request and contact the customer"],
    ],
    outputLabel: "WHAT YOUR TEAM SEES",
    output: "New quote request · Ready for review",
    benefit: "The request has a home and someone responsible for the reply.",
    href: "/system/lead-capture",
    cta: "See how lead capture works",
  },
  {
    id: "quote",
    label: "An open quote",
    icon: MessageSquare,
    problem: "You sent the quote. Now it sits in your inbox.",
    incoming: "I’ll look over the quote and get back to you.",
    title: "A reminder and a reply ready to review.",
    description:
      "Keep the quote, conversation, and follow-up date in the same record.",
    fields: [
      ["Status", "Waiting for a customer reply"],
      ["Reminder", "On the date your team chooses"],
      ["Next step", "Review the draft before sending"],
    ],
    outputLabel: "EXAMPLE REPLY DRAFT",
    output:
      "Any questions about your driveway quote? Reply here and I’ll help.",
    benefit:
      "Your team can follow up without trying to remember every open quote.",
    href: "/system/follow-up",
    cta: "See how follow-up works",
  },
  {
    id: "delivery",
    label: "A client update",
    icon: FileCheck2,
    problem: "A customer asks for the same project update again.",
    incoming: "Where can I find the estimate and photos?",
    title: "One place for the customer to check.",
    description:
      "A private client page keeps the agreed files, status, and next action together.",
    fields: [
      ["Project files", "Estimate and photos"],
      ["Status", "Estimate awaiting approval"],
      ["Next step", "Approve the estimate or request a change"],
    ],
    outputLabel: "EXAMPLE CLIENT VIEW",
    output: "Your estimate is ready to review.",
    benefit:
      "The customer can find the update without starting another email thread.",
    href: "/system/delivery",
    cta: "See how client portals work",
  },
];

export default function ServicesPreview() {
  const [selected, setSelected] = useState(EXAMPLES[0].id);
  const example = EXAMPLES.find((item) => item.id === selected) ?? EXAMPLES[0];

  return (
    <div className={styles.preview}>
      <div
        className={styles.exampleChoices}
        aria-label="Choose a business example"
      >
        {EXAMPLES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={selected === id}
            aria-controls="service-example"
            onClick={() => setSelected(id)}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div
        id="service-example"
        className={styles.exampleBody}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={styles.exampleProblem}>
          <span className={styles.exampleLabel}>THE EVERYDAY PROBLEM</span>
          <h3>{example.problem}</h3>
          <blockquote>“{example.incoming}”</blockquote>
          <p>{example.description}</p>
        </div>
        <div className={styles.exampleResult}>
          <span className={styles.exampleLabel}>THE PART WE CAN BUILD</span>
          <h3>{example.title}</h3>
          <dl>
            {example.fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.exampleOutput}>
            <span>{example.outputLabel}</span>
            <p>{example.output}</p>
          </div>
          <p className={styles.exampleBenefit}>{example.benefit}</p>
          <Link href={example.href}>
            {example.cta}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <p className={styles.exampleNote}>
        Illustrative example. Nothing is submitted or sent. Your actual workflow
        is agreed before the build.
      </p>
    </div>
  );
}
