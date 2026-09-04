"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./starter-lesson.module.css";

export default function PromptCopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setMessage("Copied. Paste it into your chat.");
    } catch {
      setCopied(false);
      setMessage(
        "Select the prompt text below and copy it with your keyboard or device menu.",
      );
    }
  }

  return (
    <div className={styles.copyControl}>
      <button type="button" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copy again" : label}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
