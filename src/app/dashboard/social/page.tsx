import { CheckCircle2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SocialIcon, socialBg } from "@/components/flowcard/SocialIcon";
import { MOCK_SOCIAL } from "@/lib/mock-data";
import { formatNumber, cn } from "@/lib/utils";
import { SoonButton } from "@/components/ui/SoonButton";

export default function SocialPage() {
  const connected = MOCK_SOCIAL.filter((s) => s.connected);
  const totalFollowers = connected.reduce((s, p) => s + p.followers, 0);
  const avgEngagement = connected.length
    ? connected.reduce((s, p) => s + p.engagement, 0) / connected.length
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">Social Accounts</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          All your platforms, <span className="funnel-text">one view</span>
        </h1>
        <p className="mt-2 text-ink-300">
          Connect your accounts. We pull followers, engagement, and top-post data so
          AI can find your real audience.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total followers" value={connected.length ? formatNumber(totalFollowers) : "—"} highlight={connected.length > 0} />
        <StatCard label="Avg engagement"  value={connected.length ? `${avgEngagement.toFixed(1)}%` : "—"} />
        <StatCard label="Connected"       value={`${connected.length} of ${MOCK_SOCIAL.length}`} />
      </div>

      {connected.length === 0 && (
        <div className="glass rounded-2xl p-5 border border-cyan-500/20">
          <p className="text-sm text-white font-semibold">No accounts connected yet.</p>
          <p className="text-xs text-ink-300 mt-1">
            Hook up your platforms below and we'll start pulling real followers,
            engagement, and top-post data — nothing here is pre-populated.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_SOCIAL.map((s) => (
          <div key={s.platform} className="glass rounded-2xl p-5 hover:border-cyan-500/30 transition">
            <div className="flex items-start justify-between gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${socialBg(s.platform)}`}>
                <SocialIcon platform={s.platform} />
              </div>
              {s.connected ? (
                <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <SoonButton size="xs">
                  <Plus className="h-3.5 w-3.5" /> Connect
                </SoonButton>
              )}
            </div>
            <h3 className="mt-3 text-base font-bold text-white capitalize">{s.platform}</h3>
            <p className="text-xs text-ink-400">{s.handle || "Not connected"}</p>

            {s.connected && (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{formatNumber(s.followers)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-400">Followers</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{s.engagement}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-400">Engagement</p>
                </div>
                <div>
                  <p className={cn("text-lg font-bold flex items-center justify-center gap-0.5",
                    s.growth7d >= 0 ? "text-lead-400" : "text-red-400")}>
                    {s.growth7d >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {Math.abs(s.growth7d)}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-400">7d growth</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
