"use client";

// What we remember about somebody between tools.
//
// This used to be an "unlock" that gated every download behind a name, a phone
// number and an email. It is not a gate any more. Downloading, copying and
// printing are free and always available. This only remembers the details
// somebody already chose to give us, so the second time they ask for a result by
// email they do not retype it.

import { useCallback, useEffect, useState } from "react";

const KEY = "lfp_tool_profile_v2";
const RECENT_KEY = "lfp_tool_recent_v1";
const EVENT = "lfp-tool-profile";
const MAX_RECENT = 8;

export type ToolProfile = { email: string; name?: string; business?: string };

function read(): ToolProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ToolProfile;
    return parsed && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function useToolProfile() {
  const [profile, setProfileState] = useState<ToolProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfileState(read());
    setReady(true);
    const onChange = () => setProfileState(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback((next: ToolProfile) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private browsing. They can type it again, nothing is broken. */
    }
    setProfileState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const forget = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setProfileState(null);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { profile, ready, save, forget };
}

/* ------------------------------- recent tools ------------------------------ */

export function rememberTool(slug: string) {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [slug, ...list.filter((s) => s !== slug)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readRecentTools(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}
