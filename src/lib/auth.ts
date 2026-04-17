// src/lib/auth.ts
// UPDATED for Flo profile-gate (Ryan 2026-04-17):
//  - newUser page is now /onboarding (not /dashboard/onboarding which was the old goal-picker)
//  - JWT + session now carry brainCompleteness so middleware can gate without a DB roundtrip
//  - JWT is re-hydrated with fresh completeness on initial sign-in AND whenever the
//    client calls `update()` from useSession — which the onboarding page does on unlock.

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { scryptSync, timingSafeEqual } from "crypto";

function verifyPassword(password: string, hashed: string | null | undefined): boolean {
  if (!hashed) return false;
  const [salt, key] = hashed.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const testBuf = scryptSync(password, salt, keyBuf.length);
  if (keyBuf.length !== testBuf.length) return false;
  return timingSafeEqual(keyBuf, testBuf);
}

async function currentCompleteness(userId: string): Promise<number> {
  try {
    const row = await prisma.brainProfile.findUnique({
      where: { userId },
      select: { completeness: true },
    });
    return row?.completeness ?? 0;
  } catch {
    return 0;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding", // Flo's conversational profile builder
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? [
          TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
            version: "2.0",
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        if (!verifyPassword(creds.password, user.passwordHash)) return null;
        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // First sign-in: seed the token with the user id.
      if (user) {
        (token as any).id = (user as any).id;
      }
      // Refresh brainCompleteness:
      //  - on initial sign-in (user is truthy)
      //  - when the client explicitly calls update() (trigger === "update")
      const id = (token as any).id as string | undefined;
      if (id && (user || trigger === "update")) {
        (token as any).brainCompleteness = await currentCompleteness(id);
      }
      // If somehow the claim is missing from an existing session, seed it once.
      if (id && typeof (token as any).brainCompleteness !== "number") {
        (token as any).brainCompleteness = await currentCompleteness(id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).brainCompleteness =
          typeof (token as any).brainCompleteness === "number"
            ? (token as any).brainCompleteness
            : 0;
      }
      return session;
    },
  },
};
