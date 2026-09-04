export const CONTENT_ENGINE = {
  code: "OA02",
  slug: "content-engine",
  title: "Operator Academy 02: The Content Engine",
  shortTitle: "The Content Engine",
  purchaseKind: "content_engine_course",
  productId: "prod_VAJ3jHe1x0yQzY",
  foundingPriceId: "price_1U9yRrBHH7tuNwAAX4P9pRl8",
  regularPriceId: "price_1U9yS8BHH7tuNwAAE0YjnotO",
  foundingPriceCents: 12700,
  regularPriceCents: 19700,
  coreLessonCount: 12,
  assignmentCount: 12,
  readyBackgroundCount: 98,
  integrationIdentifier: "content_engine_qnrztlkv",
  promise:
    "I show you the same process I use to plan, script, record, edit, and post business videos. You finish with a clear offer, thirty video ideas, ten ready to read scripts, a recording setup you can repeat, and a simple way to send viewers to your website, form, or checkout.",
  accessDisclosure:
    "This is a self-guided written course. Access includes twelve lessons, the downloadable workbook, twelve assignments, lesson checks, and the final assessment. Use the lessons to plan and produce your own videos. Course videos and a downloadable background pack are not part of the current delivery.",
  credentialDisclaimer:
    "This is a private LeadFlow Pro course completion credential issued by Longview Training Center LLC. It is not a degree, professional license, accreditation, state or federal certification, promise of employment, or guarantee of business results.",
} as const;

export const CONTENT_ENGINE_MODULES = [
  {
    title: "Module One: Give the Content a Job",
    result: "Explain what you sell in one clear sentence and decide where each viewer should go next.",
    lessons: [
      {
        code: "CE L01",
        slug: "stop-posting-without-a-destination",
        title: "Stop Posting Without a Destination",
      },
      {
        code: "CE L02",
        slug: "choose-one-outcome-you-can-honestly-deliver",
        title: "Choose One Outcome You Can Honestly Deliver",
      },
    ],
  },
  {
    title: "Module Two: Build the Topic Bank",
    result: "Turn real customer questions, mistakes, and stories into thirty different video ideas.",
    lessons: [
      {
        code: "CE L03",
        slug: "the-five-content-wells-already-inside-your-business",
        title: "The Five Content Wells Already Inside Your Business",
      },
      {
        code: "CE L04",
        slug: "turn-one-offer-into-thirty-different-videos",
        title: "Turn One Offer Into Thirty Different Videos",
      },
    ],
  },
  {
    title: "Module Three: Write in a Human Voice",
    result: "Use ChatGPT to help write ten scripts that are clear, useful, and still sound like you.",
    lessons: [
      {
        code: "CE L05",
        slug: "write-the-first-ten-seconds-before-the-rest",
        title: "Write the First Ten Seconds Before the Rest",
      },
      {
        code: "CE L06",
        slug: "use-ai-without-sounding-like-ai",
        title: "Use AI Without Sounding Like AI",
      },
    ],
  },
  {
    title: "Module Four: Record and Edit the Batch",
    result: "Load Teleprompter, record on your phone or computer, and make a clean CapCut edit.",
    lessons: [
      {
        code: "CE L07",
        slug: "build-a-recording-setup-you-can-repeat",
        title: "Build a Recording Setup You Can Repeat",
      },
      {
        code: "CE L08",
        slug: "record-ten-videos-without-turning-it-into-ten-productions",
        title: "Record Ten Videos Without Turning It Into Ten Productions",
      },
      {
        code: "CE L09",
        slug: "edit-fast-without-editing-the-life-out-of-it",
        title: "Edit Fast Without Editing the Life Out of It",
      },
    ],
  },
  {
    title: "Module Five: Own the Destination and Improve",
    result: "Post the video, send viewers to a clear next step, measure what happened, and make the next ten better.",
    lessons: [
      {
        code: "CE L10",
        slug: "send-every-video-somewhere-you-own",
        title: "Send Every Video Somewhere You Own",
      },
      {
        code: "CE L11",
        slug: "give-google-a-real-page-for-the-video",
        title: "Give Google a Real Page for the Video",
      },
      {
        code: "CE L12",
        slug: "run-the-thirty-day-content-loop",
        title: "Run the Thirty Day Content Loop",
      },
    ],
  },
] as const;

export const CONTENT_ENGINE_LESSONS: ReadonlyArray<{
  code: string;
  slug: string;
  title: string;
}> = CONTENT_ENGINE_MODULES.reduce<Array<{ code: string; slug: string; title: string }>>(
  (lessons, module) => [...lessons, ...module.lessons],
  [],
);

export const CONTENT_ENGINE_PATHWAYS = [
  {
    title: "Google Ads certifications",
    issuer: "Google Skillshop",
    href: "https://skillshop.withgoogle.com/googleads/",
    detail: "Separate Google training and certification paths for Search, Video, Display, and Measurement.",
  },
  {
    title: "Social media and content certifications",
    issuer: "HubSpot Academy",
    href: "https://academy.hubspot.com/certification-overview",
    detail: "Separate HubSpot certification paths in social media, digital marketing, content, advertising, and revenue operations.",
  },
  {
    title: "Marketing occupation research",
    issuer: "United States Bureau of Labor Statistics",
    href: "https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm",
    detail: "Official occupational requirements, wage data, and outlook for market research analysts and marketing specialists.",
  },
] as const;

export function contentEngineLessonCode(slug: string) {
  return CONTENT_ENGINE_LESSONS.find((lesson) => lesson.slug === slug)?.code ?? null;
}

export function formatCoursePrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
