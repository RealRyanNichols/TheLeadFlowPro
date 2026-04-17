import { notFound } from "next/navigation";
import { FlowCardView } from "@/components/flowcard/FlowCardView";
import { MOCK_FLOWCARD } from "@/lib/mock-data";
// import { prisma } from "@/lib/db";

interface Props {
  params: { slug: string };
}

async function loadCard(slug: string) {
  // TODO: swap mock for: prisma.flowCard.findUnique({ where: { slug }, ... })
  if (slug === MOCK_FLOWCARD.slug) return MOCK_FLOWCARD;
  return null;
}

export async function generateMetadata({ params }: Props) {
  const card = await loadCard(params.slug);
  if (!card) return { title: "Not found · LeadFlow Pro" };
  return {
    title: `${card.displayName} · LeadFlow Pro`,
    description: card.tagline ?? card.bio ?? "Connect with me on every platform — one tap.",
    openGraph: {
      title: card.displayName,
      description: card.tagline ?? card.bio ?? "",
      url: `https://www.theleadflowpro.com/c/${card.slug}`
    }
  };
}

export default async function FlowCardPage({ params }: Props) {
  const card = await loadCard(params.slug);
  if (!card) notFound();
  const publicUrl = `https://www.theleadflowpro.com/c/${card.slug}`;
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <FlowCardView card={card} publicUrl={publicUrl} />
    </div>
  );
}
