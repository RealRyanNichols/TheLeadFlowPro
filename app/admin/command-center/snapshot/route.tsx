import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import { loadMoneyBoard } from "@/lib/commandCenterServer";
import { parseWindow } from "@/lib/commandCenter";
import { snapshotFacts, snapshotFileName } from "@/lib/commandCenterSnapshot";
import { centralDate } from "@/lib/businessTime";

// A 1200 by 630 card of the board's aggregate numbers, for the owner to post
// or send. Admin only, read with the admin's own client, counts and
// percentages only: lib/commandCenterSnapshot.ts decides what is on it and
// its test proves no lead, name, phone or typed value can reach it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let supabase;
  try {
    ({ supabase } = await requireOperatorAdmin());
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.status === 401 ? "Sign in first." : "Admins only." }, { status: error.status });
    }
    throw error;
  }
  const now = new Date();
  const days = parseWindow(new URL(request.url).searchParams.get("window"));
  const load = await loadMoneyBoard(supabase, now, days).catch(() => null);
  if (!load || !load.ok) {
    return NextResponse.json({ error: "The board could not be read, so there is no snapshot. Nothing is shown as zero." }, { status: 503 });
  }
  const day = centralDate(now);
  const facts = snapshotFacts(load.board);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(135deg, #f3efe8 0%, #ede6f3 100%)",
          color: "#1b1a2e",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: "#5135e5", fontWeight: 800 }}>Lead to cash</div>
            <div style={{ fontSize: 54, fontWeight: 900, marginTop: 6 }}>The LeadFlow Pro</div>
          </div>
          <div style={{ fontSize: 24, color: "#5a5873", fontWeight: 600 }}>{`${day} · last ${load.board.days} days`}</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {facts.map((fact) => (
            <div
              key={fact.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.78)",
                borderRadius: 24,
                padding: "26px 24px",
                border: "2px solid rgba(81,53,229,0.14)",
              }}
            >
              <div style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: 2, color: "#5a5873", fontWeight: 800 }}>{fact.label}</div>
              <div style={{ fontSize: 50, fontWeight: 900, marginTop: 10 }}>{fact.value}</div>
              <div style={{ fontSize: 17, color: "#5a5873", marginTop: 8 }}>{fact.detail}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#5a5873", fontWeight: 600 }}>
          <div>Counts from our own records. A person reaching a lead means a note, a call somebody had, or a text a person typed.</div>
          <div>theleadflowpro.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${snapshotFileName(load.board, day)}"`,
      },
    },
  );
}
