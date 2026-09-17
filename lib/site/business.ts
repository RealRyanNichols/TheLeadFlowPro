// The business identity, in one place.
//
// Public name, legal entity, phone, email addresses, address policy, and
// social profiles. Leaf module: no imports, safe everywhere. Anything that
// prints the phone number or the DBA line reads it from here.

export const BUSINESS = {
  name: "The LeadFlow Pro",
  legalName: "Longview Training Center, LLC",
  /** Printed in footers, terms, checkout notes. */
  dbaLine: "The LeadFlow Pro, a DBA of Longview Training Center, LLC",
  operator: "Ryan Nichols",
  /** Every date and time on the site renders in this zone. */
  timezone: "America/Chicago",
  siteUrl: "https://www.theleadflowpro.com",
  region: "East Texas",
  city: "Longview",
  state: "TX",

  phone: {
    display: "(903) 500-8898",
    e164: "+19035008898",
    tel: "tel:+19035008898",
    sms: "sms:+19035008898",
    /** schema.org telephone format. */
    schema: "+1-903-500-8898",
  },

  email: {
    /** Public inbox, reply-to on everything. */
    hello: "hello@theleadflowpro.com",
    /** Transactional replies to leads are sent as Ryan. */
    ryan: "ryan@theleadflowpro.com",
    /** New-lead alerts come from this address. */
    alerts: "leadflow@theleadflowpro.com",
    /** The plugin (HQ) sends from this address. */
    hq: "hq@theleadflowpro.com",
    /** Pat works inbound leads; the NEW LEAD alert copies this inbox. */
    pat: "pat@theleadflowpro.com",
  },

  /**
   * Street address policy. The homepage structured data has carried this
   * address since the September 6 redesign. The workshop funnel releases the
   * exact venue address only to paid seats. Both are true today; which one
   * wins for public pages is a Ryan decision (docs/decisions-needed.md).
   */
  address: {
    street: "2800 Gilmer Rd Suite 106",
    city: "Longview",
    region: "TX",
    postalCode: "75604",
    country: "US",
    policy: "structured_data_only" as const,
  },

  socials: {
    youtube: "https://www.youtube.com/@TheLeadFlowProVids",
    facebook: "https://www.facebook.com/profile.php?id=61586176300453",
  },

  areaServed: ["Longview", "Tyler", "Marshall", "East Texas", "United States"],
} as const;

export const SITE_NAME = BUSINESS.name;
export const SITE_URL = BUSINESS.siteUrl;
