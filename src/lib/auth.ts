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

// Fetches the current Flo profile completeness for the JWT token refresh path.
async function currentBrainCompleteness(userId: string): Promise<number> {
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
  adapter: PrismaAdapter(prisma),
  // JWT sessions let credential logins work alongside the Prisma adapter.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // Flo's conversational profile builder. Nothing unlocks until she has
    // enough context (BrainProfile.completeness >= 80).
    newUser: "/onboarding"
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
      if (user) token.id = (user as { id: string }).id;

      // Refresh brainCompleteness:
      //  - on initial sign-in (user is truthy)
      //  - when the client explicitly calls session.update() after finishing onboarding
      const id = (token as { id?: string }).id;
      if (id && (user || trigger === "update")) {
        (token as { brainCompleteness?: number }).brainCompleteness =
          await currentBrainCompleteness(id);
      }
      // If the claim is missing on an existing session (upgrade path), seed it once.
      if (id && typeof (token as { brainCompleteness?: number }).brainCompleteness !== "number") {
        (token as { brainCompleteness?: number }).brainCompleteness =
          await currentBrainCompleteness(id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as typeof session.user & { id: string }).id = token.id as string;
      }
      if (session.user) {
        const bc = (token as { brainCompleteness?: number }).brainCompleteness;
        (session.user as typeof session.user & { brainCompleteness?: number }).brainCompleteness =
          typeof bc === "number" ? bc : 0;
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
