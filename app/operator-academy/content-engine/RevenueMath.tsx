"use client";

import { ArrowRight, Calculator, DollarSign, MousePointerClick, Target, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { estimateContentRevenue } from "@/lib/contentEngineMath";
import styles from "./page.module.css";

const STAGES = [
  {
    id: "stage-content",
    icon: Video,
    label: "Plan the message",
    output: "Answer one question your customer already asks",
    detail: "Use ChatGPT to turn what you know into a clear topic and a script you can read out loud without sounding like a robot.",
    example: "You leave with something useful to say.",
  },
  {
    id: "stage-attention",
    icon: MousePointerClick,
    label: "Record and post it",
    output: "Put the answer where your customer already looks",
    detail: "Record on your phone or computer, make the edit as simple as it needs to be, and post it to your website, social media, or both.",
    example: "The right people get a chance to see it.",
  },
  {
    id: "stage-action",
    icon: Target,
    label: "Give one next step",
    output: "Tell the viewer exactly what to do next",
    detail: "Send the interested person to one page, phone number, form, article, appointment, or checkout instead of leaving them at a dead end.",
    example: "The customer knows where to go.",
  },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function valueOf(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export default function RevenueMath() {
  const [qualifiedViews, setQualifiedViews] = useState(5000);
  const [visitRatePercent, setVisitRatePercent] = useState(2);
  const [buyerRatePercent, setBuyerRatePercent] = useState(5);
  const [orderValue, setOrderValue] = useState(127);
  const result = useMemo(
    () => estimateContentRevenue({ qualifiedViews, visitRatePercent, buyerRatePercent, orderValue }),
    [qualifiedViews, visitRatePercent, buyerRatePercent, orderValue],
  );

  return (
    <section className={styles.economicsSection} id="content-math">
      <div className={styles.shell}>
        <div className={styles.economicsHead}>
          <div>
            <p className={styles.eyebrow}>What the three words actually mean</p>
            <h2>Say something useful. Get it seen. Give the customer a next step.</h2>
          </div>
          <p>
            That is Content, Attention, and Action in plain English. Click one of the three words above
            and it lands here so you can see the job that part of the system does.
          </p>
        </div>

        <div className={styles.stageGrid}>
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <article id={stage.id} key={stage.id}>
                <div className={styles.stageTopline}>
                  <span>0{index + 1}</span>
                  <Icon aria-hidden="true" />
                </div>
                <h3>{stage.label}</h3>
                <strong>{stage.output}</strong>
                <p>{stage.detail}</p>
                <small className={styles.stageExample}>{stage.example}</small>
              </article>
            );
          })}
        </div>

        <div className={styles.roundDefinition} aria-label="One ten video recording round">
          <strong>ONE ROUND OF CONTENT</strong>
          <span>Plan 10 videos</span><ArrowRight aria-hidden="true" />
          <span>Record them together</span><ArrowRight aria-hidden="true" />
          <span>Post them</span><ArrowRight aria-hidden="true" />
          <span>Add up what happened</span>
        </div>

        <div className={styles.mathCard}>
          <div className={styles.mathIntro}>
            <Calculator aria-hidden="true" />
            <p className={styles.eyebrow}>Try a simple ten video example</p>
            <h3>See how views can become page visits, buyers, and revenue.</h3>
            <p>This does not predict your result. It shows the path so you know which numbers to watch.</p>
          </div>

          <div className={styles.mathInputs}>
            <label>
              <b>1</b>
              <span>Views across all 10 videos</span>
              <small>Add together the views from the whole round.</small>
              <input min="0" step="500" type="number" value={qualifiedViews} onChange={(event) => setQualifiedViews(valueOf(event.target.value))} />
            </label>
            <label>
              <b>2</b>
              <span>Viewers who click your page</span>
              <small>Two out of every 100 viewers means 2 percent.</small>
              <div><input min="0" max="100" step="0.1" type="number" value={visitRatePercent} onChange={(event) => setVisitRatePercent(valueOf(event.target.value))} /><small>%</small></div>
            </label>
            <label>
              <b>3</b>
              <span>Page visitors who buy</span>
              <small>Five out of every 100 page visitors means 5 percent.</small>
              <div><input min="0" max="100" step="0.1" type="number" value={buyerRatePercent} onChange={(event) => setBuyerRatePercent(valueOf(event.target.value))} /><small>%</small></div>
            </label>
            <label>
              <b>4</b>
              <span>Money from one sale</span>
              <small>Enter what the product or average customer purchase costs.</small>
              <div><small>$</small><input min="0" step="1" type="number" value={orderValue} onChange={(event) => setOrderValue(valueOf(event.target.value))} /></div>
            </label>
          </div>

          <div className={styles.mathResult} aria-live="polite">
            <span>EXAMPLE PLANNING RESULT</span>
            <div>
              <p><strong>{Math.round(qualifiedViews).toLocaleString()}</strong><small>views across 10 videos</small></p>
              <i />
              <p><strong>{Math.round(result.pageVisits).toLocaleString()}</strong><small>possible page visits</small></p>
              <i />
              <p><strong>{result.buyers.toFixed(1)}</strong><small>possible buyers</small></p>
            </div>
            <p className={styles.revenueResult}><DollarSign aria-hidden="true" /><strong>{money.format(result.revenue)}</strong><small>possible revenue in this example</small></p>
            <p className={styles.mathSentence}>
              If the ten videos receive {Math.round(qualifiedViews).toLocaleString()} total views, and {visitRatePercent}% visit your page,
              about {Math.round(result.pageVisits).toLocaleString()} people reach the page. If {buyerRatePercent}% buy at {money.format(orderValue)},
              that is {result.buyers.toFixed(1)} possible buyers and {money.format(result.revenue)} in possible revenue.
            </p>
            <p>
              Planning scenario only. This is not a revenue or conversion guarantee. Your market,
              offer, traffic quality, proof, and execution determine the actual result.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
