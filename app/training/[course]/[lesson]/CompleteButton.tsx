"use client";

import { Check, Circle } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../../training.module.css";

export default function CompleteButton({
  lessonId,
  initiallyDone,
}: {
  lessonId: string;
  initiallyDone: boolean;
}) {
  const [done, setDone] = useState(initiallyDone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Log in to update lesson progress.");
      setBusy(false);
      return;
    }

    if (done) {
      const { error } = await supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
      if (error) {
        setMessage("Progress could not be updated. Please try again.");
      } else {
        setDone(false);
        setMessage("Lesson returned to in progress.");
      }
    } else {
      const { error } = await supabase
        .from("lesson_progress")
        .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
      if (error) {
        setMessage("Progress could not be updated. Please try again.");
      } else {
        setDone(true);
        setMessage("Lesson marked complete.");
      }
    }
    setBusy(false);
  }

  return (
    <div className={styles.completeAction}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={done}
        className={`${styles.completeButton}${done ? ` ${styles.isComplete}` : ""}`}
      >
        {done ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
        {busy ? "Saving..." : done ? "Completed. Undo" : "Mark lesson complete"}
      </button>
      <p className={styles.completeMessage} aria-live="polite">
        {message}
      </p>
    </div>
  );
}
