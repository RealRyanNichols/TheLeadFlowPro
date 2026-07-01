import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BUYER_ACCESS_COOKIE = "lfp_buyer_access";
const BUYER_REFRESH_COOKIE = "lfp_buyer_refresh";
const BUYER_EXPIRES_COOKIE = "lfp_buyer_expires";

export type SupabaseBuyerUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type SupabaseBuyerSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseBuyerUser;
};

export type BuyerAuthState =
  | { authenticated: true; user: SupabaseBuyerUser; accessToken: string }
  | { authenticated: false; reason: "missing_config" | "missing_session" | "invalid_session" };

export class SupabaseBuyerAuthConfigError extends Error {
  constructor(message = "Supabase Auth is not configured.") {
    super(message);
    this.name = "SupabaseBuyerAuthConfigError";
  }
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.LEADREP_BUS_URL || "";
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

export function hasSupabaseBuyerAuthConfig() {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

function requireSupabaseAuthConfig() {
  const url = supabaseUrl().replace(/\/$/, "");
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) throw new SupabaseBuyerAuthConfigError();
  return { url, anonKey };
}

async function supabaseAuthFetch<T>(
  path: string,
  init: RequestInit & { bearer?: string } = {},
): Promise<T> {
  const { url, anonKey } = requireSupabaseAuthConfig();
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${init.bearer || anonKey}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.msg === "string" ? data.msg : typeof data?.error_description === "string" ? data.error_description : "Supabase Auth request failed.";
    throw new Error(message);
  }
  return data as T;
}

export async function signInBuyerWithPassword(email: string, password: string) {
  return supabaseAuthFetch<SupabaseBuyerSession>("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUpBuyerWithPassword(input: {
  email: string;
  password: string;
  name?: string;
  company?: string;
}) {
  return supabaseAuthFetch<SupabaseBuyerSession>("/signup", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: {
        name: input.name || null,
        company_name: input.company || null,
        leadflow_role: "buyer",
      },
    }),
  });
}

export async function sendBuyerMagicLink(email: string, redirectTo: string) {
  return supabaseAuthFetch<{ message_id?: string }>("/otp", {
    method: "POST",
    body: JSON.stringify({
      email,
      create_user: true,
      data: { leadflow_role: "buyer" },
      options: { email_redirect_to: redirectTo },
    }),
  });
}

export async function getSupabaseBuyerUser(accessToken: string) {
  return supabaseAuthFetch<SupabaseBuyerUser>("/user", {
    method: "GET",
    bearer: accessToken,
    headers: { "content-type": "application/json" },
  });
}

export async function refreshBuyerSession(refreshToken: string) {
  return supabaseAuthFetch<SupabaseBuyerSession>("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

export function setBuyerAuthCookies(response: NextResponse, session: SupabaseBuyerSession) {
  const maxAge = Math.max(60, Number(session.expires_in || 60 * 60));
  const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + maxAge;
  response.cookies.set(BUYER_ACCESS_COOKIE, session.access_token, cookieOptions(maxAge));
  if (session.refresh_token) response.cookies.set(BUYER_REFRESH_COOKIE, session.refresh_token, cookieOptions(60 * 60 * 24 * 30));
  response.cookies.set(BUYER_EXPIRES_COOKIE, String(expiresAt), cookieOptions(maxAge));
}

export function clearBuyerAuthCookies(response: NextResponse) {
  response.cookies.set(BUYER_ACCESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(BUYER_REFRESH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(BUYER_EXPIRES_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function getBuyerAuthState(): Promise<BuyerAuthState> {
  if (!hasSupabaseBuyerAuthConfig()) return { authenticated: false, reason: "missing_config" };

  const jar = cookies();
  const accessToken = jar.get(BUYER_ACCESS_COOKIE)?.value;
  if (!accessToken) return { authenticated: false, reason: "missing_session" };

  try {
    const user = await getSupabaseBuyerUser(accessToken);
    return { authenticated: true, user, accessToken };
  } catch {
    return { authenticated: false, reason: "invalid_session" };
  }
}

export function buyerAuthRedirectTo(req: NextRequest, fallbackPath = "/buyer") {
  const origin = req.nextUrl.origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(fallbackPath)}`;
}
