"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CompleteButton({
  lessonId,
  initiallyDone,
}: {
  lessonId: string;
  initiallyDone: boolean;
}) {
  const [done, setDone] = useState(initiallyDone);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (done) {
      await supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
      setDone(false);
    } else {
      await supabase
        .from("lesson_progress")
        .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
      setDone(true);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={done ? "btn-ghost !border-mint !text-mint" : "btn-primary"}
    >
      {done ? "✓ Completed (click to undo)" : "Mark Lesson Complete"}
    </button>
  );
}
