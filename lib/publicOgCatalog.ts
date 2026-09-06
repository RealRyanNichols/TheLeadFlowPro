import { getPublishedArticles } from "./articles";
import { OPERATOR_ACADEMY_COURSES } from "./operatorAcademyCatalog";
import { PUBLIC_PAGE_CATALOG } from "./publicPageCatalog";
import {
  isCanonicalPublicPath,
  publicPageImagePath,
} from "./publicPageMetadata";
import { SCOREBOARD_BUSINESSES } from "./scoreboard";
import { METRIC_GUIDES, metricDefinition } from "./scoreboardMetrics";
import { STAGES } from "./system-stages";
import { TOOLS } from "./tools";
import { TOOL_VISUALS } from "./tools/visuals";
import { PUBLISHED_COLLECTIONS } from "./tools/collections";
import { PRO_TOOLS, PRO_TOOL_VISUALS } from "./tools/pro";

export type PublicOgPage = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  art?: string;
  imagePath: string;
  index: boolean;
};

function generated(
  page: Omit<PublicOgPage, "imagePath" | "index"> & { index?: boolean },
): PublicOgPage {
  return {
    ...page,
    imagePath: publicPageImagePath(page.path),
    index: page.index !== false,
  };
}

/** Finite, source-controlled records only. No database records or query parameters are read here. */
export function getPublicOgPages(now = new Date()): PublicOgPage[] {
  return [
    ...PUBLIC_PAGE_CATALOG.map((page) => generated(page)),
    ...STAGES.map((stage) =>
      generated({
        path: `/system/${stage.slug}`,
        title: `${stage.name}: ${stage.short}`,
        description: stage.description,
        eyebrow: `Build the business · ${stage.num}`,
      }),
    ),
    ...OPERATOR_ACADEMY_COURSES.map((course) =>
      generated({
        path: `/training/${course.slug}`,
        title: course.shortTitle,
        description: course.description,
        eyebrow: `${course.code} · Operator Academy`,
        art: `/images/academy/cards/${course.slug}.svg`,
      }),
    ),
    ...SCOREBOARD_BUSINESSES.map((business) =>
      generated({
        path: `/scoreboard/${business.slug}`,
        title: `${business.shortName} scoreboard`,
        description: business.what,
        eyebrow: "Real business records",
      }),
    ),
    ...METRIC_GUIDES.map((metric) =>
      generated({
        path: `/scoreboard/metrics/${metric.slug}`,
        title: `Understand ${metric.title.toLowerCase()}`,
        description: metricDefinition(metric.key).what,
        eyebrow: "Read the scoreboard",
      }),
    ),
    ...TOOLS.map((tool) => ({
      path: `/tools/${tool.slug}`,
      title: tool.name,
      description: tool.description,
      eyebrow: "Free working tool",
      imagePath:
        TOOL_VISUALS[tool.slug]?.ogImage ??
        `/tools/${tool.slug}/opengraph-image`,
      index: true,
    })),
    ...PRO_TOOLS.map((tool) => ({
      path: `/tools/pro/${tool.slug}`,
      title: tool.name,
      description: tool.description,
      eyebrow: "Pro Kit",
      imagePath:
        PRO_TOOL_VISUALS[tool.slug]?.ogImage ??
        publicPageImagePath(`/tools/pro/${tool.slug}`),
      index: true,
    })),
    ...PUBLISHED_COLLECTIONS.map((collection) => ({
      path: `/tools/collections/${collection.slug}`,
      title: collection.title,
      description: collection.hook,
      eyebrow: "Curated free tools",
      imagePath: `/tools/collections/${collection.slug}/opengraph-image`,
      index: true,
    })),
    ...getPublishedArticles(now).map((article) => ({
      path: `/articles/${article.slug}`,
      title: article.title,
      description: article.description,
      eyebrow: "A practical business guide",
      imagePath: `/articles/${article.slug}/opengraph-image`,
      index: true,
    })),
  ];
}

export function getPublicOgPage(
  path: string,
  now = new Date(),
): PublicOgPage | undefined {
  if (!isCanonicalPublicPath(path)) return undefined;
  return getPublicOgPages(now).find((page) => page.path === path);
}
