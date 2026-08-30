"use client";

import { Calculator, DollarSign, MousePointerClick, Target, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { estimateContentRevenue } from "@/lib/contentEngineMath";
import styles from "./page.module.css";

const STAGES = [
  {
    id: "stage-content",
    icon: Video,
    label: "Content",
    output: "30 topics and 10 scripts",
    detail: "Give the right person a useful reason to stop, listen, and remember you.",
  },
  {
    id: "stage-attention",
    icon: MousePointerClick,
    label: "Attention",
    output: "A repeatable publishing batch",
    detail: "Put useful videos where your buyer already spends time, then measure the response.",
  },
  {
    id: "stage-action",
    icon: Target,
    label: "Action",
    output: "One owned destination",
    detail: "Send qualified viewers to one page, form, or checkout with one clear next move.",
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
            <p className={styles.eyebrow}>How the engine can create value</p>
            <h2>Content is not the money. It builds the route to the money.</h2>
          </div>
          <p>
            Click any stage in the course graphic above and this is where it leads. The system connects
            something worth watching to an owned place where a qualified buyer can act.
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
              </article>
            );
          })}
        </div>

        <div className={styles.mathCard}>
          <div className={styles.mathIntro}>
            <Calculator aria-hidden="true" />
            <p className={styles.eyebrow}>Run your own scenario</p>
            <h3>What could one content batch be worth?</h3>
            <p>Change the four assumptions. The math updates immediately.</p>
          </div>

          <div className={styles.mathInputs}>
            <label>
              <span>Qualified video views</span>
              <input min="0" step="500" type="number" value={qualifiedViews} onChange={(event) => setQualifiedViews(valueOf(event.target.value))} />
            </label>
            <label>
              <span>Visit your page</span>
              <div><input min="0" max="100" step="0.1" type="number" value={visitRatePercent} onChange={(event) => setVisitRatePercent(valueOf(event.target.value))} /><small>%</small></div>
            </label>
            <label>
              <span>Page visitors who buy</span>
              <div><input min="0" max="100" step="0.1" type="number" value={buyerRatePercent} onChange={(event) => setBuyerRatePercent(valueOf(event.target.value))} /><small>%</small></div>
            </label>
            <label>
              <span>Average order value</span>
              <div><small>$</small><input min="0" step="1" type="number" value={orderValue} onChange={(event) => setOrderValue(valueOf(event.target.value))} /></div>
            </label>
          </div>

          <div className={styles.mathResult} aria-live="polite">
            <span>EXAMPLE PLANNING RESULT</span>
            <div>
              <p><strong>{Math.round(result.pageVisits).toLocaleString()}</strong><small>page visits</small></p>
              <i />
              <p><strong>{result.buyers.toFixed(1)}</strong><small>possible buyers</small></p>
              <i />
              <p className={styles.revenueResult}><DollarSign aria-hidden="true" /><strong>{money.format(result.revenue)}</strong><small>possible revenue</small></p>
            </div>
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
