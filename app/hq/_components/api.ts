"use client";

// One way in and out of the management API. Every client form on the HQ
// pages posts through here so an error reads the same everywhere: the
// server's own sentence when it sent one, a plain fallback when it did not.

export type HqResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string; status: number };

export async function hqPost(action: string, fields: Record<string, unknown> = {}): Promise<HqResult> {
  try {
    const response = await fetch("/api/hq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...fields }),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || json.ok !== true) {
      return {
        ok: false,
        status: response.status,
        error: typeof json.error === "string" && json.error ? json.error : "That did not go through. Try again.",
      };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 0, error: "No connection. Check your internet and try again." };
  }
}
