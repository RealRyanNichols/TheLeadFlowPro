"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Facebook } from "lucide-react";
import type { Connection } from "@/lib/hq/types";
import { hqPost } from "./api";

// The Facebook Page. Two things come from it: lead ad submissions arrive as
// leads, and approved posts can go out from HQ instead of you pasting them.

export default function FacebookCard({ connection }: { connection: Connection | null }) {
  const router = useRouter();
  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const connectedId = connection ? String((connection.config as Record<string, unknown>).page_id ?? "") : "";

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setBusy("connect");
    setError("");
    const result = await hqPost("connect_facebook_token", { page_id: pageId, page_name: pageName, token });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPageId("");
    setPageName("");
    setToken("");
    router.refresh();
  }

  async function disconnect() {
    setBusy("disconnect");
    setError("");
    const result = await hqPost("disconnect", { kind: "meta_page" });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="hq-card">
      <div className="flex items-center gap-2">
        <Facebook aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h3 className="text-lg font-black text-[var(--heading)]">Your Facebook Page</h3>
      </div>

      {connection ? (
        <>
          <p className="mt-2 text-sm text-[var(--text)]">
            Connected: {connection.label}
            {connectedId ? ` (Page ID ${connectedId})` : ""}.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">Lead ad submissions land in Leads, and approved posts can go out from the Content page.</p>
          {connection.last_error && <p className="hq-error mt-3">Last error from Meta: {connection.last_error}</p>}
          {error && <p className="hq-error mt-3">{error}</p>}
          <div className="mt-4">
            <button type="button" className="hq-btn" disabled={busy !== ""} onClick={disconnect}>
              {busy === "disconnect" ? "Disconnecting..." : "Disconnect the Page"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={connect}>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Paste a Page access token and every lead ad form on that Page lands here.
          </p>
          <ol className="mt-3 grid gap-1 pl-5 text-sm text-[var(--muted)]" style={{ listStyleType: "decimal" }}>
            <li>Open business.facebook.com and pick your business.</li>
            <li>Go to Settings, then Accounts, then Pages, and open your Page.</li>
            <li>Your Page ID is on that screen. Copy it.</li>
            <li>Generate a Page access token for the Page and copy it. Ask whoever manages your ads if you are not the admin.</li>
          </ol>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="hq-label" htmlFor="fb-id">
                Page ID
              </label>
              <input id="fb-id" className="hq-input" inputMode="numeric" value={pageId} onChange={(e) => setPageId(e.target.value)} />
            </div>
            <div>
              <label className="hq-label" htmlFor="fb-name">
                Page name
              </label>
              <input id="fb-name" className="hq-input" value={pageName} onChange={(e) => setPageName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="hq-label" htmlFor="fb-token">
                Page access token
              </label>
              <input id="fb-token" className="hq-input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
              <p className="mt-1 text-xs text-[var(--muted)]">Encrypted before it is stored. It is never shown back to you or to your assistant.</p>
            </div>
          </div>

          {error && <p className="hq-error mt-4">{error}</p>}

          <div className="mt-4">
            <button type="submit" className="hq-btn" disabled={busy !== "" || !pageId || !token}>
              {busy === "connect" ? "Connecting..." : "Connect the Page"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
