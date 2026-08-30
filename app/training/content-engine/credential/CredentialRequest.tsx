"use client";

import { FormEvent, useState } from "react";
import styles from "../../training.module.css";

export default function CredentialRequest({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/training/credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerName: name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The completion letter could not be issued.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The completion letter could not be issued.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.credentialRequest} onSubmit={submit}>
      <label htmlFor="learner-name">Name to print on the completion letter</label>
      <input id="learner-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={200} />
      <button type="submit" disabled={busy}>{busy ? "Checking your record..." : "Verify record and issue letter"}</button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}
