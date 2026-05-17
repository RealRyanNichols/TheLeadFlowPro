import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkAuth(req: Request): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const expected = process.env.ADMIN_INIT_SECRET;
  const provided = req.headers.get("x-admin-secret");
  if (expected && provided === expected) {
    return { ok: true };
  }

  const session = await requireAdminSession();
  if (session) {
    return { ok: true };
  }

  return {
    ok: false,
    res: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
  };
}

export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const goal = url.searchParams.get("goal");
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 50)));

  try {
    const intakes = await prisma.publicIntake.findMany({
      where: goal ? { biggestGoal: goal } : undefined,
      orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json({ intakes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "intake fetch failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) return auth.res;

  let body: { id?: string; handled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const intake = await prisma.publicIntake.update({
      where: { id: body.id },
      data: { handled: Boolean(body.handled) },
    });

    return NextResponse.json({ ok: true, intake });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "intake update failed" },
      { status: 500 },
    );
  }
}
