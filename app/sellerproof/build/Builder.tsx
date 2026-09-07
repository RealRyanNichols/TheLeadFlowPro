"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  DISCLAIMER,
  EVIDENCE_TYPES,
  PLATFORMS,
  PRODUCT_TYPES,
  PROVIDER_GUIDES,
  REASONS,
  REVIEW_ITEMS,
  SELLERPROOF,
  containsCardData,
  emptyPacket,
  evidenceChecklist,
  packetGaps,
  parsePacket,
  purchaseErrors,
  responseDraft,
  type Packet,
} from "@/lib/sellerproof/packet";
import styles from "../sellerproof.module.css";

const STORAGE = "lfp:sellerproof:draft:v1";
const PENDING = "lfp:sellerproof:pending-session";
type Entitlement = { packetId: string; recoveryKey: string };
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function api(path: string, body: unknown) {
  const r = await fetch(`/api/sellerproof/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export default function Builder() {
  const [packet, setPacket] = useState<Packet | null>(null);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [access, setAccess] = useState<Entitlement | null>(null);
  const [confirmations, setConfirmations] = useState(
    REVIEW_ITEMS.map(() => false),
  );
  const [html, setHtml] = useState("");
  const [receiptKey, setReceiptKey] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const initialized = useRef(false);
  const owned = !!packet && access?.packetId === packet.id;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    // Remove the checkout credential before further navigation or analytics.
    window.history.replaceState(null, "", "/sellerproof/build");
    let recovered: Entitlement | null = null;
    try {
      if (sessionId) sessionStorage.setItem(PENDING, sessionId);
      const saved = sessionStorage.getItem(STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPacket(parsePacket(parsed.packet));
        recovered = parsed.access ?? null;
      } else setPacket(emptyPacket(crypto.randomUUID()));
    } catch {
      setPacket(emptyPacket(crypto.randomUUID()));
      setMessage(
        "This browser could not restore the draft. Import your backup if you have one.",
      );
    }
    if (params.has("cancelled"))
      setMessage("Checkout was canceled. Your draft is still here.");
    const pending =
      sessionId ||
      (() => {
        try {
          return sessionStorage.getItem(PENDING);
        } catch {
          return null;
        }
      })();
    setBusy("Checking access");
    api("access", {
      ...(pending ? { sessionId: pending } : {}),
      ...(recovered?.recoveryKey ? { recoveryKey: recovered.recoveryKey } : {}),
    })
      .then((data) => {
        if (data.unlocked) {
          setAccess({ packetId: data.packetId, recoveryKey: data.recoveryKey });
          setStep(2);
          setMessage(
            "Payment verified. Review this packet, then export it. Download a private backup to restore access later.",
          );
          try {
            sessionStorage.removeItem(PENDING);
          } catch {
            /* access still works through cookie */
          }
        }
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setBusy(""));
  }, []);

  useEffect(() => {
    if (!packet || containsCardData(JSON.stringify(packet))) return;
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify({ packet, access }));
    } catch {
      setMessage(
        "This browser cannot save your draft. Download a private backup before leaving this page or opening checkout.",
      );
    }
  }, [packet, access]);

  function update<K extends keyof Packet>(key: K, value: Packet[K]) {
    setPacket((p) => (p ? { ...p, [key]: value } : p));
    setHtml("");
    setConfirmations(REVIEW_ITEMS.map(() => false));
  }
  function backup() {
    if (!packet) return;
    try {
      const valid = parsePacket(packet);
      download(
        `sellerproof-${packet.id}.json`,
        JSON.stringify(
          { version: 1, packet: valid, access: owned ? access : null },
          null,
          2,
        ),
        "application/json",
      );
      setMessage(
        "Private backup downloaded. It contains your entered evidence and purchase access, if unlocked. Keep it secure.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function restore(file: File) {
    setBusy("Restoring backup");
    setMessage("");
    try {
      if (file.size > 300000)
        throw new Error("Choose a SellerProof backup under 300 KB.");
      const data = JSON.parse(await file.text());
      const restored = parsePacket(data.packet);
      setPacket(restored);
      setAccess(null);
      setHtml("");
      setConfirmations(REVIEW_ITEMS.map(() => false));
      if (data.access?.recoveryKey) {
        const result = await api("access", {
          recoveryKey: data.access.recoveryKey,
        });
        if (result.unlocked && result.packetId === restored.id)
          setAccess({
            packetId: result.packetId,
            recoveryKey: result.recoveryKey,
          });
      }
      setMessage("Backup restored. Review your details before continuing.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function checkout() {
    if (!packet) return;
    setBusy("Opening secure checkout");
    setMessage("");
    try {
      const valid = parsePacket(packet);
      const errors = purchaseErrors(valid);
      if (errors.length) throw new Error(errors.join(" "));
      // Checkout returns to the same tab. Refuse to take payment if the draft cannot survive it.
      sessionStorage.setItem(
        STORAGE,
        JSON.stringify({ packet: valid, access }),
      );
      const result = await api("checkout", { packet: valid });
      window.location.assign(result.url);
    } catch (e) {
      setMessage((e as Error).message);
      setBusy("");
    }
  }
  async function exportPacket() {
    if (!packet) return;
    setBusy("Preparing your packet");
    setMessage("");
    try {
      const result = await api("export", {
        packet: parsePacket(packet),
        confirmations,
      });
      setHtml(result.html);
      download(`sellerproof-${packet.id}.html`, result.html, "text/html");
      setMessage(
        "Your printable packet downloaded. Open it and use Print → Save as PDF. Attach the original evidence files separately in your provider dashboard.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function restoreReceipt() {
    if (!packet) return;
    setBusy("Restoring purchase");
    setMessage("");
    try {
      const result = await api("access", {
        recoveryKey: receiptKey.trim(),
        packet: parsePacket(packet),
      });
      if (!result.unlocked)
        throw new Error(
          "No valid purchase was found. Check the recovery key in your receipt.",
        );
      setPacket({ ...packet, id: result.packetId });
      setAccess({ packetId: result.packetId, recoveryKey: result.recoveryKey });
      setReceiptKey("");
      setMessage(
        "Purchase restored for this dispute. You can add the evidence again or restore its private backup.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function clearDraft() {
    if (
      !window.confirm(
        "Clear this draft from this tab? Download your private backup first. This will not refund a purchase or delete a backup you already downloaded.",
      )
    )
      return;
    try {
      sessionStorage.removeItem(STORAGE);
      sessionStorage.removeItem(PENDING);
    } catch {
      /* no persistence */
    }
    setPacket(emptyPacket(crypto.randomUUID()));
    setAccess(null);
    setHtml("");
    setConfirmations(REVIEW_ITEMS.map(() => false));
    setStep(0);
    setMessage(
      "Draft cleared from this tab. Downloaded files remain on your device.",
    );
  }
  if (!packet)
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p role="status">Opening your private workspace…</p>
        </div>
      </main>
    );
  const gaps = packetGaps(packet);
  const sensitive = containsCardData(JSON.stringify(packet));
  const identityLocked = owned || !!busy;
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/sellerproof" className={styles.wordmark}>
            <ShieldCheck aria-hidden="true" />
            Seller<span>Proof</span>
          </Link>
          <span>by The LeadFlow Pro</span>
        </div>
        <div className={styles.workspaceHeader}>
          <div>
            <p className={styles.eyebrow}>YOUR EVIDENCE WORKSPACE</p>
            <h1>Make the record easy to follow.</h1>
            <p>
              Start with what you know. Flag what is missing. Review it before
              you submit.
            </p>
          </div>
          <span className={styles.badge}>
            {owned ? "Payment verified" : "Free preview · $49 to export"}
          </span>
        </div>
        <div className={styles.privacyNote}>
          <ShieldCheck aria-hidden="true" />
          <p>
            Your draft stays in this browser tab. Download a private backup
            before closing it. Checkout and export process your entries securely
            on our server; evidence is not stored in our database. Original
            files stay on your device.{" "}
            <Link href="/sellerproof/privacy">Data details</Link>
          </p>
        </div>
        <div className={styles.toolbar}>
          <button type="button" onClick={backup} disabled={!!busy || sensitive}>
            <Download size={16} aria-hidden="true" />
            Save private backup
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
          >
            Restore backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            aria-label="Restore SellerProof backup"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void restore(file);
            }}
          />
          <button type="button" onClick={clearDraft} disabled={!!busy}>
            <Trash2 size={16} aria-hidden="true" />
            Clear draft
          </button>
        </div>
        {!owned && (
          <details className={styles.entry}>
            <summary>Already purchased? Restore from your receipt</summary>
            <p className={styles.fine}>
              Enter the same provider, order reference, dispute reference,
              amount, and currency in step 1. Then paste the recovery key from
              your SellerProof receipt. Your evidence is not stored on our
              server; restore your private backup or enter it again.
            </p>
            <label className={styles.statement}>
              Purchase recovery key
              <textarea
                value={receiptKey}
                onChange={(e) => setReceiptKey(e.target.value)}
                maxLength={2048}
                rows={2}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className={styles.secondary}
              disabled={!!busy || !receiptKey.trim()}
              onClick={() => void restoreReceipt()}
            >
              Restore this purchase
            </button>
          </details>
        )}
        {message && (
          <p className={styles.notice} role="status">
            {message}
          </p>
        )}
        {sensitive && (
          <p className={styles.error} role="alert">
            Possible card data detected. Remove full card numbers or security
            codes. Saving and checkout are paused.
          </p>
        )}
        <nav className={styles.steps} aria-label="Packet steps">
          {["Dispute details", "Evidence & timeline", "Review & export"].map(
            (label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                aria-current={step === i ? "step" : undefined}
              >
                <span>{i + 1}</span>
                {label}
              </button>
            ),
          )}
        </nav>
        {step === 0 && (
          <section className={styles.panel} aria-labelledby="dispute-heading">
            <h2 id="dispute-heading">What payment is being disputed?</h2>
            <p>
              Copy the references and deadline from your provider dashboard. The
              amount below is the disputed payment; SellerProof costs $49 once.
            </p>
            <div className={styles.fields}>
              <label>
                Business name
                <input
                  value={packet.business}
                  maxLength={160}
                  onChange={(e) => update("business", e.target.value)}
                  autoComplete="organization"
                />
              </label>
              <label>
                Payment provider
                <select
                  value={packet.platform}
                  disabled={identityLocked}
                  onChange={(e) =>
                    update("platform", e.target.value as Packet["platform"])
                  }
                >
                  {PLATFORMS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Dispute reason
                <select
                  value={packet.reason}
                  onChange={(e) =>
                    update("reason", e.target.value as Packet["reason"])
                  }
                >
                  {REASONS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                What you sold
                <select
                  value={packet.productType}
                  onChange={(e) =>
                    update(
                      "productType",
                      e.target.value as Packet["productType"],
                    )
                  }
                >
                  {PRODUCT_TYPES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Order or payment reference
                <input
                  value={packet.orderId}
                  maxLength={160}
                  disabled={identityLocked}
                  onChange={(e) => update("orderId", e.target.value)}
                  placeholder="From your order or payment record"
                />
              </label>
              <label>
                Processor dispute reference
                <input
                  value={packet.disputeId}
                  maxLength={160}
                  disabled={identityLocked}
                  onChange={(e) => update("disputeId", e.target.value)}
                  placeholder="From your dispute dashboard"
                />
              </label>
              <label>
                Disputed amount
                <input
                  value={packet.amount}
                  maxLength={14}
                  inputMode="decimal"
                  disabled={identityLocked}
                  onChange={(e) => update("amount", e.target.value)}
                  placeholder="149.00"
                />
              </label>
              <label>
                Currency
                <input
                  value={packet.currency}
                  maxLength={3}
                  disabled={identityLocked}
                  onChange={(e) =>
                    update("currency", e.target.value.toUpperCase())
                  }
                  placeholder="USD"
                />
              </label>
              <label>
                Provider response deadline
                <input
                  type="date"
                  value={packet.deadline}
                  onInput={(e) => update("deadline", e.currentTarget.value)}
                  onChange={(e) => update("deadline", e.target.value)}
                />
                <small>
                  Confirm the exact time and time zone in your dashboard. No
                  automatic reminders are sent.
                </small>
              </label>
              <label className={styles.full}>
                Product or service description
                <textarea
                  value={packet.description}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What was purchased, and what was included?"
                />
              </label>
            </div>
            {owned && (
              <p className={styles.fine}>
                This purchase covers the payment references and amount above.
                You can keep improving the statement, evidence, and timeline for
                this dispute.
              </p>
            )}
            <button
              type="button"
              className={styles.primary}
              onClick={() => setStep(1)}
            >
              Add your evidence <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        )}
        {step === 1 && (
          <section className={styles.panel} aria-labelledby="evidence-heading">
            <h2 id="evidence-heading">Identify the records you can support.</h2>
            <p>
              Describe what each source actually shows. A filename is a reminder
              to attach the original yourself; it is not an uploaded file.
            </p>
            <div className={styles.checklist}>
              {evidenceChecklist(packet).map((e) => (
                <div key={e.type}>
                  <span
                    className={e.present ? styles.checked : styles.unchecked}
                  >
                    {e.present ? <Check size={16} aria-hidden="true" /> : "?"}
                  </span>
                  <p>
                    <strong>{e.type}</strong>
                    <br />
                    {e.why}
                    <br />
                    <small>
                      {e.present
                        ? "Described by you; source not verified"
                        : "Not yet described"}
                    </small>
                  </p>
                </div>
              ))}
            </div>
            <h3>Evidence index</h3>
            {packet.evidence.map((e, i) => (
              <fieldset className={styles.entry} key={i}>
                <legend>Evidence E{i + 1}</legend>
                <div className={styles.fields}>
                  <label>
                    Evidence type
                    <select
                      value={e.type}
                      onChange={(ev) =>
                        update(
                          "evidence",
                          packet.evidence.map((x, n) =>
                            n === i
                              ? { ...x, type: ev.target.value as typeof e.type }
                              : x,
                          ),
                        )
                      }
                    >
                      {EVIDENCE_TYPES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  {(
                    [
                      ["title", "Source title", 200],
                      ["fileName", "Original filename (optional)", 240],
                      ["date", "Source date (optional)", 10],
                    ] as const
                  ).map(([key, label, max]) => (
                    <label key={key}>
                      {label}
                      <input
                        type={key === "date" ? "date" : "text"}
                        value={e[key]}
                        maxLength={max}
                        onInput={
                          key === "date"
                            ? (ev) =>
                                update(
                                  "evidence",
                                  packet.evidence.map((x, n) =>
                                    n === i
                                      ? { ...x, date: ev.currentTarget.value }
                                      : x,
                                  ),
                                )
                            : undefined
                        }
                        onChange={(ev) =>
                          update(
                            "evidence",
                            packet.evidence.map((x, n) =>
                              n === i ? { ...x, [key]: ev.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label className={styles.full}>
                    What this source shows
                    <textarea
                      rows={3}
                      value={e.note}
                      maxLength={5000}
                      placeholder="A factual summary or relevant excerpt. Include limitations and context."
                      onChange={(ev) =>
                        update(
                          "evidence",
                          packet.evidence.map((x, n) =>
                            n === i ? { ...x, note: ev.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "evidence",
                      packet.evidence.filter((_, n) => i !== n),
                    )
                  }
                >
                  Remove E{i + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className={styles.secondary}
              disabled={packet.evidence.length >= 40}
              onClick={() =>
                update("evidence", [
                  ...packet.evidence,
                  {
                    type: "Receipt",
                    title: "",
                    fileName: "",
                    date: "",
                    note: "",
                  },
                ])
              }
            >
              <Plus size={17} aria-hidden="true" />
              Add evidence item
            </button>
            <h3>Timeline</h3>
            <p>
              Add the purchase, fulfillment, customer contact, cancellation, or
              refund events you can document.
            </p>
            {packet.events.map((e, i) => (
              <fieldset className={styles.entry} key={i}>
                <legend>Event {i + 1}</legend>
                <div className={styles.fields}>
                  {(
                    [
                      ["date", "Event date"],
                      ["source", "Source or evidence number"],
                      ["description", "What happened"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className={key === "description" ? styles.full : ""}
                    >
                      {label}
                      <input
                        type={key === "date" ? "date" : "text"}
                        value={e[key]}
                        onInput={
                          key === "date"
                            ? (ev) =>
                                update(
                                  "events",
                                  packet.events.map((x, n) =>
                                    n === i
                                      ? { ...x, date: ev.currentTarget.value }
                                      : x,
                                  ),
                                )
                            : undefined
                        }
                        maxLength={
                          key === "description"
                            ? 1000
                            : key === "source"
                              ? 300
                              : 10
                        }
                        onChange={(ev) =>
                          update(
                            "events",
                            packet.events.map((x, n) =>
                              n === i ? { ...x, [key]: ev.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "events",
                      packet.events.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove event {i + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className={styles.secondary}
              disabled={packet.events.length >= 30}
              onClick={() =>
                update("events", [
                  ...packet.events,
                  { date: "", description: "", source: "" },
                ])
              }
            >
              <Plus size={17} aria-hidden="true" />
              Add timeline event
            </button>
            <label className={styles.statement}>
              Your explanation
              <textarea
                rows={6}
                maxLength={10000}
                value={packet.statement}
                onChange={(e) => update("statement", e.target.value)}
                placeholder="Explain your response to the dispute. Point to the evidence numbers. Leave out assumptions about motives or identity."
              />
            </label>
            <button
              type="button"
              className={styles.primary}
              onClick={() => setStep(2)}
            >
              Review your packet <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        )}
        {step === 2 && (
          <div className={styles.reviewGrid}>
            <section className={styles.panel} aria-labelledby="review-heading">
              <h2 id="review-heading">Read it as the reviewer would.</h2>
              <p>
                This draft uses only your entries. It does not verify the
                evidence or predict the result.
              </p>
              <pre className={styles.draft}>{responseDraft(packet)}</pre>
              {PROVIDER_GUIDES[packet.platform] && (
                <a
                  href={PROVIDER_GUIDES[packet.platform]}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.textlink}
                >
                  Read {packet.platform}'s current dispute instructions ↗
                </a>
              )}
              <p className={styles.fine}>
                For PayPal or another provider, use the instructions in the
                dispute's resolution dashboard.
              </p>
            </section>
            <aside className={styles.panel}>
              <h2>Before the deadline</h2>
              <p>
                <strong>
                  {gaps.length
                    ? `${gaps.length} items to review`
                    : "No gaps detected by this checklist"}
                </strong>
                <br />
                This is a preparation check, not evidence verification.
              </p>
              {gaps.length > 0 && (
                <ul className={styles.gaps}>
                  {gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              )}
              <div className={styles.price}>
                <span>${SELLERPROOF.priceCents / 100}</span>
                <p>
                  one dispute packet
                  <br />
                  one payment · no subscription
                </p>
              </div>
              <p>
                You receive the response draft, timeline, evidence index,
                missing-evidence notes, and a printable document you can save as
                PDF.
              </p>
              <p className={styles.fine}>
                Original files are not attached or merged. You add them in your
                provider dashboard. This is a separate product from LeadFlow Pro
                Kits.
              </p>
              {owned ? (
                <>
                  <div className={styles.confirmations}>
                    {REVIEW_ITEMS.map((item, i) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={confirmations[i]}
                          onChange={(e) => {
                            setConfirmations((p) =>
                              p.map((x, n) => (n === i ? e.target.checked : x)),
                            );
                            setHtml("");
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => void exportPacket()}
                    disabled={
                      !!busy || sensitive || !confirmations.every(Boolean)
                    }
                  >
                    <Download size={18} aria-hidden="true" />
                    {busy || "Download printable packet"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={backup}
                  >
                    Save backup with purchase access
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => void checkout()}
                    disabled={!!busy || sensitive}
                  >
                    {busy || "Unlock this packet for $49"}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <p className={styles.fine}>
                    By purchasing, you agree to the{" "}
                    <Link href="/sellerproof/terms">SellerProof terms</Link> and{" "}
                    <Link href="/sellerproof/privacy">privacy details</Link>.
                  </p>
                </>
              )}
              <p className={styles.fine}>{DISCLAIMER}</p>
            </aside>
          </div>
        )}
        {html && (
          <section className={styles.panel}>
            <h2>
              <FileText aria-hidden="true" />
              Your printable packet
            </h2>
            <button
              type="button"
              className={styles.primary}
              onClick={() => frame.current?.contentWindow?.print()}
            >
              Print / Save as PDF
            </button>
            <iframe
              ref={frame}
              srcDoc={html}
              title="Paid evidence packet preview"
              sandbox="allow-same-origin allow-modals"
              className={styles.packetFrame}
            />
          </section>
        )}
        <p className={styles.support}>
          Need help with access?{" "}
          <Link href="/contact">Contact The LeadFlow Pro</Link> with your
          payment receipt. Do not send raw evidence or card details through the
          contact form.
        </p>
      </div>
    </main>
  );
}
