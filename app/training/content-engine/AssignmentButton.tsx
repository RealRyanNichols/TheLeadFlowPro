"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "../training.module.css";

export default function AssignmentButton({ lessonId, initiallyDone }: { lessonId: string; initiallyDone: boolean }) {
  const [done, setDone] = useState(initiallyDone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Log in to save the assignment."); setBusy(false); return; }
    const result = done
      ? await supabase.from("course_assignment_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId)
      : await supabase.from("course_assignment_progress").upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
    if (result.error) setMessage("The assignment could not be updated. Please try again.");
    else { setDone(!done); setMessage(done ? "Assignment returned to in progress." : "Assignment marked complete."); }
    setBusy(false);
  }

  return (
    <div className={styles.completeAction}>
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={done} className={`${styles.completeButton}${done ? ` ${styles.isComplete}` : ""}`}>
        {done ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
        {busy ? "Saving..." : done ? "Assignment complete. Undo" : "Mark assignment complete"}
      </button>
      <p className={styles.completeMessage} aria-live="polite">{message}</p>
    </div>
  );
}
