export const CHATGPT_OPERATOR = {
  code: "OA01",
  slug: "chatgpt-operator",
  title: "Operator Academy 01: The ChatGPT Operator",
  shortTitle: "The ChatGPT Operator",
  purchaseKind: "chatgpt_operator_course",
  productId: "prod_VAi1Zp89m1kjvb",
  foundingPriceId: "price_1UAMbTBHH7tuNwAAjZZY7wNu",
  regularPriceId: "price_1UAMbYBHH7tuNwAACnnJIE4a",
  foundingPriceCents: 29700,
  regularPriceCents: 49700,
  lessonCount: 12,
  levelCount: 4,
  deliverableCount: 4,
  integrationIdentifier: "chatgpt_operator_nyqslfkt",
  promise:
    "Go from random questions to repeatable business work. Build useful images, posts, emails, research, landing pages, client assets, and a complete capstone system with ChatGPT.",
  accessDisclosure:
    "This is a self-guided written course. Access includes twelve lessons, worked examples, the downloadable workbook, prompts, lesson checks, four practical submissions for review, and the final assessment. Read a lesson, do the task, and save your work at your own pace.",
  credentialDisclaimer:
    "This is a private LeadFlow Pro course completion credential issued by Longview Training Center LLC. It is not a degree, professional license, accreditation, state or federal certification, promise of employment, or guarantee of business results.",
} as const;

export const CHATGPT_OPERATOR_LEVELS = [
  {
    number: "01",
    title: "Beginner: Get Useful Results",
    result: "Set up ChatGPT correctly and create work you can use the same day.",
    lessons: [
      {
        code: "CG L01",
        slug: "set-up-a-project-that-remembers-the-work",
        title: "Set Up a Project That Remembers the Work",
        deliverable: false,
      },
      {
        code: "CG L02",
        slug: "give-chatgpt-goal-context-output-and-boundaries",
        title: "Give ChatGPT a Goal, Context, Output, and Boundaries",
        deliverable: false,
      },
      {
        code: "CG L03",
        slug: "build-your-first-business-content-kit",
        title: "Build Your First Business Content Kit",
        deliverable: true,
        deliverableTitle: "Beginner build: business content kit",
      },
    ],
  },
  {
    number: "02",
    title: "Intermediate: Build Business Assets",
    result: "Turn one clear prompt into visual, written, and interactive business assets.",
    lessons: [
      {
        code: "CG L04",
        slug: "create-and-refine-a-professional-image",
        title: "Create and Refine a Professional Image",
        deliverable: false,
      },
      {
        code: "CG L05",
        slug: "write-social-posts-and-emails-that-sound-human",
        title: "Write Social Posts and Emails That Sound Human",
        deliverable: false,
      },
      {
        code: "CG L06",
        slug: "build-a-working-one-page-landing-page",
        title: "Build a Working One Page Landing Page",
        deliverable: true,
        deliverableTitle: "Intermediate build: landing page",
      },
    ],
  },
  {
    number: "03",
    title: "Professional: Research and Deliver",
    result: "Research current information, check the work, and hand a polished result to a client or team.",
    lessons: [
      {
        code: "CG L07",
        slug: "research-current-information-with-sources",
        title: "Research Current Information With Sources",
        deliverable: false,
      },
      {
        code: "CG L08",
        slug: "turn-files-and-notes-into-client-ready-work",
        title: "Turn Files and Notes Into Client Ready Work",
        deliverable: false,
      },
      {
        code: "CG L09",
        slug: "run-a-quality-control-and-revision-loop",
        title: "Run a Quality Control and Revision Loop",
        deliverable: true,
        deliverableTitle: "Professional build: verified client deliverable",
      },
    ],
  },
  {
    number: "04",
    title: "Expert: Operate a Complete System",
    result: "Design a repeatable workflow that moves from input to finished business outcome.",
    lessons: [
      {
        code: "CG L10",
        slug: "design-a-repeatable-ai-workflow",
        title: "Design a Repeatable AI Workflow",
        deliverable: false,
      },
      {
        code: "CG L11",
        slug: "protect-data-control-actions-and-review-results",
        title: "Protect Data, Control Actions, and Review Results",
        deliverable: false,
      },
      {
        code: "CG L12",
        slug: "build-and-submit-the-operator-capstone",
        title: "Build and Submit the Operator Capstone",
        deliverable: true,
        deliverableTitle: "Expert build: ChatGPT Operator capstone",
      },
    ],
  },
] as const;

export type ChatGPTOperatorLesson = {
  code: string;
  slug: string;
  title: string;
  deliverable: boolean;
  deliverableTitle?: string;
};

export const CHATGPT_OPERATOR_LESSONS: readonly ChatGPTOperatorLesson[] =
  CHATGPT_OPERATOR_LEVELS.flatMap(
    (level) => [...level.lessons] as readonly ChatGPTOperatorLesson[],
  );

export function chatgptOperatorLesson(slug: string): ChatGPTOperatorLesson | null {
  return CHATGPT_OPERATOR_LESSONS.find((lesson) => lesson.slug === slug) ?? null;
}

export function formatChatGPTCoursePrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
