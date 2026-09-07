import type { Article } from "./articles";

const SITE = "https://www.theleadflowpro.com";

/** An offline guide, not a saved result from a reader's private tool inputs. */
export function articleDownload(article: Article): string {
  const tool = article.tool;
  const walkthrough = tool
    ? [
        `## ${tool.heading}`,
        tool.intro,
        `Open the working tool: ${SITE}/tools/${tool.slug}`,
        ...tool.steps.map(
          (step, index) => `${index + 1}. **${step.name}.** ${step.text}`,
        ),
        "### How to read your result",
        ...tool.readIt.map((line) => `- ${line}`),
      ].join("\n\n")
    : "";
  const body = article.body.includes("{{TOOL}}")
    ? article.body.replace(/^\s*\{\{TOOL\}\}\s*$/gm, walkthrough)
    : [article.body, walkthrough].filter(Boolean).join("\n\n");
  const absoluteLinks = body.replace(/\]\(\/(?!\/)([^)]+)\)/g, `](${SITE}/$1)`);
  return [
    `# ${article.title}`,
    article.description,
    `By Ryan Nichols | The LeadFlow Pro | Published ${article.publishedAt}`,
    `Current guide: ${SITE}/articles/${article.slug}`,
    absoluteLinks,
    ...(article.faq?.length
      ? [
          "## Questions people ask",
          ...article.faq.flatMap((faq) => [`### ${faq.q}`, faq.a]),
        ]
      : []),
    "---",
    "Created by The LeadFlow Pro. When sharing this guide, keep the source link so the next person can find the working tool and latest updates.",
    `https://www.theleadflowpro.com/articles/${article.slug}`,
    "",
  ].join("\n\n");
}
