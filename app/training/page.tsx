import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTrainingAccess } from "@/lib/access";
import BuyButton from "@/components/BuyButton";

export const metadata = { title: "Training | The LeadFlow Pro" };

export default async function TrainingPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");
  const { hasTraining } = await getTrainingAccess();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-black text-white">Own Your Platform Training</h1>
      <p className="mt-2 text-slate-400">
        The full system: AI as your dev team, your code in GitHub, your site on
        Vercel, your data in Supabase, your designs in Figma. Work top to bottom.
      </p>

      {!hasTraining && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 border border-sky-400/40 shadow-glow-blue">
          <div>
            <p className="font-bold text-white">The first course is free. The full system is $497, once.</p>
            <p className="mt-1 text-sm text-slate-400">
              Lifetime access, updated as the tools evolve. Compare that to one
              more month of renting.
            </p>
          </div>
          <BuyButton label="Unlock Everything — $497" />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {courses?.map((c, i) => (
          <Link
            key={c.id}
            href={`/training/${c.slug}`}
            className="card flex items-center gap-5 transition hover:border-flow-500"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-flow-600/20 text-lg font-black text-flow-400">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-white">{c.title}</h2>
                {c.is_free ? (
                  <span className="rounded-full bg-mint/20 px-2 py-0.5 text-xs font-bold text-mint">
                    FREE
                  </span>
                ) : !hasTraining ? (
                  <span className="rounded-full bg-line px-2 py-0.5 text-xs font-bold text-slate-400">
                    🔒 LEARN IT
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-400">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
