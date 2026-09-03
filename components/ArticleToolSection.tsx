import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ToolEngine from "@/components/tools/ToolEngine";
import ArticleLeadForm from "@/components/ArticleLeadForm";
import type { ArticleTool } from "@/lib/articles";

// The working half of an article: run the tool, learn to read it, ask for help.
//
// Reading about a number does not change anybody's mind. Seeing their own number
// does. So the tool is inside the article, not a link out to it, and the steps
// under it teach the reader to run it again next quarter without me.
export default function ArticleToolSection({
  tool,
  articleSlug,
}: {
  tool: ArticleTool;
  articleSlug: string;
}) {
  return (
    <section className="not-prose my-12" id="tool">
      <h2 className="text-[26px] font-extrabold leading-tight text-[var(--text)]">
        {tool.heading}
      </h2>
      <p className="mt-3 text-[16px] leading-relaxed text-[var(--quiet)]">{tool.intro}</p>

      <div className="mt-6">
        <ToolEngine slug={tool.slug} />
      </div>

      <h3 className="mt-10 text-[20px] font-extrabold text-[var(--text)]">
        How to run it, step by step
      </h3>
      <ol className="mt-4 grid gap-3">
        {tool.steps.map((s, i) => (
          <li
            key={s.name}
            className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--fill-1)] p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--blue)] text-[13px] font-bold text-white">
              {i + 1}
            </span>
            <span className="text-[15px] leading-relaxed text-[var(--quiet)]">
              <strong className="text-[var(--text)]">{s.name}.</strong> {s.text}
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mt-8 text-[20px] font-extrabold text-[var(--text)]">
        How to read what it gives you
      </h3>
      <ul className="mt-4 grid gap-2">
        {tool.readIt.map((r) => (
          <li key={r} className="flex gap-2.5 text-[15px] leading-relaxed text-[var(--quiet)]">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue)]" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-[15px] text-[var(--quiet)]">
        The tool is free, it does not expire, and you can{" "}
        <Link className="text-[var(--blue)] underline" href={`/tools/${tool.slug}`}>
          put it on your own website
        </Link>{" "}
        if you want it there. Nothing on this page is locked.
      </p>

      <ArticleLeadForm
        heading={tool.formHeading}
        lead={tool.formLead}
        interest={tool.interest}
        industry={tool.industry}
        articleSlug={articleSlug}
        toolSlug={tool.slug}
      />

      <p className="mt-5 text-[15px] text-[var(--quiet)]">
        Not ready to talk?{" "}
        <Link className="inline-flex items-center gap-1 text-[var(--blue)] underline" href="/tools">
          Browse the rest of the free tools
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </p>
    </section>
  );
}
