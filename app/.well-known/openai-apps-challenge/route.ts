import { verificationResponse } from "@/lib/openaiAppsVerification";

// ChatGPT app directory domain verification. See lib/openaiAppsVerification.ts.

export const dynamic = "force-dynamic";

export function GET() {
  return verificationResponse(process.env);
}
