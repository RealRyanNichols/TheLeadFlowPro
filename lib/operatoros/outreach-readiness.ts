export const OUTREACH_CHANNELS = ["email", "dm", "phone", "text", "email_or_dm", "internal"] as const;

export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export type OutreachProspectReadiness = {
  status: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_route: string | null;
  contact_source: string | null;
  contact_verified_at: string | null;
  compliance_review_required: boolean;
};

export type OutreachWorkspaceReadiness = {
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  allowed_channels: string[];
};

export type OutreachReadiness = {
  ready: boolean;
  blockers: string[];
};

const CLOSED_PROSPECT_STATUSES = new Set(["won", "lost", "do_not_contact"]);

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasActionableDirectMessageRoute(value: string | null | undefined) {
  const route = value?.trim();
  if (!route) return false;
  if (/^@[a-z0-9_.-]{2,}$/i.test(route)) return true;
  try {
    const url = new URL(route);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return ["facebook.com", "instagram.com", "linkedin.com", "x.com", "tiktok.com", "threads.net"]
      .some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function channelAllowed(channel: OutreachChannel, allowedChannels: string[]) {
  if (channel === "internal") return true;
  if (channel === "email_or_dm") {
    return allowedChannels.includes("email") || allowedChannels.includes("dm");
  }
  return allowedChannels.includes(channel);
}

export function contactVerificationBlockers(prospect: OutreachProspectReadiness) {
  const blockers: string[] = [];

  if (!hasText(prospect.contact_name)) blockers.push("Add the decision-maker name.");
  if (!hasText(prospect.contact_title)) blockers.push("Add the decision-maker role.");
  if (!hasText(prospect.contact_source)) blockers.push("Add the public or permissioned source.");
  if (
    !hasText(prospect.contact_email) &&
    !hasText(prospect.contact_phone) &&
    !hasActionableDirectMessageRoute(prospect.contact_route)
  ) {
    blockers.push("Add at least one usable contact route.");
  }

  return blockers;
}

export function outreachReadiness(
  prospect: OutreachProspectReadiness,
  settings: OutreachWorkspaceReadiness,
  channel: OutreachChannel,
): OutreachReadiness {
  if (channel === "internal") return { ready: true, blockers: [] };

  const blockers: string[] = [];

  if (CLOSED_PROSPECT_STATUSES.has(prospect.status)) {
    blockers.push("This prospect is closed and cannot be approved for outreach.");
  }

  if (!prospect.contact_verified_at) {
    blockers.push("A human must verify the decision-maker and source.");
  }

  blockers.push(...contactVerificationBlockers(prospect));

  if (prospect.compliance_review_required) {
    blockers.push("Separate compliance review is required before outreach approval.");
  }

  if (!channelAllowed(channel, settings.allowed_channels)) {
    blockers.push("This channel is not enabled in OperatorOS settings.");
  }

  if (channel === "email" && !hasText(prospect.contact_email)) {
    blockers.push("Add a verified business email for this channel.");
  }

  if ((channel === "phone" || channel === "text") && !hasText(prospect.contact_phone)) {
    blockers.push("Add a verified business phone for this channel.");
  }

  if (channel === "dm" && !hasActionableDirectMessageRoute(prospect.contact_route)) {
    blockers.push("Add the exact direct-message profile or page route.");
  }

  if (
    channel === "email_or_dm" &&
    !hasText(prospect.contact_email) &&
    !hasActionableDirectMessageRoute(prospect.contact_route)
  ) {
    blockers.push("Add a verified business email or direct-message route.");
  }

  const emailCanBeUsed =
    (channel === "email" || channel === "email_or_dm") &&
    settings.allowed_channels.includes("email") &&
    hasText(prospect.contact_email);
  if (emailCanBeUsed && (!hasText(settings.sender_name) || !hasText(settings.sender_email))) {
    blockers.push("Configure the sender name and sender email before email approval.");
  }

  if ((channel === "phone" || channel === "text") && !hasText(settings.sender_phone)) {
    blockers.push("Configure the LeadFlow sending phone before phone or text approval.");
  }

  return { ready: blockers.length === 0, blockers: [...new Set(blockers)] };
}
