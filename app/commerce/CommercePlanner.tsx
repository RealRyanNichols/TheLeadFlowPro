"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Download } from "lucide-react";
import {
  COMMERCE_PATHS,
  commercePlanText,
  type CommercePath,
} from "@/lib/commercePlanner";
import styles from "./commerce.module.css";

const EXISTING = [
  "Website",
  "Product catalog",
  "Payment account",
  "Customer records",
] as const;

export default function CommercePlanner() {
  const [path, setPath] = useState<CommercePath>("products");
  const [existing, setExisting] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const plan = COMMERCE_PATHS[path];

  function download() {
    const url = URL.createObjectURL(
      new Blob([commercePlanText(path, existing)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-commerce-build-list.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: String(form.get("full_name") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim() || null,
          business_name: String(form.get("business_name") ?? "").trim() || null,
          goals: `COMMERCE BUILD REQUEST: ${plan.label}. Already in place: ${existing.join(", ") || "Starting fresh"}. ${String(form.get("goals") ?? "").trim()}`,
          interest: "custom_platform",
          desired_modules: [...plan.modules],
          sms_consent: false,
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          diagnostic: {
            source: "commerce_planner",
            version: 1,
            selling: path,
            existing,
            owner: "Ryan",
            next_action:
              "Review the commerce build list, verify existing merchant accounts, agree written scope, and confirm the payment and delivery test plan.",
          },
        }),
      });
      if (!response.ok) {
        setError(
          "We could not confirm that your request was saved. Please try again or email hello@theleadflowpro.com.",
        );
        return;
      }
      const result = await response.json();
      if (result.ok !== true) throw new Error("Unconfirmed intake");
      setDone(true);
      try {
        window.fbq?.("track", "Lead", {
          content_name: "commerce_build_request",
        });
      } catch {
        /* Intake is independent of analytics. */
      }
    } catch {
      setError(
        "We could not confirm your request. If you received a confirmation email, it arrived. Otherwise, retry or email hello@theleadflowpro.com.",
      );
    } finally {
      pending.current = false;
      setSending(false);
    }
  }

  return (
    <div className={styles.planner}>
      <fieldset className={styles.choices}>
        <legend>1. What do you want to sell?</legend>
        <div className={styles.choiceGrid}>
          {(Object.keys(COMMERCE_PATHS) as CommercePath[]).map((key) => (
            <label key={key} className={path === key ? styles.selected : ""}>
              <input
                type="radio"
                name="selling"
                checked={path === key}
                onChange={() => setPath(key)}
              />
              {COMMERCE_PATHS[key].label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.plan} aria-live="polite" aria-atomic="true">
        <p className={styles.eyebrow}>YOUR CUSTOMER PATH • PLANNING EXAMPLE</p>
        <h3>{plan.example}</h3>
        <ol className={styles.steps}>
          {plan.steps.map(([title, body], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <h4>{title}</h4>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <div className={styles.toolLinks}>
          {plan.tools.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
      <fieldset className={styles.choices}>
        <legend>2. What do you already have?</legend>
        <p>Keep what works. Leave these unchecked if you are starting fresh.</p>
        <div className={styles.existing}>
          {EXISTING.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={existing.includes(item)}
                onChange={(event) =>
                  setExisting(
                    event.target.checked
                      ? [...existing, item]
                      : existing.filter((value) => value !== item),
                  )
                }
              />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.download}>
        <div>
          <h3>Your build list is ready to save.</h3>
          <p>No signup. A useful outline to review with your team.</p>
        </div>
        <button type="button" className={styles.secondary} onClick={download}>
          <Download size={18} aria-hidden="true" /> Save my build list
        </button>
      </div>
      <div id="build" className={styles.intake}>
        {done ? (
          <div role="status" className={styles.success}>
            <Check size={30} aria-hidden="true" />
            <h3>Your commerce request is saved.</h3>
            <p>
              Ryan receives your build list and contact details. The next step
              is to review your setup and agree a written scope. No payment was
              taken and no accounts were connected.
            </p>
            <Link href="/tools/pro">
              Try a working kit while you wait{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className={styles.eyebrow}>3. WANT HELP CONNECTING IT?</p>
            <h3>Send Ryan your build list.</h3>
            <p>
              Tell us what you sell and where the work gets stuck. This is a
              scope request, with no charge to submit.
            </p>
            <div className={styles.formGrid}>
              <label>
                Your name *
                <input
                  name="full_name"
                  autoComplete="name"
                  required
                  maxLength={200}
                />
              </label>
              <label>
                Email *
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={50}
                />
              </label>
              <label>
                Business name
                <input
                  name="business_name"
                  autoComplete="organization"
                  maxLength={200}
                />
              </label>
            </div>
            <label className={styles.notes}>
              What do you sell, and what needs to work better?
              <textarea
                name="goals"
                rows={3}
                maxLength={1500}
                placeholder="Products, services, or downloads. No passwords or customer details."
              />
            </label>
            <label className={styles.consent}>
              <input type="checkbox" name="marketing_email_consent" /> Email me
              occasional business tools and tips. Optional; unsubscribe any
              time.
            </label>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button disabled={sending} type="submit" className={styles.primary}>
              {sending ? "Saving your request…" : "Send my build list"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <p className={styles.fine}>
              We use these details to respond to your inquiry. No marketing
              texts. <Link href="/privacy">Privacy policy</Link>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
