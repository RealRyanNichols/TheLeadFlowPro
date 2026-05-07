// src/lib/voice.ts — East TX Voice (money-weighted YES/NO sentiment).
//
// Money buys voting weight on a topic. Both sides accumulate dollars + vote
// counts. Public chart shows the split. Money does NOT pay out to winners —
// funds platform + monthly local-charity donation. Legal as paid petition
// voting; not a wager / not a prediction market.

import { prisma } from "./prisma";

export type VoiceTopicPublic = {
  slug: string;
  question: string;
  description: string | null;
  category: string | null;
  city: string | null;
  status: string;
  yesDollars: number;
  noDollars: number;
  yesVotes: number;
  noVotes: number;
  totalDollars: number;
  yesPct: number;   // 0..100
  noPct: number;    // 0..100
  closesAt: string;
  closesInSeconds: number;
  winningSide: string | null;
};

export const VOICE_MIN_DOLLARS = 1;
export const VOICE_MAX_DOLLARS = 5_000;
export const VOICE_DEFAULT_DAYS = 7; // topics close after 7 days unless we set otherwise

export function clampVoiceDollars(n: number): number {
  if (!Number.isFinite(n)) return VOICE_MIN_DOLLARS;
  return Math.max(VOICE_MIN_DOLLARS, Math.min(VOICE_MAX_DOLLARS, Math.round(n)));
}

export function voiceSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function getActiveTopics(): Promise<VoiceTopicPublic[]> {
  const now = new Date();
  const rows = await prisma.voiceTopic.findMany({
    where: { status: "open", closesAt: { gt: now } },
    orderBy: [{ yesDollars: "desc" }, { closesAt: "asc" }],
    take: 50,
  });
  return rows.map((t) => toPublic(t));
}

export async function getTopicBySlug(slug: string) {
  return prisma.voiceTopic.findUnique({ where: { slug } });
}

export function toPublic(t: any): VoiceTopicPublic {
  const yes = Number(t.yesDollars || 0);
  const no  = Number(t.noDollars  || 0);
  const total = yes + no;
  const yesPct = total === 0 ? 50 : Math.round((yes / total) * 100);
  const noPct  = 100 - yesPct;
  return {
    slug: t.slug,
    question: t.question,
    description: t.description,
    category: t.category,
    city: t.city,
    status: t.status,
    yesDollars: yes,
    noDollars: no,
    yesVotes: t.yesVotes || 0,
    noVotes: t.noVotes || 0,
    totalDollars: total,
    yesPct,
    noPct,
    closesAt: t.closesAt.toISOString ? t.closesAt.toISOString() : t.closesAt,
    closesInSeconds: Math.max(0, Math.floor(((t.closesAt.getTime ? t.closesAt.getTime() : new Date(t.closesAt).getTime()) - Date.now()) / 1000)),
    winningSide: t.winningSide,
  };
}
