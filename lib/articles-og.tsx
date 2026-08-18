import type { ReactElement } from "react";
import type { Article } from "./articles";

export const ARTICLE_OG_SIZE = { width: 1200, height: 630 } as const;

const NAVY = "#071426";
const NAVY_PANEL = "#0B1D35";
const WHITE = "#F7FBFF";
const MUTED = "#B9C8DB";
const CYAN = "#48D5FF";
const COBALT = "#2E63FF";

export function articleSocialImagePath(slug: string) {
  return `/articles/${slug}/opengraph-image`;
}

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

function titleSize(title: string) {
  if (title.length > 70) return 42;
  if (title.length > 58) return 46;
  if (title.length > 44) return 50;
  return 56;
}

type ArticleOgCardProps = {
  article: Article;
  backgroundUrl: string;
};

/**
 * A single premium composition for every article preview. The right panel uses
 * the article's existing visual asset, while the left turns the approved title
 * and description into a fast, uncluttered explanation.
 */
export function articleOgCard({ article, backgroundUrl }: ArticleOgCardProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: NAVY,
        color: WHITE,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: 704,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 48px 50px 64px",
          background: NAVY_PANEL,
          borderRight: `2px solid ${COBALT}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ display: "flex", width: 46, height: 4, background: CYAN }} />
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.3,
            }}
          >
            <span style={{ display: "flex", color: WHITE }}>The LeadFlow</span>
            <span style={{ display: "flex", color: CYAN }}>Pro</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            paddingBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              color: WHITE,
              fontSize: titleSize(article.title),
              fontWeight: 900,
              letterSpacing: -1.8,
              lineHeight: 1.04,
              maxWidth: 590,
            }}
          >
            {article.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 30,
              maxWidth: 590,
            }}
          >
            <div style={{ display: "flex", width: 7, height: 48, borderRadius: 7, background: CYAN }} />
            <div
              style={{
                display: "flex",
                color: MUTED,
                fontSize: 29,
                fontWeight: 700,
                lineHeight: 1.22,
              }}
            >
              {articleTakeaway(article.description, article.slug)}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          width: 496,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "45px 34px 45px 30px",
          background: NAVY,
        }}
      >
        <div
          style={{
            width: 430,
            height: 540,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            border: `2px solid ${CYAN}`,
            background: "#0E223D",
          }}
        >
          {/* The original article asset supplies the subject matter. The crop
              favors its explanatory side and avoids adding fake illustration. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundUrl}
            alt=""
            width={1029}
            height={540}
            style={{
              position: "absolute",
              top: 0,
              left: -599,
              width: 1029,
              height: 540,
            }}
          />
        </div>
      </div>
    </div>
  );
}
