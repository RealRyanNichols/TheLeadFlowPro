"use client";

import { useEffect } from "react";

/**
 * Mounted inside the admin layout only. Any browser that has opened the back
 * office gets a long-lived first-party cookie, and every analytics event that
 * browser sends afterwards is stored with is_internal=true — so Ryan checking
 * his own homepage never counts as customer traffic. The admin pages
 * themselves are never tracked at all (see UNTRACKED in lib/analytics/client).
 */
export default function InternalTrafficMarker() {
  useEffect(() => {
    try {
      document.cookie = "lfp_int=1; path=/; max-age=31536000; SameSite=Lax";
    } catch {
      /* cookies blocked */
    }
  }, []);
  return null;
}
