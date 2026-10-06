import { NextResponse } from "next/server";
import { getPictureStudioReadiness, secureHeaders } from "@/lib/pictureStudio/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await getPictureStudioReadiness(), { headers: secureHeaders }); }
