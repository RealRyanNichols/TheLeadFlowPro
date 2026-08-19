import type { ReactElement } from "react";
import type { Article } from "./articles";

export const ARTICLE_OG_SIZE = { width: 1200, height: 630 } as const;

const NAVY = "#071426";
const WHITE = "#F7FBFF";
const MUTED = "#B9C8DB";
const CYAN = "#48D5FF";

const CURATED_TAKEAWAYS: Record<string, string> = {
  "east-texas-business-website-guide":
    "What a local business website must do and what it should cost.",
  "ai-website-small-business-2026":
    "What AI genuinely changes about building a business website and system.",
  "restaurant-delivery-app-fees":
    "What third-party delivery really costs your restaurant per order and year.",
  "salon-google-reviews": "The review ask that works and the one-tap link.",
  "trucking-cost-per-mile": "Know your cost per mile before deciding whether a load pays.",
  "tree-service-buy-or-rent-equipment": "Big iron can quietly become the thing that owns you.",
  "fencing-contractor-raise-prices": "You do not need more customers to make more money.",
  "plumber-call-back-speed": "A homeowner with water on the floor calls until somebody answers.",
  "electrician-job-capacity": "Know your real weekly capacity before saying yes to another job.",
  "painting-contractor-markup-vs-margin":
    "Adding fifty percent does not give you a fifty percent margin.",
};

const VISUAL_FAMILIES = {
  money: {
    label: "PRICE & PROFIT",
    accent: "#FFC44D",
    panel: "#162036",
  },
  response: {
    label: "LEADS & FOLLOW-UP",
    accent: CYAN,
    panel: "#0A2137",
  },
  ownership: {
    label: "OWNERSHIP & CONTROL",
    accent: "#42E38C",
    panel: "#0A2430",
  },
  capacity: {
    label: "CAPACITY & DELIVERY",
    accent: "#8E9BFF",
    panel: "#131D3B",
  },
  visibility: {
    label: "VISIBILITY & GROWTH",
    accent: "#5AB8FF",
    panel: "#0C2140",
  },
  operator: {
    label: "OPERATOR FIELD NOTE",
    accent: "#FF8F66",
    panel: "#1B2135",
  },
} as const;

type VisualFamily = keyof typeof VISUAL_FAMILIES;

const RESPONSE_WORDS = [
  "missed-call",
  "follow-up",
  "after-hours",
  "unclosed-quotes",
  "call-back",
  "no-show",
  "leads",
];
const OWNERSHIP_WORDS = [
  "renting-business-software",
  "marketplace-is-not",
  "own-your-email",
  "facebook-page-is-not",
  "website-builder-monthly",
  "need-a-crm",
];
const CAPACITY_WORDS = ["capacity", "hire-or-stay", "drive-time", "downtime", "late-pickup"];
const VISIBILITY_WORDS = [
  "google",
  "seo",
  "reviews",
  "traffic",
  "slow-website",
  "ai-website",
  "east-texas-business",
];
const OPERATOR_WORDS = ["data-centers"];

function matchesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function familyForSlug(slug: string): VisualFamily {
  if (matchesAny(slug, RESPONSE_WORDS)) return "response";
  if (matchesAny(slug, OWNERSHIP_WORDS)) return "ownership";
  if (matchesAny(slug, CAPACITY_WORDS)) return "capacity";
  if (matchesAny(slug, VISIBILITY_WORDS)) return "visibility";
  if (matchesAny(slug, OPERATOR_WORDS)) return "operator";
  return "money";
}

function stableLayout(slug: string) {
  const hash = [...slug].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
  return hash % 4;
}

export function articleVisualIdentity(article: Pick<Article, "slug">) {
  const family = familyForSlug(article.slug);
  return {
    family,
    layout: stableLayout(article.slug),
    ...VISUAL_FAMILIES[family],
  };
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

/**
 * Pulls a short takeaway from copy Ryan has already approved. It never invents
 * a claim, and it stays short enough to remain readable in a social feed.
 */
export function articleTakeaway(description: string, slug?: string) {
  if (slug && CURATED_TAKEAWAYS[slug]) return CURATED_TAKEAWAYS[slug];

  const clean = description.replace(/\s+/g, " ").trim();
  const sentences = (clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [clean]).map((sentence) =>
    sentence.trim(),
  );

  for (let index = 0; index < sentences.length; index += 1) {
    const sentenceWords = words(sentences[index]);
    if (sentenceWords.length >= 6 && sentenceWords.length <= 12) return sentences[index];

    if (sentenceWords.length < 6 && sentences[index + 1]) {
      const combined = `${sentences[index]} ${sentences[index + 1]}`;
      const combinedWords = words(combined);
      if (combinedWords.length >= 6 && combinedWords.length <= 12) return combined;
    }
  }

  return `${words(sentences[0]).slice(0, 11).join(" ")}...`;
}

function titleSize(title: string, wide = false) {
  if (title.length > 70) return wide ? 43 : 39;
  if (title.length > 58) return wide ? 48 : 43;
  if (title.length > 44) return wide ? 53 : 47;
  return wide ? 60 : 54;
}

type ArticleOgCardProps = {
  article: Article;
  backgroundUrl: string;
};

function Wordmark({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ display: "flex", width: 38, height: 4, background: accent }} />
      <div style={{ display: "flex", fontSize: 21, fontWeight: 800, letterSpacing: -0.3 }}>
        <span style={{ display: "flex", color: WHITE }}>The LeadFlow</span>
        <span style={{ display: "flex", color: accent }}>Pro</span>
      </div>
    </div>
  );
}

function CategoryLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: accent,
        fontSize: 18,
        fontWeight: 900,
        letterSpacing: 2.6,
      }}
    >
      <span style={{ display: "flex", width: 10, height: 10, borderRadius: 10, background: accent }} />
      {label}
    </div>
  );
}

function Takeaway({ article, accent }: { article: Article; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 680 }}>
      <div style={{ display: "flex", width: 7, height: 48, borderRadius: 7, background: accent }} />
      <div style={{ display: "flex", color: MUTED, fontSize: 27, fontWeight: 700, lineHeight: 1.2 }}>
        {articleTakeaway(article.description, article.slug)}
      </div>
    </div>
  );
}

function VisualCrop({
  backgroundUrl,
  width,
  height,
  scale = 1,
}: {
  backgroundUrl: string;
  width: number;
  height: number;
  scale?: number;
}) {
  const imageWidth = 1200 * scale;
  const imageHeight = 630 * scale;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backgroundUrl}
        alt=""
        width={imageWidth}
        height={imageHeight}
        style={{
          position: "absolute",
          top: (height - imageHeight) / 2,
          left: width - imageWidth,
          width: imageWidth,
          height: imageHeight,
        }}
      />
    </div>
  );
}

function SplitImageLeft({ article, backgroundUrl }: ArticleOgCardProps) {
  const visual = articleVisualIdentity(article);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: NAVY }}>
      <div
        style={{
          width: 500,
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          borderRight: `6px solid ${visual.accent}`,
        }}
      >
        <VisualCrop backgroundUrl={backgroundUrl} width={500} height={630} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(7,20,38,.04), rgba(7,20,38,.5))",
          }}
        />
      </div>
      <div
        style={{
          width: 700,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 54px 50px",
          background: visual.panel,
        }}
      >
        <Wordmark accent={visual.accent} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <CategoryLabel label={visual.label} accent={visual.accent} />
          <div
            style={{
              display: "flex",
              color: WHITE,
              fontSize: titleSize(article.title),
              fontWeight: 900,
              letterSpacing: -1.7,
              lineHeight: 1.02,
            }}
          >
            {article.title}
          </div>
          <Takeaway article={article} accent={visual.accent} />
        </div>
      </div>
    </div>
  );
}

function HorizontalStory({ article, backgroundUrl }: ArticleOgCardProps) {
  const visual = articleVisualIdentity(article);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: visual.panel,
      }}
    >
      <div
        style={{
          height: 408,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "46px 62px 34px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark accent={visual.accent} />
          <CategoryLabel label={visual.label} accent={visual.accent} />
        </div>
        <div
          style={{
            display: "flex",
            color: WHITE,
            fontSize: titleSize(article.title, true),
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1,
            maxWidth: 1040,
          }}
        >
          {article.title}
        </div>
        <Takeaway article={article} accent={visual.accent} />
      </div>
      <div style={{ display: "flex", height: 222, borderTop: `6px solid ${visual.accent}` }}>
        <VisualCrop backgroundUrl={backgroundUrl} width={1200} height={222} scale={2} />
      </div>
    </div>
  );
}

function ImmersivePanel({ article, backgroundUrl }: ArticleOgCardProps) {
  const visual = articleVisualIdentity(article);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: NAVY,
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <VisualCrop backgroundUrl={backgroundUrl} width={1200} height={630} scale={2} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(90deg, rgba(7,20,38,.98) 0%, rgba(7,20,38,.90) 47%, rgba(7,20,38,.26) 100%)",
        }}
      />
      <div
        style={{
          width: 760,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          padding: "50px 60px 54px",
        }}
      >
        <Wordmark accent={visual.accent} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <CategoryLabel label={visual.label} accent={visual.accent} />
          <div
            style={{
              display: "flex",
              color: WHITE,
              fontSize: titleSize(article.title, true),
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {article.title}
          </div>
          <Takeaway article={article} accent={visual.accent} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 46,
          top: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 128,
          height: 128,
          borderRadius: 64,
          border: `3px solid ${visual.accent}`,
          background: "rgba(7,20,38,.72)",
          color: visual.accent,
          fontSize: 32,
          fontWeight: 900,
        }}
      >
        READ
      </div>
    </div>
  );
}

function SplitImageRight({ article, backgroundUrl }: ArticleOgCardProps) {
  const visual = articleVisualIdentity(article);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: NAVY }}>
      <div
        style={{
          width: 716,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "50px 54px 52px 62px",
          background: visual.panel,
          borderTop: `16px solid ${visual.accent}`,
        }}
      >
        <Wordmark accent={visual.accent} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <CategoryLabel label={visual.label} accent={visual.accent} />
          <div
            style={{
              display: "flex",
              color: WHITE,
              fontSize: titleSize(article.title),
              fontWeight: 900,
              letterSpacing: -1.8,
              lineHeight: 1.02,
            }}
          >
            {article.title}
          </div>
          <Takeaway article={article} accent={visual.accent} />
        </div>
      </div>
      <div
        style={{
          width: 484,
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          borderLeft: `2px solid ${visual.accent}`,
        }}
      >
        <VisualCrop backgroundUrl={backgroundUrl} width={484} height={630} />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            display: "flex",
            width: 16,
            height: "100%",
            background: visual.accent,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Every article receives a stable visual family and one of four compositions.
 * The family makes the subject recognizable. The layout hash prevents adjacent
 * cards in the same subject family from becoming a repeated wall of templates.
 */
export function articleOgCard({ article, backgroundUrl }: ArticleOgCardProps): ReactElement {
  const { layout } = articleVisualIdentity(article);
  if (layout === 0) return <SplitImageLeft article={article} backgroundUrl={backgroundUrl} />;
  if (layout === 1) return <HorizontalStory article={article} backgroundUrl={backgroundUrl} />;
  if (layout === 2) return <ImmersivePanel article={article} backgroundUrl={backgroundUrl} />;
  return <SplitImageRight article={article} backgroundUrl={backgroundUrl} />;
}
