// Search metadata and schema.org Course markup for the Operator Academy course pages.
// Google's Course rich results need: name, description, provider, offers, and
// hasCourseInstance with courseMode and courseWorkload. Everything here is derived
// from the published catalog, so the markup can never disagree with the page.

import type { Metadata } from "next";
import { CHATGPT_OPERATOR, CHATGPT_OPERATOR_LESSONS } from "@/lib/chatgptOperatorCourse";
import { CONTENT_ENGINE, CONTENT_ENGINE_LESSONS } from "@/lib/contentEngineCourse";
import {
  OPERATOR_ACADEMY,
  OPERATOR_ACADEMY_COURSES,
  academyCourse,
} from "@/lib/operatorAcademyCatalog";

const BASE = "https://www.theleadflowpro.com";

export const ACADEMY_PROVIDER = {
  "@type": "Organization",
  name: "The LeadFlow Pro",
  url: BASE,
  sameAs: [
    "https://www.youtube.com/@TheLeadFlowProVids",
    "https://www.facebook.com/profile.php?id=61586176300453",
  ],
} as const;

type CatalogCourse = (typeof OPERATOR_ACADEMY_COURSES)[number];

export function courseLessonTitles(course: CatalogCourse): string[] {
  if (course.slug === CHATGPT_OPERATOR.slug) return CHATGPT_OPERATOR_LESSONS.map((lesson) => lesson.title);
  if (course.slug === CONTENT_ENGINE.slug) return CONTENT_ENGINE_LESSONS.map((lesson) => lesson.title);
  return course.lessons.map((lesson) => lesson.title);
}

// What a buyer can actually pay today. The two standalone courses sell on
// their own; every other paid course is sold only inside all-access, so its
// offer is the all-access founding price. The catalog's individualPriceCents
// is a list price with no checkout behind it and must not be published as an
// offer.
export function coursePriceCents(course: CatalogCourse): number | null {
  if (course.isFree) return 0;
  if (course.slug === CHATGPT_OPERATOR.slug) return CHATGPT_OPERATOR.foundingPriceCents;
  if (course.slug === CONTENT_ENGINE.slug) return CONTENT_ENGINE.foundingPriceCents;
  return OPERATOR_ACADEMY.foundingPriceCents;
}

export function courseOfferName(course: CatalogCourse): string {
  if (course.isFree) return "Free with lead access";
  if (course.slug === CHATGPT_OPERATOR.slug || course.slug === CONTENT_ENGINE.slug) {
    return `${course.shortTitle}, founding price`;
  }
  return "Operator Academy all-access, founding price";
}

export function courseMetadata(slug: string): Metadata {
  const course = academyCourse(slug);
  if (!course) {
    return {
      title: "Course | The LeadFlow Operator Academy",
      robots: { index: false, follow: true },
    };
  }
  const lessonCount = courseLessonTitles(course).length;
  const priceCents = coursePriceCents(course);
  const standalone = course.slug === CHATGPT_OPERATOR.slug || course.slug === CONTENT_ENGINE.slug;
  const priceLabel = course.isFree
    ? "Free with lead access"
    : standalone && priceCents
      ? `$${Math.round(priceCents / 100)} founding price`
      : `Included in Operator Academy all-access, $${Math.round((priceCents ?? 0) / 100)} founding price`;
  const title = `${course.shortTitle} | Operator Academy ${course.code.replace("OA", "")} | The LeadFlow Pro`;
  const description = `${course.description} ${lessonCount} lessons, ${course.level.toLowerCase()} level. ${priceLabel}. Written lessons, exact prompts, workbook, lesson checks, and a private completion record.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/training/${course.slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE}/training/${course.slug}`,
      type: "website",
    },
  };
}

export function courseJsonLd(course: CatalogCourse) {
  const lessonTitles = courseLessonTitles(course);
  const priceCents = coursePriceCents(course);
  const url = `${BASE}/training/${course.slug}`;
  const minutes = lessonTitles.length * 12;
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": url,
    name: course.title,
    description: course.description,
    url,
    courseCode: course.code,
    educationalLevel: course.level,
    inLanguage: "en-US",
    isAccessibleForFree: course.isFree,
    provider: ACADEMY_PROVIDER,
    publisher: ACADEMY_PROVIDER,
    isPartOf: {
      "@type": "Course",
      name: OPERATOR_ACADEMY.title,
      url: `${BASE}/academy`,
    },
    offers: [
      {
        "@type": "Offer",
        name: courseOfferName(course),
        category: course.isFree ? "Free" : "Paid",
        price: priceCents === null ? undefined : (priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: course.isFree ? `${BASE}/academy#free-access` : `${BASE}/academy#pricing`,
      },
    ],
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "Online",
        courseWorkload: `PT${minutes}M`,
      },
    ],
    syllabusSections: lessonTitles.map((name, index) => ({
      "@type": "Syllabus",
      name,
      position: index + 1,
    })),
  };
}

export function academyItemListJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: OPERATOR_ACADEMY.title,
    url: `${BASE}/academy`,
    itemListElement: OPERATOR_ACADEMY_COURSES.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE}/training/${course.slug}`,
      name: course.title,
    })),
  };
}
