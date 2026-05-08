import { ArrowRight, HeartHandshake, Share2, SlidersHorizontal, Trophy, Users } from "lucide-react";

const storySteps = [
  {
    label: "Pick",
    title: "Choose the board",
    detail: "Teacher, coach, restaurant, ministry, artist, team, or any East Texas category.",
    Icon: Users,
  },
  {
    label: "Vote",
    title: "$1 becomes 1 point",
    detail: "Slide the amount and watch the projected rank move before checkout.",
    Icon: SlidersHorizontal,
  },
  {
    label: "Share",
    title: "Send the race out",
    detail: "Every rank has a reason to text, post, and pull people back to the board.",
    Icon: Share2,
  },
  {
    label: "Give",
    title: "70% stays local",
    detail: "The local giveback pool becomes public proof, not a hidden donation claim.",
    Icon: HeartHandshake,
  },
];

export function TopTenExplainerMovie() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-950/10 bg-slate-950 p-4 text-white shadow-[0_30px_90px_-30px_rgba(15,23,42,0.75)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(92,208,255,0.28),transparent_30%),radial-gradient(circle_at_86%_72%,rgba(255,154,31,0.22),transparent_32%)]" />
      <div className="absolute -right-16 top-8 h-44 w-44 rounded-full border border-cyan-300/20" />
      <div className="absolute -right-7 top-16 h-28 w-28 rounded-full border border-accent-300/20" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">
              Animated explainer
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Make the board move.
            </h2>
          </div>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30 motion-safe:animate-bounce">
            <Trophy className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {storySteps.map((step, index) => (
            <div
              key={step.label}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur transition hover:border-cyan-300/60 hover:bg-white/[0.12]"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-inner"
                style={{ animationDelay: `${index * 140}ms` }}
              >
                <step.Icon className="h-5 w-5 motion-safe:group-hover:scale-110 transition" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-accent-300/30 bg-accent-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-100">
                    {step.label}
                  </span>
                  <span className="truncate text-sm font-bold">{step.title}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{step.detail}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">
                Habit loop
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                Rank changes create a reason to come back.
              </div>
            </div>
            <div className="flex -space-x-2">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className="h-8 w-8 rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-300 to-accent-300"
                />
              ))}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-300 via-accent-300 to-cyan-200 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
