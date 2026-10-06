import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireDashboardOwner } from "@/lib/adminOwnerSnapshot";
import { OperatorAuthError } from "@/lib/operatoros/auth";
export const dynamic = "force-dynamic";
const IDS = new Set(["freddy-aa-excavation", "jalen-7m-hauling", "lawrence-land-services"]);
const TYPES: Record<string,string> = {".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp4":"video/mp4", ".woff2":"font/woff2"};
export async function GET(_request: Request, context: {params: Promise<{id:string,path:string[]}>}) {
 try {
  await requireDashboardOwner();
  const p = await context.params;
  if (!IDS.has(p.id) || !Array.isArray(p.path) || p.path.length > 8 || p.path.some(s=>!s || s === "." || s === ".." || !/^[a-zA-Z0-9_.-]+$/.test(s))) return new NextResponse("Not found",{status:404});
  const root = `/var/lib/leadflow-admin-dashboard/proposals/${p.id}`;
  const file = path.join(root,...p.path), type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new NextResponse("Not found",{status:404});
  const resolved = await fs.realpath(file);
  if (!resolved.startsWith(root+"/")) return new NextResponse("Not found",{status:404});
  const stat = await fs.stat(resolved);
  if (!stat.isFile() || stat.size > 50_000_000) return new NextResponse("Not found",{status:404});
  return new NextResponse(await fs.readFile(resolved),{headers:{"Content-Type":type,"Cache-Control":"private, no-store","X-Frame-Options":"SAMEORIGIN","Content-Security-Policy":"frame-ancestors 'self'","X-Content-Type-Options":"nosniff"}});
 } catch(error) {
  return new NextResponse(error instanceof OperatorAuthError ? "Owner sign-in required" : "Proposal unavailable",{status:error instanceof OperatorAuthError?error.status:404,headers:{"Cache-Control":"private, no-store"}});
 }
}
