// Page language per tool type. The engine and the tool page both read from this
// map, so calculator copy ("Your numbers", the estimate disclaimer) cannot leak
// onto a QR maker or a text generator. Pure data, safe to import on the server.

import type { ToolType } from "@/lib/tools/taxonomy";

export type Shell = {
  /** Heading over the input column. */
  inputsLabel: string;
  /** Heading over the result column. */
  resultLabel: string;
  /** Label on the primary download button. */
  downloadLabel: string;
  /** The one-line intro under "How to use it" on the tool page. */
  howToIntro: string;
  /** Only math tools show the "This is an estimate" disclaimer. */
  showEstimateBadge: boolean;
};

export const SHELLS: Record<ToolType, Shell> = {
  calculator: {
    inputsLabel: "Your numbers",
    resultLabel: "What that means",
    downloadLabel: "Download my result",
    howToIntro: "Takes about two minutes. Be honest with the numbers, the tool is not going to tell anybody.",
    showEstimateBadge: true,
  },
  estimator: {
    inputsLabel: "Your numbers",
    resultLabel: "What that means",
    downloadLabel: "Download my result",
    howToIntro: "Takes about two minutes. Be honest with the numbers, the tool is not going to tell anybody.",
    showEstimateBadge: true,
  },
  generator: {
    inputsLabel: "Your details",
    resultLabel: "Your draft",
    downloadLabel: "Download the text",
    howToIntro: "Fill in what you have. Blank fields still produce a clean draft you can edit.",
    showEstimateBadge: false,
  },
  template: {
    inputsLabel: "Your details",
    resultLabel: "Your document",
    downloadLabel: "Download the document",
    howToIntro: "Fill in the details, then read the document once before you send it.",
    showEstimateBadge: false,
  },
  builder: {
    inputsLabel: "Your details",
    resultLabel: "What you built",
    downloadLabel: "Download it",
    howToIntro: "Enter the pieces and the tool assembles them.",
    showEstimateBadge: false,
  },
  planner: {
    inputsLabel: "Your plan inputs",
    resultLabel: "Your plan",
    downloadLabel: "Download the plan",
    howToIntro: "Set the goal, adjust the numbers, and work the plan week by week.",
    showEstimateBadge: true,
  },
  checker: {
    inputsLabel: "What to check",
    resultLabel: "What we found",
    downloadLabel: "Download the report",
    howToIntro: "Answer honestly. The score only helps if the inputs are true.",
    showEstimateBadge: false,
  },
  scorecard: {
    inputsLabel: "What to score",
    resultLabel: "Your score",
    downloadLabel: "Download the scorecard",
    howToIntro: "Answer honestly. The score only helps if the inputs are true.",
    showEstimateBadge: false,
  },
  converter: {
    inputsLabel: "What to convert",
    resultLabel: "The conversion",
    downloadLabel: "Download the result",
    howToIntro: "Enter what you have and read off what it becomes.",
    showEstimateBadge: false,
  },
  checklist: {
    inputsLabel: "Work through the list",
    resultLabel: "Your progress",
    downloadLabel: "Download the checklist",
    howToIntro: "Check things off as you go. Progress saves in your browser tab.",
    showEstimateBadge: false,
  },
  qr: {
    inputsLabel: "What the code should contain",
    resultLabel: "Your code",
    // Shown only when a tool of this type has no QR on screen yet. The QR block
    // brings its own PNG and SVG buttons, and the engine hides this one then.
    downloadLabel: "Download the code",
    howToIntro: "Enter the content, then scan the preview with your own phone before you print.",
    showEstimateBadge: false,
  },
  link: {
    inputsLabel: "Link details",
    resultLabel: "Your link",
    downloadLabel: "Download the link",
    howToIntro: "Build it, test it, then put it wherever people tap.",
    showEstimateBadge: false,
  },
  "social-preview": {
    inputsLabel: "Your page details",
    resultLabel: "Your preview",
    downloadLabel: "Download the result",
    howToIntro: "Enter the page details and check the preview before you share the link.",
    showEstimateBadge: false,
  },
};
