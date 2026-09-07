"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, Search, X } from "lucide-react";
import {
  ARTICLE_PAGE_SIZE,
  ARTICLE_TOPICS,
  filterArticleEntries,
  type ArticleLibraryEntry,
  type ArticleTopic,
} from "./article-library";
import styles from "./article-library.module.css";

type Props = { entries: ArticleLibraryEntry[]; children: ReactNode };

export default function ArticleLibrary({ entries, children }: Props) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<ArticleTopic>("all");
  const [limit, setLimit] = useState(ARTICLE_PAGE_SIZE);
  const [nextFocus, setNextFocus] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cards = Children.toArray(children);
  const matches = filterArticleEntries(entries, query, topic);
  const visible = new Set(matches.slice(0, limit).map((entry) => entry.slug));
  const filtered = query.trim().length > 0 || topic !== "all";
  const remaining = Math.max(0, matches.length - limit);

  useEffect(() => {
    if (!nextFocus) return;
    gridRef.current?.querySelector<HTMLAnchorElement>(`[data-article-card="${CSS.escape(nextFocus)}"] a`)?.focus();
    setNextFocus(null);
  }, [nextFocus]);

  function clear() {
    setQuery("");
    setTopic("all");
    setLimit(ARTICLE_PAGE_SIZE);
    searchRef.current?.focus();
  }

  return (
    <div className={styles.library} data-article-library>
      <noscript>
        <style>{'[data-article-library] [data-article-controls] { display: none !important; } [data-article-library] [data-article-card][hidden] { display: block !important; }'}</style>
        <p className={styles.noScript}>All {entries.length} guides are listed below. Open any guide to read it.</p>
      </noscript>

      <div className={styles.controls} data-article-controls>
        <label className={styles.label} htmlFor="article-search">What do you want to work on?</label>
        <div className={styles.search}>
          <Search aria-hidden="true" size={21} />
          <input
            id="article-search"
            ref={searchRef}
            type="search"
            placeholder="Try missed calls, pricing, QR codes…"
            value={query}
            maxLength={160}
            onChange={(event) => { setQuery(event.target.value); setLimit(ARTICLE_PAGE_SIZE); }}
            aria-controls="article-results"
          />
        </div>
        <div className={styles.topics} role="group" aria-label="Filter guides by task">
          {ARTICLE_TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={topic === item.id}
              aria-controls="article-results"
              onClick={() => { setTopic(item.id); setLimit(ARTICLE_PAGE_SIZE); }}
            >
              {item.label}
              <span>{item.id === "all" ? entries.length : entries.filter((entry) => entry.topics.includes(item.id)).length}</span>
            </button>
          ))}
        </div>
        <div className={styles.resultRow}>
          <p role="status" aria-live="polite" aria-atomic="true">
            {matches.length === 0
              ? "No guides match your search."
              : `Showing ${Math.min(limit, matches.length)} of ${matches.length} ${filtered ? "matching " : ""}guides`}
          </p>
          {filtered ? <button className={styles.clear} type="button" onClick={clear}>Clear filters <X aria-hidden="true" size={16} /></button> : <span>Newest first</span>}
        </div>
      </div>

      <div ref={gridRef} id="article-results" className={`sv-index-grid sv-article-feature-grid ${styles.grid}`}>
        {entries.map((entry, index) => (
          <div key={entry.slug} className={styles.card} data-article-card={entry.slug} hidden={!visible.has(entry.slug)}>
            {cards[index]}
          </div>
        ))}
      </div>

      {matches.length === 0 ? (
        <div className={styles.empty} data-article-controls>
          <h3>Try the task, not the exact title.</h3>
          <p>Search for a few words like “missed call” or “cash,” or clear the filters to browse every guide.</p>
          <button type="button" onClick={clear}>Show all guides</button>
        </div>
      ) : null}

      {remaining > 0 ? (
        <div className={styles.more} data-article-controls>
          <button type="button" aria-controls="article-results" onClick={() => { setNextFocus(matches[limit]?.slug ?? null); setLimit((current) => current + ARTICLE_PAGE_SIZE); }}>
            Show {Math.min(ARTICLE_PAGE_SIZE, remaining)} more guides <ArrowDown aria-hidden="true" size={18} />
          </button>
          <span>{remaining} more to explore</span>
        </div>
      ) : null}
    </div>
  );
}
