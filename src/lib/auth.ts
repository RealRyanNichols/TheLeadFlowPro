import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const googleId   = process.env.GOOGLE_CLIENT_ID;
const googleKey  = process.env.GOOGLE_CLIENT_SECRET;
const fbId       = process.env.FACEBOOK_CLIENT_ID;
const fbKey      = process.env.FACEBOOK_CLIENT_SECRET;
const twitterId  = process.env.TWITTER_CLIENT_ID;
const twitterKey = process.env.TWITTER_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // JWT sessions let credential logins work alongside the Prisma adapter.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard/onboarding"
  },
  providers: [
    // OAuth providers are registered only when credentials are present, so
    // local/preview builds work without every secret being set.
    ...(googleId && googleKey
      ? [GoogleProvider({
          clientId: googleId,
          clientSecret: googleKey,
          allowDangerousEmailAccountLinking: true
        })]
      : []),
    ...(fbId && fbKey
      ? [FacebookProvider({
          clientId: fbId,
          clientSecret: fbKey,
          allowDangerousEmailAccountLinking: true
        })]
      : []),
    ...(twitterId && twitterKey
      ? [TwitterProvider({
          clientId: twitterId,
          clientSecret: twitterKey,
          version: "2.0",
          allowDangerousEmailAccountLinking: true
        })]
      : []),
    CredentialsProvider({
      name: "Email + password",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Fresh sign-in — capture the DB id on the token.
      if (user) token.id = (user as { id: string }).id;

      // Keep a cached `hasProfile` flag on the token so middleware can gate
      // the dashboard without a DB hit on every request. We refresh it on
      // first issue and whenever the client calls session.update() (which
      // ProfileCapture does right after the user saves their basics).
      const needsProfileLookup =
        token.id && (token.hasProfile === undefined || trigger === "update");
      if (needsProfileLookup) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { onboardedAt: true }
        });
        // Only "onboarded" once they've finished the questionnaire.
        // Signup populates name + businessName, so those aren't enough.
        token.hasProfile = !!u?.onboardedAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const su = session.user as typeof session.user & {
          id?: string;
          hasProfile?: boolean;
        };
        if (token.id) su.id = token.id as string;
        su.hasProfile = !!token.hasProfile;
      }
      return session;
    }
  }
};

export function auth() {
  return getServerSession(authOptions);
}

/**
 * Server-side helper — returns the full User row for the signed-in request,
 * or null if no session. Throws if the DB is unreachable.
 */
export async function currentUser() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
