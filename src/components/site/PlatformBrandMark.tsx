import { cn } from "@/lib/utils";

export type PlatformBrandHandle = "tiktok" | "facebook" | "x" | "youtube" | "instagram";

const LABELS: Record<PlatformBrandHandle, string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X / Twitter",
  youtube: "YouTube",
  instagram: "Instagram",
};

export function PlatformBrandMark({
  platform,
  className,
  showLabel = false,
}: {
  platform: PlatformBrandHandle;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)} aria-label={LABELS[platform]}>
      <span
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm",
          platform === "tiktok" && "border-[#25F4EE]/60 shadow-[#FE2C55]/10",
          platform === "facebook" && "border-[#1877F2]/30",
          platform === "x" && "border-slate-300",
          platform === "youtube" && "border-[#FF0000]/25",
          platform === "instagram" && "border-pink-300/50",
        )}
      >
        {platform === "tiktok" ? <TikTokGlyph /> : null}
        {platform === "facebook" ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] text-xl font-black leading-none text-white">
            f
          </span>
        ) : null}
        {platform === "x" ? (
          <span className="font-mono text-2xl font-black leading-none text-[#0F1419]">X</span>
        ) : null}
        {platform === "youtube" ? <YouTubeGlyph /> : null}
        {platform === "instagram" ? <InstagramGlyph /> : null}
      </span>
      {showLabel ? (
        <span className="text-sm font-semibold text-slate-800">{LABELS[platform]}</span>
      ) : null}
    </div>
  );
}

function TikTokGlyph() {
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center">
      <span className="absolute -left-0.5 top-0 text-3xl font-black leading-none text-[#25F4EE]">♪</span>
      <span className="absolute left-0.5 top-1 text-3xl font-black leading-none text-[#FE2C55]">♪</span>
      <span className="relative text-3xl font-black leading-none text-[#0F1419]">♪</span>
    </span>
  );
}

function YouTubeGlyph() {
  return (
    <span className="inline-flex h-7 w-9 items-center justify-center rounded-lg bg-[#FF0000]">
      <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
    </span>
  );
}

function InstagramGlyph() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]">
      <span className="relative h-4 w-4 rounded-[5px] border-2 border-white">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
        <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-white" />
      </span>
    </span>
  );
}
