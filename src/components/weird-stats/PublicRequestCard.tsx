import Link from "next/link";
import { ArrowRight, Flame, Share2 } from "lucide-react";

export function PublicRequestCard({
  request,
}: {
  request: {
    id: string;
    question: string;
    category: string;
    votes: number;
    boosts: number;
    status: string;
  };
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          {request.category}
        </span>
        <span className="rounded-full border border-accent-300/20 bg-accent-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-accent-100">
          {request.status}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-black leading-tight text-white">{request.question}</h3>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <div className="text-2xl font-black text-white">{request.votes}</div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">votes</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <div className="text-2xl font-black text-white">{request.boosts}</div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">boosts</div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/request?request=${request.id}&product=boost_stat_100`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-950 hover:bg-accent-400"
        >
          <Flame className="h-3.5 w-3.5" />
          Boost for $1
        </Link>
        <Link
          href={`/request?request=${request.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-50 hover:bg-cyan-300/15"
        >
          Follow <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-100">
          <Share2 className="h-3.5 w-3.5 text-cyan-200" />
          Share
        </button>
      </div>
    </article>
  );
}
