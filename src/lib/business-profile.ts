// src/lib/business-profile.ts — uniqueness + claim codes for leaderboard businesses.
//
// First payer for a name creates the BusinessProfile + gets a 6-digit claim
// code emailed/shown. Subsequent buyers can ADD points to that name freely
// (it benefits the business). Editing website/social/category later requires
// the claim code.

import { prisma } from "./prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easier to read

export function generateClaimCode(): string {
  // 6 chars from a 32-char alphabet. ~10^9 combinations; collision risk is negligible.
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function findOrCreateProfile(args: {
  publicName: string;
  city?: string | null;
  category?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  socialUrl?: string | null;
}): Promise<{
  profile: Awaited<ReturnType<typeof prisma.businessProfile.findUnique>>;
  isNew: boolean;
}> {
  const existing = await prisma.businessProfile.findUnique({
    where: { publicName: args.publicName },
  });
  if (existing) {
    return { profile: existing, isNew: false };
  }

  // Generate a unique slug + claim code
  let slug = slugify(args.publicName);
  let suffix = 0;
  while (await prisma.businessProfile.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugify(args.publicName)}-${suffix}`;
  }

  let claimCode = generateClaimCode();
  while (await prisma.businessProfile.findUnique({ where: { claimCode } })) {
    claimCode = generateClaimCode();
  }

  const created = await prisma.businessProfile.create({
    data: {
      slug,
      publicName: args.publicName,
      city: args.city || null,
      category: args.category || null,
      email: args.email || null,
      websiteUrl: args.websiteUrl || null,
      socialUrl: args.socialUrl || null,
      claimCode,
    },
  });
  return { profile: created, isNew: true };
}
