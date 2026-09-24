// Post Creator AI writing: the status and the plain-English line for every
// error code a Post Creator route can send.
//
// The write route and the writer read both from here, so a code always goes
// out with the same status and the same words. Numbers and dates are built
// from POST_CREATOR.ai and the allowance, never typed by hand. Every line that
// tells a buyer their writes ran out also says the free idea machine still
// works.
//
// Pure.

import { monthDayLabel } from "../plan";
import { AI_OFF_LINE, STILL_UNLIMITED, aiLimitsFor } from "../product";
import type { Allowance, ErrorCode, PostCreatorPlan } from "../types";

export const WRITE_ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  too_large: 413,
  forbidden: 403,
  unauthorized: 401,
  lapsed: 402,
  unconfigured: 503,
  not_found: 404,
  key_mismatch: 403,
  too_many_tries: 429,
  send_failed: 502,
  billing_unavailable: 503,
  nothing_to_manage: 400,
  profile_needed: 400,
  ai_off: 503,
  spend_cap: 503,
  account_cost_limit: 429,
  daily_limit: 429,
  monthly_limit: 429,
  attempt_limit: 429,
  busy: 409,
  already_delivered: 409,
  duplicate: 409,
  refused: 422,
  unusable: 502,
  provider_error: 502,
  rate_limited: 503,
  timeout: 504,
  server_error: 500,
};

const NOT_COUNTED = "This did not count against your writes.";

export function writeErrorMessage(code: ErrorCode, ctx: { allowance: Allowance | null; plan: PostCreatorPlan }): string {
  const limits = aiLimitsFor(ctx.plan);
  const perDay = ctx.allowance?.perDay ?? limits.perDay;
  const perMonth = ctx.allowance?.perMonth ?? limits.perMonth;
  const resets = ctx.allowance ? monthDayLabel(ctx.allowance.resetsMonthOn) : "the 1st";
  switch (code) {
    case "bad_request":
      return "Something in that request was off. Reload the page and try again.";
    case "too_large":
      return "That is more text than we can take in one go. Shorten your note and try again.";
    case "profile_needed":
      return "Add your business name and trade in Settings first, so the writer knows who it is writing for.";
    case "ai_off":
      return AI_OFF_LINE;
    case "spend_cap":
      return `AI writing is paused for everyone for the rest of today and comes back at midnight Central time. ${NOT_COUNTED} ${STILL_UNLIMITED}`;
    case "account_cost_limit":
      return `This account has reached its monthly AI cost limit, so AI writing is paused until ${resets}. ${STILL_UNLIMITED}`;
    case "daily_limit":
      return `You have used today's ${perDay} AI writes. More at midnight Central time. ${STILL_UNLIMITED}`;
    case "monthly_limit":
      return `You have used this month's ${perMonth} AI writes. They come back on ${resets}. ${STILL_UNLIMITED}`;
    case "attempt_limit":
      return "Too many tries that did not work out today. Give it until midnight Central time. The ones that failed did not count against your writes.";
    case "busy":
      return "Still writing your last one. Give it a minute, then tap Try again.";
    case "already_delivered":
      return "Those drafts were already written and counted, but the answer did not reach this screen. If this keeps happening, reply to your receipt email.";
    case "duplicate":
      return "That request already finished without drafts. Tap Try again to send a fresh one.";
    case "refused":
      return `The writer would not write this one. Try a different idea or reword your note. ${NOT_COUNTED}`;
    case "unusable":
      return `That draft came back unusable, so we threw it out. Try again. ${NOT_COUNTED}`;
    case "provider_error":
      return `The writer did not answer. Try again in a minute. ${NOT_COUNTED}`;
    case "rate_limited":
      return `The writer is busy right now. Try again in a minute. ${NOT_COUNTED}`;
    case "timeout":
      return `The writer took too long, so we stopped waiting. Try again. ${NOT_COUNTED}`;
    case "server_error":
      return "Something broke on our side. Try again in a minute.";
    case "forbidden":
      return "Open Post Creator from theleadflowpro.com and try again.";
    case "unauthorized":
      return "Open Post Creator with the email and key from your receipt.";
    case "lapsed":
      return "Your plan is not active, so AI writing and your saved profile are off. The free idea machine still works.";
    case "unconfigured":
      return "Post Creator accounts are not switched on yet.";
    case "key_mismatch":
      return "That key does not match this email. Check both, or ask for the key to be sent again.";
    case "not_found":
      return "We could not find a Post Creator for this email.";
    case "too_many_tries":
      return "Too many tries from this connection. Wait an hour and try again.";
    case "send_failed":
      return "Could not send right now. Try again in a minute.";
    case "billing_unavailable":
      return "Billing is not switched on yet.";
    case "nothing_to_manage":
      return "Nothing renews on this plan, so there is nothing to manage.";
  }
}
