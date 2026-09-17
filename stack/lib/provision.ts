// The provisioning plan. Given a validated config, list every step to stand
// the stack up in the client's own accounts, the env variable names each
// step needs, and the checks that prove it worked. Delivery is following
// this list; the runbook in docs/engines/7.3-company-os-stack.md is this
// list with prose around it.

import { enabledModules, validateStackConfig, type StackConfig } from "./config";

export type ProvisionStep = {
  n: number;
  account: "client_supabase" | "client_vercel" | "client_stripe" | "client_dns" | "client_email" | "leadflow";
  title: string;
  detail: string;
  env: string[];
  migrations: string[];
  check: string;
};

export const MIGRATIONS: Record<string, string> = {
  core: "schema/001_core.sql",
  sequences: "schema/002_sequences.sql",
  portal: "schema/003_portal.sql",
  payments: "schema/004_payments.sql",
};

export function provisioningPlan(config: StackConfig): ProvisionStep[] {
  const problems = validateStackConfig(config);
  if (problems.length) throw new Error(`config is not valid: ${problems.map((p) => `${p.path}: ${p.message}`).join("; ")}`);
  const mods = enabledModules(config);
  const steps: ProvisionStep[] = [];
  const add = (s: Omit<ProvisionStep, "n">) => steps.push({ n: steps.length + 1, ...s });

  add({
    account: "client_supabase",
    title: "Create the client's Supabase project",
    detail: `Project ref ${config.accounts.supabaseProjectRef}, in the client's organization, on the client's card. Ryan is invited as a member, never the owner.`,
    env: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    migrations: [],
    check: "The project dashboard shows the client's organization as owner.",
  });
  add({
    account: "client_supabase",
    title: "Apply the core schema",
    detail: "People, interactions, consents, audit. RLS on, service role for the app, member-scoped reads for the portal.",
    env: [],
    migrations: [MIGRATIONS.core, ...(mods.includes("sequences") ? [MIGRATIONS.sequences] : []), ...(mods.includes("portal") ? [MIGRATIONS.portal] : []), ...(mods.includes("payments") ? [MIGRATIONS.payments] : [])],
    check: "Every table lists rowsecurity = true; anon has no grants.",
  });
  add({
    account: "client_email",
    title: "Verify the sending domain",
    detail: `Resend (or the client's provider) with ${config.accounts.emailFrom} verified on the client's domain. Replies land in ${config.business.email}.`,
    env: ["RESEND_API_KEY", "EMAIL_FROM"],
    migrations: [],
    check: "A test message from the sender arrives with SPF and DKIM passing.",
  });
  if (mods.includes("sequences")) {
    add({
      account: "leadflow",
      title: "Connect the text line",
      detail: `The client's own OpenPhone or Twilio number, signed ${JSON.stringify(config.business.smsSignature)}. STOP handling is on before any sequence is. Send window ${config.consent.quietHours.start}:00 to ${config.consent.quietHours.end}:00 ${config.business.timezone}.`,
      env: ["SMS_PROVIDER", "SMS_API_KEY", "SMS_FROM_NUMBER", "SMS_WEBHOOK_SECRET"],
      migrations: [],
      check: "Texting STOP to the line flips the person to do_not_contact and no step goes out after.",
    });
  }
  if (mods.includes("payments")) {
    add({
      account: "client_stripe",
      title: "Connect the client's Stripe account",
      detail: `Account ${config.accounts.stripeAccountId}. Restricted key with read on customers and invoices, write on checkout sessions. Webhook endpoint pointed at the stack with signature verification.`,
      env: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      migrations: [],
      check: "A test-mode checkout produces one paid row after the webhook, none after the redirect alone.",
    });
  }
  add({
    account: "client_vercel",
    title: "Create the client's Vercel project and set env",
    detail: `Project ${config.accounts.vercelProject} in the client's Vercel team. Every variable above is set there by the client or on a screen share. Nothing is pasted into chat, docs, or this repo.`,
    env: ["STACK_CONFIG_PATH", "APP_URL", "SESSION_SECRET"],
    migrations: [],
    check: "The preview deployment renders the owner dashboard with zero people.",
  });
  if (mods.includes("portal")) {
    add({
      account: "client_supabase",
      title: "Turn on portal sign-in",
      detail: `Magic link only, from ${config.accounts.emailFrom}. A member sees ${config.portal.shows.join(", ")}; all their own rows only.`,
      env: [],
      migrations: [],
      check: "Two test members: each sees only their own payments and messages.",
    });
  }
  add({
    account: "client_dns",
    title: "Point the domain",
    detail: `${config.launch.domain ?? "<domain>"} to the Vercel project, at the client's DNS. HTTPS active before launch.status is set to live.`,
    env: [],
    migrations: [],
    check: "The domain loads over HTTPS and the sign-in email links to it.",
  });
  add({
    account: "leadflow",
    title: "Launch",
    detail: "Set launch.status to live with scopeApprovedOn filled. Hand the client the owner guide and the list of what they own.",
    env: [],
    migrations: [],
    check: "The client can sign in, add a person, and see them on the dashboard without Ryan.",
  });
  return steps;
}

/** Names only, never values. */
export function envExample(config: StackConfig): string {
  const names = [...new Set(provisioningPlan(config).flatMap((s) => s.env))];
  return ["# Set in the CLIENT's Vercel project. Names only; never commit values.", ...names.map((n) => `${n}=`)].join("\n") + "\n";
}

/** The plain-language ownership list that goes in the handoff. */
export function ownershipList(config: StackConfig): string[] {
  const out = [
    `The Supabase project (${config.accounts.supabaseProjectRef}) and every record in it are ${config.business.name}'s.`,
    `The Vercel project (${config.accounts.vercelProject}) and the domain are ${config.business.name}'s.`,
    "The sending domain and the text line are in the client's name.",
    "The LeadFlow Pro keeps the configuration file and the runbook, nothing else.",
  ];
  if (config.modules.payments) out.push(`The Stripe account (${config.accounts.stripeAccountId}) is ${config.business.name}'s; The LeadFlow Pro never holds funds.`);
  return out;
}
