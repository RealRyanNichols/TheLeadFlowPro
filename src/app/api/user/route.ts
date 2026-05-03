// src/app/api/user/route.ts
//
// GET  → return the current user + BrainProfile summary
// PATCH → update editable fields (name, mortgageOriginator, loNmlsId,
//         loStateLicenses). Validates NMLS format and state codes.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      mortgageOriginator: true,
      loNmlsId: true,
      loStateLicenses: true,
      createdAt: true,
      brainProfile: {
        select: {
          completeness: true,
          industry: true,
          subIndustry: true,
          idealCustomer: true,
          extras: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const update: Record<string, any> = {};

  if (typeof body.name !== "undefined") {
    update.name =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim().slice(0, 120)
        : null;
  }

  if (typeof body.mortgageOriginator === "boolean") {
    update.mortgageOriginator = body.mortgageOriginator;
  }

  if (typeof body.loNmlsId !== "undefined") {
    const v = body.loNmlsId;
    if (v === null || v === "") {
      update.loNmlsId = null;
    } else if (typeof v === "string" && /^\d{3,10}$/.test(v)) {
      update.loNmlsId = v;
    } else {
      return NextResponse.json(
        { error: "invalid_nmls", detail: "NMLS must be 3–10 digits." },
        { status: 400 }
      );
    }
  }

  if (Array.isArray(body.loStateLicenses)) {
    const bad = body.loStateLicenses.find(
      (s: unknown) => typeof s !== "string" || !VALID_STATES.has(s)
    );
    if (bad) {
      return NextResponse.json(
        { error: "invalid_state", detail: `Unknown state code: ${bad}` },
        { status: 400 }
      );
    }
    update.loStateLicenses = [...new Set<string>(body.loStateLicenses)];
  }

  // Extra guard: if user is flagging themselves as a mortgage originator,
  // they must also supply an NMLS. Otherwise clear those fields.
  if (update.mortgageOriginator === true) {
    const nmls = update.loNmlsId ?? (await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { loNmlsId: true },
    }))?.loNmlsId;
    if (!nmls) {
      return NextResponse.json(
        {
          error: "missing_nmls",
          detail: "Please provide your NMLS ID before enabling Mortgage OS.",
        },
        { status: 400 }
      );
    }
  }
  if (update.mortgageOriginator === false) {
    update.loNmlsId = null;
    update.loStateLicenses = [];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: update,
    select: {
      id: true,
      email: true,
      name: true,
      mortgageOriginator: true,
      loNmlsId: true,
      loStateLicenses: true,
    },
  });

  return NextResponse.json({ user });
}
