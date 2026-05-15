"use client";

import { useEffect } from "react";

const DRAFT_STORAGE_PREFIX = "leadflow.prompt-build-lab.";

export function ClearPromptBuildLabDraft() {
  useEffect(() => {
    try {
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(DRAFT_STORAGE_PREFIX)) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      // Draft cleanup is best-effort and should never affect the thank-you page.
    }
  }, []);

  return null;
}
