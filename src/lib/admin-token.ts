import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/admin-identity";

export type AdminTokenSession = {
  email: string;
  userId: string | null;
};

function nextAuthSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
}

function cookieHeaderFromStore() {
  return cookies()
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function adminSessionFromToken(token: Awaited<ReturnType<typeof getToken>>): AdminTokenSession | null {
  if (!token || typeof token === "string") return null;

  const email = typeof token.email === "string" ? token.email : null;
  if (!email || !isAdminEmail(email)) return null;
  return {
    email,
    userId: typeof token.sub === "string" ? token.sub : null,
  };
}

export async function getAdminTokenSession() {
  const secret = nextAuthSecret();
  if (!secret) return null;

  const token = await getToken({
    req: { headers: { cookie: cookieHeaderFromStore() } } as never,
    secret,
  });

  return adminSessionFromToken(token);
}

export async function getAdminTokenSessionFromRequest(req: Request) {
  const secret = nextAuthSecret();
  if (!secret) return null;

  const token = await getToken({
    req: { headers: { cookie: req.headers.get("cookie") || "" } } as never,
    secret,
  });

  return adminSessionFromToken(token);
}
