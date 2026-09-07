import assert from "node:assert/strict";
import test from "node:test";
import { articleDownload } from "../lib/articleDownload";
import { getPublishedArticles } from "../lib/articles";

test("every published downloadable guide keeps attribution, working links, tool steps and FAQ", () => {
  for (const article of getPublishedArticles()) {
    const text = articleDownload(article);
    assert.ok(text.includes(article.title));
    assert.ok(
      text.includes(`https://www.theleadflowpro.com/articles/${article.slug}`),
    );
    assert.doesNotMatch(text, /\{\{TOOL\}\}/);
    assert.doesNotMatch(text, /\]\(\/(?!\/)/);
    if (article.tool) {
      assert.ok(
        text.includes(
          `https://www.theleadflowpro.com/tools/${article.tool.slug}`,
        ),
      );
      for (const step of article.tool.steps)
        assert.ok(text.includes(step.text));
      for (const detail of article.tool.readIt)
        assert.ok(text.includes(detail));
    }
    for (const faq of article.faq ?? []) assert.ok(text.includes(faq.a));
  }
});
