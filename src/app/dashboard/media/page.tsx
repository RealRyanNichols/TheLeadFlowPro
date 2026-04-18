"use client";
import { useMemo, useState } from "react";
import { Upload, Play, Image as ImageIcon, Tag, Sparkles } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_MEDIA } from "@/lib/mock-data";
import { SoonButton } from "@/components/ui/SoonButton";

const FILTERS = ["All", "Videos", "GIFs", "Images"] as const;
type Filter = typeof FILTERS[number];

export default function MediaPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const visible = useMemo(() => {
    if (filter === "All") return MOCK_MEDIA;
    const want = filter === "Videos" ? "video" : filter === "GIFs" ? "gif" : "image";
    return MOCK_MEDIA.filter((m) => m.kind === want);
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">Video & GIF Library</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Send the right thing <span className="funnel-text">at the right moment</span>
          </h1>
          <p className="mt-2 text-ink-300">
            Tag your videos and GIFs by purpose. AI suggests which one to send when —
            you tap to send. Builds know-like-trust faster than text alone.
          </p>
        </div>
        <SoonButton variant="primary">
          <Upload className="h-4 w-4" /> Upload media
        </SoonButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assets in library" value={MOCK_MEDIA.length.toString()} />
        <StatCard label="Sends this month"  value="186" delta={42} highlight />
        <StatCard label="Reply rate (with media)" value="64%" sub="vs 22% text-only" delta={42} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-white">Your media</h2>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  f === filter
                    ? "stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs"
                    : "stat-pill bg-white/5 text-ink-300 border border-white/10 text-xs hover:text-white"
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-ink-400">No {filter.toLowerCase()} yet.</p>
        ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((m) => (
            <div key={m.id} className="glass rounded-2xl overflow-hidden hover:border-cyan-500/30 transition group">
              <div className="aspect-video bg-gradient-to-br from-brand-700 to-ink-900 flex items-center justify-center relative">
                {m.kind === "video" ? (
                  <Play className="h-10 w-10 text-white/80 group-hover:scale-110 transition" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-white/80" />
                )}
                <span className="absolute top-2 left-2 stat-pill bg-ink-950/80 text-cyan-300 border border-white/10 text-[10px] uppercase">
                  {m.kind}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-white truncate">{m.title}</p>
                <p className="text-[11px] text-ink-300 mt-1 line-clamp-2">{m.bestFor}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.tags.slice(0, 2).map((t) => (
                    <span key={t} className="stat-pill bg-white/5 border border-white/10 text-[10px]">
                      <Tag className="h-2.5 w-2.5" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6 flex items-start gap-4">
        <Sparkles className="h-5 w-5 text-accent-400 shrink-0 mt-1" />
        <div>
          <h3 className="text-base font-bold text-white">AI suggestion</h3>
          <p className="text-sm text-ink-200 mt-1">
            You don't have a "Why I started" video yet. Leads who get one in the
            first 48 hours are more likely to book. Record a 60-second clip and
            we'll tag and slot it into your nurture sequence.
          </p>
          <SoonButton variant="accent" size="xs" className="mt-3">
            Show me the script
          </SoonButton>
        </div>
      </div>
    </div>
  );
}
