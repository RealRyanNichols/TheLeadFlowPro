// A draft with every [blank] marked, so the owner sees at a glance what to
// fill in before posting. Line breaks are kept. A screen reader hears
// "(fill in)" after each blank, because a highlight alone says nothing.
//
// No hooks and no browser calls: safe in server and client components.

// The same shape the idea engine counts (lib/postCreator/ideas/drafts.ts
// findBlanks), with a capture group so split() keeps the blanks.
const BLANK_SPLIT = /(\[[^\]\n]{1,60}\])/;
const BLANK_WHOLE = /^\[[^\]\n]{1,60}\]$/;

export default function BlankText({ text }: { text: string }) {
  const parts = text.split(BLANK_SPLIT);
  return (
    <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {parts.map((part, i) =>
        BLANK_WHOLE.test(part) ? (
          <mark
            key={i}
            className="rounded-[4px] border-b-2 border-dashed border-[var(--warn)] bg-[var(--warn-tint)] px-0.5 text-[var(--heading)]"
          >
            {part}
            <span className="sr-only"> (fill in)</span>
          </mark>
        ) : part ? (
          <span key={i}>{part}</span>
        ) : null,
      )}
    </span>
  );
}
