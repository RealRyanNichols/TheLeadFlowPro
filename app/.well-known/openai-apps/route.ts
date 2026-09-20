import { verificationResponse } from "@/lib/openaiAppsVerification";

// Alias of /.well-known/openai-apps-challenge. See lib/openaiAppsVerification.ts.

export const dynamic = "force-dynamic";

export function GET() {
  return verificationResponse(process.env);
}
