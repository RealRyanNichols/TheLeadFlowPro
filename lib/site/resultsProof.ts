/** Public aggregate proof. Payment collections and client-reported project figures are distinct measures. */
export const RESULTS_PROOF = {
  scott: {
    business: "O-L Guy Farms",
    person: "Scott Offerle",
    figure: "About $8,000",
    duration: "A four-day project",
    label: "Client-reported project figure",
    image: "/images/contractors/scott-cab-hero.jpg",
    imageAlt: "Scott Offerle in the cab of his tractor",
    summary: "Scott describes a four-day project and the operating costs behind it. Hear the full story in his own words.",
    disclosure: "Scott’s approximate figure is his account of one project, not independently verified revenue or profit. His full interview discusses costs and a further inquiry that was not yet a confirmed job.",
  },
  premier: {
    business: "Premier Dental Academy",
    image: "/images/premier/premier-classroom.jpg",
    imageAlt: "Premier Dental Academy students practicing with dental models in the classroom",
    months: [
      { label: "August 2026", display: "$4,466", cents: 446600, firstPayers: 6 },
      { label: "September 2026", display: "$15,264", cents: 1526400, firstPayers: 8 },
    ],
    increase: "+242%",
    julyContext: "July collections were $18,464 after recorded refunds, higher than September. This comparison describes two months, not a steady upward trend.",
    unmatchedContext: "September includes one unmatched customer’s $150 payment in collections. That customer is excluded from the student count.",
    asOf: "October 8, 2026",
    ownership: "Premier Dental Academy and The LeadFlow Pro share common ownership. Amanda leads the school; this is an operating example from the same group.",
  },
} as const;
