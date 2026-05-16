import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { BUILT_PROJECTS } from "@/lib/built-projects";

type BuiltProject = (typeof BUILT_PROJECTS)[number];

type BuiltProjectCardProps = {
  project: BuiltProject;
  variant?: "dark" | "light";
  density?: "mini" | "compact" | "full";
  showProof?: boolean;
  showAngle?: boolean;
  className?: string;
};

export function BuiltProjectCard({
  project,
  variant = "dark",
  density = "compact",
  showProof = false,
  showAngle = false,
  className = "",
}: BuiltProjectCardProps) {
  const dark = variant === "dark";
  const mini = density === "mini";
  const compact = density !== "full";
  const cardStyle = {
    borderColor: dark ? project.theme.darkBorder : project.theme.lightBorder,
    background: dark ? project.theme.darkBackground : project.theme.lightBackground,
    boxShadow: dark
      ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 42px -34px ${project.theme.primary}`
      : `0 20px 48px -34px ${project.theme.primary}`,
  } satisfies CSSProperties;
  const logoStyle = {
    background: project.theme.logoBackground,
    boxShadow: `0 16px 30px -18px ${project.theme.primary}`,
  } satisfies CSSProperties;
  const ctaStyle = {
    borderColor: dark ? "rgba(255,255,255,0.14)" : project.theme.lightBorder,
    color: dark ? "#F8FAFC" : project.theme.primary,
    background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
  } satisfies CSSProperties;

  return (
    <Link
      href={project.href}
      target="_blank"
      rel="noreferrer"
      style={cardStyle}
      className={`group flex min-h-full flex-col rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-xl ${
        mini ? "p-2.5" : compact ? "p-3" : "p-5"
      } ${
        dark ? "text-white" : "text-slate-950"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          aria-label={project.logoLabel}
          style={logoStyle}
          className={`flex shrink-0 items-center justify-center rounded-xl border border-white/30 font-black tracking-tight text-white ${
            mini ? "h-10 w-10 text-xs" : compact ? "h-11 w-11 text-sm" : "h-14 w-14 text-base"
          }`}
        >
          {project.logoText}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold leading-snug ${mini ? "text-sm" : ""} ${dark ? "text-white" : "text-slate-950"}`}>
            {project.name}
          </div>
          <div
            className={`break-words font-semibold uppercase ${
              mini ? "mt-0.5 text-[0.66rem] leading-4 tracking-[0.14em]" : "mt-1 text-xs leading-5 tracking-widest"
            } ${
              dark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {project.type}
          </div>
        </div>
        <ExternalLink
          className={`mt-1 h-4 w-4 shrink-0 transition group-hover:scale-110 ${
            dark ? "text-white/60 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
          }`}
        />
      </div>

      {showProof ? (
        <p className={`mt-4 text-sm leading-6 ${dark ? "text-slate-200" : "text-slate-700"}`}>
          {project.proof}
        </p>
      ) : null}

      {showAngle ? (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm font-semibold leading-6 ${
            dark ? "border-white/10 bg-white/10 text-slate-100" : "border-white/70 bg-white/75 text-slate-800"
          }`}
        >
          {project.angle}
        </div>
      ) : null}

      <div className={`${mini ? "mt-2.5" : "mt-4"} flex`}>
        <span
          style={ctaStyle}
          className={`inline-flex items-center gap-1.5 rounded-full border font-black uppercase tracking-widest transition group-hover:gap-2 ${
            mini ? "px-2.5 py-1 text-[0.62rem]" : "px-3 py-1.5 text-xs"
          }`}
        >
          View build <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
