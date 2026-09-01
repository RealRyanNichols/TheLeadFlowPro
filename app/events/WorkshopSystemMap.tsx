"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import styles from "./WorkshopSystemMap.module.css";

const PATHS = [
  {
    key: "attention",
    label: "Attention",
    problem: "People see the business but do not know the next step.",
    build: "Turn one message into a clear offer and call to action.",
  },
  {
    key: "offer",
    label: "Offer",
    problem: "The service is real, but the value is hard to explain.",
    build: "Build an operator brief that turns the service into a specific offer.",
  },
  {
    key: "page",
    label: "Page",
    problem: "Traffic lands on a page that does not guide the buyer.",
    build: "Map the headline, proof, action, form, and confirmation path.",
  },
  {
    key: "followup",
    label: "Follow-up",
    problem: "Calls, forms, comments, and DMs are not worked consistently.",
    build: "Write a fast, human follow-up sequence and ownership map.",
  },
  {
    key: "operations",
    label: "Operations",
    problem: "Too many tabs, notes, and repeated tasks slow the owner down.",
    build: "Choose one repeatable task and turn it into a controlled workflow.",
  },
] as const;

export default function WorkshopSystemMap() {
  const [active, setActive] = useState<(typeof PATHS)[number]>(PATHS[3]);

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <span>LIVE SYSTEM PREVIEW</span>
        <strong>Where is your business leaking time or opportunity?</strong>
        <p>Choose one area. This is the kind of bottleneck Ryan will help the room map.</p>
      </div>
      <div className={styles.choices} role="tablist" aria-label="Business bottleneck">
        {PATHS.map((path) => (
          <button
            type="button"
            role="tab"
            aria-selected={active.key === path.key}
            key={path.key}
            onClick={() => setActive(path)}
          >
            <span>{String(PATHS.indexOf(path) + 1).padStart(2, "0")}</span>
            {path.label}
          </button>
        ))}
      </div>
      <div className={styles.flow}>
        <article>
          <small>CURRENT BOTTLENECK</small>
          <h3>{active.label}</h3>
          <p>{active.problem}</p>
        </article>
        <ArrowRight aria-hidden="true" />
        <article className={styles.operator}>
          <small>OPERATOR BRIEF</small>
          <h3>Goal + context + constraints</h3>
          <p>ChatGPT gets a specific job, the real business facts, and a clear definition of done.</p>
        </article>
        <ArrowRight aria-hidden="true" />
        <article className={styles.result}>
          <small>FIRST USEFUL BUILD</small>
          <h3><CheckCircle2 aria-hidden="true" /> Clear next move</h3>
          <p>{active.build}</p>
        </article>
      </div>
      <p className={styles.note}>The workshop teaches the framework. Your Next Move card tells you what to work on first after class.</p>
    </div>
  );
}
