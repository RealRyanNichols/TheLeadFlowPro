import type { ReactElement } from "react";
import type { Article } from "./articles";

export const ARTICLE_OG_SIZE = { width: 1200, height: 630 } as const;

const NAVY = "#050D1B";
const WHITE = "#F8FBFF";
const MUTED = "#C3D0E0";

const PREMIUM_ARTICLE_ART: Record<string, string> = {
  "pressure-washing-pricing":
    "/images/articles-v3/pressure-washing-pricing-scene.webp",
  "pest-control-customer-value":
    "/images/articles-v3/pest-control-customer-value-scene.webp",
  "tree-service-buy-or-rent-equipment":
    "/images/articles-v3/tree-service-buy-or-rent-equipment-scene.webp",
};

const PREMIUM_ARTICLE_ALT: Record<string, string> = {
  "pressure-washing-pricing":
    "A pressure-washing wand crossing three illuminated pricing checkpoints on wet concrete",
  "pest-control-customer-value":
    "A home connected to seasonal pest-control service points and one long-term customer record",
  "tree-service-buy-or-rent-equipment":
    "A professional wood chipper above crossing ownership and rental cost lines",
};

const CURATED_TAKEAWAYS: Record<string, string> = {
  "pressure-washing-pricing": "Labor. Materials. Margin. Price all three.",
  "pest-control-customer-value": "One treatment is a sale. Retention builds value.",
  "tree-service-buy-or-rent-equipment": "Buy only when real usage crosses rental cost.",
  "east-texas-business-website-guide":
    "A useful website answers the buying question before the call.",
  "the-money-is-in-the-follow-up":
    "Most leads are not lost. They are simply left behind.",
  "cost-of-renting-business-software":
    "Renting is convenient until the monthly total owns the decision.",
  "data-centers-are-coming-to-texas":
    "Growth matters only when the infrastructure can carry it.",
};

const OG_LAYOUTS: Record<
  string,
  { direction: "row" | "row-reverse" | "column-reverse"; panel: number; imagePosition: string }
> = {
  "pressure-washing-pricing": {
    direction: "row",
    panel: 47,
    imagePosition: "64% 50%",
  },
  "pest-control-customer-value": {
    direction: "column-reverse",
    panel: 44,
    imagePosition: "50% 40%",
  },
  "tree-service-buy-or-rent-equipment": {
    direction: "row-reverse",
    panel: 43,
    imagePosition: "38% 50%",
  },
};

export function articlePremiumArtPath(slug: string) {
  return PREMIUM_ARTICLE_ART[slug] ?? null;
}

export function articlePremiumArtAlt(slug: string) {
  return PREMIUM_ARTICLE_ALT[slug] ?? "A visual explainer from The LeadFlow Pro";
}

export function articleSocialImagePath(slug: string) {
  return `/articles/${slug}/opengraph-image`;
}

function words(value: string) {
  return value
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function articleTakeaway(description: string, slug?: string) {
  if (slug && CURATED_TAKEAWAYS[slug]) return CURATED_TAKEAWAYS[slug];
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description;
  const selected = words(firstSentence).slice(0, 11).join(" ");
  return selected.length < firstSentence.length ? `${selected}...` : selected;
}

function titleSize(title: string, horizontal: boolean) {
  if (title.length > 70) return horizontal ? 41 : 45;
  if (title.length > 56) return horizontal ? 46 : 50;
  if (title.length > 42) return horizontal ? 51 : 56;
  return horizontal ? 58 : 62;
}

type ArticleOgCardProps = {
  article: Article;
  backgroundUrl: string;
};

export function articleOgCard({ article, backgroundUrl }: ArticleOgCardProps): ReactElement {
  const premiumArt = articlePremiumArtPath(article.slug);

  if (!premiumArt) {
    return (
      <div style={{ display: "flex", width: "100%", height: "100%", background: NAVY }}>
        <img
          src={backgroundUrl}
          alt=""
          width={ARTICLE_OG_SIZE.width}
          height={ARTICLE_OG_SIZE.height}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  const layout = OG_LAYOUTS[article.slug] ?? OG_LAYOUTS["pressure-washing-pricing"];
  const horizontal = layout.direction !== "column-reverse";
  const panelStyle = horizontal
    ? { width: `${layout.panel}%`, height: "100%" }
    : { width: "100%", height: `${layout.panel}%` };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        flexDirection: layout.direction,
        background: NAVY,
        color: WHITE,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <img
        src={backgroundUrl}
        alt=""
        width={ARTICLE_OG_SIZE.width}
        height={ARTICLE_OG_SIZE.height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: layout.imagePosition,
        }}
      />

      <div
        style={{
          ...panelStyle,
          display: "flex",
          position: "relative",
          flexDirection: "column",
          justifyContent: horizontal ? "space-between" : "flex-start",
          padding: horizontal ? "48px 50px 44px" : "30px 54px 34px",
          background: "rgba(5, 13, 27, 0.94)",
        }}
      >
        <div
          style={{
            display: "flex",
            color: WHITE,
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          The LeadFlow <span style={{ color: "#3264FF" }}>Pro</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: horizontal ? 0 : 16,
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: horizontal ? 465 : 1080,
              fontSize: titleSize(article.title, horizontal),
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
            }}
          >
            {article.title}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: horizontal ? 450 : 1050,
              marginTop: 19,
              color: MUTED,
              fontSize: horizontal ? 22 : 24,
              lineHeight: 1.26,
            }}
          >
            {articleTakeaway(article.description, article.slug)}
          </div>
        </div>

      </div>
    </div>
  );
}
