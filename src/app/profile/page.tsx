// src/app/profile/page.tsx
//
// The user's profile page. Server component — reads the session and the User +
// BrainProfile rows, then renders in a simple grid with a small client-side
// form section for editing name / mortgageOriginator flag / NMLS / state licenses.
//
// Fix notes (2026-04-18):
//   - Previous page never rendered for logged-in users. Root cause was likely
//     that it lived under a matcher the middleware gated to completeness >= 80,
//     but a newly-registered user hits /profile before onboarding is done.
//     The new middleware gates /profile with auth but the profile page itself
//     is reachable at any completeness level — you should always be able to
//     see your own profile.
//   - Uses getServerSession + prisma directly (no /api/user round-trip) so it
//     always renders with the latest data.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileEditor from "@/components/ProfileEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=%2Fprofile");
  }

  const email = session.user.email;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      stripeCustomerId: true,
      mortgageOriginator: true,
      loNmlsId: true,
      loStateLicenses: true,
      createdAt: true,
      brainProfile: {
        select: {
          completeness: true,
          niche: true,
          offer: true,
          audience: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    // Shouldn't normally happen — NextAuth adapter creates the row on first login.
    redirect("/login?callbackUrl=%2Fprofile");
  }

  const brainCompleteness = user.brainProfile?.completeness ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Profile</div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {user.name || user.email}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Member since {new Date(user.createdAt).toLocaleDateString()} · Brain profile {brainCompleteness}% complete
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Account basics */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Account
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Email</dt>
              <dd className="mt-0.5 text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Name</dt>
              <dd className="mt-0.5 text-slate-900">{user.name || <span className="text-slate-400 italic">— not set</span>}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Stripe customer</dt>
              <dd className="mt-0.5 text-slate-900">
                {user.stripeCustomerId ? (
                  <code className="text-xs">{user.stripeCustomerId}</code>
                ) : (
                  <span className="text-slate-400 italic">— no subscription yet</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Member since</dt>
              <dd className="mt-0.5 text-slate-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </section>

        {/* Brain profile summary */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Brain profile
            </h2>
            <span className="text-xs text-slate-500">{brainCompleteness}% complete</span>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Niche</dt>
              <dd className="mt-0.5 text-slate-900">
                {user.brainProfile?.niche || <span className="text-slate-400 italic">— not set</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Offer</dt>
              <dd className="mt-0.5 text-slate-900">
                {user.brainProfile?.offer || <span className="text-slate-400 italic">— not set</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Audience</dt>
              <dd className="mt-0.5 text-slate-900">
                {user.brainProfile?.audience || <span className="text-slate-400 italic">— not set</span>}
              </dd>
            </div>
          </dl>
          <a
            href="/onboarding"
            className="mt-3 inline-flex text-sm text-blue-700 hover:underline"
          >
            Refine Brain profile →
          </a>
        </section>

        {/* Editor for the mutable fields. Client component, talks to /api/user. */}
        <ProfileEditor
          initial={{
            name: user.name || "",
            mortgageOriginator: !!user.mortgageOriginator,
            loNmlsId: user.loNmlsId || "",
            loStateLicenses: user.loStateLicenses || [],
          }}
        />
      </main>
    </div>
  );
}
